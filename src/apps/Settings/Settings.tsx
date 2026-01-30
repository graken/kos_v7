"use client";

import { useOSStore } from '@/store/useOSStore';
import { Smartphone, LayoutGrid, Palette, Info, Shield, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDevice } from '@/hooks/useDevice';

export default function Settings() {
    const { currentUser, desktopGridSettings, mobileGridSettings, updateGridSettings, resetGridSettings, updateTheme, wallpaper, desktopTextColor, iconBgColor, iconGlyphColor } = useOSStore();
    const { isMobile } = useDevice();
    const [activeTab, setActiveTab] = useState('icons');

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityError, setSecurityError] = useState<string | null>(null);
    const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const gridSettings = isMobile ? mobileGridSettings : desktopGridSettings;
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const menuItems = [
        { id: 'icons', label: '아이콘', icon: <LayoutGrid size={18} /> },
        { id: 'display', label: '디스플레이', icon: <Smartphone size={18} /> },
        { id: 'appearance', label: '개인 설정', icon: <Palette size={18} /> },
        { id: 'security', label: '보안', icon: <Shield size={18} /> },
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

                {activeTab === 'appearance' && (
                    <div className="max-w-2xl flex flex-col gap-10">
                        <section>
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <Palette size={24} className="text-blue-500" />
                                배경화면 설정
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                {[
                                    { name: '기본 그라디언트', value: 'radial-gradient(circle at top, #f3f4f6 0%, #d1d5db 100%)' },
                                    { name: '오션 블루', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                                    { name: '미드나잇 퓨어', value: 'linear-gradient(to right, #243b55, #141e30)' },
                                    { name: '선셋 로즈', value: 'linear-gradient(45deg, #ee9ca7 0%, #ffdde1 100%)' },
                                    { name: '딥 포레스트', value: 'linear-gradient(to top, #134e5e, #71b280)' },
                                    { name: '코스믹 퍼플', value: 'radial-gradient(circle at center, #200122, #6f0000)' },
                                ].map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => updateTheme({ wallpaper: preset.value })}
                                        className={`group relative aspect-video rounded-2xl overflow-hidden border-2 transition-all ${wallpaper === preset.value ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-transparent hover:border-black/10'
                                            }`}
                                    >
                                        <div className="absolute inset-0" style={{ background: preset.value }} />
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[10px] text-white font-bold leading-none">{preset.name}</p>
                                        </div>
                                        {wallpaper === preset.value && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                                <Info size={12} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-black/5 p-6 rounded-[32px] border border-black/5">
                                <label className="text-sm font-black mb-3 block">커스텀 이미지 URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://example.com/image.jpg"
                                        className="flex-1 px-5 py-3 bg-white rounded-2xl border border-black/10 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                updateTheme({ wallpaper: `url(${e.currentTarget.value})` });
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            updateTheme({ wallpaper: `url(${input.value})` });
                                        }}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-colors"
                                    >
                                        적용
                                    </button>
                                </div>
                                <p className="text-[10px] text-black/40 mt-3 font-medium">이미지 주소를 입력하고 엔터 또는 적용 버튼을 눌러주세요.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xl font-black mb-6">시스템 색상 및 가독성</h3>

                            <div className="flex flex-col gap-8">
                                {/* Desktop Text Color */}
                                <div className="flex flex-col gap-4">
                                    <label className="text-sm font-black text-black/60">바탕화면 글자 색상</label>
                                    <div className="flex gap-3">
                                        {[
                                            { name: '어두운 텍스트', value: 'black', class: 'bg-black' },
                                            { name: '밝은 텍스트', value: 'white', class: 'bg-white border border-black/10' },
                                        ].map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => updateTheme({ desktopTextColor: color.value })}
                                                className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all ${desktopTextColor === color.value ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-black/5 hover:bg-black/10'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full ${color.class}`} />
                                                <span className="text-xs font-bold">{color.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-black/40 font-medium leading-relaxed">배경화면이 밝을 때는 어두운 텍스트를, 어두울 때는 밝은 텍스트를 선택해 주세요.</p>
                                </div>

                                {/* Icon Background Color */}
                                <div className="flex flex-col gap-4">
                                    <label className="text-sm font-black text-black/60">아이콘 배경색</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { name: '화이트', value: '#ffffff' },
                                            { name: '실버', value: '#f3f4f6' },
                                            { name: '다크', value: '#1f2937' },
                                            { name: '블루', value: '#3b82f6' },
                                            { name: '퍼플', value: '#a855f7' },
                                            { name: '로즈', value: '#f43f5e' },
                                        ].map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => updateTheme({ iconBgColor: color.value })}
                                                className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${iconBgColor === color.value ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-transparent bg-black/5 hover:bg-black/10'
                                                    }`}
                                            >
                                                <div className="w-6 h-6 rounded-lg shadow-sm" style={{ backgroundColor: color.value }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Icon Glyph Color */}
                                <div className="flex flex-col gap-4">
                                    <label className="text-sm font-black text-black/60">아이콘 내부(글리프) 색상</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { name: '기본 블루', value: '#2563eb' },
                                            { name: '다크그레이', value: '#374151' },
                                            { name: '화이트', value: '#ffffff' },
                                            { name: '에메랄드', value: '#10b981' },
                                            { name: '오렌지', value: '#f97316' },
                                            { name: '레드', value: '#ef4444' },
                                        ].map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => updateTheme({ iconGlyphColor: color.value })}
                                                className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${iconGlyphColor === color.value ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-transparent bg-black/5 hover:bg-black/10'
                                                    }`}
                                            >
                                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: color.value }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="max-w-md flex flex-col gap-8">
                        <section>
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <Shield size={24} className="text-blue-500" />
                                보안 및 비밀번호
                            </h3>

                            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl mb-8">
                                <p className="text-xs text-blue-700 font-bold leading-relaxed">
                                    환경설정 보호를 위해 정기적으로 비밀번호를 변경하는 것이 좋습니다.
                                    초기 비밀번호는 <span className="underline italic">1234</span> 입니다.
                                </p>
                            </div>

                            <form className="flex flex-col gap-5" onSubmit={async (e) => {
                                e.preventDefault();
                                if (!currentUser) return;
                                if (newPassword !== confirmPassword) {
                                    setSecurityError('새 비밀번호가 일치하지 않습니다.');
                                    return;
                                }

                                setIsSubmitting(true);
                                setSecurityError(null);
                                setSecuritySuccess(null);

                                try {
                                    const res = await fetch('/api/auth/change-password', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            userId: currentUser.id,
                                            currentPassword,
                                            newPassword
                                        })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        setSecuritySuccess('비밀번호가 성공적으로 변경되었습니다.');
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    } else {
                                        setSecurityError(data.error || '비밀번호 변경에 실패했습니다.');
                                    }
                                } catch (err) {
                                    setSecurityError('서버와 통신 중 오류가 발생했습니다.');
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-black/60 px-1">현재 비밀번호</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••"
                                            className="w-full pl-11 pr-5 py-3.5 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-black/60 px-1">새 비밀번호</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="새로운 비밀번호 입력"
                                            className="w-full pl-11 pr-5 py-3.5 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-black/60 px-1">새 비밀번호 확인</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="비밀번호 다시 입력"
                                            className="w-full pl-11 pr-5 py-3.5 bg-black/5 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                            required
                                        />
                                    </div>
                                </div>

                                {securityError && (
                                    <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">
                                        <AlertCircle size={16} />
                                        <span className="text-xs font-bold">{securityError}</span>
                                    </div>
                                )}

                                {securitySuccess && (
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl border border-green-100">
                                        <CheckCircle2 size={16} />
                                        <span className="text-xs font-bold">{securitySuccess}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '비밀번호 변경하기'}
                                </button>
                            </form>
                        </section>
                    </div>
                )}

                {activeTab !== 'icons' && activeTab !== 'appearance' && activeTab !== 'security' && (
                    <div className="h-full flex flex-col items-center justify-center text-black/30 italic">
                        <LayoutGrid size={48} className="mb-4 opacity-10" />
                        <p>준비 중인 설정입니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
