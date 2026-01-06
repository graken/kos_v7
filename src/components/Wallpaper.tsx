"use client";

export default function Wallpaper() {
    return (
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#f3f4f6_0%,_#d1d5db_100%)]">
            <div className="absolute inset-0 bg-white/20 pointer-events-none" />
        </div>
    );
}
