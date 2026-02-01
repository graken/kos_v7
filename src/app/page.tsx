"use client";

import Wallpaper from "@/components/Wallpaper";
import DesktopShell from "@/components/shells/DesktopShell";
import MobileShell from "@/components/shells/MobileShell";
import { useDevice } from "@/hooks/useDevice";
import BackButtonManager from "@/components/common/BackButtonManager";

import LoginScreen from "@/components/LoginScreen";
import { useOSStore } from "@/store/useOSStore";
import { useAutoLogout } from "@/hooks/useAutoLogout";

export default function Home() {
  const { isMobile } = useDevice();
  const { currentUser, hasHydrated } = useOSStore();

  useAutoLogout();

  if (!hasHydrated) return null;

  if (!currentUser) {
    return <LoginScreen />;
  }

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
