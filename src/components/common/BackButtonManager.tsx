"use client";

import { useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';

export default function BackButtonManager() {
    const triggerBackAction = useOSStore(state => state.triggerBackAction);
    const backStack = useOSStore(state => state.backStack);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // 안드로이드 백버튼이나 브라우저 뒤로가기 클릭 시 실행됨
            const handled = triggerBackAction();

            if (handled) {
                // 우리가 동작을 처리(팝업 닫기 등)했다면, 
                // 브라우저가 실제로 이전 페이지로 가는 것을 막기 위해 현재 상태를 다시 푸시함
                // (참고: popstate 이벤트 발생 시 이미 히스토리에서 하나가 빠진 상태임)
                window.history.pushState({ isBackAction: true }, '');
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [triggerBackAction]);

    return null; // 화면에 아무것도 렌더링하지 않음
}
