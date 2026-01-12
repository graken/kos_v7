"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Filter, Camera, X, Check,
    ChevronRight, Trash2, Calendar, HardDrive,
    MapPin, User, FileText, AlertCircle, Loader2, Image as ImageIcon,
    Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { useOSStore } from '@/store/useOSStore';
import { processImage } from '@/lib/image-utils';

interface MaintenanceImage {
    id: string;
    url: string;
    thumbnailUrl?: string;
}

interface MaintenanceRecord {
    id: number;
    checkDate: string;
    equipmentName: string;
    part: string;
    detail: string;
    company?: string;
    note?: string;
    completionDate?: string;
    images: MaintenanceImage[];
}

export default function EquipmentMaintenance() {
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [quickCompleteRecord, setQuickCompleteRecord] = useState<MaintenanceRecord | null>(null);
    const [overlayImage, setOverlayImage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [incompleteOnly, setIncompleteOnly] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    // Fetch records
    const fetchRecords = useCallback(async () => {
        try {
            const url = new URL('/api/maintenance', window.location.origin);
            if (incompleteOnly) url.searchParams.append('incompleteOnly', 'true');
            if (searchQuery) url.searchParams.append('query', searchQuery);

            const res = await fetch(url);
            const data = await res.json();
            setRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch records:', err);
        } finally {
            setLoading(false);
        }
    }, [incompleteOnly, searchQuery]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // View resize listener
    const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
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

    const isMobile = containerWidth > 0 && containerWidth < 1024;

    const { currentUser } = useOSStore();
    const canCreate = currentUser?.role === 'admin' || currentUser?.permissions?.['equipment-maintenance']?.create;
    const canEdit = currentUser?.role === 'admin' || currentUser?.permissions?.['equipment-maintenance']?.edit;
    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.['equipment-maintenance']?.delete;
    const canComplete = currentUser?.role === 'admin' || currentUser?.permissions?.['equipment-maintenance']?.complete;

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!canDelete) {
            alert('삭제 권한이 없습니다.');
            return;
        }
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try {
            await fetch(`/api/maintenance?id=${id}`, { method: 'DELETE' });
            fetchRecords();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleQuickComplete = (record: MaintenanceRecord) => {
        setQuickCompleteRecord(record);
    };

    return (
        <div ref={containerRefCallback} className="flex flex-col h-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
            {/* Top Navigation / Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <HardDrive size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">설비점검이력</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-auto flex-wrap">
                    {/* Connection Status (Simulated) */}
                    <div className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-md flex items-center gap-1.5 ring-4 ring-emerald-50 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        서버 연결됨
                    </div>

                    {canCreate && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-blue-200"
                        >
                            <Plus size={18} />
                            등록
                        </button>
                    )}

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={incompleteOnly}
                                onChange={(e) => setIncompleteOnly(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span>미완료만 보기</span>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="검색 (설비명, 내용 등)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm font-medium w-64 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-[1600px] mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="text-slate-400 font-bold">데이터를 불러오는 중입니다...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-100 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600">검색 결과가 없습니다</h3>
                            <p className="text-slate-400 text-sm mt-1">다른 검색어를 시도하거나 필터를 변경해 보세요.</p>
                        </div>
                    ) : isMobile ? (
                        /* Mobile Card View */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {records.map((record) => (
                                    <motion.div
                                        key={record.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                        onClick={() => setSelectedRecord(record)}
                                        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative group cursor-pointer hover:border-blue-200 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black tracking-tighter">CODE: {record.id}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400">{format(new Date(record.checkDate), 'yyyy-MM-dd')}</span>
                                                {record.completionDate ? (
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black whitespace-nowrap">{format(new Date(record.completionDate), 'yyyy-MM-dd')} 완료</span>
                                                ) : canComplete ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleQuickComplete(record); }}
                                                        className="px-2 py-0.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded text-[10px] font-black transition-colors"
                                                    >
                                                        (미완료)
                                                    </button>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] font-black">
                                                        (미완료)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4 border-b border-blue-600 pb-2">
                                            <h3 className="text-xl font-black text-slate-900">{record.equipmentName}</h3>
                                            <span className="text-sm font-bold text-slate-600">{record.part}</span>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                <span className="text-xs text-slate-400 font-bold pt-0.5">업체</span>
                                                <span className="text-sm text-slate-700 font-medium">{record.company || '-'}</span>
                                            </div>
                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                <span className="text-xs text-slate-400 font-bold pt-0.5">내용</span>
                                                <span className="text-sm text-slate-800 font-bold leading-relaxed line-clamp-2">{record.detail}</span>
                                            </div>
                                            {record.note && (
                                                <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                    <span className="text-xs text-slate-400 font-bold pt-0.5">비고</span>
                                                    <span className="text-sm text-slate-500 font-medium italic leading-relaxed line-clamp-2">{record.note}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div className="flex gap-2">
                                                {record.images?.map((img) => (
                                                    <div key={img.id} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                                        <img src={img.thumbnailUrl || img.url} alt="Maintenance Thumbnail" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={(e) => handleDelete(e, record.id)}
                                                    className="w-10 h-10 bg-rose-50/50 hover:bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        /* Desktop Table View */
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-400 text-[11px] font-black uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10">
                                        <th className="px-5 py-4 w-16">코드</th>
                                        <th className="px-5 py-4 w-28">점검일</th>
                                        <th className="px-5 py-4 w-40">설비명</th>
                                        <th className="px-5 py-4 w-32">설비부위</th>
                                        <th className="px-5 py-4 min-w-[200px]">수리이력내용</th>
                                        <th className="px-5 py-4 w-40">부품/수리업체</th>
                                        <th className="px-5 py-4 w-32">비고</th>
                                        <th className="px-5 py-4 w-28 text-center">완료일</th>
                                        <th className="px-5 py-4 w-20 text-center">사진</th>
                                        {canDelete && <th className="px-5 py-4 w-16 text-center">삭제</th>}
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 font-medium whitespace-nowrap">
                                    <AnimatePresence mode="popLayout">
                                        {records.map((record) => (
                                            <motion.tr
                                                key={record.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, x: -30 }}
                                                onClick={() => setSelectedRecord(record)}
                                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-5 py-3.5 text-slate-400 font-bold">{record.id}</td>
                                                <td className="px-5 py-3.5">{format(new Date(record.checkDate), 'yyyy-MM-dd')}</td>
                                                <td className="px-5 py-3.5 font-bold text-slate-900">{record.equipmentName}</td>
                                                <td className="px-5 py-3.5 text-slate-500 italic">{record.part}</td>
                                                <td className="px-5 py-3.5 leading-relaxed text-slate-800 font-bold">
                                                    <div className="line-clamp-2 min-w-[200px] whitespace-normal">
                                                        {record.detail}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600">{record.company || '-'}</td>
                                                <td className="px-5 py-3.5 text-slate-400 text-xs italic">
                                                    <div className="line-clamp-1 whitespace-normal">
                                                        {record.note || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    {record.completionDate ? (
                                                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black shadow-sm ring-1 ring-emerald-100">
                                                            {format(new Date(record.completionDate), 'yyyy-MM-dd')}
                                                        </span>
                                                    ) : canComplete ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleQuickComplete(record); }}
                                                            className="px-2 py-1 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded text-[10px] font-black transition-colors"
                                                        >
                                                            (미완료)
                                                        </button>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[10px] font-black">
                                                            (미완료)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    {record.images?.[0] ? (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); setOverlayImage(record.images[0].url); }}
                                                            className="relative group/thumb cursor-zoom-in inline-block"
                                                        >
                                                            {/* Stack Effect Layers */}
                                                            {record.images.length > 1 && (
                                                                <>
                                                                    <div className="absolute -right-1 -bottom-1 w-10 h-10 rounded-lg bg-slate-200 -z-10 translate-x-0.5 translate-y-0.5 opacity-50" />
                                                                    <div className="absolute -right-0.5 -bottom-0.5 w-10 h-10 rounded-lg bg-slate-100 -z-10 translate-x-0.5 translate-y-0.5 opacity-80" />
                                                                </>
                                                            )}

                                                            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm border border-slate-100 ring-4 ring-white relative z-0">
                                                                <img src={record.images[0].thumbnailUrl || record.images[0].url} alt="Main Thumbnail" className="w-full h-full object-cover" />

                                                                {/* Multi-image Badge */}
                                                                {record.images.length > 1 && (
                                                                    <div className="absolute right-0 bottom-0 bg-slate-800 text-white text-[8px] font-black px-1 py-0.5 rounded-tl-md">
                                                                        +{record.images.length - 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-200 mx-auto">
                                                            <ImageIcon size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <button
                                                        onClick={(e) => handleDelete(e, record.id)}
                                                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedRecord && (
                    <DetailModal
                        record={selectedRecord}
                        canEdit={canEdit}
                        onClose={() => setSelectedRecord(null)}
                        onEdit={(record) => {
                            setEditingRecord(record);
                            setSelectedRecord(null);
                        }}
                        onZoom={(url) => setOverlayImage(url)}
                    />
                )}
            </AnimatePresence>

            {/* Registration/Edit Modal */}
            <AnimatePresence>
                {(isModalOpen || editingRecord) && (
                    <MaintenanceModal
                        editData={editingRecord}
                        isMobile={isMobile}
                        canComplete={canComplete}
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingRecord(null);
                        }}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            setEditingRecord(null);
                            fetchRecords();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Quick Complete Modal */}
            <AnimatePresence>
                {quickCompleteRecord && (
                    <QuickCompleteModal
                        record={quickCompleteRecord}
                        onClose={() => setQuickCompleteRecord(null)}
                        onSuccess={() => {
                            setQuickCompleteRecord(null);
                            fetchRecords();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Image Overlay */}
            <AnimatePresence>
                {overlayImage && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOverlayImage(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-full max-h-full overflow-hidden rounded-2xl shadow-2xl"
                        >
                            <img src={overlayImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain" />
                            <button
                                onClick={() => setOverlayImage(null)}
                                className="absolute top-4 right-4 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="px-6 py-2 bg-white border-t border-slate-100 text-[10px] font-bold text-slate-300 uppercase tracking-widest flex justify-between">
                <span>KOS v7 System • Factory Management Node</span>
                <span>{records.length} Records Found</span>
            </div>
        </div >
    );
}

// Separate Modal Component for clarity
function MaintenanceModal({ onClose, onSuccess, editData, isMobile, canComplete }: { onClose: () => void, onSuccess: () => void, editData?: MaintenanceRecord | null, isMobile: boolean, canComplete: boolean }) {
    const [formData, setFormData] = useState({
        checkDate: editData ? format(new Date(editData.checkDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        equipmentName: editData?.equipmentName || '',
        part: editData?.part || '',
        detail: editData?.detail || '',
        company: editData?.company || '',
        note: editData?.note || '',
        completionDate: editData?.completionDate ? format(new Date(editData.completionDate), 'yyyy-MM-dd') : ''
    });
    const [imageUrls, setImageUrls] = useState<{ original: string, thumbnail: string }[]>(
        editData?.images?.map(img => ({ original: img.url, thumbnail: img.thumbnailUrl || img.url })) || []
    );
    const [isProcessing, setIsProcessing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [partSearch, setPartSearch] = useState('');
    const [activeField, setActiveField] = useState<'equipmentName' | 'part' | 'company'>('part');
    const [showMobileSelector, setShowMobileSelector] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [dbMasterData, setDbMasterData] = useState<{
        equipmentName: string[];
        part: string[];
        company: string[];
    }>({
        equipmentName: [],
        part: [],
        company: []
    });

    useEffect(() => {
        const fetchMaster = async () => {
            try {
                const res = await fetch('/api/maintenance?type=master');
                const data = await res.json();
                if (data && !data.error) {
                    setDbMasterData({
                        equipmentName: data.equipmentName || [],
                        part: data.part || [],
                        company: data.company || [],
                    });
                }
            } catch (err) {
                console.error('Fetch master error:', err);
            }
        };
        fetchMaster();
    }, []);

    const currentList = dbMasterData[activeField] || [];
    const filteredList = currentList.filter(p => p.includes(partSearch));

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setIsProcessing(true);
            try {
                const processed = await Promise.all(
                    Array.from(files).map(file => processImage(file))
                );
                setImageUrls([...imageUrls, ...processed]);
            } catch (err) {
                console.error('Image processing error:', err);
                alert('이미지 처리 중 오류가 발생했습니다.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const getTitle = () => {
        if (activeField === 'equipmentName') return '설비명 선택';
        if (activeField === 'part') return '설비부위 선택';
        if (activeField === 'company') return '업체 선택';
        return '';
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.equipmentName || !formData.part || !formData.detail) {
            alert('필수 항목을 입력해 주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = { ...formData, imageUrls };
            if (editData) (payload as any).id = editData.id;

            const res = await fetch('/api/maintenance', {
                method: editData ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || errorData.error || 'Failed to register');
            }

            onSuccess();
        } catch (err) {
            console.error('Submit error:', err);
            alert(`등록 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-5xl h-[100dvh] md:h-[90vh] rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:m-4"
            >
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {editData ? '설비점검일지 수정' : '설비점검일지 등록'}
                    </h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Main Form (Left) */}
                    <div className="flex-1 overflow-y-auto p-8 border-r border-slate-50 custom-scrollbar">
                        <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">점검일</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.checkDate}
                                        onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">설비명</label>
                                <input
                                    type="text"
                                    placeholder="클릭하여 선택하세요"
                                    value={formData.equipmentName}
                                    readOnly={isMobile}
                                    onFocus={() => {
                                        setActiveField('equipmentName');
                                        setPartSearch('');
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onClick={() => {
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">설비부위</label>
                                <input
                                    type="text"
                                    placeholder="클릭하여 선택하세요"
                                    value={formData.part}
                                    readOnly={isMobile}
                                    onFocus={() => {
                                        setActiveField('part');
                                        setPartSearch('');
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onClick={() => {
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">수리이력내용</label>
                                <textarea
                                    placeholder="상세 내용 입력"
                                    rows={4}
                                    value={formData.detail}
                                    onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">부품/수리업체</label>
                                <input
                                    type="text"
                                    placeholder="클릭하여 선택하세요"
                                    value={formData.company}
                                    readOnly={isMobile}
                                    onFocus={() => {
                                        setActiveField('company');
                                        setPartSearch('');
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onClick={() => {
                                        if (isMobile) setShowMobileSelector(true);
                                    }}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">사진 첨부</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-100 bg-slate-50/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm group-hover:text-blue-500 group-hover:shadow-md transition-all">
                                        <Camera size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-slate-500">{isProcessing ? '이미지 최적화 중...' : '클릭하여 업로드하거나'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{isProcessing ? '잠시만 기다려주세요' : '이미지를 여기로 드래그하세요 (여러 장 가능)'}</p>
                                    </div>
                                </div>
                                {imageUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {imageUrls.map((img, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                <img src={img.thumbnail} alt="upload" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setImageUrls(imageUrls.filter((_, idx) => idx !== i)); }}
                                                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">비고</label>
                                <textarea
                                    placeholder=""
                                    rows={3}
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                />
                            </div>

                            <div className={`space-y-2 ${!canComplete ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">완료일</label>
                                <div className="relative group/date">
                                    <input
                                        type="date"
                                        value={formData.completionDate}
                                        readOnly={!canComplete}
                                        onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover/date:opacity-0 transition-opacity" size={18} />
                                    {canComplete && formData.completionDate && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, completionDate: '' })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-rose-500 rounded-lg shadow-sm border border-slate-100 items-center justify-center hidden group-hover/date:flex hover:bg-rose-50 transition-all font-black text-[10px]"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Footer (Inline) */}
                            {isMobile && (
                                <div className="flex flex-col gap-3 pt-8 pb-12">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={24} />}
                                        {editData ? '수정하기' : '등록하기'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-5 bg-slate-100 text-slate-500 rounded-[24px] font-black text-lg"
                                    >
                                        취소하기
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Side Panel (Right) - Desktop Only */}
                    {!isMobile && (
                        <div className="w-full lg:w-96 bg-[#f8fafc] border-l border-slate-100 flex flex-col p-6 overflow-hidden">
                            <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-wider">{getTitle()}</h3>
                            <div className="relative mb-6">
                                <input
                                    type="text"
                                    placeholder="목록 검색..."
                                    value={partSearch}
                                    onChange={(e) => setPartSearch(e.target.value)}
                                    className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-slate-100 shadow-sm p-2 space-y-1">
                                {filteredList.length > 0 ? filteredList.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => setFormData({ ...formData, [activeField]: item })}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-between group ${formData[activeField] === item ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {item}
                                        <ChevronRight size={14} className={formData[activeField] === item ? 'text-white' : 'text-slate-200 group-hover:text-slate-400 transition-colors'} />
                                    </button>
                                )) : (
                                    <div className="py-20 text-center">
                                        <p className="text-xs font-bold text-slate-400 italic">데이터가 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    const newValue = prompt(`${getTitle()}를 직접 입력하세요:`);
                                    if (newValue) {
                                        setFormData({ ...formData, [activeField]: newValue });
                                        // Add to local list immediately
                                        setDbMasterData(prev => ({
                                            ...prev,
                                            [activeField]: Array.from(new Set([...prev[activeField], newValue]))
                                        }));
                                    }
                                }}
                                className="mt-6 w-full py-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-black text-sm hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all hover:border-blue-400"
                            >
                                <Plus size={20} />
                                직접 입력 (신규)
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Footer - Desktop Only */}
                {!isMobile && (
                    <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-[20px] font-black text-base transition-all"
                        >
                            취소하기
                        </button>
                        <button
                            type="submit"
                            form="maintenance-form"
                            disabled={submitting}
                            className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black text-base transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            {editData ? '수정하기' : '등록하기'}
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Mobile Selection sub-modal */}
            <AnimatePresence>
                {showMobileSelector && (
                    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900">{getTitle()}</h3>
                            <button onClick={() => setShowMobileSelector(false)} className="w-10 h-10 flex items-center justify-center text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="검색..."
                                    value={partSearch}
                                    onChange={(e) => setPartSearch(e.target.value)}
                                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 p-1">
                                {filteredList.length > 0 ? filteredList.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => {
                                            setFormData({ ...formData, [activeField]: item });
                                            setShowMobileSelector(false);
                                        }}
                                        className={`w-full text-left px-5 py-4 rounded-2xl font-bold transition-all flex items-center justify-between ${formData[activeField] === item ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-600 active:bg-slate-100'}`}
                                    >
                                        {item}
                                        <ChevronRight size={16} className={formData[activeField] === item ? 'text-white' : 'text-slate-300'} />
                                    </button>
                                )) : (
                                    <div className="py-20 text-center">
                                        <p className="text-sm font-bold text-slate-400">데이터가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    const newValue = prompt(`${getTitle()}를 직접 입력하세요:`);
                                    if (newValue) {
                                        setFormData({ ...formData, [activeField]: newValue });
                                        setDbMasterData(prev => ({
                                            ...prev,
                                            [activeField]: Array.from(new Set([...prev[activeField], newValue]))
                                        }));
                                        setShowMobileSelector(false);
                                    }
                                }}
                                className="w-full py-5 border-2 border-dashed border-blue-200 rounded-[20px] text-blue-600 font-black flex items-center justify-center gap-2 active:bg-blue-50"
                            >
                                <Plus size={24} />
                                직접 입력 (신규)
                            </button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailModal({ record, canEdit, onClose, onEdit, onZoom }: { record: MaintenanceRecord, canEdit: boolean, onClose: () => void, onEdit: (r: MaintenanceRecord) => void, onZoom: (url: string) => void }) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">상세 정보</h2>
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                onClick={() => onEdit(record)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Edit size={16} />
                                수정
                            </button>
                        )}
                        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto max-h-[75vh] custom-scrollbar">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Image Gallery */}
                        <div className="flex-1 space-y-4">
                            <div
                                onClick={() => record.images?.[activeImageIndex] && onZoom(record.images[activeImageIndex].url)}
                                className="aspect-[4/3] bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shadow-inner relative group cursor-zoom-in"
                            >
                                {record.images && record.images.length > 0 ? (
                                    <img
                                        src={record.images[activeImageIndex].url}
                                        alt="Current"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                        <ImageIcon size={48} />
                                        <p className="text-sm font-bold">이미지가 없습니다</p>
                                    </div>
                                )}
                            </div>

                            {record.images && record.images.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {record.images.map((img, i) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setActiveImageIndex(i)}
                                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-blue-500 ring-2 ring-blue-100' : 'border-white hover:border-slate-200 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img.thumbnailUrl || img.url} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Info */}
                        <div className="flex-[1.2] space-y-8">
                            <div>
                                <div className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black mb-2">
                                    {record.id}
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                                    {record.equipmentName} - {record.part}
                                </h1>
                                <p className="text-slate-400 font-bold mt-1">
                                    {format(new Date(record.checkDate), 'yyyy-MM-dd')}
                                </p>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">수리 내역</label>
                                    <p className="text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        {record.detail}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">수리 업체</label>
                                        <p className="text-base font-black text-slate-700">{record.company || '자체수리'}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">완료 여부</label>
                                        {record.completionDate ? (
                                            <div className="flex items-center gap-2 text-emerald-600 font-black">
                                                <Check size={18} />
                                                <span className="text-base">{format(new Date(record.completionDate), 'yyyy-MM-dd')} 완료</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-rose-500 font-black">
                                                <AlertCircle size={18} />
                                                <span className="text-base">미완료 (조치 필요)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {record.note && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">비고</label>
                                        <p className="text-sm font-bold text-slate-500 leading-relaxed italic whitespace-pre-wrap">
                                            {record.note}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function QuickCompleteModal({ record, onClose, onSuccess }: { record: MaintenanceRecord, onClose: () => void, onSuccess: () => void }) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/maintenance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: record.id, completionDate: date })
            });
            if (res.ok) onSuccess();
            else alert('저장에 실패했습니다.');
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">완료 처리</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">완료일자를 선택해 주세요</p>
                </div>

                <div className="space-y-6">
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">완료 일자</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer text-lg"
                        />
                        <Calendar className="absolute right-6 top-[44px] text-slate-300 pointer-events-none" size={20} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-16 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-black text-base transition-all"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className="flex-[2] h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            완료 처리
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
