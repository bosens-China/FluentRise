import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NoteList } from '@/components/note/NoteList';
import { Typography } from 'antd';

const { Title, Text } = Typography;

export const Route = createFileRoute('/notes')({
  component: NotesPage,
});

function NotesPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <Title level={2} className="mb-2! font-black! text-gray-800 tracking-tight">
          我的笔记
        </Title>
        <Text className="text-gray-500 text-base">
          记录你的学习心得和思考。
        </Text>
      </div>
      
      <NoteList hideTitle />
    </DashboardLayout>
  );
}
