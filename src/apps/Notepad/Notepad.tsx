"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import {
    Plus, Search, Save, Trash2, FileText,
    Bold, Italic, List, ListOrdered, Table as TableIcon,
    Image as ImageIcon, Paperclip, ChevronLeft, MoreVertical,
    Download, X, Loader2, Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/useOSStore';



interface MemoFile {
    id: string;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    size: number;
    type: string;
}

interface Memo {
    id: string;
    title: string;
    content: string;
    userId: string;
    files: MemoFile[];
    updatedAt: string;
}

export default function Notepad() {
    const { currentUser } = useOSStore();
    const [memos, setMemos] = useState<Memo[]>([]);
    const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const ImageResizeComponent = useCallback((props: any) => {
        const { node, updateAttributes, selected } = props;

        const handleMouseDown = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const imgElement = (e.currentTarget.parentElement?.querySelector('img') as HTMLImageElement);
            const startWidth = imgElement.offsetWidth;
            const container = imgElement.closest('.editor-container') as HTMLElement;
            const containerWidth = container?.offsetWidth || 800;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const currentX = moveEvent.clientX;
                const diffX = currentX - startX;
                const newWidthPx = Math.max(100, startWidth + diffX);
                const newWidthPercent = Math.min(100, (newWidthPx / containerWidth) * 100);
                updateAttributes({ width: `${newWidthPercent}%` });
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        return (
            <NodeViewWrapper
                className="relative inline-block group/img align-bottom mx-1 my-2"
                style={{ width: node.attrs.width, maxWidth: '100%' }}
            >
                <img
                    src={node.attrs.src}
                    style={{ width: '100%', height: 'auto' }}
                    className={`rounded-xl transition-all cursor-default ${selected ? 'ring-4 ring-blue-500/50 ring-offset-2' : ''}`}
                />

                {selected && (
                    <>
                        {/* View Original Button in Center */}
                        <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
                            <button
                                onClick={() => setLightboxUrl(node.attrs.src)}
                                className="pointer-events-auto p-2.5 bg-white/90 hover:bg-white text-blue-500 rounded-full shadow-xl transform hover:scale-110 transition-all flex items-center gap-2 font-bold text-[11px] whitespace-nowrap"
                            >
                                <Maximize size={14} />
                                원본보기
                            </button>
                        </div>

                        {/* Resize Handle */}
                        <div
                            onMouseDown={handleMouseDown}
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize border-2 border-white shadow-lg z-20 hover:scale-125 transition-transform"
                        />
                    </>
                )}
            </NodeViewWrapper>
        );
    }, [selectedMemoId]); // Re-create when selected memo changes to avoid stale captures if any

    const ResizableImage = useMemo(() => Image.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                width: {
                    default: '100%',
                    renderHTML: attributes => ({
                        style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
                    }),
                },
            }
        },
        addNodeView() {
            return ReactNodeViewRenderer(ImageResizeComponent)
        },
    }), [ImageResizeComponent]);

    const selectedMemo = useMemo(() =>
        Array.isArray(memos) ? (memos.find(m => m.id === selectedMemoId) || null) : null
        , [memos, selectedMemoId]);

    const filteredMemos = useMemo(() => {
        if (!Array.isArray(memos)) return [];
        return memos.filter(m =>
            m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [memos, searchTerm]);

    // Tiptap Editor Setup
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            ResizableImage.configure({ inline: true, allowBase64: true }),
            Placeholder.configure({ placeholder: '내용을 입력하세요...' }),
            Link.configure({ openOnClick: false }),
        ],
        editorProps: {
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            const pos = view.state.selection.from;
                            uploadPastedImage(file, pos);
                            return true; // Prevent default paste behavior (Base64)
                        }
                    }
                }
                return false;
            },
        },
        content: '',
        onUpdate: ({ editor }) => {
            // Auto-save logic can be added here
        },
    });

    const uploadPastedImage = async (file: File, pos: number) => {
        if (!selectedMemoId || !currentUser?.id) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'image');

        try {
            const res = await fetch('/api/memos/upload', {
                method: 'POST',
                body: formData
            });
            const uploadedFile = await res.json();

            // Insert into editor at the captured position
            editor?.chain()
                .focus()
                .insertContentAt(pos, {
                    type: 'image',
                    attrs: { src: uploadedFile.url }
                })
                .run();

            // Add to memo's files and update state (including latest editor content)
            const currentHtml = editor?.getHTML() || '';
            const updatedFiles = [...(selectedMemo?.files || []), uploadedFile];

            setMemos(prev => prev.map(m => m.id === selectedMemoId ? {
                ...m,
                files: updatedFiles,
                content: currentHtml // Keep content in sync
            } : m));

            // Sync with backend
            await fetch(`/api/memos/${selectedMemoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: updatedFiles,
                    content: currentHtml // Ensure we save the latest content along with the file
                })
            });

        } catch (error) {
            console.error('Pasted image upload failed:', error);
        }
    };

    // Fetch Memos
    const fetchMemos = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch(`/api/memos?userId=${currentUser.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMemos(data);
            } else {
                console.error('Memos API error:', data);
                if (data.error && data.details) {
                    alert(`메모를 불러오는데 실패했습니다: ${data.details}\n(Prisma 모델이 아직 준비되지 않았을 수 있습니다.)`);
                }
                setMemos([]);
            }
        } catch (error) {
            console.error('Failed to fetch memos:', error);
            setMemos([]);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        fetchMemos();
    }, [fetchMemos]);

    // Sync editor content ONLY when selected memo ID changes
    useEffect(() => {
        if (editor && selectedMemo) {
            // Only force set content if it's different (e.g. initial load or switching)
            // But we primarily depend on selectedMemoId for triggers
            editor.commands.setContent(selectedMemo.content || '');
        } else if (editor && !selectedMemoId) {
            editor.commands.setContent('');
        }
    }, [selectedMemoId, editor]); // Removed selectedMemo from dependencies

    const handleCreateMemo = async () => {
        if (!currentUser?.id) return;
        try {
            const res = await fetch('/api/memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: '새 메모',
                    content: '',
                    userId: currentUser.id,
                    files: []
                })
            });
            const newMemo = await res.json();
            setMemos([newMemo, ...memos]);
            setSelectedMemoId(newMemo.id);
        } catch (error) {
            console.error('Failed to create memo:', error);
        }
    };

    const handleSaveMemo = async () => {
        if (!selectedMemoId || !editor || !selectedMemo) return;
        setIsSaving(true);
        try {
            const htmlContent = editor.getHTML();
            const res = await fetch(`/api/memos/${selectedMemoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: selectedMemo.title,
                    content: htmlContent,
                })
            });
            const updated = await res.json();

            // Update local state without losing focus
            setMemos(prev => prev.map(m => m.id === updated.id ? updated : m));
        } catch (error) {
            console.error('Failed to save memo:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMemo = async (id: string) => {
        if (!confirm('메모를 삭제하시겠습니까?')) return;
        try {
            await fetch(`/api/memos/${id}`, { method: 'DELETE' });
            setMemos(memos.filter(m => m.id !== id));
            if (selectedMemoId === id) setSelectedMemoId(null);
        } catch (error) {
            console.error('Failed to delete memo:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMemoId) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type.startsWith('image/') ? 'image' : 'file');

        try {
            const res = await fetch('/api/memos/upload', {
                method: 'POST',
                body: formData
            });
            const uploadedFile = await res.json();

            // Add to current memo's files and update state (including latest editor content)
            const currentHtml = editor?.getHTML() || '';
            const updatedFiles = [...(selectedMemo?.files || []), uploadedFile];

            const patchRes = await fetch(`/api/memos/${selectedMemoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: updatedFiles,
                    content: currentHtml
                })
            });
            const updatedMemo = await patchRes.json();

            setMemos(prev => prev.map(m => m.id === updatedMemo.id ? updatedMemo : m));

            // If it's an image, also insert into editor
            if (file.type.startsWith('image/')) {
                editor?.chain().focus().setImage({ src: uploadedFile.url }).run();
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    // Helper for Toolbar
    const ToolbarButton = ({ icon: Icon, onClick, active = false }: any) => (
        <button
            onClick={onClick}
            className={`p-2 rounded-lg transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'
                }`}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className="flex h-full bg-white text-slate-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="border-r border-slate-200 flex flex-col bg-slate-50/50"
                    >
                        <div className="p-4 border-b border-slate-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg flex items-center gap-2">
                                    <FileText className="text-blue-500" size={20} />
                                    메모장
                                </h2>
                                <button
                                    onClick={handleCreateMemo}
                                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="메모 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredMemos.map(memo => (
                                <div
                                    key={memo.id}
                                    onClick={() => setSelectedMemoId(memo.id)}
                                    className={`p-3 rounded-xl cursor-pointer group transition-all ${selectedMemoId === memo.id
                                        ? 'bg-blue-50 border border-blue-100'
                                        : 'hover:bg-white hover:shadow-sm border border-transparent'
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {memo.files.find(f => f.thumbnailUrl) && (
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                                <img
                                                    src={memo.files.find(f => f.thumbnailUrl)?.thumbnailUrl}
                                                    alt="thumb"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-semibold text-sm truncate flex-1 ${selectedMemoId === memo.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                                    {memo.title || '제목 없음'}
                                                </h3>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMemo(memo.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">
                                                {new Date(memo.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedMemo ? (
                    <>
                        {/* Editor Header/Toolbar */}
                        <div className="p-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                >
                                    <ChevronLeft size={20} className={isSidebarOpen ? '' : 'rotate-180'} />
                                </button>
                                <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                                <ToolbarButton
                                    icon={Bold}
                                    onClick={() => editor?.chain().focus().toggleBold().run()}
                                    active={editor?.isActive('bold')}
                                />
                                <ToolbarButton
                                    icon={Italic}
                                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                                    active={editor?.isActive('italic')}
                                />
                                <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                                <ToolbarButton
                                    icon={List}
                                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                    active={editor?.isActive('bulletList')}
                                />
                                <ToolbarButton
                                    icon={ListOrdered}
                                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                    active={editor?.isActive('orderedList')}
                                />
                                <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                                <ToolbarButton
                                    icon={TableIcon}
                                    onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                                    active={editor?.isActive('table')}
                                />
                                <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                                {editor?.isActive('image') && (
                                    <div className="flex items-center gap-1 bg-blue-50/50 p-1 rounded-xl border border-blue-100/50">
                                        <button
                                            onClick={() => editor?.chain().focus().updateAttributes('image', { width: '25%' }).run()}
                                            className="px-2 py-1 text-[10px] font-bold hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                        >
                                            Small
                                        </button>
                                        <button
                                            onClick={() => editor?.chain().focus().updateAttributes('image', { width: '50%' }).run()}
                                            className="px-2 py-1 text-[10px] font-bold hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                        >
                                            Medium
                                        </button>
                                        <button
                                            onClick={() => editor?.chain().focus().updateAttributes('image', { width: '100%' }).run()}
                                            className="px-2 py-1 text-[10px] font-bold hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                        >
                                            Full
                                        </button>
                                    </div>
                                )}

                                <label className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer">
                                    <ImageIcon size={18} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <button
                                onClick={handleSaveMemo}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                저장
                            </button>
                        </div>

                        {/* Title & Content */}
                        <div
                            className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6 editor-container cursor-text"
                            onClick={() => editor?.commands.focus()}
                        >
                            <input
                                type="text"
                                value={selectedMemo.title}
                                onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setMemos(prev => prev.map(m => m.id === selectedMemoId ? { ...m, title: newTitle } : m));
                                }}
                                placeholder="제목을 입력하세요"
                                className="w-full text-4xl font-black focus:outline-none placeholder:text-slate-200"
                                onClick={(e) => e.stopPropagation()} // Prevent title click from focusing editor end
                            />

                            <EditorContent editor={editor} className="prose prose-slate max-w-none focus:outline-none" />
                        </div>

                        {/* Attachments Section */}
                        {selectedMemo.files.length > 0 && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Paperclip size={12} />
                                    첨부파일 ({selectedMemo.files.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedMemo.files.map(file => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm group hover:border-blue-200 transition-colors"
                                        >
                                            <div
                                                className={`p-2 rounded-lg cursor-pointer transition-colors ${file.type.startsWith('image/') ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'bg-slate-50 text-slate-500'}`}
                                                onClick={() => {
                                                    if (file.type.startsWith('image/')) setLightboxUrl(file.url);
                                                }}
                                            >
                                                <FileText size={16} />
                                            </div>
                                            <div
                                                className="min-w-0 max-w-[200px] cursor-pointer"
                                                onClick={() => {
                                                    if (file.type.startsWith('image/')) setLightboxUrl(file.url);
                                                }}
                                            >
                                                <div className="text-xs font-semibold truncate text-slate-700">{file.filename}</div>
                                                <div className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                                            </div>
                                            <a
                                                href={file.url}
                                                download={file.filename}
                                                className="p-1 hover:text-blue-500 text-slate-400"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hidden upload for general files */}
                        <div className="p-4 flex h-12 items-center px-8 border-t border-slate-100">
                            <label className="text-sm text-slate-400 hover:text-blue-500 cursor-pointer flex items-center gap-2">
                                <Paperclip size={14} />
                                <span>파일 업로드</span>
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center">
                            <FileText size={40} />
                        </div>
                        <p className="font-medium">메모를 선택하거나 새로 작성해 보세요.</p>
                        <button
                            onClick={handleCreateMemo}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            새 메모 작성하기
                        </button>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxUrl(null)}
                        className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-8 overflow-hidden"
                    >
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-full max-h-full flex flex-col items-center"
                        >
                            <img
                                src={lightboxUrl}
                                alt="preview"
                                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain ring-1 ring-white/20"
                            />
                            <div className="mt-6 flex gap-4">
                                <a
                                    href={lightboxUrl}
                                    download
                                    className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors"
                                >
                                    <Download size={18} />
                                    이미지 다운로드
                                </a>
                                <button
                                    onClick={() => setLightboxUrl(null)}
                                    className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors backdrop-blur-md"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .editor-container .ProseMirror {
                    min-height: 500px;
                    outline: none;
                }
                .editor-container .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 2rem 0;
                    overflow: hidden;
                }
                .editor-container .ProseMirror table td,
                .editor-container .ProseMirror table th {
                    min-width: 1em;
                    border: 2px solid #f1f5f9;
                    padding: 3px 5px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }
                .editor-container .ProseMirror table th {
                    font-weight: bold;
                    text-align: left;
                    background-color: #f8fafc;
                }
                .editor-container .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 1rem;
                    margin: 1rem 0;
                }
                .editor-container .ProseMirror img.ProseMirror-selectednode {
                    outline: 4px solid #3b82f6;
                    outline-offset: 2px;
                }
            `}</style>
        </div>
    );
}
