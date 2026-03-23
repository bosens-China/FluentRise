import { useCallback, useEffect, useRef, useState } from 'react';

interface PlayAudioOptions {
  onEnded?: () => void;
  onError?: () => void;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const clearCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audioRef.current = null;
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (url: string, options: PlayAudioOptions = {}) => {
      clearCurrentAudio();

      const audio = new Audio(url);
      audioRef.current = audio;

      const handleEnded = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setIsPlaying(false);
        options.onEnded?.();
      };

      const handleError = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setIsPlaying(false);
        options.onError?.();
      };

      audio.onended = handleEnded;
      audio.onerror = handleError;
      setIsPlaying(true);

      try {
        await audio.play();
      } catch {
        handleError();
      }
    },
    [clearCurrentAudio],
  );

  useEffect(() => clearCurrentAudio, [clearCurrentAudio]);

  return {
    isPlaying,
    play,
    stop: clearCurrentAudio,
    audioRef,
  };
}
