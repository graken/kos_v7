import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { APP_REGISTRY, DEFAULT_WINDOW_CONFIG } from '@/apps/registry';

export interface WindowConfig {
  defaultWidth: number;
  defaultHeight: number;
  resizable: boolean;
  maximizable: boolean;
}

export interface AppData {
  id: string;
  name: string;
  iconName: string;
  windowConfig?: WindowConfig; // 앱별 기본 창 설정 (선택사항)
}

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  config: WindowConfig; // 현재 창의 설정
  prevDim?: { x: number; y: number; width: number; height: number };
}

export interface GridSettings {
  iconSize: number;
  gapX: number;
  gapY: number;
}

const DEFAULT_DESKTOP_GRID_SETTINGS: GridSettings = {
  iconSize: 120,
  gapX: 64,
  gapY: 64,
};

const DEFAULT_MOBILE_GRID_SETTINGS: GridSettings = {
  iconSize: 56,
  gapX: 24,
  gapY: 48,
};

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  role: 'admin' | 'user';
}

export interface ContextMenuItem {
  label: string;
  iconName?: string;
  onClick: () => void;
  isDanger?: boolean;
  closeOnClick?: boolean; // 기본값 true, false일 경우 클릭 시 메뉴가 자동으로 닫히지 않음
}

interface OSState {
  currentTime: Date;
  apps: AppData[];
  windows: Record<string, WindowState>;
  focusedWindowId: string | null;
  maxZIndex: number;
  desktopGridSettings: GridSettings;
  mobileGridSettings: GridSettings;
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  };
  currentUser: User | null;
  editingAppId: string | null;

  setCurrentTime: (time: Date) => void;
  setApps: (apps: AppData[]) => void;
  addApp: (app: AppData) => void;
  removeApp: (appId: string) => void;
  updateApp: (appId: string, updates: Partial<AppData>) => void;
  reorderApps: (fromIndex: number, toIndex: number) => void;

  openApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  focusApp: (appId: string) => void;
  minimizeApp: (appId: string) => void;
  maximizeApp: (appId: string) => void;
  updateWindowDimensions: (appId: string, updates: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
  updateGridSettings: (settings: Partial<GridSettings>, device: 'desktop' | 'mobile') => void;
  resetGridSettings: (device: 'desktop' | 'mobile') => void;
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
  setCurrentUser: (user: User | null) => void;
  setEditingAppId: (appId: string | null) => void;
}

const INITIAL_APPS: AppData[] = [
  { id: 'browser', name: 'Browser', iconName: 'Globe' },
  { id: 'files', name: 'Files', iconName: 'Folder' },
  { id: 'photos', name: 'Photos', iconName: 'ImageIcon' },
  { id: 'messages', name: 'Messages', iconName: 'MessageSquare' },
  { id: 'mail', name: 'Mail', iconName: 'Mail' },
  { id: 'settings', name: 'Settings', iconName: 'Settings' },
  {
    id: 'calculator',
    name: 'Calculator',
    iconName: 'Calculator',
    windowConfig: {
      defaultWidth: 320,
      defaultHeight: 480,
      resizable: false,
      maximizable: false
    }
  },
];

export const INSTALLED_APP_IDS = ['browser', 'files', 'photos', 'messages', 'mail', 'settings', 'calculator'];

const ADMIN_USER: User = {
  id: 'admin-1',
  username: 'admin',
  displayName: 'Administrator',
  role: 'admin',
};

const STATUS_BAR_HEIGHT = 32;

export const useOSStore = create<OSState>()(
  persist(
    (set) => ({
      currentTime: new Date(),
      apps: INITIAL_APPS,
      windows: {},
      focusedWindowId: null,
      maxZIndex: 10,
      desktopGridSettings: DEFAULT_DESKTOP_GRID_SETTINGS,
      mobileGridSettings: DEFAULT_MOBILE_GRID_SETTINGS,
      contextMenu: {
        isOpen: false,
        x: 0,
        y: 0,
        items: [],
      },
      currentUser: ADMIN_USER,
      editingAppId: null,

      setCurrentTime: (time) => set({ currentTime: time }),
      setApps: (apps) => set({ apps }),
      addApp: (app) => set((state) => ({ apps: [...state.apps, app] })),
      removeApp: (appId) => set((state) => ({
        apps: state.apps.filter(app => app.id !== appId)
      })),
      updateApp: (appId, updates) => set((state) => ({
        apps: state.apps.map(app => app.id === appId ? { ...app, ...updates } : app)
      })),
      reorderApps: (fromIndex, toIndex) => set((state) => {
        const newApps = [...state.apps];
        const [movedApp] = newApps.splice(fromIndex, 1);
        newApps.splice(toIndex, 0, movedApp);
        return { apps: newApps };
      }),

      openApp: (appId) => set((state) => {
        const app = state.apps.find(a => a.id === appId);
        const registryApp = APP_REGISTRY[appId];

        if (!app && !registryApp) return state;

        if (state.windows[appId]) {
          const newZIndex = state.maxZIndex + 1;
          return {
            windows: {
              ...state.windows,
              [appId]: { ...state.windows[appId], isMinimized: false, zIndex: newZIndex }
            },
            focusedWindowId: appId,
            maxZIndex: newZIndex,
            contextMenu: { ...state.contextMenu, isOpen: false }
          };
        }

        const newZIndex = state.maxZIndex + 1;
        const offset = Object.keys(state.windows).length * 30;

        // 레지스트리에 정의된 설정을 우선적으로 사용 (localStorage의 오래된 데이터 방지)
        const config: WindowConfig = registryApp?.config || app?.windowConfig || DEFAULT_WINDOW_CONFIG;
        const title = app?.name || registryApp?.name || appId;

        return {
          windows: {
            ...state.windows,
            [appId]: {
              id: appId,
              title: title,
              isOpen: true,
              isMinimized: false,
              isMaximized: false,
              zIndex: newZIndex,
              x: 100 + offset,
              y: 100 + offset + STATUS_BAR_HEIGHT,
              width: config.defaultWidth,
              height: config.defaultHeight,
              config: config
            }
          },
          focusedWindowId: appId,
          maxZIndex: newZIndex,
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

      closeApp: (appId) => set((state) => {
        const newWindows = { ...state.windows };
        delete newWindows[appId];
        return {
          windows: newWindows,
          focusedWindowId: state.focusedWindowId === appId ? null : state.focusedWindowId,
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

      focusApp: (appId) => set((state) => {
        if (state.focusedWindowId === appId && !state.windows[appId]?.isMinimized) return state;
        const newZIndex = state.maxZIndex + 1;
        return {
          windows: {
            ...state.windows,
            [appId]: { ...state.windows[appId], zIndex: newZIndex, isMinimized: false }
          },
          focusedWindowId: appId,
          maxZIndex: newZIndex,
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

      minimizeApp: (appId) => set((state) => ({
        windows: {
          ...state.windows,
          [appId]: { ...state.windows[appId], isMinimized: true }
        },
        focusedWindowId: state.focusedWindowId === appId ? null : state.focusedWindowId,
        contextMenu: { ...state.contextMenu, isOpen: false }
      })),

      maximizeApp: (appId) => set((state) => {
        const win = state.windows[appId];
        if (!win) return state;

        if (win.isMaximized) {
          return {
            windows: {
              ...state.windows,
              [appId]: {
                ...win,
                isMaximized: false,
                ...(win.prevDim || {})
              }
            },
            contextMenu: { ...state.contextMenu, isOpen: false }
          };
        } else {
          return {
            windows: {
              ...state.windows,
              [appId]: {
                ...win,
                isMaximized: true,
                prevDim: { x: win.x, y: win.y, width: win.width, height: win.height },
                x: 0,
                y: STATUS_BAR_HEIGHT,
                width: typeof window !== 'undefined' ? window.innerWidth : 1024,
                height: typeof window !== 'undefined' ? window.innerHeight - STATUS_BAR_HEIGHT : 736
              }
            },
            contextMenu: { ...state.contextMenu, isOpen: false }
          };
        }
      }),

      updateWindowDimensions: (appId, updates) => set((state) => ({
        windows: {
          ...state.windows,
          [appId]: { ...state.windows[appId], ...updates }
        },
        contextMenu: { ...state.contextMenu, isOpen: false }
      })),

      updateGridSettings: (settings, device) => set((state) => {
        const key = device === 'desktop' ? 'desktopGridSettings' : 'mobileGridSettings';
        return {
          [key]: { ...state[key], ...settings },
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

      resetGridSettings: (device) => set((state) => ({
        [device === 'desktop' ? 'desktopGridSettings' : 'mobileGridSettings']:
          device === 'desktop' ? DEFAULT_DESKTOP_GRID_SETTINGS : DEFAULT_MOBILE_GRID_SETTINGS,
        contextMenu: { ...state.contextMenu, isOpen: false }
      })),

      showContextMenu: (x, y, items) => set({
        contextMenu: { isOpen: true, x, y, items }
      }),

      hideContextMenu: () => set((state) => ({
        contextMenu: { ...state.contextMenu, isOpen: false }
      })),

      setCurrentUser: (user) => set({ currentUser: user }),
      setEditingAppId: (appId) => set({ editingAppId: appId }),
    }),
    {
      name: 'kos-v7-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apps: state.apps,
        desktopGridSettings: state.desktopGridSettings,
        mobileGridSettings: state.mobileGridSettings,
        currentUser: state.currentUser,
      }),
    }
  )
);
