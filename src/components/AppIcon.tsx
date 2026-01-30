"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useOSStore, INSTALLED_APP_IDS } from '@/store/useOSStore';
import { useDevice } from '@/hooks/useDevice';

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
    const {
        desktopGridSettings,
        mobileGridSettings,
        showContextMenu,
        openApp,
        removeApp,
        updateApp,
        setEditingAppId,
        apps,
        desktopTextColor,
        iconBgColor,
        iconGlyphColor
    } = useOSStore();
    const { isMobile } = useDevice();
    const gridSettings = isMobile ? mobileGridSettings : desktopGridSettings;

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isMobile) return;

        e.preventDefault();
        e.stopPropagation();

        const handleEdit = () => {
            setEditingAppId(id);
            openApp('app-editor');
        };

        showContextMenu(e.clientX, e.clientY, [
            { label: '앱 열기', iconName: 'Play', onClick: () => openApp(id) },
            { label: '앱 정보', iconName: 'Info', onClick: () => console.log(`${name} 정보`) },
            { label: '편집', iconName: 'Edit', onClick: handleEdit },
            { label: '메인 화면에서 제거', iconName: 'Trash2', isDanger: true, onClick: () => removeApp(id) },
        ]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // 테마 컬러 매핑 (Tailwind 클래스 대응)
    const getTextColorClass = () => {
        if (desktopTextColor === 'white') return 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]';
        return 'text-black/80';
    };

    const getIconBgStyle = () => {
        const isHex = iconBgColor?.startsWith('#') || iconBgColor?.startsWith('rgb');
        // Tailwind 색상명인 경우 인라인 스타일로 처리하지 않음 (클래스로 처리)
        if (!isHex && iconBgColor && !iconBgColor.includes('-')) {
            return { backgroundColor: iconBgColor }; // 'white', 'black' 등 처리
        }
        if (isHex) return { backgroundColor: iconBgColor };
        return {};
    };

    const getIconGlyphStyle = () => {
        const isHex = iconGlyphColor?.startsWith('#') || iconGlyphColor?.startsWith('rgb');
        if (isHex) return { color: iconGlyphColor };
        return {};
    };

    const getIconGlyphClass = () => {
        const isHex = iconGlyphColor?.startsWith('#') || iconGlyphColor?.startsWith('rgb');
        if (isHex) return '';
        if (iconGlyphColor?.startsWith('text-')) return iconGlyphColor;
        return `text-${iconGlyphColor || 'blue-600'}`;
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
            onContextMenu={handleContextMenu}
            className={`flex flex-col items-center cursor-grab active:cursor-grabbing group transition-colors relative focus:outline-none ${isDragging ? 'bg-black/5' : ''}`}
            style={{
                width: `${gridSettings.iconSize + 8}px`,
                height: `${gridSettings.iconSize + 8}px`
            }}
        >
            <div
                className={`relative rounded-2xl flex items-center justify-center shadow-lg pointer-events-none transition-all group-hover:shadow-black/10 mt-1 backdrop-blur-md ${iconBgColor?.startsWith('#') ? '' : `bg-${iconBgColor || 'white'}/80`}`}
                style={{
                    width: `${gridSettings.iconSize}px`,
                    height: `${gridSettings.iconSize}px`,
                    ...getIconBgStyle()
                }}
            >
                <div
                    style={{
                        transform: `scale(${gridSettings.iconSize / 80})`,
                        ...getIconGlyphStyle()
                    }}
                    className={`flex items-center justify-center transition-colors ${getIconGlyphClass()}`}
                >
                    {icon}
                </div>
                {isActive && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
                )}
            </div>

            <span className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs md:text-sm font-bold text-center pointer-events-none whitespace-nowrap transition-colors ${getTextColorClass()}`}>
                {name}
            </span>
        </motion.div>
    );
}
