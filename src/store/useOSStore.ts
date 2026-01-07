import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppData {
  id: string;
  name: string;
  iconName: string;
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

interface OSState {
  currentTime: Date;
  apps: AppData[];
  windows: Record<string, WindowState>;
  focusedWindowId: string | null;
  maxZIndex: number;
  desktopGridSettings: GridSettings;
  mobileGridSettings: GridSettings;

  setCurrentTime: (time: Date) => void;
  setApps: (apps: AppData[]) => void;
  reorderApps: (fromIndex: number, toIndex: number) => void;

  openApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  focusApp: (appId: string) => void;
  minimizeApp: (appId: string) => void;
  maximizeApp: (appId: string) => void;
  updateWindowDimensions: (appId: string, updates: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
  updateGridSettings: (settings: Partial<GridSettings>, device: 'desktop' | 'mobile') => void;
  resetGridSettings: (device: 'desktop' | 'mobile') => void;
}

const INITIAL_APPS: AppData[] = [
  { id: 'browser', name: 'Browser', iconName: 'Globe' },
  { id: 'files', name: 'Files', iconName: 'Folder' },
  { id: 'photos', name: 'Photos', iconName: 'ImageIcon' },
  { id: 'messages', name: 'Messages', iconName: 'MessageSquare' },
  { id: 'mail', name: 'Mail', iconName: 'Mail' },
  { id: 'settings', name: 'Settings', iconName: 'Settings' },
];

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

      setCurrentTime: (time) => set({ currentTime: time }),
      setApps: (apps) => set({ apps }),
      reorderApps: (fromIndex, toIndex) => set((state) => {
        const newApps = [...state.apps];
        const [movedApp] = newApps.splice(fromIndex, 1);
        newApps.splice(toIndex, 0, movedApp);
        return { apps: newApps };
      }),

      openApp: (appId) => set((state) => {
        const app = state.apps.find(a => a.id === appId);
        if (!app) return state;

        if (state.windows[appId]) {
          const newZIndex = state.maxZIndex + 1;
          return {
            windows: {
              ...state.windows,
              [appId]: { ...state.windows[appId], isMinimized: false, zIndex: newZIndex }
            },
            focusedWindowId: appId,
            maxZIndex: newZIndex
          };
        }

        const newZIndex = state.maxZIndex + 1;
        const offset = Object.keys(state.windows).length * 30;

        return {
          windows: {
            ...state.windows,
            [appId]: {
              id: appId,
              title: app.name,
              isOpen: true,
              isMinimized: false,
              isMaximized: false,
              zIndex: newZIndex,
              x: 100 + offset,
              y: 100 + offset + STATUS_BAR_HEIGHT,
              width: 800, // 기본 설정을 위해 조금 더 크게 시작
              height: 500
            }
          },
          focusedWindowId: appId,
          maxZIndex: newZIndex
        };
      }),

      closeApp: (appId) => set((state) => {
        const newWindows = { ...state.windows };
        delete newWindows[appId];
        return {
          windows: newWindows,
          focusedWindowId: state.focusedWindowId === appId ? null : state.focusedWindowId
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
          maxZIndex: newZIndex
        };
      }),

      minimizeApp: (appId) => set((state) => ({
        windows: {
          ...state.windows,
          [appId]: { ...state.windows[appId], isMinimized: true }
        },
        focusedWindowId: state.focusedWindowId === appId ? null : state.focusedWindowId
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
            }
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
            }
          };
        }
      }),

      updateWindowDimensions: (appId, updates) => set((state) => ({
        windows: {
          ...state.windows,
          [appId]: { ...state.windows[appId], ...updates }
        }
      })),

      updateGridSettings: (settings, device) => set((state) => {
        const key = device === 'desktop' ? 'desktopGridSettings' : 'mobileGridSettings';
        return {
          [key]: { ...state[key], ...settings }
        };
      }),

      resetGridSettings: (device) => set(() => ({
        [device === 'desktop' ? 'desktopGridSettings' : 'mobileGridSettings']:
          device === 'desktop' ? DEFAULT_DESKTOP_GRID_SETTINGS : DEFAULT_MOBILE_GRID_SETTINGS
      })),
    }),
    {
      name: 'kos-v7-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apps: state.apps,
        desktopGridSettings: state.desktopGridSettings,
        mobileGridSettings: state.mobileGridSettings,
      }),
    }
  )
);
