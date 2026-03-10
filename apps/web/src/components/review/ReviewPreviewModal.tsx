/**
 * 复习前模糊预览弹窗
 * 让用户选择自己对文章内容的记忆程度
 */
import { useState } from 'react';
import { Modal, Button, Typography, Space, message } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  QuestionCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type PreviewAssessment = 'clear' | 'fuzzy' | 'forgot';

interface ReviewPreviewModalProps {
  open: boolean;
  articleTitle: string;
  onConfirm: (assessment: PreviewAssessment) => void;
  onCancel: () => void;
}

export function ReviewPreviewModal({
  open,
  articleTitle,
  onConfirm,
  onCancel,
}: ReviewPreviewModalProps) {
  const [selected, setSelected] = useState<PreviewAssessment | null>(null);

  const handleConfirm = () => {
    if (!selected) {
      message.warning('请选择一项');
      return;
    }
    onConfirm(selected);
  };

  const options: { value: PreviewAssessment; icon: React.ReactNode; title: string; desc: string; color: string }[] = [
    {
      value: 'clear',
      icon: <EyeOutlined className="text-2xl text-emerald-500" />,
      title: '记得很清楚',
      desc: '内容还记得，可以直接做题',
      color: 'emerald',
    },
    {
      value: 'fuzzy',
      icon: <QuestionCircleOutlined className="text-2xl text-amber-500" />,
      title: '有点模糊',
      desc: '需要快速浏览一遍文章',
      color: 'amber',
    },
    {
      value: 'forgot',
      icon: <EyeInvisibleOutlined className="text-2xl text-rose-500" />,
      title: '基本忘了',
      desc: '需要完整重新阅读文章',
      color: 'rose',
    },
  ];

  return (
    <Modal
      open={open}
      footer={null}
      closable={true}
      onCancel={onCancel}
      maskClosable={true}
      centered
      width={480}
      className="review-preview-modal"
    >
      <div className="text-center pt-4">
        <Title level={4} className="!mb-2 !text-gray-800">
          开始复习前
        </Title>
        <Text className="text-gray-500 block mb-6">
          还记得「{articleTitle.length > 20 ? articleTitle.slice(0, 20) + '...' : articleTitle}」的内容吗？
        </Text>

        <Space direction="vertical" className="w-full gap-3 mb-6">
          {options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <Button
                key={option.value}
                type={isSelected ? 'primary' : 'default'}
                size="large"
                className={`w-full h-auto py-4 rounded-xl text-left flex items-center gap-4 ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelected(option.value)}
              >
                <span className={isSelected ? 'text-indigo-600' : ''}>{option.icon}</span>
                <div className="flex-1">
                  <div className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {option.title}
                  </div>
                  <div className="text-xs text-gray-500 font-normal">
                    {option.desc}
                  </div>
                </div>
              </Button>
            );
          })}
        </Space>

        <Button
          type="primary"
          size="large"
          block
          className="rounded-xl font-bold h-12"
          icon={<ArrowRightOutlined />}
          disabled={!selected}
          onClick={handleConfirm}
        >
          开始复习
        </Button>
      </div>
    </Modal>
  );
}
