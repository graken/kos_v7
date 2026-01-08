"use client";

import { useState, useEffect } from 'react';
import AppIcon from './AppIcon';
import { useOSStore } from '@/store/useOSStore';
import { useDevice } from '@/hooks/useDevice';
import { Settings, Folder, Image as ImageIcon, MessageSquare, Globe, Mail, Calculator, Type, Link, Play, Info, Edit, Trash2, ArrowLeft, Activity } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
    Globe: <Globe size={32} />,
    Folder: <Folder size={32} />,
    ImageIcon: <ImageIcon size={32} />,
    MessageSquare: <MessageSquare size={32} />,
    Mail: <Mail size={32} />,
    Settings: <Settings size={32} />,
    Calculator: <Calculator size={32} />,
    Type: <Type size={32} />,
    Link: <Link size={32} />,
    Play: <Play size={32} />,
    Info: <Info size={32} />,
    Edit: <Edit size={32} />,
    Trash2: <Trash2 size={32} />,
    ArrowLeft: <ArrowLeft size={32} />,
    Activity: <Activity size={32} />,
};

export default function HomeGrid() {
    const { apps, reorderApps, openApp, windows, desktopGridSettings, mobileGridSettings, hasHydrated } = useOSStore();
    const { isMobile } = useDevice();
    const gridSettings = isMobile ? mobileGridSettings : desktopGridSettings;
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !hasHydrated) return null; // 서버-클라이언트 불일치 및 하이드레이션 전 렌더링 방지

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
            className="absolute inset-0 pt-16 px-6 md:px-12 pb-24 overflow-y-auto scrollbar-hide"
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
        >

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
