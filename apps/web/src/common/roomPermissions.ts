// ═══════════════════════════════════════════════════════════════════════
// UNIFIED PERMISSION SYSTEM — Single source of truth
// Add a role → add to ROLE_HIERARCHY. Change a permission → edit ALL_PERMISSIONS.
// ═══════════════════════════════════════════════════════════════════════
import React from 'react';

// ─── ROLE HIERARCHY ─────────────────────────────────────────────────
export const ROLE_HIERARCHY: Record<string, number> = {
    guest: 0,
    member: 1,
    vip: 2,
    operator: 3,
    moderator: 4,
    admin: 5,
    super_admin: 6,
    superadmin: 6,   // alias — backend uses "superadmin" without underscore
    owner: 7,
    godmaster: 8,
};

export const getRoleLevel = (role?: string): number =>
    ROLE_HIERARCHY[(role || 'guest').toLowerCase()] ?? 0;

export const isHigherRole = (actorRole?: string, targetRole?: string): boolean =>
    getRoleLevel(actorRole) > getRoleLevel(targetRole);

// ─── ROLE LABELS (Turkish) ──────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
    godmaster: 'GodMaster',
    owner: 'Owner',
    super_admin: 'Süper Admin',
    superadmin: 'Süper Admin',
    admin: 'Admin',
    moderator: 'Moderatör',
    operator: 'Operatör',
    vip: 'VIP',
    member: 'Üye',
    guest: 'Misafir',
};

// ─── PERMISSION DEFINITION ──────────────────────────────────────────
// minLevel = minimum role level to see/use this action
// requiresTarget = actor must outrank target (targetLevel < actorLevel)
// hiddenOnSelf = hide when right-clicking yourself
export interface PermissionDef {
    minLevel: number;
    requiresTarget?: boolean;
    hiddenOnSelf?: boolean;
}

export const ALL_PERMISSIONS: Record<string, PermissionDef> = {
    // ── User moderation actions ──
    'mute': { minLevel: 3, requiresTarget: true },
    'unmute': { minLevel: 3, requiresTarget: true },
    'kick': { minLevel: 3, requiresTarget: true },
    'hard-kick': { minLevel: 6, requiresTarget: true },
    'gag': { minLevel: 4, requiresTarget: true },
    'ungag': { minLevel: 4, requiresTarget: true },
    'ban-1day': { minLevel: 4, requiresTarget: true },
    'ban-more': { minLevel: 5, requiresTarget: true },
    'ban-1week': { minLevel: 5, requiresTarget: true },
    'ban-1month': { minLevel: 6, requiresTarget: true },
    'ban-permanent': { minLevel: 7, requiresTarget: true },
    'unban': { minLevel: 4, requiresTarget: true },
    'cam-block': { minLevel: 4, requiresTarget: true },
    'cam-unblock': { minLevel: 4, requiresTarget: true },
    'exit-browser': { minLevel: 6, requiresTarget: true },
    'make-room-op': { minLevel: 5, requiresTarget: true },
    'move-to-meeting': { minLevel: 3, requiresTarget: true },
    'clear-text': { minLevel: 4, requiresTarget: true },
    'free-mic': { minLevel: 3, requiresTarget: true },
    'take-mic': { minLevel: 3, requiresTarget: true },

    // ── User info/social (no target authority needed) ──
    'nudge': { minLevel: 1, hiddenOnSelf: true },
    'duel': { minLevel: 1, hiddenOnSelf: true },
    'revoke-role': { minLevel: 5, requiresTarget: true },
    'user-info': { minLevel: 0, hiddenOnSelf: true },
    'user-info-quick': { minLevel: 0, hiddenOnSelf: true },
    'user-list': { minLevel: 3 },
    'log-history': { minLevel: 4, requiresTarget: true },
    'private-chat': { minLevel: 0, hiddenOnSelf: true },
    'invite-one2one': { minLevel: 1, hiddenOnSelf: true },
    'ignore': { minLevel: 0, hiddenOnSelf: true },
    'unignore': { minLevel: 0, hiddenOnSelf: true },
    'send-gift': { minLevel: 0, hiddenOnSelf: true },
    'add-friend': { minLevel: 0, hiddenOnSelf: true },
    'add-friend-quick': { minLevel: 0, hiddenOnSelf: true },
    'friends-panel': { minLevel: 0 },
    'talk-test': { minLevel: 0 },
    'my-profile': { minLevel: 0 },

    // ── Empty area menu ──
    'admin-panel': { minLevel: 5 },
    'meeting': { minLevel: 3 },
    'clear-chat': { minLevel: 4 },
    'check-history': { minLevel: 4 },
    'users': { minLevel: 3 },
    'room-monitor': { minLevel: 6 },
    'conference': { minLevel: 6 },
    'mic-free': { minLevel: 3 },
    'mic-take': { minLevel: 3 },
    'audio-settings': { minLevel: 0 },
    'change-name': { minLevel: 0 },

    // ── Chat area menu ──
    'meeting-room': { minLevel: 3 },
    'copy': { minLevel: 0 },
    'select-all': { minLevel: 0 },
    'stop-text': { minLevel: 4 },
    'stop-text-local': { minLevel: 0 },
    'clear-text-global': { minLevel: 4 },
    'clear-text-local': { minLevel: 0 },
};

// ─── MENU ITEM INTERFACE ────────────────────────────────────────────
export interface RoomMenuItem {
    id: string;
    label: string;
    icon?: string | React.ReactNode;
    action?: string;
    type?: 'item' | 'submenu' | 'divider';
    submenu?: RoomMenuItem[];
    confirm?: boolean;
    confirmMessage?: string;
    description?: string;
    badge?: string;
    duration?: number | string;
    scope?: string;
    /** Kategori: 'mod' | 'social' | 'info' — tab filtreleme için */
    category?: 'mod' | 'social' | 'info';
    /** Hızlı işlem grid'de gösterilsin mi */
    quickAction?: boolean;
    /** Hover rengi */
    hoverColor?: string;
    /** Tehlikeli işlem (kırmızı stil) */
    danger?: boolean;
}

// ─── UNIVERSAL MENU FILTER ──────────────────────────────────────────
// Filters menu items based on actor level, target level, and self-click.
// Works for ANY role — no role-specific if-else needed.
export function getMenuForUser(
    items: RoomMenuItem[],
    userLevel: number,
    menuType: 'empty' | 'user' | 'chat',
    targetLevel: number = 0,
    isSelf: boolean = false,
): RoomMenuItem[] {
    return items
        .map(item => {
            // Filter submenu children by permission
            if (item.type === 'submenu' && item.submenu) {
                const filteredSub = item.submenu.filter(sub => {
                    const p = ALL_PERMISSIONS[sub.id];
                    return !p || userLevel >= p.minLevel;
                });
                if (filteredSub.length === 0) return null;
                return { ...item, submenu: filteredSub };
            }
            return item;
        })
        .filter((item): item is RoomMenuItem => {
            if (!item) return false;
            const perm = ALL_PERMISSIONS[item.id];
            if (!perm) return true; // no permission entry = always show
            if (userLevel < perm.minLevel) return false;
            if (isSelf && perm.hiddenOnSelf) return false;
            if (isSelf && perm.requiresTarget) return false;  // can't moderate yourself
            if (menuType === 'user' && perm.requiresTarget && !isSelf && targetLevel >= userLevel) return false;
            return true;
        });
}
