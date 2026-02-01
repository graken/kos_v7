"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore, User, AppData } from '@/store/useOSStore';
import { APP_REGISTRY } from '@/apps/registry';
import { useDevice } from '@/hooks/useDevice';
import {
    Users, Plus, Search, Shield, User as UserIcon,
    Check, X, ChevronRight, Settings, Trash2, Loader2,
    Lock, Smartphone, Laptop, Globe, Folder, Image as ImageIcon,
    MessageSquare, Mail, Calculator, Activity, Droplets, Users as UsersIcon, Calendar, Info, Terminal
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Globe: <Globe size={20} />,
    Folder: <Folder size={20} />,
    ImageIcon: <ImageIcon size={20} />,
    MessageSquare: <MessageSquare size={20} />,
    Mail: <Mail size={20} />,
    Settings: <Settings size={20} />,
    Calculator: <Calculator size={20} />,
    Activity: <Activity size={20} />,
    Droplets: <Droplets size={20} />,
    Users: <UsersIcon size={20} />,
    Calendar: <Calendar size={20} />,
    Terminal: <Terminal size={20} />,
};

export default function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { currentUser, pushBackAction, popBackAction } = useOSStore();
    const { isMobile } = useDevice();

    useEffect(() => {
        if (isModalOpen) pushBackAction('user-manager-edit', () => setIsModalOpen(false));
        else popBackAction('user-manager-edit');
    }, [isModalOpen, pushBackAction, popBackAction]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSaveUser = async (userData: Partial<User>) => {
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...userData,
                    permissions: userData.permissions || {},
                    apps: userData.apps || []
                })
            });
            if (res.ok) {
                fetchUsers();
                setIsModalOpen(false);
                setEditingUser(null);
            }
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (username === 'admin') {
            alert('관리자 계정은 삭제할 수 없습니다.');
            return;
        }

        if (!confirm(`${username} 사용자를 정말 삭제하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/users?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchUsers();
                alert('삭제되었습니다.');
            } else {
                const data = await res.json();
                alert(data.error || '삭제에 실패했습니다.');
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert('오류가 발생했습니다.');
        }
    };

    const handleResetPassword = async (targetUserId: string, displayName: string) => {
        if (!currentUser) return;
        if (!confirm(`${displayName} 사용자의 비밀번호를 '1234'로 초기화하시겠습니까?`)) return;

        try {
            const res = await fetch('/api/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId,
                    adminUserId: currentUser.id
                })
            });
            if (res.ok) {
                alert('비밀번호가 1234로 초기화되었습니다.');
            } else {
                const data = await res.json();
                alert(data.error || '초기화에 실패했습니다.');
            }
        } catch (err) {
            console.error('Reset failed:', err);
            alert('오류가 발생했습니다.');
        }
    };

    const handleUnblockUser = async (targetUserId: string, displayName: string) => {
        if (!confirm(`${displayName} 사용자의 차단을 해제하시겠습니까?`)) return;

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: targetUserId,
                    isBlocked: false,
                    loginAttempts: 0
                })
            });
            if (res.ok) {
                alert('차단이 해제되었습니다.');
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || '해제에 실패했습니다.');
            }
        } catch (err) {
            console.error('Unblock failed:', err);
            alert('오류가 발생했습니다.');
        }
    };

    const filteredUsers = users.filter(u =>
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (currentUser?.role !== 'admin') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                    <Lock size={40} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
                <p className="text-slate-500 font-bold leading-relaxed">
                    이 애플리케이션은 관리자 전용입니다.<br />
                    사용자 관리가 필요한 경우 시스템 관리자에게 문의하세요.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
            {/* Header */}
            <div className={`bg-white border-b border-slate-200 ${isMobile ? 'px-4 py-4' : 'px-8 py-6'} flex items-center justify-between`}>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100`}>
                        <Users size={isMobile ? 20 : 24} />
                    </div>
                    <div>
                        <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-slate-900 tracking-tight`}>사용자 관리</h1>
                        {!isMobile && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Administrator Tools</p>}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="relative hidden lg:block">
                        <input
                            type="text"
                            placeholder="사용자 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-100 border-none rounded-xl px-10 py-2.5 text-sm font-bold w-64 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                    <button
                        onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        <Plus size={isMobile ? 16 : 18} />
                        {isMobile ? '추가' : '사용자 추가'}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-8'} custom-scrollbar`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 flex justify-center">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                        </div>
                    ) : filteredUsers.map((user) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                        <UserIcon size={28} />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 leading-tight">{user.displayName}</div>
                                        <div className="text-sm font-bold text-slate-400">@{user.username}</div>
                                    </div>
                                </div>
                                {user.role === 'admin' && (
                                    <div className="px-2 py-1 bg-amber-50 text-amber-500 rounded-lg flex items-center gap-1">
                                        <Shield size={12} />
                                        <span className="text-[10px] font-black uppercase">Admin</span>
                                    </div>
                                )}
                                {user.isBlocked && (
                                    <div className="px-2 py-1 bg-red-50 text-red-500 rounded-lg flex items-center gap-1">
                                        <Lock size={12} />
                                        <span className="text-[10px] font-black uppercase">Blocked</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mb-8 text-sm font-bold text-slate-600">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">설치된 앱</span>
                                    <span className="text-blue-600">{Object.keys(user.permissions || {}).length}개 활성</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all"
                                >
                                    설정 변경
                                </button>
                                {user.isBlocked && (
                                    <button
                                        onClick={() => handleUnblockUser(user.id, user.displayName)}
                                        className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl font-black text-sm transition-all animate-pulse-subtle"
                                    >
                                        차단 해제
                                    </button>
                                )}
                                <button
                                    onClick={() => handleResetPassword(user.id, user.displayName)}
                                    className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-blue-500 rounded-2xl transition-all"
                                    title="비밀번호 초기화"
                                >
                                    <Lock size={18} />
                                </button>
                                {user.username !== 'admin' && user.role !== 'admin' && (
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                        className="w-12 h-12 flex items-center justify-center text-rose-300 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* User Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <UserEditModal
                        user={editingUser}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveUser}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function UserEditModal({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: (data: Partial<User>) => void }) {
    const { apps: adminApps } = useOSStore();
    const { isMobile } = useDevice();
    const [formData, setFormData] = useState({
        id: user?.id,
        username: user?.username || '',
        displayName: user?.displayName || '',
        role: (user?.role || 'user') as 'admin' | 'user',
        apps: (user?.apps || (user ? [] : adminApps)) as AppData[],
        permissions: (user?.permissions || {}) as Record<string, any>
    });

    const [activeTab, setActiveTab] = useState<'info' | 'apps' | 'perms'>('info');

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-0 md:p-6 overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={isMobile ? { y: '100%', opacity: 0, scale: 1 } : { scale: 0.95, opacity: 0, y: 20 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={isMobile ? { y: '100%', opacity: 0, scale: 1 } : { scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`relative bg-white w-full ${isMobile ? 'h-full rounded-none' : 'max-w-[98%] max-h-[98%] rounded-[40px] shadow-2xl flex flex-col'}`}
                style={!isMobile ? { resize: 'both', overflow: 'hidden', width: 'min(1000px, 95%)', height: 'min(800px, 90%)' } : {}}
            >
                <div className={`${isMobile ? 'px-6 py-4' : 'px-8 py-6'} border-b border-slate-100 flex items-center justify-between shrink-0`}>
                    <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-black text-slate-900`}>{user ? (isMobile ? '기본 정보' : '사용자 정보 수정') : '신규 사용자 추가'}</h2>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className={`flex border-b border-slate-100 ${isMobile ? 'px-4' : 'px-8'} overflow-x-auto scrollbar-hide shrink-0`}>
                    {[
                        { id: 'info', name: '기본 정보', icon: UserIcon },
                        { id: 'apps', name: '바탕화면 앱', icon: Laptop },
                        { id: 'perms', name: '상세 권한', icon: Shield },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 ${isMobile ? 'px-4' : 'px-6'} py-4 border-b-4 transition-all whitespace-nowrap font-black text-sm ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={18} />
                            {!isMobile && tab.name}
                        </button>
                    ))}
                </div>

                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-6' : 'p-4 md:p-8'} custom-scrollbar`}>
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">아이디</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">이름</label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">권한 등급</label>
                                <div className="flex gap-4">
                                    {['user', 'admin'].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setFormData({ ...formData, role: r as any })}
                                            className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${formData.role === r ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                                        >
                                            {r === 'admin' ? <Shield size={18} /> : <UserIcon size={18} />}
                                            {r === 'admin' ? '관리자' : '일반 사용자'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'apps' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(APP_REGISTRY).map(([id, app]) => {
                                const isInstalled = formData.apps.some(a => a.id === id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            const newApps = isInstalled
                                                ? formData.apps.filter(a => a.id !== id)
                                                : [...formData.apps, {
                                                    id,
                                                    name: app.name,
                                                    iconName: adminApps.find(a => a.id === id)?.iconName || (app as any).iconName || 'Settings'
                                                }];
                                            setFormData({ ...formData, apps: newApps });
                                        }}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${isInstalled ? 'bg-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-50 border-transparent text-slate-400'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInstalled ? 'bg-blue-50 text-blue-500' : 'bg-white text-slate-300'}`}>
                                            {ICON_MAP[adminApps.find(a => a.id === id)?.iconName || 'Settings'] || <Settings size={20} />}
                                        </div>
                                        <span className={`flex-1 font-bold text-sm ${isInstalled ? 'text-slate-900' : 'text-slate-400'}`}>{app.name}</span>
                                        {isInstalled && <Check className="text-blue-500" size={20} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'perms' && (
                        <div className="space-y-6">
                            {formData.role === 'admin' && (
                                <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[32px] flex items-center gap-4 animate-pulse-subtle">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-blue-900">관리자 전권 활성화 상태</h3>
                                        <p className="text-sm font-bold text-blue-600">관리자(admin) 등급은 아래 체크박스 설정과 관계없이 모든 앱의 기능을 자유롭게 사용할 수 있습니다.</p>
                                    </div>
                                </div>
                            )}
                            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6'}`}>
                                {formData.apps.map((app) => {
                                    const registryApp = APP_REGISTRY[app.id];
                                    const appPermissions = registryApp?.permissions || [
                                        { id: 'create', name: '등록 권한' },
                                        { id: 'edit', name: '수정 권한' },
                                        { id: 'delete', name: '삭제 권한' }
                                    ];

                                    return (
                                        <div key={app.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                    <Settings size={14} className="text-slate-400" />
                                                </div>
                                                {app.name} ({app.id})
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {appPermissions.map((p) => {
                                                    const isChecked = formData.permissions[app.id]?.[p.id];
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                const cur = formData.permissions[app.id] || {};
                                                                setFormData({
                                                                    ...formData,
                                                                    permissions: {
                                                                        ...formData.permissions,
                                                                        [app.id]: { ...cur, [p.id]: !isChecked }
                                                                    }
                                                                });
                                                            }}
                                                            className={`p-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-between transition-all group/btn ${isChecked || formData.role === 'admin' ? 'bg-white border-blue-600 text-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-100/50 border-transparent text-slate-400 font-bold'} ${formData.role === 'admin' ? 'cursor-default opacity-80' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {p.name}
                                                                {p.description && (
                                                                    <div className="relative group/tooltip">
                                                                        <Info size={14} className="text-slate-300 group-hover/btn:text-blue-400 transition-colors" />
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl font-medium">
                                                                            {p.description}
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(isChecked || formData.role === 'admin') ? <Check size={16} /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {formData.apps.length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-slate-400 font-bold">설치된 앱이 없습니다.<br />'바탕화면 앱' 탭에서 앱을 먼저 추가해주세요.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-3xl font-black transition-all">취소</button>
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95"
                    >
                        저장하기
                    </button>
                </div>

                {/* Resize Handle for Desktop */}
                {!isMobile && (
                    <div className="absolute bottom-2 right-2 w-4 h-4 text-slate-300 pointer-events-none opacity-50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="21" y1="21" x2="15" y2="15" />
                            <line x1="21" y1="15" x2="18" y2="12" />
                        </svg>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
