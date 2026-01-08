"use client";

import Wallpaper from "@/components/Wallpaper";
import DesktopShell from "@/components/shells/DesktopShell";
import MobileShell from "@/components/shells/MobileShell";
import { useDevice } from "@/hooks/useDevice";
import BackButtonManager from "@/components/common/BackButtonManager";

export default function Home() {
  const { isMobile } = useDevice();

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <BackButtonManager />
      <Wallpaper />

      {isMobile ? (
        <MobileShell />
      ) : (
        <DesktopShell />
      )}
    </main>
  );
}
