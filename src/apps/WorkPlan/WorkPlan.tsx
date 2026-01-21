'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    Clock,
    Settings,
    Trash2,
    Edit2,
    Save,
    X,
    ArrowRightLeft,
    Search,
    GripVertical,
    Check,
    LayoutGrid,
    List,
    Calendar
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCorners,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    useDroppable,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PlanCardUI = React.memo(({ plan, listeners, isOverlay, fontScale = 1 }: { plan: WorkPlanData, listeners?: any, isOverlay?: boolean, fontScale?: number }) => {
    const isCompact = plan.duration < 120;
    const isVerySmall = plan.duration < 60;

    return (
        <div className={`group flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 ${isVerySmall ? 'p-1.5' : 'p-2.5'} hover:shadow-md hover:border-blue-300 transition-all ${isOverlay ? 'shadow-2xl ring-2 ring-blue-500 scale-105 rotate-2' : ''} overflow-hidden`}>
            {/* Header: Customer, Duration & Grip */}
            <div className={`flex items-center justify-between ${isVerySmall ? 'mb-0' : 'mb-0.5'}`}>
                <span
                    style={{ fontSize: `${(isVerySmall ? 7 : 9) * fontScale}px` }}
                    className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider truncate max-w-[55%]"
                >
                    {plan.customer || '미지정'}
                </span>
                <div className="flex items-center space-x-1 shrink-0">
                    <div
                        style={{ fontSize: `${8 * fontScale}px` }}
                        className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded font-bold text-slate-400"
                    >
                        <Clock size={8 * fontScale} className="mr-0.5" />
                        {plan.duration}분
                    </div>
                    {!isOverlay && (
                        <div {...listeners} className="p-0.5 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-blue-500 transition-colors">
                            <GripVertical size={isVerySmall ? 9 : 12} />
                        </div>
                    )}
                </div>
            </div>

            {/* Product Name: Essential */}
            <div
                style={{ fontSize: `${(isVerySmall ? 9 : 11) * fontScale}px` }}
                className={`font-black text-slate-900 line-clamp-1 ${isVerySmall ? 'mb-0' : 'mb-0.5'}`}
            >
                {plan.outputProduct || '생산제품 없음'}
            </div>

            {/* Dimensions: Essential */}
            {(plan.outputWidth || plan.outputLength) && (
                <div
                    style={{ fontSize: `${(isVerySmall ? 7 : 9) * fontScale}px` }}
                    className="font-black text-blue-600 bg-blue-50/50 rounded-md self-start px-1.5 py-0.5"
                >
                    {Number(plan.outputWidth?.toString().replace(/,/g, '') || 0).toLocaleString()} * {Number(plan.outputLength?.toString().replace(/,/g, '') || 0).toLocaleString()}
                </div>
            )}

            {/* Path: Only for large cards */}
            {!isCompact && (
                <div
                    style={{ fontSize: `${9 * fontScale}px` }}
                    className="text-slate-500 line-clamp-1 leading-relaxed font-medium mb-0.5"
                >
                    {plan.inputProduct} → {plan.outputProduct}
                </div>
            )}

            {/* Important Notice: Essential */}
            {plan.importantNotice && (
                <div className={`${isVerySmall ? 'mt-0 px-1 py-0' : 'mt-0.5 px-2 py-0.5'} bg-red-50 rounded border border-red-100`}>
                    <div
                        style={{ fontSize: `${(isVerySmall ? 7 : 9) * fontScale}px` }}
                        className="font-black text-red-600 line-clamp-1 leading-tight"
                    >
                        <span className={isVerySmall ? "mr-0.5" : "mr-1"}>📢</span>{plan.importantNotice}
                    </div>
                </div>
            )}
        </div>
    );
});

const SortablePlanCard = React.memo(({ plan, onClick, slotHeight }: { plan: WorkPlanData, onClick: () => void, slotHeight: number }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: plan.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        height: `${Math.max(75, plan.duration * (slotHeight / 60))}px`,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`cursor-pointer overflow-hidden relative`}
            onClick={onClick}
        >
            <PlanCardUI plan={plan} listeners={listeners} fontScale={Math.max(1, slotHeight / 72)} />
        </div>
    );
});

interface WorkPlanData {
    id: string;
    planDate: string;
    duration: number;
    order: number;
    customer: string;
    inputProduct: string;
    outputProduct: string;
    outputSize: string;
    outputWidth: string;
    outputLength: string;
    machineName: string;
    processType: string;
    adhesive: string;
    mixingRatio: string;
    mesh: string;
    speed: string;
    note: string;
    importantNotice: string;
}

const INITIAL_FORM: Partial<WorkPlanData> = {
    planDate: '',
    duration: '' as any,
    customer: '',
    inputProduct: '',
    outputProduct: '',
    outputSize: '',
    outputWidth: '',
    outputLength: '',
    machineName: '',
    processType: '',
    adhesive: '',
    mixingRatio: '{}',
    mesh: '',
    speed: '',
    note: '',
    importantNotice: ''
};

const WorkPlan = () => {
    const [plans, setPlans] = useState<WorkPlanData[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<WorkPlanData | null>(null);
    const [formData, setFormData] = useState<Partial<WorkPlanData>>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<string>('합지5호기');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('week');
    const [searchQuery, setSearchQuery] = useState('');
    const [slotHeight, setSlotHeight] = useState(72);
    const containerRef = useRef<HTMLDivElement>(null);
    const plansRef = useRef<WorkPlanData[]>([]);
    const previousPlansRef = useRef<WorkPlanData[]>([]);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Calculate slotHeight based on container height to fit 09:00 - 18:00 (9 hours)
    useEffect(() => {
        if (!containerRef.current || viewMode !== 'calendar') return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const height = entry.contentRect.height;
                // Subtract the day header height (32px) and some padding
                const usableHeight = height - 40;
                const calculatedSlot = Math.max(60, usableHeight / 9.5); // Using 9.5 to leave a little breathing room at the bottom
                setSlotHeight(calculatedSlot);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [viewMode]);

    useEffect(() => {
        plansRef.current = plans;
    }, [plans]);

    // Extract unique machines from existing plans + defaults
    const machines = React.useMemo(() => {
        const uniqueMachines = Array.from(new Set(plans.map(p => p.machineName).filter(Boolean)));
        // Ensure standard machines are present for quick selection
        if (!uniqueMachines.includes('합지5호기')) uniqueMachines.unshift('합지5호기');
        if (!uniqueMachines.includes('합지3호기') && !uniqueMachines.includes('합지3호기')) {
            if (uniqueMachines.indexOf('합지5호기') === 0) uniqueMachines.splice(1, 0, '합지3호기');
            else uniqueMachines.push('합지3호기');
        }
        return uniqueMachines;
    }, [plans]);

    // Group plans by date AND filter by selected machine (for calendar view)
    const plansByDate = React.useMemo(() => {
        const grouped: Record<string, WorkPlanData[]> = {};
        if (Array.isArray(plans)) {
            plans
                .filter(p => !selectedMachine || p.machineName === selectedMachine)
                .forEach(p => {
                    const dateKey = format(new Date(p.planDate), 'yyyy-MM-dd');
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(p);
                });
        }
        return grouped;
    }, [plans, selectedMachine]);

    // Filtered plans for List View and Search
    const filteredPlans = React.useMemo(() => {
        let result = plans;
        if (selectedMachine) {
            result = result.filter(p => p.machineName === selectedMachine);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.customer?.toLowerCase().includes(q) ||
                p.inputProduct?.toLowerCase().includes(q) ||
                p.outputProduct?.toLowerCase().includes(q) ||
                p.note?.toLowerCase().includes(q) ||
                p.importantNotice?.toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => {
            const dateDiff = new Date(a.planDate).getTime() - new Date(b.planDate).getTime();
            if (dateDiff !== 0) return dateDiff;
            return a.order - b.order;
        });
    }, [plans, selectedMachine, searchQuery]);

    // Fetch plans for the current week
    const fetchPlans = React.useCallback(async () => {
        setLoading(true);
        try {
            let url = '/api/work-plans';
            const params = new URLSearchParams();

            if (timeRange !== 'all') {
                let start, end;
                if (timeRange === 'week') {
                    start = startOfWeek(currentDate, { weekStartsOn: 1 });
                    end = endOfWeek(currentDate, { weekStartsOn: 1 });
                } else if (timeRange === 'month') {
                    start = startOfMonth(currentDate);
                    end = endOfMonth(currentDate);
                } else if (timeRange === 'year') {
                    start = startOfYear(currentDate);
                    end = endOfYear(currentDate);
                }

                if (start && end) {
                    params.append('start', format(start, 'yyyy-MM-dd'));
                    params.append('end', format(end, 'yyyy-MM-dd'));
                }
            }

            const res = await fetch(`${url}${params.toString() ? '?' + params.toString() : ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const sorted = data.sort((a, b) => {
                    const dateDiff = new Date(a.planDate).getTime() - new Date(b.planDate).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return a.order - b.order;
                });
                setPlans(sorted);
            } else {
                setPlans([]);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate, timeRange]);

    useEffect(() => {
        fetchPlans();
    }, [currentDate, timeRange]);

    const handleHistoryLookup = async (inputProduct: string, outputProduct: string) => {
        if (!inputProduct && !outputProduct) return;
        try {
            const machineParam = formData.machineName ? `&machineName=${encodeURIComponent(formData.machineName)}` : '';
            const res = await fetch(`/api/work-plans/latest-history?inputProduct=${encodeURIComponent(inputProduct)}&outputProduct=${encodeURIComponent(outputProduct)}${machineParam}`);
            const data = await res.json();
            if (data && data.id) {
                // Auto-fill form from history
                setFormData(prev => ({
                    ...prev,
                    outputWidth: data.outputWidth || prev.outputWidth,
                    outputLength: data.outputLength || prev.outputLength,
                    machineName: data.machineName || prev.machineName,
                    processType: data.processType || prev.processType,
                    adhesive: data.adhesive || prev.adhesive,
                    mixingRatio: data.mixingRatio || prev.mixingRatio,
                    mesh: data.mesh || prev.mesh,
                    speed: data.speed || prev.speed,
                    note: data.note || prev.note,
                    importantNotice: data.importantNotice || prev.importantNotice
                }));
            }
        } catch (error) {
            console.error('History fetch error:', error);
        }
    };

    const handleSave = async () => {
        if (!formData.planDate) {
            alert('날짜를 선택해주세요.');
            return;
        }
        if (!formData.duration) {
            alert('작업 시간을 입력해주세요.');
            return;
        }
        if (!formData.outputProduct) {
            alert('생산제품을 입력해주세요.');
            return;
        }
        if (!formData.outputWidth || !formData.outputLength) {
            alert('생산 규격(폭/길이)을 입력해주세요.');
            return;
        }
        if (!formData.machineName) {
            alert('설비명을 입력해주세요.');
            return;
        }
        setLoading(true);
        try {
            const method = formData.id ? 'PATCH' : 'POST';
            const url = formData.id ? `/api/work-plans/${formData.id}` : '/api/work-plans';

            console.log('Saving work plan:', { method, url, data: formData });

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                console.log('Save successful');
                setIsModalOpen(false);
                setFormData(INITIAL_FORM);
                fetchPlans();
            } else {
                const errorData = await res.json();
                console.error('Save failed:', errorData);
                alert(`저장 실패: ${errorData.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/work-plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setIsDetailOpen(false);
                fetchPlans();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = React.useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const findContainer = (id: string) => {
        if (id.startsWith('day-')) return id.replace('day-', '');
        const plan = plansRef.current.find(p => p.id === id);
        return plan ? plan.planDate : null;
    };

    const handleDragOver = React.useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer !== overContainer) {
            return;
        }

        setPlans((prev) => {
            const activeIdx = prev.findIndex(p => p.id === activeId);
            let overIdx = prev.findIndex(p => p.id === overId);

            // 만약 카드 위가 아니라 배경(day-) 위에 있다면 해당 날짜의 맨 마지막 인덱스로 지정
            if (overIdx === -1 && overId.startsWith('day-')) {
                const dayIndices = prev.reduce((acc: number[], p, i) => p.planDate === overContainer ? [...acc, i] : acc, []);
                if (dayIndices.length > 0) {
                    overIdx = dayIndices[dayIndices.length - 1];
                }
            }

            if (activeIdx === -1 || overIdx === -1) return prev;
            if (activeIdx === overIdx) return prev;

            return arrayMove(prev, activeIdx, overIdx);
        });
    }, []);

    const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) {
            fetchPlans();
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        // 다른 날짜로 드롭된 경우 이동 방지 (안정성을 위해 수정 모달에서 날짜 변경 유도)
        if (activeContainer !== overContainer) {
            fetchPlans(); // 원래 위치로 복구
            return;
        }

        // 1. Prepare final state with corrected 'order' using current ref
        const currentPlans = plansRef.current;
        if (!currentPlans || currentPlans.length === 0) {
            console.warn('No plans to sync');
            return;
        }

        previousPlansRef.current = currentPlans; // Save for rollback

        // Group by date for efficient order calculation
        const grouped: Record<string, WorkPlanData[]> = {};
        currentPlans.forEach(p => {
            if (!grouped[p.planDate]) grouped[p.planDate] = [];
            grouped[p.planDate].push(p);
        });

        // Re-assign order based on current nested array position
        const finalState = currentPlans.map(p => {
            const dayArray = grouped[p.planDate];
            const newOrder = dayArray.indexOf(p);
            return p.order === newOrder ? p : { ...p, order: newOrder };
        });

        // 2. Update state immediately
        setPlans(finalState);

        // 3. Sync to DB
        setIsSyncing(true);
        try {
            const updates = finalState.map(p =>
                fetch(`/api/work-plans/${p.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planDate: p.planDate, order: p.order })
                })
            );
            const results = await Promise.all(updates);
            if (results.some(r => !r.ok)) throw new Error('Some updates failed');
            console.log('Drag and drop sync successful');
        } catch (error) {
            console.error('Drag sync failed', error);
            alert('순서 저장에 실패했습니다. 이전 상태로 되돌립니다.');
            setPlans(previousPlansRef.current);
        } finally {
            setIsSyncing(false);
        }
    }, [fetchPlans]);

    const handlePlanClick = React.useCallback((plan: WorkPlanData) => {
        setSelectedPlan(plan);
        setIsDetailOpen(true);
    }, []);

    const allWeekDays = React.useMemo(() =>
        Array.from({ length: 7 }, (_, i) =>
            addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i)
        ), [currentDate]);

    // Keep weekDays stable during drag to prevent layout shifts and infinite loops
    const lastVisibleWeekDays = useRef<Date[]>([]);
    const weekDays = React.useMemo(() => {
        const current = allWeekDays.filter(day => {
            const d = day.getDay();
            const isWeekend = d === 0 || d === 6;
            if (isWeekend) {
                return plans.some(p => isSameDay(new Date(p.planDate), day));
            }
            return true;
        });

        // 드래그 중에는 레이아웃 고정
        if (activeId && lastVisibleWeekDays.current.length > 0) {
            return lastVisibleWeekDays.current;
        }

        // 내용 비교를 통한 참조 안정성 확보
        const isSame = lastVisibleWeekDays.current.length === current.length &&
            lastVisibleWeekDays.current.every((d, i) => isSameDay(d, current[i]));

        if (!isSame) {
            lastVisibleWeekDays.current = current;
        }

        return lastVisibleWeekDays.current;
    }, [allWeekDays, plans, activeId]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none font-sans text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between py-2 px-6 bg-white border-b border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center space-x-4">
                    <h1 className="text-lg font-bold text-slate-900">작업계획서</h1>
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1 hover:bg-white rounded-md transition-all text-slate-500 hover:text-blue-600">
                            <ChevronLeft size={16} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                                className="px-3 py-1 hover:bg-white rounded-md transition-all font-black min-w-[120px] text-center flex items-center justify-center space-x-2 text-slate-700 hover:text-blue-600"
                            >
                                <Calendar size={14} className="text-blue-500" />
                                <span className="text-xs">{format(currentDate, 'yyyy년 MM월', { locale: ko })}</span>
                            </button>
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="absolute opacity-0 pointer-events-none w-0 h-0"
                                value={format(currentDate, 'yyyy-MM-dd')}
                                onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))}
                            />
                        </div>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1 hover:bg-white rounded-md transition-all text-slate-500 hover:text-blue-600">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="flex items-center space-x-6">
                        {/* Time Range Selector (Only for List View) */}
                        {viewMode === 'list' && (
                            <div className="flex items-center bg-blue-50/50 rounded-lg p-1 border border-blue-100">
                                {[
                                    { id: 'week', label: '해당 주' },
                                    { id: 'month', label: '해당 월' },
                                    { id: 'year', label: '1년' },
                                    { id: 'all', label: '전체' }
                                ].map((range) => (
                                    <button
                                        key={range.id}
                                        onClick={() => setTimeRange(range.id as any)}
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-black transition-all ${timeRange === range.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-blue-400 hover:bg-white hover:text-blue-600'
                                            }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => {
                                    setViewMode('calendar');
                                    setTimeRange('week'); // Reset range for calendar
                                }}
                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all text-[11px] font-bold ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <LayoutGrid size={13} />
                                <span>캘린더형</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all text-[11px] font-bold ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <List size={13} />
                                <span>목록형</span>
                            </button>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="업체, 제품, 비고 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-100 border-none rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold w-64 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {isSyncing && (
                            <div className="flex items-center space-x-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 animate-pulse">
                                <Clock size={14} className="animate-spin" />
                                <span className="text-xs font-bold">저장 중...</span>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setFormData(INITIAL_FORM);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-100 text-xs"
                        >
                            <Plus size={16} />
                            <span>작업 추가</span>
                        </button>
                    </div>
                </div>

                {/* Machine Tabs */}
                <div className="flex items-center space-x-1 px-4 py-1.5 bg-white border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                    {machines.map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedMachine(m)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black transition-all whitespace-nowrap shadow-sm border ${selectedMachine === m
                                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-100'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                                }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scheduler Body */}
            <div ref={containerRef} className="flex-1 overflow-auto p-4 flex">
                {viewMode === 'calendar' ? (
                    <div className="flex flex-1 min-w-full h-fit min-h-full">
                        {/* Time Scale Sidebar */}
                        <div className="w-16 flex flex-col pt-[32px] border-r border-slate-200 bg-white/50 sticky left-0 z-10 shrink-0">
                            {Array.from({ length: 15 }, (_, i) => 9 + i).map(hour => (
                                <div
                                    key={hour}
                                    style={{ height: `${slotHeight}px`, fontSize: `${9 * Math.max(1, slotHeight / 72)}px` }}
                                    className="font-bold text-slate-400 text-center border-b border-slate-100/50 flex flex-col justify-start pt-1"
                                >
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-1 h-fit min-h-full">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                            >
                                {weekDays.map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const dayPlans = plansByDate[dateKey] || [];

                                    return (
                                        <div key={dateKey} className="flex flex-col flex-1 min-w-[180px] border-r border-slate-200 last:border-r-0">
                                            <div className={`px-3 py-1 sticky top-0 bg-[#f8fafc] z-10 border-b h-[32px] flex items-center justify-between ${isSameDay(day, new Date()) ? 'border-b-blue-500' : 'border-b-slate-200'}`}>
                                                <div
                                                    style={{ fontSize: `${11 * Math.max(1, slotHeight / 72)}px` }}
                                                    className={`font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-500'}`}
                                                >
                                                    {format(day, 'MM/dd (E)', { locale: ko })}
                                                </div>
                                                {isSameDay(day, new Date()) && (
                                                    <div
                                                        style={{ fontSize: `${9 * Math.max(1, slotHeight / 72)}px` }}
                                                        className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black"
                                                    >TODAY</div>
                                                )}
                                            </div>

                                            <DayDroppableContainer id={`day-${format(day, 'yyyy-MM-dd')}`} slotHeight={slotHeight}>
                                                {/* Grid Lines */}
                                                <div className="absolute inset-0 pointer-events-none">
                                                    {Array.from({ length: 15 }).map((_, i) => (
                                                        <div key={i} style={{ height: `${slotHeight}px` }} className="border-b border-slate-100/50 w-full" />
                                                    ))}
                                                </div>

                                                <div className="relative z-0 p-2 space-y-1">
                                                    <SortableContext
                                                        id={`sortable-${dateKey}`}
                                                        items={dayPlans.map(p => p.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {dayPlans.map(plan => (
                                                            <SortablePlanCard
                                                                key={plan.id}
                                                                plan={plan}
                                                                slotHeight={slotHeight}
                                                                onClick={() => handlePlanClick(plan)}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                </div>
                                            </DayDroppableContainer>
                                        </div>
                                    );
                                })}
                                <DragOverlay>
                                    {activeId ? (
                                        <div className="w-[180px] h-fit">
                                            <PlanCardUI
                                                plan={plans.find(p => p.id === activeId)!}
                                                fontScale={Math.max(1, slotHeight / 72)}
                                                isOverlay
                                            />
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[100px]">날짜</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">업체명</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[280px]">제품 정보</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[160px]">생산 규격</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[320px]">작업 데이터</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[120px]">시간</th>
                                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">비고 / 중요공지</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPlans.length > 0 ? (
                                        filteredPlans.map((plan, idx) => {
                                            const prevPlan = idx > 0 ? filteredPlans[idx - 1] : null;
                                            const isNewDay = !prevPlan || !isSameDay(new Date(plan.planDate), new Date(prevPlan.planDate));

                                            return (
                                                <tr
                                                    key={plan.id}
                                                    onClick={() => handlePlanClick(plan)}
                                                    className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${plan.importantNotice ? 'bg-red-50/20' : ''} ${isNewDay && idx !== 0 ? 'border-t-4 border-slate-200' : ''}`}
                                                >
                                                    <td className={`px-4 py-6 text-sm font-bold ${isNewDay ? 'text-blue-600 bg-blue-50/10' : 'text-slate-500 opacity-60'}`}>
                                                        {format(new Date(plan.planDate), 'MM/dd (E)', { locale: ko })}
                                                    </td>
                                                    <td className="px-4 py-6"><span className="text-sm font-black text-slate-800">{plan.customer}</span></td>
                                                    <td className="px-4 py-6">
                                                        <div className="flex flex-col space-y-0.5">
                                                            <span className="text-sm font-bold text-blue-600">{plan.outputProduct}</span>
                                                            <span className="text-xs text-slate-500 font-semibold">{plan.inputProduct || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-6">
                                                        {(plan.outputWidth || plan.outputLength) && (
                                                            <span className="text-[13px] font-black text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-md whitespace-nowrap">
                                                                {Number(plan.outputWidth?.replace(/,/g, '') || 0).toLocaleString()}mm * {Number(plan.outputLength?.replace(/,/g, '') || 0).toLocaleString()}m
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-6">
                                                        <div className="flex flex-col space-y-2.5">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-bold text-slate-500 w-12">점착제</span>
                                                                <span className="text-sm font-black text-slate-800">{plan.adhesive || '-'}</span>
                                                            </div>
                                                            {plan.mixingRatio && (
                                                                <div className="flex items-start space-x-2">
                                                                    <span className="text-xs font-bold text-slate-500 w-12 pt-1.5">배합비</span>
                                                                    <div className="inline-flex flex-col border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                                                                        <div className="flex border-b border-blue-100 divide-x divide-blue-100 bg-blue-50/50">
                                                                            {Object.entries(JSON.parse(plan.mixingRatio) as Record<string, any>)
                                                                                .filter(([_, v]) => v && v !== '0')
                                                                                .map(([k]) => (
                                                                                    <div key={k} className="px-3 py-1 text-[11px] font-bold text-blue-500 text-center min-w-[50px]">{k}</div>
                                                                                ))}
                                                                        </div>
                                                                        <div className="flex divide-x divide-blue-100 bg-white">
                                                                            {Object.entries(JSON.parse(plan.mixingRatio) as Record<string, any>)
                                                                                .filter(([_, v]) => v && v !== '0')
                                                                                .map(([k, v]) => (
                                                                                    <div key={k} className="px-3 py-1 text-[13px] font-black text-blue-700 text-center min-w-[50px]">{String(v)}</div>
                                                                                ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs font-bold text-slate-500 w-12">망목/속도</span>
                                                                <span className="text-sm font-black text-slate-800">#{plan.mesh || '-'}목 / {plan.speed || '-'}m</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-800">{plan.duration}분</span>
                                                            {plan.duration >= 60 && (
                                                                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
                                                                    ({Math.floor(plan.duration / 60)}시간 {plan.duration % 60 > 0 ? `${plan.duration % 60}분` : ''})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-6">
                                                        <div className="space-y-2 max-w-sm">
                                                            {plan.importantNotice && (
                                                                <div className="text-sm font-black text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                                                                    [중요] {plan.importantNotice}
                                                                </div>
                                                            )}
                                                            <div className="text-sm text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">
                                                                {plan.note || '-'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-24 text-center text-slate-400 font-bold text-base">검색 결과가 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals & Detail Popup */}
            <AnimatePresence>
                {isModalOpen && (
                    <WorkPlanModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSave}
                        onHistoryLookup={handleHistoryLookup}
                        loading={loading}
                    />
                )}
                {isDetailOpen && selectedPlan && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[95%] overflow-y-auto border border-slate-100"
                        >
                            <WorkPlanDetailCard
                                plan={selectedPlan}
                                onClose={() => setIsDetailOpen(false)}
                                onEdit={() => {
                                    setFormData({
                                        ...selectedPlan,
                                        planDate: format(new Date(selectedPlan.planDate), 'yyyy-MM-dd')
                                    });
                                    setIsDetailOpen(false);
                                    setIsModalOpen(true);
                                }}
                                onDelete={handleDelete}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-components ---

const DayDroppableContainer = ({ id, children, slotHeight }: { id: string, children: React.ReactNode, slotHeight: number }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ minHeight: `${slotHeight * 15}px` }}
            className={`flex-1 relative transition-colors ${isOver ? 'bg-blue-50/50' : 'bg-white/30'}`}
        >
            {children}
        </div>
    );
};

// React.memo used above locally for SortablePlanCard and PlanCardUI

const WorkPlanDetailCard = ({ plan, onClose, onEdit, onDelete }: { plan: WorkPlanData, onClose: () => void, onEdit: () => void, onDelete: (id: string) => void }) => {
    const ratio = JSON.parse(plan.mixingRatio || '{ }');

    return (
        <div className="relative p-8">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={20} />
            </button>

            <div className="mb-8">
                <div className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold mb-3">
                    {format(new Date(plan.planDate), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                </div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">
                    {plan.customer}
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">투입제품</div>
                    <div className="text-sm font-medium text-slate-700">{plan.inputProduct}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">생산제품</div>
                    <div className="text-sm font-medium text-slate-900 border-b-2 border-blue-200 inline-block">{plan.outputProduct}</div>
                </div>
                <div className="col-span-2 text-center py-3 bg-slate-50 rounded-xl text-lg font-black text-slate-700">
                    {(plan.outputWidth || plan.outputLength)
                        ? `${Number(plan.outputWidth?.replace(/,/g, '') || 0).toLocaleString()}mm * ${Number(plan.outputLength?.replace(/,/g, '') || 0).toLocaleString()}m`
                        : (plan.outputSize || '규격 정보 없음')}
                </div>
                <div className="col-span-2 text-center text-sm font-medium text-blue-600 py-1 border-y border-blue-50">
                    {plan.machineName} {plan.processType}
                </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6 mb-8 shadow-xl shadow-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">작업데이터</div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="text-slate-500">점착제/실리콘 :</div>
                        <div className="font-bold text-right">{plan.adhesive}</div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-800">
                            <div className="flex flex-col space-y-1">
                                <div className="text-[10px] text-slate-500 font-bold flex justify-end">
                                    {Object.entries(ratio as Record<string, any>)
                                        .filter(([_, v]) => v && v !== '0')
                                        .map(([k], i, arr) => (
                                            <div key={k} className="flex items-center">
                                                <span className="min-w-[40px] text-center">{k === '점착제' ? '점착제/실리콘' : k}</span>
                                                {i < arr.length - 1 && <span className="text-slate-700 mx-1">:</span>}
                                            </div>
                                        ))
                                    }
                                </div>
                                <div className="text-sm font-black text-white flex justify-end">
                                    {Object.entries(ratio as Record<string, any>)
                                        .filter(([_, v]) => v && v !== '0')
                                        .map(([k, v], i, arr) => (
                                            <div key={k} className="flex items-center">
                                                <span className="min-w-[40px] text-center">{String(v)}</span>
                                                {i < arr.length - 1 && <span className="invisible mx-1">:</span>}
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                        {(plan.mesh || plan.speed) && (
                            <>
                                <div className="text-slate-500">망목수 / 스피드 :</div>
                                <div className="font-bold text-right">
                                    {plan.mesh ? `#${plan.mesh}목` : ''}
                                    {plan.mesh && plan.speed ? ' / ' : ''}
                                    {plan.speed ? `${plan.speed}m` : ''}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {plan.note && (
                <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">주의사항/비고</div>
                    <p className="text-sm text-amber-900 leading-relaxed font-medium whitespace-pre-wrap">
                        {plan.note}
                    </p>
                </div>
            )}

            {plan.importantNotice && (
                <div className="mb-8 p-4 bg-red-50 rounded-2xl border-2 border-red-100 animate-pulse-subtle">
                    <div className="text-[10px] font-bold text-red-600 uppercase mb-1">[중요공지사항]</div>
                    <p className="text-sm text-red-900 leading-relaxed font-black whitespace-pre-wrap">
                        {plan.importantNotice}
                    </p>
                </div>
            )}

            <div className="flex items-center space-x-3">
                <button onClick={onEdit} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors">수정</button>
                <button onClick={() => onDelete(plan.id)} className="p-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors">
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
};

// --- Utils ---

const AutocompleteInput = ({ label, name, value, onChange, field, placeholder, className, machineName }: any) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async () => {
        try {
            const machineParam = machineName ? `&machineName=${encodeURIComponent(machineName)}` : '';
            const res = await fetch(`/api/work-plans/suggestions?field=${field}${machineParam}`);
            const data = await res.json();
            if (Array.isArray(data)) setSuggestions(data);
        } catch (error) {
            console.error('Suggestions fetch error:', error);
        }
    };

    const handleFocus = () => {
        fetchSuggestions();
        setIsOpen(true);
    };

    const handleSelect = (val: string) => {
        onChange({ target: { name, value: val } });
        setIsOpen(false);
    };

    const filteredSuggestions = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase()) && s !== value
    );

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            {label && <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>}
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                onFocus={handleFocus}
                placeholder={placeholder}
                autoComplete="off"
                className={className || "w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"}
            />
            <AnimatePresence>
                {isOpen && filteredSuggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto"
                    >
                        {filteredSuggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelect(s)}
                                className="w-full text-left px-5 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                            >
                                {s}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const WorkPlanModal = ({ isOpen, onClose, formData, setFormData, onSave, onHistoryLookup, loading }: any) => {
    const isEdit = !!formData.id;
    const [historyDate, setHistoryDate] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchLatestHistoryDate = async () => {
            if (!formData.outputProduct) {
                setHistoryDate(null);
                return;
            }
            try {
                const machineParam = formData.machineName ? `&machineName=${encodeURIComponent(formData.machineName)}` : '';
                const res = await fetch(`/api/work-plans/latest-history?outputProduct=${encodeURIComponent(formData.outputProduct)}${machineParam}`);
                const data = await res.json();
                if (data && data.planDate) {
                    const date = new Date(data.planDate);
                    setHistoryDate(format(date, 'yyyy년 MM월 dd일'));
                } else {
                    setHistoryDate(null);
                }
            } catch (error) {
                console.error('History date fetch error:', error);
                setHistoryDate(null);
            }
        };

        fetchLatestHistoryDate();
    }, [formData.outputProduct, formData.machineName]);

    const formatNumber = (val: string | number) => {
        if (!val && val !== 0) return '';
        const s = val.toString().replace(/,/g, '');
        if (isNaN(Number(s))) return val.toString();

        const parts = s.split('.');
        parts[0] = Number(parts[0]).toLocaleString();
        return parts.join('.');
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'outputWidth' || name === 'outputLength') {
            const rawValue = value.replace(/,/g, '');
            if (isNaN(Number(rawValue)) && rawValue !== '' && rawValue !== '.') return;
            setFormData((prev: any) => ({ ...prev, [name]: formatNumber(rawValue) }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const mixingRatioString = typeof formData.mixingRatio === 'string' ? formData.mixingRatio : JSON.stringify(formData.mixingRatio || {});
    const mixingRatio = JSON.parse(mixingRatioString || '{ }');

    const updateRatio = (key: string, val: string) => {
        const newRatio = { ...mixingRatio, [key]: val };
        setFormData((prev: any) => ({ ...prev, mixingRatio: JSON.stringify(newRatio) }));
    };

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[95%] overflow-y-auto flex flex-col"
            >
                <div className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-black text-slate-900">
                        {isEdit ? '계획 수정' : '새 작업 계획'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 shadow-sm">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 pt-0 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">날짜</label>
                            <input
                                type="date"
                                name="planDate"
                                value={formData.planDate ?? ''}
                                onChange={handleChange}
                                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="설비명"
                                name="machineName"
                                value={formData.machineName ?? ''}
                                onChange={handleChange}
                                field="machineName"
                                placeholder="합지5호기"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <AutocompleteInput
                                label="업체명"
                                name="customer"
                                value={formData.customer ?? ''}
                                onChange={handleChange}
                                field="customer"
                                placeholder="업체명을 입력하세요"
                            />
                        </div>
                    </div>

                    {/* Products */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-5 rounded-[28px] border border-blue-100">
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="투입제품"
                                name="inputProduct"
                                value={formData.inputProduct ?? ''}
                                onChange={handleChange}
                                field="inputProduct"
                                placeholder="투입 원단명"
                                machineName={formData.machineName}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="생산제품"
                                name="outputProduct"
                                value={formData.outputProduct ?? ''}
                                onChange={handleChange}
                                field="outputProduct"
                                placeholder="생산 제품명"
                                machineName={formData.machineName}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                            <div className="flex justify-between items-center mt-1 px-1 min-h-[24px]">
                                <span className="text-[10px] font-bold text-slate-400">
                                    {historyDate ? `최종작업이력 : ${historyDate}` : ''}
                                </span>
                                <button
                                    onClick={() => onHistoryLookup(formData.inputProduct, formData.outputProduct)}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-200 transition-colors"
                                >이력 채우기</button>
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex items-end gap-4">
                                <div className="flex-[2] space-y-2">
                                    <label className="text-xs font-black text-blue-400 uppercase tracking-widest pl-1">생산 규격</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                name="outputWidth"
                                                value={formData.outputWidth ?? ''}
                                                onChange={handleChange}
                                                placeholder="폭"
                                                className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                                        </div>
                                        <X size={12} className="text-blue-200 shrink-0" />
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                name="outputLength"
                                                value={formData.outputLength ?? ''}
                                                onChange={handleChange}
                                                placeholder="길이"
                                                className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">m</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-1">작업 시간(분)</label>
                                    <input
                                        type="number"
                                        name="duration"
                                        value={formData.duration ?? ''}
                                        onChange={handleChange}
                                        placeholder="60"
                                        className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">용도</label>
                            <input type="text" name="processType" value={formData.processType ?? ''} onChange={handleChange} placeholder="합지용" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="점착제/실리콘"
                                name="adhesive"
                                value={formData.adhesive ?? ''}
                                onChange={handleChange}
                                field="adhesive"
                                machineName={formData.machineName}
                                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">망목수(Mesh)</label>
                            <input type="text" name="mesh" value={formData.mesh ?? ''} onChange={handleChange} placeholder="70" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">속도</label>
                            <input type="text" name="speed" value={formData.speed ?? ''} onChange={handleChange} placeholder="50m" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                    </div>

                    {/* Mixing Ratio Grid */}
                    <div className="bg-slate-900 rounded-[28px] p-5 shadow-xl shadow-slate-100">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 block mb-3">점착제/실리콘 배합 비율</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                            {['점착제', '톨루엔', 'MEK', 'N/H'].map(key => (
                                <div key={key} className="space-y-2">
                                    <span className="text-[10px] text-slate-500 font-bold block ml-1">{key === '점착제' ? '점착제/실리콘' : key}</span>
                                    <div className="flex items-center bg-slate-800 rounded-xl px-3 border border-slate-700 focus-within:border-blue-500 transition-colors">
                                        <input
                                            type="text"
                                            value={formatNumber(mixingRatio[key] || '')}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/,/g, '');
                                                if (isNaN(Number(rawValue)) && rawValue !== '' && rawValue !== '.') return;
                                                updateRatio(key, rawValue);
                                            }}
                                            className="w-full bg-transparent border-none py-2 text-white text-xs font-bold outline-none text-right"
                                            placeholder="0"
                                        />
                                        <span className="text-[10px] text-slate-600 font-bold ml-1">kg</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">비고 / 주의사항</label>
                        <textarea
                            name="note"
                            value={formData.note ?? ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-slate-100 border-none rounded-[24px] px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none"
                            placeholder="작업 시 주의사항을 입력하세요..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-red-400 uppercase tracking-widest pl-1">[중요공지사항]</label>
                        <textarea
                            name="importantNotice"
                            value={formData.importantNotice ?? ''}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-red-50 border-2 border-red-100 rounded-[24px] px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-red-100 transition-all outline-none resize-none text-red-900 placeholder:text-red-300"
                            placeholder="매우 중요한 공지사항을 입력하세요..."
                        />
                    </div>

                    <button
                        onClick={onSave}
                        disabled={loading}
                        className={`w-full ${loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-5 rounded-[24px] font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center space-x-2`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>저장 중...</span>
                            </>
                        ) : (
                            <span>{isEdit ? '계획 수정 완료' : '작업 계획 저장'}</span>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WorkPlan;
