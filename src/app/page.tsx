"use client";

import StatusBar from "@/components/StatusBar";
import Wallpaper from "@/components/Wallpaper";
import HomeGrid from "@/components/HomeGrid";
import Window from "@/components/Window";
import { useOSStore } from "@/store/useOSStore";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const { windows } = useOSStore();
  const openWindows = Object.values(windows);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Wallpaper />
      <StatusBar />
      <HomeGrid />

      {/* Windows Layer */}
      <AnimatePresence>
        {openWindows.map((window) => (
          <Window key={window.id} window={window} />
        ))}
      </AnimatePresence>
    </main>
  );
}
