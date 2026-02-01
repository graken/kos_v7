"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore, User } from '@/store/useOSStore';
import { User as UserIcon, Shield, ChevronRight, Loader2 } from 'lucide-react';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { switchUser } = useOSStore();

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!username || !password || isLoggingIn) return;

        setIsLoggingIn(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
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
        <div className="fixed inset-0 z-[500] bg-[#e2e8f0] flex items-center justify-center p-6 overflow-hidden">
            {/* Metallic Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />

            {/* Dynamic Light Reflections */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/40 blur-[130px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-slate-400/20 blur-[130px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="w-24 h-24 bg-gradient-to-br from-slate-400 via-slate-200 to-slate-400 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center justify-center mx-auto mb-8 relative border border-slate-300"
                    >
                        <Shield className="text-slate-700 relative z-10 drop-shadow-md" size={44} />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white/20 rounded-b-3xl" />
                    </motion.div>

                    <motion.h1
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-black text-slate-800 tracking-tighter mb-3 drop-shadow-sm"
                    >
                        (주)국제라텍OS
                    </motion.h1>
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-[2px] w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto mb-4"
                    />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-500 font-bold tracking-[0.3em] text-[10px] uppercase"
                    >
                        Precision Industrial Operation System
                    </motion.p>
                </div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-gradient-to-b from-slate-100 to-slate-200 rounded-[40px] border border-slate-300 p-1 bg-clip-padding shadow-[0_30px_60px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                >
                    <div className="bg-slate-50/80 backdrop-blur-xl rounded-[36px] p-10 space-y-8 border border-white/40">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-[0.2em]">User Identification</label>
                                <div className="relative group">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username"
                                        className="w-full h-16 bg-slate-200/50 border border-slate-300 rounded-[22px] px-14 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-inner"
                                    />
                                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={22} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-[0.2em]">Security Access Key</label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full h-16 bg-slate-200/50 border border-slate-300 rounded-[22px] px-14 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all tracking-widest shadow-inner placeholder:tracking-normal"
                                    />
                                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={22} />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-rose-600 text-[11px] font-black bg-rose-50/80 py-4 rounded-2xl text-center border border-rose-200 flex items-center justify-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoggingIn || !username || !password}
                                className="w-full h-16 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed text-white rounded-[22px] font-black transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(59,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] active:scale-[0.98] mt-6 group/btn"
                            >
                                {isLoggingIn ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <span className="tracking-tight">시스템 접속하기</span>
                                        <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-14 text-center"
                >
                    <div className="flex items-center justify-center gap-4 opacity-30 mb-4">
                        <div className="h-[1px] w-12 bg-slate-400" />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        <div className="h-[1px] w-12 bg-slate-400" />
                    </div>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] leading-loose">
                        Advanced Integration Security Control<br />
                        Certified Industrial Production Gateway
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
