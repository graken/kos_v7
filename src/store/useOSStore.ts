import { create } from 'zustand';
import { ReactNode } from 'react';
import { Settings, Folder, Image as ImageIcon, MessageSquare, Globe, Mail } from 'lucide-react';

export interface AppData {
  id: string;
  name: string;
  iconName: string; // 저장용 이름
}

interface OSState {
  currentTime: Date;
  apps: AppData[];
  setCurrentTime: (time: Date) => void;
  setApps: (apps: AppData[]) => void;
  reorderApps: (fromIndex: number, toIndex: number) => void;
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
  setCurrentTime: (time) => set({ currentTime: time }),
  setApps: (apps) => set({ apps }),
  reorderApps: (fromIndex, toIndex) => set((state) => {
    const newApps = [...state.apps];
    const [movedApp] = newApps.splice(fromIndex, 1);
    newApps.splice(toIndex, 0, movedApp);
    return { apps: newApps };
  }),
}));
