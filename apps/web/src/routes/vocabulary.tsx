import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/providers';
import { Card, Badge, Empty, LoadingSpinner } from '@/components/ui';
import { useQuery } from '@/hooks/useData';
import { getVocabularyTimeline } from '@/api/vocabulary';
import { formatDate } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

export const Route = createFileRoute('/vocabulary')({
  component: VocabularyPage,
});

function VocabularyPage() {
  const { data, loading } = useQuery(getVocabularyTimeline);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[var(--text-primary)] mb-2">
            我的生词本
          </h1>
          <p className="text-[var(--text-secondary)]">
            按时间线回顾你的学习成果
            {data && (
              <Badge variant="accent" size="sm" className="ml-2">
                共 {data.total} 个
              </Badge>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : !data || data.timeline.length === 0 ? (
          <Empty
            title="暂无生词"
            description="快去完成一篇文章学习，积累你的词汇量吧！"
            icon={<BookOpen className="h-10 w-10" />}
          />
        ) : (
          <div className="relative border-l-2 border-[var(--primary)]/20 ml-4 md:ml-6 pl-8 md:pl-12 space-y-12 pb-10">
            {data.timeline.map((group) => (
              <div key={group.date} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[41px] md:-left-[53px] top-1 w-5 h-5 rounded-full bg-[var(--primary)] border-4 border-[var(--bg-primary)] shadow-sm" />

                {/* Date badge */}
                <div className="mb-6 inline-flex items-center gap-2 bg-[var(--primary-light)] text-[var(--primary)] px-4 py-1.5 rounded-full font-bold">
                  {formatDate(group.date)}
                  <Badge variant="default" size="sm">{group.words.length}</Badge>
                </div>

                {/* Words grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.words.map((word) => (
                    <Card
                      key={word.id}
                      variant="interactive"
                      className="p-5"
                    >
                      <div className="text-xl font-black text-[var(--text-primary)] mb-3">
                        {word.word}
                      </div>

                      {(word.uk_phonetic || word.us_phonetic) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {word.uk_phonetic && (
                            <span className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-mono">
                              UK {word.uk_phonetic}
                            </span>
                          )}
                          {word.us_phonetic && (
                            <span className="px-2 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-mono">
                              US {word.us_phonetic}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[var(--text-secondary)] font-medium leading-relaxed">
                        {word.meaning}
                      </div>
                      {word.article_title ? (
                        <div className="mt-4 text-sm text-gray-500">
                          来源课文：{word.article_title}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}

export default VocabularyPage;
