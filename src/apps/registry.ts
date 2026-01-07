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
    }
};

export const DEFAULT_WINDOW_CONFIG: WindowConfig = {
    defaultWidth: 800,
    defaultHeight: 500,
    resizable: true,
    maximizable: true
};
