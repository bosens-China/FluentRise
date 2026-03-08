import { useState } from 'react';
import { List, Card, Button, Typography, Tag, Empty, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { getNotes, deleteNote, type Note } from '@/api/note';
import { NoteEditor } from './NoteEditor';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

export interface NoteListProps {
  hideTitle?: boolean;
}

export function NoteList({ hideTitle }: NoteListProps = {}) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const {
    data,
    loading,
    refresh,
    run: fetchNotes,
  } = useRequest(
    (page = 1, pageSize = 10) =>
      getNotes({ page, page_size: pageSize }),
    {
      defaultParams: [1, 10],
    }
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteNote(id);
      message.success('笔记已删除');
      refresh();
    } catch (e) {
      message.error('删除失败');
      console.error(e);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle && (
          <Typography.Title level={4} className="!m-0">
            我的笔记
          </Typography.Title>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} className={hideTitle ? "ml-auto" : ""}>
          记一笔
        </Button>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={data?.items || []}
        loading={loading}
        pagination={{
          onChange: (page, pageSize) => fetchNotes(page, pageSize),
          total: data?.total || 0,
          pageSize: 10,
          align: 'center',
        }}
        locale={{ emptyText: <Empty description="还没有笔记，快去记录吧！" /> }}
        renderItem={(item) => (
          <List.Item>
            <Card
              title={item.title || '无标题笔记'}
              className="h-full shadow-sm transition-shadow hover:shadow-md"
              extra={
                <div className="flex gap-2">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(item)}
                  />
                  <Popconfirm
                    title="确定删除这条笔记吗？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              }
            >
              <div className="flex h-64 flex-col justify-between">
                <div className="prose prose-sm max-w-none overflow-y-auto pr-2">
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
                <div className="mt-4 border-t pt-2">
                  {item.article_title && (
                    <div className="mb-2">
                      <Tag color="blue" className="max-w-full truncate">
                        📖 {item.article_title}
                      </Tag>
                    </div>
                  )}
                  <Text type="secondary" className="text-xs">
                    {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <NoteEditor
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={refresh}
        initialNote={editingNote}
      />
    </div>
  );
}
