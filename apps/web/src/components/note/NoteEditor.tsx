import { useState, useEffect } from 'react';
import { Modal, Input, Form, message, Tabs } from 'antd';
import { useRequest } from 'ahooks';
import { createNote, updateNote, type Note } from '@/api/note';
import ReactMarkdown from 'react-markdown';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';

interface NoteEditorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialNote?: Note | null; // 如果是编辑模式
  articleId?: number; // 如果是从文章页面创建
}

export function NoteEditor({
  open,
  onClose,
  onSuccess,
  initialNote,
  articleId,
}: NoteEditorProps) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewContent, setPreviewContent] = useState('');
  const isEdit = !!initialNote;

  useEffect(() => {
    if (open) {
      if (initialNote) {
        form.setFieldsValue({
          title: initialNote.title,
          content: initialNote.content,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialNote, form]);

  const handleClose = () => {
    setActiveTab('edit');
    setPreviewContent('');
    onClose();
  };

  const { run: handleSubmit, loading } = useRequest(
    async () => {
      const values = await form.validateFields();
      if (isEdit && initialNote) {
        return updateNote(initialNote.id, values);
      } else {
        return createNote({
          ...values,
          article_id: articleId,
        });
      }
    },
    {
      manual: true,
      onSuccess: () => {
        message.success(isEdit ? '笔记已更新' : '笔记已保存');
        onSuccess?.();
        handleClose();
      },
      onError: (e) => {
        message.error('操作失败，请重试');
        console.error(e);
      },
    }
  );

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'edit' | 'preview');
    if (key === 'preview') {
      setPreviewContent(form.getFieldValue('content') || '');
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑笔记' : '添加笔记'}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
      width={700}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题 (可选)">
          <Input placeholder="输入笔记标题" />
        </Form.Item>
        
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'edit',
              label: (
                <span>
                  <EditOutlined />
                  编辑
                </span>
              ),
              children: (
                <Form.Item
                  name="content"
                  rules={[{ required: true, message: '请输入笔记内容' }]}
                  className="!mb-0"
                >
                  <Input.TextArea
                    rows={12}
                    placeholder="支持 Markdown 格式..."
                    showCount
                    maxLength={5000}
                    onChange={(e) => setPreviewContent(e.target.value)}
                  />
                </Form.Item>
              ),
            },
            {
              key: 'preview',
              label: (
                <span>
                  <EyeOutlined />
                  预览
                </span>
              ),
              children: (
                <div className="h-[300px] overflow-y-auto rounded border border-gray-200 p-4">
                  {previewContent ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{previewContent}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      暂无内容
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
