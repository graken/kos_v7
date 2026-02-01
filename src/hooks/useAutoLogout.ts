"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useOSStore } from '@/store/useOSStore';

const AUTO_LOGOUT_TIME = 20 * 60 * 1000; // 20분

export const useAutoLogout = () => {
    const { currentUser, setCurrentUser } = useOSStore();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (currentUser) {
            timerRef.current = setTimeout(() => {
                console.log("Inactivity detected. Logging out...");
                setCurrentUser(null);
            }, AUTO_LOGOUT_TIME);
        }
    }, [currentUser, setCurrentUser]);

    useEffect(() => {
        if (!currentUser) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // 초기 타이머 설정
        resetTimer();

        // 이벤트 리스너 등록
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            // 이벤트 리스너 제거
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentUser, resetTimer]);
};
