"use client";

import { motion } from 'framer-motion';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useOSStore, WindowState } from '@/store/useOSStore';
import { useEffect, useRef, useState } from 'react';

interface WindowProps {
    window: WindowState;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export default function Window({ window: windowData }: WindowProps) {
    const { closeApp, focusApp, minimizeApp, maximizeApp, updateWindowDimensions, focusedWindowId } = useOSStore();
    const isFocused = focusedWindowId === windowData.id;

    const [isDragging, setIsDragging] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection | null>(null);

    const startMousePos = useRef({ x: 0, y: 0 });
    const startWindowDim = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const MIN_WIDTH = 300;
    const MIN_HEIGHT = 200;

    const handleDragStart = (e: React.MouseEvent) => {
        if (windowData.isMaximized) return; // 최대화 상태에선 드래그 불가
        setIsDragging(true);
        focusApp(windowData.id);
        startMousePos.current = { x: e.clientX, y: e.clientY };
        startWindowDim.current = { x: windowData.x, y: windowData.y, width: windowData.width, height: windowData.height };
        e.preventDefault();
    };

    const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
        if (windowData.isMaximized) return; // 최대화 상태에선 리사이징 불가
        setResizeDir(direction);
        focusApp(windowData.id);
        startMousePos.current = { x: e.clientX, y: e.clientY };
        startWindowDim.current = { x: windowData.x, y: windowData.y, width: windowData.width, height: windowData.height };
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging && !resizeDir) return;

            const deltaX = e.clientX - startMousePos.current.x;
            const deltaY = e.clientY - startMousePos.current.y;

            if (isDragging) {
                updateWindowDimensions(windowData.id, {
                    x: startWindowDim.current.x + deltaX,
                    y: startWindowDim.current.y + deltaY
                });
            } else if (resizeDir) {
                let { x, y, width, height } = startWindowDim.current;

                if (resizeDir.includes('e')) width = Math.max(MIN_WIDTH, startWindowDim.current.width + deltaX);
                if (resizeDir.includes('s')) height = Math.max(MIN_HEIGHT, startWindowDim.current.height + deltaY);

                if (resizeDir.includes('w')) {
                    const newWidth = Math.max(MIN_WIDTH, startWindowDim.current.width - deltaX);
                    if (newWidth !== MIN_WIDTH) {
                        width = newWidth;
                        x = startWindowDim.current.x + deltaX;
                    }
                }

                if (resizeDir.includes('n')) {
                    const newHeight = Math.max(MIN_HEIGHT, startWindowDim.current.height - deltaY);
                    if (newHeight !== MIN_HEIGHT) {
                        height = newHeight;
                        y = startWindowDim.current.y + deltaY;
                    }
                }

                updateWindowDimensions(windowData.id, { x, y, width, height });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setResizeDir(null);
        };

        if (isDragging || resizeDir) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeDir, windowData.id, updateWindowDimensions]);

    if (windowData.isMinimized) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
                opacity: 1,
                scale: isDragging ? 1.02 : 1,
                y: 0,
                boxShadow: isDragging || resizeDir
                    ? "0 30px 60px -12px rgba(0, 0, 0, 0.4)"
                    : isFocused ? "0 20px 40px -12px rgba(0, 0, 0, 0.25)" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
                // 크기/위치 변경은 즉각적으로 (인라인 스타일), 나머지는 애니메이션
            }}
            style={{
                zIndex: windowData.zIndex,
                position: 'fixed',
                left: windowData.x,
                top: windowData.y,
                width: windowData.width,
                height: windowData.height,
                borderRadius: windowData.isMaximized ? 0 : '0.75rem', // 최대화 시 라운드 해제
            }}
            onMouseDown={() => focusApp(windowData.id)}
            className={`flex flex-col overflow-hidden bg-white/45 glass transition-[border-radius]
        ${isFocused ? 'ring-1 ring-blue-500/30' : 'ring-1 ring-black/5'}
      `}
        >
            {/* Resizing Handles (Hidden if maximized) */}
            {!windowData.isMaximized && (
                <>
                    <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-50" />
                    <div onMouseDown={(e) => handleResizeStart(e, 's')} className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'e')} className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize z-50" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize z-50" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[60]" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[60]" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[60]" />
                    <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[60]" />
                </>
            )}

            {/* Title Bar - Drag Handle */}
            <div
                onMouseDown={handleDragStart}
                onDoubleClick={() => maximizeApp(windowData.id)} // 더블클릭 시 최대화 토글
                className="h-9 flex items-center justify-between bg-black/[0.02] border-b border-black/5 select-none cursor-default active:cursor-grabbing shrink-0"
            >
                <div className="flex items-center gap-2 px-3 pointer-events-none">
                    <div className="w-4 h-4 rounded-sm bg-black/10 flex items-center justify-center">
                        <div className="w-2 h-2 bg-black/40 rounded-full" />
                    </div>
                    <span className="text-xs font-semibold text-black/70">{windowData.title}</span>
                </div>

                <div className="flex h-full">
                    <button
                        className="flex items-center justify-center w-11 h-full hover:bg-black/10 transition-colors group"
                        onClick={(e) => {
                            e.stopPropagation();
                            minimizeApp(windowData.id);
                        }}
                    >
                        <Minus size={14} className="text-black/70" />
                    </button>
                    <button
                        className="flex items-center justify-center w-11 h-full hover:bg-black/10 transition-colors group"
                        onClick={(e) => {
                            e.stopPropagation();
                            maximizeApp(windowData.id);
                        }}
                    >
                        {windowData.isMaximized ? <Copy size={11} className="text-black/70 -rotate-90" /> : <Square size={12} className="text-black/70" />}
                    </button>
                    <button
                        className="flex items-center justify-center w-11 h-full hover:bg-red-500 transition-colors group"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeApp(windowData.id);
                        }}
                    >
                        <X size={16} className="text-black/70 group-hover:text-white" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-auto pointer-events-none">
                <div className="h-full flex flex-col items-center justify-center text-black/20">
                    <p className="text-lg font-medium">KOS v7 Application</p>
                    <p className="text-sm italic">{windowData.title}</p>
                </div>
            </div>
        </motion.div>
    );
}
