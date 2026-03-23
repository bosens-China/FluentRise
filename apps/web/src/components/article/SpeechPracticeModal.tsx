import { Modal } from 'antd';

import type { Article } from '@/api/article';

import { SpeechPracticePanel } from './SpeechPracticePanel';

interface SpeechPracticeModalProps {
  open: boolean;
  article: Article;
  onClose: () => void;
}

export function SpeechPracticeModal({
  open,
  article,
  onClose,
}: SpeechPracticeModalProps) {
  return (
    <Modal
      open={open}
      width={760}
      footer={null}
      centered
      destroyOnClose
      maskClosable={false}
      title="朗读解析"
      onCancel={onClose}
    >
      <SpeechPracticePanel article={article} />
    </Modal>
  );
}
