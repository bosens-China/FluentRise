import { Alert } from 'antd';
import type { Article } from '@/api/article';
import type { SpeechAnalyzeResponse } from '@/api/speech';
import { SpeechPracticePanel } from './SpeechPracticePanel';

const READING_PASS_SCORE = 65;

interface CompletionReadingStepProps {
  article: Article;
  readingCompleted: boolean;
  readingPassed: boolean;
  readingAttempts: number;
  handleSpeechResult: (result: SpeechAnalyzeResponse | null) => void;
}

export function CompletionReadingStep({
  article,
  readingCompleted,
  readingPassed,
  readingAttempts,
  handleSpeechResult,
}: CompletionReadingStepProps) {
  return (
    <div className="space-y-4 pt-2">
      <Alert
        type={readingCompleted ? (readingPassed ? 'success' : 'warning') : 'info'}
        showIcon
        message={readingCompleted ? (readingPassed ? '朗读已通过 · 66%' : '已进入下一环节 (重试耗尽)') : '朗读通过线'}
        description={
          readingCompleted
            ? (readingPassed ? '朗读校验已通过，请继续完成小故事概述。' : '已经尽力了，系统会标记这篇文章明天再次学习。请继续完成最后一步。')
            : `建议至少达到 ${READING_PASS_SCORE}% 内容覆盖度，且识别稳定度不能是“偏低”。连续失败 3 次会自动进入下一步，但明日需重学。当前尝试：${readingAttempts}/3`
        }
      />
      <SpeechPracticePanel
        key={`${article.id}-completion`}
        article={article}
        variant="completion"
        onResultChange={handleSpeechResult}
      />
    </div>
  );
}
