import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled, RocketOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Col, Input, Modal, Row, Tag, Typography, message } from 'antd';

import { getAssessmentData, reassess, submitAssessment } from '@/api/user';
import type { AssessmentQuestion, EnglishLevelInfo, LearningGoal } from '@/api/user';

const { Title, Text, Paragraph } = Typography;

interface AssessmentModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode?: 'create' | 'update';
}

export function AssessmentModal({
  open,
  onClose,
  onComplete,
  mode = 'create',
}: AssessmentModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [assessmentData, setAssessmentData] = useState<{
    levels: EnglishLevelInfo[];
    goals: LearningGoal[];
    questions: AssessmentQuestion[];
  } | null>(null);

  const isUpdateMode = mode === 'update';
  const assessmentService = useMemo(
    () => (isUpdateMode ? reassess : submitAssessment),
    [isUpdateMode],
  );

  useRequest(getAssessmentData, {
    onSuccess: (data) => setAssessmentData(data),
    onError: (error) => {
      message.error(error.message || '获取评测数据失败');
    },
  });

  const { run: submit, loading: submitting } = useRequest(assessmentService, {
    manual: true,
    onSuccess: () => setCurrentStep(3),
    onError: (error) => {
      message.error(error.message || '提交评测失败');
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    window.setTimeout(() => {
      setCurrentStep(0);
      setSelectedLevel(null);
      setSelectedGoals([]);
      setCustomGoal('');
    }, 0);
  }, [open]);

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 scale-150 rounded-full bg-lime-200 opacity-60 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-5xl text-white shadow-xl shadow-lime-100">
          <RocketOutlined />
        </div>
      </div>

      <Title level={2} className="!mb-4 !font-black !tracking-tight !text-gray-800">
        {isUpdateMode ? '重新校准你的学习档案' : '开启你的专属学习之旅'}
      </Title>
      <Paragraph className="mx-auto mb-10 max-w-md !text-lg !leading-relaxed !text-gray-500">
        {isUpdateMode
          ? '我们会根据新的评测结果，重新调整你的学习节奏、课文难度和目标标签。'
          : '只需要不到 2 分钟，完成几个简单问题，我们就能为你生成更合适的学习计划。'}
      </Paragraph>

      <Button
        type="primary"
        size="large"
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-lime-200 transition-all hover:scale-105"
        onClick={() => setCurrentStep(1)}
      >
        开始评测
        <ArrowRightOutlined />
      </Button>
    </div>
  );

  const renderGoals = () => {
    if (!assessmentData) {
      return null;
    }

    const toggleGoal = (goalId: string) => {
      setSelectedGoals((previous) =>
        previous.includes(goalId)
          ? previous.filter((item) => item !== goalId)
          : [...previous, goalId],
      );
    };

    return (
      <div className="flex h-full flex-col animate-fade-in">
        <div className="mb-8 text-center">
          <Title level={3} className="!mb-2 !font-black !text-gray-800">
            你的学习目标是什么？
          </Title>
          <Text className="text-base text-gray-500">
            可多选。我们会优先推荐更贴近你目标的内容和训练方式。
          </Text>
        </div>

        <div className="custom-scrollbar max-h-[400px] flex-1 overflow-y-auto px-1 py-1">
          <Row gutter={[16, 16]} className="!mx-0">
            {assessmentData.goals.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <Col span={12} key={goal.id}>
                  <button
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`flex h-full w-full cursor-pointer flex-col items-center rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
                      isSelected
                        ? 'scale-[1.02] border-[var(--primary)] bg-lime-50 shadow-md'
                        : 'border-gray-100 bg-white hover:border-lime-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="mb-2 text-3xl">{goal.icon}</div>
                    <Text className={`mb-1 block text-base font-bold ${isSelected ? 'text-lime-700' : 'text-gray-700'}`}>
                      {goal.label}
                    </Text>
                    <Text className="block text-xs text-gray-400">{goal.description}</Text>
                  </button>
                </Col>
              );
            })}
          </Row>

          <div className="mb-4 mt-8">
            <Text className="mb-3 block text-sm font-bold text-gray-600">其他补充诉求（选填）</Text>
            <Input.TextArea
              value={customGoal}
              rows={3}
              maxLength={200}
              showCount
              placeholder="比如：准备面试、想能看懂英文内容、想陪孩子一起学英语"
              className="rounded-xl border-transparent bg-gray-50 p-4 text-base hover:border-lime-300 focus:border-lime-500 focus:bg-white"
              onChange={(event) => setCustomGoal(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <Button type="text" icon={<ArrowLeftOutlined />} className="font-medium text-gray-500" onClick={() => setCurrentStep(0)}>
            返回
          </Button>
          <Button
            type="primary"
            size="large"
            shape="round"
            className="px-8 font-bold shadow-md shadow-lime-200"
            disabled={selectedGoals.length === 0 && customGoal.trim().length === 0}
            onClick={() => setCurrentStep(2)}
          >
            下一步
          </Button>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    if (!assessmentData) {
      return null;
    }

    return (
      <div className="flex h-full flex-col animate-fade-in">
        <div className="mb-8 text-center">
          <Title level={3} className="!mb-2 !font-black !text-gray-800">
            你能轻松理解以下哪句话？
          </Title>
          <Text className="text-base text-gray-500">
            请选择你能完全看懂的最长、最难的一句。
          </Text>
        </div>

        <div className="custom-scrollbar max-h-[400px] flex-1 space-y-3 overflow-y-auto pb-4 pr-2">
          {assessmentData.questions.map((question) => {
            const isSelected = selectedLevel === question.level;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedLevel(question.level)}
                className={`group relative w-full cursor-pointer rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                  isSelected
                    ? 'border-[var(--primary)] bg-lime-50 shadow-md'
                    : 'border-transparent bg-gray-50 hover:border-lime-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-gray-300 bg-white group-hover:border-lime-300'
                    }`}
                  >
                    {isSelected ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                  </div>
                  <div>
                    <Text className={`block text-lg font-medium transition-colors ${isSelected ? 'text-lime-900' : 'text-gray-700'}`}>
                      {question.sentence}
                    </Text>
                    <Text className="mt-1 block text-sm text-gray-400">{question.translation}</Text>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <Button type="text" icon={<ArrowLeftOutlined />} className="font-medium text-gray-500" onClick={() => setCurrentStep(1)}>
            返回
          </Button>
          <Button
            type="primary"
            size="large"
            shape="round"
            className="px-8 font-bold shadow-md shadow-lime-200"
            disabled={selectedLevel === null}
            loading={submitting}
            onClick={() => {
              if (selectedLevel == null) {
                return;
              }
              void submit({
                english_level: selectedLevel,
                learning_goals: selectedGoals,
                custom_goal: customGoal.trim() || undefined,
              });
            }}
          >
            {isUpdateMode ? '更新我的档案' : '生成我的计划'}
          </Button>
        </div>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 rounded-full bg-emerald-200 opacity-40 blur-2xl" />
        <CheckCircleFilled className="relative z-10 text-7xl text-emerald-500 drop-shadow-sm" />
      </div>

      <Title level={2} className="!mb-3 !font-black !text-gray-800">
        {isUpdateMode ? '学习档案已更新' : '全部就绪'}
      </Title>
      <Text className="mb-8 block text-lg text-gray-500">
        {isUpdateMode ? '新的学习档案已经生效' : '你的专属英语学习档案已建立'}
      </Text>

      {selectedLevel !== null && assessmentData ? (
        <div className="relative mb-8 w-full max-w-sm overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-lime-50 to-sky-50 p-6 text-left shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/4 -translate-y-1/2 rounded-full bg-lime-100 opacity-60 blur-2xl" />

          <Text className="mb-1 block text-sm font-bold uppercase tracking-wider text-lime-500">
            当前评测等级
          </Text>
          <div className="mb-4 flex items-end gap-3">
            <Title level={2} className="!m-0 !font-black !text-lime-900">
              {assessmentData.levels[selectedLevel]?.label}
            </Title>
            <Tag color="green" className="mb-1.5 rounded-md border-0 font-bold">
              CEFR {assessmentData.levels[selectedLevel]?.cefr}
            </Tag>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/60 p-3 backdrop-blur-sm">
            <span className="font-medium text-gray-600">预估词汇量</span>
            <span className="text-lg font-bold text-lime-600">
              {assessmentData.levels[selectedLevel]?.vocabulary} 词
            </span>
          </div>
        </div>
      ) : null}

      <Button
        type="primary"
        size="large"
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-lime-200 transition-all hover:scale-105"
        onClick={onComplete}
      >
        进入学习中心
        <ArrowRightOutlined />
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      footer={null}
      closable
      maskClosable={false}
      centered
      className="custom-assessment-modal"
      styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: '2rem' } }}
    >
      <div className="relative flex h-[600px] flex-col">
        {currentStep > 0 && currentStep < 3 ? (
          <div className="absolute left-0 right-0 top-0 z-10 bg-white pb-2 pt-5">
            <div className="mx-8 h-1.5 rounded-full bg-gray-100 sm:mx-12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-hidden p-8 sm:p-12">
          {currentStep === 0 ? renderWelcome() : null}
          {currentStep === 1 ? renderGoals() : null}
          {currentStep === 2 ? renderTest() : null}
          {currentStep === 3 ? renderComplete() : null}
        </div>
      </div>

      <style>{`
        .custom-assessment-modal .ant-modal-close {
          top: 24px;
          right: 24px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 9999px;
          z-index: 50;
        }

        .custom-assessment-modal .ant-modal-close:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 9999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </Modal>
  );
}
