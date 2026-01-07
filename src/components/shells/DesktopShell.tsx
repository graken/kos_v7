"use client";

import StatusBar from "@/components/StatusBar";
import HomeGrid from "@/components/HomeGrid";
import Window from "@/components/Window";
import { useOSStore } from "@/store/useOSStore";
import { AnimatePresence } from "framer-motion";

export default function DesktopShell() {
    const { windows } = useOSStore();
    const openWindows = Object.values(windows);

    return (
        <>
            <StatusBar />
            <HomeGrid />
            <AnimatePresence>
                {openWindows.map((window) => (
                    <Window key={window.id} window={window} />
                ))}
            </AnimatePresence>
        </>
    );
}
