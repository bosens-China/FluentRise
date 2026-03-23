import type { Question, QuestionType } from '@/api/playground';

export interface QuestionState {
  currentInput: string;
  attempts: number;
  isCorrect: boolean | null;
  showedAnswer: boolean;
}

export interface GameState {
  questions: Question[];
  currentIndex: number;
  questionStates: Map<string, QuestionState>;
  streak: number;
  maxStreak: number;
}

export interface PlaygroundSubmitResult {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  encouragement_zh: string;
  encouragement_en: string;
}

export const QUESTION_TYPE_LABEL_MAP: Record<QuestionType, string> = {
  audio: '听音写词',
  meaning: '看释义写词',
  fill_blank: '句子填空',
  context_cloze: '提示词填空',
  sentence_dictation: '短句默写',
};

export function createQuestionStates(
  questions: Question[],
): Map<string, QuestionState> {
  return new Map(
    questions.map((question) => [
      question.id,
      {
        currentInput: '',
        attempts: 0,
        isCorrect: null,
        showedAnswer: false,
      },
    ]),
  );
}

export function createInitialGameState(questions: Question[] = []): GameState {
  return {
    questions,
    currentIndex: 0,
    questionStates: createQuestionStates(questions),
    streak: 0,
    maxStreak: 0,
  };
}

export function normalizeAnswer(value: string, type: QuestionType): string {
  const normalized = value.trim().toLowerCase();
  if (type === 'sentence_dictation') {
    return normalized
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return normalized.replace(/\s+/g, ' ');
}

export function formatDurationText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${restSeconds.toString().padStart(2, '0')}`;
}
