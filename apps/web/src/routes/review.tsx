import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Typography, Card, Empty, Tag, Button, Pagination, Spin, message } from 'antd';
import { ReadOutlined, CalendarOutlined } from '@ant-design/icons';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getArticleHistory } from '@/api/article';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const Route = createFileRoute('/review')({
  component: ReviewPage,
});

function ReviewPage() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    run: fetchHistory,
  } = useRequest(
    (page = 1, pageSize = 12) => getArticleHistory(page, pageSize),
    {
      defaultParams: [1, 12],
      onError: (error) => {
        message.error(error.message || '获取复习记录失败');
      },
    },
  );

  const getLevelLabel = (level: number) => {
    const labels = [
      '零基础',
      '入门',
      '初级',
      '初中级',
      '中级',
      '中高级',
      '高级',
    ];
    return labels[level] || '未知';
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Title
          level={2}
          className="mb-2! font-black! text-gray-800 tracking-tight"
        >
          复习中心
        </Title>
        <Text className="text-gray-500 text-base">
          温故而知新，回顾你学习过的文章。
        </Text>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (data?.items || []).length === 0 ? (
        <Empty description="暂无学习记录" className="py-20" />
      ) : (
        <>
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}
          >
            {(data?.items || []).map((item) => (
              <Card
                key={item.id}
                className="border-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all rounded-2xl h-full flex flex-col cursor-pointer"
                bodyStyle={{
                  padding: '24px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() =>
                  navigate({
                    to: '/article/$articleId',
                    params: { articleId: String(item.id) },
                  })
                }
              >
                <div className="flex justify-between items-start mb-3">
                  <Tag
                    color={item.is_completed ? 'success' : 'processing'}
                    className="m-0 rounded-full border-0 font-medium"
                  >
                    {item.is_completed ? '已完成' : '进行中'}
                  </Tag>
                  <div className="text-gray-400 text-sm flex items-center gap-1">
                    <CalendarOutlined />{' '}
                    {dayjs(item.publish_date).format('MM-DD')}
                  </div>
                </div>

                <Title
                  level={4}
                  className="!mt-0 !mb-4 line-clamp-2 text-gray-800 hover:text-indigo-600 transition-colors"
                >
                  {item.title}
                </Title>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                  <Tag className="m-0 bg-indigo-50 text-indigo-600 border-0 rounded-md">
                    {getLevelLabel(item.level)}
                  </Tag>
                  <Button
                    type="text"
                    className="text-indigo-500 font-medium hover:bg-indigo-50"
                    icon={<ReadOutlined />}
                  >
                    复习
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <Pagination
              onChange={(page, pageSize) => fetchHistory(page, pageSize)}
              total={data?.total || 0}
              pageSize={12}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
