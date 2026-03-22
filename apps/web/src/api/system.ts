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

export const systemApi = {
  getQuotes(count = 5) {
    return get<Quote[]>('/system/quotes', {
      params: { count },
    });
  },
  getEncouragement(data: EncouragementRequest) {
    return post<EncouragementResponse>('/system/encouragement', data);
  },
};
