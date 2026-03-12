import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NoteListNew } from '@/components/note/NoteListNew';
import { AuthGuard } from '@/components/providers';

export const Route = createFileRoute('/notes')({
  component: NotesPage,
});

function NotesPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[var(--text-primary)] mb-2">
            我的笔记
          </h1>
          <p className="text-[var(--text-secondary)]">
            记录你的学习心得和思考
          </p>
        </div>

        <NoteListNew hideTitle />
      </DashboardLayout>
    </AuthGuard>
  );
}

export default NotesPage;
