import { Tooltip, Typography } from 'antd';

import type {
  ArticleAudioSegmentTiming,
  Exercise,
  ExerciseResultItem,
  VocabularyWord,
} from '@/api/article';

const { Text } = Typography;

export const EMPTY_EXERCISES: Exercise[] = [];
export const LEVEL_LABELS = [
  '完全零基础',
  '启蒙',
  '入门',
  '初级',
  '进阶',
  '实用',
  '自主表达',
];

export interface ExerciseSummary {
  correct: number;
  total: number;
  results: ExerciseResultItem[];
}

interface RenderParagraphOptions {
  text: string;
  vocabulary: VocabularyWord[] | null | undefined;
  segment?: ArticleAudioSegmentTiming;
  currentSegmentElapsedMs?: number;
}

interface WordRenderState {
  timingIndex: number;
}

function normalizeWord(value: string): string {
  return value.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase();
}

function buildVocabularyLookup(
  vocabulary: VocabularyWord[] | null | undefined,
) {
  return new Map(
    (vocabulary ?? []).map((item) => [item.word.toLowerCase(), item] as const),
  );
}

function buildWordStatus(
  normalizedWord: string,
  segment: ArticleAudioSegmentTiming | undefined,
  currentSegmentElapsedMs: number | undefined,
  state: WordRenderState,
): 'idle' | 'played' | 'active' {
  if (!segment || currentSegmentElapsedMs === undefined) {
    return 'idle';
  }

  const words = segment.words;
  for (let index = state.timingIndex; index < words.length; index += 1) {
    const timingWord = words[index];
    if (normalizeWord(timingWord.text) !== normalizedWord) {
      continue;
    }

    state.timingIndex = index + 1;
    const relativeStartMs = Math.max(0, timingWord.start_ms - segment.start_ms);
    const relativeEndMs = Math.max(
      relativeStartMs + 1,
      timingWord.end_ms - segment.start_ms,
    );

    if (currentSegmentElapsedMs >= relativeEndMs) {
      return 'played';
    }
    if (
      currentSegmentElapsedMs >= relativeStartMs &&
      currentSegmentElapsedMs < relativeEndMs
    ) {
      return 'active';
    }
    return 'idle';
  }

  return 'idle';
}

function getWordClassName(
  status: 'idle' | 'played' | 'active',
  hasVocabulary: boolean,
): string {
  const classes = [
    'box-decoration-clone px-1.5 py-0.5 transition-all duration-200',
  ];

  if (hasVocabulary) {
    classes.push(
      'cursor-help font-semibold underline decoration-dashed underline-offset-4',
    );
  }

  if (status === 'played') {
    classes.push('rounded-[0.65rem] bg-emerald-100/90 text-emerald-950');
  } else if (status === 'active') {
    classes.push(
      'rounded-[0.7rem] bg-[linear-gradient(135deg,_#fde68a,_#fdba74)] text-slate-950 shadow-[0_8px_18px_rgba(251,146,60,0.18)]',
    );
  } else if (hasVocabulary) {
    classes.push('rounded-[0.65rem] bg-amber-50 text-amber-700');
  }

  return classes.join(' ');
}

function renderWordWithTooltip(
  content: string,
  matchedWord: VocabularyWord | undefined,
  key: string,
  className: string,
) {
  if (!matchedWord) {
    return (
      <span key={key} className={className}>
        {content}
      </span>
    );
  }

  return (
    <Tooltip
      key={key}
      color="white"
      overlayInnerStyle={{ color: '#333' }}
      title={
        <div className="p-1">
          <div className="mb-1 text-lg font-bold text-amber-700">
            {matchedWord.word}
          </div>
          <div className="mb-1 text-xs text-gray-500">
            {matchedWord.uk_phonetic ? `UK ${matchedWord.uk_phonetic}` : ''}
            {matchedWord.uk_phonetic && matchedWord.us_phonetic ? '  ' : ''}
            {matchedWord.us_phonetic ? `US ${matchedWord.us_phonetic}` : ''}
          </div>
          <Text className="text-sm font-medium text-gray-700">
            {matchedWord.meaning}
          </Text>
        </div>
      }
    >
      <span className={className}>{content}</span>
    </Tooltip>
  );
}

export function normalizeAnswer(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function renderParagraphWithVocabulary(
  text: string,
  vocabulary: VocabularyWord[] | null | undefined,
) {
  return renderParagraphWithPlaybackVocabulary({
    text,
    vocabulary,
  });
}

export function renderParagraphWithPlaybackVocabulary({
  text,
  vocabulary,
  segment,
  currentSegmentElapsedMs,
}: RenderParagraphOptions) {
  const vocabularyLookup = buildVocabularyLookup(vocabulary);
  const parts = text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*\s*)/g);
  const state: WordRenderState = { timingIndex: 0 };

  return parts.map((part, index) => {
    const normalizedWord = normalizeWord(part);
    if (!normalizedWord) {
      return part;
    }

    const matchedWord = vocabularyLookup.get(normalizedWord);
    const status = buildWordStatus(
      normalizedWord,
      segment,
      currentSegmentElapsedMs,
      state,
    );
    const className = getWordClassName(status, Boolean(matchedWord));

    return renderWordWithTooltip(
      part,
      matchedWord,
      `${normalizedWord}-${index}`,
      className,
    );
  });
}
