"use client";

import { useState } from 'react';
import AppIcon from './AppIcon';
import { useOSStore } from '@/store/useOSStore';
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
    const { apps, reorderApps } = useOSStore();
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
            className="w-full h-full pt-16 px-6 md:px-12 relative"
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
        >
            {/* 실제 그리드 배경 가이드 */}
            <div className="absolute inset-0 pt-16 px-6 md:px-12 pointer-events-none -z-10">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 max-w-7xl mx-auto h-full">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="aspect-square border border-black/10 rounded-2xl bg-black/[0.03]" />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 max-w-7xl mx-auto border border-blue-500/30 relative place-items-center">
                {apps.map((app, index) => (
                    <AppIcon
                        key={app.id}
                        id={app.id}
                        index={index}
                        name={app.name}
                        icon={ICON_MAP[app.iconName]}
                        isDragging={draggedIndex === index}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </div>
        </div>
    );
}
