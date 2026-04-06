import { useState } from 'react';
import { useRequest } from 'ahooks';
import { message } from 'antd';

import type { SentenceBreakdownResponse } from '@/api/aiChat';
import { getSentenceBreakdown } from '@/api/aiChat';
import type { Note } from '@/api/note';
import { getNotes } from '@/api/note';

interface SentenceHelperTarget {
  sentence: string;
  paragraphIndex: number;
}

interface UseArticleReaderAssistOptions {
  articleId: number;
}

export function useArticleReaderAssist({
  articleId,
}: UseArticleReaderAssistOptions) {
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperTarget, setHelperTarget] = useState<SentenceHelperTarget | null>(
    null,
  );
  const [helperData, setHelperData] =
    useState<SentenceBreakdownResponse | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  const sentenceBreakdownRequest = useRequest(
    async (params: {
      sentence: string;
      article_id?: number;
      paragraph_index?: number;
    }) => {
      try {
        return await getSentenceBreakdown(params);
      } catch {
        return getSentenceBreakdown(params);
      }
    },
    {
      manual: true,
      onSuccess: (data) => setHelperData(data),
      onError: () => {
        message.error('句子拆解暂时失败，请稍后再试');
      },
    },
  );

  const articleNoteRequest = useRequest(
    async () => {
      const response = await getNotes({
        page: 1,
        page_size: 1,
        article_id: articleId,
      });
      return response.items[0] ?? null;
    },
    {
      manual: true,
      onSuccess: (data) => setCurrentNote(data),
      onError: () => {
        message.error('读取笔记失败，请稍后再试');
      },
    },
  );

  const openSentenceHelper = (sentence: string, paragraphIndex: number) => {
    setHelperTarget({ sentence, paragraphIndex });
    setHelperData(null);
    setHelperOpen(true);
    void sentenceBreakdownRequest.run({
      sentence,
      article_id: articleId,
      paragraph_index: paragraphIndex,
    });
  };

  const openNoteEditor = () => {
    setIsNoteEditorOpen(true);
    void articleNoteRequest.run();
  };

  return {
    articleNoteRequest,
    currentNote,
    helperData,
    helperOpen,
    helperTarget,
    isAIChatOpen,
    isCompletionOpen,
    isNoteEditorOpen,
    openNoteEditor,
    openSentenceHelper,
    sentenceBreakdownRequest,
    setHelperOpen,
    setIsAIChatOpen,
    setIsCompletionOpen,
    setIsNoteEditorOpen,
  };
}
