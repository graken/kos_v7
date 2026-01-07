"use client";

import { useState, useEffect } from 'react';
import AppIcon from './AppIcon';
import { useOSStore } from '@/store/useOSStore';
import { useDevice } from '@/hooks/useDevice';
import { Settings, Folder, Image as ImageIcon, MessageSquare, Globe, Mail } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Globe: <Globe size={32} />,
    Folder: <Folder size={32} />,
    ImageIcon: <ImageIcon size={32} />,
    MessageSquare: <MessageSquare size={32} />,
    Mail: <Mail size={32} />,
    Settings: <Settings size={32} />,
};

export default function HomeGrid() {
    const { apps, reorderApps, openApp, windows, desktopGridSettings, mobileGridSettings } = useOSStore();
    const { isMobile } = useDevice();
    const gridSettings = isMobile ? mobileGridSettings : desktopGridSettings;
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // 서버-클라이언트 불일치 방지

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.setData('fromIndex', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        reorderApps(draggedIndex, targetIndex);
        setDraggedIndex(targetIndex);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div
            className="w-full min-h-full pt-16 px-6 md:px-12 pb-24 relative"
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
        >
            {/* 실제 그리드 배경 가이드 */}
            <div className="absolute top-0 left-0 right-0 min-h-full pt-16 px-6 md:px-12 pointer-events-none -z-10">
                <div
                    className="grid mx-auto h-full items-start justify-center content-start"
                    style={{
                        columnGap: `${gridSettings.gapX}px`,
                        rowGap: `${gridSettings.gapY}px`,
                        gridTemplateColumns: `repeat(auto-fill, ${gridSettings.iconSize + 8}px)`
                    }}
                >
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="border border-black/10 rounded-2xl bg-black/[0.03]"
                            style={{
                                width: `${gridSettings.iconSize + 8}px`,
                                height: `${gridSettings.iconSize + 8}px`
                            }}
                        />
                    ))}
                </div>
            </div>

            <div
                className="grid mx-auto relative items-start justify-center content-start"
                style={{
                    columnGap: `${gridSettings.gapX}px`,
                    rowGap: `${gridSettings.gapY}px`,
                    gridTemplateColumns: `repeat(auto-fill, ${gridSettings.iconSize + 8}px)`
                }}
            >
                {apps.map((app, index) => (
                    <AppIcon
                        key={app.id}
                        id={app.id}
                        index={index}
                        name={app.name}
                        icon={ICON_MAP[app.iconName]}
                        isDragging={draggedIndex === index}
                        isActive={!!windows[app.id]}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragEnd={handleDragEnd}
                        onClick={() => openApp(app.id)}
                    />
                ))}
            </div>
        </div>
    );
}
