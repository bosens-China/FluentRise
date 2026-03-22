import { Tooltip, Typography } from 'antd';

import type { Exercise, ExerciseResultItem, VocabularyWord } from '@/api/article';

const { Text } = Typography;

export const EMPTY_EXERCISES: Exercise[] = [];
export const LEVEL_LABELS = ['完全零基础', '启蒙', '入门', '初级', '进阶', '实用', '自主表达'];

export interface ExerciseSummary {
  correct: number;
  total: number;
  results: ExerciseResultItem[];
}

export function normalizeAnswer(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function renderParagraphWithVocabulary(text: string, vocabulary: VocabularyWord[] | null | undefined) {
  if (!vocabulary || vocabulary.length === 0) {
    return text;
  }

  const sortedVocabulary = [...vocabulary].sort((left, right) => right.word.length - left.word.length);
  const escapedWords = sortedVocabulary.map((item) => item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const matchedWord = sortedVocabulary.find((item) => item.word.toLowerCase() === part.toLowerCase());
    if (!matchedWord) {
      return part;
    }

    return (
      <Tooltip
        key={`${matchedWord.word}-${index}`}
        color="white"
        overlayInnerStyle={{ color: '#333' }}
        title={
          <div className="p-1">
            <div className="mb-1 text-lg font-bold text-amber-700">{matchedWord.word}</div>
            <div className="mb-1 text-xs text-gray-500">
              {matchedWord.uk_phonetic ? `UK ${matchedWord.uk_phonetic}` : ''}
              {matchedWord.uk_phonetic && matchedWord.us_phonetic ? '  ' : ''}
              {matchedWord.us_phonetic ? `US ${matchedWord.us_phonetic}` : ''}
            </div>
            <Text className="text-sm font-medium text-gray-700">{matchedWord.meaning}</Text>
          </div>
        }
      >
        <span className="cursor-help rounded bg-amber-50 px-1 font-semibold text-amber-700 underline decoration-dashed underline-offset-4">
          {part}
        </span>
      </Tooltip>
    );
  });
}
