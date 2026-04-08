import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';

import { generateArticleAudio, type Article } from '@/api/article';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface UseArticleReviewAudioOptions {
  articleId: string;
  currentArticle?: Article;
  isReviewMode: boolean;
}

export function useArticleReviewAudio({
  articleId,
  currentArticle,
  isReviewMode,
}: UseArticleReviewAudioOptions) {
  const { message } = App.useApp();
  const {
    play: playReviewAudioFile,
    stop: stopReviewAudio,
    isPlaying: reviewAudioPlaying,
  } = useAudioPlayer();
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [reviewAudioLoading, setReviewAudioLoading] = useState(false);
  const prevAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevAudioUrlRef.current) {
        URL.revokeObjectURL(prevAudioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previous = prevAudioUrlRef.current;
    if (previous) {
      URL.revokeObjectURL(previous);
      prevAudioUrlRef.current = null;
    }
    setReviewAudioUrl(null);
    stopReviewAudio();
    setReviewAudioLoading(false);
  }, [articleId, isReviewMode, stopReviewAudio]);

  const playReviewAudio = useCallback(async () => {
    if (!currentArticle) {
      return;
    }

    try {
      setReviewAudioLoading(true);
      let nextUrl = reviewAudioUrl;
      if (!nextUrl) {
        nextUrl = await generateArticleAudio(currentArticle.id);
        setReviewAudioUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          prevAudioUrlRef.current = nextUrl;
          return nextUrl;
        });
      }

      await playReviewAudioFile(nextUrl, {
        onError: () => {
          message.error('课文音频播放失败，请稍后重试');
        },
      });
    } catch {
      message.error('课文音频生成失败，请稍后重试');
    } finally {
      setReviewAudioLoading(false);
    }
  }, [currentArticle, message, playReviewAudioFile, reviewAudioUrl]);

  return {
    playReviewAudio,
    reviewAudioLoading,
    reviewAudioPlaying,
    stopReviewAudio,
  };
}
