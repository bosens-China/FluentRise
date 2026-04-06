import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BookOpen, Volume2, VolumeX } from 'lucide-react';

import { getConfiguredWordAudioUrl } from '@/api/tts';
import { getVocabularyTimeline } from '@/api/vocabulary';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/providers';
import { Badge, Button, Card, Empty, LoadingSpinner } from '@/components/ui';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useQuery } from '@/hooks/useData';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { formatDate } from '@/lib/utils';

export const Route = createFileRoute('/vocabulary')({
  component: VocabularyPage,
});

function VocabularyPage() {
  const { data, loading } = useQuery(getVocabularyTimeline);
  const { data: systemConfig } = useSystemConfig();
  const { play: playAudioFile, stop: stopAudioPlayback } = useAudioPlayer();
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);
  const defaultVoice = systemConfig?.tts.default_voice;

  const playWordAudio = (wordId: number, word: string) => {
    if (playingWordId === wordId) {
      stopAudioPlayback();
      setPlayingWordId(null);
      return;
    }

    setPlayingWordId(wordId);
    void playAudioFile(getConfiguredWordAudioUrl(word, defaultVoice), {
      onEnded: () => setPlayingWordId(null),
      onError: () => setPlayingWordId(null),
    });
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-black text-[var(--text-primary)]">我的生词本</h1>
          <p className="text-[var(--text-secondary)]">
            按时间线回看你沉淀下来的词汇
            {data ? (
              <Badge variant="accent" size="sm" className="ml-2">
                共 {data.total} 个
              </Badge>
            ) : null}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : !data || data.timeline.length === 0 ? (
          <Empty
            title="暂时还没有生词"
            description="先完成一篇课文或一轮复习，新的词汇就会逐步沉淀到这里。"
            icon={<BookOpen className="h-10 w-10" />}
          />
        ) : (
          <div className="relative ml-4 space-y-12 border-l-2 border-[var(--primary)]/20 pb-10 pl-8 md:ml-6 md:pl-12">
            {data.timeline.map((group) => (
              <div key={group.date} className="relative">
                <div className="absolute -left-[41px] top-1 h-5 w-5 rounded-full border-4 border-[var(--bg-primary)] bg-[var(--primary)] shadow-sm md:-left-[53px]" />

                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--primary-light)] px-4 py-1.5 font-bold text-[var(--primary)]">
                  {formatDate(group.date)}
                  <Badge variant="default" size="sm">
                    {group.words.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.words.map((word) => (
                    <Card key={word.id} variant="interactive" className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-black text-[var(--text-primary)]">
                            {word.word}
                          </div>
                          {word.article_title ? (
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                              来源课文：{word.article_title}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`播放 ${word.word} 发音`}
                          onClick={() => playWordAudio(word.id, word.word)}
                        >
                          {playingWordId === word.id ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {word.uk_phonetic || word.us_phonetic ? (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {word.uk_phonetic ? (
                            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 font-mono text-sm text-[var(--text-secondary)]">
                              UK {word.uk_phonetic}
                            </span>
                          ) : null}
                          {word.us_phonetic ? (
                            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 font-mono text-sm text-[var(--text-secondary)]">
                              US {word.us_phonetic}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="font-medium leading-relaxed text-[var(--text-secondary)]">
                        {word.meaning}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}

export default VocabularyPage;
