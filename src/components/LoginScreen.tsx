"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore, User } from '@/store/useOSStore';
import { User as UserIcon, Shield, ChevronRight, Loader2 } from 'lucide-react';

export default function LoginScreen() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { switchUser } = useOSStore();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    console.error('Invalid users data format:', data);
                    setUsers([]);
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setError(null);
        setPassword('');
    };

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedUser || !password || isLoggingIn) return;

        setIsLoggingIn(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, password })
            });

            const data = await res.json();

            if (data.success) {
                await switchUser(data.user);
            } else {
                setError(data.error || '로그인에 실패했습니다');
            }
        } catch (err) {
            setError('서버와 통신 중 오류가 발생했습니다');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.2),transparent)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <motion.div
                        layoutId="logo"
                        className="w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 flex items-center justify-center mx-auto mb-6"
                    >
                        <Shield className="text-white" size={40} />
                    </motion.div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">KOS OS v7</h1>
                    <p className="text-slate-400 font-bold">
                        {selectedUser ? '비밀번호를 입력하세요' : '사용자를 선택하여 시작하세요'}
                    </p>
                </div>

                <div className="relative overflow-hidden min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {!selectedUser ? (
                            <motion.div
                                key="user-list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                {loading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : (
                                    users.map((user) => (
                                        <motion.button
                                            key={user.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleUserSelect(user)}
                                            className="w-full p-5 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-[24px] border border-white/10 flex items-center gap-4 transition-all group"
                                        >
                                            <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all overflow-hidden">
                                                {user.avatar ? (
                                                    <img src={user.avatar} className="w-full h-full object-cover" alt={user.displayName} />
                                                ) : (
                                                    <UserIcon size={28} />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-white font-black text-lg leading-tight">{user.displayName}</div>
                                                <div className="text-slate-400 text-sm font-bold mt-0.5">@{user.username}</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <ChevronRight size={20} />
                                            </div>
                                        </motion.button>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="password-input"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-24 h-24 bg-white/10 rounded-[32px] border border-white/10 flex items-center justify-center mb-6 overflow-hidden">
                                    {selectedUser.avatar ? (
                                        <img src={selectedUser.avatar} className="w-full h-full object-cover" alt={selectedUser.displayName} />
                                    ) : (
                                        <UserIcon className="text-white/40" size={40} />
                                    )}
                                </div>
                                <h2 className="text-xl font-black text-white mb-8">{selectedUser.displayName}</h2>

                                <form onSubmit={handleLogin} className="w-full space-y-4">
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Password"
                                            className={`w-full bg-white/10 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 text-white text-center text-xl tracking-[0.2em] outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-500`}
                                        />
                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-red-400 text-xs font-bold mt-2 text-center"
                                            >
                                                {error}
                                            </motion.p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoggingIn || !password}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3"
                                    >
                                        {isLoggingIn ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                로그인
                                                <ChevronRight size={20} />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedUser(null)}
                                        className="w-full py-2 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors"
                                    >
                                        다른 사용자로 로그인
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                        Administrator System Tools<br />
                        Equipment Maintenance & OS Control
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
