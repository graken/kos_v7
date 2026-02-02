"use client";

import { useOSStore, INSTALLED_APP_IDS } from '@/store/useOSStore';
import { APP_REGISTRY } from '@/apps/registry';
import * as Icons from 'lucide-react';
import { useState } from 'react';

export default function AppEditor() {
    const { apps, editingAppId, hasHydrated } = useOSStore();
    const app = apps.find(a => a.id === editingAppId);

    if (!hasHydrated) {
        return (
            <div className="flex items-center justify-center h-full text-black/40 italic">
                불러오는 중...
            </div>
        );
    }

    if (!app) {
        return (
            <div className="flex items-center justify-center h-full text-black/40 italic">
                편집할 앱을 선택해주세요.
            </div>
        );
    }

    return <AppEditorContent app={app} />;
}

function AppEditorContent({ app }: { app: any }) {
    const { updateApp, setEditingAppId, closeApp, currentUser } = useOSStore();
    const [name, setName] = useState(app.name);
    const [iconName, setIconName] = useState(app.iconName);
    const [connectId, setConnectId] = useState(app.id);

    const handleSave = () => {
        updateApp(app.id, {
            name,
            iconName,
            id: connectId
        });
        setEditingAppId(null);
        closeApp('app-editor');
    };

    const iconList = [
        'Globe', 'Folder', 'ImageIcon', 'MessageSquare', 'Mail', 'Settings', 'Calculator',
        'Type', 'Link', 'Play', 'Info', 'Edit', 'Trash2', 'ArrowLeft', 'Activity', 'Droplets',
        'Music', 'Video', 'Camera', 'Headphones', 'Hammer', 'Wrench', 'Search', 'Zap', 'Clock', 'Calendar',
        'BarChart', 'PieChart', 'TrendingUp', 'Briefcase', 'FileText', 'Users', 'User', 'Phone', 'Share2',
        'Heart', 'Star', 'Cloud', 'Sun', 'Moon', 'Map', 'GraduationCap', 'Laptop', 'Smartphone',
        'Code', 'Brackets', 'Terminal', 'Cpu', 'Database', 'CloudRain', 'Wind', 'Flame', 'Anchor',
        'Target', 'CircleDot', 'Orbit', 'Disc'
    ];

    return (
        <div className="p-6 flex flex-col gap-6 bg-white h-full overflow-auto text-black/80">
            <h2 className="text-xl font-bold mb-2">앱 편집</h2>

            <div className="flex flex-col gap-4">
                {/* Name */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">앱 이름</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-black/5 border-transparent"
                    />
                </div>

                {/* Icon Selection */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">아이콘 선택</label>
                    <div className="grid grid-cols-5 gap-2 p-2 bg-black/5 rounded-lg border border-transparent">
                        {iconList.map((icon) => {
                            const IconComponent = (Icons as any)[icon];
                            return (
                                <button
                                    key={icon}
                                    onClick={() => setIconName(icon)}
                                    className={`p-2 flex items-center justify-center rounded-lg transition-all ${iconName === icon ? 'bg-white shadow-md ring-2 ring-blue-500' : 'hover:bg-white/50'
                                        }`}
                                >
                                    {IconComponent && <IconComponent size={24} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* App Connection */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">연결할 앱 (나에게 할당된 앱)</label>
                    <select
                        value={connectId}
                        onChange={(e) => setConnectId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-black/5 border-transparent shadow-sm"
                    >
                        {INSTALLED_APP_IDS
                            .filter(id => {
                                // 유틸리티 앱(isHidden)은 선택 목록에서 제외 (중복 생성 방지)
                                // 단, 이미 이 앱으로 설정된 아이콘인 경우 리스트에서 사라지면 안 되므로 허용
                                if (APP_REGISTRY[id]?.isHidden && id !== connectId && id !== app.id) return false;

                                // 1. 관리자는 모든 앱 선택 가능
                                if (currentUser?.role === 'admin') return true;
                                // 2. 현재 선택된(연결된) 앱은 본인을 위해 허용
                                if (id === connectId || id === app.id) return true;
                                // 3. 이미 바탕화면에 있는 앱은 허용 (하위 호환)
                                if (currentUser?.apps?.some(a => a.id === id)) return true;
                                // 4. 명시적 권한이 있는 경우 허용
                                return !!currentUser?.permissions?.[id];
                            })
                            .map(id => (
                                <option key={id} value={id}>
                                    {APP_REGISTRY[id]?.name || id.toUpperCase()}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            <div className="mt-auto flex gap-2">
                <button
                    onClick={() => {
                        setEditingAppId(null);
                        closeApp('app-editor');
                    }}
                    className="flex-1 py-3 px-4 bg-black/5 hover:bg-black/10 rounded-xl transition-colors text-sm font-bold"
                >
                    취소
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-bold shadow-lg shadow-blue-500/20"
                >
                    저장하기
                </button>
            </div>
        </div>
    );
}
