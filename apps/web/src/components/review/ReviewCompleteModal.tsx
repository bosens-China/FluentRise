import { useState } from 'react';
import {
  CheckCircleFilled,
  FrownOutlined,
  MehOutlined,
  SmileOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button, Modal, Radio, Space, Tag, Typography, message } from 'antd';

import { submitReview, type SubmitReviewResponse } from '@/api/review';
import { useSystemConfig } from '@/hooks/useSystemConfig';

const { Text, Title } = Typography;

interface ReviewCompleteModalProps {
  open: boolean;
  scheduleId: number;
  currentStage: number;
  isQuickMode: boolean;
  durationSeconds: number;
  correctCount?: number;
  totalCount?: number;
  previewAssessment?: 'clear' | 'fuzzy' | 'forgot';
  onComplete: (result: SubmitReviewResponse) => void;
  onCancel: () => void;
}

export function ReviewCompleteModal({
  open,
  scheduleId,
  currentStage,
  isQuickMode,
  durationSeconds,
  correctCount,
  totalCount,
  previewAssessment,
  onComplete,
  onCancel,
}: ReviewCompleteModalProps) {
  const { data: systemConfig } = useSystemConfig();
  const [qualityAssessment, setQualityAssessment] = useState<
    'mastered' | 'fuzzy' | 'forgot' | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const totalStages = systemConfig?.review.total_stages ?? 9;

  const handleSubmit = async () => {
    if (!qualityAssessment) {
      message.warning('请选择复习质量自评');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitReview(scheduleId, {
        quality_assessment: qualityAssessment,
        is_quick_mode: isQuickMode,
        duration_seconds: durationSeconds,
        correct_count: correctCount,
        total_count: totalCount,
        preview_assessment: previewAssessment,
      });
      onComplete(result);
    } catch {
      message.error('提交复习失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssessmentOption = (type: 'mastered' | 'fuzzy' | 'forgot') => {
    const options = {
      mastered: {
        icon: <SmileOutlined className="text-2xl text-emerald-500" />,
        title: '完全掌握',
        desc: '记得很清楚，感觉很稳。',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        titleColor: 'text-emerald-700',
      },
      fuzzy: {
        icon: <MehOutlined className="text-2xl text-amber-500" />,
        title: '有点模糊',
        desc: '大部分记得，有些细节忘了。',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        titleColor: 'text-amber-700',
      },
      forgot: {
        icon: <FrownOutlined className="text-2xl text-rose-500" />,
        title: '基本忘了',
        desc: '需要重新学习一遍。',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        titleColor: 'text-rose-700',
      },
    };
    return options[type];
  };

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      width={480}
      className="review-complete-modal"
    >
      <div className="pt-4 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
          <CheckCircleFilled className="text-4xl text-white" />
        </div>

        <Title level={3} className="!mb-2 !text-gray-800">
          复习完成
        </Title>

        <div className="mb-6">
          <Tag color="indigo" className="rounded-full px-4 py-1 text-base font-bold">
            第 {currentStage}/{totalStages} 轮复习
          </Tag>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          {isQuickMode ? (
            <Tag icon={<ThunderboltOutlined />} className="rounded-full px-3 py-1">
              快速复习
            </Tag>
          ) : null}
          <Tag className="rounded-full px-3 py-1">
            用时 {Math.ceil(durationSeconds / 60)} 分钟
          </Tag>
          {correctCount !== undefined && totalCount !== undefined ? (
            <Tag
              className="rounded-full px-3 py-1"
              color={correctCount === totalCount ? 'success' : 'warning'}
            >
              答题 {correctCount}/{totalCount}
            </Tag>
          ) : null}
        </div>

        <div className="mb-8 text-left">
          <Text strong className="mb-4 block text-center text-gray-700">
            这次复习感觉如何？
          </Text>

          <Radio.Group
            value={qualityAssessment}
            onChange={(event) => setQualityAssessment(event.target.value)}
            className="w-full"
          >
            <Space direction="vertical" className="w-full gap-3">
              {(['mastered', 'fuzzy', 'forgot'] as const).map((type) => {
                const option = getAssessmentOption(type);
                const isSelected = qualityAssessment === type;

                return (
                  <Radio key={type} value={type} className="w-full">
                    <div
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? `${option.bgColor} ${option.borderColor}`
                          : 'border-transparent bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      {option.icon}
                      <div className="text-left">
                        <div className={`font-bold ${option.titleColor}`}>
                          {option.title}
                        </div>
                        <div className="text-xs text-gray-500">{option.desc}</div>
                      </div>
                    </div>
                  </Radio>
                );
              })}
            </Space>
          </Radio.Group>
        </div>

        <div className="flex gap-3">
          <Button size="large" className="flex-1 rounded-xl" onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            size="large"
            className="flex-1 rounded-xl border-0 bg-gradient-to-r from-emerald-500 to-teal-500 font-bold"
            icon={<TrophyOutlined />}
            loading={submitting}
            disabled={!qualityAssessment}
            onClick={handleSubmit}
          >
            确认完成
          </Button>
        </div>
      </div>
    </Modal>
  );
}
