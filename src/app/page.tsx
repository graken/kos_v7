import StatusBar from "@/components/StatusBar";
import Wallpaper from "@/components/Wallpaper";
import HomeGrid from "@/components/HomeGrid";

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Wallpaper />
      <StatusBar />
      <HomeGrid />
    </main>
  );
}
