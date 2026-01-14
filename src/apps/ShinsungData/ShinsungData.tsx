"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, History, FileText, Layers, Percent, Save, Search, Download, Trash2, Calendar, Edit2, Loader2, ImageIcon, Maximize2, X, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useOSStore } from '@/store/useOSStore';

interface Product {
    id: string;
    name: string;
}

interface Part {
    id: string;
    name: string;
}

interface ShinsungRecord {
    id: string;
    productId: string;
    product: Product;
    partId?: string;
    part?: Part;
    ratio?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    testDate?: string;
    thickness?: string;
    extractedData: string; // JSON string
    rawOcrText?: string;
    progress?: string;
    note?: string;
    createdAt: string;
}

export default function ShinsungData() {
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
    const [products, setProducts] = useState<Product[]>([]);
    const [parts, setParts] = useState<Part[]>([]);

    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [productSearchTerm, setProductSearchTerm] = useState('');

    const [selectedPartId, setSelectedPartId] = useState<string>('');
    const [partSearchTerm, setPartSearchTerm] = useState('');

    const [ratio, setRatio] = useState('');
    const [progress, setProgress] = useState('');
    const [testDate, setTestDate] = useState('');
    const [thickness, setThickness] = useState('');

    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ text: string; extractedValues: any; isMock?: boolean } | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [records, setRecords] = useState<ShinsungRecord[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [note, setNote] = useState('');
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const isDesktop = containerWidth >= 1024;
    const observerRef = useRef<ResizeObserver | null>(null);

    const { currentUser, pushBackAction } = useOSStore();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial width on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setContainerWidth(window.innerWidth);
        }
    }, []);

    const rootRefCallback = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        if (node) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setContainerWidth(entry.contentRect.width);
                }
            });
            resizeObserver.observe(node);
            observerRef.current = resizeObserver;
        }
    }, []);

    useEffect(() => {
        if (selectedImage) {
            pushBackAction('shinsung-image-detail', () => {
                setSelectedImage(null);
            });
        }
    }, [selectedImage, pushBackAction]);

    useEffect(() => {
        fetchProducts();
        fetchParts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/shinsung/products');
            const data = await res.json();
            if (Array.isArray(data)) setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const fetchParts = async () => {
        try {
            const res = await fetch('/api/shinsung/parts');
            const data = await res.json();
            if (Array.isArray(data)) setParts(data);
        } catch (error) {
            console.error('Failed to fetch parts', error);
        }
    };

    const fetchRecords = async () => {
        setIsLoadingRecords(true);
        try {
            const res = await fetch('/api/shinsung/records');
            const data = await res.json();
            if (Array.isArray(data)) setRecords(data);
        } catch (error) {
            console.error('Failed to fetch records', error);
        } finally {
            setIsLoadingRecords(false);
        }
    };

    const resetForm = useCallback(() => {
        setImage(null);
        setOcrResult(null);
        setEditData({});
        setNote('');
        setSelectedProductId('');
        setProductSearchTerm('');
        setSelectedPartId('');
        setPartSearchTerm('');
        setRatio('');
        setProgress('');
        setTestDate('');
        setThickness('');
    }, []);

    useEffect(() => {
        if (activeTab === 'history' || isDesktop) {
            fetchRecords();
        }
        if (activeTab === 'upload' && !isDesktop) {
            resetForm();
        }
    }, [activeTab, isDesktop, resetForm]);

    const handleResolveProduct = async (name: string): Promise<string | null> => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const existing = products.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;

        try {
            const res = await fetch('/api/shinsung/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            });
            const data = await res.json();
            if (data.id) {
                setProducts(prev => [...prev, data]);
                return data.id;
            }
            console.error('Product resolve failed:', data);
            return null;
        } catch (error) {
            console.error('Product resolve catch:', error);
            return null;
        }
    };

    const handleResolvePart = async (name: string): Promise<string | null> => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const existing = parts.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;

        try {
            const res = await fetch('/api/shinsung/parts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            });
            const data = await res.json();
            if (data.id) {
                setParts(prev => [...prev, data]);
                return data.id;
            }
            console.error('Part resolve failed:', data);
            return null;
        } catch (error) {
            console.error('Part resolve catch:', error);
            return null;
        }
    };

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setImage(base64);
            processOCR(base64.split(',')[1]);
        };
        reader.readAsDataURL(file);
    };

    const processOCR = async (base64Image: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/shinsung/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image }),
            });
            const data = await res.json();
            setOcrResult(data);

            const values = { ...data.extractedValues };

            // Auto-populate ratio
            if (values['비율']) {
                setRatio(values['비율']);
                delete values['비율'];
            }

            // Auto-populate test date
            if (values['시험일시']) {
                setTestDate(values['시험일시']);
                delete values['시험일시'];
            }

            // Auto-populate thickness
            if (values['두께']) {
                setThickness(values['두께']);
                delete values['두께'];
            }

            setEditData(values || {});
        } catch (error) {
            console.error('OCR failed', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveRecord = async () => {
        const trimmedProduct = productSearchTerm.trim();
        const trimmedPart = partSearchTerm.trim();

        if (!trimmedProduct) {
            alert('완제품명을 입력해 주세요.');
            return;
        }
        if (!trimmedPart) {
            alert('부위명을 입력해 주세요.');
            return;
        }

        setIsSaving(true);
        try {
            // Resolve Product
            let finalProductId = selectedProductId;
            const currentProductName = products.find(p => p.id === finalProductId)?.name;

            if (!finalProductId || currentProductName?.trim() !== trimmedProduct) {
                const resolvedId = await handleResolveProduct(trimmedProduct);
                if (!resolvedId) {
                    setIsSaving(false);
                    alert(`완제품명 '${trimmedProduct}'을(를) 시스템에 등록할 수 없습니다.\n품명 형식을 확인해 주세요.`);
                    return;
                }
                finalProductId = resolvedId;
            }

            // Resolve Part
            let finalPartId = selectedPartId;
            const currentPartName = parts.find(p => p.id === finalPartId)?.name;

            if (!finalPartId || currentPartName?.trim() !== trimmedPart) {
                const resolvedId = await handleResolvePart(trimmedPart);
                if (!resolvedId) {
                    setIsSaving(false);
                    alert(`부위명 '${trimmedPart}'을(를) 시스템에 등록할 수 없습니다.`);
                    return;
                }
                finalPartId = resolvedId;
            }
            const res = await fetch('/api/shinsung/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: finalProductId,
                    partId: finalPartId,
                    ratio,
                    progress,
                    testDate,
                    thickness,
                    imageUrl: image,
                    extractedData: editData,
                    rawOcrText: ocrResult?.text,
                    note
                }),
            });
            const data = await res.json();
            if (data.id) {
                alert('저장되었습니다.');
                resetForm();
                if (isDesktop) {
                    fetchRecords();
                } else {
                    setActiveTab('history');
                }
            }
        } catch (error) {
            alert('저장 실패');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await fetch(`/api/shinsung/records?id=${id}`, { method: 'DELETE' });
            setRecords(records.filter(r => r.id !== id));
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleExportExcel = () => {
        const rows = records.map((r, i) => {
            let data: any = {};
            try { data = JSON.parse(r.extractedData); } catch (e) { }
            return {
                "No": i + 1,
                "기록일": new Date(r.createdAt).toLocaleString(),
                "시험일시": r.testDate || '',
                "완제품명": r.product.name,
                "부위명": r.part?.name || '',
                "비율": r.ratio || '',
                "진행여부": r.progress || '',
                "비고": r.note,
                ...data
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ShinsungData");
        XLSX.writeFile(workbook, `신성데이터_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredRecords = records.filter(r =>
        r.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.part?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.ratio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.testDate || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Clipboard Paste Handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) handleImageUpload(file);
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const renderUpload = () => (
        <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-2xl mx-auto w-full">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><FileText size={14} /> 완제품명</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={productSearchTerm}
                                onChange={(e) => { setProductSearchTerm(e.target.value); setSelectedProductId(''); }}
                                className="w-full h-11 pl-4 pr-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                placeholder="완제품명을 입력하세요..."
                            />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 z-50 hidden group-focus-within:block max-h-48 overflow-y-auto">
                                {products.filter(p => p.name.includes(productSearchTerm)).map(p => (
                                    <button key={p.id} onMouseDown={(e) => { e.preventDefault(); setSelectedProductId(p.id); setProductSearchTerm(p.name); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Part Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><Layers size={14} /> 부위명</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={partSearchTerm}
                                onChange={(e) => { setPartSearchTerm(e.target.value); setSelectedPartId(''); }}
                                className="w-full h-11 pl-4 pr-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                placeholder="부위명을 입력하세요..."
                            />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 z-50 hidden group-focus-within:block max-h-48 overflow-y-auto">
                                {parts.filter(p => p.name.includes(partSearchTerm)).map(p => (
                                    <button key={p.id} onMouseDown={(e) => { e.preventDefault(); setSelectedPartId(p.id); setPartSearchTerm(p.name); }} className="w-full text-left px-4 py-2 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Progress */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500">진행여부</label>
                        <input
                            type="text"
                            value={progress}
                            onChange={(e) => setProgress(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                            placeholder="진행 상태..."
                        />
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500 text-indigo-600 flex items-center gap-1.5"><Edit2 size={14} /> 비고 (직접 입력)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-indigo-100 bg-indigo-50/10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                            placeholder="참고 사항을 입력하세요..."
                        />
                    </div>
                </div>
            </section>

            {!image ? (
                <section
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleImageUpload(file);
                    }}
                    className="border-4 border-dashed border-slate-200 rounded-[40px] p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition-all h-80 group bg-white shadow-sm"
                >
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon size={40} className="text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-slate-700 text-lg">성적서 사진을 등록하세요</p>
                        <p className="text-sm text-slate-400 mt-1">클릭, 드래그 또는 붙여넣기(Ctrl+V)</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </section>
            ) : (
                <section className="space-y-6">
                    <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-black/5 group">
                        <img src={image} alt="Preview" className="w-full h-auto max-h-[600px] object-contain" />
                        <button onClick={() => { setImage(null); setOcrResult(null); }} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-all shadow-lg">
                            <X size={20} />
                        </button>
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                <Loader2 size={40} className="animate-spin text-indigo-600" />
                                <p className="font-bold text-indigo-600 tracking-tight">성적서 분석 중...</p>
                            </div>
                        )}
                    </div>

                    {ocrResult && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                    <Check size={20} className="text-emerald-500" />
                                    분석 데이터 확인
                                </h3>
                                <div className="flex flex-wrap gap-3 justify-end">
                                    {thickness && (
                                        <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                                            <Layers size={12} className="text-rose-500" />
                                            <span className="text-xs font-black text-rose-700">두께: {thickness}</span>
                                        </div>
                                    )}
                                    {ratio && (
                                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                            <Percent size={12} className="text-indigo-500" />
                                            <span className="text-xs font-black text-indigo-700">비율: {ratio}</span>
                                        </div>
                                    )}
                                    {testDate && (
                                        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                            <Calendar size={12} className="text-slate-500" />
                                            <span className="text-xs font-bold text-slate-700">{testDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                                {Object.entries(editData).map(([key, value]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tight ml-1 truncate block" title={key}>{key}</label>
                                        <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 transition-all text-xs font-bold text-slate-700 shadow-sm" />
                                    </div>
                                ))}
                            </div>
                            <button disabled={isSaving} onClick={handleSaveRecord} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:translate-y-[-2px] transition-all active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                                <span>기록 저장하기</span>
                            </button>
                        </motion.div>
                    )}
                </section>
            )}
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 w-full">
            <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm ${isDesktop ? 'max-w-4xl mx-auto' : ''}`}>
                <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="완제품명, 부위명, 비율, 시험일시 등으로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-300 transition-all outline-none text-sm" />
                </div>
                <button onClick={handleExportExcel} className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                    <Download size={20} />
                    <span>Excel 전송</span>
                </button>
            </div>

            <div className="space-y-4">
                {isLoadingRecords ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                        <Loader2 size={40} className="animate-spin" />
                        <p className="font-bold">이력을 불러오고 있습니다...</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                        <ImageIcon size={60} className="opacity-20" />
                        <p className="font-bold text-lg">데이터가 존재하지 않습니다</p>
                    </div>
                ) : (
                    filteredRecords.map(record => {
                        let dataMap: Record<string, string | number> = {};
                        try {
                            // Robust parsing for potentially double-stringified JSON
                            let parsed = record.extractedData;
                            if (typeof parsed === 'string') {
                                try {
                                    parsed = JSON.parse(parsed);
                                } catch (e) { /* ignore */ }
                            }
                            if (typeof parsed === 'string') {
                                try {
                                    parsed = JSON.parse(parsed);
                                } catch (e) { /* ignore */ }
                            }

                            if (typeof parsed === 'object' && parsed !== null) {
                                dataMap = parsed as Record<string, string | number>;
                            }
                        } catch (e) {
                            console.error('Failed to parse extractedData', e);
                        }

                        // Group data by Row Label (No.1, No.2, ... AVR)
                        const rows: Record<string, Record<string, string | number>> = {};
                        const columns = ['20MM', '40MM', '60MM', '80MM', 'AVR'];

                        Object.entries(dataMap).forEach(([key, value]) => {
                            const upperKey = key.toUpperCase();
                            // Extract Row Label (e.g. "NO.1", "AVR")
                            let rowLabel = '';
                            if (upperKey.includes('NO.')) {
                                const match = upperKey.match(/(NO\.\d+)/);
                                if (match) rowLabel = match[1];
                            } else if (upperKey.includes('AVR') && !columns.some(c => upperKey.endsWith(c))) {
                                if (upperKey.startsWith('AVR')) rowLabel = 'AVR';
                            }

                            if (!rowLabel) {
                                if (upperKey.startsWith('AVR')) rowLabel = 'AVR';
                            }

                            if (rowLabel) {
                                if (!rows[rowLabel]) rows[rowLabel] = {};

                                // Determine Column
                                let col = '';
                                if (upperKey.includes('20MM')) col = '20MM';
                                else if (upperKey.includes('40MM')) col = '40MM';
                                else if (upperKey.includes('60MM')) col = '60MM';
                                else if (upperKey.includes('80MM')) col = '80MM';
                                else if (upperKey.includes('AVR') && !upperKey.startsWith('AVR')) col = 'AVR'; // Column AVR, not Row AVR
                                else if (upperKey.includes('AVR') && upperKey.startsWith('AVR')) {
                                    if (upperKey.endsWith('AVR')) col = 'AVR';
                                }

                                if (col) {
                                    rows[rowLabel][col] = value;
                                }
                            }
                        });

                        // Sort Rows: No.1 -> No.5 -> AVR
                        const sortedRowKeys = Object.keys(rows).sort((a, b) => {
                            if (a.startsWith('NO.') && b.startsWith('NO.')) {
                                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                                return numA - numB;
                            }
                            if (a.startsWith('NO.')) return -1;
                            if (b.startsWith('NO.')) return 1;
                            return 0; // AVR vs AVR or others
                        });

                        // Calculate Min/Max for Non-AVR data
                        let gridMin = Infinity;
                        let gridMax = -Infinity;
                        Object.keys(rows).forEach(rKey => {
                            if (rKey === 'AVR') return;
                            columns.forEach(cKey => {
                                if (cKey === 'AVR') return;
                                const v = parseFloat(String(rows[rKey][cKey]));
                                if (!isNaN(v)) {
                                    if (v < gridMin) gridMin = v;
                                    if (v > gridMax) gridMax = v;
                                }
                            });
                        });

                        // Progress: Hide if default "진행중"
                        const showProgress = record.progress && record.progress !== '진행중';

                        return (
                            <div key={record.id} className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col xl:flex-row gap-6 ${isDesktop ? 'w-full' : ''}`}>
                                <div className="w-full xl:w-48 h-48 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer group relative" onClick={() => setSelectedImage(record.imageUrl || null)}>
                                    {record.thumbnailUrl || record.imageUrl ? (
                                        <>
                                            <img src={record.thumbnailUrl || record.imageUrl} alt="Record" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4 min-w-[300px]">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">{record.testDate || new Date(record.createdAt).toLocaleDateString()}</span>
                                                {showProgress && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-600">
                                                        {record.progress}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-800 leading-tight">{record.product.name}</h3>
                                            {record.part && <p className="text-sm font-bold text-slate-500">{record.part.name}</p>}
                                        </div>
                                        <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 items-center">
                                        {record.thickness && (
                                            <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                                                <Layers size={16} className="text-rose-500" />
                                                <span className="text-sm font-black text-rose-700">두께: {record.thickness}</span>
                                            </div>
                                        )}
                                        {record.ratio && (
                                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                                <Percent size={16} className="text-indigo-500" />
                                                <span className="text-sm font-black text-indigo-700">비율: {record.ratio}</span>
                                            </div>
                                        )}
                                    </div>

                                    {record.note && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-2">{record.note}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full xl:w-auto xl:min-w-[420px]">
                                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 h-full flex flex-col justify-center">
                                        {Object.keys(rows).length > 0 ? (
                                            <div className="w-full">
                                                <div className="grid grid-cols-6 gap-2 mb-2 pb-2 border-b border-slate-200">
                                                    <div className="text-[10px] font-black text-slate-400 text-center uppercase">NO.</div>
                                                    {columns.map(h => (
                                                        <div key={h} className="text-[10px] font-black text-slate-400 text-center uppercase">{h}</div>
                                                    ))}
                                                </div>
                                                <div className="space-y-2">
                                                    {sortedRowKeys.map(rowLabel => {
                                                        const isAvrRow = rowLabel === 'AVR';
                                                        return (
                                                            <div key={rowLabel} className="grid grid-cols-6 gap-2 items-center">
                                                                <div className={`text-[10px] font-black text-center rounded-lg py-1.5 ${isAvrRow ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 bg-slate-100'}`}>{rowLabel}</div>
                                                                {columns.map(col => {
                                                                    const isAvrCol = col === 'AVR';
                                                                    const val = rows[rowLabel][col];
                                                                    const hasValue = !!val;
                                                                    const numVal = hasValue ? parseFloat(String(val)) : NaN;
                                                                    let cellClass = hasValue ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-transparent text-slate-300';

                                                                    if (hasValue) {
                                                                        if (isAvrRow && isAvrCol) {
                                                                            cellClass = 'bg-indigo-500 border-indigo-600 text-white shadow-md transform scale-105';
                                                                        } else if (isAvrRow || isAvrCol) {
                                                                            cellClass = 'bg-indigo-50 border-indigo-100 text-indigo-700';
                                                                        } else if (!isNaN(numVal) && !isAvrRow && !isAvrCol) {
                                                                            if (numVal === gridMin) cellClass = 'bg-orange-50 border-orange-100 text-orange-700 font-extrabold ring-1 ring-orange-200';
                                                                            if (numVal === gridMax) cellClass = 'bg-purple-50 border-purple-100 text-purple-700 font-extrabold ring-1 ring-purple-200';
                                                                        }
                                                                    }

                                                                    return (
                                                                        <div key={col} className={`text-xs font-bold text-center py-1.5 rounded-lg border shadow-sm ${cellClass}`}>
                                                                            {rows[rowLabel][col] || '-'}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-xs text-slate-400 font-bold py-10">데이터 없음</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );

    return (
        <div ref={rootRefCallback} className="flex flex-col h-full bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
            {/* Header Tabs - Mobile Only */}
            {!isDesktop && (
                <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-indigo-50 font-bold text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Upload size={18} />
                        <span>기록 등록</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-indigo-50 font-bold text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <History size={18} />
                        <span>이력 조회</span>
                    </button>
                </div>
            )}

            {/* Desktop Header Title */}
            {isDesktop && (
                <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Layers size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-800">신성데이터 관리 시스템</h1>
                            <p className="text-xs text-slate-400 font-medium italic">성적서 통합 관리 및 실시간 데이터 조회</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto scrollbar-hide">
                {isDesktop ? (
                    <div className="flex h-full divide-x divide-slate-100">
                        {/* Left: Registration */}
                        <div className="w-[600px] overflow-y-auto p-8 bg-indigo-50/10">
                            <div className="mb-8">
                                <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                    기록 등록
                                </h2>
                            </div>
                            {renderUpload()}
                        </div>
                        {/* Right: History */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="mb-8">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <History size={14} />
                                    이력 통합 조회
                                </h2>
                            </div>
                            {renderHistory()}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 h-full">
                        <AnimatePresence mode="wait">
                            {activeTab === 'upload' ? renderUpload() : renderHistory()}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
                    >
                        <motion.img
                            src={selectedImage}
                            alt="Full View"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        <button className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors">
                            <X size={32} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] shadow-inner">
                <div className="flex items-center gap-4">
                    <span>Shinsung Data v3.0 Precision</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-indigo-400">{filteredRecords.length} records analyzed</span>
                </div>
                <div className="flex gap-4">
                    <span>Pattern Recognition Enabled</span>
                    <span>System Ready</span>
                </div>
            </footer>
        </div >
    );
}
