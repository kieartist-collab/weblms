import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import { RichText, cleanHTML, encodeRich, toEditorHTML } from './RichText';
import { check, db, errorText } from './lib';

export function RichEditor({
  value = '',
  name,
  onChange,
  compact = false,
  label = 'Nội dung',
}: {
  value?: string;
  name?: string;
  onChange?: (value: string) => void;
  compact?: boolean;
  label?: string;
}) {
  const [html, setHTML] = useState(value),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [, render] = useState(0);
  const dirty = useRef(false),
    wrapper = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          defaultProtocol: 'https',
          protocols: ['https', 'http', 'mailto'],
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit,
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
    ],
    content: toEditorHTML(value),
    editorProps: {
      attributes: { 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' },
      transformPastedHTML: cleanHTML,
    },
    onUpdate: ({ editor }) => {
      const next = encodeRich(editor.getHTML());
      setHTML(next);
      onChange?.(next);
      dirty.current = true;
    },
    onTransaction: () => render((x) => x + 1),
  });
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const saved = () => {
      dirty.current = false;
    };
    const form = wrapper.current?.closest('form');
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a');
      if (
        dirty.current &&
        a &&
        a.target !== '_blank' &&
        a.getAttribute('href') &&
        !a.getAttribute('href')!.startsWith('#')
      ) {
        if (!window.confirm('Nội dung chưa lưu. Bạn muốn rời trang?')) {
          e.preventDefault();
          e.stopPropagation();
        } else dirty.current = false;
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    form?.addEventListener('editor-saved', saved);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
      form?.removeEventListener('editor-saved', saved);
    };
  }, []);
  if (!editor) return null;
  const button = (text: string, action: () => void, active = false) => (
    <button type="button" key={text} title={text} aria-pressed={active} onClick={action}>
      {text}
    </button>
  );
  return (
    <div className="rich-editor" ref={wrapper}>
      {name && <input type="hidden" name={name} value={html} />}
      <div className="editor-toolbar" role="toolbar" aria-label={`Định dạng ${label}`}>
        {button('Đậm', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {button(
          'Nghiêng',
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive('italic'),
        )}
        {button(
          'Gạch chân',
          () => editor.chain().focus().toggleUnderline().run(),
          editor.isActive('underline'),
        )}
        {button(
          'Gạch ngang',
          () => editor.chain().focus().toggleStrike().run(),
          editor.isActive('strike'),
        )}
        {!compact && (
          <>
            {button(
              'H2',
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              editor.isActive('heading', { level: 2 }),
            )}
            {button(
              'H3',
              () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
              editor.isActive('heading', { level: 3 }),
            )}
          </>
        )}
        {button(
          '• Danh sách',
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive('bulletList'),
        )}
        {button(
          '1. Danh sách',
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive('orderedList'),
        )}
        {button(
          '☑ Checklist',
          () => editor.chain().focus().toggleTaskList().run(),
          editor.isActive('taskList'),
        )}
        {button('Thụt vào', () => editor.chain().focus().sinkListItem('listItem').run())}
        {button('Thụt ra', () => editor.chain().focus().liftListItem('listItem').run())}
        {button('Link', () => {
          const href = window.prompt(
            'Đường dẫn HTTPS hoặc mailto:',
            editor.getAttributes('link').href || 'https://',
          );
          if (href === null) return;
          if (!/^(https?:\/\/|mailto:)/i.test(href)) {
            setError('Liên kết cần bắt đầu bằng https://, http:// hoặc mailto:');
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({
              href,
              target: window.confirm('Mở liên kết trong tab mới?') ? '_blank' : '_self',
              rel: 'noopener noreferrer',
            })
            .run();
        })}
        {button('Gỡ link', () => editor.chain().focus().unsetLink().run())}
        {!compact && (
          <>
            {(['left', 'center', 'right'] as const).map((align, i) =>
              button(
                ['Căn trái', 'Căn giữa', 'Căn phải'][i],
                () => editor.chain().focus().setTextAlign(align).run(),
                editor.isActive({ textAlign: align }),
              ),
            )}
            {button(
              'Trích dẫn / Lưu ý',
              () => editor.chain().focus().toggleBlockquote().run(),
              editor.isActive('blockquote'),
            )}
            {button('Đường kẻ', () => editor.chain().focus().setHorizontalRule().run())}
            {button('Ảnh', () => upload.current?.click())}
            {editor.isActive('image') && (
              <>
                {button('Mô tả ảnh', () => {
                  const alt = window.prompt('Mô tả ảnh', editor.getAttributes('image').alt || '');
                  if (alt !== null)
                    editor.chain().focus().updateAttributes('image', { alt, title: alt }).run();
                })}
                {[320, 640, 960].map((width) =>
                  button(`Ảnh ${width}px`, () =>
                    editor.chain().focus().updateAttributes('image', { width }).run(),
                  ),
                )}
                {button('Xóa ảnh', () => editor.chain().focus().deleteSelection().run())}
              </>
            )}
            {button('Accordion', () => editor.chain().focus().setDetails().run())}
            {button('Bỏ accordion', () => editor.chain().focus().unsetDetails().run())}
            {button('Bảng', () =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            )}
            {editor.isActive('table') && (
              <>
                {button('+ Hàng', () => editor.chain().focus().addRowAfter().run())}
                {button('+ Cột', () => editor.chain().focus().addColumnAfter().run())}
                {button('Xóa hàng', () => editor.chain().focus().deleteRow().run())}
                {button('Xóa cột', () => editor.chain().focus().deleteColumn().run())}
                {button('Xóa bảng', () => editor.chain().focus().deleteTable().run())}
              </>
            )}
          </>
        )}
        {button('↶ Hoàn tác', () => editor.chain().focus().undo().run())}
        {button('↷ Làm lại', () => editor.chain().focus().redo().run())}
        {button('Xóa định dạng', () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
        {button(preview ? 'Soạn thảo' : 'Xem trước', () => setPreview(!preview), preview)}
      </div>
      <input
        ref={upload}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 5242880
          ) {
            setError('Chọn ảnh JPG, PNG, WebP tối đa 5 MB.');
            return;
          }
          setBusy(true);
          setError('');
          try {
            const path = `editor/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
            check(await db().storage.from('course-thumbnails').upload(path, file));
            const src = db().storage.from('course-thumbnails').getPublicUrl(path).data.publicUrl;
            editor.chain().focus().setImage({ src, alt: file.name }).run();
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && <p role="status">Đang tải ảnh…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {preview ? (
        <RichText className="editor-preview" value={html} />
      ) : (
        <EditorContent editor={editor} className="rich-content" />
      )}
      <small className="editor-hint">
        Enter: đoạn mới · Shift+Enter: xuống dòng · Ảnh tải lên là công khai. Thêm chú thích bằng
        đoạn văn bên dưới ảnh.
      </small>
    </div>
  );
}
