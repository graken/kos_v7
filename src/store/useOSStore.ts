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
  apps: AppData[];
  permissions: Record<string, any>; // 앱별 권한 (JSON)
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
  hasHydrated: boolean;
  backStack: { id: string; action: () => void }[];

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
  switchUser: (user: User) => Promise<void>;
  setEditingAppId: (appId: string | null) => void;
  setHasHydrated: (val: boolean) => void;
  pushBackAction: (id: string, action: () => void) => void;
  popBackAction: (id: string) => void;
  triggerBackAction: () => boolean; // Boolean indicates if an action was handled
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
      defaultHeight: 520,
      resizable: false,
      maximizable: false
    }
  },
  { id: 'coating-control', name: '박막도포관리', iconName: 'Activity' },
  { id: 'gravure-coating', name: '그라비아 도포', iconName: 'Droplets' },
  { id: 'roll-calculator', name: '롤직경계산기', iconName: 'Calculator' },
  { id: 'equipment-maintenance', name: '설비점검', iconName: 'Activity' },
  { id: 'notepad', name: '메모장', iconName: 'FileText' },
];

export const INSTALLED_APP_IDS = ['browser', 'files', 'photos', 'messages', 'mail', 'settings', 'calculator', 'coating-control', 'gravure-coating', 'roll-calculator', 'equipment-maintenance', 'user-manager', 'notepad', 'shinsung-data'];

const ADMIN_USER: User = {
  id: 'admin-1',
  username: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  apps: INITIAL_APPS,
  permissions: {
    'equipment-maintenance': { delete: true, complete: true }
  }
};

const STATUS_BAR_HEIGHT = 32;

const syncUserAppsToServer = async (userId: string, apps: AppData[]) => {
  try {
    await fetch('/api/os/user-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, apps }),
    });
  } catch (error) {
    console.error('Failed to sync user apps to server:', error);
  }
};

export const useOSStore = create<OSState>()(
  persist(
    (set, get) => ({
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
      hasHydrated: false,
      backStack: [],

      setCurrentTime: (time) => set({ currentTime: time }),
      setApps: (apps) => {
        set({ apps });
        const { currentUser } = get();
        if (currentUser) syncUserAppsToServer(currentUser.id, apps);
      },
      addApp: (app) => set((state) => {
        const newApps = [...state.apps, app];
        if (state.currentUser) syncUserAppsToServer(state.currentUser.id, newApps);
        return { apps: newApps };
      }),
      removeApp: (appId) => set((state) => {
        const newApps = state.apps.filter(app => app.id !== appId);
        if (state.currentUser) syncUserAppsToServer(state.currentUser.id, newApps);
        return { apps: newApps };
      }),
      updateApp: (appId, updates) => set((state) => {
        const newApps = state.apps.map(app => app.id === appId ? { ...app, ...updates } : app);
        if (state.currentUser) syncUserAppsToServer(state.currentUser.id, newApps);
        return { apps: newApps };
      }),
      reorderApps: (fromIndex, toIndex) => set((state) => {
        const newApps = [...state.apps];
        const [movedApp] = newApps.splice(fromIndex, 1);
        newApps.splice(toIndex, 0, movedApp);
        if (state.currentUser) syncUserAppsToServer(state.currentUser.id, newApps);
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

        // 창이 처음 열릴 때 브라우저 히스토리에 상태 추가 (백버튼으로 닫기 위해)
        if (typeof window !== 'undefined') {
          window.history.pushState({ isWindowAction: true, appId }, '');
        }

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
        const win = state.windows[appId];
        if (!win) return state;
        if (state.focusedWindowId === appId && !win.isMinimized) return state;
        const newZIndex = state.maxZIndex + 1;
        return {
          windows: {
            ...state.windows,
            [appId]: { ...win, zIndex: newZIndex, isMinimized: false }
          },
          focusedWindowId: appId,
          maxZIndex: newZIndex,
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

      minimizeApp: (appId) => set((state) => {
        const win = state.windows[appId];
        if (!win) return state;
        return {
          windows: {
            ...state.windows,
            [appId]: { ...win, isMinimized: true }
          },
          focusedWindowId: state.focusedWindowId === appId ? null : state.focusedWindowId,
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

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

      updateWindowDimensions: (appId, updates) => set((state) => {
        const win = state.windows[appId];
        if (!win) return state;
        return {
          windows: {
            ...state.windows,
            [appId]: { ...win, ...updates }
          },
          contextMenu: { ...state.contextMenu, isOpen: false }
        };
      }),

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
      switchUser: async (user) => {
        set({ currentUser: user, windows: {}, focusedWindowId: null });
        try {
          const response = await fetch(`/api/os/user-config?userId=${user.id}`);
          const data = await response.json();
          if (data.apps && Array.isArray(data.apps)) {
            set({ apps: data.apps });
          }
        } catch (err) {
          console.error('Failed to switch user config:', err);
        }
      },
      setEditingAppId: (appId) => set({ editingAppId: appId }),
      setHasHydrated: (val) => set({ hasHydrated: val }),

      pushBackAction: (id, action) => set((state) => {
        // 이미 같은 ID가 스택에 있다면 추가하지 않음
        if (state.backStack.find(i => i.id === id)) return state;

        // 브라우저 히스토리에 가짜 상태를 추가해서 백버튼 클릭을 가로챌 수 있게 함
        if (typeof window !== 'undefined') {
          window.history.pushState({ isBackAction: true, actionId: id }, '');
        }

        return {
          backStack: [...state.backStack, { id, action }]
        };
      }),

      popBackAction: (id) => set((state) => ({
        backStack: state.backStack.filter(i => i.id !== id)
      })),

      triggerBackAction: () => {
        const state = get();

        // 1. 등록된 백버튼 동작 스택이 있는지 확인 (팝업 등)
        if (state.backStack.length > 0) {
          const topAction = state.backStack[state.backStack.length - 1];
          topAction.action();
          // 스택에서 제거는 각 액션 내부에서 popBackAction을 호출하거나 여기서 처리
          set({ backStack: state.backStack.slice(0, -1) });
          return true;
        }

        // 2. DOM에서 닫기(X) 버튼이 있는지 확인 (사용자 제안: 활성화된 창에 X 버튼이 있으면 그것부터 클릭)
        // 특히 z-index가 높은(최상위) 모달의 닫기 버튼을 찾음
        if (typeof document !== 'undefined') {
          // Lucide X 아이콘이나 닫기 버튼으로 추정되는 요소들 검색
          // .absolute .top- 또는 모달 내부의 X 아이콘 버튼 등
          const closeButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => {
              const rect = btn.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && // 보이는 버튼
                (btn.innerText.includes('X') ||
                  btn.querySelector('svg')?.getAttribute('data-lucide') === 'x' ||
                  btn.querySelector('svg')?.classList.contains('lucide-x'));
            });

          if (closeButtons.length > 0) {
            // 가장 최상위에 있을 것으로 예상되는 버튼(DOM 순서상 나중 것) 클릭
            const topBtn = closeButtons[closeButtons.length - 1];
            (topBtn as HTMLElement).click();
            return true;
          }
        }

        // 3. 스택은 없지만 포커스된 앱 창이 있다면 닫음
        if (state.focusedWindowId) {
          state.closeApp(state.focusedWindowId);
          return true;
        }

        // 4. 아무것도 처리할 게 없으면 false 반환
        return false;
      },
    }),
    {
      name: 'kos-v7-storage',
      version: 1, // 버전업을 통한 저장소 초기화 및 동기화 무결성 확보
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apps: state.apps,
        desktopGridSettings: state.desktopGridSettings,
        mobileGridSettings: state.mobileGridSettings,
        currentUser: state.currentUser,
      }),
      onRehydrateStorage: (state) => {
        return async (rehydratedState, error) => {
          if (error || !rehydratedState) {
            state.setHasHydrated(true);
            return;
          }

          const { currentUser } = rehydratedState;
          if (currentUser) {
            try {
              // 해당 사용자의 설정을 서버에서 가져오기
              const response = await fetch(`/api/os/user-config?userId=${currentUser.id}`);
              const data = await response.json();

              if (data.apps && Array.isArray(data.apps) && data.apps.length > 0) {
                // 서버 설정이 있으면 서버 데이터를 우선 적용
                useOSStore.setState({ apps: data.apps });
              } else if (rehydratedState.apps && rehydratedState.apps.length > 0) {
                // 서버에 설정이 없으면 현재 상태를 서버에 시딩(Seeding)
                await syncUserAppsToServer(currentUser.id, rehydratedState.apps);
              }
            } catch (err) {
              console.error('Failed to sync user config during hydration:', err);
            }
          }

          rehydratedState.setHasHydrated(true);
        };
      }
    }
  )
);

// 탭 간 실시간 동기화 리스너 (무한 루프 방지를 위한 가드 추가)
if (typeof window !== 'undefined') {
  let isRehydrating = false;
  window.addEventListener('storage', (event) => {
    if (event.key === 'kos-v7-storage' && !isRehydrating) {
      isRehydrating = true;
      useOSStore.persist.rehydrate();
      setTimeout(() => { isRehydrating = false; }, 100);
    }
  });
}
