"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AppIconProps {
    id: string;
    name: string;
    icon: ReactNode;
    index: number;
    isDragging?: boolean;
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
    onDragStart,
    onDragEnter,
    onDragEnd,
    onClick
}: AppIconProps) {
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
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing group border border-red-500/30 border-dashed p-1 rounded-xl w-full aspect-square transition-colors ${isDragging ? 'bg-black/5' : ''}`}
        >
            <div className="w-16 h-16 md:w-20 md:h-20 glass rounded-2xl flex items-center justify-center text-black/70 shadow-lg pointer-events-none transition-shadow group-hover:shadow-black/10">
                {icon}
            </div>
            <span className="text-black/80 text-xs md:text-sm font-bold drop-shadow-sm text-center pointer-events-none">
                {name}
            </span>
        </motion.div>
    );
}
