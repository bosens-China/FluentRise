import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';

import type { Article, ArticleAudioTimelineResponse } from '@/api/article';
import { getArticleAudioTimeline } from '@/api/article';
import { getConfiguredTextAudioUrl } from '@/api/tts';
import { useSystemConfig } from '@/hooks/useSystemConfig';

function buildParagraphAudioUrl(
  text: string,
  defaultVoice?: string,
  speaker?: string,
): string {
  if (!speaker) {
    return getConfiguredTextAudioUrl(text, defaultVoice);
  }
  const params = new URLSearchParams({ word: text });
  if (speaker) {
    params.set('speaker', speaker);
  }
  return `/api/v1/tts/audio?${params.toString()}`;
}

interface UseArticleReaderAudioOptions {
  article: Article;
}

export function useArticleReaderAudio({
  article,
}: UseArticleReaderAudioOptions) {
  const { data: systemConfig } = useSystemConfig();
  const [audioTimeline, setAudioTimeline] =
    useState<ArticleAudioTimelineResponse | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackParagraphIndex, setCurrentPlaybackParagraphIndex] =
    useState<number | null>(null);
  const [currentSegmentElapsedMs, setCurrentSegmentElapsedMs] = useState(0);
  const [loadingTTSKey, setLoadingTTSKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const singleAudioCache = useRef<Record<string, HTMLAudioElement>>({});
  const currentAudioUrlRef = useRef<string | null>(null);
  const isAdvancingSegmentRef = useRef(false);
  const defaultVoice = systemConfig?.tts.default_voice;

  useEffect(() => {
    setLoadingTTSKey(null);
    setAudioTimeline(null);
    setCurrentPlaybackParagraphIndex(null);
    setCurrentSegmentElapsedMs(0);
    setIsPlaying(false);
    currentAudioUrlRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, [article.id, article.is_read]);

  const playSingleTTS = useCallback(async (text: string, speaker?: string) => {
    const cacheKey = `${speaker ?? 'default'}::${text}`;
    const cachedAudio = singleAudioCache.current[cacheKey];
    setLoadingTTSKey(text);

    if (cachedAudio) {
      cachedAudio.currentTime = 0;
      try {
        await cachedAudio.play();
      } catch {
        message.error('音频播放失败');
      } finally {
        setLoadingTTSKey((current) => (current === text ? null : current));
      }
      return;
    }

    const audio = new Audio(buildParagraphAudioUrl(text, defaultVoice, speaker));
    singleAudioCache.current[cacheKey] = audio;

    try {
      await audio.play();
    } catch {
      message.error('音频播放失败');
    } finally {
      setLoadingTTSKey((current) => (current === text ? null : current));
    }
  }, [defaultVoice]);

  const ensureAudioTimeline = useCallback(async () => {
    if (audioTimeline) {
      return audioTimeline;
    }

    try {
      const nextTimeline = await getArticleAudioTimeline(article.id);
      setAudioTimeline(nextTimeline);
      return nextTimeline;
    } catch {
      const retryTimeline = await getArticleAudioTimeline(article.id);
      setAudioTimeline(retryTimeline);
      return retryTimeline;
    }
  }, [article.id, audioTimeline]);

  const playParagraphSegment = useCallback(
    async (paragraphIndex: number, resetCurrentTime = true) => {
      const audioElement = audioRef.current;
      const paragraph = article.content[paragraphIndex];

      if (!audioElement || !paragraph) {
        return;
      }

      const nextUrl = buildParagraphAudioUrl(
        paragraph.en,
        defaultVoice,
        paragraph.speaker,
      );
      if (currentAudioUrlRef.current !== nextUrl) {
        currentAudioUrlRef.current = nextUrl;
        audioElement.src = nextUrl;
      }
      if (resetCurrentTime) {
        audioElement.currentTime = 0;
      }

      setCurrentPlaybackParagraphIndex(paragraphIndex);
      setCurrentSegmentElapsedMs(Math.round(audioElement.currentTime * 1000));
      await audioElement.play();
      setIsPlaying(true);
    },
    [article.content, defaultVoice],
  );

  const toggleAudio = useCallback(async () => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    setLoadingAudio(true);
    try {
      try {
        await ensureAudioTimeline();
      } catch {
        message.warning('时间线准备失败，本次将先播放音频，高亮会稍后恢复');
      }

      if (currentPlaybackParagraphIndex !== null && currentAudioUrlRef.current) {
        await audioElement.play();
        setIsPlaying(true);
      } else {
        await playParagraphSegment(0);
      }
    } catch {
      message.error('课文朗读暂时失败，请稍后重试');
    } finally {
      setLoadingAudio(false);
    }
  }, [
    currentPlaybackParagraphIndex,
    ensureAudioTimeline,
    isPlaying,
    playParagraphSegment,
  ]);

  const handleAudioEnded = useCallback(() => {
    if (isAdvancingSegmentRef.current) {
      return;
    }

    const nextIndex =
      currentPlaybackParagraphIndex === null
        ? null
        : currentPlaybackParagraphIndex + 1;

    if (nextIndex === null || nextIndex >= article.content.length) {
      setIsPlaying(false);
      setCurrentPlaybackParagraphIndex(null);
      setCurrentSegmentElapsedMs(0);
      currentAudioUrlRef.current = null;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    isAdvancingSegmentRef.current = true;
    setCurrentSegmentElapsedMs(0);
    void playParagraphSegment(nextIndex)
      .catch(() => {
        message.error('课文朗读中断，请稍后重试');
        setIsPlaying(false);
        setCurrentPlaybackParagraphIndex(null);
        setCurrentSegmentElapsedMs(0);
      })
      .finally(() => {
        isAdvancingSegmentRef.current = false;
      });
  }, [article.content.length, currentPlaybackParagraphIndex, playParagraphSegment]);

  return {
    audioRef,
    audioTimeline,
    currentPlaybackParagraphIndex,
    currentSegmentElapsedMs,
    handleAudioEnded,
    isAdvancingSegmentRef,
    isPlaying,
    loadingAudio,
    loadingTTSKey,
    playSingleTTS,
    setCurrentSegmentElapsedMs,
    setIsPlaying,
    toggleAudio,
  };
}
