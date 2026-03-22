import type { RadioChangeEvent } from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  EditOutlined,
  SoundOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { Button, Card, Radio, Space, Tabs, Typography } from 'antd';

import type { Article } from '@/api/article';

import { EMPTY_EXERCISES, normalizeAnswer } from './articleReader.shared';

const { Paragraph, Text } = Typography;

interface ArticleStudyTabsProps {
  article: Article;
  activeTab: string;
  exerciseAnswers: Record<number, string>;
  checkedMap: Record<number, boolean>;
  onTabChange: (tab: string) => void;
  onAnswerSelect: (exerciseIndex: number, answer: string) => void;
  onCheckAnswer: (exerciseIndex: number) => void;
  onPlaySingleTTS: (text: string) => void;
}

export function ArticleStudyTabs({
  article,
  activeTab,
  exerciseAnswers,
  checkedMap,
  onTabChange,
  onAnswerSelect,
  onCheckAnswer,
  onPlaySingleTTS,
}: ArticleStudyTabsProps) {
  const exercises = article.exercises ?? EMPTY_EXERCISES;

  const tabItems = [
    {
      key: 'vocabulary',
      label: (
        <span className="flex items-center gap-1.5">
          <TranslationOutlined />
          生词
        </span>
      ),
      children: (
        <div className="mt-4 space-y-4 pr-2">
          {article.vocabulary && article.vocabulary.length > 0 ? (
            article.vocabulary.map((item) => (
              <div
                key={item.word}
                className="rounded-2xl border border-amber-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xl font-bold text-amber-700">{item.word}</div>
                  <Button type="text" size="small" icon={<SoundOutlined />} onClick={() => onPlaySingleTTS(item.word)} />
                </div>
                <div className="mb-2 text-xs text-gray-500">
                  {item.uk_phonetic ? `UK ${item.uk_phonetic}` : ''}
                  {item.uk_phonetic && item.us_phonetic ? '  ' : ''}
                  {item.us_phonetic ? `US ${item.us_phonetic}` : ''}
                </div>
                <Paragraph className="!mb-0 text-gray-700">{item.meaning}</Paragraph>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400">这篇文章没有额外生词</div>
          )}
        </div>
      ),
    },
    {
      key: 'grammar',
      label: (
        <span className="flex items-center gap-1.5">
          <BookOutlined />
          语法
        </span>
      ),
      children: (
        <div className="mt-4 space-y-4 pr-2">
          {article.grammar.map((item, index) => (
            <div
              key={`${item.point}-${index}`}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-700">
                  {index + 1}
                </span>
                {item.point}
              </div>
              <Paragraph className="text-gray-600">{item.explanation}</Paragraph>
              {item.examples.length > 0 ? (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  {item.examples.map((example, exampleIndex) => (
                    <div key={exampleIndex} className="border-l-2 border-amber-200 pl-3">
                      <Text className="block font-medium text-gray-800">{example.en}</Text>
                      <Text className="block text-gray-500">{example.zh}</Text>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'tips',
      label: (
        <span className="flex items-center gap-1.5">
          <BulbOutlined />
          导读
        </span>
      ),
      children: (
        <div className="mt-4 space-y-4 pr-2">
          {article.tips.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5"
            >
              <div className="mb-2 text-lg font-bold text-amber-900">{item.title}</div>
              <Paragraph className="!mb-0 text-amber-900/80">{item.content}</Paragraph>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'exercises',
      label: (
        <span className="flex items-center gap-1.5">
          <EditOutlined />
          练习
        </span>
      ),
      children: (
        <div className="mt-4 space-y-6 pr-2">
          {exercises.length > 0 ? (
            exercises.map((exercise, index) => {
              const isChecked = checkedMap[index];
              const currentAnswer = exerciseAnswers[index] || '';
              const isCorrect = normalizeAnswer(currentAnswer) === normalizeAnswer(exercise.answer);

              return (
                <div
                  key={`${exercise.question}-${index}`}
                  className={`rounded-2xl border p-6 ${
                    !isChecked
                      ? 'border-slate-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)]'
                      : isCorrect
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                  }`}
                >
                  <div className="mb-3 text-xs font-bold tracking-[0.16em] text-gray-400">QUESTION {index + 1}</div>
                  <Paragraph className="text-lg font-medium text-gray-800">{exercise.question}</Paragraph>

                  {exercise.type === 'choice' && exercise.options ? (
                    <Radio.Group
                      value={currentAnswer}
                      onChange={(event: RadioChangeEvent) => onAnswerSelect(index, event.target.value)}
                      className="w-full"
                    >
                      <Space direction="vertical" className="w-full">
                        {exercise.options.map((option) => (
                          <Radio
                            key={option}
                            value={option}
                            disabled={isChecked}
                            className="m-0 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            {option}
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  ) : null}

                  {exercise.type === 'fill' ? (
                    <input
                      value={currentAnswer}
                      disabled={isChecked}
                      onChange={(event) => onAnswerSelect(index, event.target.value)}
                      placeholder="请输入答案"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none"
                    />
                  ) : null}

                  {!isChecked ? (
                    <Button
                      type="primary"
                      shape="round"
                      size="large"
                      className="mt-5 border-0 bg-gradient-to-r from-amber-500 to-orange-500"
                      disabled={!currentAnswer}
                      onClick={() => onCheckAnswer(index)}
                    >
                      检查答案
                    </Button>
                  ) : (
                    <div
                      className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect ? '回答正确，做得很好。' : `正确答案：${exercise.answer || ''}`}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-400">这篇文章还没有课后练习</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card className="rounded-[28px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]" bodyStyle={{ padding: 20 }}>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        items={tabItems}
        centered
        size="large"
        className="[&_.ant-tabs-nav::before]:border-0"
      />
    </Card>
  );
}
