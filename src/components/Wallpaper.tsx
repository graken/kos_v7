"use client";

import { useOSStore } from '@/store/useOSStore';

export default function Wallpaper() {
    const wallpaper = useOSStore((state) => state.wallpaper);

    return (
        <div
            className="fixed inset-0 -z-10 transition-all duration-700 ease-in-out"
            style={{
                backgroundImage: wallpaper,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-white/20 pointer-events-none" />
        </div>
    );
}
