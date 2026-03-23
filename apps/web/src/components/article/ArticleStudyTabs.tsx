import {
  BookOutlined,
  BulbOutlined,
  SoundOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { Button, Card, Tabs, Typography } from 'antd';

import type { Article } from '@/api/article';

const { Paragraph, Text } = Typography;

interface ArticleStudyTabsProps {
  article: Article;
  activeTab: string;
  loadingTTSKey: string | null;
  onTabChange: (tab: string) => void;
  onPlaySingleTTS: (text: string) => void;
}

export function ArticleStudyTabs({
  article,
  activeTab,
  loadingTTSKey,
  onTabChange,
  onPlaySingleTTS,
}: ArticleStudyTabsProps) {
  const tabItems = [
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
          {article.tips.length > 0 ? (
            article.tips.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5"
              >
                <div className="mb-2 text-lg font-bold text-amber-900">
                  {item.title}
                </div>
                <Paragraph className="!mb-0 text-amber-900/80">
                  {item.content}
                </Paragraph>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400">
              这篇课文暂时还没有导读内容
            </div>
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
          {article.grammar.length > 0 ? (
            article.grammar.map((item, index) => (
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
                <Paragraph className="text-gray-600">
                  {item.explanation}
                </Paragraph>
                {item.examples.length > 0 ? (
                  <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      课文原句
                    </div>
                    {item.examples.map((example, exampleIndex) => (
                      <div
                        key={exampleIndex}
                        className="border-l-2 border-amber-200 pl-3"
                      >
                        <Text className="block font-medium text-gray-800">
                          {example.en}
                        </Text>
                        <Text className="block text-gray-500">
                          {example.zh}
                        </Text>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400">
              这篇课文暂时没有可对齐的语法讲解
            </div>
          )}
        </div>
      ),
    },
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
                  <div className="text-xl font-bold text-amber-700">
                    {item.word}
                  </div>
                  <Button
                    type="text"
                    size="small"
                    loading={loadingTTSKey === item.word}
                    icon={
                      loadingTTSKey === item.word ? undefined : (
                        <SoundOutlined />
                      )
                    }
                    onClick={() => onPlaySingleTTS(item.word)}
                  />
                </div>
                <div className="mb-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-slate-50 px-2 py-1">
                    UK {item.uk_phonetic || '待补充'}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2 py-1">
                    US {item.us_phonetic || '待补充'}
                  </span>
                </div>
                <Paragraph className="!mb-0 text-gray-700">
                  {item.meaning}
                </Paragraph>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400">
              这篇文章没有额外生词
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card
      className="rounded-[28px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
      bodyStyle={{ padding: 20 }}
    >
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
