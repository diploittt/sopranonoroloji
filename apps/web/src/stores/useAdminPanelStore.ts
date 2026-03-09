import { create } from 'zustand';

export type AdminTabId = 'users' | 'rooms' | 'designs' | 'settings' | 'bans' | 'ipbans' | 'logs' | 'words' | 'about';

interface AdminPanelState {
    isOpen: boolean;
    activeTab: AdminTabId;
    selectedUserId: string | null;
    selectedRoomId: string | null;

    // Actions
    openPanel: () => void;
    closePanel: () => void;
    setActiveTab: (tab: AdminTabId) => void;
    setSelectedUserId: (id: string | null) => void;
    setSelectedRoomId: (id: string | null) => void;
}

export const useAdminPanelStore = create<AdminPanelState>((set) => ({
    isOpen: false,
    activeTab: 'users',
    selectedUserId: null,
    selectedRoomId: null,

    openPanel: () => set((state) => ({ isOpen: !state.isOpen })),
    closePanel: () => set({ isOpen: false }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedUserId: (id) => set({ selectedUserId: id }),
    setSelectedRoomId: (id) => set({ selectedRoomId: id }),
}));
