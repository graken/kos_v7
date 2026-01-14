"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Image as ImageIcon, Upload,
    Clipboard, Save, History, ChevronRight, X,
    FileText, Loader2, Link, Edit2, Check, AlertCircle, Trash2, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useOSStore } from '@/store/useOSStore';

interface Product {
    id: string;
    name: string;
}

interface CoatingRecord {
    id: string;
    productId: string;
    product: Product;
    imageUrl?: string;
    extractedData: string; // JSON string
    rawOcrText?: string;
    degree?: string;
    stage?: string;
    note?: string;
    createdAt: string;
}

export default function CoatingControl() {
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [productSearchTerm, setProductSearchTerm] = useState('');

    const [image, setImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrResult, setOcrResult] = useState<{ text: string; extractedValues: any; isMock?: boolean } | null>(null);
    const [editData, setEditData] = useState<any>({});

    const [records, setRecords] = useState<CoatingRecord[]>([]);
    const {
        apps, reorderApps, openApp, windows,
        desktopGridSettings, mobileGridSettings, hasHydrated,
        pushBackAction, popBackAction
    } = useOSStore();
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const isDesktop = containerWidth >= 1024;
    const observerRef = useRef<ResizeObserver | null>(null);

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

    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [isEditingRecord, setIsEditingRecord] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [degree, setDegree] = useState('');
    const [stage, setStage] = useState('시작');
    const [note, setNote] = useState('');

    const { currentUser } = useOSStore();
    const canCreate = currentUser?.role === 'admin' || currentUser?.permissions?.['coating-control']?.create;
    const canSave = currentUser?.role === 'admin' || currentUser?.permissions?.['coating-control']?.save;
    const canEdit = currentUser?.role === 'admin' || currentUser?.permissions?.['coating-control']?.edit;
    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.['coating-control']?.delete;
    const canPhoto = currentUser?.role === 'admin' || currentUser?.permissions?.['coating-control']?.photo;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 안드로이드 백버튼 지원 (팝업 닫기)
    useEffect(() => {
        if (selectedRecordId) {
            pushBackAction('coating-record-detail', () => {
                setSelectedRecordId(null);
                setIsEditingRecord(false);
            });
        } else {
            popBackAction('coating-record-detail');
        }
    }, [selectedRecordId, pushBackAction, popBackAction]);

    useEffect(() => {
        if (selectedImage) {
            pushBackAction('coating-image-expand', () => setSelectedImage(null));
        } else {
            popBackAction('coating-image-expand');
        }
    }, [selectedImage, pushBackAction, popBackAction]);

    // Initial data fetch
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/coating/products');
            const data = await res.json();
            if (Array.isArray(data)) setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
    };

    const fetchRecords = async () => {
        setIsLoadingRecords(true);
        try {
            const res = await fetch('/api/coating/records');
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
        setDegree('');
        setNote('');
        setSelectedProductId('');
        setProductSearchTerm('');
        setStage('시작');
        setSelectedRecordId(null);
        setIsEditingRecord(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'history' || isDesktop) {
            fetchRecords();
        }
        if (activeTab === 'upload' && !isDesktop) {
            resetForm();
        }
    }, [activeTab, isDesktop, resetForm]);

    const handleDeleteProduct = async (id: string, name: string) => {
        if (!canDelete) {
            alert('삭제 권한이 없습니다.');
            return;
        }
        if (!confirm(`'${name}' 품명을 삭제하시겠습니까?\n(등록된 기록이 있으면 삭제되지 않습니다.)`)) return;

        try {
            const res = await fetch(`/api/coating/products?id=${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                setProducts(products.filter(p => p.id !== id));
                if (selectedProductId === id) {
                    setSelectedProductId('');
                    setProductSearchTerm('');
                }
                alert('삭제되었습니다.');
            } else {
                alert(data.error || '삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to delete product', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleResolveProduct = async (name: string): Promise<string | null> => {
        if (!name.trim()) return null;

        // 1. Check if name already exists in current products list
        const existing = products.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
        if (existing) return existing.id;

        // 2. If not, create new product
        try {
            const res = await fetch('/api/coating/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (data.id) {
                // Refresh products list locally
                setProducts(prev => [...prev, data]);
                return data.id;
            }
            return null;
        } catch (error) {
            console.error('Failed to resolve product', error);
            return null;
        }
    };

    const handleUpdateRecord = async () => {
        if (!canEdit) {
            alert('수정 권한이 없습니다.');
            return;
        }
        if (!selectedRecordId) return;

        // Resolve product ID if it's not already selected or if term changed
        let productId = selectedProductId;
        if (!productId || products.find(p => p.id === productId)?.name !== productSearchTerm) {
            const resolvedId = await handleResolveProduct(productSearchTerm);
            if (!resolvedId) {
                alert('품명을 입력하거나 선택해 주세요.');
                return;
            }
            productId = resolvedId;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/coating/records', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedRecordId,
                    productId: productId,
                    extractedData: editData,
                    imageUrl: image,
                    degree: degree ? `${degree.toString().replace(/[^0-9]/g, '') || '1'}차` : "",
                    stage,
                    note
                }),
            });
            const updatedRecord = await res.json();
            if (updatedRecord.id) {
                setRecords(records.map(r => r.id === updatedRecord.id ? updatedRecord : r));
                alert('수정되었습니다.');
                resetForm();
            }
        } catch (error) {
            console.error('Update failed', error);
            alert('수정 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        if (!canDelete) {
            alert('삭제 권한이 없습니다.');
            return;
        }
        if (!confirm('자료를 정말 삭제하시등겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const res = await fetch(`/api/coating/records?id=${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setRecords(records.filter(r => r.id !== id));
                setSelectedRecordId(null);
                alert('삭제되었습니다.');
            }
        } catch (error) {
            console.error('Delete failed', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleImageUpload = (file: File) => {
        if (!canPhoto) {
            alert('사진 입력 권한이 없습니다.');
            return;
        }
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
            const res = await fetch('/api/coating/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image }),
            });
            const data = await res.json();
            setOcrResult(data);

            // 단순 추출된 배열이면 객체로 변환 시도 (사용자가 편집하기 편하게)
            if (Array.isArray(data.extractedValues)) {
                const initialEditData: any = {};
                data.extractedValues.forEach((val: any, i: number) => {
                    initialEditData[`field_${i + 1}`] = val;
                });
                setEditData(initialEditData);
            } else {
                setEditData(data.extractedValues || {});
            }
        } catch (error) {
            console.error('OCR failed', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveRecord = async () => {
        if (!canSave) {
            alert('저장 권한이 없습니다.');
            return;
        }

        // Resolve product ID if it's not already selected or if term changed
        let productId = selectedProductId;
        if (!productId || products.find(p => p.id === productId)?.name !== productSearchTerm) {
            const resolvedId = await handleResolveProduct(productSearchTerm);
            if (!resolvedId) {
                alert('품명을 입력하거나 선택해 주세요.');
                return;
            }
            productId = resolvedId;
        }

        try {
            const res = await fetch('/api/coating/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: productId,
                    imageUrl: image,
                    extractedData: editData,
                    rawOcrText: ocrResult?.text,
                    degree: degree ? `${degree.toString().replace(/[^0-9]/g, '') || '1'}차` : "",
                    stage,
                    note
                }),
            });
            const data = await res.json();
            if (data.id) {
                alert('기록이 저장되었습니다.');
                resetForm();
                if (isDesktop) {
                    fetchRecords();
                } else {
                    setActiveTab('history');
                }
            } else if (data.error) {
                alert(`저장 실패: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to save record', error);
            alert('기록 저장 중 오류가 발생했습니다.');
        }
    };

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

    const handleExportExcel = () => {
        if (filteredRecords.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        // Header
        const baseHeaders = ['순번', '측정날짜', '측정시간', '품명', '차수', '시작/끝', '비고', '최소값', '최대값', '평균값'];
        const measurementHeaders = Array.from({ length: maxMeasurements }, (_, i) => `측정_${i + 1}`);
        const headers = [...baseHeaders, ...measurementHeaders];

        const rows = filteredRecords.map((record, index) => {
            let data: any = {};
            try { data = JSON.parse(record.extractedData || '{}'); } catch (e) { }

            const baseData = [
                index + 1,
                data['측정날짜'] || '',
                data['측정시간'] || '',
                record.product.name,
                record.degree || '',
                record.stage || '',
                record.note || '',
                data['최소(MIN)'] || '',
                data['최대(MAX)'] || '',
                data['평균(avg)'] || ''
            ];

            const measurements = Array.from({ length: maxMeasurements }, (_, i) => data[`측정_${i + 1}`] || '');
            return [...baseData, ...measurements];
        });

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "박막도포관리 이력");

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `박막도포관리_이력_${dateStr}.xlsx`);
    };

    const filteredRecords = useMemo(() => records.filter(r =>
        r.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rawOcrText?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [records, searchTerm]);

    const maxMeasurements = useMemo(() => filteredRecords.reduce((max, record) => {
        try {
            const data = JSON.parse(record.extractedData || '{}');
            let count = 0;
            for (let i = 1; i <= 10; i++) {
                if (data[`측정_${i}`]) count = i;
            }
            return Math.max(max, count);
        } catch (e) { return max; }
    }, 0), [filteredRecords]);

    const renderUpload = () => (
        <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 max-w-2xl mx-auto w-full"
        >
            {/* Product Selection */}
            <section className="space-y-3">
                <label className="text-sm font-bold text-black/60 flex items-center gap-2">
                    <FileText size={16} />
                    품명 선택
                </label>
                <div className="flex gap-2">
                    <div className="flex-1 relative group/select">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="품명 검색 또는 직접 입력..."
                                value={productSearchTerm}
                                onChange={(e) => {
                                    setProductSearchTerm(e.target.value);
                                    if (selectedProductId) setSelectedProductId('');
                                }}
                                className="w-full h-11 pl-10 pr-20 rounded-xl border border-black/10 focus:outline-none focus:border-black/30 bg-black/[0.02] font-bold text-black/80 transition-all focus:bg-white focus:shadow-sm"
                            />
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/20" />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {(productSearchTerm || selectedProductId) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProductSearchTerm('');
                                            setSelectedProductId('');
                                        }}
                                        className="p-1 hover:bg-black/5 rounded-full text-black/20 hover:text-black/40 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                {selectedProductId && (
                                    <div className="text-green-500">
                                        <Check size={16} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product List Dropdown */}
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 shadow-2xl rounded-2xl p-2 z-[60] max-h-64 overflow-y-auto hidden group-focus-within/select:block animate-in fade-in slide-in-from-top-2 duration-200">
                            {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).length > 0 ? (
                                products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            // Use onMouseDown to trigger before blur
                                            e.preventDefault();
                                            setSelectedProductId(p.id);
                                            setProductSearchTerm(p.name);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-between group/item ${selectedProductId === p.id ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'}`}
                                    >
                                        <span>{p.name}</span>
                                        <div className="flex items-center gap-2">
                                            {canDelete && (
                                                <div
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteProduct(p.id, p.name);
                                                    }}
                                                    title="품명 삭제"
                                                    className={`p-1.5 rounded-lg transition-colors ${selectedProductId === p.id ? 'hover:bg-white/20 text-white/40 hover:text-white' : 'hover:bg-red-50 text-black/10 hover:text-red-500'}`}
                                                >
                                                    <Trash2 size={14} />
                                                </div>
                                            )}
                                            {selectedProductId === p.id ? <Check size={14} /> : <ChevronRight size={14} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 text-center text-black/20 text-xs font-bold italic">
                                    검색결과가 없습니다. {productSearchTerm.trim() && `"${productSearchTerm}"으로 신규 등록됩니다.`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Degree and Stage Selection */}
            <section className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <label className="text-sm font-bold text-black/60 flex items-center gap-2">
                        차수
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={degree}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setDegree(val);
                        }}
                        className="w-full px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:border-black/30 bg-white font-bold"
                        placeholder="숫자만 입력하세요"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-sm font-bold text-black/60 flex items-center gap-2">
                        시작/끝
                    </label>
                    <div className="flex bg-black/5 p-1 rounded-xl">
                        <button
                            onClick={() => setStage('시작')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${stage === '시작' ? 'bg-white shadow-sm text-black' : 'text-black/40'}`}
                        >
                            시작
                        </button>
                        <button
                            onClick={() => setStage('끝')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${stage === '끝' ? 'bg-white shadow-sm text-black' : 'text-black/40'}`}
                        >
                            끝
                        </button>
                    </div>
                </div>
            </section>

            {/* Note Section */}
            <section className="space-y-3">
                <label className="text-sm font-bold text-black/60 flex items-center gap-2">
                    비고
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="특이사항을 입력하세요..."
                    className="w-full px-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:border-black/30 bg-white min-h-[80px] text-sm resize-none"
                />
            </section>

            {/* Image Upload Zone */}
            {!image ? (
                <section
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleImageUpload(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:bg-black/[0.02] hover:border-black/20 cursor-pointer transition-all h-64 group"
                >
                    <div className="p-4 bg-black/5 rounded-full group-hover:scale-110 transition-transform">
                        <ImageIcon size={48} className="text-black/40" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-black/60">사진을 드래그하거나 클릭하여 업로드</p>
                        <p className="text-xs text-black/30 mt-1">클립보드(Ctrl+V) 붙여넣기도 가능합니다</p>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                        }}
                    />
                </section>
            ) : (
                <section className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative rounded-2xl overflow-hidden border border-black/10 shadow-lg group">
                        <img src={image} alt="Preview" className="w-full h-auto max-h-[400px] object-contain bg-black/5" />
                        <button
                            onClick={() => {
                                setImage(null);
                                setOcrResult(null);
                            }}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                <Loader2 size={32} className="animate-spin text-black/60" />
                                <p className="text-sm font-bold text-black/60">데이터 분석 중...</p>
                            </div>
                        )}
                    </div>

                    {/* OCR Result Review */}
                    {ocrResult && (
                        <div className="bg-black/5 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-black/60 flex items-center gap-2">
                                    <Edit2 size={16} />
                                    데이터 확인 및 수정
                                </h3>
                                {ocrResult.isMock && (
                                    <span className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                        <AlertCircle size={10} />
                                        데모 모드
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(editData).map(([key, value]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-bold text-black/40 px-1">{key}</label>
                                        <input
                                            type="text"
                                            value={String(value)}
                                            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl bg-white border border-black/5 focus:outline-none focus:border-black/20"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newKey = `field_${Object.keys(editData).length + 1}`;
                                        setEditData({ ...editData, [newKey]: '' });
                                    }}
                                    className="col-span-2 py-2 border border-dashed border-black/10 rounded-xl text-xs font-bold text-black/30 hover:bg-black/[0.02] active:bg-black/[0.05] transition-colors flex items-center justify-center gap-1 mt-2"
                                >
                                    <Plus size={12} />
                                    항목 추가
                                </button>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleSaveRecord}
                                    className="flex-1 bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-all shadow-lg active:scale-[0.98]"
                                >
                                    <Save size={18} />
                                    <span>저장하기</span>
                                </button>
                            </div>

                            <div className="mt-4 p-3 bg-black/5 rounded-xl border border-black/5">
                                <p className="text-[10px] font-bold text-black/30 uppercase mb-1">원본 추출 텍스트</p>
                                <p className="text-xs text-black/50 line-clamp-3 italic">"{ocrResult.text}"</p>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div
            key="history"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 w-full"
        >
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                    <input
                        type="text"
                        placeholder="품명 또는 내용 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black/[0.03] focus:outline-none focus:bg-black/[0.05] transition-all"
                    />
                </div>
                <button
                    onClick={handleExportExcel}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-100 shrink-0"
                >
                    <Download size={18} />
                    <span className="hidden sm:inline">Excel 내보내기</span>
                </button>
            </div>

            {/* Records List */}
            {isLoadingRecords ? (
                <div className="flex flex-col items-center justify-center py-20 text-black/20">
                    <Loader2 size={40} className="animate-spin mb-2" />
                    <p className="font-bold">기록 불러오는 중...</p>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-black/20 text-center">
                    <History size={60} className="mb-4 opacity-50" />
                    <p className="font-bold">저장된 기록이 없습니다.</p>
                    <p className="text-sm">먼저 기록을 등록해 보세요.</p>
                </div>
            ) : (
                <div className="h-full w-full">
                    <div className="space-y-4 w-full">
                        {(() => {
                            const maxMeasurements = filteredRecords.reduce((max, record) => {
                                try {
                                    const data = JSON.parse(record.extractedData || '{}');
                                    let count = 0;
                                    for (let i = 1; i <= 10; i++) {
                                        if (data[`측정_${i}`]) count = i;
                                    }
                                    return Math.max(max, count);
                                } catch (e) { return max; }
                            }, 0);

                            return containerWidth >= 768 ? (
                                /* Table View for Wide Screens */
                                <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[1200px]">
                                            <thead>
                                                <tr className="bg-black/[0.02] border-b border-black/5 text-[11px] font-bold text-black/40 uppercase tracking-wider">
                                                    <th className="p-4 pl-6 w-20">사진</th>
                                                    <th className="p-4 w-32">
                                                        <div>측정날짜</div>
                                                        <div className="text-[9px] opacity-50">측정시간</div>
                                                    </th>
                                                    <th className="p-4 w-48">
                                                        <div>품명</div>
                                                        <div className="text-[9px] opacity-50">차수 & 시작,끝</div>
                                                    </th>
                                                    <th className="p-4 w-48">비고</th>
                                                    <th className="p-4 w-24 text-center">최소값</th>
                                                    <th className="p-4 w-24 text-center">최대값</th>
                                                    <th className="p-4 w-24 text-center">평균값</th>
                                                    {[...Array(maxMeasurements)].map((_, i) => (
                                                        <th key={i} className="p-4 w-16 text-center border-l border-black/5">{i + 1}</th>
                                                    ))}
                                                    <th className="p-4 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-black/5">
                                                {filteredRecords.map(record => {
                                                    let data: any = {};
                                                    try { data = JSON.parse(record.extractedData || '{}'); } catch (e) { }

                                                    return (
                                                        <tr
                                                            key={record.id}
                                                            onClick={() => setSelectedRecordId(record.id)}
                                                            className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                                                        >
                                                            <td className="p-3 pl-6">
                                                                {record.imageUrl ? (
                                                                    <div
                                                                        className="w-10 h-10 rounded-lg overflow-hidden bg-black/5 border border-black/5 hover:scale-150 hover:shadow-lg transition-transform origin-left relative z-10"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedImage(record.imageUrl!);
                                                                        }}
                                                                    >
                                                                        <img src={record.imageUrl} className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : <div className="w-10 h-10 rounded-lg bg-black/5" />}
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-bold text-blue-600">{data['측정날짜'] || '-'}</span>
                                                                    <span className="text-[11px] text-black/30 font-medium">{data['측정시간'] || '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex flex-col gap-1.5 items-start">
                                                                    <span className="font-bold text-black/80 truncate max-w-[160px]" title={record.product.name}>{record.product.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold">
                                                                            {record.degree || '1차'}
                                                                        </span>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${record.stage === '시작' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                            {record.stage || '시작'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="text-[11px] text-black/60 max-w-[180px] line-clamp-2" title={record.note}>
                                                                    {record.note || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-center font-bold text-black/60">{data['최소(MIN)'] || '-'}</td>
                                                            <td className="p-3 text-center font-bold text-black/60">{data['최대(MAX)'] || '-'}</td>
                                                            <td className="p-3 text-center font-bold text-blue-600 bg-blue-50/30">{data['평균(avg)'] || '-'}</td>

                                                            {[...Array(maxMeasurements)].map((_, i) => {
                                                                const val = data[`측정_${i + 1}`];
                                                                return (
                                                                    <td key={i} className={`p-3 text-center border-l border-black/[0.02] ${val ? 'text-black/70 font-medium' : 'text-black/5'}`}>
                                                                        {val || '-'}
                                                                    </td>
                                                                );
                                                            })}

                                                            <td className="p-3 text-right pr-6">
                                                                <ChevronRight size={16} className="ml-auto text-black/10 group-hover:text-black/30" />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                /* Card View for Narrow Screens */
                                <div className="space-y-4">
                                    {filteredRecords.map(record => {
                                        let data: any = {};
                                        try {
                                            data = JSON.parse(record.extractedData || '{}');
                                        } catch (e) {
                                            console.error('Failed to parse record data:', e);
                                        }
                                        const measureDate = data['측정날짜'] || '정보 없음';
                                        const measureTime = data['측정시간'] || '-';

                                        // 요약 정보만 필터링 (최소 - 최대 - 평균 순으로 조정)
                                        const summaryData = [
                                            { key: '최소(MIN)', value: data['최소(MIN)'], label: 'MIN' },
                                            { key: '최대(MAX)', value: data['최대(MAX)'], label: 'MAX' },
                                            { key: '평균(avg)', value: data['평균(avg)'], label: 'AVG', isAvg: true }
                                        ].filter(item => item.value);

                                        return (
                                            <div
                                                key={record.id}
                                                className="bg-white border border-black/5 rounded-3xl p-5 hover:shadow-xl hover:border-black/10 transition-all cursor-pointer group flex items-start gap-5 active:scale-[0.99] relative overflow-hidden"
                                                onClick={() => setSelectedRecordId(record.id)}
                                            >
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className="text-black/20" />
                                                </div>

                                                {record.imageUrl && (
                                                    <div
                                                        className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-black/5 border border-black/5 cursor-pointer hover:ring-2 hover:ring-black/10 transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (record.imageUrl) setSelectedImage(record.imageUrl);
                                                        }}
                                                    >
                                                        <img src={record.imageUrl} alt="Record" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0 flex justify-between items-start gap-4">
                                                    {/* Left Column: Product & Summary */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-start gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-lg truncate leading-tight">{record.product.name}</span>
                                                            <span className="text-[10px] text-white bg-black/30 px-2 py-0.5 rounded-full shrink-0">
                                                                ID: {record.id.slice(-4).toUpperCase()}
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-1.5 flex-wrap">
                                                            {summaryData.map((item) => (
                                                                <div
                                                                    key={item.key}
                                                                    className={`px-3 py-0.5 rounded-xl border transition-all ${item.isAvg
                                                                        ? 'bg-blue-600 border-blue-700 shadow-sm'
                                                                        : 'bg-blue-50/50 border-blue-100'
                                                                        }`}
                                                                >
                                                                    <p className={`text-[9px] font-bold leading-none ${item.isAvg ? 'text-white/70' : 'text-blue-400'}`}>{item.label}</p>
                                                                    <p className={`text-xs font-bold leading-none ${item.isAvg ? 'text-white' : 'text-blue-900'}`}>{String(item.value)}</p>
                                                                </div>
                                                            ))}
                                                            {summaryData.length === 0 && (
                                                                <p className="text-[10px] text-black/20 italic">상세 정보 클릭</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right Column: Dates & Process Info */}
                                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                                        <p className="text-[9px] text-black/30 leading-tight">
                                                            {new Date(record.createdAt).toLocaleString('ko-KR', {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </p>
                                                        {(measureDate || measureTime) && (
                                                            <p className="text-[11px] font-bold text-blue-500 leading-tight">
                                                                {measureDate} {measureTime}
                                                            </p>
                                                        )}
                                                        {(record.degree || record.stage) && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-bold">
                                                                    {record.degree || '1차'}
                                                                </span>
                                                                <span className={`text-xs px-1.5 py-0.5 rounded-md ${record.stage === '시작' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                    {record.stage || '시작'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {record.note && (
                                                            <p className="text-[10px] text-black/40 mt-1 line-clamp-1 max-w-[120px] italic">
                                                                {record.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </motion.div>
    );

    return (
        <div ref={rootRefCallback} className="flex flex-col h-full bg-white text-black/80 font-sans relative">
            {/* Header Tabs - Only show on mobile */}
            {!isDesktop && (
                <div className="flex border-b border-black/5 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-white font-bold text-black border-b-2 border-black/80' : 'bg-black/[0.03] text-black/50 hover:bg-black/[0.05]'}`}
                    >
                        <Upload size={18} />
                        <span>기록 등록</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-white font-bold text-black border-b-2 border-black/80' : 'bg-black/[0.03] text-black/50 hover:bg-black/[0.05]'}`}
                    >
                        <History size={18} />
                        <span>이력 조회</span>
                    </button>
                </div>
            )}

            {/* Desktop Header Title */}
            {isDesktop && (
                <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg">
                            <Plus size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">박막도포관리 시스템</h1>
                            <p className="text-xs text-black/40 font-medium">실시간 기록 등록 및 통합 데이터 조회</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                {isDesktop ? (
                    <div className="flex h-full divide-x divide-black/5">
                        {/* Left: Registration */}
                        <div className="w-[600px] overflow-y-auto p-8 custom-scrollbar bg-black/[0.01]">
                            <div className="mb-8">
                                <h2 className="text-sm font-bold text-black/40 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    기록 등록
                                </h2>
                            </div>
                            {renderUpload()}
                        </div>
                        {/* Right: History */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="mb-8">
                                <h2 className="text-sm font-bold text-black/40 uppercase tracking-widest flex items-center gap-2">
                                    <History size={16} />
                                    이력 조회
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

            {/* Image Modal Popup */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.button
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage}
                                alt="Expanded Detail"
                                className="max-w-full max-h-[90%] rounded-2xl shadow-2xl border border-white/10 object-contain"
                            />
                            <div className="mt-4 text-center">
                                <p className="text-white/50 text-sm font-medium">영역 밖을 누르면 닫힙니다.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Record Detail Modal */}
            <AnimatePresence>
                {selectedRecordId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[998] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md overflow-y-auto"
                        onClick={resetForm}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95%]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-black/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">
                                            {isEditingRecord
                                                ? products.find(p => p.id === selectedProductId)?.name
                                                : records.find(r => r.id === selectedRecordId)?.product.name}
                                        </h2>
                                        <p className="text-xs text-black/30 font-medium">상세 측정 데이터 리포트</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditingRecord ? (
                                        <>
                                            {canEdit && (
                                                <button
                                                    onClick={() => {
                                                        const record = records.find(r => r.id === selectedRecordId);
                                                        if (record) {
                                                            setSelectedProductId(record.productId);
                                                            setProductSearchTerm(record.product.name);
                                                            setEditData(JSON.parse(record.extractedData || '{}'));
                                                            setImage(record.imageUrl || null);
                                                            setDegree((record.degree || '1').replace(/[^0-9]/g, ''));
                                                            setStage(record.stage || '시작');
                                                            setNote(record.note || '');
                                                            setIsEditingRecord(true);
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-black/5 hover:bg-black/10 rounded-xl flex items-center gap-2 font-bold transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                    <span>수정</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => selectedRecordId && handleDeleteRecord(selectedRecordId)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleUpdateRecord}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            <span>저장</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={resetForm}
                                        className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                                    >
                                        <X size={20} className="text-black/40" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {(() => {
                                    const record = records.find(r => r.id === selectedRecordId);
                                    if (!record) return null;
                                    let data: any = {};
                                    try {
                                        data = JSON.parse(record.extractedData || '{}');
                                    } catch (e) {
                                        console.error('Failed to parse record data:', e);
                                    }

                                    return (
                                        <>
                                            <div className="flex gap-4 mb-6">
                                                {/* Date/Time Info Card */}
                                                <div className="flex-1 p-5 bg-blue-50 rounded-[20px] flex flex-col justify-center gap-1">
                                                    <p className="text-[11px] font-bold text-blue-400 mb-1">측정 일시 정보</p>
                                                    {isEditingRecord ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editData['측정날짜'] || ''}
                                                                onChange={(e) => setEditData({ ...editData, '측정날짜': e.target.value })}
                                                                placeholder="날짜 (YYYY/MM/DD)"
                                                                className="w-full bg-white/50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-blue-900 outline-none focus:border-blue-400 focus:bg-white"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editData['측정시간'] || ''}
                                                                onChange={(e) => setEditData({ ...editData, '측정시간': e.target.value })}
                                                                placeholder="시간 (HH:MM)"
                                                                className="w-full bg-white/50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-semibold text-blue-500 outline-none focus:border-blue-400 focus:bg-white"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-xl font-bold text-blue-600 tracking-tight">{data['측정날짜'] || '미지정'}</p>
                                                            <p className="text-sm font-bold text-blue-400">{data['측정시간'] || '미지정 시간'}</p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Product Info Card */}
                                                <div className="flex-1 p-5 bg-black/[0.02] border border-black/[0.03] rounded-[20px] flex flex-col justify-center gap-1">
                                                    <p className="text-[11px] font-medium text-black/40 mb-1">품명 정보</p>
                                                    {isEditingRecord ? (
                                                        <div className="space-y-2">
                                                            <div className="relative group/modal-select">
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="품명 검색..."
                                                                        value={productSearchTerm}
                                                                        onChange={(e) => {
                                                                            setProductSearchTerm(e.target.value);
                                                                            if (selectedProductId) setSelectedProductId('');
                                                                        }}
                                                                        className="w-full bg-white border border-black/10 rounded-lg pl-2 pr-12 py-1.5 text-xs outline-none focus:border-black/30 font-bold"
                                                                    />
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                        {(productSearchTerm || selectedProductId) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setProductSearchTerm('');
                                                                                    setSelectedProductId('');
                                                                                }}
                                                                                className="p-1 hover:bg-black/5 rounded-full text-black/20 hover:text-black/40 transition-colors"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        )}
                                                                        {selectedProductId && <Check size={12} className="text-green-500" />}
                                                                    </div>
                                                                </div>

                                                                {/* Modal Dropdown */}
                                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/5 shadow-xl rounded-xl p-1 z-[70] max-h-40 overflow-y-auto hidden group-focus-within/modal-select:block">
                                                                    {products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                setSelectedProductId(p.id);
                                                                                setProductSearchTerm(p.name);
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-between ${selectedProductId === p.id ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'}`}
                                                                        >
                                                                            {p.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex bg-black/5 p-1 rounded-lg gap-1">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={degree.replace(/[^0-9]/g, '')}
                                                                    onChange={(e) => setDegree(e.target.value.replace(/[^0-9]/g, ''))}
                                                                    className="w-12 bg-white rounded px-1 py-0.5 text-center text-xs outline-none"
                                                                    placeholder="차수"
                                                                />
                                                                <div className="flex gap-1 flex-1">
                                                                    {['시작', '끝'].map(s => (
                                                                        <button
                                                                            key={s}
                                                                            onClick={() => setStage(s)}
                                                                            className={`flex-1 rounded py-0.5 text-xs ${stage === s ? 'bg-white shadow-sm font-bold' : 'text-black/40'}`}
                                                                        >
                                                                            {s}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-base font-bold text-black/70 truncate">{record.product.name}</p>
                                                            <p className="text-[10px] text-black/30 font-mono mt-0.5">ID: {record.id}</p>
                                                            <div className="flex gap-1 mt-2">
                                                                {(record.degree || record.stage) && (
                                                                    <>
                                                                        <span className="text-[10px] bg-black/5 text-black/60 px-2 py-0.5 rounded-md font-bold">
                                                                            {record.degree || '1차'}
                                                                        </span>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md ${record.stage === '시작' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                            {record.stage || '시작'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Note Detail Section */}
                                            <div className="p-5 bg-orange-50/30 border border-orange-100/50 rounded-[20px] space-y-2">
                                                <p className="text-[11px] font-bold text-orange-400">비고 (참고사항)</p>
                                                {isEditingRecord ? (
                                                    <textarea
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                        placeholder="특이사항 입력..."
                                                        className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 min-h-[60px] resize-none"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-black/70 leading-relaxed min-h-[20px]">
                                                        {record.note || '등록된 비고 내용이 없습니다.'}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-4 mb-6">
                                                <h3 className="text-sm font-bold flex items-center gap-2 text-black/80">
                                                    <div className="w-1 h-3.5 bg-black rounded-full" />
                                                    데이터 상세 내역
                                                </h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {(() => {
                                                        const items = Object.entries(isEditingRecord ? editData : data);
                                                        const stats = items.filter(([key]) => ['최소(MIN)', '최대(MAX)', '평균(avg)'].includes(key))
                                                            .sort((a, b) => {
                                                                const order = { '최소(MIN)': 1, '최대(MAX)': 2, '평균(avg)': 3 };
                                                                return (order[a[0] as keyof typeof order] || 0) - (order[b[0] as keyof typeof order] || 0);
                                                            });
                                                        const measures = items.filter(([key]) => !['측정날짜', '측정시간', '최소(MIN)', '최대(MAX)', '평균(avg)'].includes(key));

                                                        return [...measures, ...stats].map(([key, value]) => {
                                                            const isAvg = key === '평균(avg)';
                                                            const isStat = ['최소(MIN)', '최대(MAX)'].includes(key);

                                                            return (
                                                                <div
                                                                    key={key}
                                                                    className={`p-4 rounded-[20px] border flex flex-col justify-between h-20 relative overflow-hidden transition-all ${isAvg
                                                                        ? 'bg-blue-700 text-white border-blue-800 col-span-1 shadow-md shadow-blue-500/20'
                                                                        : isStat
                                                                            ? 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                                                            : 'bg-white border-black/[0.03] hover:border-black/10'
                                                                        }`}
                                                                >
                                                                    <p className={`text-[10px] font-medium mb-1 ${isAvg || isStat ? 'text-white/70' : 'text-black/30'}`}>{key}</p>
                                                                    {isEditingRecord ? (
                                                                        <input
                                                                            type="text"
                                                                            value={String(value)}
                                                                            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                                                                            className={`w-full bg-white/20 border border-white/30 rounded px-1.5 py-0.5 text-sm font-bold outline-none focus:bg-white/30 ${!isAvg && !isStat ? 'text-black bg-black/5 border-black/10 focus:bg-black/10' : 'text-white'} `}
                                                                        />
                                                                    ) : (
                                                                        <p className={`text-base font-bold tracking-tight ${isAvg || isStat ? 'text-white' : 'text-black'}`}>{String(value)}</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>

                                            {record.imageUrl && (
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-bold flex items-center gap-2 text-black/80">
                                                        <div className="w-1 h-3.5 bg-black/20 rounded-full" />
                                                        원본 측정 영수증 {isEditingRecord && "<교체 가능>"}
                                                    </h3>
                                                    <div
                                                        className={`rounded-[24px] overflow-hidden border border-black/5 bg-black/5 aspect-auto max-h-80 flex items-start justify-center relative group ${isEditingRecord ? 'cursor-pointer hover:bg-black/10' : ''}`}
                                                        onClick={() => isEditingRecord && fileInputRef.current?.click()}
                                                    >
                                                        <img src={image || record.imageUrl} alt="Raw Receipt" className="w-full object-contain" />
                                                        {isEditingRecord && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <p className="text-white font-bold flex items-center gap-2">
                                                                    <Upload size={20} />
                                                                    사진 교체하기
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {record.rawOcrText && (
                                                <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
                                                    <p className="text-[10px] font-bold text-black/30 uppercase mb-2">추출된 원본 텍스트 데이터</p>
                                                    <p className="text-xs text-black/50 italic leading-relaxed whitespace-pre-wrap">{record.rawOcrText}</p>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-black/[0.02] border-t border-black/5 text-center">
                                <p className="text-[10px] text-black/20 font-medium">KOS v7 Coating Management System • Security Verified</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
