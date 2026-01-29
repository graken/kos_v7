"use client";

import StatusBar from "@/components/StatusBar";
import HomeGrid from "@/components/HomeGrid";
import Window from "@/components/Window";
import { useOSStore } from "@/store/useOSStore";
import { AnimatePresence } from "framer-motion";

import ContextMenu from "@/components/common/ContextMenu";

import { useShallow } from 'zustand/react/shallow';

export default function DesktopShell() {
    const windowIds = useOSStore(useShallow(state => Object.keys(state.windows)));

    return (
        <div
            className="relative w-full h-full overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
        >
            <StatusBar />
            <HomeGrid />
            <AnimatePresence>
                {windowIds.map((id) => (
                    <Window key={id} id={id} />
                ))}
            </AnimatePresence>
            <ContextMenu />
        </div>
    );
}
