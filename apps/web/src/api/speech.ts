import { post } from '@/utils/request';

export type SpeechConfidenceLevel = 'high' | 'medium' | 'low';

export interface SpeechAnalyzeResponse {
  transcript: string;
  duration_seconds: number;
  target_duration_seconds: number;
  hard_max_duration_seconds: number;
  language: string;
  analysis_zh: string;
  similarity_score: number | null;
  confidence_level: SpeechConfidenceLevel;
  missing_words: string[];
  extra_words: string[];
}

export async function analyzeSpeech(params: {
  file: File;
  language?: string;
  referenceText?: string;
}): Promise<SpeechAnalyzeResponse> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('language', params.language ?? 'en');
  if (params.referenceText?.trim()) {
    formData.append('reference_text', params.referenceText.trim());
  }

  return post<SpeechAnalyzeResponse>('/speech/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
}
