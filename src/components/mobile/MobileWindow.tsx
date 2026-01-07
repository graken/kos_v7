"use client";

import { motion } from "framer-motion";
import { X, Minus } from "lucide-react";
import { useOSStore, WindowState } from "@/store/useOSStore";
import Settings from "@/apps/Settings/Settings";

interface MobileWindowProps {
    window: WindowState;
}

const APP_COMPONENTS: Record<string, React.ComponentType> = {
    settings: Settings,
};

export default function MobileWindow({ window: win }: MobileWindowProps) {
    const { closeApp, minimizeApp } = useOSStore();
    const AppComponent = APP_COMPONENTS[win.id];

    return (
        <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white z-40 flex flex-col"
        >
            {/* Mobile App Header (Windows Style Controls) */}
            <div className="h-9 border-b flex items-center justify-between px-4 shrink-0 bg-gray-50/50 backdrop-blur-md">
                <span className="font-bold text-sm tracking-tight">{win.title}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => minimizeApp(win.id)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/60"
                        title="최소화"
                    >
                        <Minus size={20} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => closeApp(win.id)}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-black/60"
                        title="닫기"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* App Content Area */}
            <div className="flex-1 overflow-auto bg-white relative">
                {AppComponent ? (
                    <AppComponent />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 gap-4 text-black/40 italic">
                        <div className="w-20 h-20 bg-black/5 rounded-3xl flex items-center justify-center text-black/20 text-3xl font-bold not-italic">
                            {win.title.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-center text-sm">
                            {win.title} 앱은 아직 모바일 뷰를 지원하지 않습니다.
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
