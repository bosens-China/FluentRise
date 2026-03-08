import { createFileRoute } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Typography, Card, Spin, Empty, Tag } from 'antd';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getVocabularyTimeline } from '@/api/vocabulary';

const { Title, Text } = Typography;

export const Route = createFileRoute('/vocabulary')({
  component: VocabularyPage,
});

function VocabularyPage() {
  const { data, loading, error } = useRequest(getVocabularyTimeline);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Title level={2} className="mb-2! font-black! text-gray-800 tracking-tight">
          我的生词本
        </Title>
        <Text className="text-gray-500 text-base">
          按时间线回顾你的学习成果。你共积累了 {data?.total || 0} 个生词。
        </Text>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">加载失败，请刷新重试</div>
      ) : data?.timeline.length === 0 ? (
        <Empty description="暂无生词记录，快去完成一篇文章学习吧！" className="py-20" />
      ) : (
        <div className="relative border-l-2 border-indigo-100 ml-4 md:ml-8 pl-8 md:pl-12 space-y-12 pb-10">
          {data?.timeline.map((group) => (
            <div key={group.date} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[41px] md:-left-[57px] top-1 w-5 h-5 rounded-full bg-indigo-500 border-4 border-white shadow-sm" />
              
              <div className="mb-6 inline-block bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-bold shadow-sm">
                {group.date}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.words.map((word) => (
                  <Card 
                    key={word.id} 
                    className="border-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all rounded-2xl overflow-hidden"
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-2xl font-black text-indigo-900 mb-3">{word.word}</div>
                      
                      {(word.uk_phonetic || word.us_phonetic) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {word.uk_phonetic && (
                            <Tag className="m-0 bg-slate-50 border-slate-200 text-slate-500 font-mono">
                              UK {word.uk_phonetic}
                            </Tag>
                          )}
                          {word.us_phonetic && (
                            <Tag className="m-0 bg-slate-50 border-slate-200 text-slate-500 font-mono">
                              US {word.us_phonetic}
                            </Tag>
                          )}
                        </div>
                      )}
                      
                      <div className="text-gray-700 font-medium text-base leading-relaxed mt-auto">
                        {word.meaning}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
