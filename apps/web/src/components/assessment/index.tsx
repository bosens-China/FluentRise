/**
 * 英语水平评估组件
 */
import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Typography,
  Row,
  Col,
  Tag,
  message,
} from 'antd';
import {
  CheckCircleFilled,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';

import { submitAssessment, getAssessmentData } from '@/api/user';
import type {
  AssessmentQuestion,
  EnglishLevelInfo,
  LearningGoal,
} from '@/api/user';

const { Title, Text, Paragraph } = Typography;

interface AssessmentModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AssessmentModal({
  open,
  onClose,
  onComplete,
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

  // 获取评估数据
  useRequest(getAssessmentData, {
    manual: false,
    onSuccess: (data) => setAssessmentData(data),
    onError: (error) => {
      message.error(error.message || '获取评估数据失败');
    },
  });

  // 提交评估
  const { run: submit, loading: submitting } = useRequest(submitAssessment, {
    manual: true,
    onSuccess: () => {
      setCurrentStep(3);
    },
    onError: (error) => {
      message.error(error.message || '提交评估失败');
    },
  });

  // 每次打开弹窗时重置状态
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setCurrentStep(0);
        setSelectedLevel(null);
        setSelectedGoals([]);
        setCustomGoal('');
      }, 0);
    }
  }, [open]);

  // 第一步：欢迎
  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-indigo-200 blur-2xl rounded-full opacity-50 scale-150"></div>
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-5xl text-white shadow-xl shadow-indigo-200">
          <RocketOutlined />
        </div>
      </div>
      <Title level={2} className="!mb-4 font-black tracking-tight text-gray-800">
        开启你的专属学习之旅
      </Title>
      <Paragraph className="mx-auto max-w-md text-lg text-gray-500 leading-relaxed mb-10">
        只需不到 2 分钟，完成几个简单的问题，我们将为你量身定制最适合的英语学习方案。
      </Paragraph>
      
      <Button
        type="primary"
        size="large"
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-all"
        onClick={() => setCurrentStep(1)}
      >
        开始评估 <ArrowRightOutlined />
      </Button>
    </div>
  );

  // 第二步：学习目标
  const renderGoals = () => {
    if (!assessmentData) return null;

    const toggleGoal = (goalId: string) => {
      if (selectedGoals.includes(goalId)) {
        setSelectedGoals(selectedGoals.filter((g) => g !== goalId));
      } else {
        setSelectedGoals([...selectedGoals, goalId]);
      }
    };

    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="text-center mb-8">
          <Title level={3} className="!mb-2 font-black text-gray-800">
            你的学习目标是什么？
          </Title>
          <Text className="text-gray-500 text-base">
            可多选。我们将为你推送最符合你兴趣和需求的内容。
          </Text>
        </div>

        <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar max-h-[400px]">
          <Row gutter={[16, 16]} className="!mx-0">
            {assessmentData.goals.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <Col span={12} key={goal.id}>
                  <div
                    onClick={() => toggleGoal(goal.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 h-full transition-all duration-300 flex flex-col items-center text-center ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-md scale-[1.02]'
                        : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-3xl mb-2">{goal.icon}</div>
                    <Text className={`block font-bold text-base mb-1 ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {goal.label}
                    </Text>
                    <Text className="block text-xs text-gray-400">
                      {goal.description}
                    </Text>
                  </div>
                </Col>
              );
            })}
          </Row>

          <div className="mt-8 mb-4">
            <Text className="mb-3 block text-sm font-bold text-gray-600">其他补充诉求（选填）</Text>
            <Input.TextArea
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="例如：准备外企面试、想看懂英文原著、想去纽约旅游..."
              className="bg-gray-50 border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white rounded-xl p-4 text-base"
              maxLength={200}
              showCount
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <Button type="text" onClick={() => setCurrentStep(0)} icon={<ArrowLeftOutlined />} className="text-gray-500 font-medium">
            返回
          </Button>
          <Button
            type="primary"
            size="large"
            shape="round"
            className="px-8 font-bold shadow-md shadow-indigo-200"
            disabled={selectedGoals.length === 0 && customGoal.trim().length === 0}
            onClick={() => setCurrentStep(2)}
          >
            下一步
          </Button>
        </div>
      </div>
    );
  };

  // 第三步：句子测试
  const renderTest = () => {
    if (!assessmentData) return null;

    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="text-center mb-8">
          <Title level={3} className="!mb-2 font-black text-gray-800">
            你能轻松理解以下哪句话？
          </Title>
          <Text className="text-gray-500 text-base">
            请选择你能完全看懂的<span className="font-bold text-indigo-600">最长/最难</span>的句子
          </Text>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar pb-4 max-h-[400px]">
          {assessmentData.questions.map((q) => {
            const isSelected = selectedLevel === q.level;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedLevel(q.level)}
                className={`group relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
                    : 'border-transparent bg-gray-50 hover:border-indigo-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 bg-white group-hover:border-indigo-300'
                  }`}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <Text className={`block text-lg font-medium transition-colors ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {q.sentence}
                    </Text>
                    <Text className="block text-sm text-gray-400 mt-1">
                      {q.translation}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <Button type="text" onClick={() => setCurrentStep(1)} icon={<ArrowLeftOutlined />} className="text-gray-500 font-medium">
            返回
          </Button>
          <Button
            type="primary"
            size="large"
            shape="round"
            className="px-8 font-bold shadow-md shadow-indigo-200"
            disabled={selectedLevel === null || submitting}
            loading={submitting}
            onClick={() => {
              submit({
                english_level: selectedLevel!,
                learning_goals: selectedGoals,
                custom_goal: customGoal || undefined,
              });
            }}
          >
            生成我的计划
          </Button>
        </div>
      </div>
    );
  };

  // 第四步：完成
  const renderComplete = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-emerald-200 blur-2xl rounded-full opacity-40 scale-150"></div>
        <CheckCircleFilled className="text-7xl text-emerald-500 relative z-10 drop-shadow-sm" />
      </div>
      
      <Title level={2} className="!mb-3 font-black text-gray-800">
        全部就绪！
      </Title>
      <Text className="mb-8 block text-lg text-gray-500">
        你的专属英语学习档案已建立
      </Text>

      {selectedLevel !== null && assessmentData && (
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden mb-8 text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-60 -translate-y-1/2 translate-x-1/4"></div>
          
          <Text className="block text-sm font-bold text-indigo-400 mb-1 uppercase tracking-wider">
            当前评估等级
          </Text>
          <div className="flex items-end gap-3 mb-4">
            <Title level={2} className="!m-0 text-indigo-900 font-black">
              {assessmentData.levels[selectedLevel]?.label}
            </Title>
            <Tag color="indigo" className="mb-1.5 rounded-md font-bold border-0">
              CEFR {assessmentData.levels[selectedLevel]?.cefr}
            </Tag>
          </div>
          
          <div className="bg-white/60 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm">
            <span className="text-gray-600 font-medium">预估词汇量</span>
            <span className="text-indigo-600 font-bold text-lg">{assessmentData.levels[selectedLevel]?.vocabulary} 词</span>
          </div>
        </div>
      )}

      <Button 
        type="primary" 
        size="large" 
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-all"
        onClick={onComplete}
      >
        进入学习中心 <ArrowRightOutlined />
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      footer={null}
      closable={true}
      maskClosable={false}
      centered
      className="custom-assessment-modal"
      styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: '2rem' } }}
    >
      <div className="flex h-[600px] flex-col relative">
        {/* 顶部进度条 */}
        {currentStep > 0 && currentStep < 3 && (
          <div className="absolute top-0 left-0 right-0 pt-5 pb-2 bg-white z-10">
            <div className="h-1.5 bg-gray-100 rounded-full mx-8 sm:mx-12">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 p-8 sm:p-12 overflow-hidden">
          {currentStep === 0 && renderWelcome()}
          {currentStep === 1 && renderGoals()}
          {currentStep === 2 && renderTest()}
          {currentStep === 3 && renderComplete()}
        </div>
      </div>
      <style>{`
        .custom-assessment-modal .ant-modal-close {
          top: 24px;
          right: 24px;
          background: rgba(0,0,0,0.04);
          border-radius: 50%;
          z-index: 50;
        }
        .custom-assessment-modal .ant-modal-close:hover {
          background: rgba(0,0,0,0.08);
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </Modal>
  );
}
