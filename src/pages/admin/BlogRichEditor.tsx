import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code2, Eraser, ImagePlus, Italic, Link2, List, ListOrdered,
  LoaderCircle, Maximize2, Minimize2, Minus, Quote, Redo2, Strikethrough, Table, Underline, Undo2, Unlink, Youtube
} from 'lucide-react';
import { sanitizeBlogHtml } from '../../lib/blogHtml';
import { uploadBlogImage } from '../../services/blogApi';

/*
 * Blog Description editor for the admin (no extra library): a formatted text
 * area with a toolbar like the one on the other Hosting Baba admin panels.
 * Pasted text and the HTML view are cleaned with the same allow-list the
 * site uses to show the blog.
 */

type Props = {
  /** Starting HTML. The editor is remounted (new key) for each blog. */
  initialHtml: string;
  onChange: (html: string) => void;
  onError: (message: string) => void;
  placeholder?: string;
};

const STYLES: Array<{ value: string; label: string }> = [
  { value: 'P', label: 'Normal text' },
  { value: 'H2', label: 'Heading' },
  { value: 'H3', label: 'Sub heading' },
  { value: 'H4', label: 'Small heading' },
  { value: 'BLOCKQUOTE', label: 'Quote' }
];

const youtubeId = (url: string): string | null => {
  const value = url.trim();
  const match = value.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,20})/i);
  return match ? match[1] : null;
};

export const BlogRichEditor: React.FC<Props> = ({ initialHtml, onChange, onError, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [codeView, setCodeView] = useState(false);
  const [code, setCode] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [empty, setEmpty] = useState(!initialHtml);
  const [block, setBlock] = useState('P');

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeBlogHtml(initialHtml);
    setEmpty(!initialHtml.replace(/<[^>]*>/g, '').trim() && !/<(img|iframe)/i.test(initialHtml));
    // Paragraphs instead of <div>s when Enter is pressed.
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* older browsers */ }
  }, [initialHtml]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [fullscreen]);

  const emit = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    setEmpty(!(editorRef.current?.textContent || '').trim() && !editorRef.current?.querySelector('img, iframe'));
    onChange(html);
  }, [onChange]);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection) return;
    if (savedRange.current) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    } else if (editorRef.current) {
      // Nothing selected yet: put the cursor at the end.
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const run = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
    updateBlockState();
    emit();
  };

  const insertHtml = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    rememberSelection();
    emit();
  };

  const updateBlockState = () => {
    try {
      const value = String(document.queryCommandValue('formatBlock') || '').toUpperCase().replace(/[<>]/g, '');
      setBlock(STYLES.some(style => style.value === value) ? value : 'P');
    } catch {
      setBlock('P');
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length) {
      event.preventDefault();
      rememberSelection();
      void uploadImages(files);
      return;
    }
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    event.preventDefault();
    if (html) {
      document.execCommand('insertHTML', false, sanitizeBlogHtml(html));
    } else if (text) {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const paragraphs = escaped.split(/\n{2,}/).map(part => `<p>${part.replace(/\n/g, '<br>')}</p>`).join('');
      document.execCommand('insertHTML', false, paragraphs);
    }
    emit();
  };

  const uploadImages = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const { url } = await uploadBlogImage(file, 'content');
        insertHtml(`<p><img src="${url}" alt=""></p>`);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The picture could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    rememberSelection();
    const url = window.prompt('Link address (for example https://driverhub.in/jobs or /jobs):', 'https://');
    if (!url || url === 'https://') return;
    const selection = window.getSelection();
    if (savedRange.current && !savedRange.current.collapsed) {
      run('createLink', url.trim());
    } else {
      const label = window.prompt('Text to show for the link:', url.trim()) || url.trim();
      const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      insertHtml(`<a href="${url.trim().replace(/"/g, '%22')}">${safe}</a>`);
    }
    selection?.removeAllRanges();
    // Clean the new link (adds target/rel for outside sites, drops unsafe addresses).
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeBlogHtml(editorRef.current.innerHTML);
      savedRange.current = null;
      emit();
    }
  };

  const addVideo = () => {
    rememberSelection();
    const url = window.prompt('YouTube video link:');
    if (!url) return;
    const id = youtubeId(url);
    if (!id) {
      onError('Please paste a YouTube video link (youtube.com/watch?v=… or youtu.be/…).');
      return;
    }
    insertHtml(`<p><iframe src="https://www.youtube-nocookie.com/embed/${id}"></iframe></p><p><br></p>`);
  };

  const addTable = () => {
    const rows = 3;
    const cols = 3;
    const header = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Heading ${i + 1}</th>`).join('')}</tr>`;
    const body = Array.from({ length: rows - 1 }, () => `<tr>${Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('')}</tr>`).join('');
    insertHtml(`<table><thead>${header}</thead><tbody>${body}</tbody></table><p><br></p>`);
  };

  const toggleCode = () => {
    if (!codeView) {
      setCode(editorRef.current?.innerHTML || '');
      setCodeView(true);
    } else {
      const clean = sanitizeBlogHtml(code);
      setCodeView(false);
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.innerHTML = clean;
        emit();
      });
    }
  };

  const Button: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }> = ({ label, onClick, children, active, disabled }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-40 cursor-pointer ${active ? 'bg-white shadow-xs text-[#08233F]' : ''}`}
    >
      {children}
    </button>
  );
  const Sep = () => <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />;

  return (
    <div className={fullscreen
      ? 'fixed inset-0 z-[90] flex flex-col bg-white p-3 sm:p-6'
      : 'overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15'}>
      <div className={`flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-1.5 ${fullscreen ? 'rounded-t-xl border' : ''}`} role="toolbar" aria-label="Formatting">
        <label className="sr-only" htmlFor="blog-editor-style">Text style</label>
        <select
          id="blog-editor-style"
          value={block}
          disabled={codeView}
          onMouseDown={rememberSelection}
          onChange={event => { setBlock(event.target.value); run('formatBlock', `<${event.target.value}>`); }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          {STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
        </select>
        <Sep />
        <Button label="Bold" onClick={() => run('bold')} disabled={codeView}><Bold className="h-4 w-4" /></Button>
        <Button label="Italic" onClick={() => run('italic')} disabled={codeView}><Italic className="h-4 w-4" /></Button>
        <Button label="Underline" onClick={() => run('underline')} disabled={codeView}><Underline className="h-4 w-4" /></Button>
        <Button label="Strikethrough" onClick={() => run('strikeThrough')} disabled={codeView}><Strikethrough className="h-4 w-4" /></Button>
        <Button label="Clear formatting" onClick={() => { run('removeFormat'); run('formatBlock', '<P>'); }} disabled={codeView}><Eraser className="h-4 w-4" /></Button>
        <Sep />
        <Button label="Bullet list" onClick={() => run('insertUnorderedList')} disabled={codeView}><List className="h-4 w-4" /></Button>
        <Button label="Numbered list" onClick={() => run('insertOrderedList')} disabled={codeView}><ListOrdered className="h-4 w-4" /></Button>
        <Button label="Quote" onClick={() => run('formatBlock', '<BLOCKQUOTE>')} disabled={codeView}><Quote className="h-4 w-4" /></Button>
        <Sep />
        <Button label="Align left" onClick={() => run('justifyLeft')} disabled={codeView}><AlignLeft className="h-4 w-4" /></Button>
        <Button label="Align centre" onClick={() => run('justifyCenter')} disabled={codeView}><AlignCenter className="h-4 w-4" /></Button>
        <Button label="Align right" onClick={() => run('justifyRight')} disabled={codeView}><AlignRight className="h-4 w-4" /></Button>
        <Sep />
        <Button label="Insert link" onClick={addLink} disabled={codeView}><Link2 className="h-4 w-4" /></Button>
        <Button label="Remove link" onClick={() => run('unlink')} disabled={codeView}><Unlink className="h-4 w-4" /></Button>
        <Button label="Insert picture" onClick={() => { rememberSelection(); fileRef.current?.click(); }} disabled={codeView || uploading}>
          {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </Button>
        <Button label="Insert YouTube video" onClick={addVideo} disabled={codeView}><Youtube className="h-4 w-4" /></Button>
        <Button label="Insert table" onClick={addTable} disabled={codeView}><Table className="h-4 w-4" /></Button>
        <Button label="Horizontal line" onClick={() => run('insertHorizontalRule')} disabled={codeView}><Minus className="h-4 w-4" /></Button>
        <Sep />
        <Button label="Undo" onClick={() => run('undo')} disabled={codeView}><Undo2 className="h-4 w-4" /></Button>
        <Button label="Redo" onClick={() => run('redo')} disabled={codeView}><Redo2 className="h-4 w-4" /></Button>
        <Button label={codeView ? 'Back to editor' : 'HTML view'} onClick={toggleCode} active={codeView}><Code2 className="h-4 w-4" /></Button>
        <Button label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => setFullscreen(value => !value)} active={fullscreen}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={event => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.length) void uploadImages(files);
          }}
        />
      </div>

      {codeView ? (
        <textarea
          value={code}
          onChange={event => {
            // Keep the form in step, so saving straight from HTML view keeps these edits.
            setCode(event.target.value);
            onChange(event.target.value);
          }}
          spellCheck={false}
          aria-label="Blog HTML"
          className={`w-full resize-y bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none ${fullscreen ? 'flex-1 rounded-b-xl' : 'min-h-[320px]'}`}
        />
      ) : (
        <div className={`relative ${fullscreen ? 'flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-slate-200' : ''}`}>
          {empty && (
            <p className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">{placeholder || 'Write blog content here...'}</p>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Blog Description"
            onInput={emit}
            onBlur={() => { rememberSelection(); emit(); }}
            onKeyUp={() => { rememberSelection(); updateBlockState(); }}
            onMouseUp={() => { rememberSelection(); updateBlockState(); }}
            onPaste={onPaste}
            onDrop={event => {
              const files = Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
              if (files.length) {
                event.preventDefault();
                void uploadImages(files);
              }
            }}
            className={`dh-blog-content dh-blog-editor px-4 py-3 text-[15px] outline-none ${fullscreen ? 'min-h-full' : 'min-h-[320px] max-h-[60vh] overflow-y-auto'}`}
          />
        </div>
      )}
    </div>
  );
};
