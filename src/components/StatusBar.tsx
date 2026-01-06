"use client";

import { useEffect, useState } from 'react';
import { useOSStore } from '@/store/useOSStore';

export default function StatusBar() {
    const { currentTime, setCurrentTime } = useOSStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, [setCurrentTime]);

    if (!mounted) return null;

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
        <div className="fixed top-0 left-0 right-0 h-8 flex items-center justify-end px-4 z-50 text-black/80 font-bold text-sm drop-shadow-sm">
            <div className="flex gap-2">
                <span>{formatDate(currentTime)}</span>
                <span>{formatTime(currentTime)}</span>
            </div>
        </div>
    );
}
