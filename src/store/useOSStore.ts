import { create } from 'zustand';
import { Settings, Folder, Image as ImageIcon, MessageSquare, Globe, Mail } from 'lucide-react';

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
  prevDim?: { x: number; y: number; width: number; height: number }; // 최대화 전 상태 저장
}

interface OSState {
  currentTime: Date;
  apps: AppData[];
  windows: Record<string, WindowState>;
  focusedWindowId: string | null;
  maxZIndex: number;

  setCurrentTime: (time: Date) => void;
  setApps: (apps: AppData[]) => void;
  reorderApps: (fromIndex: number, toIndex: number) => void;

  openApp: (appId: string) => void;
  closeApp: (appId: string) => void;
  focusApp: (appId: string) => void;
  minimizeApp: (appId: string) => void;
  maximizeApp: (appId: string) => void;
  updateWindowDimensions: (appId: string, updates: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
}

const INITIAL_APPS: AppData[] = [
  { id: 'browser', name: 'Browser', iconName: 'Globe' },
  { id: 'files', name: 'Files', iconName: 'Folder' },
  { id: 'photos', name: 'Photos', iconName: 'ImageIcon' },
  { id: 'messages', name: 'Messages', iconName: 'MessageSquare' },
  { id: 'mail', name: 'Mail', iconName: 'Mail' },
  { id: 'settings', name: 'Settings', iconName: 'Settings' },
];

export const useOSStore = create<OSState>((set) => ({
  currentTime: new Date(),
  apps: INITIAL_APPS,
  windows: {},
  focusedWindowId: null,
  maxZIndex: 10,

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
          y: 100 + offset,
          width: 600,
          height: 400
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
      // 복원
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
      // 최대화 (상태바 제외 화면 꽉 채우기)
      // 상태바 높이가 약 40px (h-10) 이므로 y=40, height=window.innerHeight - 40
      return {
        windows: {
          ...state.windows,
          [appId]: {
            ...win,
            isMaximized: true,
            prevDim: { x: win.x, y: win.y, width: win.width, height: win.height },
            x: 0,
            y: 40, // StatusBar 높이만큼 띄움
            width: typeof window !== 'undefined' ? window.innerWidth : 1024,
            height: typeof window !== 'undefined' ? window.innerHeight - 40 : 768
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
}));
