/**
 * 今日复习提醒弹窗
 */
import { Modal, Button, List, Tag, Typography, Space } from 'antd';
import {
  BellOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import {
  getTodayReviews,
  getReviewStats,
  type ReviewItem,
} from '@/api/review';

const { Title, Text } = Typography;

interface ReviewReminderModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReviewReminderModal({ open, onClose }: ReviewReminderModalProps) {
  const navigate = useNavigate();
  
  const { data: reviewList, loading: listLoading } = useRequest(getTodayReviews, {
    manual: !open,
    ready: open,
  });
  
  const { data: stats } = useRequest(getReviewStats, {
    manual: !open,
    ready: open,
  });

  // 开始复习
  const startReview = (item: ReviewItem) => {
    onClose();
    navigate({
      to: '/article/$articleId',
      params: { articleId: String(item.article_id) },
      search: { review: item.schedule_id },
    });
  };

  // 前往复习中心
  const goToReviewCenter = () => {
    onClose();
    navigate({ to: '/review' });
  };

  // 获取阶段颜色
  const getStageColor = (stage: number): string => {
    const colors = ['blue', 'cyan', 'geekblue', 'purple', 'magenta', 'red', 'volcano'];
    return colors[stage - 1] || 'default';
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      closable={true}
      maskClosable={true}
      centered
      className="review-reminder-modal"
      styles={{ body: { padding: '32px' } }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
          <BellOutlined className="text-3xl text-white" />
        </div>
        <Title level={3} className="!mb-2 !text-gray-800">
          今日复习提醒
        </Title>
        <Text className="text-gray-500">
          根据艾宾浩斯遗忘曲线，今天要复习 {reviewList?.total || 0} 个内容
        </Text>
      </div>

      {/* 连续打卡统计 */}
      {stats && stats.streak_days > 0 && (
        <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
          <FireOutlined className="text-orange-500 text-lg" />
          <Text className="text-orange-700 font-medium">
            连续复习 <span className="font-bold text-orange-800">{stats.streak_days}</span> 天
          </Text>
          {stats.weekly_completed > 0 && (
            <Text className="text-orange-600/70 text-sm">
              · 本周已完成 {stats.weekly_completed}/{stats.weekly_total}
            </Text>
          )}
        </div>
      )}

      {/* 复习列表 */}
      <List
        loading={listLoading}
        dataSource={reviewList?.items || []}
        renderItem={(item) => (
          <List.Item
            className="!p-0 !border-0 !mb-3"
          >
            <div 
              className="w-full p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => startReview(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h4>
                  <Space size="small" className="flex-wrap">
                    <Tag 
                      color={getStageColor(item.stage)}
                      className="rounded-full border-0 font-medium"
                    >
                      {item.stage_label}
                    </Tag>
                    <Tag 
                      icon={<ClockCircleOutlined />}
                      className="rounded-full border-0 bg-gray-50 text-gray-500"
                    >
                      {item.days_until_next === 0 
                        ? '今天' 
                        : `${item.days_until_next}天后`
                      }
                    </Tag>
                  </Space>
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<ReloadOutlined />}
                  className="ml-3 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    startReview(item);
                  }}
                >
                  复习
                </Button>
              </div>
            </div>
          </List.Item>
        )}
      />

      {/* 底部按钮 */}
      <div className="flex gap-3 mt-6">
        <Button
          size="large"
          className="flex-1 rounded-xl"
          onClick={onClose}
        >
          稍后再说
        </Button>
        <Button
          type="primary"
          size="large"
          className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 border-0"
          icon={<ReloadOutlined />}
          onClick={goToReviewCenter}
        >
          去复习中心
        </Button>
      </div>
    </Modal>
  );
}
