"use client";

import { useState, useEffect } from "react";

export function useDevice() {
    const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // 초기 체크
        checkDevice();

        // 리사이즈 이벤트 감시
        window.addEventListener("resize", checkDevice);
        return () => window.removeEventListener("resize", checkDevice);
    }, []);

    return { isMobile };
}
