import { BookOutlined, PartitionOutlined, SwapOutlined } from '@ant-design/icons';
import { Card, Drawer, Empty, Skeleton, Space, Tag, Typography } from 'antd';

import type { SentenceBreakdownResponse } from '@/api/aiChat';

const { Paragraph, Text } = Typography;

interface SentenceBreakdownDrawerProps {
  open: boolean;
  loading: boolean;
  sentence: string;
  data: SentenceBreakdownResponse | null;
  onClose: () => void;
}

export function SentenceBreakdownDrawer({
  open,
  loading,
  sentence,
  data,
  onClose,
}: SentenceBreakdownDrawerProps) {
  return (
    <Drawer
      title="句子拆解助手"
      placement="right"
      width={520}
      onClose={onClose}
      open={open}
      destroyOnClose={false}
    >
      <div className="space-y-4">
        <Card className="rounded-3xl border-slate-100 bg-slate-50 shadow-none">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Original</div>
          <Paragraph className="!mb-0 text-lg font-semibold leading-8 text-slate-800">{sentence}</Paragraph>
        </Card>

        {loading ? (
          <Card className="rounded-3xl border-slate-100 shadow-none">
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : null}

        {!loading && !data ? (
          <Card className="rounded-3xl border-slate-100 shadow-none">
            <Empty description="还没有拆解结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        ) : null}

        {!loading && data ? (
          <>
            <Card className="rounded-3xl border-amber-100 bg-amber-50 shadow-none">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Translation</div>
              <Paragraph className="!mb-0 text-base leading-7 text-amber-900">{data.translation}</Paragraph>
            </Card>

            <Card
              className="rounded-3xl border-slate-100 shadow-none"
              title={
                <Space>
                  <PartitionOutlined />
                  <span>分块拆解</span>
                </Space>
              }
            >
              <div className="space-y-3">
                {data.chunks.map((item) => (
                  <div
                    key={`${item.text}-${item.explanation}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <Text strong className="block text-slate-800">
                      {item.text}
                    </Text>
                    <Text className="mt-2 block leading-7 text-slate-500">{item.explanation}</Text>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              className="rounded-3xl border-slate-100 shadow-none"
              title={
                <Space>
                  <BookOutlined />
                  <span>关键词解释</span>
                </Space>
              }
            >
              <div className="space-y-3">
                {data.keywords.length > 0 ? (
                  data.keywords.map((item) => (
                    <div
                      key={`${item.word}-${item.usage}`}
                      className="rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <Space wrap className="mb-2">
                        <Tag className="rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">
                          {item.word}
                        </Tag>
                        <Text className="text-slate-700">{item.meaning}</Text>
                      </Space>
                      <Text className="block leading-7 text-slate-500">{item.usage}</Text>
                    </div>
                  ))
                ) : (
                  <Text className="text-slate-500">这句主要建议先整句模仿，暂时没有额外关键词。</Text>
                )}
              </div>
            </Card>

            <Card
              className="rounded-3xl border-slate-100 shadow-none"
              title={
                <Space>
                  <SwapOutlined />
                  <span>句型骨架</span>
                </Space>
              }
            >
              <Paragraph className="!mb-2 text-base font-semibold text-slate-800">{data.pattern}</Paragraph>
              <Paragraph className="!mb-0 leading-7 text-slate-500">{data.pattern_explanation}</Paragraph>
            </Card>

            <Card className="rounded-3xl border-slate-100 shadow-none" title="可替换模板">
              <div className="space-y-3">
                {data.reusable_examples.map((item, index) => (
                  <div key={`${item.en}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <Text strong className="block text-slate-800">
                      {item.en}
                    </Text>
                    <Text className="mt-2 block text-slate-500">{item.zh}</Text>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl border-emerald-100 bg-emerald-50 shadow-none" title="更简单版本">
              <Paragraph className="!mb-0 text-base leading-7 text-emerald-900">{data.simpler_version}</Paragraph>
            </Card>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
