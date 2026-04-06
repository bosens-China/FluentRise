/**
 * NoteListNew - 重构的笔记列表组件
 * 
 * 使用 FluentRise 设计系统
 */

import { useState } from 'react';
import { Edit2, Trash2, Plus, BookOpen } from 'lucide-react';
import { useQuery } from '@/hooks/useData';
import { getNotes, deleteNote, type Note } from '@/api/note';
import { Card, Button, Badge, Empty, LoadingSpinner } from '@/components/ui';
import { NoteEditor } from './NoteEditor';
import { formatDate } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface NoteListProps {
  hideTitle?: boolean;
}

export function NoteList({ hideTitle }: NoteListProps = {}) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, loading, refresh } = useQuery(() => getNotes({ page: 1, page_size: 50 }), {
    showError: true,
  });

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条笔记吗？')) return;
    
    setDeletingId(id);
    try {
      await deleteNote(id);
      refresh();
    } catch {
      // Error handled by hook
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleSuccess = () => {
    setIsEditorOpen(false);
    refresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const notes = data?.items || [];

  if (notes.length === 0) {
    return (
      <Empty
        title="还没有笔记"
        description="快去记录你的学习心得吧！"
        action={{ label: '记一笔', onClick: handleCreate }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {!hideTitle && (
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            我的笔记
            <Badge variant="default" size="sm" className="ml-2">
              {data?.total || 0}
            </Badge>
          </h2>
        )}
        <Button onClick={handleCreate} className={hideTitle ? 'ml-auto' : ''}>
          <Plus className="h-5 w-5" />
          记一笔
        </Button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <Card
            key={note.id}
            variant="interactive"
            className="flex flex-col h-[320px]"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-[var(--text-primary)] line-clamp-1 flex-1">
                {note.title || '无标题笔记'}
              </h3>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(note);
                  }}
                  className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(note.id);
                  }}
                  disabled={deletingId === note.id}
                  className="p-2 rounded-lg hover:bg-[var(--error-light)] text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
                >
                  {deletingId === note.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="prose prose-sm max-w-none line-clamp-6 text-[var(--text-secondary)]">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              {note.article_title && (
                <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
                  <BookOpen className="h-4 w-4" />
                  <span className="truncate">{note.article_title}</span>
                </div>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatDate(note.created_at)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Editor Modal */}
      <NoteEditor
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={handleSuccess}
        initialNote={editingNote}
      />
    </div>
  );
}
