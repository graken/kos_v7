"use client";

import { useState, useEffect } from 'react';
import AppIcon from './AppIcon';
import { useOSStore } from '@/store/useOSStore';
import { APP_REGISTRY } from '@/apps/registry';
import { useDevice } from '@/hooks/useDevice';
import { useShallow } from 'zustand/react/shallow';
import {
    Settings, Folder, Image as ImageIcon, MessageSquare, Globe, Mail, Calculator,
    Type, Link, Play, Info, Edit, Trash2, ArrowLeft, Activity, Droplets,
    Music, Video, Camera, Headphones, Hammer, Wrench, Search, Zap, Clock, Calendar,
    BarChart, PieChart, TrendingUp, Briefcase, FileText, Users, User, Phone, Share2,
    Heart, Star, Cloud, Sun, Moon, Map, GraduationCap, Laptop, Smartphone,
    Code, Brackets, Terminal, Cpu, Database, CloudRain, Wind, Flame, Anchor,
    Target, CircleDot, Orbit, Disc
} from 'lucide-react';

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
    Droplets: <Droplets size={32} />,
    Music: <Music size={32} />,
    Video: <Video size={32} />,
    Camera: <Camera size={32} />,
    Headphones: <Headphones size={32} />,
    Hammer: <Hammer size={32} />,
    Wrench: <Wrench size={32} />,
    Search: <Search size={32} />,
    Zap: <Zap size={32} />,
    Clock: <Clock size={32} />,
    Calendar: <Calendar size={32} />,
    BarChart: <BarChart size={32} />,
    PieChart: <PieChart size={32} />,
    TrendingUp: <TrendingUp size={32} />,
    Briefcase: <Briefcase size={32} />,
    FileText: <FileText size={32} />,
    Users: <Users size={32} />,
    User: <User size={32} />,
    Phone: <Phone size={32} />,
    Share2: <Share2 size={32} />,
    Heart: <Heart size={32} />,
    Star: <Star size={32} />,
    Cloud: <Cloud size={32} />,
    Sun: <Sun size={32} />,
    Moon: <Moon size={32} />,
    Map: <Map size={32} />,
    GraduationCap: <GraduationCap size={32} />,
    Laptop: <Laptop size={32} />,
    Smartphone: <Smartphone size={32} />,
    Code: <Code size={32} />,
    Brackets: <Brackets size={32} />,
    Terminal: <Terminal size={32} />,
    Cpu: <Cpu size={32} />,
    Database: <Database size={32} />,
    CloudRain: <CloudRain size={32} />,
    Wind: <Wind size={32} />,
    Flame: <Flame size={32} />,
    Anchor: <Anchor size={32} />,
    Target: <Target size={32} />,
    CircleDot: <CircleDot size={32} />,
    Orbit: <Orbit size={32} />,
    Disc: <Disc size={32} />,
};

export default function HomeGrid() {
    const apps = useOSStore(state => state.apps);
    const reorderApps = useOSStore(state => state.reorderApps);
    const openApp = useOSStore(state => state.openApp);
    const openAppIds = useOSStore(useShallow(state => Object.keys(state.windows)));
    const desktopGridSettings = useOSStore(state => state.desktopGridSettings);
    const mobileGridSettings = useOSStore(state => state.mobileGridSettings);
    const hasHydrated = useOSStore(state => state.hasHydrated);

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
                {apps
                    .filter(app => !APP_REGISTRY[app.id]?.isHidden)
                    .map((app, index) => (
                        <AppIcon
                            key={app.id}
                            id={app.id}
                            index={index}
                            name={app.name}
                            icon={ICON_MAP[app.iconName]}
                            isDragging={draggedIndex === index}
                            isActive={openAppIds.includes(app.id)}
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
