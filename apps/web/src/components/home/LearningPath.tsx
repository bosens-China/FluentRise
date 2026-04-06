import { CheckCircleFilled, LockFilled, PlayCircleFilled } from '@ant-design/icons';
import { motion, type Variants } from 'framer-motion';
import { Tooltip, Typography } from 'antd';

import type { ArticleProposal, LearningPathResponse } from '@/api/article';
import { cn } from '@/lib/utils';

const { Text } = Typography;

type LearningPathDisplayStatus = 'completed' | 'current' | 'locked';

type LearningPathNodeData = ArticleProposal & {
  displayStatus: LearningPathDisplayStatus;
};

interface LearningPathNodeProps {
  proposal: LearningPathNodeData;
  index: number;
  onRealize: (proposal: ArticleProposal) => void;
  isRealizing: boolean;
}

function LearningPathNode({
  proposal,
  index,
  onRealize,
  isRealizing,
}: LearningPathNodeProps) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const isReverse = row % 2 !== 0;
  const actualCol = isReverse ? 2 - col : col;

  const xOffset = actualCol * 120 - 120;
  const yOffset = row * 140;

  const nodeVariants: Variants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { delay: index * 0.1, type: 'spring' } },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 },
  };

  const getStatusConfig = () => {
    switch (proposal.displayStatus) {
      case 'completed':
        return {
          icon: <CheckCircleFilled className="text-2xl" />,
          bgColor: 'bg-emerald-500 shadow-[0_6px_0_rgb(5,150,105)]',
          textColor: 'text-emerald-700',
        };
      case 'current':
        return {
          icon: <PlayCircleFilled className="text-3xl animate-pulse" />,
          bgColor: 'bg-[var(--primary)] shadow-[0_6px_0_rgb(76,176,2)]',
          textColor: 'text-[var(--primary-hover)]',
        };
      case 'locked':
      default:
        return {
          icon: <LockFilled className="text-xl opacity-40" />,
          bgColor: 'bg-slate-200 shadow-[0_6px_0_rgb(203,213,225)]',
          textColor: 'text-slate-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      initial="initial"
      animate="animate"
      whileHover={proposal.displayStatus !== 'locked' ? 'hover' : ''}
      whileTap={proposal.displayStatus !== 'locked' ? 'tap' : ''}
      variants={nodeVariants}
      style={{ left: `calc(50% + ${xOffset}px)`, top: `${yOffset}px` }}
    >
      <Tooltip title={proposal.description || '解锁你的英语关卡'} placement="top">
        <button
          type="button"
          disabled={proposal.displayStatus === 'locked' || isRealizing}
          onClick={() => onRealize(proposal)}
          className={cn(
            'relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-3xl transition-all',
            config.bgColor,
            proposal.displayStatus === 'locked' && 'cursor-not-allowed grayscale-[0.5]',
          )}
        >
          <div className="text-white drop-shadow-md">{config.icon}</div>
        </button>
      </Tooltip>
      <div className="mt-4 max-w-[120px] text-center">
        <Text strong className={cn('text-sm line-clamp-2', config.textColor)}>
          {proposal.title}
        </Text>
      </div>
    </motion.div>
  );
}

interface LearningPathProps {
  completedArticles: LearningPathResponse['completed_articles'];
  proposals: ArticleProposal[];
  onNodeClick: (proposal: ArticleProposal) => void;
  isRealizing: boolean;
}

export function LearningPath({
  completedArticles,
  proposals,
  onNodeClick,
  isRealizing,
}: LearningPathProps) {
  const allNodes: LearningPathNodeData[] = [
    ...completedArticles.slice(0, 2).reverse().map((article, index) => ({
      id: article.id,
      title: article.title,
      description: null,
      level: article.level,
      order_index: -(index + 1),
      status: 'realized' as const,
      article_id: article.id,
      created_at: article.completed_at ?? '',
      displayStatus: 'completed' as const,
    })),
    ...proposals.map((proposal, idx) => ({
      ...proposal,
      displayStatus: idx === 0 ? 'current' as const : 'locked' as const,
    })),
  ];

  return (
    <div className="relative mx-auto min-h-[800px] w-full max-w-2xl py-10">
      <svg className="absolute inset-0 h-full w-full opacity-10" pointerEvents="none" />

      <div className="relative">
        {allNodes.map((node, idx) => (
          <LearningPathNode
            key={`${node.displayStatus}-${node.id}`}
            index={idx}
            proposal={node}
            onRealize={onNodeClick}
            isRealizing={isRealizing}
          />
        ))}
      </div>
    </div>
  );
}
