"use client";

import { useState, useEffect } from "react";

export function useDevice() {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const checkDevice = () => {
            // 768px 미만을 모바일(태블릿 포함 하위)로 간주하거나 
            // navigator.userAgent를 사용할 수 있습니다. 여기서는 화면 너비를 기준으로 합니다.
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
