import { useEffect, useMemo, useState } from 'react';
import { useRequest } from 'ahooks';
import { Modal, message } from 'antd';

import { getAssessmentData, reassess, submitAssessment } from '@/api/user';
import type {
  AssessmentQuestion,
  EnglishLevelInfo,
  LearningGoal,
  UpdateAssessmentRequest,
} from '@/api/user';

import { AssessmentWelcome } from './AssessmentWelcome';
import { AssessmentGoals } from './AssessmentGoals';
import { AssessmentTest } from './AssessmentTest';
import { AssessmentComplete } from './AssessmentComplete';

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
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
      setSelectedInterests([]);
      setCustomGoal('');
    }, 0);
  }, [open]);

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
          {currentStep === 0 ? (
            <AssessmentWelcome isUpdateMode={isUpdateMode} onNext={() => setCurrentStep(1)} />
          ) : null}
          {currentStep === 1 && assessmentData ? (
            <AssessmentGoals
              goals={assessmentData.goals}
              selectedGoals={selectedGoals}
              selectedInterests={selectedInterests}
              customGoal={customGoal}
              onSelectGoals={setSelectedGoals}
              onSelectInterests={setSelectedInterests}
              onCustomGoalChange={setCustomGoal}
              onBack={() => setCurrentStep(0)}
              onNext={() => setCurrentStep(2)}
            />
          ) : null}
          {currentStep === 2 && assessmentData ? (
            <AssessmentTest
              questions={assessmentData.questions}
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
              onBack={() => setCurrentStep(1)}
              submitting={submitting}
              isUpdateMode={isUpdateMode}
              onSubmit={() => {
                if (selectedLevel == null) return;
                const payload: UpdateAssessmentRequest = {
                  english_level: selectedLevel,
                  learning_goals: selectedGoals,
                  custom_goal: customGoal.trim() || undefined,
                  interests: selectedInterests.length > 0 ? selectedInterests : undefined,
                };
                void submit(payload);
              }}
            />
          ) : null}
          {currentStep === 3 && assessmentData ? (
            <AssessmentComplete
              isUpdateMode={isUpdateMode}
              selectedLevel={selectedLevel}
              levels={assessmentData.levels}
              onComplete={onComplete}
            />
          ) : null}
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
