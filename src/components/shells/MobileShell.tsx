"use client";

import HomeGrid from "@/components/HomeGrid";
import { useOSStore } from "@/store/useOSStore";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus } from "lucide-react";

import MobileWindow from "@/components/mobile/MobileWindow";

export default function MobileShell() {
    const { windows } = useOSStore();
    const openWindows = Object.values(windows);

    // 최소화되지 않은 창 중 가장 최근 창(zIndex가 가장 높은 창)을 활성 창으로 간주
    const activeWindow = openWindows
        .filter(w => !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Mobile-style Status Bar */}
            <div className="h-8 flex items-center justify-between px-6 text-[11px] font-bold text-black/70 z-50">
                <span>9:41</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 h-1 bg-black/60 rounded-full" />
                        <div className="w-0.5 h-1.5 bg-black/60 rounded-full" />
                        <div className="w-0.5 h-2 bg-black/60 rounded-full" />
                        <div className="w-0.5 h-2.5 bg-black/20 rounded-full" />
                    </div>
                    <span>5G</span>
                    <div className="w-5 h-2.5 border border-black/30 rounded-[3px] relative flex items-center px-[1px]">
                        <div className="h-[5px] bg-black/80 rounded-[1px] w-[80%]" />
                        <div className="absolute -right-[3px] w-[2px] h-[3px] bg-black/30 rounded-r-full" />
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-y-auto scrollbar-hide">
                {/* Full screen Background Grid */}
                <HomeGrid />

                {/* Full screen Apps Layer */}
                <AnimatePresence>
                    {activeWindow && (
                        <MobileWindow key={activeWindow.id} window={activeWindow} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
