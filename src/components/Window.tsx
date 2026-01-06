"use client";

import { motion } from 'framer-motion';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useOSStore, WindowState } from '@/store/useOSStore';
import { useEffect, useRef, useState } from 'react';
import Settings from '@/apps/Settings';

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

    const STATUS_BAR_HEIGHT = 32;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging && !resizeDir) return;

            const deltaX = e.clientX - startMousePos.current.x;
            const deltaY = e.clientY - startMousePos.current.y;

            if (isDragging) {
                updateWindowDimensions(windowData.id, {
                    x: startWindowDim.current.x + deltaX,
                    y: Math.max(STATUS_BAR_HEIGHT, startWindowDim.current.y + deltaY) // 상단바 침범 방지
                });
            } else if (resizeDir) {
                let { x, y, width, height } = startWindowDim.current;

                if (resizeDir.includes('e')) width = Math.max(MIN_WIDTH, startWindowDim.current.width + deltaX);
                if (resizeDir.includes('s')) height = Math.max(MIN_HEIGHT, startWindowDim.current.height + deltaY);

                if (resizeDir.includes('w')) {
                    const newWidth = startWindowDim.current.width - deltaX;
                    if (newWidth >= MIN_WIDTH) {
                        width = newWidth;
                        x = startWindowDim.current.x + deltaX;
                    } else {
                        width = MIN_WIDTH;
                        x = startWindowDim.current.x + (startWindowDim.current.width - MIN_WIDTH);
                    }
                }

                if (resizeDir.includes('n')) {
                    const requestedY = startWindowDim.current.y + deltaY;
                    const clampedY = Math.max(STATUS_BAR_HEIGHT, requestedY); // 상단바 침범 방지
                    const actualDeltaY = clampedY - startWindowDim.current.y;
                    const newHeight = startWindowDim.current.height - actualDeltaY;

                    if (newHeight >= MIN_HEIGHT) {
                        height = newHeight;
                        y = clampedY;
                    } else {
                        height = MIN_HEIGHT;
                        y = startWindowDim.current.y + (startWindowDim.current.height - MIN_HEIGHT);
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

    // if (windowData.isMinimized) return null; // 삭제: 애니메이션을 위해 렌더링 유지

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{
                opacity: windowData.isMinimized ? 0 : 1,
                scale: windowData.isMinimized ? 0.8 : (isDragging ? 1.02 : 1),
                y: 0, // initial의 y: 100을 상쇄하여 정확한 좌표(top)에 배치
                boxShadow: isDragging || resizeDir
                    ? "0 30px 60px -12px rgba(0, 0, 0, 0.4)"
                    : isFocused ? "0 20px 40px -12px rgba(0, 0, 0, 0.25)" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                // Position and Size properties for animations
                left: windowData.x,
                top: windowData.isMinimized ? window.innerHeight : windowData.y,
                width: windowData.width,
                height: windowData.height,
            }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            transition={{
                // 드래그나 리사이징 중일 때는 애니메이션 없이 즉각 반응 (사용자 조작감 보존)
                // 최대화/복원 시에만 젤리 같은 스프링 효과 적용
                type: (isDragging || resizeDir) ? "tween" : "spring",
                duration: (isDragging || resizeDir) ? 0 : undefined,
                stiffness: 300,
                damping: 20,
                mass: 0.8,
                bounce: (isDragging || resizeDir) ? 0 : 0.4,
                opacity: { duration: 0.2 },
                left: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                top: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                width: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                height: (isDragging || resizeDir) ? { duration: 0 } : undefined,
            }}
            style={{
                zIndex: windowData.zIndex,
                position: 'fixed',
                borderRadius: windowData.isMaximized ? 0 : '0.75rem',
                pointerEvents: windowData.isMinimized ? 'none' : 'auto',
            }}
            onMouseDown={() => focusApp(windowData.id)}
            className={`flex flex-col overflow-hidden relative
        ${isFocused ? 'ring-1 ring-blue-500/30 shadow-2xl' : 'ring-1 ring-black/5 shadow-lg'}
      `}
        >
            <div className={`absolute inset-0 -z-10 glass ${isFocused ? 'bg-white' : 'bg-white/75'}`} />
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
            <div className="flex-1 overflow-auto pointer-events-auto">
                {windowData.id === 'settings' ? (
                    <Settings />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-black/20">
                        <p className="text-lg font-medium">KOS v7 Application</p>
                        <p className="text-sm italic">{windowData.title}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
