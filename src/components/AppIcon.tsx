"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useOSStore } from '@/store/useOSStore';

interface AppIconProps {
    id: string;
    name: string;
    icon: ReactNode;
    index: number;
    isDragging?: boolean;
    isActive?: boolean;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onClick?: () => void;
}

export default function AppIcon({
    id,
    name,
    icon,
    index,
    isDragging,
    isActive,
    onDragStart,
    onDragEnter,
    onDragEnd,
    onClick
}: AppIconProps) {
    const { gridSettings } = useOSStore();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isDragging ? 0.05 : 1,
                scale: isDragging ? 1 : 1
            }}
            whileHover={{ scale: isDragging ? 1.05 : 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                layout: { duration: 0.35, ease: "easeInOut" }
            }}
            draggable
            onDragStart={(e) => onDragStart(e as any, index)}
            onDragEnter={(e) => onDragEnter(e as any, index)}
            onDragOver={handleDragOver as any}
            onDragEnd={onDragEnd as any}
            onClick={onClick}
            className={`flex flex-col items-center cursor-grab active:cursor-grabbing group border border-red-500/30 border-dashed rounded-xl transition-colors relative ${isDragging ? 'bg-black/5' : ''}`}
            style={{
                width: `${gridSettings.iconSize + 8}px`,
                height: `${gridSettings.iconSize + 8}px` // 아이콘 상자 크기에 맞춰 고정
            }}
        >
            <div
                className="relative glass rounded-2xl flex items-center justify-center text-black/70 shadow-lg pointer-events-none transition-shadow group-hover:shadow-black/10 mt-1"
                style={{ width: `${gridSettings.iconSize}px`, height: `${gridSettings.iconSize}px` }}
            >
                <div style={{ transform: `scale(${gridSettings.iconSize / 80})` }} className="flex items-center justify-center">
                    {icon}
                </div>
                {isActive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
                )}
            </div>

            {/* 라벨을 절대 위치로 배치하여 그리드 정렬에 영향을 주지 않게 함 */}
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-black/80 text-xs md:text-sm font-bold drop-shadow-sm text-center pointer-events-none whitespace-nowrap">
                {name}
            </span>
        </motion.div>
    );
}
