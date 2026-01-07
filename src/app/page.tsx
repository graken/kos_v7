"use client";

import Wallpaper from "@/components/Wallpaper";
import DesktopShell from "@/components/shells/DesktopShell";
import MobileShell from "@/components/shells/MobileShell";
import { useDevice } from "@/hooks/useDevice";

export default function Home() {
  const { isMobile } = useDevice();

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Wallpaper />

      {isMobile ? (
        <MobileShell />
      ) : (
        <DesktopShell />
      )}
    </main>
  );
}
