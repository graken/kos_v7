import dynamic from 'next/dynamic';
import { WindowConfig } from '@/store/useOSStore';

interface AppDefinition {
    component: React.ComponentType;
    config: WindowConfig;
    name: string;
}

export const APP_REGISTRY: Record<string, AppDefinition> = {
    settings: {
        component: dynamic(() => import('@/apps/Settings/Settings')),
        config: {
            defaultWidth: 800,
            defaultHeight: 500,
            resizable: true,
            maximizable: true
        },
        name: 'Settings'
    },
    calculator: {
        component: dynamic(() => import('@/apps/Calculator/Calculator')),
        config: {
            defaultWidth: 320,
            defaultHeight: 520,
            resizable: false,
            maximizable: false
        },
        name: 'Calculator'
    },
    'app-editor': {
        component: dynamic(() => import('@/apps/AppEditor/AppEditor')),
        config: {
            defaultWidth: 400,
            defaultHeight: 500,
            resizable: false,
            maximizable: false
        },
        name: 'App Editor'
    },
    'coating-control': {
        component: dynamic(() => import('@/apps/CoatingControl/CoatingControl')),
        config: {
            defaultWidth: 800,
            defaultHeight: 600,
            resizable: true,
            maximizable: true
        },
        name: '박막도포관리'
    },
    'gravure-coating': {
        component: dynamic(() => import('@/apps/GravureCoating/GravureCoating')),
        config: {
            defaultWidth: 800,
            defaultHeight: 850,
            resizable: true,
            maximizable: true
        },
        name: '그라비아 도포'
    },
    'roll-calculator': {
        component: dynamic(() => import('@/apps/RollCalculator/RollCalculator')),
        config: {
            defaultWidth: 900,
            defaultHeight: 850,
            resizable: true,
            maximizable: true
        },
        name: '롤직경계산기'
    },
    'equipment-maintenance': {
        component: dynamic(() => import('@/apps/EquipmentMaintenance/EquipmentMaintenance')),
        config: {
            defaultWidth: 1200,
            defaultHeight: 800,
            resizable: true,
            maximizable: true
        },
        name: '설비점검'
    },
    'user-manager': {
        component: dynamic(() => import('@/apps/UserManager/UserManager')),
        config: {
            defaultWidth: 1000,
            defaultHeight: 700,
            resizable: true,
            maximizable: true
        },
        name: '사용자 관리'
    }
};

export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
    defaultWidth: 800,
    defaultHeight: 500,
    resizable: true,
    maximizable: true
};
