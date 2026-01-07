"use client";

import { useEffect, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';

export default function StatusBar() {
    const { currentTime, setCurrentTime, showContextMenu, openApp } = useOSStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, [setCurrentTime]);

    if (!mounted) return null;

    const handleClickUser = (e: React.MouseEvent) => {
        const { addApp, apps } = useOSStore.getState();
        const rect = e.currentTarget.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom + 8, [
            {
                label: '아이콘 생성', iconName: 'PlusSquare', onClick: () => {
                    const newId = `new-app-${Date.now()}`;
                    addApp({
                        id: newId,
                        name: `New App ${apps.length - 5}`, // 기본 앱 6개 제외 카운트
                        iconName: 'Folder'
                    });
                }
            },
            { label: '계정 설정', iconName: 'User', onClick: () => openApp('settings') },
            { label: '사용자 전환', iconName: 'Users', onClick: () => console.log('사용자 전환') },
            { label: '로그아웃', iconName: 'LogOut', isDanger: true, onClick: () => console.log('로그아웃') },
        ]);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        }).format(date);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-8 flex items-center justify-between px-4 z-50 text-black/80 font-bold text-sm drop-shadow-sm pointer-events-none">
            <div
                className="flex items-center gap-2 hover:bg-black/5 px-2 py-1 rounded-md transition-colors cursor-pointer pointer-events-auto active:scale-95"
                onClick={handleClickUser}
            >
                <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-black/40 rounded-full" />
                </div>
                <span>Administrator</span>
            </div>
            <div className="flex gap-2 pointer-events-auto">
                <span>{formatDate(currentTime)}</span>
                <span>{formatTime(currentTime)}</span>
            </div>
        </div>
    );
}
