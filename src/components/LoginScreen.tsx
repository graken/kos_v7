"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore, User } from '@/store/useOSStore';
import { User as UserIcon, Shield, ChevronRight, Loader2 } from 'lucide-react';

export default function LoginScreen() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
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

    const handleUserSelect = async (user: User) => {
        await switchUser(user);
    };

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.2),transparent)] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 flex items-center justify-center mx-auto mb-6"
                    >
                        <Shield className="text-white" size={40} />
                    </motion.div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">KOS OS v7</h1>
                    <p className="text-slate-400 font-bold">사용자를 선택하여 시작하세요</p>
                </div>

                <div className="space-y-3">
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
                                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner group-hover:from-blue-600 group-hover:to-blue-700 group-hover:text-white transition-all">
                                    {user.avatar ? (
                                        <img src={user.avatar} className="w-full h-full object-cover rounded-2xl" alt={user.displayName} />
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
