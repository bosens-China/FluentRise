import type { RefObject } from 'react';
import {
  PartitionOutlined,
  PauseCircleOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Spin, Tag, Tooltip, Typography } from 'antd';

import type { Article } from '@/api/article';

import { renderParagraphWithVocabulary } from './articleReader.shared';

const { Paragraph } = Typography;

interface ArticleReadingPaneProps {
  article: Article;
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string | null;
  loadingAudio: boolean;
  isPlaying: boolean;
  showChinese: boolean;
  loadingTTSKey: string | null;
  onToggleAudio: () => void;
  onToggleChinese: () => void;
  onPlaySingleTTS: (text: string) => void;
  onOpenSentenceHelper: (sentence: string, paragraphIndex: number) => void;
  onAudioEnded: () => void;
  onAudioPause: () => void;
  onAudioPlay: () => void;
}

export function ArticleReadingPane({
  article,
  audioRef,
  audioUrl,
  loadingAudio,
  isPlaying,
  showChinese,
  loadingTTSKey,
  onToggleAudio,
  onToggleChinese,
  onPlaySingleTTS,
  onOpenSentenceHelper,
  onAudioEnded,
  onAudioPause,
  onAudioPlay,
}: ArticleReadingPaneProps) {
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
              ? '音频生成中...'
              : isPlaying
                ? '暂停朗读'
                : '朗读全文'}
          </Button>
          <audio
            ref={audioRef}
            src={audioUrl || undefined}
            onEnded={onAudioEnded}
            onPause={onAudioPause}
            onPlay={onAudioPlay}
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

        <div className="space-y-8">
          {article.content.map((paragraph, index) => (
            <div
              key={`${paragraph.en}-${index}`}
              className="group relative rounded-3xl p-6 transition-colors duration-200 hover:bg-amber-50/60"
            >
              {paragraph.speaker ? (
                <Tag className="mb-4 rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">
                  {paragraph.speaker}
                </Tag>
              ) : null}

              <Paragraph className="!mb-3 text-[22px] leading-[2.05] text-gray-800">
                {renderParagraphWithVocabulary(
                  paragraph.en,
                  article.vocabulary,
                )}
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
                    onClick={() => onPlaySingleTTS(paragraph.en)}
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
          ))}
        </div>
      </Card>
    </Col>
  );
}
