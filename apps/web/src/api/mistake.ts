import { get } from '@/utils/request';

export interface MistakeItem {
  id: number;
  source_type: string;
  item_type: string;
  target_text: string;
  prompt_text: string | null;
  last_user_answer: string | null;
  context_text: string | null;
  payload: Record<string, unknown> | null;
  mistake_count: number;
  correct_count: number;
  is_mastered: boolean;
  first_seen_at: string;
  last_seen_at: string;
  last_corrected_at: string | null;
}

export interface MistakeBookResponse {
  items: MistakeItem[];
  total: number;
  pending_total: number;
  mastered_total: number;
}

export async function getMistakeBook(): Promise<MistakeBookResponse> {
  return get<MistakeBookResponse>('/mistakes');
}
