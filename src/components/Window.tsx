"use client";

import { motion } from 'framer-motion';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useOSStore, WindowState } from '@/store/useOSStore';
import { useEffect, useRef, useState, memo, useMemo } from 'react';
import { APP_REGISTRY } from '@/apps/registry';

interface WindowProps {
    id: string;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const Window = memo(function Window({ id }: WindowProps) {
    const closeApp = useOSStore(state => state.closeApp);
    const focusApp = useOSStore(state => state.focusApp);
    const minimizeApp = useOSStore(state => state.minimizeApp);
    const maximizeApp = useOSStore(state => state.maximizeApp);
    const updateWindowDimensions = useOSStore(state => state.updateWindowDimensions);
    const focusedWindowId = useOSStore(state => state.focusedWindowId);

    const windowData = useOSStore(state => state.windows[id]);
    const isFocused = focusedWindowId === id;

    const AppComponent = useMemo(() => {
        if (!id) return null;
        return APP_REGISTRY[id]?.component;
    }, [id]);

    const renderedContent = useMemo(() => {
        if (!windowData) return null;
        if (AppComponent) return <AppComponent key={id} />;
        return (
            <div className="h-full flex flex-col items-center justify-center text-black/20">
                <p className="text-lg font-medium">KOS v7 Application</p>
                <p className="text-sm italic">{windowData.title}</p>
            </div>
        );
    }, [id, AppComponent, windowData]);

    const [isDragging, setIsDragging] = useState(false);
    const [resizeDir, setResizeDir] = useState<ResizeDirection | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const startMousePos = useRef({ x: 0, y: 0 });
    const startWindowDim = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const MIN_WIDTH = 300;
    const MIN_HEIGHT = 200;

    const isFixedSize = !windowData?.config?.resizable;
    const hideMaximize = !windowData?.config?.maximizable;

    const handleDragStart = (e: React.MouseEvent) => {
        if (!windowData || windowData.isMaximized) return;
        setIsDragging(true);
        focusApp(id);
        startMousePos.current = { x: e.clientX, y: e.clientY };
        startWindowDim.current = { x: windowData.x, y: windowData.y, width: windowData.width, height: windowData.height };
        e.preventDefault();
    };

    const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
        if (!windowData || windowData.isMaximized || isFixedSize) return;
        setResizeDir(direction);
        focusApp(id);
        startMousePos.current = { x: e.clientX, y: e.clientY };
        startWindowDim.current = { x: windowData.x, y: windowData.y, width: windowData.width, height: windowData.height };
        e.stopPropagation();
        e.preventDefault();
    };

    const STATUS_BAR_HEIGHT = 32;

    // 최대화/복원 시 애니메이션 부하를 줄이기 위해 콘텐츠 일시 숨김
    useEffect(() => {
        if (!windowData) return;
        setIsTransitioning(true);
        const timer = setTimeout(() => setIsTransitioning(false), 300);
        return () => clearTimeout(timer);
    }, [windowData?.isMaximized]);

    useEffect(() => {
        if (!windowData) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging && !resizeDir) return;

            const deltaX = e.clientX - startMousePos.current.x;
            const deltaY = e.clientY - startMousePos.current.y;

            if (isDragging) {
                updateWindowDimensions(id, {
                    x: startWindowDim.current.x + deltaX,
                    y: Math.max(STATUS_BAR_HEIGHT, startWindowDim.current.y + deltaY)
                });
            } else if (resizeDir && !isFixedSize) {
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
                    const clampedY = Math.max(STATUS_BAR_HEIGHT, requestedY);
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

                updateWindowDimensions(id, { x, y, width, height });
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
    }, [isDragging, resizeDir, id, updateWindowDimensions, isFixedSize, windowData]);

    if (!windowData) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{
                opacity: windowData.isMinimized ? 0 : 1,
                scale: windowData.isMinimized ? 0.8 : (isDragging ? 1.01 : 1),
                x: windowData.x,
                y: windowData.isMinimized ? (typeof window !== 'undefined' ? window.innerHeight : 1000) : windowData.y,
                width: windowData.width,
                height: windowData.height,
                boxShadow: (isDragging || resizeDir)
                    ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                    : isFocused ? "0 20px 40px -12px rgba(0, 0, 0, 0.25)" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            transition={{
                type: (isDragging || resizeDir) ? "tween" : "spring",
                duration: (isDragging || resizeDir) ? 0 : undefined,
                stiffness: 400,
                damping: 30,
                mass: 0.8,
                bounce: (isDragging || resizeDir) ? 0 : 0.4,
                opacity: { duration: 0.2 },
                x: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                y: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                width: (isDragging || resizeDir) ? { duration: 0 } : undefined,
                height: (isDragging || resizeDir) ? { duration: 0 } : undefined,
            }}
            style={{
                zIndex: windowData.zIndex,
                position: 'fixed',
                left: 0,
                top: 0,
                borderRadius: windowData.isMaximized ? 0 : '0.75rem',
                pointerEvents: windowData.isMinimized ? 'none' : 'auto',
                willChange: (isDragging || resizeDir) ? 'transform, width, height' : 'auto',
            }}
            onMouseDown={() => focusApp(id)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            className={`flex flex-col overflow-hidden relative
        ${isFocused ? 'ring-1 ring-blue-500/30 shadow-2xl' : 'ring-1 ring-black/5 shadow-lg'}
      `}
        >
            <div className={`absolute inset-0 -z-10 ${(isDragging || resizeDir) ? 'bg-white shadow-sm' : 'glass ' + (isFocused ? 'bg-white' : 'bg-white/75')}`} />

            {(isDragging || resizeDir) && (
                <div className="absolute top-9 inset-x-0 bottom-0 z-[100] cursor-grabbing" />
            )}

            {!windowData.isMaximized && !isFixedSize && (
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

            <div
                onMouseDown={handleDragStart}
                onDoubleClick={() => !hideMaximize && maximizeApp(id)}
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
                            minimizeApp(id);
                        }}
                    >
                        <Minus size={14} className="text-black/70" />
                    </button>
                    {!hideMaximize && (
                        <button
                            className="flex items-center justify-center w-11 h-full hover:bg-black/10 transition-colors group"
                            onClick={(e) => {
                                e.stopPropagation();
                                maximizeApp(id);
                            }}
                        >
                            {windowData.isMaximized ? <Copy size={11} className="text-black/70 -rotate-90" /> : <Square size={12} className="text-black/70" />}
                        </button>
                    )}
                    <button
                        className="flex items-center justify-center w-11 h-full hover:bg-red-500 transition-colors group"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeApp(id);
                        }}
                    >
                        <X size={16} className="text-black/70 group-hover:text-white" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto pointer-events-auto bg-white relative">
                {/* 콘텐츠 본체: 스크롤 유지를 위해 항상 렌더링하되 조작 중에는 숨김 처리 */}
                <div className={`h-full ${(isDragging || resizeDir || isTransitioning) ? 'opacity-0' : 'opacity-100'}`}>
                    {renderedContent}
                </div>

                {/* 가림막: 조작 중에는 불투명한 배경으로 덮어 렌더링 부하 최소화 */}
                {(isDragging || resizeDir || isTransitioning) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="flex flex-col items-center gap-2 text-black/10 select-none">
                            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{windowData.title}</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

export default Window;
