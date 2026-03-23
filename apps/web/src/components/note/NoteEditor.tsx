import { useEffect, useRef } from 'react';
import { Alert, Form, Input, Modal, message } from 'antd';
import { useRequest } from 'ahooks';
import { Editor as ToastEditor } from '@toast-ui/react-editor';
import type { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

import { createNote, updateNote, type Note } from '@/api/note';

interface NoteEditorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialNote?: Note | null;
  articleId?: number;
}

export function NoteEditor({
  open,
  onClose,
  onSuccess,
  initialNote,
  articleId,
}: NoteEditorProps) {
  const [form] = Form.useForm();
  const editorRef = useRef<Editor>(null);
  const isEdit = Boolean(initialNote);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      title: initialNote?.title ?? '',
    });

    const editorInstance = editorRef.current?.getInstance();
    if (editorInstance) {
      editorInstance.setMarkdown(initialNote?.content ?? '');
    }
  }, [form, initialNote, open]);

  const handleClose = () => {
    onClose();
  };

  const { run: handleSubmit, loading } = useRequest(
    async () => {
      const values = await form.validateFields();
      const editorInstance = editorRef.current?.getInstance();
      const markdownContent = editorInstance?.getMarkdown().trim() ?? '';

      if (!markdownContent) {
        throw new Error('请输入笔记内容');
      }

      if (isEdit && initialNote) {
        return updateNote(initialNote.id, {
          title: values.title,
          content: markdownContent,
        });
      }

      return createNote({
        title: values.title,
        content: markdownContent,
        article_id: articleId,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success(isEdit ? '笔记已更新' : '笔记已保存');
        onSuccess?.();
        handleClose();
      },
      onError: (error) => {
        message.error(error.message || '操作失败，请重试');
      },
    },
  );

  return (
    <Modal
      title={isEdit ? '编辑笔记' : '课文笔记'}
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
      width={860}
      okText="保存笔记"
      cancelText="关闭"
    >
      <div className="space-y-4">
        <Alert
          type="info"
          showIcon
          message="支持双模式编辑"
          description="编辑器支持 Markdown 和富文本两种模式，可随时切换，保存时统一以 Markdown 形式存储。"
        />

        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题（可选）">
            <Input placeholder="输入笔记标题" />
          </Form.Item>
        </Form>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <ToastEditor
            key={initialNote?.id ?? `article-${articleId ?? 'new'}`}
            ref={editorRef}
            initialValue={initialNote?.content ?? ''}
            previewStyle="vertical"
            height="420px"
            initialEditType="wysiwyg"
            useCommandShortcut
          />
        </div>
      </div>
    </Modal>
  );
}
