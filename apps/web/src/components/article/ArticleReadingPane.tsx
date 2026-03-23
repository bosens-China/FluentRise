import type { RefObject } from 'react';
import {
  PartitionOutlined,
  PauseCircleOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Spin, Tag, Tooltip, Typography } from 'antd';

import type { Article, ArticleAudioTimelineResponse } from '@/api/article';

import { renderParagraphWithPlaybackVocabulary } from './articleReader.shared';

const { Paragraph, Text } = Typography;

interface ArticleReadingPaneProps {
  article: Article;
  audioRef: RefObject<HTMLAudioElement | null>;
  audioTimeline: ArticleAudioTimelineResponse | null;
  loadingAudio: boolean;
  isPlaying: boolean;
  currentPlaybackParagraphIndex: number | null;
  currentSegmentElapsedMs: number;
  showChinese: boolean;
  loadingTTSKey: string | null;
  onToggleAudio: () => void;
  onToggleChinese: () => void;
  onPlaySingleTTS: (text: string, speaker?: string) => void;
  onOpenSentenceHelper: (sentence: string, paragraphIndex: number) => void;
  onAudioEnded: () => void;
  onAudioPause: () => void;
  onAudioPlay: () => void;
  onAudioTimeUpdate: (currentTimeMs: number) => void;
}

export function ArticleReadingPane({
  article,
  audioRef,
  audioTimeline,
  loadingAudio,
  isPlaying,
  currentPlaybackParagraphIndex,
  currentSegmentElapsedMs,
  showChinese,
  loadingTTSKey,
  onToggleAudio,
  onToggleChinese,
  onPlaySingleTTS,
  onOpenSentenceHelper,
  onAudioEnded,
  onAudioPause,
  onAudioPlay,
  onAudioTimeUpdate,
}: ArticleReadingPaneProps) {
  const timelineSegments = audioTimeline?.segments ?? [];

  return (
    <Col xs={24} lg={14} xl={15}>
      <Card
        className="min-h-[600px] rounded-[28px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
        bodyStyle={{ padding: 28 }}
      >
        <div className="mb-8 flex items-center justify-between rounded-full border border-slate-100 bg-slate-50 p-2">
          <Button
            type={isPlaying ? 'primary' : 'text'}
            shape="round"
            size="large"
            icon={
              loadingAudio ? (
                <Spin size="small" />
              ) : isPlaying ? (
                <PauseCircleOutlined />
              ) : (
                <SoundOutlined />
              )
            }
            onClick={onToggleAudio}
            disabled={loadingAudio}
          >
            {loadingAudio
              ? '正在准备朗读...'
              : isPlaying
                ? '暂停朗读'
                : '朗读全文'}
          </Button>
          <audio
            ref={audioRef}
            onEnded={onAudioEnded}
            onPause={onAudioPause}
            onPlay={onAudioPlay}
            onTimeUpdate={(event) =>
              onAudioTimeUpdate(
                Math.round(event.currentTarget.currentTime * 1000),
              )
            }
            className="hidden"
          />
          <Button
            type="text"
            shape="round"
            size="large"
            onClick={onToggleChinese}
          >
            {showChinese ? '隐藏中文' : '显示中文'}
          </Button>
        </div>

        {isPlaying ? (
          <div className="mb-6 rounded-3xl border border-amber-100 bg-amber-50/80 px-5 py-4">
            <Text className="text-sm font-medium text-amber-700">
              现在按段落顺序朗读，当前句子会跟着声音逐步点亮。
            </Text>
          </div>
        ) : null}

        <div className="space-y-8">
          {article.content.map((paragraph, index) => {
            const segment = timelineSegments.find(
              (item) => item.paragraph_index === index,
            );
            const isActiveParagraph = currentPlaybackParagraphIndex === index;
            const isPlayedParagraph =
              currentPlaybackParagraphIndex !== null &&
              currentPlaybackParagraphIndex > index;

            return (
              <div
                key={`${paragraph.en}-${index}`}
                className={`group relative rounded-3xl p-6 transition-all duration-300 ${
                  isActiveParagraph
                    ? 'bg-[linear-gradient(135deg,_rgba(255,247,237,0.96),_rgba(254,240,138,0.32))] shadow-[0_22px_48px_rgba(251,146,60,0.12)]'
                    : isPlayedParagraph
                      ? 'bg-emerald-50/70'
                      : 'hover:bg-amber-50/60'
                }`}
              >
                {paragraph.speaker ? (
                  <Tag className="mb-4 rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">
                    {paragraph.speaker}
                  </Tag>
                ) : null}

                <Paragraph className="!mb-3 text-[22px] leading-[2.05] text-gray-800">
                  {renderParagraphWithPlaybackVocabulary({
                    text: paragraph.en,
                    vocabulary: article.vocabulary,
                    segment,
                    currentSegmentElapsedMs: isActiveParagraph
                      ? currentSegmentElapsedMs
                      : undefined,
                  })}
                </Paragraph>

                {showChinese ? (
                  <Paragraph className="!mb-0 text-lg text-gray-500">
                    {paragraph.zh}
                  </Paragraph>
                ) : null}

                <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Tooltip title="朗读这一段">
                    <Button
                      type="text"
                      loading={loadingTTSKey === paragraph.en}
                      icon={
                        loadingTTSKey === paragraph.en ? undefined : (
                          <SoundOutlined />
                        )
                      }
                      onClick={() =>
                        onPlaySingleTTS(paragraph.en, paragraph.speaker)
                      }
                    />
                  </Tooltip>
                  <Tooltip title="拆句">
                    <Button
                      type="text"
                      icon={<PartitionOutlined />}
                      onClick={() => onOpenSentenceHelper(paragraph.en, index)}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </Col>
  );
}
