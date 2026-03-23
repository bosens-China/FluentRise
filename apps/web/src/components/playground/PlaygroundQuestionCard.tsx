import {
  ArrowRightOutlined,
  EyeOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Tag, Typography } from 'antd';

import type { Question } from '@/api/playground';
import { QUESTION_TYPE_LABEL_MAP, type QuestionState } from '@/lib/playground';

const { Paragraph, Text, Title } = Typography;

interface PlaygroundQuestionCardProps {
  question: Question;
  state: QuestionState | undefined;
  isPlaying: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onShowAnswer: () => void;
  onPlayAudio: (url: string | undefined, fallbackText?: string) => void;
}

export function PlaygroundQuestionCard({
  question,
  state,
  isPlaying,
  onInputChange,
  onSubmit,
  onShowAnswer,
  onPlayAudio,
}: PlaygroundQuestionCardProps) {
  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex justify-center">
        <Tag className="rounded-full border-0 bg-amber-100 px-4 py-1 text-amber-700">
          {QUESTION_TYPE_LABEL_MAP[question.type]}
        </Tag>
      </div>

      {question.type === 'audio' ? (
        <div className="py-8 text-center">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<SoundOutlined className="text-2xl" />}
            className="h-28 w-28 border-0 bg-gradient-to-r from-amber-500 to-orange-500"
            loading={isPlaying}
            onClick={() => onPlayAudio(question.word_audio_url, question.word)}
          />
          <Paragraph className="!mb-2 !mt-8 text-lg text-gray-700">
            听音频，写出你听到的单词
          </Paragraph>
          <Text className="text-gray-400">可以重复播放，慢慢来。</Text>
        </div>
      ) : question.type === 'meaning' ? (
        <div className="py-8 text-center">
          <Button
            type="text"
            icon={<SoundOutlined />}
            onClick={() => onPlayAudio(question.word_audio_url, question.word)}
          />
          <div className="mx-auto mt-4 max-w-xl rounded-[28px] bg-amber-50 p-6">
            <Title level={3} className="!mb-0 !text-amber-900">
              {question.meaning}
            </Title>
          </div>
          <Paragraph className="!mb-0 !mt-4 text-gray-500">
            根据中文释义写出英文单词
          </Paragraph>
        </div>
      ) : question.type === 'sentence_dictation' ? (
        <div className="py-8 text-center">
          <Button
            type="text"
            icon={<SoundOutlined />}
            onClick={() =>
              onPlayAudio(
                question.sentence_audio_url,
                question.sentence || question.word,
              )
            }
          />
          <div className="mx-auto mt-4 max-w-xl rounded-[28px] bg-orange-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
              听中文提示，默写整句
            </div>
            <Title level={3} className="!mb-0 !mt-3 !text-orange-900">
              {question.sentence_translation}
            </Title>
          </div>
          <Paragraph className="!mb-0 !mt-4 text-gray-500">
            听音频并写出完整英文句子，标点会自动宽松处理。
          </Paragraph>
        </div>
      ) : (
        <div className="py-8 text-center">
          <Button
            type="text"
            icon={<SoundOutlined />}
            onClick={() =>
              onPlayAudio(
                question.sentence_audio_url,
                question.sentence || question.word,
              )
            }
          />
          <div className="mx-auto mt-4 max-w-xl rounded-[28px] bg-slate-50 p-6 text-xl font-medium leading-9 text-gray-800">
            {question.sentence?.split('_____').map((part, index, array) => (
              <span key={`${part}-${index}`}>
                {part}
                {index < array.length - 1 ? (
                  <span className="mx-2 inline-block min-w-[100px] border-b-2 border-amber-400 text-center font-bold text-amber-700">
                    {state?.showedAnswer ? question.word : '____'}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          {question.type === 'context_cloze' ? (
            <Paragraph className="!mb-0 !mt-4 text-gray-500">
              结合句意和中文提示，把缺失的目标词补回去。
            </Paragraph>
          ) : null}
          {question.sentence_translation ? (
            <Paragraph className="!mb-0 !mt-4 text-gray-500">
              {question.sentence_translation}
            </Paragraph>
          ) : null}
        </div>
      )}

      <div className="mx-auto mt-2 max-w-xl">
        {question.type === 'sentence_dictation' ? (
          <Input.TextArea
            value={state?.currentInput || ''}
            onChange={(event) => onInputChange(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            disabled={state?.showedAnswer || state?.isCorrect === true}
            placeholder="请输入完整英文句子"
            autoSize={{ minRows: 3, maxRows: 5 }}
            className="rounded-2xl text-lg"
          />
        ) : (
          <Input
            size="large"
            value={state?.currentInput || ''}
            onChange={(event) => onInputChange(event.target.value)}
            onPressEnter={onSubmit}
            disabled={state?.showedAnswer || state?.isCorrect === true}
            placeholder={
              question.type === 'context_cloze'
                ? '请输入提示词对应的目标词'
                : '请输入答案'
            }
            className="h-14 rounded-2xl text-center text-lg"
          />
        )}

        {state?.isCorrect === false &&
        !state.showedAnswer &&
        state.attempts < 3 ? (
          <div className="mt-4 text-center text-red-500">
            还可以再试 {3 - state.attempts} 次，提示：{question.hint}
          </div>
        ) : null}

        {state?.showedAnswer ? (
          <div className="mt-4 text-center text-orange-500">
            正确答案：
            {question.type === 'sentence_dictation'
              ? question.sentence
              : question.word}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center gap-4">
          <Button
            icon={<EyeOutlined />}
            className="rounded-xl"
            disabled={state?.showedAnswer || state?.isCorrect === true}
            onClick={onShowAnswer}
          >
            显示答案
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            className="rounded-xl border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-8"
            disabled={
              !state?.currentInput.trim() ||
              state?.showedAnswer ||
              state?.isCorrect === true
            }
            onClick={onSubmit}
          >
            提交
          </Button>
        </div>
      </div>
    </Card>
  );
}
