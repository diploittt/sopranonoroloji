import { Action } from './permissions';
import { Role } from './roles';

export type MenuContext = 'CONTEXT_EMPTY' | 'CONTEXT_CHAT' | 'CONTEXT_USER';

export interface MenuItem {
    id: string;
    label: string;
    // Icon name (string) or component - we'll use lucide-react names or pass components later.
    // Ideally, keep it serializable or simple. Let's use string keys for icons and map them in UI context.
    icon?: string;
    action?: Action;
    minRole?: Role;
    divider?: boolean;
    danger?: boolean; // Red text
    disabled?: boolean;
    selfOnly?: boolean;  // Shows ONLY if target is self
    excludeSelf?: boolean; // Shows ONLY if target is NOT self
}

export const MENU_REGISTRY: Record<MenuContext, MenuItem[]> = {
    CONTEXT_EMPTY: [
        // GUEST
        { id: 'sound_settings', label: 'Ses Ayarları', icon: 'Settings', action: 'sound_settings' },
        { id: 'mic_request', label: 'Mikrofon iste', icon: 'Hand', action: 'mic.request' }, // Guest allowed
        // mic_release usually only needed if holding it? Adding generic "Mikrofon Bırak" if wanted, or maybe context sensitive? 
        // User asked: "mikrofon al mikrofon bırak menüleri eklensin"
        { id: 'mic_release', label: 'Mikrofon Bırak', icon: 'MicOff', action: 'mic.release' },

        { id: 'sep_mem1', label: '-', divider: true },

        // MEMBER
        { id: 'my_profile', label: 'Profilim', icon: 'User', action: 'my_profile', minRole: Role.Member },
        { id: 'room_user_list', label: 'Kullanıcılar', icon: 'Users', action: 'room.userList', minRole: Role.Member },
    ],
    CONTEXT_CHAT: [
        // GUEST
        { id: 'copy', label: 'Kopyala', icon: 'Copy', action: 'copy' },
        { id: 'select_all', label: 'Tümünü Seç', icon: 'Square', action: 'select_all' },
        { id: 'sep1', label: '-', divider: true },
        { id: 'freeze_chat_local', label: 'Yazıları Durdur (Yerel)', icon: 'Pause', action: 'freeze_chat_local' },
        { id: 'clear_text_local', label: 'Yazıları Temizle (Yerel)', icon: 'Trash2', action: 'clear_text_local' },

        { id: 'sep_mem1', label: '-', divider: true },

        // MEMBER
        { id: 'chat_pause_global', label: 'Yazıları durdur (global)', icon: 'PauseCircle', action: 'chat.pauseGlobal', minRole: Role.Member },
        { id: 'chat_clear_local', label: 'Yazıları temizle (global)', icon: 'Eraser', action: 'chat.clearLocal', minRole: Role.Member },
        { id: 'my_profile', label: 'Profilim', icon: 'User', action: 'my_profile', minRole: Role.Member },
    ],
    CONTEXT_USER: [
        // SELF ONLY
        { id: 'change_name', label: 'İsim Değiştir', icon: 'User', action: 'change_name', selfOnly: true },
        { id: 'my_profile_self', label: 'Profilim', icon: 'User', action: 'my_profile', selfOnly: true, minRole: Role.Member },

        // COMMON (Self & Others)
        { id: 'userinfo', label: 'Kullanıcı Bilgisi', icon: 'Info', action: 'userinfo' }, // Removed excludeSelf: true

        // OTHERS ONLY

        // MEMBER overrides/additions
        { id: 'invite_room', label: 'Odaya davet et', icon: 'UserPlus', action: 'user.inviteRoom', minRole: Role.Member, excludeSelf: true },
        { id: 'talk_test', label: 'Konuşma testi', icon: 'Mic2', action: 'user.talkTest', minRole: Role.Member, excludeSelf: true },

        // VIP ONLY
        { id: 'private_message_vip', label: 'Özel mesaj', icon: 'MessageSquare', action: 'user.privateMessage', minRole: Role.Vip, excludeSelf: true },

        { id: 'sep1', label: '-', divider: true },
        { id: 'ignore', label: 'Engelle (Yerel)', icon: 'Slash', action: 'ignore', excludeSelf: true },
    ]
};

// Helper to filter items based on role
import { hasRole } from './roles';
import { can } from './permissions';

export const getMenuItems = (context: MenuContext, userRole: string = 'guest', targetRole?: string, isSelf: boolean = false): MenuItem[] => {
    const items = MENU_REGISTRY[context] || [];
    return items.filter(item => {
        if (item.divider) return true;

        // 1. Role check
        if (item.minRole && !hasRole(userRole, item.minRole)) return false;

        // 2. Action check (re-uses can())
        if (item.action && !can(userRole, item.action, targetRole)) return false;

        // 3. Self/ExcludeSelf checks
        if (item.selfOnly && !isSelf) return false;
        if (item.excludeSelf && isSelf) return false;

        return true;
    });
};
