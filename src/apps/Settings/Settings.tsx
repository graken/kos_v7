"use client";

import { useOSStore } from '@/store/useOSStore';
import { Smartphone, LayoutGrid, Palette, Info } from 'lucide-react';
import { useState } from 'react';
import { useDevice } from '@/hooks/useDevice';

export default function Settings() {
    const { desktopGridSettings, mobileGridSettings, updateGridSettings, resetGridSettings } = useOSStore();
    const { isMobile } = useDevice();
    const [activeTab, setActiveTab] = useState('icons');

    const gridSettings = isMobile ? mobileGridSettings : desktopGridSettings;
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const menuItems = [
        { id: 'icons', label: '아이콘', icon: <LayoutGrid size={18} /> },
        { id: 'display', label: '디스플레이', icon: <Smartphone size={18} /> },
        { id: 'appearance', label: '개인 설정', icon: <Palette size={18} /> },
        { id: 'about', label: '정보', icon: <Info size={18} /> },
    ];

    return (
        <div className="flex h-full w-full overflow-hidden text-black/80">
            {/* Sidebar */}
            <div className={`${isMobile ? 'w-32' : 'w-48'} bg-black/5 border-r border-black/5 flex flex-col p-2 gap-1 shrink-0`}>
                <h2 className={`px-3 py-4 ${isMobile ? 'text-sm' : 'text-lg'} font-bold truncate`}>Settings</h2>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center ${isMobile ? 'gap-2 px-2 py-2' : 'gap-3 px-3 py-2'} rounded-lg transition-colors text-xs font-medium
              ${activeTab === item.id
                                ? 'bg-white/60 shadow-sm ring-1 ring-black/5'
                                : 'hover:bg-black/5'
                            }
            `}
                    >
                        <div className={isMobile ? 'scale-90' : ''}>{item.icon}</div>
                        <span className="truncate">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white/20 p-8 overflow-auto">
                {activeTab === 'icons' && (
                    <div className="max-w-md flex flex-col gap-8">
                        <section>
                            <h3 className="text-xl font-bold mb-6">아이콘 설정</h3>

                            <div className="flex flex-col gap-6">
                                {/* Icon Size */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold">아이콘 크기</label>
                                        <span className="text-xs font-mono bg-black/5 px-2 py-1 rounded">{gridSettings.iconSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="48"
                                        max="300"
                                        step="2"
                                        value={gridSettings.iconSize}
                                        onChange={(e) => updateGridSettings({ iconSize: parseInt(e.target.value) }, deviceType)}
                                        className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-black/40 px-1">
                                        <span>작게</span>
                                        <span>중간</span>
                                        <span>아주 크게</span>
                                    </div>
                                </div>

                                {/* Gap X */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold">좌우 여백 (Gap X)</label>
                                        <span className="text-xs font-mono bg-black/5 px-2 py-1 rounded">{gridSettings.gapX}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        step="2"
                                        value={gridSettings.gapX}
                                        onChange={(e) => updateGridSettings({ gapX: parseInt(e.target.value) }, deviceType)}
                                        className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Gap Y */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold">상하 여백 (Gap Y)</label>
                                        <span className="text-xs font-mono bg-black/5 px-2 py-1 rounded">{gridSettings.gapY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        step="2"
                                        value={gridSettings.gapY}
                                        onChange={(e) => updateGridSettings({ gapY: parseInt(e.target.value) }, deviceType)}
                                        className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </section>

                        <button
                            onClick={() => resetGridSettings(deviceType)}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold mt-2"
                        >
                            기본값으로 초기화
                        </button>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                아이콘 설정을 변경하면 바탕화면의 앱 그리드가 실시간으로 업데이트되며, 이 설정은 브라우저에 자동으로 저장됩니다.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab !== 'icons' && (
                    <div className="h-full flex flex-col items-center justify-center text-black/30 italic">
                        <LayoutGrid size={48} className="mb-4 opacity-10" />
                        <p>준비 중인 설정입니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
