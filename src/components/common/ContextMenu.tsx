"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useOSStore } from "@/store/useOSStore";
import * as Icons from "lucide-react";

export default function ContextMenu() {
    const { contextMenu, hideContextMenu } = useOSStore();
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (contextMenu.isOpen && menuRef.current) {
            const menuWidth = 180;
            const menuHeight = contextMenu.items.length * 36 + 12; // 패딩 포함 대략적 계산

            let x = contextMenu.x;
            let y = contextMenu.y;

            // 화면 오른쪽 경계 체크
            if (x + menuWidth > window.innerWidth) {
                x = x - menuWidth;
            }

            // 화면 하단 경계 체크
            if (y + menuHeight > window.innerHeight) {
                y = y - menuHeight;
            }

            setAdjustedPos({ x, y });
        }
    }, [contextMenu.isOpen, contextMenu.x, contextMenu.y, contextMenu.items.length]);

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenu.isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                hideContextMenu();
            }
        };

        if (contextMenu.isOpen) {
            window.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("contextmenu", hideContextMenu); // 다른 곳 우클릭 시 현재 메뉴 닫기
        }

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("contextmenu", hideContextMenu);
        };
    }, [contextMenu.isOpen, hideContextMenu]);

    if (!contextMenu.isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="fixed z-[9999] min-w-[180px] glass rounded-xl shadow-2xl border border-white/20 p-1.5 backdrop-blur-2xl bg-white/70 overflow-hidden"
                style={{
                    left: adjustedPos.x,
                    top: adjustedPos.y,
                }}
            >
                <div className="flex flex-col gap-0.5">
                    {contextMenu.items.map((item, index) => {
                        const IconComponent = item.iconName ? (Icons as any)[item.iconName] : null;

                        return (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.onClick();
                                    if (item.closeOnClick !== false) {
                                        hideContextMenu();
                                    }
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all active:scale-95 group
                                    ${item.isDanger
                                        ? 'hover:bg-red-500/10 text-red-600'
                                        : 'hover:bg-black/5 text-black/80 hover:text-black'
                                    }
                                `}
                            >
                                {IconComponent && (
                                    <IconComponent size={16} strokeWidth={2} className={`${item.isDanger ? 'text-red-500' : 'text-black/50 group-hover:text-black/80'}`} />
                                )}
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
