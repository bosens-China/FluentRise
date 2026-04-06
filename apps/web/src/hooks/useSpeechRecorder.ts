import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

type RecorderStatus = 'idle' | 'recording' | 'stopped';

interface UseSpeechRecorderOptions {
  maxDurationSeconds?: number;
}

interface UseSpeechRecorderResult {
  status: RecorderStatus;
  remainingSeconds: number;
  recordedFile: File | null;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<File | null>;
  resetRecording: () => void;
}

function resolveRecorderErrorMessage(status: string): string | null {
  switch (status) {
    case 'permission_denied':
      return '麦克风权限被拒绝，请在浏览器设置里允许录音后重试';
    case 'media_in_use':
      return '麦克风正在被其他应用占用，请关闭后重试';
    case 'invalid_media_constraints':
      return '当前浏览器不支持所需的录音参数，请更换浏览器后重试';
    case 'recorder_error':
    case 'media_aborted':
      return '录音过程中发生错误，请重新开始录音';
    default:
      return null;
  }
}

export function useSpeechRecorder(
  options: UseSpeechRecorderOptions = {},
): UseSpeechRecorderResult {
  const maxDurationSeconds = options.maxDurationSeconds ?? 60;
  const [remainingSeconds, setRemainingSeconds] = useState(maxDurationSeconds);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const {
    status: recorderStatus,
    startRecording: startMediaRecording,
    stopRecording: stopMediaRecording,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    blobPropertyBag: {
      type: 'audio/wav',
    },
    askPermissionOnMount: false,
    stopStreamsOnStop: true,
    onStop: (_blobUrl, blob) => {
      setRecordedFile(
        new File([blob], 'speech-practice.wav', {
          type: blob.type || 'audio/wav',
        }),
      );
      setRemainingSeconds(maxDurationSeconds);
    },
  });

  const normalizedStatus: RecorderStatus =
    recorderStatus === 'recording'
      ? 'recording'
      : recordedFile
        ? 'stopped'
        : 'idle';

  const errorMessage = useMemo(
    () => resolveRecorderErrorMessage(recorderStatus),
    [recorderStatus],
  );

  const resetRecording = useCallback(() => {
    clearTimer();
    clearBlobUrl();
    setRecordedFile(null);
    setRemainingSeconds(maxDurationSeconds);
  }, [clearBlobUrl, clearTimer, maxDurationSeconds]);

  const stopRecording = useCallback(async () => {
    clearTimer();
    stopMediaRecording();
    return recordedFile;
  }, [clearTimer, recordedFile, stopMediaRecording]);

  const startRecording = useCallback(async () => {
    resetRecording();
    startMediaRecording();

    const startedAt = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const nextRemaining = Math.max(0, maxDurationSeconds - elapsed);
      setRemainingSeconds(nextRemaining);
      if (nextRemaining <= 0) {
        clearTimer();
        stopMediaRecording();
      }
    }, 250);
  }, [
    clearTimer,
    maxDurationSeconds,
    resetRecording,
    startMediaRecording,
    stopMediaRecording,
  ]);

  useEffect(() => {
    if (errorMessage || recorderStatus === 'stopped' || recorderStatus === 'idle') {
      clearTimer();
    }
  }, [clearTimer, errorMessage, recorderStatus]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearBlobUrl();
    };
  }, [clearBlobUrl, clearTimer]);

  return {
    status: normalizedStatus,
    remainingSeconds,
    recordedFile,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
