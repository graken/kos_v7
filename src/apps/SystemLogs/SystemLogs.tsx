"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, Search, Filter, RefreshCw, ChevronLeft,
    ChevronRight, Calendar, User, AppWindow, Zap,
    Eye, Info, Terminal, LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ActivityLog {
    id: string;
    userId: string;
    username: string;
    action: string;
    appId: string | null;
    appName: string | null;
    targetId: string | null;
    details: string | null;
    ip: string | null;
    createdAt: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function SystemLogs() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                search: searchTerm,
            });
            const res = await fetch(`/api/logs?${params.toString()}`);
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
        if (action.includes('UPDATE')) return 'text-blue-500 bg-blue-50 border-blue-100';
        if (action.includes('DELETE')) return 'text-rose-500 bg-rose-50 border-rose-100';
        if (action.includes('OPEN')) return 'text-amber-500 bg-amber-50 border-amber-100';
        return 'text-slate-500 bg-slate-50 border-slate-100';
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden select-none font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <Terminal size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">시스템 활동 로그</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Activity Monitor</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="사용자, 앱, 작업 검색..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-slate-100 border-none rounded-xl px-10 py-2.5 text-sm font-bold w-72 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                    <button
                        onClick={() => fetchLogs()}
                        disabled={loading}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* List Header */}
            <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                <div className="w-[180px]">발생 시각</div>
                <div className="w-[120px]">사용자</div>
                <div className="w-[150px]">애플리케이션</div>
                <div className="w-[180px]">작업 구분</div>
                <div className="flex-1">상세 내용 / 대상</div>
                <div className="w-[80px] text-right">조회</div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-2">
                {logs.length === 0 && !loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300 gap-3">
                        <Info size={40} />
                        <p className="font-bold">기록된 로그가 없습니다.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center hover:shadow-lg hover:shadow-slate-200/50 transition-all group cursor-default"
                        >
                            <div className="w-[180px] shrink-0">
                                <div className="text-sm font-black text-slate-900">
                                    {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{log.ip}</div>
                            </div>

                            <div className="w-[120px] shrink-0 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                    <User size={14} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{log.username}</span>
                            </div>

                            <div className="w-[150px] shrink-0 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                    <AppWindow size={14} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 truncate pr-2">{log.appName || log.appId || '-'}</span>
                            </div>

                            <div className="w-[180px] shrink-0">
                                <span className={`px-3 py-1.5 rounded-lg text-[11px] font-black border ${getActionColor(log.action)}`}>
                                    {log.action}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0 pr-4">
                                <div className="text-sm font-medium text-slate-500 truncate">
                                    {log.targetId && <span className="text-indigo-600 font-bold mr-2">#{log.targetId}</span>}
                                    {log.details ? log.details : 'No extra details'}
                                </div>
                            </div>

                            <div className="w-[80px] shrink-0 text-right">
                                <button
                                    onClick={() => setSelectedLog(log)}
                                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination && (
                <div className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
                    <div className="text-xs font-bold text-slate-400">
                        전체 <span className="text-slate-900">{pagination.total}</span>개의 로그 중 {(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, pagination.total)} 표시
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum = currentPage;
                                if (pagination.totalPages > 5) {
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                } else {
                                    pageNum = i + 1;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-slate-50 text-slate-400'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            disabled={currentPage === pagination.totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 border border-slate-100 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 pb-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedLog(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-full"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                                        <Info size={20} />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">로그 상세 정보</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <ChevronRight className="rotate-90" size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">발생 일시</label>
                                        <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-700">
                                            {format(new Date(selectedLog.createdAt), 'yyyy년 MM월 dd일 HH:mm:ss', { locale: ko })}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IP 주소</label>
                                        <div className="p-4 bg-slate-50 rounded-2xl font-mono text-indigo-600 font-bold">
                                            {selectedLog.ip}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사용자</label>
                                        <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {selectedLog.username} ({selectedLog.userId})
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">애플리케이션</label>
                                        <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-700">
                                            {selectedLog.appName || selectedLog.appId}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">작업 코드</label>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black border ${getActionColor(selectedLog.action)}`}>
                                            {selectedLog.action}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">데이터 상세 (Raw Data)</label>
                                    <div className="p-6 bg-slate-900 rounded-[24px] text-indigo-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                        {selectedLog.details ? (
                                            (() => {
                                                try {
                                                    const parsed = JSON.parse(selectedLog.details);
                                                    return JSON.stringify(parsed, null, 2);
                                                } catch (e) {
                                                    return selectedLog.details;
                                                }
                                            })()
                                        ) : '추가 데이터 없음'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm transition-all"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
