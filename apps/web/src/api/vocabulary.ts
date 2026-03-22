import request from '@/utils/request';

export interface VocabularyWord {
  id: number;
  word: string;
  uk_phonetic: string | null;
  us_phonetic: string | null;
  meaning: string;
  article_id: number | null;
  article_title: string | null;
  created_at: string;
}

export interface TimelineGroup {
  date: string;
  words: VocabularyWord[];
}

export interface VocabularyTimelineResponse {
  timeline: TimelineGroup[];
  total: number;
}

/**
 * 获取生词本时间线
 */
export async function getVocabularyTimeline(): Promise<VocabularyTimelineResponse> {
  return request.get('/vocabularies/timeline');
}
