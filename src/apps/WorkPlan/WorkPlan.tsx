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
    Check
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCorners,
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

const PlanCardUI = React.memo(({ plan, listeners, isOverlay }: { plan: WorkPlanData, listeners?: any, isOverlay?: boolean }) => {
    return (
        <div className={`group flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 hover:shadow-md hover:border-blue-300 transition-all ${isOverlay ? 'shadow-2xl ring-2 ring-blue-500 scale-105 rotate-2' : ''}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {plan.customer || '미지정'}
                </span>
                {!isOverlay && (
                    <div {...listeners} className="p-1 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing text-slate-400 group-hover:text-blue-500 transition-colors">
                        <GripVertical size={14} />
                    </div>
                )}
            </div>
            <div className="text-xs font-black text-slate-800 line-clamp-1 mb-1">
                {plan.outputProduct || '생산제품 없음'}
            </div>
            {(plan.outputWidth || plan.outputLength) && (
                <div className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md self-start mb-1">
                    {Number(plan.outputWidth?.toString().replace(/,/g, '') || 0).toLocaleString()}mm * {Number(plan.outputLength?.toString().replace(/,/g, '') || 0).toLocaleString()}m
                </div>
            )}
            <div className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed opacity-70">
                {plan.inputProduct} → {plan.outputProduct}
            </div>
            {plan.importantNotice && (
                <div className="mt-1 px-2 py-1 bg-red-50 rounded-md border border-red-100">
                    <div className="text-[9px] font-black text-red-600 line-clamp-2 leading-tight">
                        <span className="mr-1">📢</span>{plan.importantNotice}
                    </div>
                </div>
            )}
            <div className="mt-auto flex items-center text-[10px] text-slate-400 font-medium pt-1.5 border-t border-slate-50">
                <Clock size={12} className="mr-1" />
                {plan.duration}분
            </div>
        </div>
    );
});

const SortablePlanCard = React.memo(({ plan, onClick }: { plan: WorkPlanData, onClick: () => void }) => {
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
        height: `${Math.max(85, plan.duration * 1.66)}px`,
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
            <PlanCardUI plan={plan} listeners={listeners} />
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
    duration: undefined,
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
    const plansRef = useRef<WorkPlanData[]>([]);
    const previousPlansRef = useRef<WorkPlanData[]>([]);

    useEffect(() => {
        plansRef.current = plans;
    }, [plans]);

    // Group plans by date for efficient rendering
    const plansByDate = React.useMemo(() => {
        const grouped: Record<string, WorkPlanData[]> = {};
        if (Array.isArray(plans)) {
            plans.forEach(p => {
                // Normalize date key to yyyy-MM-dd to match UI's dateKey
                const dateKey = format(new Date(p.planDate), 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(p);
            });
        }
        console.log('Grouped plans by date:', Object.keys(grouped));
        return grouped;
    }, [plans]);

    // Fetch plans for the current week
    const fetchPlans = React.useCallback(async () => {
        setLoading(true);
        try {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const res = await fetch(`/api/work-plans?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`);
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
    }, [currentDate]);

    useEffect(() => {
        fetchPlans();
    }, [currentDate]);

    const handleHistoryLookup = async (inputProduct: string, outputProduct: string) => {
        if (!inputProduct && !outputProduct) return;
        try {
            const res = await fetch(`/api/work-plans/latest-history?inputProduct=${inputProduct}&outputProduct=${outputProduct}`);
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

    const sensors = React.useMemo(() => [
        {
            sensor: PointerSensor,
            options: {
                activationConstraint: {
                    distance: 8,
                },
            }
        },
        {
            sensor: KeyboardSensor,
            options: {
                coordinateGetter: sortableKeyboardCoordinates,
            }
        }
    ], []);

    const sensorsContext = useSensors(
        useSensor(sensors[0].sensor, sensors[0].options),
        useSensor(sensors[1].sensor, sensors[1].options)
    );

    const handleDragStart = React.useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragOver = React.useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        setPlans((prev) => {
            const activeIdx = prev.findIndex(p => p.id === activeId);
            if (activeIdx === -1) return prev;

            const activePlan = prev[activeIdx];
            let overDate: string | null = null;
            let overIdx = -1;

            if (overId.startsWith('day-')) {
                overDate = overId.replace('day-', '');
                // Find potential index to insert: end of that day's plans
                const dayIndices = prev.reduce((acc: number[], p, i) => p.planDate === overDate ? [...acc, i] : acc, []);

                if (dayIndices.length > 0) {
                    overIdx = dayIndices[dayIndices.length - 1];
                } else {
                    // Empty day: find the correct chronological position in the full plans array
                    // to keep the array sorted by date.
                    overIdx = prev.findIndex(p => new Date(p.planDate) > new Date(overDate!));
                    if (overIdx === -1) overIdx = prev.length - 1;
                }
            } else {
                overIdx = prev.findIndex(p => p.id === overId);
                if (overIdx !== -1) {
                    overDate = prev[overIdx].planDate;
                }
            }

            if (!overDate || overIdx === -1) return prev;

            // Stable: Avoid redundant updates
            if (activePlan.planDate === overDate && activeIdx === overIdx) return prev;

            const next = [...prev];
            if (activePlan.planDate !== overDate) {
                next[activeIdx] = { ...activePlan, planDate: overDate };
            }

            return arrayMove(next, activeIdx, overIdx);
        });
    }, []);

    const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) {
            fetchPlans();
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

        if (activeId && lastVisibleWeekDays.current.length > 0) {
            // During drag, keep displaying the days that were already visible 
            // to avoid abrupt disappearing/collapsing of columns
            return lastVisibleWeekDays.current;
        }

        lastVisibleWeekDays.current = current;
        return current;
    }, [allWeekDays, plans, activeId]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden select-none font-sans text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-slate-900">작업계획서</h1>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 font-semibold min-w-[140px] text-center">
                            {format(currentDate, 'yyyy년 MM월', { locale: ko })}
                        </span>
                        <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1.5 hover:bg-white rounded-md transition-all">
                            <ChevronRight size={20} />
                        </button>
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
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md shadow-blue-100"
                    >
                        <Plus size={18} />
                        <span>작업 추가</span>
                    </button>
                </div>
            </div>

            {/* Scheduler Body */}
            <div className="flex-1 overflow-x-auto p-4 flex">
                <div className="flex flex-1 min-w-full h-fit min-h-full">
                    {/* Time Scale Sidebar */}
                    <div className="w-16 flex flex-col pt-[72px] border-r border-slate-200 bg-white/50 sticky left-0 z-10 shrink-0">
                        {Array.from({ length: 15 }, (_, i) => 9 + i).map(hour => (
                            <div key={hour} className="h-[100px] text-[10px] font-bold text-slate-400 text-center border-b border-slate-100/50 flex flex-col justify-start pt-1">
                                {String(hour).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-1 h-fit min-h-full">
                        <DndContext
                            sensors={sensorsContext}
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
                                        <div className={`p-4 sticky top-0 bg-[#f8fafc] z-10 border-b h-[72px] flex flex-col justify-center ${isSameDay(day, new Date()) ? 'border-b-blue-500' : 'border-b-slate-200'}`}>
                                            <div className={`text-xs font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-500'}`}>
                                                {format(day, 'MM/dd (E)', { locale: ko })}
                                            </div>
                                            {isSameDay(day, new Date()) && (
                                                <div className="text-[10px] text-blue-500 font-black mt-0.5">TODAY</div>
                                            )}
                                        </div>

                                        <DayDroppableContainer id={`day-${format(day, 'yyyy-MM-dd')}`}>
                                            {/* Grid Lines */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                {Array.from({ length: 15 }).map((_, i) => (
                                                    <div key={i} className="h-[100px] border-b border-slate-100/50 w-full" />
                                                ))}
                                            </div>

                                            <div className="relative z-0 p-2 space-y-1">
                                                <SortableContext
                                                    items={dayPlans.map(p => p.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {dayPlans.map(plan => (
                                                        <SortablePlanCard
                                                            key={plan.id}
                                                            plan={plan}
                                                            onClick={() => handlePlanClick(plan)}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </div>
                                        </DayDroppableContainer>
                                    </div>
                                );
                            })}
                            <DragOverlay adjustScale={true}>
                                {activeId ? (
                                    <div className="w-[180px] h-fit">
                                        <PlanCardUI
                                            plan={plans.find(p => p.id === activeId)!}
                                            isOverlay
                                        />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </div>

                {/* Modal & Detail Popup */}
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
        </div>
    );
};

// --- Sub-components ---

const DayDroppableContainer = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`flex-1 relative min-h-[1500px] transition-colors ${isOver ? 'bg-blue-50/50' : 'bg-white/30'}`}
        >
            {children}
        </div>
    );
};

// React.memo used above locally for SortablePlanCard and PlanCardUI

const WorkPlanDetailCard = ({ plan, onClose, onEdit, onDelete }: { plan: WorkPlanData, onClose: () => void, onEdit: () => void, onDelete: (id: string) => void }) => {
    const ratio = JSON.parse(plan.mixingRatio || '{}');

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
                <div className="col-span-2 text-center py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-500">
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
                        <div className="text-slate-500">점착제 :</div>
                        <div className="font-bold text-right">{plan.adhesive}</div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-800">
                            <div className="flex flex-col space-y-1">
                                <div className="text-[10px] text-slate-500 font-bold flex justify-end">
                                    {Object.entries(ratio as Record<string, any>)
                                        .filter(([_, v]) => v && v !== '0')
                                        .map(([k], i, arr) => (
                                            <div key={k} className="flex items-center">
                                                <span className="min-w-[40px] text-center">{k}</span>
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
                        <div className="text-slate-500">망목수 / 스피드 :</div>
                        <div className="font-bold text-right">#{plan.mesh || '-'}목 / {plan.speed}m</div>
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

const AutocompleteInput = ({ label, name, value, onChange, field, placeholder, className }: any) => {
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
            const res = await fetch(`/api/work-plans/suggestions?field=${field}`);
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
    const mixingRatio = JSON.parse(mixingRatioString || '{}');

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
                                value={formData.planDate}
                                onChange={handleChange}
                                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">작업 시간 (분)</label>
                            <input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                placeholder="예: 60"
                                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <AutocompleteInput
                                label="업체명"
                                name="customer"
                                value={formData.customer}
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
                                value={formData.inputProduct}
                                onChange={handleChange}
                                field="inputProduct"
                                className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="생산제품"
                                name="outputProduct"
                                value={formData.outputProduct}
                                onChange={handleChange}
                                field="outputProduct"
                                className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            />
                            <div className="flex justify-end mt-1">
                                <button
                                    onClick={() => onHistoryLookup(formData.inputProduct, formData.outputProduct)}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-lg text-[10px] hover:bg-blue-200 transition-colors"
                                >이력 조회</button>
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-black text-blue-400 uppercase tracking-widest pl-1">생산 규격</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        name="outputWidth"
                                        value={formData.outputWidth}
                                        onChange={handleChange}
                                        placeholder="폭"
                                        className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
                                </div>
                                <X size={14} className="text-blue-200 shrink-0" />
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        name="outputLength"
                                        value={formData.outputLength}
                                        onChange={handleChange}
                                        placeholder="길이"
                                        className="w-full bg-white border-blue-100 border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="설비명"
                                name="machineName"
                                value={formData.machineName}
                                onChange={handleChange}
                                field="machineName"
                                placeholder="합지5호기"
                                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">용도</label>
                            <input type="text" name="processType" value={formData.processType} onChange={handleChange} placeholder="합지용" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <AutocompleteInput
                                label="점착제"
                                name="adhesive"
                                value={formData.adhesive}
                                onChange={handleChange}
                                field="adhesive"
                                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">망목수(Mesh)</label>
                            <input type="text" name="mesh" value={formData.mesh} onChange={handleChange} placeholder="70" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase pl-1">속도</label>
                            <input type="text" name="speed" value={formData.speed} onChange={handleChange} placeholder="50m" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                        </div>
                    </div>

                    {/* Mixing Ratio Grid */}
                    <div className="bg-slate-900 rounded-[28px] p-5 shadow-xl shadow-slate-100">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 block mb-3">점착제 배합 비율</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                            {['점착제', '톨루엔', 'MEK', 'N/H'].map(key => (
                                <div key={key} className="space-y-2">
                                    <span className="text-[10px] text-slate-500 font-bold block ml-1">{key}</span>
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
                            value={formData.note}
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
                            value={formData.importantNotice}
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
