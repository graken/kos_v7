"use client";

import StatusBar from "@/components/StatusBar";
import HomeGrid from "@/components/HomeGrid";
import Window from "@/components/Window";
import { useOSStore } from "@/store/useOSStore";
import { AnimatePresence } from "framer-motion";

import ContextMenu from "@/components/common/ContextMenu";

export default function DesktopShell() {
    const { windows } = useOSStore();
    const openWindows = Object.values(windows);

    return (
        <div
            className="relative w-full h-full overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
        >
            <StatusBar />
            <HomeGrid />
            <AnimatePresence>
                {openWindows.map((window) => (
                    <Window key={window.id} window={window} />
                ))}
            </AnimatePresence>
            <ContextMenu />
        </div>
    );
}
