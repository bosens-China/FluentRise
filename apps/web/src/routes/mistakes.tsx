import { createFileRoute, redirect } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Badge, Card, Empty, List, Space, Tag, Typography } from 'antd';

import { getMistakeBook } from '@/api/mistake';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { isAuthenticated } from '@/utils/request';

const { Paragraph, Text, Title } = Typography;

export const Route = createFileRoute('/mistakes')({
  component: MistakesPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
});

function MistakesPage() {
  const { data, loading } = useRequest(getMistakeBook);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Title level={2} className="!mb-2 !font-black !text-gray-800">
          错题本
        </Title>
        <Text className="text-base text-gray-500">
          这里会自动沉淀你在课文练习和游乐园里做错的内容，游乐园也会优先从这里抽题。
        </Text>
      </div>

      <Card className="mb-6 rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-4">
          <Badge count={data?.pending_total ?? 0} color="#f59e0b" showZero>
            <Tag className="rounded-full border-0 bg-amber-50 px-4 py-2 text-amber-700">待巩固</Tag>
          </Badge>
          <Badge count={data?.mastered_total ?? 0} color="#10b981" showZero>
            <Tag className="rounded-full border-0 bg-emerald-50 px-4 py-2 text-emerald-700">已掌握</Tag>
          </Badge>
          <Tag className="rounded-full border-0 bg-slate-100 px-4 py-2 text-slate-600">
            共 {data?.total ?? 0} 条
          </Tag>
        </div>
      </Card>

      <Card loading={loading} className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        {!data || data.items.length === 0 ? (
          <Empty description="目前还没有错题，继续保持" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={data.items}
            renderItem={(item) => (
              <List.Item className="!border-b !border-slate-100 !py-5">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Tag className="rounded-full border-0 bg-white px-3 py-1 text-slate-600">{item.source_type}</Tag>
                    <Tag className="rounded-full border-0 bg-white px-3 py-1 text-slate-600">{item.item_type}</Tag>
                    {item.is_mastered ? (
                      <Tag className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-emerald-700">已掌握</Tag>
                    ) : (
                      <Tag className="rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">待巩固</Tag>
                    )}
                  </div>

                  <Title level={4} className="!mb-2 !text-gray-800">
                    {item.target_text}
                  </Title>

                  {item.prompt_text ? <Paragraph className="!mb-2 text-gray-600">题干：{item.prompt_text}</Paragraph> : null}
                  {item.last_user_answer ? (
                    <Paragraph className="!mb-2 text-rose-500">最近一次答案：{item.last_user_answer}</Paragraph>
                  ) : null}
                  {item.context_text ? <Paragraph className="!mb-0 text-gray-500">上下文：{item.context_text}</Paragraph> : null}

                  <Space className="mt-4">
                    <Tag className="rounded-full border-0 bg-white px-3 py-1 text-slate-600">错了 {item.mistake_count} 次</Tag>
                    <Tag className="rounded-full border-0 bg-white px-3 py-1 text-slate-600">纠正 {item.correct_count} 次</Tag>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </DashboardLayout>
  );
}
