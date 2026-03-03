"use client";

import { use, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SidebarLeft } from '@/components/roomUI/SidebarLeft';
import { HeaderRooms } from '@/components/roomUI/HeaderRooms';
import { ChatMessages } from '@/components/roomUI/ChatMessages';
import { BottomToolbar } from '@/components/roomUI/BottomToolbar';
import { RightLivePanel } from '@/components/roomUI/RightLivePanel';
import { SettingsModal } from '@/components/roomUI/SettingsModal';
import { DMWindow } from '@/components/roomUI/DMWindow';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { BonusPopup, useBonusQueue } from '@/components/ui/BonusPopup';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';

import { AdminPanelWindow } from '@/components/admin/AdminPanelWindow';
import { useVideoState } from '@/hooks/useVideoState';
import { useAdminPanelStore } from '@/stores/useAdminPanelStore';

import { GiftPanel } from '@/components/roomUI/GiftPanel';
import { TokenShop } from '@/components/roomUI/TokenShop';
import { GiftAnimation } from '@/components/roomUI/GiftAnimation';
import ContextMenu from '@/components/room/ContextMenu';
import { ConfirmModal } from '@/components/room/ConfirmModal';
import AllUsersModal from '@/components/room/AllUsersModal';
import { ROLE_HIERARCHY, ALL_PERMISSIONS, getMenuForUser, getRoleLevel, RoomMenuItem } from '@/common/roomPermissions';

type ContextMenuItem = RoomMenuItem;
import { ChangeNameModal } from '@/components/room/ChangeNameModal';
import { BanOverlay } from '@/components/room/BanOverlay';
import { ProfileModal } from '@/components/room/ProfileModal';
import { GodMasterProfileModal } from '@/components/room/GodMasterProfileModal';
import { One2OneRoomView } from '@/components/roomUI/One2OneRoomView';
import { UserInfoModal } from '@/components/room/UserInfoModal';
import { RoomMonitorModal } from '@/components/room/RoomMonitorModal';
// MeetingModal kaldırıldı — toplantı odası artık ayrı sayfa olarak açılır
import { MeetingRoomBanner } from '@/components/room/MeetingRoomBanner';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import ThemeSwitcher from '@/components/room/ThemeSwitcher';

import { UserHistoryModal } from '@/components/room/UserHistoryModal';
import OneToOneCallView from '@/components/roomUI/OneToOneCallView';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import DuelArena from '@/components/roomUI/DuelArena';

// ─── PERMISSION-BASED MENU SYSTEM ──────────────────────────────────
// ALL permissions, role hierarchy, and menu filtering are defined in
// @/common/roomPermissions.ts — single source of truth.

// ─── EMPTY AREA MENU ITEMS ─────────────────────────────────────────
const EMPTY_AREA_ITEMS: ContextMenuItem[] = [
    { id: 'change-name', label: 'İsim Değiştir', icon: '✏️', action: 'openChangeNameModal', description: 'Kullanıcı adını değiştir' },
    { id: 'admin-panel', label: 'Admin Paneli', icon: '⚙️', action: 'openAdminPanel', description: 'Admin paneline git' },
    { id: 'meeting', label: 'Toplantı Odası', icon: '🔒', action: 'joinMeetingRoom', description: 'Yetkili toplantı odasına gir' },
    { id: 'clear-chat', label: 'Yazıları Sil', icon: '🗑️', action: 'clearChatRealtime', description: 'Chat ekranını temizle (herkes için)', confirm: true, confirmMessage: 'Tüm chat geçmişi silinecek. Emin misiniz?' },
    { id: 'check-history', label: 'Geçmişi Kontrol Et', icon: '📜', action: 'openHistoryModal', description: 'Chat ve oda geçmişini görüntüle' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', action: 'openUsersModal', description: 'Tüm odalardaki kullanıcıları göster', badge: 'totalUserCount' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: '🏠', action: 'openRoomMonitor', description: 'Tüm odaları izle ve yönet' },
    { id: 'mic-free', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicrophone', description: 'Mikrofonu serbest bırak' },
    { id: 'mic-take', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicrophone', description: 'Mikrofonu al' },
    { id: 'talk-test', label: 'Mikrofon Testi', icon: '🎙️', action: 'testUserAudio', description: 'Mikrofonun çalışıp çalışmadığını test et' },
    { id: 'my-profile', label: 'Profilim', icon: '👤', action: 'openMyProfile', description: 'Kendi profilim' },
];

// ─── USER CONTEXT MENU ITEMS (dynamic based on target state) ────────
function getUserMenuItems(targetUser?: any): ContextMenuItem[] {
    const isMuted = targetUser?.isMuted;
    const isGagged = targetUser?.isGagged;
    const isBanned = targetUser?.isBanned;
    const isCamBlocked = targetUser?.isCamBlocked;

    return [
        // Moderation
        isMuted
            ? { id: 'unmute', label: 'Sesi Aç', icon: '🔊', action: 'unmuteUser', description: 'Susturmayı kaldır' }
            : { id: 'mute', label: 'Sustur', icon: '🔇', action: 'muteUser', description: 'Kullanıcıyı sustur' },
        { id: 'kick', label: 'At', icon: '👢', action: 'kickUser', confirm: true, confirmMessage: 'Kullanıcı odadan atılacak. Emin misiniz?' },
        { id: 'hard-kick', label: 'Zorla At', icon: '⚡', action: 'hardKickUser', confirm: true, confirmMessage: 'Zorla atılacak. Sayfayı yenilemeden giremeyecek.' },
        isGagged
            ? { id: 'ungag', label: 'Yazı Yasağını Kaldır', icon: '💬', action: 'ungagUser', description: 'Yazma izni ver' }
            : { id: 'gag', label: 'Yazı Yasağı', icon: '🤐', action: 'gagUser', description: 'Chat yazamaz' },

        // Ban
        ...(isBanned
            ? [{ id: 'unban', label: 'Yasağı Kaldır', icon: '✅', action: 'unbanUser', confirm: true, confirmMessage: 'Kullanıcının yasağı kaldırılacak. Emin misiniz?' }]
            : [
                { id: 'ban-1day', label: '1 Gün Yasakla', icon: '🚫', action: 'banUser', duration: '1d', confirm: true, confirmMessage: 'Kullanıcı 1 gün yasaklanacak. Emin misiniz?' },
                {
                    id: 'ban-more', label: 'Daha Fazla Yasakla', icon: '⛔', type: 'submenu' as const,
                    submenu: [
                        { id: 'ban-1week', label: '1 Hafta', duration: '1w', action: 'banUser', confirm: true, confirmMessage: '1 hafta yasaklanacak. Emin misiniz?' },
                        { id: 'ban-1month', label: '1 Ay', duration: '1m', action: 'banUser', confirm: true, confirmMessage: '1 ay yasaklanacak. Emin misiniz?' },
                        { id: 'ban-permanent', label: 'Kalıcı', duration: 'permanent', action: 'banUser', confirm: true, confirmMessage: 'Kalıcı yasaklanacak! Emin misiniz?' },
                    ]
                }
            ]
        ),

        // Camera & browser
        isCamBlocked
            ? { id: 'cam-unblock', label: 'Kamera İznini Aç', icon: '📷', action: 'unblockCamera', description: 'Kamera engelini kaldır' }
            : { id: 'cam-block', label: 'Kamera Engelle', icon: '📷🚫', action: 'blockCamera', description: 'Kamerasını engelle' },
        { id: 'exit-browser', label: 'Tarayıcıyı Kapat', icon: '🌐', action: 'exitBrowser', confirm: true, confirmMessage: 'Kullanıcının tarayıcısı kapatılacak! Emin misiniz?' },

        // Info & management
        { id: 'admin-panel', label: 'Yönetim Paneli', icon: '⚙️', action: 'openAdminPanel' },
        { id: 'log-history', label: 'Geçmiş', icon: '📜', action: 'openUserLogs' },
        { id: 'user-list', label: 'Kullanıcı Listesi', icon: '👥', action: 'openUserList' },
        { id: 'user-info', label: 'Kullanıcı Bilgisi', icon: 'ℹ️', action: 'openUserInfo' },

        // Room actions
        { id: 'move-to-meeting', label: 'Toplantıya Çek', icon: '🔒', action: 'moveUserToMeeting' },
        // Role management - toggle based on current role
        ...(targetUser?.role && ['operator', 'moderator', 'admin'].includes(targetUser.role)
            ? [{ id: 'revoke-role', label: 'Yetkiyi Geri Al', icon: '❌', action: 'revokeRole', confirm: true, confirmMessage: `${targetUser.role} yetkisi geri alınacak. Emin misiniz?` }]
            : [{ id: 'make-room-op', label: 'Oda Operatörü Yap', icon: '👑', action: 'makeRoomOperator', confirm: true, confirmMessage: 'Kullanıcı oda operatörü yapılacak. Emin misiniz?' }]
        ),
        { id: 'clear-text', label: 'Mesajları Sil', icon: '🗑️', action: 'clearUserMessages', confirm: true, confirmMessage: 'Tüm mesajları silinecek. Emin misiniz?' },

        // Mic
        { id: 'free-mic', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicForUser' },
        { id: 'take-mic', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicFromUser' },

        // Social
        { id: 'nudge', label: 'Titret 📳', icon: '📳', action: 'nudgeUser', description: 'Kullanıcının ekranını titret' },
        { id: 'duel', label: '⚔️ Düello Et', icon: '⚔️', action: 'challengeDuel', description: 'Eristik düelloya davet et' },
        { id: 'send-gift', label: 'Hediye Gönder', icon: '🎁', action: 'sendGift', description: 'Kullanıcıya hediye gönder' },
        { id: 'private-chat', label: 'Özel Mesaj', icon: '💬', action: 'openPrivateChat' },
        { id: 'invite-one2one', label: 'Bire Bir Davet', icon: '📞', action: 'inviteOneToOne' },
        { id: 'ignore', label: 'Yoksay', icon: '🙈', action: 'ignoreUser' },
        { id: 'unignore', label: 'Yoksayı Kaldır', icon: '👁️', action: 'unignoreUser' },
        { id: 'talk-test', label: 'Ses Testi', icon: '🔊', action: 'testUserAudio' },
        { id: 'my-profile', label: 'Profilim', icon: '👤', action: 'openMyProfile' },
    ];
}

// ─── CHAT AREA MENU ITEMS ──────────────────────────────────────────
const CHAT_AREA_ITEMS: ContextMenuItem[] = [
    { id: 'admin-panel', label: 'Admin Paneli', icon: '⚙️', action: 'openAdminPanel', description: 'Admin paneline git' },
    { id: 'meeting-room', label: 'Toplantı Odası', icon: '🔒', action: 'joinMeetingRoom', description: 'Yetkili toplantı odasına gir' },
    { id: 'copy', label: 'Kopyala', icon: '📋', action: 'copy', description: 'Seçili metni kopyala' },
    { id: 'select-all', label: 'Tümünü Seç', icon: '✅', action: 'selectAll', description: 'Tüm mesajları seç' },
    { id: 'paste', label: 'Yapıştır', icon: '📌', action: 'paste', description: 'Panodan yapıştır' },
    { id: 'stop-text', label: 'Yazıları Durdur', icon: '⏸️', action: 'stopMessagesGlobal', scope: 'global', confirm: true, confirmMessage: 'Tüm yazılar durdurulacak. Emin misiniz?' },
    { id: 'stop-text-local', label: 'Yazıları Durdur (Yerel)', icon: '⏸️', action: 'stopMessagesLocal', scope: 'local' },
    { id: 'clear-text-global', label: 'Yazıları Temizle', icon: '🗑️', action: 'clearMessagesGlobal', scope: 'global', confirm: true, confirmMessage: 'Tüm yazılar temizlenecek. Emin misiniz?' },
    { id: 'clear-text-local', label: 'Yazıları Temizle (Yerel)', icon: '🗑️', action: 'clearMessagesLocal', scope: 'local' },
    {
        id: 'my-profile', label: 'Profilim', icon: '👤', type: 'submenu' as const,
        submenu: [
            { id: 'change-avatar', label: 'Avatar Değiştir', action: 'changeAvatar' },
            { id: 'change-name-profile', label: 'İsim Değiştir', action: 'changeName' },
            { id: 'change-password', label: 'Şifre Değiştir', action: 'changePassword' },
            { id: 'name-color', label: 'İsme Renk Ver', action: 'changeNameColor' },
        ]
    },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', action: 'showAllUsers', description: 'Tüm kullanıcılar' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: '🏠', action: 'openRoomMonitor', description: 'Kim nerede, hangi odada' },
];

// ─── UNIVERSAL MENU FILTER ─────────────────────────────────────────
// Uses getMenuForUser() from roomPermissions.ts — no inline permission logic.
// ─── Rol izin anahtarı → bloklanacak/açılacak menü öğeleri ───────────────
const ROLE_PERM_TO_MENU_IDS: Record<string, string[]> = {
    profile: ['my-profile', 'change-avatar', 'change-name-profile', 'change-password', 'name-color', 'openMyProfile'],
    privateMessage: ['private-chat'],
    privateRoom: [],
    camera: [],         // Kamera kullanım izni — UI'da ayrıca kontrol ediliyor, cam-block/unblock moderasyon yetkisidir
    webcam1v1: ['invite-one2one'],
    animation: [],      // animasyonlar ileride eklenecek
    youtube: [],        // YouTube embed kontrolü ChatMessages.tsx'te yapılıyor
    nudge: ['nudge'],
    duel: ['duel'],
};

// ─── Bireysel kullanıcı izni → ek olarak açılacak menü öğeleri ───
// Admin panelinden atanan bireysel yetkiler (mod.mute, mod.kick vb.) bu eşleme ile
// context menu'de minLevel sınırını bypass ederek ilgili öğeyi gösterir.
const USER_PERM_TO_MENU_IDS: Record<string, string[]> = {
    'mod.mute': ['mute', 'unmute'],
    'mod.gag': ['gag', 'ungag'],
    'mod.kick': ['kick'],
    'mod.cam_block': ['cam-block', 'cam-unblock'],
    'mod.clear_text': ['clear-text', 'clear-text-global'],
    'mod.give_mic': ['free-mic', 'mic-free'],
    'mod.take_mic': ['take-mic', 'mic-take'],
    'mod.move_to_room': [],
    'mod.move_to_meeting': ['move-to-meeting', 'meeting'],
    'mod.nudge': ['nudge'],
    'mod.ban_permanent': ['ban-permanent'],
    'mod.ban_1day': ['ban-1day'],
    'mod.ban_1week': ['ban-1week', 'ban-more'],
    'mod.ban_1month': ['ban-1month', 'ban-more'],
    'mod.ban_remove': ['unban'],
    'mod.gag_remove': ['ungag'],
    'self.change_name': ['change-name'],
    'self.mic_test': ['talk-test', 'audio-settings'],
    'self.stealth': [],
    'self.webcam_1v1': ['invite-one2one'],
    'self.private_message': ['private-chat'],
    'ctrl.admin_panel': ['admin-panel'],
    'ctrl.users_global': ['users', 'user-list'],
    'ctrl.room_options': [],
    'ctrl.spy_rooms': ['room-monitor'],
    'ctrl.admin_add_user': [],
    'room.clear_chat_local': ['clear-text-local', 'clear-chat'],
    'room.freeze_chat_local': ['stop-text-local'],
    'room.freeze_chat_global': ['stop-text'],
    'room.youtube': [],
    'room.meeting_room': ['meeting-room', 'meeting'],
};

function getFilteredMenu(
    menuType: 'empty' | 'user' | 'chat',
    userLevel: number,
    targetUser?: any,
    currentUserId?: string,
    systemSettings?: Record<string, any>,
    userRole?: string,
    userPermissions?: Record<string, boolean> | null
): ContextMenuItem[] {
    // Debug log kaldırıldı — render spam yapıyordu
    const targetLevel = getRoleLevel(targetUser?.role);
    const isSelf = menuType === 'user' && targetUser?.userId === currentUserId;

    let items: ContextMenuItem[];
    if (menuType === 'empty') items = EMPTY_AREA_ITEMS;
    else if (menuType === 'chat') {
        // Filter submenu items based on user level (e.g. name-color only for VIP+)
        items = CHAT_AREA_ITEMS.map(item => {
            if (item.submenu) {
                const filteredSubmenu = item.submenu.filter(sub => {
                    // İsme Renk Ver — only VIP+ (level >= 2)
                    if (sub.id === 'name-color' && userLevel < 2) return false;
                    return true;
                });
                return { ...item, submenu: filteredSubmenu };
            }
            return item;
        });
    }
    else items = getUserMenuItems(targetUser);

    // ─── Bireysel yetki ile açılacak menü öğelerini belirle ────────
    const grantedByUserPerm = new Set<string>();
    if (userPermissions) {
        for (const [permKey, menuIds] of Object.entries(USER_PERM_TO_MENU_IDS)) {
            if (userPermissions[permKey] === true) {
                menuIds.forEach(id => grantedByUserPerm.add(id));
            }
        }
    }

    // ─── Rol bazlı yetki ile açılacak/kapatılacak menü öğelerini belirle ─────
    const grantedByRolePerm = new Set<string>();
    const blockedByRolePerm = new Set<string>();

    if (systemSettings) {
        const roleLower = (userRole || 'guest').toLowerCase();
        const rolePerms = systemSettings.rolePermissions?.[roleLower];

        const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
            guest: { profile: true, privateMessage: true, privateRoom: false, camera: true, webcam1v1: false, animation: false, youtube: false, nudge: false, duel: false },
            member: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            vip: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            operator: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            moderator: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            admin: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            super_admin: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            superadmin: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            owner: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
            godmaster: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
        };

        const effectivePerms = rolePerms ?? DEFAULT_ROLE_PERMS[roleLower] ?? {};

        // ★ GLOBAL TOGGLE KONTROLÜ — duelEnabled/nudgeEnabled false ise herkesten gizle
        if (systemSettings.duelEnabled === false) {
            const duelMenuIds = ROLE_PERM_TO_MENU_IDS['duel'];
            if (duelMenuIds) duelMenuIds.forEach(id => blockedByRolePerm.add(id));
        }
        if (systemSettings.nudgeEnabled === false) {
            const nudgeMenuIds = ROLE_PERM_TO_MENU_IDS['nudge'];
            if (nudgeMenuIds) nudgeMenuIds.forEach(id => blockedByRolePerm.add(id));
        }

        // Her izin anahtarını kontrol et — true ise menü öğelerini aç (minLevel bypass), false ise kapat
        const permChecks: [string, string | undefined][] = [
            ['profile', 'guestProfile'],
            ['privateMessage', 'guestPrivateMessage'],
            ['privateRoom', undefined],
            ['camera', 'guestCamera'],
            ['webcam1v1', 'guestWebcam1v1'],
            ['animation', 'guestAnimation'],
            ['nudge', undefined],
            ['duel', undefined],
        ];

        for (const [permKey, legacyKey] of permChecks) {
            let permValue: boolean | undefined = undefined;

            // Etkili izinlerden kontrol
            if (effectivePerms && typeof effectivePerms === 'object' && permKey in effectivePerms) {
                permValue = effectivePerms[permKey];
            }
            // Eski guest alanlarından fallback (sadece guest için)
            else if (legacyKey && roleLower === 'guest' && legacyKey in systemSettings) {
                permValue = systemSettings[legacyKey];
            }

            const menuIds = ROLE_PERM_TO_MENU_IDS[permKey];
            if (!menuIds || menuIds.length === 0) continue;

            if (permValue === true) {
                // İzin açıkça açılmış — minLevel bypass edecek
                menuIds.forEach(id => {
                    grantedByRolePerm.add(id);
                    blockedByRolePerm.delete(id); // Global toggle'dan bloklanmışsa bile aç
                });
            } else if (permValue === false) {
                // İzin kapatılmış — menü öğelerini gizle
                menuIds.forEach(id => blockedByRolePerm.add(id));
            }
        }

        // Bireysel yetki ile açılmış öğeleri rol bloktan çıkar
        if (grantedByUserPerm.size > 0) {
            grantedByUserPerm.forEach(id => blockedByRolePerm.delete(id));
        }
    }

    // ─── Tüm grant'ları birleştir ──────────────────────────────────
    const allGranted = new Set<string>([...grantedByUserPerm, ...grantedByRolePerm]);

    // ─── minLevel filtresi + grant bypass ──────────────────────────
    let filtered: ContextMenuItem[];
    if (allGranted.size > 0) {
        // Grant'lar var — minLevel kontrolünü bypass et ama
        // target authority ve self kontrolünü koru
        filtered = items
            .map(item => {
                if (item.type === 'submenu' && item.submenu) {
                    const filteredSub = item.submenu.filter(sub => {
                        const p = ALL_PERMISSIONS[sub.id];
                        if (!p) return true;
                        // Grant ile açılmış mı?
                        if (allGranted.has(sub.id)) return true;
                        // Normal rol bazlı kontrol
                        return userLevel >= p.minLevel;
                    });
                    if (filteredSub.length === 0) return null;
                    return { ...item, submenu: filteredSub };
                }
                return item;
            })
            .filter((item): item is ContextMenuItem => {
                if (!item) return false;
                const perm = ALL_PERMISSIONS[item.id];
                if (!perm) return true;
                const hasMinLevel = userLevel >= perm.minLevel;
                const granted = allGranted.has(item.id);
                if (!hasMinLevel && !granted) return false;
                if (isSelf && perm.hiddenOnSelf) return false;
                if (isSelf && perm.requiresTarget) return false;
                if (menuType === 'user' && perm.requiresTarget && !isSelf && targetLevel >= userLevel) {
                    // Grant ile verildiyse target outrank kontrolünü de bypass et
                    if (!granted) return false;
                }
                return true;
            });
    } else {
        filtered = getMenuForUser(items, userLevel, menuType, targetLevel, isSelf);
    }

    // ─── Rol bazlı blok — grant ile açılmayan öğeleri kaldır ──────
    if (blockedByRolePerm.size > 0) {
        filtered = filtered
            .map(item => {
                if (item.type === 'submenu' && item.submenu) {
                    const sub = item.submenu.filter(s => !blockedByRolePerm.has(s.id));
                    if (sub.length === 0) return null;
                    return { ...item, submenu: sub };
                }
                return item;
            })
            .filter((item): item is ContextMenuItem => {
                if (!item) return false;
                return !blockedByRolePerm.has(item.id);
            });
    }

    // ─── Toplantı odası kontrolü - tenant meeting özelliğine sahip değilse menüden kaldır ─
    if (!systemSettings?.isMeetingRoom) {
        const meetingIds = new Set(['meeting', 'meeting-room', 'move-to-meeting']);
        filtered = filtered.filter(item => !meetingIds.has(item.id));
    }

    return filtered;
}


// ═══ ROOM ACCESS ERROR — VIP/Locked/Full overlay with auto-redirect ═══
function RoomAccessError({ message, isVipError, fallbackSlug }: { message: string; isVipError: boolean; fallbackSlug: string | null }) {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!isVipError || !fallbackSlug) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Navigate to fallback room
                    const currentPath = window.location.pathname;
                    const tenantMatch = currentPath.match(/^\/t\/([^/]+)/);
                    if (tenantMatch) {
                        window.location.href = `/t/${tenantMatch[1]}/room/${fallbackSlug}`;
                    } else {
                        window.location.href = `/room/${fallbackSlug}`;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isVipError, fallbackSlug]);

    return (
        <div className="h-screen w-full bg-[#0b0d14] flex flex-col items-center justify-center text-white">
            <div className="w-[400px] bg-[#13151c]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                {/* VIP Icon */}
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                    style={{
                        background: isVipError
                            ? 'linear-gradient(135deg, rgba(123, 159, 239, 0.2), rgba(123, 159, 239, 0.05))'
                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))',
                        border: isVipError
                            ? '1px solid rgba(123, 159, 239, 0.3)'
                            : '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                >
                    {isVipError ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7b9fef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                    {isVipError ? 'VIP Oda' : 'Erişim Engellendi'}
                </h2>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">{message}</p>

                {/* Countdown for VIP redirect */}
                {isVipError && fallbackSlug ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(123,159,239,0.15)" strokeWidth="3" />
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="#7b9fef" strokeWidth="3"
                                        strokeDasharray={`${(countdown / 3) * 125.6} 125.6`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 1s linear' }}
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: '#7b9fef' }}>
                                    {countdown}
                                </span>
                            </div>
                            <span className="text-sm text-gray-500">saniye içinde yönlendirileceksiniz...</span>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                        Geri Dön
                    </button>
                )}
            </div>
        </div>
    );
}

export default function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug: urlSlug } = use(params);
    // activeSlug state — allows room switching without remounting the component
    const [activeSlug, setActiveSlug] = useState(urlSlug);
    // Sync activeSlug when URL param changes (e.g. browser back/forward)
    useEffect(() => { setActiveSlug(urlSlug); }, [urlSlug]);

    // ★ AUTH GUARD — Token/session yoksa veya süresi dolmuşsa login sayfasına yönlendir
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    useEffect(() => {
        const user = getAuthUser(); // Session timeout + token varlığı kontrol eder
        const token = localStorage.getItem('soprano_auth_token') || localStorage.getItem('soprano_tenant_token');
        if (!user || !token) {
            // Token yok veya session süresi dolmuş — ana sayfaya yönlendir
            router.replace('/');
            return;
        }
        setAuthChecked(true);
    }, [router]);

    const room = useRoomRealtime({ slug: activeSlug });
    const { openPanel, closePanel, setActiveTab } = useAdminPanelStore();
    const isMeetingRoom = activeSlug === 'staff-meeting';
    const isOne2OneRoom = activeSlug.startsWith('one2one-');
    const currentTheme = useCurrentTheme();
    const isModernTheme = currentTheme === 'modern' || currentTheme === '';


    // ─── Active Design (dizayn preset'inden gelen bölgesel renkler) ───
    const activeDesign = useMemo(() => {
        const designId = (room.state.roomSettings?.metadata as any)?.designId;
        if (!designId) return null;
        const designs = (room.state.systemSettings as any)?.metadata?.designs;
        if (!Array.isArray(designs)) return null;
        return designs.find((d: any) => d.id === designId) || null;
    }, [room.state.roomSettings?.metadata, room.state.systemSettings]);

    // Track if user was ever connected — prevents loading screen flash during room switches
    const hasEverConnected = useRef(false);
    if (room.state.currentUser) hasEverConnected.current = true;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [settingsAnchor, setSettingsAnchor] = useState<React.RefObject<HTMLElement | null>>({ current: null });
    const { toasts, addToast, removeToast } = useToast();
    const bonusQueue = useBonusQueue();

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    // Tenant-aware URL helper: if we're at /t/[tenant]/room/..., keep the tenant prefix
    const tenantMatch = pathname.match(/^\/t\/([^/]+)\/room\//);
    const roomUrl = (roomSlug: string) => tenantMatch ? `/t/${tenantMatch[1]}/room/${roomSlug}` : `/room/${roomSlug}`;

    // Modal States
    const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
    const [isAllUsersOpen, setIsAllUsersOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isGodMasterProfileOpen, setIsGodMasterProfileOpen] = useState(false);
    const [isRoomMonitorOpen, setIsRoomMonitorOpen] = useState(false);

    const [isAudioTestOpen, setIsAudioTestOpen] = useState(false);
    const [ignoredUsers, setIgnoredUsers] = useState<Set<string>>(new Set());

    // ─── Saved selection for copy action ──────────────────────────────
    const savedSelectionRef = useRef<string>('');

    // Gift system state
    const [giftPanelOpen, setGiftPanelOpen] = useState(false);
    const [giftTargetUser, setGiftTargetUser] = useState<{ id: string; name: string } | null>(null);
    const [giftAnimation, setGiftAnimation] = useState<any>(null);
    const [tokenShopOpen, setTokenShopOpen] = useState(false);
    const [userInfoTarget, setUserInfoTarget] = useState<any>(null);
    const [userHistoryTarget, setUserHistoryTarget] = useState<{ userId: string; displayName: string } | null>(null);

    // One-to-One Invite Popup State
    const [one2oneInvite, setOne2oneInvite] = useState<{
        fromUserId: string;
        fromDisplayName: string;
        fromAvatar: string;
        fromRole: string;
        roomSlug: string;
    } | null>(null);



    // One-to-One Active Call State
    const [one2oneCallActive, setOne2oneCallActive] = useState<{
        otherDisplayName: string;
        otherAvatar: string;
        otherRole: string;
        otherUserId: string;
    } | null>(null);
    // Save the previous room slug so we can return after one2one ends
    const previousRoomSlugRef = useRef<string | null>(null);

    // One-to-One özel mesajlar — ana odaya YANSIMAZ
    const [one2oneMessages, setOne2oneMessages] = useState<Array<{
        id: string;
        text: string;
        senderDisplayName: string;
        senderAvatar: string;
        senderRole: string;
        senderId: string;
        timestamp: string;
    }>>([]);

    // TV Video State
    const [tvVideoUrl, setTvVideoUrl] = useState<string | null>(null);
    const [tvVolume, setTvVolume] = useState(0.7);

    // Listen for tv:youtubeUpdate events
    useEffect(() => {
        if (!room.socket) return;
        const onYoutubeUpdate = (data: { url: string | null; setBy: string }) => {
            setTvVideoUrl(data.url);
            if (data.url) {
                addToast('info', '🎬 Video Yayını', `${data.setBy} TV'de video başlattı.`);
            } else {
                addToast('info', '📺 Video Kapatıldı', 'TV yayını sonlandırıldı.');
            }
        };
        room.socket.on('tv:youtubeUpdate', onYoutubeUpdate);

        // Daily / VIP bonus bildirimi — büyük popup olarak göster
        const onBonusReceived = (data: { amount: number; type: string; message: string }) => {
            bonusQueue.enqueue(data);
        };
        room.socket.on('dailyBonus:received', onBonusReceived);

        return () => {
            room.socket?.off('tv:youtubeUpdate', onYoutubeUpdate);
            room.socket?.off('dailyBonus:received', onBonusReceived);
        };
    }, [room.socket]);

    // ★ ADMIN PULL-USER: Listen for soprano:force-navigate (dispatched by useSocket when admin pulls user)
    useEffect(() => {
        const onForceNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ roomSlug: string; by: string }>).detail;
            if (detail?.roomSlug) {
                addToast('info', '📞 Odaya Çekildiniz', `${detail.by || 'Yönetici'} sizi ${detail.roomSlug} odasına çekti.`);
                setActiveSlug(detail.roomSlug);
            }
        };
        window.addEventListener('soprano:force-navigate', onForceNavigate);
        // Düello ret bildirimi
        const onDuelRejected = (e: Event) => {
            const detail = (e as CustomEvent<{ opponentName: string }>).detail;
            addToast('error', '❌ Düello Reddedildi', `${detail?.opponentName || 'Rakip'} düello davetinizi reddetti.`);
        };
        window.addEventListener('soprano:duel-rejected', onDuelRejected);
        return () => {
            window.removeEventListener('soprano:force-navigate', onForceNavigate);
            window.removeEventListener('soprano:duel-rejected', onDuelRejected);
        };
    }, []);


    // ─── Computed Values ──────────────────────────────────────────────
    const videoState = useVideoState({
        roomUsers: room.state.users,
        currentUser: room.state.currentUser,
        localStream: room.state.localStream,
        remoteStreams: room.state.remoteStreams,
        currentSpeaker: room.state.currentSpeaker,
        isCameraOn: room.state.isCameraOn,
    });
    const userLevel = ROLE_HIERARCHY[room.state.currentUser?.role || 'guest'] || 0;

    // ★ AUTH GATE — Auth kontrolü geçmeden hiçbir şey render etme
    if (!authChecked) {
        return (
            <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Oturum kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    // ─── Confirm Modal ──────────────────────────────────────────────
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        variant?: string;
        onConfirm: () => void;
    }>({ isOpen: false, message: '', onConfirm: () => { } });

    // ─── Context Menu state ──────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<{
        type: 'user' | 'empty' | 'chat';
        x: number;
        y: number;
        targetUser?: any;
    } | null>(null);

    const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // ★ BAN CHECK — Banlı kullanıcılar sağ tık menüsü açamaz
        if (room.state.banInfo) return;
        setContextMenu({ type: 'empty', x: e.clientX, y: e.clientY });
    };
    const handleUserContextMenu = (e: React.MouseEvent, user: any) => {
        e.preventDefault();
        // ★ BAN CHECK — Banlı kullanıcılar sağ tık menüsü açamaz
        if (room.state.banInfo) return;
        setContextMenu({ type: 'user', x: e.clientX, y: e.clientY, targetUser: user });
    };
    const handleChatContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // ★ BAN CHECK — Banlı kullanıcılar sağ tık menüsü açamaz
        if (room.state.banInfo) return;
        // ★ Seçili metni kaydet — context menu açıldıktan sonra selection kaybolur
        const sel = window.getSelection();
        savedSelectionRef.current = sel?.toString() || '';
        setContextMenu({ type: 'chat', x: e.clientX, y: e.clientY });
    };

    // ─── Menu Items getter ───────────────────────────────────────────
    const getMenuItems = useCallback(() => {
        if (!contextMenu) return [];
        let items = getFilteredMenu(
            contextMenu.type,
            userLevel,
            contextMenu.targetUser,
            room.state.currentUser?.userId,
            room.state.systemSettings,
            room.state.currentUser?.role,
            room.state.userPermissions
        );
        // Toggle ignore / unignore based on current state
        const targetId = contextMenu.targetUser?.userId || contextMenu.targetUser?.id;
        const isIgnored = targetId && ignoredUsers.has(targetId);
        items = items.filter(item => {
            if (isIgnored && item.id === 'ignore') return false;
            if (!isIgnored && item.id === 'unignore') return false;
            return true;
        });
        return items;
    }, [contextMenu, userLevel, room.state.currentUser, room.state.systemSettings, room.state.userPermissions, ignoredUsers]);

    // ─── Context menu action handler ─────────────────────────────────
    const handleMenuItemClick = useCallback((item: any, overrideTargetId?: string, overrideTargetName?: string) => {
        const targetId = overrideTargetId || contextMenu?.targetUser?.userId || contextMenu?.targetUser?.id;
        const targetName = overrideTargetName || contextMenu?.targetUser?.username || contextMenu?.targetUser?.displayName || 'Kullanıcı';
        const duration = item.duration;

        if (item.confirm && !item._confirmed) {
            setConfirmModal({
                isOpen: true,
                title: 'Onay',
                message: item.confirmMessage || 'Emin misiniz?',
                onConfirm: () => {
                    handleMenuItemClick({ ...item, _confirmed: true }, targetId, targetName);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                },
            });
            setContextMenu(null);
            return;
        }

        setContextMenu(null);

        // console.log('[handleMenuItemClick] action:', item.action, 'targetId:', targetId, 'targetName:', targetName);

        switch (item.action) {
            case 'muteUser':
                room.socket?.emit('admin:userAction', { action: 'mute', targetUserId: targetId });
                addToast('success', 'Susturuldu', `${targetName} susturuldu.`);
                break;
            case 'unmuteUser':
                room.socket?.emit('admin:userAction', { action: 'mute', targetUserId: targetId, value: false });
                addToast('success', 'Ses Açıldı', `${targetName} sesi açıldı.`);
                break;
            case 'kickUser':
                room.socket?.emit('admin:userAction', { action: 'kick', targetUserId: targetId });
                addToast('success', 'Atıldı', `${targetName} odadan atıldı.`);
                break;
            case 'hardKickUser':
                room.socket?.emit('admin:userAction', { action: 'hard_kick', targetUserId: targetId });
                addToast('success', 'Zorla Atıldı', `${targetName} zorla atıldı.`);
                break;
            case 'gagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId });
                addToast('success', 'Yazı Yasağı', `${targetName} yazı yasağı verildi.`);
                break;
            case 'ungagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId, value: false });
                addToast('success', 'Yazı Yasağı Kaldırıldı', `${targetName} yazı yasağı kaldırıldı.`);
                break;
            case 'banUser':
                room.socket?.emit('admin:userAction', { action: 'ban', targetUserId: targetId, duration });
                addToast('success', 'Yasaklandı', `${targetName} yasaklandı.`);
                break;
            case 'unbanUser':
                room.socket?.emit('admin:userAction', { action: 'unban', targetUserId: targetId });
                addToast('success', 'Yasak Kaldırıldı', `${targetName} yasağı kaldırıldı.`);
                break;
            case 'blockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId });
                addToast('success', 'Kamera Engellendi', `${targetName} kamerası engellendi.`);
                break;
            case 'unblockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId, value: false });
                addToast('success', 'Kamera Açıldı', `${targetName} kamera izni verildi.`);
                break;
            case 'exitBrowser':
                room.socket?.emit('admin:userAction', { action: 'exit_browser', targetUserId: targetId });
                addToast('success', 'Tarayıcı Kapatıldı', `${targetName} tarayıcısı kapatıldı.`);
                break;
            case 'openAdminPanel':
                openPanel();
                break;
            case 'openUsersModal':
            case 'showAllUsers':
            case 'openUserList':
                setIsAllUsersOpen(true);
                break;
            case 'openUserInfo':
                setUserInfoTarget(contextMenu?.targetUser || { userId: targetId, displayName: targetName });
                break;
            case 'openUserLogs':
                setUserHistoryTarget({ userId: targetId || '', displayName: targetName });
                break;
            case 'moveToMeeting':
            case 'moveUserToMeeting':
                room.socket?.emit('admin:userAction', { action: 'moveToMeeting', targetUserId: targetId });
                addToast('success', 'Toplantıya Çekildi', `${targetName} ile birlikte toplantıya gidiliyor...`);
                router.push(roomUrl('staff-meeting'));
                break;
            case 'joinMeetingRoom':
                router.push(roomUrl('staff-meeting'));
                break;
            case 'makeRoomOperator':
                room.socket?.emit('admin:userAction', { action: 'makeRoomOperator', targetUserId: targetId });
                addToast('success', 'Operatör Yapıldı', `${targetName} oda operatörü yapıldı.`);
                break;
            case 'revokeRole':
                room.socket?.emit('admin:userAction', { action: 'revokeRole', targetUserId: targetId });
                addToast('success', 'Yetki Geri Alındı', `${targetName} yetkisi geri alındı.`);
                break;
            case 'clearMessages':
            case 'clearUserMessages':
                room.socket?.emit('admin:userAction', { action: 'clear_user_messages', targetUserId: targetId });
                addToast('success', 'Mesajlar Silindi', `${targetName} mesajları silindi.`);
                break;
            case 'clearChatRealtime':
                room.socket?.emit('admin:userAction', { action: 'clear_chat_global' });
                addToast('success', 'Yazılar Silindi', 'Tüm yazılar temizlendi.');
                break;
            case 'clearMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'clear_chat_global' });
                addToast('success', 'Yazılar Temizlendi', 'Tüm yazılar globalde temizlendi.');
                break;
            case 'clearMessagesLocal':
                room.actions.clearLocalChat();
                addToast('success', 'Yazılar Temizlendi', 'Yerel yazılar temizlendi.');
                break;
            case 'stopMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'stop_messages_global' });
                addToast('success', 'Yazılar Durduruldu', 'Tüm yazılar durduruldu.');
                break;
            case 'stopMessagesLocal':
                room.actions.toggleLocalChatStop();
                addToast('info', 'Yazılar Durduruldu', 'Yerel yazılar durduruldu/açıldı.');
                break;
            case 'freeMicrophone':
            case 'freeMicForUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'release_mic', targetUserId: targetId });
                    addToast('success', 'Mikrofon Serbest', `${targetName} mikrofonu serbest bırakıldı.`);
                } else {
                    // Empty area context menu — release whoever currently holds the mic
                    room.actions.releaseMic();
                    addToast('success', 'Mikrofon Serbest', 'Mikrofon serbest bırakıldı.');
                }
                break;
            case 'takeMicrophone':
            case 'takeMicFromUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'take_mic', targetUserId: targetId });
                } else {
                    // Empty area context menu — take mic for self (force if someone is speaking)
                    room.actions.forceTakeMic();
                }
                addToast('success', 'Mikrofon Alındı', `Mikrofon alındı.`);
                break;
            case 'nudgeUser':
                room.socket?.emit('admin:userAction', { action: 'nudge', targetUserId: targetId });
                addToast('info', 'Titretildi', `${targetName} titretildi.`);
                // Gönderen tarafında da MSN nudge sesi çal
                try {
                    const senderNudgeAudio = new Audio('/sounds/msn-nudge.mp3');
                    senderNudgeAudio.volume = 0.5;
                    senderNudgeAudio.play().catch(() => { });
                } catch { }
                break;
            case 'challengeDuel':
                if (targetId) {
                    room.socket?.emit('duel:challenge', { targetUserId: targetId });
                }
                break;
            case 'sendGift': {
                const targetRole = contextMenu?.targetUser?.role;
                if (targetRole === 'guest') {
                    addToast('error', 'Hediye Gönderilemez', 'Misafir kullanıcıya hediye gönderilmez.');
                    break;
                }
                if (targetId) {
                    console.log('[sendGift] Opening gift panel for:', targetId, targetName);
                    setGiftTargetUser({ id: targetId, name: targetName });
                    setGiftPanelOpen(true);
                } else {
                    console.warn('[sendGift] No targetId available!');
                }
                break;
            }
            case 'openPrivateChat':
                if (targetName) room.actions.openDM(targetName);
                break;
            case 'inviteOneToOne':
                room.socket?.emit('admin:userAction', { action: 'invite_one2one', targetUserId: targetId });
                addToast('info', '📞 Davet Gönderildi', `${targetName} bire bir görüşmeye davet edildi.`);
                break;
            case 'ignoreUser':
                setIgnoredUsers(prev => new Set(prev).add(targetId || ''));
                addToast('info', 'Yoksayıldı', `${targetName} yoksayıldı.`);
                break;
            case 'unignoreUser': {
                setIgnoredUsers(prev => {
                    const next = new Set(prev);
                    next.delete(targetId || '');
                    return next;
                });
                addToast('info', 'Yoksay Kaldırıldı', `${targetName} artık yoksayılmıyor.`);
                break;
            }
            case 'testUserAudio':
                setIsAudioTestOpen(true);
                break;
            case 'openMyProfile': {
                const role = room.state.currentUser?.role || '';
                if (role.toLowerCase() === 'godmaster') {
                    setIsGodMasterProfileOpen(true);
                } else {
                    setIsProfileOpen(true);
                }
                break;
            }
            case 'openChangeNameModal':
            case 'openChangeName':
                setIsChangeNameOpen(true);
                break;
            case 'openHistoryModal':
            case 'openHistory':
                setUserHistoryTarget({ userId: '', displayName: 'Tüm Kullanıcılar' });
                break;
            case 'openRoomMonitor':
                setIsRoomMonitorOpen(true);
                break;
            case 'openAudioSettings':
                setIsSettingsOpen(true);
                break;
            case 'changeAvatar':
                setIsProfileOpen(true);
                break;
            case 'changeName':
                setIsChangeNameOpen(true);
                break;
            case 'changePassword':
                setIsProfileOpen(true);
                break;
            case 'changeNameColor':
                setIsProfileOpen(true);
                break;
            case 'copy': {
                const textToCopy = savedSelectionRef.current;
                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        addToast('success', 'Kopyalandı', 'Seçili metin panoya kopyalandı.');
                    }).catch(() => {
                        addToast('error', 'Hata', 'Panoya kopyalama başarısız.');
                    });
                } else {
                    addToast('info', 'Seçim Yok', 'Kopyalanacak metin seçilmemiş.');
                }
                break;
            }
            case 'selectAll': {
                const chatContainer = document.querySelector('[data-chat-messages]');
                if (chatContainer) {
                    const range = document.createRange();
                    range.selectNodeContents(chatContainer);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    addToast('info', 'Tümü Seçildi', 'Tüm mesajlar seçildi. Kopyalamak için sağ tık → Kopyala.');
                }
                break;
            }
            case 'paste': {
                navigator.clipboard.readText().then((clipText) => {
                    if (clipText) {
                        // Mesaj kutusuna yapıştır
                        const msgInput = document.querySelector('.message-input') as HTMLInputElement;
                        if (msgInput) {
                            // React controlled input — nativeInputValueSetter kullan
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                            if (nativeInputValueSetter) {
                                const curVal = msgInput.value;
                                const start = msgInput.selectionStart ?? curVal.length;
                                const end = msgInput.selectionEnd ?? curVal.length;
                                const newVal = curVal.slice(0, start) + clipText + curVal.slice(end);
                                nativeInputValueSetter.call(msgInput, newVal);
                                msgInput.dispatchEvent(new Event('input', { bubbles: true }));
                                // Cursor'u yapıştırılan metnin sonuna taşı
                                const newPos = start + clipText.length;
                                setTimeout(() => {
                                    msgInput.focus();
                                    msgInput.setSelectionRange(newPos, newPos);
                                }, 0);
                            }
                        }
                        addToast('success', 'Yapıştırıldı', 'Pano içeriği mesaj kutusuna yapıştırıldı.');
                    } else {
                        addToast('info', 'Pano Boş', 'Panoda yapıştırılacak metin yok.');
                    }
                }).catch(() => {
                    addToast('error', 'İzin Gerekli', 'Pano erişimi reddedildi. Tarayıcı izni gerekli.');
                });
                break;
            }
        }
    }, [contextMenu, room.socket, addToast, openPanel, room.actions, room.state.currentUser, router, roomUrl]);

    // ─── Socket event listeners for one2one / nudge / gift ───────────
    // One-to-One invite listener
    useEffect(() => {
        if (!room.socket) return;
        const onOne2oneInvite = (data: any) => {
            setOne2oneInvite(data);
        };
        const onOne2oneAccepted = (data: any) => {
            setOne2oneCallActive({
                otherDisplayName: data.otherDisplayName || 'Kullanıcı',
                otherAvatar: data.otherAvatar || '',
                otherRole: data.otherRole || 'guest',
                otherUserId: data.otherUserId || '',
            });
            // Switch to the one2one virtual room (in-place, no URL change)
            if (data.roomSlug) {
                // Save current slug so we can return after call ends
                previousRoomSlugRef.current = activeSlug;
                setActiveSlug(data.roomSlug);
            }
        };
        const onOne2oneEnded = () => {
            setOne2oneCallActive(null);
            // ★ Clean up camera & mic before switching back
            if (room.state.isMicOn) room.actions.stopDirectAudio();
            if (room.state.isCameraOn) room.actions.toggleCamera();
            room.actions.closeVideoProducer?.();
            // Switch back to the room we were in before the one2one call
            const prevSlug = previousRoomSlugRef.current;
            if (prevSlug) {
                previousRoomSlugRef.current = null;
                setActiveSlug(prevSlug);
            }
        };
        room.socket.on('one2one:invite', onOne2oneInvite);
        room.socket.on('one2one:start', onOne2oneAccepted);
        room.socket.on('one2one:ended', onOne2oneEnded);
        return () => {
            room.socket?.off('one2one:invite', onOne2oneInvite);
            room.socket?.off('one2one:start', onOne2oneAccepted);
            room.socket?.off('one2one:ended', onOne2oneEnded);
        };
    }, [room.socket, router, roomUrl]);

    // Gift animation listener
    useEffect(() => {
        if (!room.socket) return;
        const onGiftReceived = (data: any) => {
            setGiftAnimation(data);
        };
        room.socket.on('gift:received', onGiftReceived);
        return () => { room.socket?.off('gift:received', onGiftReceived); };
    }, [room.socket]);

    // Nudge (screen shake) listener
    const [nudgeActive, setNudgeActive] = useState(false);
    useEffect(() => {
        if (!room.socket) return;
        const onNudge = (data: { from: string }) => {
            addToast('info', '📳 Titretme', `${data.from} seni titretti!`);
            setNudgeActive(true);
            setTimeout(() => setNudgeActive(false), 1500);

            // ─── MSN Nudge Sesi ───
            const audio = new Audio('/sounds/msn-nudge.mp3');
            audio.volume = 0.7;
            audio.play().catch(() => { });
        };
        room.socket.on('room:nudge', onNudge);
        return () => { room.socket?.off('room:nudge', onNudge); };
    }, [room.socket]);

    // ─── Phone Ringtone for one-to-one invite ───────────
    useEffect(() => {
        if (!one2oneInvite) return;

        let audioCtx: AudioContext | null = null;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let stopped = false;

        const playRing = () => {
            if (stopped) return;
            try {
                audioCtx = new AudioContext();
                const playTone = () => {
                    if (stopped || !audioCtx) return;
                    const now = audioCtx.currentTime;
                    // First tone
                    const osc1 = audioCtx.createOscillator();
                    const gain1 = audioCtx.createGain();
                    osc1.frequency.value = 440;
                    osc1.type = 'sine';
                    gain1.gain.setValueAtTime(0.3, now);
                    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc1.connect(gain1).connect(audioCtx.destination);
                    osc1.start(now);
                    osc1.stop(now + 0.15);
                    // Second tone
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.frequency.value = 480;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(0.3, now + 0.18);
                    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.33);
                    osc2.connect(gain2).connect(audioCtx.destination);
                    osc2.start(now + 0.18);
                    osc2.stop(now + 0.33);
                };

                // Ring pattern: ring 0.5s, silence 1s
                playTone();
                intervalId = setInterval(() => {
                    if (stopped) return;
                    playTone();
                }, 1500);

            } catch (e) {
                console.warn('[Ringtone] Failed to create ringtone:', e);
            }
        };

        playRing();

        return () => {
            stopped = true;
            if (intervalId) clearInterval(intervalId);
            if (audioCtx) {
                audioCtx.close().catch(() => { });
                audioCtx = null;
            }
        };
    }, [one2oneInvite]);

    return (
        <LanguageProvider lang={room.state.systemSettings?.defaultLanguage || 'tr'}>
            <>
                {/* Nudge shake class applied via globals.css */}
                <main className={`app-background h-screen w-full flex items-center justify-center p-4 overflow-hidden text-slate-200 selection:bg-indigo-500/30 ${nudgeActive ? 'nudge-shake' : ''}`} style={{ perspective: '1200px' }}>

                    {/* ★ ONE2ONE ROOM — Sanal bire bir oda ★ */}
                    {isOne2OneRoom ? (
                        <One2OneRoomView
                            currentUser={room.state.currentUser}
                            otherUser={one2oneCallActive}
                            participants={room.state.users}
                            messages={room.state.messages}
                            remoteStreams={room.state.remoteStreams}
                            localStream={room.state.localStream}
                            isCameraOn={room.state.isCameraOn}
                            isMicOn={room.state.isMicOn}
                            onToggleCamera={room.actions.toggleCamera}
                            onStartMic={room.actions.startDirectAudio}
                            onStopMic={room.actions.stopDirectAudio}
                            onSendMessage={(text: string) => {
                                if (room.socket) {
                                    room.socket.emit('chat:send', { roomId: activeSlug, content: text });
                                }
                            }}
                            onHangUp={() => {
                                // ★ Clean up camera & mic before switching back
                                if (room.state.isMicOn) room.actions.stopDirectAudio();
                                if (room.state.isCameraOn) room.actions.toggleCamera();
                                room.actions.closeVideoProducer?.();
                                room.socket?.emit('one2one:end', {
                                    otherUserId: one2oneCallActive?.otherUserId || '',
                                });
                                setOne2oneCallActive(null);
                                // Switch back to the room we were in before one2one
                                const prevSlug = previousRoomSlugRef.current;
                                if (prevSlug) {
                                    previousRoomSlugRef.current = null;
                                    setActiveSlug(prevSlug);
                                }
                            }}
                        />
                    ) : (
                        <>
                            {/* ★ DUPLICATE BLOCKED OVERLAY — Bu hesap zaten aktif, giriş engellendi ★ */}
                            {room.state.duplicateBlocked && (
                                <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(24px)' }}>
                                    <div style={{ textAlign: 'center', maxWidth: 440, padding: 48 }}>
                                        {/* Red warning icon */}
                                        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 24px' }}>
                                            <div style={{
                                                position: 'absolute', inset: 0, borderRadius: '50%',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                animation: 'pulse 2s ease-in-out infinite',
                                            }} />
                                            <div style={{
                                                position: 'relative', width: 96, height: 96, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.1))',
                                                border: '2px solid rgba(239,68,68,0.4)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <span style={{ fontSize: 48 }}>🚫</span>
                                            </div>
                                        </div>
                                        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#ef4444', marginBottom: 12, letterSpacing: '-0.02em' }}>
                                            Giriş Engellendi
                                        </h2>
                                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.6 }}>
                                            {room.state.duplicateBlocked.message}
                                        </p>
                                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
                                            {room.state.duplicateBlocked.countdown} saniye içinde yönlendirileceksiniz...
                                        </p>
                                        <button
                                            onClick={() => {
                                                const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                window.location.href = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                                            }}
                                            style={{
                                                padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                                fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
                                                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                            }}
                                        >
                                            Geri Dön
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* ★ SESSION KICKED OVERLAY — Başka yerden giriş yapılınca tam ekran uyarı ★ */}
                            {room.state.sessionKicked && (
                                <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)' }}>
                                    <div style={{ textAlign: 'center', maxWidth: 440, padding: 48 }}>
                                        {/* Animated warning pulse */}
                                        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 24px' }}>
                                            <div style={{
                                                position: 'absolute', inset: 0, borderRadius: '50%',
                                                background: 'rgba(251, 191, 36, 0.15)',
                                                animation: 'pulse 2s ease-in-out infinite',
                                            }} />
                                            <div style={{
                                                position: 'relative', width: 96, height: 96, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))',
                                                border: '2px solid rgba(251,191,36,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <span style={{ fontSize: 48 }}>⚠️</span>
                                            </div>
                                        </div>
                                        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fbbf24', marginBottom: 12, letterSpacing: '-0.02em' }}>
                                            Oturum Sonlandırıldı
                                        </h2>
                                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.6 }}>
                                            {room.state.sessionKicked.message}
                                        </p>
                                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
                                            Birkaç saniye içinde giriş sayfasına yönlendirileceksiniz...
                                        </p>
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('soprano_tenant_token');
                                                localStorage.removeItem('soprano_tenant_user');
                                                const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                window.location.href = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                                            }}
                                            style={{
                                                padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #b8a47c, #d4c49a)', color: '#0a0a1a',
                                                fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
                                                boxShadow: '0 8px 24px rgba(184, 164, 124, 0.25)',
                                                transition: 'transform 0.15s, box-shadow 0.15s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            Giriş Sayfasına Dön
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ★ HARD BAN OVERLAY — 1 hafta+ veya kalıcı ban → tam engel ★ */}
                            {room.state.banInfo && room.state.banInfo.banLevel === 'hard' && (
                                <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}>
                                    <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
                                        <div style={{ fontSize: 72, marginBottom: 16 }}>🚫</div>
                                        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>Yasaklandınız</h2>
                                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                                            {room.state.banInfo.reason || 'Yönetici tarafından yasaklandınız.'}
                                        </p>
                                        {room.state.banInfo.expiresAt && (
                                            <p style={{ fontSize: 13, color: '#fbbf24', marginBottom: 24 }}>
                                                Ban bitiş: {new Date(room.state.banInfo.expiresAt).toLocaleString('tr-TR')}
                                            </p>
                                        )}
                                        {!room.state.banInfo.expiresAt && (
                                            <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 24 }}>
                                                Kalıcı yasak
                                            </p>
                                        )}
                                        <button
                                            onClick={() => {
                                                const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                window.location.href = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                                            }}
                                            style={{
                                                padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                                fontWeight: 700, fontSize: 14,
                                            }}
                                        >
                                            Geri Dön
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ★ HARD BAN — Kalıcı yasak → Tam ekran kırmızı yanıp sönen ekran ★ */}
                            {room.state.banInfo && room.state.banInfo.banLevel === 'hard' && (
                                <div className="fixed inset-0 z-[999999]" style={{
                                    background: '#000',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}>
                                    <style>{`
                                @keyframes hardBanFlash {
                                    0%, 100% { background: radial-gradient(ellipse at center, #1a0000 0%, #000000 70%); }
                                    25% { background: radial-gradient(ellipse at center, #3b0000 0%, #0a0000 70%); }
                                    50% { background: radial-gradient(ellipse at center, #5c0000 0%, #1a0000 70%); }
                                    75% { background: radial-gradient(ellipse at center, #3b0000 0%, #0a0000 70%); }
                                }
                                @keyframes hardBanIcon {
                                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px rgba(239,68,68,0.5)); }
                                    25% { transform: scale(1.1) rotate(-5deg); opacity: 0.9; filter: drop-shadow(0 0 40px rgba(239,68,68,0.8)); }
                                    50% { transform: scale(1.2) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 60px rgba(239,68,68,1)); }
                                    75% { transform: scale(1.1) rotate(5deg); opacity: 0.9; filter: drop-shadow(0 0 40px rgba(239,68,68,0.8)); }
                                }
                                @keyframes hardBanText {
                                    0%, 100% { text-shadow: 0 0 10px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.3); }
                                    50% { text-shadow: 0 0 20px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.5), 0 0 100px rgba(239,68,68,0.3); }
                                }
                                @keyframes hardBanBorder {
                                    0%, 100% { border-color: rgba(239,68,68,0.3); box-shadow: inset 0 0 60px rgba(239,68,68,0.1); }
                                    50% { border-color: rgba(239,68,68,0.8); box-shadow: inset 0 0 120px rgba(239,68,68,0.2); }
                                }
                                @keyframes hardBanScanline {
                                    0% { transform: translateY(-100vh); }
                                    100% { transform: translateY(100vh); }
                                }
                            `}</style>
                                    {/* Background flash */}
                                    <div className="absolute inset-0" style={{
                                        animation: 'hardBanFlash 2s ease-in-out infinite',
                                    }} />
                                    {/* Scanline effect */}
                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
                                    }} />
                                    {/* Moving scanline */}
                                    <div className="absolute left-0 right-0 pointer-events-none" style={{
                                        height: '2px',
                                        background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)',
                                        animation: 'hardBanScanline 3s linear infinite',
                                    }} />
                                    {/* Border glow */}
                                    <div className="absolute inset-4 pointer-events-none" style={{
                                        border: '2px solid rgba(239,68,68,0.3)',
                                        borderRadius: 16,
                                        animation: 'hardBanBorder 2s ease-in-out infinite',
                                    }} />
                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col items-center text-center px-8">
                                        <div style={{
                                            fontSize: 120,
                                            animation: 'hardBanIcon 2s ease-in-out infinite',
                                            marginBottom: 24,
                                        }}>🚫</div>
                                        <h1 style={{
                                            fontSize: 48,
                                            fontWeight: 900,
                                            color: '#ef4444',
                                            letterSpacing: '0.15em',
                                            textTransform: 'uppercase',
                                            margin: 0,
                                            animation: 'hardBanText 2s ease-in-out infinite',
                                        }}>KALICI YASAK</h1>
                                        <p style={{
                                            fontSize: 18,
                                            color: '#fca5a5',
                                            marginTop: 16,
                                            maxWidth: 480,
                                            lineHeight: 1.6,
                                        }}>
                                            Hesabınız kalıcı olarak yasaklanmıştır.<br />
                                            Bu odaya erişiminiz tamamen engellenmiştir.
                                        </p>
                                        <div style={{
                                            marginTop: 32,
                                            padding: '12px 32px',
                                            background: 'rgba(239,68,68,0.15)',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            borderRadius: 8,
                                        }}>
                                            <span style={{ fontSize: 14, color: '#f87171', fontWeight: 600 }}>
                                                {room.state.banInfo.reason || 'Yönetici tarafından yasaklandınız.'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ★ SOFT BAN WARNING BAR — 1 gün ban → oda görünür ama kısıtlı ★ */}
                            {room.state.banInfo && room.state.banInfo.banLevel === 'soft' && (
                                <div className="fixed top-0 left-0 right-0 z-[99998]" style={{
                                    background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                                    borderBottom: '2px solid #ef4444',
                                    padding: '10px 20px',
                                    textAlign: 'center',
                                    animation: 'softBanPulse 2s ease-in-out infinite',
                                }}>
                                    <style>{`
                                @keyframes softBanPulse {
                                    0%, 100% { opacity: 1; }
                                    50% { opacity: 0.85; }
                                }
                            `}</style>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>
                                        🚫 Geçici Yasak — Mikrofon, mesaj, emoji ve tüm etkileşimler kapatıldı.
                                    </span>
                                    {room.state.banInfo.expiresAt && (
                                        <span style={{ fontSize: 12, color: '#fbbf24', marginLeft: 12 }}>
                                            Kalan: {(() => {
                                                const ms = new Date(room.state.banInfo.expiresAt!).getTime() - Date.now();
                                                const h = Math.floor(ms / 3600000);
                                                const m = Math.floor((ms % 3600000) / 60000);
                                                return `${h} saat ${m} dk`;
                                            })()}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Gift System */}
                            <GiftAnimation
                                animationData={giftAnimation}
                                onComplete={() => setGiftAnimation(null)}
                            />
                            <GiftPanel
                                isOpen={giftPanelOpen}
                                onClose={() => { setGiftPanelOpen(false); setGiftTargetUser(null); }}
                                onSendGift={(giftId) => {
                                    if (room.socket && giftTargetUser) {
                                        room.socket.emit('gift:send', { receiverId: giftTargetUser.id, giftId }, (response: any) => {
                                            if (response?.error) {
                                                addToast('error', '❌ Hediye Hatası', response.error);
                                            }
                                        });
                                    }
                                }}
                                socket={room.socket}
                                targetUserName={giftTargetUser?.name}
                                onOpenShop={() => setTokenShopOpen(true)}
                            />
                            <TokenShop
                                isOpen={tokenShopOpen}
                                onClose={() => setTokenShopOpen(false)}
                                socket={room.socket}
                            />

                            {/* ADMIN PANEL WINDOW (admin+) */}
                            {userLevel >= ROLE_HIERARCHY.admin && (
                                <AdminPanelWindow
                                    socket={room.socket}
                                    users={room.state.users}
                                    currentUser={room.state.currentUser}
                                    roomState={room.state}
                                    systemSettings={room.state.systemSettings}
                                />
                            )}

                            {/* Context Menu */}
                            {
                                contextMenu && (
                                    <ContextMenu
                                        items={getMenuItems()}
                                        x={contextMenu.x}
                                        y={contextMenu.y}
                                        onClose={() => setContextMenu(null)}
                                        onItemClick={handleMenuItemClick}
                                    />
                                )
                            }

                            {/* Toast Container */}
                            <ToastContainer toasts={toasts} removeToast={removeToast} />

                            {/* One-to-One Invite Popup */}
                            {
                                one2oneInvite && (
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                        <div style={{
                                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                                            borderRadius: '16px',
                                            padding: '32px',
                                            maxWidth: '380px',
                                            width: '90%',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(79, 172, 254, 0.15)',
                                            border: '1px solid rgba(79, 172, 254, 0.2)',
                                            animation: 'slideIn 0.3s ease-out',
                                            textAlign: 'center' as const,
                                        }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto 16px',
                                                fontSize: '28px',
                                                color: '#fff',
                                                fontWeight: 700,
                                                boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)',
                                            }}>
                                                {one2oneInvite.fromAvatar
                                                    ? <img src={one2oneInvite.fromAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                    : one2oneInvite.fromDisplayName.charAt(0).toUpperCase()
                                                }
                                            </div>

                                            {/* Title */}
                                            <h3 style={{
                                                color: '#fff',
                                                fontSize: '18px',
                                                fontWeight: 700,
                                                marginBottom: '8px',
                                            }}>
                                                📞 Bire Bir Davet
                                            </h3>

                                            {/* Message */}
                                            <p style={{
                                                color: 'rgba(255,255,255,0.7)',
                                                fontSize: '14px',
                                                marginBottom: '24px',
                                                lineHeight: '1.5',
                                            }}>
                                                <strong style={{ color: '#4facfe' }}>{one2oneInvite.fromDisplayName}</strong> sizi bire bir görüşmeye davet ediyor.
                                            </p>

                                            {/* Buttons */}
                                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        if (room.socket) {
                                                            room.socket.emit('one2one:accept', {
                                                                fromUserId: one2oneInvite.fromUserId,
                                                            });
                                                        }
                                                        // Hemen call active state'ini set et
                                                        setOne2oneCallActive({
                                                            otherDisplayName: one2oneInvite.fromDisplayName,
                                                            otherAvatar: one2oneInvite.fromAvatar,
                                                            otherRole: one2oneInvite.fromRole,
                                                            otherUserId: one2oneInvite.fromUserId,
                                                        });
                                                        setOne2oneInvite(null);
                                                        addToast('success', 'Kabul Edildi', 'Bire bir görüşme başlatılıyor...');
                                                    }}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #00b894, #00cec9)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        padding: '10px 28px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 4px 15px rgba(0, 184, 148, 0.3)',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                >
                                                    ✅ Kabul Et
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (room.socket) {
                                                            room.socket.emit('one2one:reject', {
                                                                fromUserId: one2oneInvite.fromUserId,
                                                            });
                                                        }
                                                        setOne2oneInvite(null);
                                                        addToast('info', 'Reddedildi', 'Davet reddedildi.');
                                                    }}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.08)',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '10px',
                                                        padding: '10px 28px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                >
                                                    ❌ Reddet
                                                </button>
                                            </div>

                                            {/* Timer bar */}
                                            <div style={{
                                                marginTop: '20px',
                                                height: '3px',
                                                borderRadius: '2px',
                                                background: 'rgba(255,255,255,0.1)',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                                                    animation: 'shrink 30s linear forwards',
                                                    width: '100%',
                                                }} />
                                            </div>
                                        </div>

                                        <style>{`
                            @keyframes slideIn {
                                from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                                to { opacity: 1; transform: translateY(0) scale(1); }
                            }
                            @keyframes shrink {
                                from { width: 100%; }
                                to { width: 0%; }
                            }
                        `}</style>
                                    </div>
                                )
                            }



                            {/* Confirm Modal */}
                            <ConfirmModal
                                isOpen={confirmModal.isOpen}
                                title={confirmModal.title || 'Onay'}
                                message={confirmModal.message}
                                variant={(confirmModal.variant as 'info' | 'danger' | 'warning') || undefined}
                                onConfirm={confirmModal.onConfirm}
                                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            />

                            {/* All Users Modal */}
                            <AllUsersModal
                                isOpen={isAllUsersOpen}
                                onClose={() => setIsAllUsersOpen(false)}
                                socket={room.socket}
                                currentUser={room.state.currentUser}
                                onOpenDM={(username) => {
                                    room.actions.openDM(username);
                                    addToast('info', 'Özel Mesaj', `${username} ile özel mesajlaşma başlatıldı.`);
                                }}
                            />

                            {/* Change Name Modal */}
                            <ChangeNameModal
                                isOpen={isChangeNameOpen}
                                currentName={room.state.currentUser?.username || ''}
                                onClose={() => setIsChangeNameOpen(false)}
                                onSubmit={(newName) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-name', { newName });
                                        addToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${newName}`);
                                    }
                                }}
                            />

                            {/* Settings Modal (Centered) */}
                            <SettingsModal
                                anchorRef={settingsAnchor}
                                isOpen={isSettingsOpen}
                                onClose={() => setIsSettingsOpen(false)}
                                availableDevices={room.state.availableDevices}
                                selectedVideoDeviceId={room.state.selectedVideoDeviceId}
                                selectedAudioDeviceId={room.state.selectedAudioDeviceId}
                                onRefreshDevices={room.actions.refreshDevices}
                                onSelectVideoDevice={room.actions.setSelectedVideoDeviceId}
                                onSelectAudioDevice={room.actions.setSelectedAudioDeviceId}
                                cameraStream={room.state.localStream}
                                currentLanguage={room.state.systemSettings?.defaultLanguage || 'tr'}
                                onLanguageChange={(lang) => {
                                    if (room.socket) {
                                        room.socket.emit('admin:saveSetting', { key: 'defaultLanguage', value: lang });
                                    }
                                }}
                            />

                            {/* Profile Modal */}
                            <ProfileModal
                                isOpen={isProfileOpen}
                                onClose={() => setIsProfileOpen(false)}
                                currentUser={room.state.currentUser}
                                onChangeName={(newName) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-name', { newName });
                                        addToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${newName}`);
                                    }
                                }}
                                onChangeAvatar={(avatarUrl) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-avatar', { avatar: avatarUrl });
                                        addToast('success', 'Avatar Değiştirildi', 'Yeni avatarınız kaydedildi.');
                                    }
                                }}
                                onChangeNameColor={(color) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-name-color', { color });
                                        addToast('success', 'Renk Değiştirildi', 'İsim renginiz güncellendi.');
                                    }
                                }}
                                onChangePassword={(oldPass, newPass) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-password', { oldPassword: oldPass, newPassword: newPass });
                                        addToast('success', 'Şifre Değiştirildi', 'Şifreniz güncellendi.');
                                    }
                                }}
                            />

                            {/* GodMaster Profile Modal */}
                            <GodMasterProfileModal
                                isOpen={isGodMasterProfileOpen}
                                onClose={() => setIsGodMasterProfileOpen(false)}
                                currentUser={room.state.currentUser}
                                onChangeName={(newName) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-name', { newName });
                                        addToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${newName}`);
                                    }
                                }}
                                onChangeAvatar={(avatarUrl) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-avatar', { avatar: avatarUrl });
                                    }
                                }}
                                onChangeNameColor={(color) => {
                                    if (room.socket) {
                                        room.socket.emit('status:change-name-color', { color });
                                        addToast('success', 'Renk Değiştirildi', 'İsim renginiz güncellendi.');
                                    }
                                }}
                                onChangeIcon={(icon) => {
                                    // Store GodMaster icon in localStorage and emit to backend
                                    try { localStorage.setItem('soprano_godmaster_icon', icon); } catch (e) { }
                                    if (room.socket) {
                                        room.socket.emit('status:change-godmaster-icon', { icon });
                                        addToast('success', 'İkon Güncellendi', `Yeni ikonunuz: ${icon}`);
                                    }
                                }}
                            />

                            {/* User Info Modal */}
                            {
                                userInfoTarget && (
                                    <UserInfoModal
                                        user={userInfoTarget}
                                        onClose={() => setUserInfoTarget(null)}
                                    />
                                )
                            }

                            {/* Room Monitor Modal */}
                            <RoomMonitorModal
                                isOpen={isRoomMonitorOpen}
                                onClose={() => setIsRoomMonitorOpen(false)}
                                socket={room.socket}
                                currentRoomSlug={activeSlug}
                                onNavigateToRoom={(roomSlug) => { window.location.href = roomUrl(roomSlug); }}
                                onUserAction={(item, targetUser) => {
                                    handleMenuItemClick(item, targetUser.userId, targetUser.displayName);
                                }}
                                userLevel={userLevel}
                                currentUserId={room.state.currentUser?.userId}
                                currentUserRole={room.state.currentUser?.role}
                            />

                            {/* Meeting Modal kaldırıldı — toplantı odası artık ayrı sayfa */}


                            {/* User History Modal */}
                            <UserHistoryModal
                                isOpen={!!userHistoryTarget}
                                onClose={() => setUserHistoryTarget(null)}
                                userId={userHistoryTarget?.userId || ''}
                                displayName={userHistoryTarget?.displayName || ''}
                            />

                            {/* Mobile sidebar toggle button — OUTSIDE glass-panel to avoid containing block issues */}
                            <button
                                className="hidden max-md:flex fixed top-3 left-3 z-[9997] w-[42px] h-[42px] rounded-xl items-center justify-center cursor-pointer"
                                style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(123, 159, 239, 0.25)', color: '#a3bfff', backdropFilter: 'blur(12px)', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
                                onClick={() => setMobileSidebarOpen(prev => !prev)}
                                aria-label="Kullanıcı listesini aç"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </button>

                            {/* Mobile sidebar drawer — OUTSIDE glass-panel, no containing block issues */}
                            {
                                mobileSidebarOpen && (
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
                                    >
                                        {/* Backdrop */}
                                        <div
                                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
                                            onClick={() => setMobileSidebarOpen(false)}
                                        />
                                        {/* Sidebar */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: 300,
                                                height: '100%',
                                                background: 'rgba(7, 11, 20, 0.98)',
                                                boxShadow: '4px 0 30px rgba(0,0,0,0.6)',
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                animation: 'mobileSidebarSlideIn 0.25s ease-out both',
                                            }}
                                        >
                                            <SidebarLeft
                                                room={room}
                                                users={room.state.users}
                                                currentUser={room.state.currentUser}
                                                onEmptyContextMenu={handleEmptyAreaContextMenu}
                                                onUserContextMenu={handleUserContextMenu}
                                                isAudioTestOpen={isAudioTestOpen}
                                                onCloseAudioTest={() => setIsAudioTestOpen(false)}
                                                mobileSidebarOpen={mobileSidebarOpen}
                                                onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                                                ignoredUsers={ignoredUsers}
                                                isMeetingRoom={isMeetingRoom}
                                                speakingUsers={room.state.speakingUsers}
                                            />
                                        </div>
                                    </div>
                                )
                            }

                            <div className={`glass-panel room-container w-full max-w-[1700px] h-[88vh] rounded-[28px] flex overflow-hidden relative shadow-2xl`}
                                style={{
                                    animation: 'roomEntranceZoom 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
                                    ...(isMeetingRoom ? {
                                        background: 'linear-gradient(135deg, rgba(15, 10, 35, 0.95) 0%, rgba(25, 15, 50, 0.92) 50%, rgba(15, 10, 35, 0.95) 100%)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        boxShadow: '0 0 60px rgba(139, 92, 246, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)',
                                    } : isModernTheme ? {
                                        background: 'rgba(7, 11, 20, 0.92)',
                                        backdropFilter: 'blur(80px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(80px) saturate(180%)',
                                        border: '1px solid rgba(123, 159, 239, 0.12)',
                                        boxShadow: '0 0 40px rgba(123, 159, 239, 0.18), 0 0 80px rgba(123, 159, 239, 0.12), 0 0 140px rgba(123, 159, 239, 0.08), 0 0 220px rgba(123, 159, 239, 0.05), 0 0 320px rgba(123, 159, 239, 0.03), 0 40px 80px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123, 159, 239, 0.10)',
                                        ...(activeDesign?.colors ? {
                                            '--room-sidebar-bg': activeDesign.colors.sidebarLeft || '',
                                            '--room-header-bg': activeDesign.colors.header || '',
                                            '--room-chat-bg': activeDesign.colors.chatArea || '',
                                            '--room-toolbar-bg': activeDesign.colors.toolbar || '',
                                            '--room-right-bg': activeDesign.colors.rightPanel || '',
                                        } as React.CSSProperties : {})
                                    } : {})
                                }}
                            >
                                {/* ═══ UNIFIED TOP BAR OVERLAY — spans all columns ═══ */}
                                <div className="absolute top-0 left-0 right-0 h-[96px] z-20 pointer-events-none rounded-t-[28px]" style={{ background: 'linear-gradient(180deg, rgba(180,40,50,0.12) 0%, rgba(140,30,40,0.06) 40%, transparent 100%)' }}>
                                    {/* Top edge highlight */}
                                    <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[28px]" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(220,80,80,0.25) 25%, rgba(240,100,100,0.40) 50%, rgba(220,80,80,0.25) 75%, transparent 95%)' }} />
                                    {/* Bottom accent glow line */}
                                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(200,60,60,0.25) 25%, rgba(240,100,100,0.40) 50%, rgba(200,60,60,0.25) 75%, transparent 95%)', boxShadow: '0 1px 10px rgba(200,60,60,0.10)' }} />
                                </div>

                                {/* 1. LEFT SIDEBAR — desktop only, hidden on mobile */}
                                <SidebarLeft
                                    room={room}
                                    users={room.state.users}
                                    currentUser={room.state.currentUser}
                                    onEmptyContextMenu={handleEmptyAreaContextMenu}
                                    onUserContextMenu={handleUserContextMenu}
                                    isAudioTestOpen={isAudioTestOpen}
                                    onCloseAudioTest={() => setIsAudioTestOpen(false)}
                                    mobileSidebarOpen={mobileSidebarOpen}
                                    onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                                    ignoredUsers={ignoredUsers}
                                    isMeetingRoom={isMeetingRoom}
                                    speakingUsers={room.state.speakingUsers}
                                />

                                {/* 2. CENTER PANEL (Header, Chat, Toolbar) */}
                                <main className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10" onContextMenu={handleChatContextMenu} style={{ background: 'linear-gradient(180deg, rgba(7, 11, 20, 0.6) 0%, rgba(10, 15, 28, 0.4) 50%, transparent 100%)' }}>
                                    {isMeetingRoom ? (
                                        /* ━━━ TOPLANTI ODASI ÖZEL HEADER ━━━ */
                                        <header className="h-24 flex-shrink-0 border-b backdrop-blur-md flex items-center justify-between px-8 relative z-30"
                                            style={{
                                                background: 'linear-gradient(90deg, rgba(15, 10, 35, 0.9) 0%, rgba(25, 15, 55, 0.85) 50%, rgba(15, 10, 35, 0.9) 100%)',
                                                borderColor: 'rgba(139, 92, 246, 0.2)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '42px', height: '42px', borderRadius: '14px',
                                                    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '20px',
                                                    boxShadow: '0 0 24px rgba(139, 92, 246, 0.4)',
                                                }}>🔒</div>
                                                <div>
                                                    <div style={{
                                                        fontSize: '16px', fontWeight: 800, letterSpacing: '2px',
                                                        background: 'linear-gradient(90deg, #c4b5fd, #a78bfa, #818cf8)',
                                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                    }}>TOPLANTI ODASI</div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(167, 139, 250, 0.6)', fontWeight: 500 }}>
                                                        Sadece yetkili personel
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '16px',
                                            }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    background: 'rgba(139, 92, 246, 0.12)',
                                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                                    borderRadius: '20px', padding: '6px 16px',
                                                }}>
                                                    <div style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        background: '#22c55e',
                                                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                                                        animation: 'mtgLive 2s ease-in-out infinite',
                                                    }} />
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa' }}>AKTİF</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                                    <span style={{ fontSize: '14px' }}>👥</span>
                                                    <span style={{ fontWeight: 700, color: '#a78bfa' }}>{room.state.users?.length || 0}</span>
                                                    <span>katılımcı</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const firstRoom = room.state.rooms?.find((r: any) => !r.isMeetingRoom);
                                                        router.push(roomUrl(firstRoom?.slug || 'oda-1'));
                                                    }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        borderRadius: '12px', padding: '6px 14px',
                                                        color: '#f87171', fontSize: '12px', fontWeight: 600,
                                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                                    }}
                                                >
                                                    🚪 Ayrıl
                                                </button>
                                            </div>
                                            <style>{`@keyframes mtgLive { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
                                        </header>
                                    ) : (
                                        <HeaderRooms
                                            currentSlug={activeSlug}
                                            totalUsers={room.state.users.length}
                                            currentSpeaker={room.state.currentSpeaker}
                                            rooms={room.state.rooms}
                                            systemSettings={room.state.systemSettings}
                                            onNavigate={setActiveSlug}
                                            currentUserRole={room.state.currentUser?.role || 'guest'}
                                            activeRoomParticipants={room.state.users}
                                        />
                                    )}
                                    {/* 💳 ÖDEME HATIRLATMA — neon uyarı banner (oda isimlerinin altında) */}
                                    {room.state.paymentReminder && (
                                        <div style={{
                                            background: 'linear-gradient(90deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.06) 50%, rgba(245,158,11,0.08) 100%)',
                                            borderBottom: '1px solid rgba(245,158,11,0.25)',
                                            padding: '10px 16px',
                                            flexShrink: 0,
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}>
                                            {/* Neon glow arka plan efekti */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '60%',
                                                height: '100%',
                                                background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.12) 0%, transparent 70%)',
                                                pointerEvents: 'none',
                                            }} />
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                position: 'relative',
                                                zIndex: 1,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {/* Neon uyarı ikonu */}
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: 'rgba(245,158,11,0.15)',
                                                        border: '1px solid rgba(245,158,11,0.4)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 12px rgba(245,158,11,0.3), 0 0 24px rgba(245,158,11,0.1)',
                                                        animation: 'pulse 2s ease-in-out infinite',
                                                        flexShrink: 0,
                                                    }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                            <line x1="12" y1="9" x2="12" y2="13" />
                                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p style={{
                                                            color: '#fbbf24',
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            letterSpacing: '0.02em',
                                                            textShadow: '0 0 8px rgba(251,191,36,0.3)',
                                                            margin: 0,
                                                        }}>
                                                            {room.state.paymentReminder.message}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => room.actions.dismissPaymentReminder()}
                                                    style={{
                                                        background: 'rgba(245,158,11,0.12)',
                                                        border: '1px solid rgba(245,158,11,0.25)',
                                                        borderRadius: 6,
                                                        padding: '4px 6px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                    title="Kapat"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Room Announcement Banner — Marquee */}
                                    {room.state.roomSettings?.announcement && (
                                        <div style={{
                                            background: 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(99,102,241,0.12) 100%)',
                                            borderBottom: '1px solid rgba(99,102,241,0.15)',
                                            padding: '10px 0',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            position: 'relative',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                animation: 'marquee-scroll 20s linear infinite',
                                                whiteSpace: 'nowrap',
                                                width: 'max-content',
                                                paddingLeft: '100%',
                                            }}>
                                                <span style={{ fontSize: 20 }}>📢</span>
                                                <span style={{
                                                    fontSize: 15,
                                                    fontWeight: 700,
                                                    letterSpacing: '0.3px',
                                                    background: 'linear-gradient(90deg, #c4b5fd 0%, #a78bfa 30%, #818cf8 60%, #c4b5fd 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundSize: '200% 100%',
                                                    animation: 'gradient-shift 3s ease infinite',
                                                }}>{room.state.roomSettings.announcement}</span>
                                                <span style={{ fontSize: 20 }}>📢</span>
                                            </div>
                                            <style>{`
                                @keyframes marquee-scroll {
                                    0% { transform: translateX(0); }
                                    100% { transform: translateX(-100%); }
                                }
                                @keyframes gradient-shift {
                                    0%, 100% { background-position: 0% 50%; }
                                    50% { background-position: 100% 50%; }
                                }
                            `}</style>
                                        </div>
                                    )}
                                    {/* Chat content — or password form if required */}
                                    {room.passwordRequired ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 64, height: 64, marginBottom: 8,
                                                background: 'rgba(99,102,241,0.12)',
                                                border: '1px solid rgba(99,102,241,0.2)',
                                                borderRadius: 16,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                                </svg>
                                            </div>
                                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Şifreli Oda</h2>
                                            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>{room.passwordRequired.roomName}</p>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const input = (e.target as HTMLFormElement).elements.namedItem('roomPassword') as HTMLInputElement;
                                                if (input?.value) room.actions.joinWithPassword(input.value);
                                            }} style={{ width: 300 }}>
                                                <input
                                                    name="roomPassword"
                                                    type="password"
                                                    autoFocus
                                                    placeholder="Oda şifresini girin..."
                                                    style={{
                                                        width: '100%', padding: '10px 14px',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 10, color: '#fff',
                                                        fontSize: 14, outline: 'none', marginBottom: 12,
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <button
                                                    type="submit"
                                                    style={{
                                                        width: '100%', padding: 10,
                                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                        borderRadius: 10, border: 'none',
                                                        color: '#fff', fontWeight: 700, fontSize: 14,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Giriş Yap
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <>

                                            {/* Eristik Düello Arenası */}
                                            <DuelArena
                                                socket={room.socket}
                                                currentUserId={room.state.currentUser?.id || ''}
                                                roomSlug={activeSlug}
                                            />

                                            {/* Chat messages — visible even for soft-banned users */}
                                            <div className="chat-area" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                                <ChatMessages
                                                    room={room}
                                                    messages={room.state.messages}
                                                    currentUser={room.state.currentUser}
                                                    onContextMenu={handleChatContextMenu}
                                                    ignoredUsers={ignoredUsers}
                                                    roomName={room.state.rooms?.find((r: any) => r.slug === activeSlug)?.name}
                                                />
                                                {/* ★ SOFT BAN chat overlay — büyük ban uyarısı */}
                                                {room.state.banInfo && room.state.banInfo.banLevel === 'soft' && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0,
                                                        background: 'rgba(0,0,0,0.75)',
                                                        backdropFilter: 'blur(4px)',
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        zIndex: 50,
                                                        pointerEvents: 'none',
                                                    }}>
                                                        <div style={{ fontSize: 56, marginBottom: 8, animation: 'banIconBlink 1.5s ease-in-out infinite' }}>🚫</div>
                                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', margin: 0 }}>Geçici Yasak</h3>
                                                        <p style={{ fontSize: 13, color: '#fca5a5', margin: '6px 0 0 0', textAlign: 'center', maxWidth: 280 }}>
                                                            Yazma, mikrofon, emoji ve tüm etkileşimleriniz kapatılmıştır.
                                                        </p>
                                                        {room.state.banInfo.expiresAt && (
                                                            <p style={{ fontSize: 12, color: '#fbbf24', margin: '8px 0 0 0' }}>
                                                                Kalan: {(() => {
                                                                    const ms = new Date(room.state.banInfo.expiresAt!).getTime() - Date.now();
                                                                    const h = Math.floor(ms / 3600000);
                                                                    const m = Math.floor((ms % 3600000) / 60000);
                                                                    return `${h} saat ${m} dk`;
                                                                })()}
                                                            </p>
                                                        )}
                                                        <style>{`
                                                    @keyframes banIconBlink {
                                                        0%, 100% { opacity: 1; transform: scale(1); }
                                                        50% { opacity: 0.5; transform: scale(0.9); }
                                                    }
                                                `}</style>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Toolbar — soft ban'da disable */}
                                            <div style={room.state.banInfo?.banLevel === 'soft' ? { pointerEvents: 'none', opacity: 0.3, filter: 'grayscale(1)' } : {}}>
                                                <BottomToolbar
                                                    onSendMessage={room.actions.sendMessage}
                                                    onRequestMic={room.actions.requestMic}
                                                    onReleaseMic={room.actions.releaseMic}
                                                    onJoinQueue={room.actions.joinQueue}
                                                    onLeaveQueue={room.actions.leaveQueue}
                                                    onToggleCamera={room.actions.toggleCamera}
                                                    onLeaveRoom={room.actions.leaveRoom}
                                                    onToggleSettings={() => setIsSettingsOpen(prev => !prev)}
                                                    onRegisterSettingsRef={(ref: any) => setSettingsAnchor(ref)}
                                                    isCameraOn={room.state.isCameraOn}
                                                    isMicOn={room.state.isMicOn}
                                                    currentSpeaker={room.state.currentSpeaker}
                                                    currentUser={room.state.currentUser}
                                                    queue={room.state.queue}
                                                    lastError={room.state.lastError}
                                                    onDismissError={room.actions.dismissError}
                                                    onToggleRemoteVolume={room.actions.toggleRemoteVolume}
                                                    isRemoteMuted={room.state.isRemoteMuted}
                                                    remoteVolume={room.state.remoteVolume}
                                                    isChatLocked={room.state.isChatLocked}
                                                    isCurrentUserMuted={room.state.isCurrentUserMuted}
                                                    isCurrentUserGagged={room.state.isCurrentUserGagged}
                                                    onEmojiClick={() => addToast('info', 'Yakında', 'Emoji özelliği yakında eklenecek. 😊')}
                                                    onStickerClick={() => addToast('info', 'Yakında', 'Sticker özelliği yakında eklenecek. 🎨')}
                                                    onGifClick={() => addToast('info', 'Yakında', 'GIF özelliği yakında eklenecek. 🎬')}
                                                    onVolumeChange={room.actions.setRemoteVolume}
                                                    tvVolume={tvVolume}
                                                    onTvVolumeChange={setTvVolume}
                                                    hasTvStream={!!tvVideoUrl && !(videoState.tvStreamEntry?.stream)}
                                                    systemSettings={room.state.systemSettings}
                                                    isMeetingRoom={isMeetingRoom}
                                                    onToggleMeetingMic={room.actions.toggleMeetingMic}
                                                />
                                            </div>
                                        </>
                                    )}
                                </main>

                                {/* 3. RIGHT PANEL (TV / Live Stream) — only for CAMERA tenants */}
                                {(room.state.systemSettings?.packageType ?? 'CAMERA') === 'CAMERA' && (
                                    <RightLivePanel
                                        speakerStream={videoState.tvStreamEntry?.stream || null}
                                        speakerUsername={videoState.tvStreamEntry?.username}
                                        otherStreams={(() => {
                                            const others: { id: string; stream: MediaStream; username?: string }[] = [];

                                            // Add self if not on TV and camera ON
                                            if (room.state.isCameraOn && room.state.localStream && videoState.tvStreamEntry?.username !== room.state.currentUser?.username) {
                                                others.push({ id: 'me', stream: room.state.localStream, username: 'Ben' });
                                            }

                                            // Add remote camera streams (from mediasoup) — exclude TV speaker
                                            const tvPeerId = videoState.tvStreamEntry ? room.state.users.find(u => u.username === videoState.tvStreamEntry?.username)?.userId : null;
                                            room.state.remoteStreams
                                                .filter(rs => rs.stream.getVideoTracks().length > 0 && rs.peerId !== tvPeerId)
                                                .forEach(rs => {
                                                    const user = room.state.users.find(u => u.userId === rs.peerId);
                                                    others.push({ id: rs.peerId, stream: rs.stream, username: user?.username || rs.peerId });
                                                });

                                            return others;
                                        })()}
                                        remoteVolume={room.state.remoteVolume}
                                        isSpeakerLocal={videoState.tvStreamEntry?.isLocal || false}
                                        onPinStream={(userId) => videoState.setPinnedUserId(userId)}
                                        tvVideoUrl={tvVideoUrl}
                                        tvVolume={tvVolume}
                                        userLevel={userLevel}
                                        onSetTvVideo={(url) => {
                                            room.socket?.emit('tv:setYoutube', { url });
                                        }}
                                    />
                                )}



                                {/* DM Windows Layer */}
                                {room.state.openDMs && room.state.openDMs.map((dmUser, idx) => {
                                    const dmParticipant = room.state.users?.find((p: any) => p.displayName === dmUser || p.username === dmUser);
                                    const dmUserId = dmParticipant?.userId;
                                    const isDmIgnored = dmUserId ? ignoredUsers.has(dmUserId) : false;
                                    return (
                                        <DMWindow
                                            key={dmUser}
                                            targetUsername={dmUser}
                                            messages={room.state.dmMessages[dmUser] || []}
                                            onClose={() => room.actions.closeDM(dmUser)}
                                            onMinimize={() => { }}
                                            onSendMessage={(text) => room.actions.sendDM(dmUser, text)}
                                            onIgnore={dmUserId ? () => {
                                                setIgnoredUsers(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(dmUserId)) next.delete(dmUserId);
                                                    else next.add(dmUserId);
                                                    return next;
                                                });
                                            } : undefined}
                                            isIgnored={isDmIgnored}
                                            initialPosition={{ x: 200 + (idx * 30), y: 150 + (idx * 30) }}
                                        />
                                    );
                                })}

                                {/* Theme Switcher moved to BottomToolbar */}
                            </div>

                            {/* ═══ CONTEXT MENU (sağ tık menüsü) — MUST be outside glass-panel to avoid backdrop-filter containing block ═══ */}
                            {contextMenu && (
                                <ContextMenu
                                    items={getMenuItems()}
                                    x={contextMenu.x}
                                    y={contextMenu.y}
                                    onClose={() => setContextMenu(null)}
                                    onItemClick={(item) => {
                                        handleMenuItemClick(item);
                                        setContextMenu(null);
                                    }}
                                />
                            )}
                        </>
                    )}
                </main>
            </>
            {/* ═══ BONUS POPUP — Günlük/VIP bonus bildirimi ═══ */}
            <BonusPopup bonus={bonusQueue.current} onClose={bonusQueue.dismiss} />
        </LanguageProvider >
    );
}
