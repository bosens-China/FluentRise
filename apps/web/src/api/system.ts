import { get, post } from '@/utils/request';

export interface Quote {
  en: string;
  zh: string;
}

export interface EncouragementRequest {
  context_type: 'lesson' | 'review' | 'playground';
  title?: string;
  accuracy?: number;
  streak_days?: number;
}

export interface EncouragementResponse {
  zh: string;
  en: string;
}

export interface LlmConfigSummary {
  provider: string;
  enabled: boolean;
  fast_model: string;
  smart_model: string;
  base_url_configured: boolean;
  encouragement_enabled: boolean;
}

export interface SpeechConfigSummary {
  provider: string;
  enabled: boolean;
  mode: string;
  model: string;
  default_language: string;
  target_duration_seconds: number;
  hard_max_duration_seconds: number;
  reading_pass_score: number;
  max_attempts: number;
  accepted_content_types: string[];
  supported_audio_formats: string[];
}

export interface TtsConfigSummary {
  enabled: boolean;
  default_voice: string;
}

export interface ArticleLearningConfigSummary {
  listen_required_count: number;
}

export interface ReviewConfigSummary {
  total_stages: number;
  stage_intervals_days: number[];
}

export interface PlaygroundConfigSummary {
  history_page_size: number;
  max_attempts: number;
}

export interface SystemConfigResponse {
  llm: LlmConfigSummary;
  tts: TtsConfigSummary;
  speech: SpeechConfigSummary;
  article_learning: ArticleLearningConfigSummary;
  review: ReviewConfigSummary;
  playground: PlaygroundConfigSummary;
}

export const systemApi = {
  getConfig() {
    return get<SystemConfigResponse>('/system/config');
  },
  getQuotes(count = 5) {
    return get<Quote[]>('/system/quotes', {
      params: { count },
    });
  },
  getEncouragement(data: EncouragementRequest) {
    return post<EncouragementResponse>('/system/encouragement', data);
  },
};
