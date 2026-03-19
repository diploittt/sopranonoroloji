"use client";

import { use, useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { usePathname } from 'next/navigation';
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
// ProfileModal removed — profile settings now integrated into SidebarLeft
import { GodMasterProfileModal } from '@/components/room/GodMasterProfileModal';
import { One2OneRoomView } from '@/components/roomUI/One2OneRoomView';
import { UserInfoModal } from '@/components/room/UserInfoModal';
import { RoomMonitorModal } from '@/components/room/RoomMonitorModal';
// MeetingModal kaldırıldı — toplantı odası artık ayrı sayfa olarak açılır
import { MeetingRoomBanner } from '@/components/room/MeetingRoomBanner';
import { LanguageProvider } from '@/i18n/LanguageProvider';

import { UserHistoryModal } from '@/components/room/UserHistoryModal';
import OneToOneCallView from '@/components/roomUI/OneToOneCallView';
import { useRouter } from 'next/navigation';
import DuelArena from '@/components/roomUI/DuelArena';

// ═══ Room Nav Scroller — header'daki oda butonları için yatay scroll bileşeni ═══
function RoomNavScroller({ rooms, activeSlug, onSelect }: { rooms: any[]; activeSlug: string; onSelect: (slug: string) => void }) {
    const navRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const checkScroll = useCallback(() => {
        const el = navRef.current;
        if (!el) return;
        setShowLeft(el.scrollLeft > 8);
        setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    }, []);

    useEffect(() => {
        const el = navRef.current;
        if (!el) return;
        // İlk kontrol — biraz gecikmeyle (render sonrası)
        const t = setTimeout(checkScroll, 100);
        el.addEventListener('scroll', checkScroll);
        const ro = new ResizeObserver(checkScroll);
        ro.observe(el);
        return () => { clearTimeout(t); el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
    }, [rooms.length, checkScroll]);

    const scroll = (dir: number) => {
        navRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
    };

    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', minWidth: 0, overflow: 'hidden' }}>
            {/* Left Arrow */}
            {showLeft && (
                <button onClick={() => scroll(-1)} style={{
                    position: 'absolute', left: 0, zIndex: 10,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(30,34,46,0.95)', border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 700,
                }}>‹</button>
            )}

            {/* Scrollable Nav */}
            <div
                ref={navRef}
                style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    overflowX: 'auto', overflowY: 'hidden',
                    flex: 1, paddingLeft: showLeft ? 30 : 4, paddingRight: showRight ? 30 : 4,
                    scrollbarWidth: 'none',
                    transition: 'padding 0.2s',
                }}
                className="room-nav-scroll"
            >
                {rooms.map((tab: any) => {
                    const isActive = tab.slug === activeSlug;
                    return (
                        <button
                            key={tab.slug}
                            onClick={() => onSelect(tab.slug)}
                            style={{
                                padding: '4px 12px',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 100%)'
                                    : 'rgba(255,255,255,0.04)',
                                border: isActive
                                    ? '1px solid rgba(251,191,36,0.35)'
                                    : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 16,
                                cursor: 'pointer',
                                color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: isActive ? 700 : 600,
                                letterSpacing: '1.2px',
                                textTransform: 'uppercase' as const,
                                textDecoration: 'none',
                                transition: 'all 0.3s ease',
                                textShadow: isActive ? '0 0 12px rgba(251,191,36,0.5)' : 'none',
                                boxShadow: isActive
                                    ? '0 0 12px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                whiteSpace: 'nowrap' as const,
                                flexShrink: 0,
                                position: 'relative' as const,
                            }}
                        >
                            {tab.name}
                            {isActive && (
                                <span style={{
                                    position: 'absolute', bottom: -2, left: '20%', right: '20%',
                                    height: 2, borderRadius: 1,
                                    background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Right Arrow */}
            {showRight && (
                <button onClick={() => scroll(1)} style={{
                    position: 'absolute', right: 0, zIndex: 10,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(30,34,46,0.95)', border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 700,
                }}>›</button>
            )}
        </div>
    );
}

// ─── PERMISSION-BASED MENU SYSTEM ──────────────────────────────────
// ALL permissions, role hierarchy, and menu filtering are defined in
// @/common/roomPermissions.ts — single source of truth.

// ─── EMPTY AREA MENU ITEMS ─────────────────────────────────────────
const EMPTY_AREA_ITEMS: ContextMenuItem[] = [

    { id: 'admin-panel', label: 'Admin Paneli', icon: '⚙️', action: 'openAdminPanel', description: 'Admin paneline git' },
    { id: 'meeting', label: 'Toplantı Odası', icon: '🔒', action: 'joinMeetingRoom', description: 'Yetkili toplantı odasına gir' },
    { id: 'clear-chat', label: 'Yazıları Sil', icon: '🗑️', action: 'clearChatRealtime', description: 'Chat ekranını temizle (herkes için)', confirm: true, confirmMessage: 'Tüm chat geçmişi silinecek. Emin misiniz?' },
    { id: 'check-history', label: 'Geçmişi Kontrol Et', icon: '📜', action: 'openHistoryModal', description: 'Chat ve oda geçmişini görüntüle' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', action: 'openUsersModal', description: 'Tüm odalardaki kullanıcıları göster' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: '🏠', action: 'openRoomMonitor', description: 'Tüm odaları izle ve yönet' },
    { id: 'mic-free', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicrophone', description: 'Mikrofonu serbest bırak' },
    { id: 'mic-take', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicrophone', description: 'Mikrofonu al' },
    { id: 'talk-test', label: 'Mikrofon Testi', icon: '🎙️', action: 'testUserAudio', description: 'Mikrofonun çalışıp çalışmadığını test et' },
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
    { id: 'stop-text-local', label: 'Yazıları Durdur', icon: '⏸️', action: 'stopMessagesLocal', scope: 'local' },
    { id: 'clear-text-global', label: 'Yazıları Temizle', icon: '🗑️', action: 'clearMessagesGlobal', scope: 'global', confirm: true, confirmMessage: 'Tüm yazılar temizlenecek. Emin misiniz?' },
    { id: 'clear-text-local', label: 'Yazıları Temizle', icon: '🗑️', action: 'clearMessagesLocal', scope: 'local' },
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
function RoomAccessError({ message, isVipError, fallbackSlug, onNavigate }: { message: string; isVipError: boolean; fallbackSlug: string | null; onNavigate?: (slug: string) => void }) {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!isVipError || !fallbackSlug) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (onNavigate) {
                        onNavigate(fallbackSlug);
                    } else {
                        // Fallback: window.location.href
                        const currentPath = window.location.pathname;
                        const tenantMatch = currentPath.match(/^\/t\/([^/]+)/);
                        if (tenantMatch) {
                            window.location.href = `/t/${tenantMatch[1]}/room/${fallbackSlug}`;
                        } else {
                            window.location.href = `/room/${fallbackSlug}`;
                        }
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isVipError, fallbackSlug, onNavigate]);

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
    // ★ Client-side VIP/erişim hatası state'i — backend round-trip beklenmeden anında overlay
    const [clientRoomError, setClientRoomError] = useState<{ message: string; code?: string; fallbackSlug?: string } | null>(null);
    // Sync activeSlug when URL param changes (e.g. browser back/forward)
    useEffect(() => { setActiveSlug(urlSlug); }, [urlSlug]);
    const room = useRoomRealtime({ slug: activeSlug });
    const { openPanel, closePanel, setActiveTab } = useAdminPanelStore();
    const isMeetingRoom = activeSlug === 'staff-meeting';
    const isOne2OneRoom = activeSlug.startsWith('one2one-');

    // Animasyonlar bir kez oynadıktan sonra tekrarı engelle (SSR-safe)
    const [roomAnimsPlayed, setRoomAnimsPlayed] = useState(false);

    // ★ Hydration guard — typeof window SSR/client uyumsuzluğunu önler
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => {
        if (sessionStorage.getItem('room-anims-played')) {
            setRoomAnimsPlayed(true);
        } else {
            const t = setTimeout(() => { sessionStorage.setItem('room-anims-played', '1'); setRoomAnimsPlayed(true); }, 2500);
            return () => clearTimeout(t);
        }
    }, []);

    // ─── Branding Live Preview (admin SettingsTab'dan canlı değişiklik) ───
    const [brandingPreview, setBrandingPreview] = useState<Record<string, any> | null>(null);
    useEffect(() => {
        const onPreview = (e: Event) => { setBrandingPreview((e as CustomEvent).detail); };
        const onClear = () => { setBrandingPreview(null); };
        window.addEventListener('brandingPreview', onPreview);
        window.addEventListener('brandingPreviewClear', onClear);
        return () => {
            window.removeEventListener('brandingPreview', onPreview);
            window.removeEventListener('brandingPreviewClear', onClear);
        };
    }, []);


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

    // ★ Bağlanıyor overlay'i — gerçek socket + backend bağlantı durumuna göre
    const showConnectingLoader = !room.state.currentUser || !room.socket?.connected;

    const router = useRouter();
    const pathname = usePathname();
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

    // ★ Sync ignoredUsers → useRoomRealtime so DMs from ignored users are blocked
    useEffect(() => {
        room.actions.setDmIgnoredUserIds?.(ignoredUsers);
    }, [ignoredUsers]);

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
    const [tvBroadcastLevel, setTvBroadcastLevel] = useState<number>(0);

    // ★ Oda geçişlerinde TV yayınını sıfırla (bileşen remount olmadığı için)
    useEffect(() => {
        setTvVideoUrl(null);
        setTvVolume(0.7);
        setTvBroadcastLevel(0);
    }, [activeSlug]);

    // Listen for tv:youtubeUpdate events
    useEffect(() => {
        if (!room.socket) return;
        const onYoutubeUpdate = (data: { url: string | null; setBy: string; setByLevel?: number }) => {
            setTvVideoUrl(data.url);
            setTvBroadcastLevel(data.url ? (data.setByLevel || 5) : 0);
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

        // ★ Generic room:toast handler — backend'den gelen tüm toast bildirimlerini göster
        const onRoomToast = (data: { type?: string; title?: string; message?: string }) => {
            const toastType = (data.type === 'error' || data.type === 'warning' || data.type === 'success' || data.type === 'info')
                ? data.type : 'info';
            addToast(toastType, data.title || 'Bildirim', data.message || '');
        };
        room.socket.on('room:toast', onRoomToast);

        return () => {
            room.socket?.off('tv:youtubeUpdate', onYoutubeUpdate);
            room.socket?.off('dailyBonus:received', onBonusReceived);
            room.socket?.off('room:toast', onRoomToast);
        };
    }, [room.socket]);

    // ★ ADMIN PULL-USER: Listen for soprano:force-navigate (dispatched by useSocket when admin pulls user)
    useEffect(() => {
        const onForceNavigate = (e: Event) => {
            const detail = (e as CustomEvent<{ roomSlug: string; by: string }>).detail;
            if (detail?.roomSlug) {
                addToast('info', '📞 Odaya Çekildiniz', `${detail.by || 'Yönetici'} sizi ${detail.roomSlug} odasına çekti.`);
                setActiveSlug(detail.roomSlug);
                window.history.replaceState(null, '', roomUrl(detail.roomSlug));
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
                break;
            case 'unmuteUser':
                room.socket?.emit('admin:userAction', { action: 'mute', targetUserId: targetId, value: false });
                break;
            case 'kickUser':
                room.socket?.emit('admin:userAction', { action: 'kick', targetUserId: targetId });
                break;
            case 'hardKickUser':
                room.socket?.emit('admin:userAction', { action: 'hard_kick', targetUserId: targetId });
                break;
            case 'gagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId });
                break;
            case 'ungagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId, value: false });
                break;
            case 'banUser':
                room.socket?.emit('admin:userAction', { action: 'ban', targetUserId: targetId, duration });
                break;
            case 'unbanUser':
                room.socket?.emit('admin:userAction', { action: 'unban', targetUserId: targetId });
                break;
            case 'blockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId });
                break;
            case 'unblockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId, value: false });
                break;
            case 'exitBrowser':
                room.socket?.emit('admin:userAction', { action: 'exit_browser', targetUserId: targetId });
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
                setActiveSlug('staff-meeting');
                window.history.replaceState(null, '', roomUrl('staff-meeting'));
                break;
            case 'joinMeetingRoom':
                setActiveSlug('staff-meeting');
                window.history.replaceState(null, '', roomUrl('staff-meeting'));
                break;
            case 'makeRoomOperator':
                room.socket?.emit('admin:userAction', { action: 'makeRoomOperator', targetUserId: targetId });
                break;
            case 'revokeRole':
                room.socket?.emit('admin:userAction', { action: 'revokeRole', targetUserId: targetId });
                break;
            case 'clearMessages':
            case 'clearUserMessages':
                room.socket?.emit('admin:userAction', { action: 'clear_user_messages', targetUserId: targetId });
                break;
            case 'clearChatRealtime':
                room.socket?.emit('admin:userAction', { action: 'clear_chat_global' });
                break;
            case 'clearMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'clear_chat_global' });
                break;
            case 'clearMessagesLocal':
                room.actions.clearLocalChat();
                addToast('success', 'Yazılar Temizlendi', 'Yerel yazılar temizlendi.');
                break;
            case 'stopMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'stop_messages_global' });
                break;
            case 'stopMessagesLocal':
                room.actions.toggleLocalChatStop();
                addToast('info', 'Yazılar Durduruldu', 'Yerel yazılar durduruldu/açıldı.');
                break;
            case 'freeMicrophone':
            case 'freeMicForUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'release_mic', targetUserId: targetId });
                } else {
                    room.actions.releaseMic();
                    addToast('success', 'Mikrofon Serbest', 'Mikrofon serbest bırakıldı.');
                }
                break;
            case 'takeMicrophone':
            case 'takeMicFromUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'take_mic', targetUserId: targetId });
                } else {
                    room.actions.forceTakeMic();
                    addToast('success', 'Mikrofon Alındı', 'Mikrofon alındı.');
                }
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
                window.history.replaceState(null, '', roomUrl(prevSlug));
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

    // Nudge → DM penceresi aç + titret (ekranı titretme)
    const [dmNudgeTargets, setDmNudgeTargets] = useState<Set<string>>(new Set());
    const [dmNudgeCooldowns, setDmNudgeCooldowns] = useState<Record<string, number>>({});
    const [dmNudgeDisabled, setDmNudgeDisabled] = useState<Set<string>>(new Set());

    // Nudge alındığında DM aç + DM penceresini titret
    const handleNudgeReceived = (from: string) => {
        // Engellenmişse işleme
        if (dmNudgeDisabled.has(from)) return;

        // DM penceresini aç (zaten açıksa tekrar açmaz)
        room.actions.openDM(from);

        addToast('info', '📳 Titretme', `${from} seni titretti!`);

        // DM penceresini titret
        setDmNudgeTargets(prev => new Set(prev).add(from));
        setTimeout(() => {
            setDmNudgeTargets(prev => {
                const next = new Set(prev);
                next.delete(from);
                return next;
            });
        }, 1500);

        // MSN Nudge Sesi
        try {
            const audio = new Audio('/sounds/msn-nudge.mp3');
            audio.volume = 0.7;
            audio.play().catch(() => { });
        } catch { }
    };

    useEffect(() => {
        if (!room.socket) return;
        // Context menü nudge (room:nudge)
        const onRoomNudge = (data: { from: string }) => handleNudgeReceived(data.from);
        // DM nudge (dm:nudge-received)
        const onDmNudge = (data: { from: string; fromUserId: string }) => handleNudgeReceived(data.from);

        room.socket.on('room:nudge', onRoomNudge);
        room.socket.on('dm:nudge-received', onDmNudge);
        return () => {
            room.socket?.off('room:nudge', onRoomNudge);
            room.socket?.off('dm:nudge-received', onDmNudge);
        };
    }, [room.socket, dmNudgeDisabled]);

    const sendDmNudge = (targetUsername: string) => {
        console.log('[DM-NUDGE] Sending nudge to:', targetUsername, 'socket:', !!room.socket);
        if (!room.socket) return;
        room.socket.emit('dm:nudge', { targetUsername });
        // Local cooldown 5 saniye
        setDmNudgeCooldowns(prev => ({ ...prev, [targetUsername]: 5 }));
        const interval = setInterval(() => {
            setDmNudgeCooldowns(prev => {
                const val = (prev[targetUsername] || 0) - 1;
                if (val <= 0) {
                    clearInterval(interval);
                    const next = { ...prev };
                    delete next[targetUsername];
                    return next;
                }
                return { ...prev, [targetUsername]: val };
            });
        }, 1000);
        // Gönderen sesi
        try {
            const audio = new Audio('/sounds/msn-nudge.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch { }
    };

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
                <main className={`app-background w-full flex items-start justify-center pt-3 pb-1 px-4 overflow-hidden text-slate-200 selection:bg-indigo-500/30`} style={{ perspective: '1200px', background: 'linear-gradient(to bottom, #a3ace5 0%, #c4c9ee 50%, #d8dbf4 100%)', backgroundAttachment: 'fixed', height: 'calc(100vh / 0.9)', minHeight: '100vh' }}
                    onContextMenu={(e) => {
                        // Token yoksa sağ tık tamamen engelle
                        if (!room.state.currentUser) { e.preventDefault(); e.stopPropagation(); }
                    }}
                >

                    {/* ★★ ROOM ACCESS ERROR — Full overlay when roomError or clientRoomError is set ★★ */}
                    {(() => {
                        const effectiveError = room.state.roomError || clientRoomError;
                        if (!effectiveError) return null;
                        const code = effectiveError.code;
                        const isVip = code === 'VIP_ONLY';
                        const isLimit = code === 'ROOM_LIMIT_REACHED';
                        return (
                        <div style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(11,13,20,0.95)', backdropFilter: 'blur(12px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{
                                width: 420, maxWidth: '90vw', background: 'rgba(19,21,28,0.95)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
                                padding: '40px 32px', textAlign: 'center',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                            }}>
                                <div style={{
                                    width: 64, height: 64, margin: '0 auto 20px',
                                    background: isVip ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.10)',
                                    border: isVip ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                                }}>
                                    {isVip ? '⭐' : isLimit ? '🚷'
                                        : (code === 'NICK_TAKEN' || code === 'NICK_RESERVED') ? '👤' : '⚠️'}
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                                    {isVip ? 'VIP Odası' : isLimit ? 'Oda Dolu'
                                        : (code === 'NICK_TAKEN' || code === 'NICK_RESERVED') ? 'İsim Kullanımda' : 'Erişim Engellendi'}
                                </h2>
                                <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.6 }}>
                                    {(() => {
                                        const msg = effectiveError.message || '';
                                        const tr: Record<string, string> = {
                                            'VIP members only': 'Bu oda sadece VIP üyelere açıktır.',
                                            'Room is full': 'Oda kapasitesi doldu. Lütfen başka bir odayı deneyin.',
                                            'Nick already taken': 'Bu kullanıcı adı başka biri tarafından kullanılıyor.',
                                            'Nick is reserved': 'Bu kullanıcı adı kullanılamaz.',
                                        };
                                        return tr[msg] || msg || 'Bu odaya giriş yapılamıyor.';
                                    })()}
                                </p>
                                <button
                                    onClick={() => {
                                        // Client-side error temizle
                                        setClientRoomError(null);
                                        if (isVip || isLimit) {
                                            const fallback = effectiveError.fallbackSlug;
                                            if (fallback) {
                                                setActiveSlug(fallback);
                                                window.history.replaceState(null, '', roomUrl(fallback));
                                            } else {
                                                const other = room.state.rooms?.find((r: any) => r.slug !== activeSlug && !r.isVipRoom);
                                                if (other) {
                                                    setActiveSlug(other.slug);
                                                    window.history.replaceState(null, '', roomUrl(other.slug));
                                                } else {
                                                    const tm2 = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                    window.location.href = tm2 ? `/t/${tm2[1]}` : '/';
                                                }
                                            }
                                        } else {
                                            const tm2 = window.location.pathname.match(/^\/t\/([^/]+)/);
                                            window.location.href = tm2 ? `/t/${tm2[1]}` : '/';
                                        }
                                    }}
                                    style={{
                                        padding: '12px 32px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                        background: isVip
                                            ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))'
                                            : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                                        border: isVip
                                            ? '1px solid rgba(251,191,36,0.35)'
                                            : '1px solid rgba(239,68,68,0.3)',
                                        color: isVip
                                            ? 'rgba(253,230,138,0.95)'
                                            : 'rgba(252,165,165,0.95)',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {(isVip || isLimit) ? '← Diğer Odalara Git' : '← Giriş Sayfasına Dön'}
                                </button>
                            </div>
                        </div>
                        );
                    })()}
                    {/* ★★ TOKEN GUARD MODAL — giriş yapılmamış kullanıcılar için floating modal ★★ */}
                    {isMounted && !sessionStorage.getItem('soprano_token') && !room.state.currentUser && (
                        <div style={{
                            position: 'fixed', inset: 0, zIndex: 9999999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.45)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                        }}>
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(20,24,40,0.98) 0%, rgba(15,18,32,0.99) 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 20,
                                padding: '40px 48px',
                                maxWidth: 400,
                                width: '90%',
                                textAlign: 'center',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                                animation: 'tokenGuardIn 0.25s cubic-bezier(0.22,0.61,0.36,1) both',
                            }}>
                                <style>{`
                                    @keyframes tokenGuardIn {
                                        from { opacity: 0; transform: scale(0.94) translateY(12px); }
                                        to   { opacity: 1; transform: scale(1) translateY(0); }
                                    }
                                `}</style>
                                {/* İkon */}
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16,
                                    background: 'rgba(99,102,241,0.12)',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px', fontSize: 28,
                                    boxShadow: '0 0 24px rgba(99,102,241,0.15)',
                                }}>🔐</div>
                                {/* Başlık */}
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Giriş Gerekli</h2>
                                {/* Açıklama */}
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 28px 0' }}>
                                    Bu odaya erişmek için üye girişi veya misafir girişi yapmanız gerekiyor.
                                </p>
                                {/* Buton */}
                                <button
                                    onClick={() => { const t = window.location.pathname.match(/^\/t\/([^/]+)/); window.location.href = t ? `/t/${t[1]}` : '/'; }}
                                    style={{
                                        width: '100%', padding: '12px 0',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        border: 'none', borderRadius: 12,
                                        color: '#fff', fontSize: 14, fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                                        transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    Giriş Yap
                                </button>
                            </div>
                        </div>
                    )}

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
                                    window.history.replaceState(null, '', roomUrl(prevSlug));
                                }
                            }}
                        />
                    ) : (
                        <>
                            {/* ★ DUPLICATE BLOCKED OVERLAY — Yumuşak sakin uyarı ekranı ★ */}
                            {room.state.duplicateBlocked && (
                                <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(15,17,30,0.97) 0%, rgba(20,22,40,0.98) 100%)', backdropFilter: 'blur(32px)' }}>
                                    <div style={{ textAlign: 'center', maxWidth: 480, padding: 48 }}>
                                        {/* Soft pulsing circle with lock icon */}
                                        <div style={{ position: 'relative', width: 108, height: 108, margin: '0 auto 28px' }}>
                                            <div style={{
                                                position: 'absolute', inset: -8, borderRadius: '50%',
                                                background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                                                animation: 'pulse 3s ease-in-out infinite',
                                            }} />
                                            <div style={{
                                                position: 'absolute', inset: 0, borderRadius: '50%',
                                                background: 'rgba(99,102,241,0.06)',
                                                animation: 'pulse 3s ease-in-out infinite 0.5s',
                                            }} />
                                            <div style={{
                                                position: 'relative', width: 108, height: 108, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                                                border: '1.5px solid rgba(99,102,241,0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 0 40px rgba(99,102,241,0.12), inset 0 0 20px rgba(99,102,241,0.05)',
                                            }}>
                                                <span style={{ fontSize: 44, filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.3))' }}>🔒</span>
                                            </div>
                                        </div>
                                        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'rgba(165,180,252,0.95)', marginBottom: 12, letterSpacing: '-0.02em' }}>
                                            Aktif Oturum Tespit Edildi
                                        </h2>
                                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 6, lineHeight: 1.7 }}>
                                            {room.state.duplicateBlocked.message || 'Bu hesap şu anda başka bir cihazda aktif. Aynı anda birden fazla oturum açılamaz.'}
                                        </p>
                                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
                                            Lütfen diğer oturumu kapatın veya farklı bir hesapla giriş yapın.
                                        </p>

                                        {/* Countdown chip */}
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '6px 16px', borderRadius: 20, marginBottom: 28,
                                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                                        }}>
                                            <span style={{ fontSize: 11, color: 'rgba(165,180,252,0.7)' }}>⏱</span>
                                            <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.6)', fontWeight: 500 }}>
                                                {room.state.duplicateBlocked.countdown} saniye içinde yönlendirileceksiniz
                                            </span>
                                        </div>
                                        <br />

                                        <button
                                            onClick={() => {
                                                const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                window.location.href = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                                            }}
                                            style={{
                                                padding: '13px 44px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                                                color: 'rgba(165,180,252,0.9)',
                                                fontWeight: 600, fontSize: 13, letterSpacing: '0.01em',
                                                boxShadow: '0 4px 16px rgba(99,102,241,0.12)',
                                                transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                                            }}
                                            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))'; (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'; (e.target as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                                        >
                                            ← Geri Dön
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
                                    borderBottom: 'none',
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
                                onOpenDM={(username, userId) => {
                                    room.actions.openDM(username, userId);
                                    addToast('info', 'Özel Mesaj', `${username} ile özel mesajlaşma başlatıldı.`);
                                }}
                            />

                            {/* Change Name Modal */}
                            <ChangeNameModal
                                isOpen={isChangeNameOpen}
                                currentName={room.state.currentUser?.username || ''}
                                onClose={() => setIsChangeNameOpen(false)}
                                onSubmit={(newName) => {
                                    try {
                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                            const raw = sessionStorage.getItem(key);
                                            if (raw) { const u = JSON.parse(raw); u.displayName = newName; u.username = newName; sessionStorage.setItem(key, JSON.stringify(u)); }
                                            const rawL = localStorage.getItem(key);
                                            if (rawL) { const u = JSON.parse(rawL); u.displayName = newName; u.username = newName; localStorage.setItem(key, JSON.stringify(u)); }
                                        }
                                        window.dispatchEvent(new Event('auth-change'));
                                    } catch {}
                                    if (room.state.currentUser?.userId) {
                                        room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { displayName: newName });
                                    }
                                    if (room.socket) { room.socket.emit('status:change-name', { newName }); }
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



                            {/* GodMaster Profile Modal */}
                            <GodMasterProfileModal
                                isOpen={isGodMasterProfileOpen}
                                onClose={() => setIsGodMasterProfileOpen(false)}
                                currentUser={room.state.currentUser}
                                onChangeName={(newName) => {
                                    try {
                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                            const raw = sessionStorage.getItem(key);
                                            if (raw) { const u = JSON.parse(raw); u.displayName = newName; u.username = newName; sessionStorage.setItem(key, JSON.stringify(u)); }
                                            const rawL = localStorage.getItem(key);
                                            if (rawL) { const u = JSON.parse(rawL); u.displayName = newName; u.username = newName; localStorage.setItem(key, JSON.stringify(u)); }
                                        }
                                        window.dispatchEvent(new Event('auth-change'));
                                    } catch {}
                                    if (room.state.currentUser?.userId) { room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { displayName: newName }); }
                                    if (room.socket) { room.socket.emit('status:change-name', { newName }); }
                                }}
                                onChangeAvatar={(avatarUrl) => {
                                    // GodMaster modal: sessionStorage + localStorage her ikisine de kaydet (flash bug önleme)
                                    try {
                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                            const raw = sessionStorage.getItem(key);
                                            if (raw) { const u = JSON.parse(raw); u.avatar = avatarUrl; sessionStorage.setItem(key, JSON.stringify(u)); }
                                            const rawL = localStorage.getItem(key);
                                            if (rawL) { const u = JSON.parse(rawL); u.avatar = avatarUrl; localStorage.setItem(key, JSON.stringify(u)); }
                                        }
                                        window.dispatchEvent(new Event('auth-change'));
                                    } catch {}
                                    // Anlık participant güncelle (oda listesinde hemen yansısın)
                                    if (room.state.currentUser?.userId) {
                                        room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { avatar: avatarUrl });
                                    }
                                    if (room.socket) {
                                        room.socket.emit('status:change-avatar', { avatar: avatarUrl });
                                    }
                                }}
                                onChangeNameColor={(color) => {
                                    try {
                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                            const raw = sessionStorage.getItem(key);
                                            if (raw) { const u = JSON.parse(raw); u.nameColor = color; sessionStorage.setItem(key, JSON.stringify(u)); }
                                            const rawL = localStorage.getItem(key);
                                            if (rawL) { const u = JSON.parse(rawL); u.nameColor = color; localStorage.setItem(key, JSON.stringify(u)); }
                                        }
                                        window.dispatchEvent(new Event('auth-change'));
                                    } catch {}
                                    if (room.socket) { room.socket.emit('status:change-name-color', { color }); }
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
                                onNavigateToRoom={(roomSlug) => { setActiveSlug(roomSlug); window.history.replaceState(null, '', roomUrl(roomSlug)); }}
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
                                                isProfileOpen={isProfileOpen}
                                                onCloseProfile={() => setIsProfileOpen(false)}
                                                onChangeName={(newName) => {
                                                    if (room.socket) {
                                                        room.socket.emit('status:change-name', { newName });
                                                        // ★ localStorage senkronizasyonu
                                                        try {
                                                            for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                                const raw = localStorage.getItem(key);
                                                                if (raw) {
                                                                    const user = JSON.parse(raw);
                                                                    user.displayName = newName;
                                                                    user.username = newName;
                                                                    localStorage.setItem(key, JSON.stringify(user));
                                                                }
                                                            }
                                                            window.dispatchEvent(new Event('auth-change'));
                                                        } catch {}
                                                        addToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${newName}`);
                                                    }
                                                }}
                                                onChangeAvatar={(avatarUrl) => {
                                                    // sessionStorage + localStorage her ikisine de kaydet (flash bug önleme)
                                                    try {
                                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                            const raw = sessionStorage.getItem(key);
                                                            if (raw) { const u = JSON.parse(raw); u.avatar = avatarUrl; sessionStorage.setItem(key, JSON.stringify(u)); }
                                                            const rawL = localStorage.getItem(key);
                                                            if (rawL) { const u = JSON.parse(rawL); u.avatar = avatarUrl; localStorage.setItem(key, JSON.stringify(u)); }
                                                        }
                                                        window.dispatchEvent(new Event('auth-change'));
                                                    } catch {}
                                                    // Anlık participant güncelle
                                                    if (room.state.currentUser?.userId) {
                                                        room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { avatar: avatarUrl });
                                                    }
                                                    if (room.socket) {
                                                        room.socket.emit('status:change-avatar', { avatar: avatarUrl });
                                                    }
                                                }}
                                                onChangeNameColor={(color) => {
                                                    if (room.socket) {
                                                        room.socket.emit('status:change-name-color', { color });
                                                        // ★ localStorage senkronizasyonu
                                                        try {
                                                            for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                                const raw = localStorage.getItem(key);
                                                                if (raw) {
                                                                    const user = JSON.parse(raw);
                                                                    user.nameColor = color;
                                                                    localStorage.setItem(key, JSON.stringify(user));
                                                                }
                                                            }
                                                            window.dispatchEvent(new Event('auth-change'));
                                                        } catch {}
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
                                        </div>
                                    </div>
                                )
                            }

                            {/* ═══ HOMEPAGE-STYLE FRAME + TOP BAR ═══ */}
                            <div className={roomAnimsPlayed ? 'room-anims-done' : ''} style={{
                                width: '100%',
                                maxWidth: 1200,
                                margin: '0 auto',
                                alignSelf: 'flex-start',
                                backgroundColor: '#7a7e9e',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                borderLeft: '10px solid rgba(255,255,255,0.85)',
                                borderRight: '10px solid rgba(255,255,255,0.85)',
                                borderBottom: '10px solid rgba(255,255,255,0.85)',
                                boxShadow: '0 -8px 30px 4px rgba(0,0,0,0.22), 0 4px 20px 2px rgba(0,0,0,0.13), 0 12px 10px -4px rgba(0,0,0,0.08)',
                                overflow: 'hidden',
                                height: 'calc(100vh - 4px)',
                                paddingBottom: 16,
                                animation: roomAnimsPlayed ? 'none' : 'roomEntranceZoom 0.9s cubic-bezier(0.16, 1, 1, 1) both',
                            }}>
                                {/* ─── HOMEPAGE-EXACT PREMIUM HEADER CSS ─── */}
                                <style>{`
                                    @import url('https://fonts.cdnfonts.com/css/cooper-black');
                                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto:wght@400;700;900&family=Outfit:wght@400;700;900&family=Poppins:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Playfair+Display:wght@400;700;900&family=Bebas+Neue&family=Oswald:wght@400;700&family=Righteous&family=Permanent+Marker&family=Pacifico&family=Aref+Ruqaa:wght@400;700&display=swap');
                                    body {
                                        background: #c4c9ee !important;
                                        background-attachment: fixed !important;
                                    }

                                    body > main, .room-container {
                                        padding-top: 0 !important;
                                        align-items: flex-start !important;
                                    }
                                    /* === ROOM DRAWER ANIMATION === */
                                    .room-drawer-details summary::-webkit-details-marker,
                                    .room-drawer-details summary::marker { display: none; content: ''; }
                                    .room-drawer-details summary:hover { background: rgba(255,255,255,0.05); }
                                    .room-drawer-details[open] .room-drawer-chevron {
                                        transform: rotate(180deg);
                                    }
                                    .room-drawer-chevron {
                                        transition: transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
                                    }
                                    @keyframes roomDrawerSlideItem {
                                        0% { opacity: 0; transform: translateY(-10px); }
                                        100% { opacity: 1; transform: translateY(0); }
                                    }
                                    /* === TABLO LAMBALARI — tüm sütunlara (sopranonoro referansı) === */
                                    .room-container .sidebar-left,
                                    .room-container .right-live-panel,
                                    .room-container .sidebar-right,
                                    .room-container .live-panel {
                                        position: relative !important;
                                        overflow: visible !important;
                                    }
                                    .room-container .sidebar-left::before {
                                        content: '';
                                        position: absolute;
                                        top: -53px;
                                        left: 50%;
                                        transform: translateX(-50%);
                                        width: 300px;
                                        height: 52px;
                                        z-index: 60;
                                        pointer-events: none;
                                        background-image: url("data:image/svg+xml,%3Csvg width='300' height='52' viewBox='0 0 300 52' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='bm' x1='0' y1='30' x2='0' y2='44' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%234a4a4a'/%3E%3Cstop offset='25%25' stop-color='%232a2a2a'/%3E%3Cstop offset='50%25' stop-color='%231a1a1a'/%3E%3Cstop offset='75%25' stop-color='%232a2a2a'/%3E%3Cstop offset='100%25' stop-color='%233a3a3a'/%3E%3C/linearGradient%3E%3ClinearGradient id='mp' x1='150' y1='0' x2='150' y2='14' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%23555'/%3E%3Cstop offset='50%25' stop-color='%232a2a2a'/%3E%3Cstop offset='100%25' stop-color='%231a1a1a'/%3E%3C/linearGradient%3E%3ClinearGradient id='am' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23555'/%3E%3Cstop offset='50%25' stop-color='%23333'/%3E%3Cstop offset='100%25' stop-color='%232a2a2a'/%3E%3C/linearGradient%3E%3ClinearGradient id='ls' x1='150' y1='44' x2='150' y2='52' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%23ffd080' stop-opacity='0.6'/%3E%3Cstop offset='100%25' stop-color='%23ffc864' stop-opacity='0'/%3E%3C/linearGradient%3E%3ClinearGradient id='ld' x1='50' y1='43' x2='250' y2='43' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%23ffcc66' stop-opacity='0'/%3E%3Cstop offset='15%25' stop-color='%23ffe0a0' stop-opacity='0.9'/%3E%3Cstop offset='50%25' stop-color='%23fff0cc' stop-opacity='1'/%3E%3Cstop offset='85%25' stop-color='%23ffe0a0' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%23ffcc66' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M58 44 L35 52 L265 52 L242 44 Z' fill='url(%23ls)' opacity='0.5'/%3E%3Crect x='135' y='0' width='30' height='10' rx='2' fill='url(%23mp)' stroke='rgba(255,255,255,0.08)' stroke-width='0.5'/%3E%3Crect x='138' y='1' width='24' height='1.5' rx='0.75' fill='white' fill-opacity='0.1'/%3E%3Cline x1='142' y1='10' x2='115' y2='30' stroke='url(%23am)' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='142.5' y1='10.5' x2='115.8' y2='30' stroke='rgba(255,255,255,0.1)' stroke-width='0.5'/%3E%3Cline x1='158' y1='10' x2='185' y2='30' stroke='url(%23am)' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='157.5' y1='10.5' x2='184.2' y2='30' stroke='rgba(255,255,255,0.1)' stroke-width='0.5'/%3E%3Crect x='48' y='30' width='204' height='14' rx='7' fill='url(%23bm)' stroke='rgba(0,0,0,0.4)' stroke-width='0.8'/%3E%3Crect x='58' y='32' width='184' height='2' rx='1' fill='white' fill-opacity='0.12'/%3E%3Crect x='58' y='42' width='184' height='1' rx='0.5' fill='white' fill-opacity='0.04'/%3E%3Crect x='55' y='43.5' width='190' height='1.5' rx='0.75' fill='url(%23ld)'/%3E%3Ccircle cx='115' cy='34' r='2.5' fill='%23333' stroke='%23555' stroke-width='0.5'/%3E%3Ccircle cx='115' cy='34' r='1' fill='%23555'/%3E%3Ccircle cx='185' cy='34' r='2.5' fill='%23333' stroke='%23555' stroke-width='0.5'/%3E%3Ccircle cx='185' cy='34' r='1' fill='%23555'/%3E%3C/svg%3E");
                                        background-size: contain;
                                        background-repeat: no-repeat;
                                        background-position: center;
                                        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
                                        animation: lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.9s both;
                                    }
                                    /* Warm glow beneath each lamp — sopranonoro exact */
                                    .room-container .sidebar-left::after {
                                        content: '';
                                        position: absolute;
                                        top: -16px;
                                        left: 50%;
                                        transform: translateX(-50%);
                                        width: 280px;
                                        height: 110px;
                                        background: radial-gradient(ellipse at top center, rgba(255,210,120,0.32) 0%, rgba(255,180,80,0.14) 40%, transparent 70%);
                                        pointer-events: none;
                                        border-radius: 0 0 50% 50%;
                                        filter: blur(8px);
                                        opacity: 0;
                                        animation: glowLightUp 1.5s ease-out 2s forwards;
                                    }
                                    @keyframes lampSlideDown {
                                        0% { opacity: 0; transform: translateX(-50%) translateY(-100%); }
                                        40% { opacity: 1; }
                                        100% { opacity: 1; transform: translateX(-50%) translateY(0); }
                                    }
                                    @keyframes glowLightUp {
                                        0% { opacity: 0; }
                                        100% { opacity: 1; }
                                    }
                                    /* Animasyonlar bir kez oynadıktan sonra devre dışı */
                                    .room-anims-done .sidebar-left::before,
                                    .room-anims-done .right-live-panel::before,
                                    .room-anims-done .sidebar-right::before {
                                        animation: none !important;
                                        opacity: 1 !important;
                                        transform: translateX(-50%) translateY(0) !important;
                                    }
                                    .room-anims-done .sidebar-left::after {
                                        animation: none !important;
                                        opacity: 1 !important;
                                    }
                                    .room-anims-done .meeting-room-panel::before {
                                        animation: none !important;
                                        opacity: 1 !important;
                                        transform: translateX(-50%) translateY(0) !important;
                                    }
                                    /* === RAPTİYE (pushpins) — orta sütun chat kartı === */
                                    .room-container main.flex-1 > .chat-area {
                                        position: relative !important;
                                        overflow: visible !important;
                                    }
                                    /* 3 raptiye — sol, orta, sağ */
                                    .room-raptiye-left,
                                    .room-raptiye-center,
                                    .room-raptiye-right {
                                        position: absolute;
                                        top: -10px;
                                        z-index: 60;
                                        pointer-events: none;
                                        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
                                        width: 20px;
                                        height: 24px;
                                    }
                                    .room-raptiye-left { left: 30px; }
                                    .room-raptiye-center { left: 50%; transform: translateX(-50%); }
                                    .room-raptiye-right { right: 30px; }
                                    .room-premium-header {
                                        position: relative;
                                        width: 99%;
                                        margin: 0 auto;
                                        height: 78px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: space-between;
                                        padding: 0 20px;
                                        background: linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%);
                                        border-radius: 0 0 28px 28px;
                                        border: 1px solid rgba(0,0,0,0.5);
                                        border-top: 1px solid rgba(120,130,150,0.6);
                                        box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.05);
                                        animation: roomHeaderSlide 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                                        z-index: 50;
                                        overflow: hidden;
                                        flex-shrink: 0;
                                    }
                                    .room-premium-header::after {
                                        content: '';
                                        position: absolute;
                                        top: 0; left: 10%; right: 10%; height: 35%;
                                        background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, transparent 100%);
                                        border-radius: 0 0 50% 50%;
                                        pointer-events: none;
                                    }
                                    .room-header-logo {
                                        display: flex; flex-direction: column; align-items: flex-start;
                                        gap: 2px; flex-shrink: 0; min-width: 180px;
                                    }
                                    .room-header-nav {
                                        flex-wrap: nowrap !important;
                                    }
                                    .room-header-nav::-webkit-scrollbar {
                                        height: 3px;
                                    }
                                    .room-header-nav::-webkit-scrollbar-track {
                                        background: transparent;
                                    }
                                    .room-header-nav::-webkit-scrollbar-thumb {
                                        background: rgba(255,255,255,0.12);
                                        border-radius: 4px;
                                    }
                                    .room-header-nav::-webkit-scrollbar-thumb:hover {
                                        background: rgba(255,255,255,0.25);
                                    }
                                    @keyframes roomHeaderSlide {
                                        0% { transform: translateY(-100%); opacity: 0; }
                                        100% { transform: translateY(0); opacity: 1; }
                                    }
                                    @keyframes roomLogoReveal {
                                        0% { opacity: 0; filter: brightness(0.5); transform: translateX(-12px); }
                                        60% { opacity: 1; filter: brightness(1.8); }
                                        100% { opacity: 1; filter: brightness(1); transform: translateX(0); }
                                    }
                                    @keyframes roomLogoGlow {
                                        0%, 100% { filter: drop-shadow(0 0 2px rgba(120,200,200,0)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                                        50% { filter: drop-shadow(0 0 8px rgba(120,200,200,0.3)) drop-shadow(0 0 20px rgba(120,200,200,0.1)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                                    }
                                    .room-header-logo h1 {
                                        margin: 0; font-size: 44px; line-height: 1; letter-spacing: -1px;
                                        animation: roomLogoReveal 0.8s ease-out forwards; animation-delay: 0.2s; opacity: 0;
                                    }
                                    .room-retro-logo-text {
                                        font-family: 'Cooper Black', 'Arial Rounded MT Bold', serif;
                                        font-weight: 900;
                                        letter-spacing: 0.5px;
                                        transform: scaleY(1.05);
                                        display: inline-flex;
                                        gap: 0px;
                                        position: relative;
                                    }
                                    .room-retro-logo-soprano {
                                        background: linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%);
                                        -webkit-background-clip: text;
                                        -webkit-text-fill-color: transparent;
                                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(0,0,0,0.4));
                                    }
                                    .room-retro-logo-chat {
                                        background: linear-gradient(180deg, #b8f0f0 0%, #5ec8c8 30%, #3a9e9e 65%, #4db0a8 100%);
                                        -webkit-background-clip: text;
                                        -webkit-text-fill-color: transparent;
                                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(20,80,70,0.5));
                                        animation: roomLogoGlow 3s ease-in-out infinite;
                                    }
                                    .room-header-nav {
                                        display: flex; align-items: center; gap: 6px; padding-left: 60px;
                                    }
                                    .room-nav-dot {
                                        width: 3px; height: 3px; border-radius: 50%;
                                        background: rgba(200,170,110,0.2); flex-shrink: 0;
                                    }
                                    @keyframes roomContentFadeIn {
                                        0% { transform: translateY(-30px); opacity: 0; }
                                        100% { transform: translateY(0); opacity: 1; }
                                    }

                                    /* ═══ 4-PANEL LAYOUT — each column as separate rounded panel ═══ */
                                    .room-container.glass-panel {
                                        background: transparent !important;
                                        backdrop-filter: none !important;
                                        -webkit-backdrop-filter: none !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        border-radius: 0 !important;
                                        gap: 16px !important;
                                        padding: 48px 32px 32px !important;
                                        align-items: stretch !important;
                                        flex-wrap: nowrap !important;
                                    }
                                    /* SOL PANEL — sopranonoro: 240×780px */
                                    .room-container .sidebar-left {
                                        width: 260px !important;
                                        min-width: 240px !important;
                                        max-width: 280px !important;
                                        flex: 0 0 260px !important;
                                        min-height: 780px !important;
                                        align-self: flex-start !important;
                                        margin-top: -15px !important;
                                    }
                                    /* Sopranonoro ANA İÇERİK (SOL ALAN) — esnek */
                                    .room-container main.flex-1 {
                                        flex: 1 1 70% !important;
                                        min-width: 320px !important;
                                        min-height: 720px !important;
                                        max-height: 720px !important;
                                        margin-top: -20px !important;
                                        gap: 16px !important;
                                    }
                                    .room-container main.flex-1 > .chat-area {
                                        gap: 16px !important;
                                    }
                                    /* SAĞ PANEL — sol sütun ile eşit genişlik: 260px */
                                    .room-container .right-live-panel,
                                    .room-container .sidebar-right,
                                    .room-container .live-panel {
                                        width: 260px !important;
                                        min-width: 240px !important;
                                        max-width: 280px !important;
                                        flex: 0 0 260px !important;
                                        min-height: 780px !important;
                                        align-self: flex-start !important;
                                        margin-right: -8px !important;
                                        margin-top: -15px !important;
                                        padding-top: 0 !important;
                                    }
                                    /* Sağ panel iç elemanları yukarı kaydır */
                                    .room-container .sidebar-right > div:first-child,
                                    .room-container .right-live-panel > div:first-child {
                                        margin-top: -4px !important;
                                        margin-bottom: 0 !important;
                                    }
                                    .room-container .sidebar-right .tv-wrapper,
                                    .room-container .right-live-panel .tv-wrapper {
                                        margin-top: 25px !important;
                                        max-width: 280px !important;
                                        overflow: visible !important;
                                    }
                                    /* Idle rotation — sola sağa yavaş sallanma */
                                    @keyframes monitorIdleRotate {
                                        0%, 100% { transform: rotateY(-15deg) rotateX(2deg); }
                                        50% { transform: rotateY(15deg) rotateX(2deg); }
                                    }
                                    .room-container .sidebar-right .tv-monitor,
                                    .room-container .right-live-panel .tv-monitor {
                                        animation: monitorSettle 1.8s cubic-bezier(0.34,1.56,0.64,1) 1s backwards,
                                                   monitorIdleRotate 8s ease-in-out 3s infinite !important;
                                    }
                                    .room-container .sidebar-right .tv-monitor.tv-broadcasting,
                                    .room-container .right-live-panel .tv-monitor.tv-broadcasting {
                                        animation: none !important;
                                        transform: rotateY(0deg) rotateX(0deg) !important;
                                    }
                                    /* KÜRSÜ tabela — ince metal vintage tabela */
                                    .room-container .right-live-panel::before,
                                    .room-container .sidebar-right::before {
                                        content: '';
                                        position: absolute;
                                        top: -36px;
                                        left: 50%;
                                        transform: translateX(-50%);
                                        width: 180px;
                                        height: 36px;
                                        z-index: 5;
                                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='36' viewBox='0 0 180 36'%3E%3Cdefs%3E%3ClinearGradient id='metal' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%234a4a4a'/%3E%3Cstop offset='25%25' stop-color='%232a2a2a'/%3E%3Cstop offset='50%25' stop-color='%231a1a1a'/%3E%3Cstop offset='75%25' stop-color='%232a2a2a'/%3E%3Cstop offset='100%25' stop-color='%233a3a3a'/%3E%3C/linearGradient%3E%3ClinearGradient id='chain' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23555'/%3E%3Cstop offset='50%25' stop-color='%23333'/%3E%3Cstop offset='100%25' stop-color='%23555'/%3E%3C/linearGradient%3E%3ClinearGradient id='glow' x1='30' y1='30' x2='150' y2='30' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%23ffcc66' stop-opacity='0'/%3E%3Cstop offset='30%25' stop-color='%23ffe0a0' stop-opacity='0.7'/%3E%3Cstop offset='50%25' stop-color='%23fff0cc' stop-opacity='1'/%3E%3Cstop offset='70%25' stop-color='%23ffe0a0' stop-opacity='0.7'/%3E%3Cstop offset='100%25' stop-color='%23ffcc66' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3C!-- Chains --%3E%3Crect x='38' y='0' width='3' height='4' rx='1' fill='url(%23chain)'/%3E%3Crect x='38' y='5' width='3' height='4' rx='1' fill='url(%23chain)'/%3E%3Crect x='139' y='0' width='3' height='4' rx='1' fill='url(%23chain)'/%3E%3Crect x='139' y='5' width='3' height='4' rx='1' fill='url(%23chain)'/%3E%3C!-- Metal plate --%3E%3Crect x='4' y='10' width='172' height='22' rx='7' fill='url(%23metal)' stroke='rgba(0,0,0,0.4)' stroke-width='0.8'/%3E%3C!-- Top highlight --%3E%3Crect x='14' y='12' width='152' height='1.5' rx='0.75' fill='white' fill-opacity='0.12'/%3E%3C!-- Bottom warm light strip --%3E%3Crect x='20' y='30' width='140' height='1.5' rx='0.75' fill='url(%23glow)'/%3E%3C!-- Rivets --%3E%3Ccircle cx='14' cy='21' r='2' fill='%23333' stroke='%23555' stroke-width='0.5'/%3E%3Ccircle cx='14' cy='21' r='0.8' fill='%23555'/%3E%3Ccircle cx='166' cy='21' r='2' fill='%23333' stroke='%23555' stroke-width='0.5'/%3E%3Ccircle cx='166' cy='21' r='0.8' fill='%23555'/%3E%3C!-- Text --%3E%3Ctext x='90' y='26' text-anchor='middle' font-family='Georgia,serif' font-size='11' font-weight='bold' letter-spacing='5' fill='%23d8c890'%3EK%C3%9CRS%C3%9C%3C/text%3E%3Ctext x='90' y='25' text-anchor='middle' font-family='Georgia,serif' font-size='11' font-weight='bold' letter-spacing='5' fill='%23111' opacity='0.3'%3EK%C3%9CRS%C3%9C%3C/text%3E%3C/svg%3E");
                                        background-size: contain;
                                        background-repeat: no-repeat;
                                        background-position: center;
                                        pointer-events: none;
                                        filter: drop-shadow(0 3px 8px rgba(0,0,0,0.5));
                                        animation: lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.9s both;
                                    }

                                    /* TOPLANTI ODASI — chat kartına yapışık şerit etiket */
                                    .room-container .meeting-room-panel::before {
                                        content: '🔒  TOPLANTI ODASI';
                                        position: absolute;
                                        top: 12px;
                                        left: 120px;
                                        z-index: 50;
                                        padding: 8px 20px 8px 14px;
                                        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
                                        font-size: 11px;
                                        font-weight: 800;
                                        letter-spacing: 3px;
                                        text-transform: uppercase;
                                        color: #fff;
                                        background: linear-gradient(135deg, #b71c1c 0%, #c62828 50%, #d32f2f 100%);
                                        border-radius: 4px;
                                        box-shadow: 0 2px 8px rgba(183,28,28,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
                                        pointer-events: none;
                                        transform: rotate(-2deg);
                                        animation: meetingSignBlurIn 0.6s ease-out 0.4s both;
                                    }
                                    .room-container .meeting-room-panel::after {
                                        content: '';
                                        position: absolute;
                                        top: 10px;
                                        left: 118px;
                                        width: 6px;
                                        height: 6px;
                                        background: radial-gradient(circle, #555 30%, #333 70%);
                                        border-radius: 50%;
                                        border: 1px solid rgba(255,255,255,0.1);
                                        z-index: 51;
                                        pointer-events: none;
                                        transform: rotate(-2deg);
                                        animation: meetingSignBlurIn 0.6s ease-out 0.5s both;
                                    }
                                    @keyframes meetingSignBlurIn {
                                        0% { opacity: 0; filter: blur(8px); }
                                        100% { opacity: 1; filter: blur(0px); }
                                    }

                                    .room-container .sidebar-left .chat-logo-area {
                                        display: none !important;
                                    }
                                    /* Sidebar yukarı çekildi, lambayı eski konumuna sabitle */
                                    .room-container .sidebar-left::before {
                                        top: -48px !important;
                                    }

                                    .room-container .sidebar-left::after {
                                        top: -30px !important;
                                        height: 130px !important;
                                    }
                                    .room-container .sidebar-left {
                                        margin-left: -8px !important;
                                        background:
                                            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                                            linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                                            linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%) !important;
                                        backdrop-filter: blur(24px) !important;
                                        -webkit-backdrop-filter: blur(24px) !important;
                                        border: 1px solid rgba(255,255,255,0.15) !important;
                                        border-top: 1px solid rgba(255,255,255,0.35) !important;
                                        border-left: 1px solid rgba(255,255,255,0.2) !important;
                                        box-shadow:
                                            0 8px 32px rgba(0,0,0,0.4),
                                            0 2px 8px rgba(0,0,0,0.3),
                                            inset 0 1px 0 rgba(255,255,255,0.06) !important;
                                        border-radius: 22px !important;
                                        overflow: hidden;
                                    }
                                    .room-container main.flex-1 {
                                        background: transparent !important;
                                        border-radius: 0 !important;
                                        overflow: visible;
                                        gap: 8px;
                                    }
                                    .room-container main.flex-1 > .chat-area,
                                    .room-container main.flex-1 .chat-area {
                                        background:
                                            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                                            linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                                            linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);
                                        backdrop-filter: blur(24px);
                                        -webkit-backdrop-filter: blur(24px);
                                        border: 1px solid rgba(255,255,255,0.15);
                                        border-top: 1px solid rgba(255,255,255,0.35);
                                        border-left: 1px solid rgba(255,255,255,0.2);
                                        box-shadow:
                                            0 8px 32px rgba(0,0,0,0.4),
                                            0 2px 8px rgba(0,0,0,0.3),
                                            inset 0 1px 0 rgba(255,255,255,0.06);
                                        border-radius: 22px;
                                        overflow: hidden;
                                        flex: 1;
                                        min-height: 0;
                                    }
                                    .room-container .chat-messages-container.chat-area {
                                        background: transparent !important;
                                        backdrop-filter: none !important;
                                        -webkit-backdrop-filter: none !important;
                                        border: none !important;
                                        box-shadow: none !important;
                                        border-radius: 0 !important;
                                    }
                                    .room-container .bottom-toolbar {
                                        background: transparent !important;
                                        border: none !important;
                                    }
                                    .room-container main.flex-1 > div:last-child {
                                        background:
                                            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                                            linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                                            linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);
                                        backdrop-filter: blur(24px);
                                        -webkit-backdrop-filter: blur(24px);
                                        border: 1px solid rgba(255,255,255,0.15);
                                        border-top: 1px solid rgba(255,255,255,0.35);
                                        border-left: 1px solid rgba(255,255,255,0.2);
                                        box-shadow:
                                            0 8px 32px rgba(0,0,0,0.4),
                                            0 2px 8px rgba(0,0,0,0.3),
                                            inset 0 1px 0 rgba(255,255,255,0.06);
                                        border-radius: 22px;
                                        overflow: hidden;
                                        flex-shrink: 0;
                                    }
                                    .room-container .right-live-panel,
                                    .room-container .sidebar-right,
                                    .room-container .live-panel {
                                        background:
                                            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                                            linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                                            linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%) !important;
                                        backdrop-filter: blur(24px) !important;
                                        -webkit-backdrop-filter: blur(24px) !important;
                                        border: 1px solid rgba(255,255,255,0.15) !important;
                                        border-top: 1px solid rgba(255,255,255,0.35) !important;
                                        border-left: 1px solid rgba(255,255,255,0.2) !important;
                                        box-shadow:
                                            0 8px 32px rgba(0,0,0,0.4),
                                            0 2px 8px rgba(0,0,0,0.3),
                                            inset 0 1px 0 rgba(255,255,255,0.06) !important;
                                        border-radius: 22px !important;
                                        overflow: hidden;
                                    }
                                    /* Sol sütun — iç elemanların arka planlarını şeffaf yap (profil modu HARİÇ) */
                                    .room-container .sidebar-left:not(.profile-mode) *:not(svg):not(img):not(canvas):not(video) {
                                        background: transparent !important;
                                        background-color: transparent !important;
                                        background-image: none !important;
                                        backdrop-filter: none !important;
                                        -webkit-backdrop-filter: none !important;
                                    }
                                    /* ★ neon-avatar arka planını koru */
                                    .room-container .sidebar-left:not(.profile-mode) .neon-avatar {
                                        background: linear-gradient(135deg, #1e293b, #0f172a) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor {
                                        height: 64px !important;
                                        padding: 0 16px !important;
                                        border-radius: 14px !important;
                                        background: linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%) !important;
                                        border: none !important;
                                        border-top: 1px solid rgba(120,130,150,0.35) !important;
                                        border-bottom: 1px solid rgba(0,0,0,0.3) !important;
                                        box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03) !important;
                                        display: flex !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                        gap: 10px !important;
                                        cursor: pointer !important;
                                        transition: all 0.3s ease !important;
                                        backdrop-filter: none !important;
                                        -webkit-backdrop-filter: none !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor.speaking {
                                        background: linear-gradient(180deg, rgba(90,50,50,0.9) 0%, rgba(60,30,35,0.85) 15%, rgba(35,18,22,0.9) 50%, rgba(45,22,28,0.9) 75%, rgba(60,35,40,0.85) 100%) !important;
                                        border-top: 1px solid rgba(239,68,68,0.35) !important;
                                        border-bottom: 1px solid rgba(100,20,20,0.4) !important;
                                        border-left: none !important;
                                        border-right: none !important;
                                        box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 15px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,120,120,0.12), inset 0 -1px 0 rgba(255,255,255,0.03) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor.speaking span {
                                        color: #fff !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor.speaking svg {
                                        color: #fff !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor.queueing {
                                        background: linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 50%, rgba(251,191,36,0.06) 100%) !important;
                                        border: 1px solid rgba(251,191,36,0.30) !important;
                                        box-shadow: 0 2px 12px rgba(251,191,36,0.12), 0 0 20px rgba(251,191,36,0.05), inset 0 1px 0 rgba(255,255,255,0.06) !important;
                                    }
                                    @keyframes neonPulseRed {
                                        0%, 100% {
                                            box-shadow: 0 0 8px rgba(239,68,68,0.25), 0 0 20px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.08);
                                        }
                                        50% {
                                            box-shadow: 0 0 12px rgba(239,68,68,0.35), 0 0 30px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
                                        }
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor span {
                                        font-size: 11px !important;
                                        font-weight: 800 !important;
                                        letter-spacing: 1.5px !important;
                                        text-transform: uppercase !important;
                                        color: #cbd5e1 !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .mic-reactor svg {
                                        width: 15px !important;
                                        height: 15px !important;
                                        color: #94a3b8 !important;
                                    }
                                    /* === SLIM PREMIUM OVERRIDE — glossy-panel BRIGHT === */
                                    .room-container .sidebar-left:not(.profile-mode) .slim-controls {
                                        background:
                                            radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.14) 0%, transparent 60%),
                                            linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 25%, transparent 55%),
                                            linear-gradient(180deg, rgba(40,50,70,0.88) 0%, rgba(20,28,50,0.65) 100%) !important;
                                        border: 1px solid rgba(255,255,255,0.2) !important;
                                        border-top: 1px solid rgba(255,255,255,0.4) !important;
                                        border-bottom: 1px solid rgba(255,255,255,0.28) !important;
                                        border-left: 1px solid rgba(255,255,255,0.25) !important;
                                        box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.06), 0 -4px 16px rgba(255,255,255,0.03) !important;
                                        backdrop-filter: blur(24px) !important;
                                        -webkit-backdrop-filter: blur(24px) !important;
                                        overflow: visible !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-status-pill {
                                        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%) !important;
                                        border-color: rgba(255,255,255,0.08) !important;
                                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-status-pill:hover {
                                        background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%) !important;
                                        border-color: rgba(255,255,255,0.15) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-announce-row {
                                        background: transparent !important;
                                        border-color: transparent !important;
                                        box-shadow: none !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-announce-row.has-new {
                                        background: rgba(251,191,36,0.06) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-radio-card {
                                        background:
                                            radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.07) 0%, transparent 65%),
                                            rgba(0,0,0,0.2) !important;
                                        border: 1px solid rgba(255,255,255,0.1) !important;
                                        border-top: 1px solid rgba(255,255,255,0.12) !important;
                                        box-shadow: inset 0 3px 6px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.04) !important;
                                        overflow: visible !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-radio-display {
                                        background:
                                            radial-gradient(ellipse at 50% -10%, rgba(79,177,179,0.08) 0%, transparent 70%),
                                            rgba(0,0,0,0.3) !important;
                                        border-color: rgba(255,255,255,0.04) !important;
                                        border-top: 1px solid rgba(79,177,179,0.08) !important;
                                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-btn-skip {
                                        background: rgba(255,255,255,0.04) !important;
                                        border-color: rgba(255,255,255,0.1) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-btn-play {
                                        background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%) !important;
                                        border: none !important;
                                        box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-btn-play.active {
                                        background: linear-gradient(180deg, rgba(52,211,153,0.3) 0%, rgba(5,150,105,0.4) 100%) !important;
                                        box-shadow: 0 4px 16px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.15) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-volume-track {
                                        background: rgba(0,0,0,0.2) !important;
                                        border: 1px solid rgba(255,255,255,0.04) !important;
                                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-volume-fill {
                                        background: linear-gradient(90deg, rgba(56,189,248,0.6), rgba(56,189,248,0.8)) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-volume-knob {
                                        background: linear-gradient(180deg, #fff 0%, #94a3b8 100%) !important;
                                        border-color: rgba(15,23,42,0.6) !important;
                                        box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-channels-btn {
                                        background: transparent !important;
                                        border-color: transparent !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-dropdown {
                                        background: #ffffff !important;
                                        border: 1px solid #e2e8f0 !important;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06) !important;
                                        backdrop-filter: none !important;
                                        -webkit-backdrop-filter: none !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-dropdown * {
                                        background: transparent !important;
                                        border-color: transparent !important;
                                        box-shadow: none !important;
                                    }
                                    .room-container .sidebar-left:not(.profile-mode) .slim-dropdown button:hover {
                                        background: #f1f5f9 !important;
                                    }
                                `}</style>




                                {/* ─── PREMIUM HEADER BAR (exact homepage copy) ─── */}
                                <header className="room-premium-header">
                                    <div className="room-header-logo" style={{ flexShrink: 0, zIndex: 10, display: 'flex', alignItems: 'center' }}>
                                        {(() => {
                                            if (!tenantMatch) {
                                                // Default SopranoChat logo
                                                return (
                                                    <h1 className="room-retro-logo-text"><span className="room-retro-logo-soprano">Soprano</span><span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}><span className="room-retro-logo-chat">Chat</span><span style={{ fontSize: 11, fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', sans-serif", fontStyle: 'normal', letterSpacing: '1.5px', lineHeight: 1, marginTop: -2, background: 'linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>Senin Sesin</span></span></h1>
                                                );
                                            }
                                            if (!room.state.systemSettings) return null;

                                            const ss = room.state.systemSettings;
                                            const bp = brandingPreview;
                                            const logoName = (bp ? bp.logoName : ss.logoName) || 'SopranoChat';
                                            const logoTextColor = (bp ? bp.logoTextColor : ss.logoTextColor) || '';
                                            const logoTextColor2 = (bp ? bp.logoTextColor2 : ss.logoTextColor2) || '';
                                            const logoTextFont = (bp ? bp.logoTextFont : ss.logoTextFont) || '';
                                            const logoTextSize = (bp ? bp.logoTextSize : ss.logoTextSize) || '';
                                            const color1 = logoTextColor || '#38d9d9';
                                            const color2 = logoTextColor2;
                                            const hasCustomBranding = (ss.logoName && ss.logoName !== 'SopranoChat') || logoTextColor || logoTextFont || bp;

                                            // Özel branding yoksa varsayılan SopranoChat logosunu göster
                                            if (!hasCustomBranding && logoName === 'SopranoChat') {
                                                return (
                                                    <h1 className="room-retro-logo-text"><span className="room-retro-logo-soprano">Soprano</span><span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}><span className="room-retro-logo-chat">Chat</span><span style={{ fontSize: 11, fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', sans-serif", fontStyle: 'normal', letterSpacing: '1.5px', lineHeight: 1, marginTop: -2, background: 'linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>Senin Sesin</span></span></h1>
                                                );
                                            }

                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {(bp?.logoUrl || ss.tenantLogoUrl || ss.logoUrl) && (() => {
                                                        const imgSize = bp?.logoImageSize || ss.logoImageSize || 40;
                                                        const imgOffX = bp?.logoOffsetX || ss.logoOffsetX || 0;
                                                        const imgOffY = bp?.logoOffsetY || ss.logoOffsetY || 0;
                                                        return (
                                                            <img src={bp?.logoUrl || ss.tenantLogoUrl || ss.logoUrl} alt={logoName} style={{
                                                                height: imgSize, width: 'auto', maxWidth: imgSize * 3,
                                                                objectFit: 'contain',
                                                                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
                                                                transform: `translate(${imgOffX}px, ${imgOffY}px)`,
                                                                transition: 'all 0.2s ease',
                                                            }} />
                                                        );
                                                    })()}
                                                    {(() => {
                                                        const txtOX = bp?.textOffsetX || ss.textOffsetX || 0;
                                                        const txtOY = bp?.textOffsetY || ss.textOffsetY || 0;
                                                        return (
                                                    <span style={{
                                                        fontSize: logoTextSize || 18,
                                                        fontWeight: 900,
                                                        fontFamily: logoTextFont || "'Cooper Black', 'Arial Rounded MT Bold', serif",
                                                        letterSpacing: '0.5px',
                                                        transform: `scaleY(1.05) translate(${txtOX}px, ${txtOY}px)`,
                                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(0,0,0,0.4))',
                                                        transition: 'all 0.3s ease',
                                                        ...(color2 ? {
                                                            backgroundImage: `linear-gradient(135deg, ${color1}, ${color2})`,
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                            backgroundClip: 'text',
                                                        } as React.CSSProperties : hasCustomBranding ? {
                                                            background: `linear-gradient(180deg, ${color1} 0%, ${color1}dd 35%, ${color1}99 70%, ${color1}cc 100%)`,
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                        } as React.CSSProperties : {
                                                            background: 'linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)',
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                        } as React.CSSProperties),
                                                    }}>
                                                        {logoName}
                                                    </span>
                                                    ); })()}
                                                    {bp && (
                                                        <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', color: '#818cf8', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, padding: '1px 5px', animation: 'pulse 2s ease-in-out infinite' }}>ÖNİZLEME</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* ═══ ROOM NAV WITH SCROLL ARROWS ═══ */}
                                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 5, display: 'flex', justifyContent: 'center', width: 'max-content' }}>
                                        <RoomNavScroller
                                            rooms={(room.state.rooms || []).filter((r: any) => !r.name.toLowerCase().includes('toplantı') && !r.name.toLowerCase().includes('toplanti'))}
                                            activeSlug={activeSlug}
                                            onSelect={(slug: string) => {
                                                // ★ Client-side VIP ön kontrolü — backend round-trip beklenmeden anında overlay
                                                const targetRoom = (room.state.rooms || []).find((r: any) => r.slug === slug);
                                                if (targetRoom?.isVipRoom) {
                                                    // Rol kaynakları: 1) currentUser (backend), 2) sessionStorage (fallback)
                                                    const currentUserRole = room.state.currentUser?.role;
                                                    let userRole = (currentUserRole || 'guest').toLowerCase();
                                                    if (!currentUserRole) {
                                                        try {
                                                            const authUser = JSON.parse(sessionStorage.getItem('soprano_tenant_user') || sessionStorage.getItem('soprano_auth_user') || 'null');
                                                            userRole = (authUser?.role || 'guest').toLowerCase();
                                                        } catch { /* ignore */ }
                                                    }
                                                    const roleLevels: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, superadmin: 6, super_admin: 6, owner: 7, godmaster: 8 };
                                                    if ((roleLevels[userRole] ?? 0) < 2) {
                                                        const fallbackRoom = (room.state.rooms || []).find((r: any) => r.slug !== slug && !r.isVipRoom);
                                                        setClientRoomError({
                                                            message: 'Bu oda sadece VIP üyelere açıktır.',
                                                            code: 'VIP_ONLY',
                                                            fallbackSlug: fallbackRoom?.slug || undefined,
                                                        });
                                                        return; // Oda geçişini ENGELLE
                                                    }
                                                }
                                                setClientRoomError(null);
                                                setActiveSlug(slug); window.history.replaceState(null, '', roomUrl(slug));
                                            }}
                                        />
                                    </div>



                                    {/* HOME — sağ panel genişliğinde wrapper, nav sağ sınırı burası */}
                                    <div style={{ paddingRight: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 10 }}>
                                        <a
                                            href={tenantMatch ? `/t/${tenantMatch[1]}` : '/'}
                                            style={{
                                                color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5,
                                                animation: 'roomContentFadeIn 0.4s ease 0.1s both',
                                                fontWeight: 700, letterSpacing: '0.08em',
                                                textTransform: 'uppercase' as const, fontSize: 10,
                                                textDecoration: 'none', padding: '5px 10px',
                                                background: 'rgba(56,189,248,0.08)',
                                                border: '1px solid rgba(56,189,248,0.15)',
                                                borderRadius: 20, cursor: 'pointer',
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                transition: 'all 0.3s ease',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                            HOME
                                        </a>
                                    </div>
                                </header>

                                {/* ─── CHATROOM CONTAINER ─── */}
                            <div className={`glass-panel room-container room-main-scroll w-full flex-1 flex relative`}
                                style={{
                                    minHeight: 580,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    ...(isMeetingRoom ? {
                                        background: 'linear-gradient(135deg, rgba(8, 12, 21, 0.95) 0%, rgba(12, 18, 32, 0.92) 50%, rgba(8, 12, 21, 0.95) 100%)',
                                        border: 'none',
                                        boxShadow: 'none',
                                    } : {
                                        background: 'transparent',
                                        backdropFilter: 'none',
                                        WebkitBackdropFilter: 'none',
                                        borderLeft: '14px solid rgba(255,255,255,0.85)',
                                        borderRight: '14px solid rgba(255,255,255,0.85)',
                                        borderBottom: '14px solid rgba(255,255,255,0.85)',
                                        boxShadow: '0 0 30px rgba(0,0,0,0.25), 0 0 60px rgba(0,0,0,0.12), -4px 0 15px rgba(0,0,0,0.18), 4px 0 15px rgba(0,0,0,0.18)',
                                        borderRadius: 0,
                                        gap: '8px',
                                        padding: '8px',
                                        ...(activeDesign?.colors ? {
                                            '--room-sidebar-bg': activeDesign.colors.sidebarLeft || '',
                                            '--room-header-bg': activeDesign.colors.header || '',
                                            '--room-chat-bg': activeDesign.colors.chatArea || '',
                                            '--room-toolbar-bg': activeDesign.colors.toolbar || '',
                                            '--room-right-bg': activeDesign.colors.rightPanel || '',
                                        } as React.CSSProperties : {})
                                    })
                                }}
                            >
                                {/* ═══ UNIFIED TOP BAR OVERLAY — KALDIRILDI ═══ */}

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
                                    isProfileOpen={isProfileOpen}
                                    onCloseProfile={() => setIsProfileOpen(false)}
                                    onChangeName={(newName) => {
                                        try {
                                            for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                const raw = sessionStorage.getItem(key);
                                                if (raw) { const u = JSON.parse(raw); u.displayName = newName; u.username = newName; sessionStorage.setItem(key, JSON.stringify(u)); }
                                                const rawL = localStorage.getItem(key);
                                                if (rawL) { const u = JSON.parse(rawL); u.displayName = newName; u.username = newName; localStorage.setItem(key, JSON.stringify(u)); }
                                            }
                                            window.dispatchEvent(new Event('auth-change'));
                                        } catch {}
                                        if (room.state.currentUser?.userId) { room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { displayName: newName }); }
                                        if (room.socket) { room.socket.emit('status:change-name', { newName }); }
                                    }}
                                    onChangeAvatar={(avatarUrl) => {
                                                    // sessionStorage + localStorage her ikisine de kaydet (flash bug önleme)
                                                    try {
                                                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                            const raw = sessionStorage.getItem(key);
                                                            if (raw) { const u = JSON.parse(raw); u.avatar = avatarUrl; sessionStorage.setItem(key, JSON.stringify(u)); }
                                                            const rawL = localStorage.getItem(key);
                                                            if (rawL) { const u = JSON.parse(rawL); u.avatar = avatarUrl; localStorage.setItem(key, JSON.stringify(u)); }
                                                        }
                                                        window.dispatchEvent(new Event('auth-change'));
                                                    } catch {}
                                                    // Anlık participant güncelle
                                                    if (room.state.currentUser?.userId) {
                                                        room.actions.updateParticipantLocally?.(room.state.currentUser.userId, { avatar: avatarUrl });
                                                    }
                                                    if (room.socket) {
                                                        room.socket.emit('status:change-avatar', { avatar: avatarUrl });
                                                    }
                                                }}
                                    onChangeNameColor={(color) => {
                                        try {
                                            for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                                                const raw = sessionStorage.getItem(key);
                                                if (raw) { const u = JSON.parse(raw); u.nameColor = color; sessionStorage.setItem(key, JSON.stringify(u)); }
                                                const rawL = localStorage.getItem(key);
                                                if (rawL) { const u = JSON.parse(rawL); u.nameColor = color; localStorage.setItem(key, JSON.stringify(u)); }
                                            }
                                            window.dispatchEvent(new Event('auth-change'));
                                        } catch {}
                                        if (room.socket) { room.socket.emit('status:change-name-color', { color }); }
                                    }}
                                    onChangePassword={(oldPass, newPass) => {
                                        if (room.socket) {
                                            room.socket.emit('status:change-password', { oldPassword: oldPass, newPassword: newPass });
                                            addToast('success', 'Şifre Değiştirildi', 'Şifreniz güncellendi.');
                                        }
                                    }}
                                />

                                {/* 2. CENTER PANEL (Header, Chat, Toolbar) */}
                                <main className={`flex-1 flex flex-col min-w-0 relative z-10${isMeetingRoom ? ' meeting-room-panel' : ''}`} onContextMenu={handleChatContextMenu} style={{ background: 'linear-gradient(180deg, rgba(7, 11, 20, 0.6) 0%, rgba(10, 15, 28, 0.4) 50%, transparent 100%)' }}>
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
                                    {/* Chat content — or access error if required */}
                                    {room.passwordRequired ? (
                                        // ── Şifreli Oda ──
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
                                    ) : room.state.roomError ? (
                                        // ── Oda Erişim Hatası (VIP, Dolu, Nick vb.) ──
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32 }}>
                                            <div style={{
                                                width: 64, height: 64, marginBottom: 8,
                                                background: room.state.roomError.code === 'VIP_ONLY' ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.10)',
                                                border: room.state.roomError.code === 'VIP_ONLY' ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(239,68,68,0.2)',
                                                borderRadius: 16,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                                            }}>
                                                {room.state.roomError.code === 'VIP_ONLY' ? '⭐'
                                                    : room.state.roomError.code === 'ROOM_LIMIT_REACHED' ? '🚷'
                                                    : (room.state.roomError.code === 'NICK_TAKEN' || room.state.roomError.code === 'NICK_RESERVED') ? '👤'
                                                    : '⚠️'}
                                            </div>
                                            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
                                                {room.state.roomError.code === 'VIP_ONLY' ? 'VIP Odası'
                                                    : room.state.roomError.code === 'ROOM_LIMIT_REACHED' ? 'Oda Dolu'
                                                    : (room.state.roomError.code === 'NICK_TAKEN' || room.state.roomError.code === 'NICK_RESERVED') ? 'İsim Kullanımda'
                                                    : 'Odaya Girilemiyor'}
                                            </h2>
                                            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                                                {(() => {
                                                    const msg = room.state.roomError.message || '';
                                                    const tr: Record<string, string> = {
                                                        'Authentication required': 'Bu odaya erişmek için giriş yapmanız gerekiyor.',
                                                        'VIP only': 'Bu oda sadece VIP üyelere açıktır.',
                                                        'Room is full': 'Oda kapasitesi doldu. Lütfen başka bir odayı deneyin.',
                                                        'Nick already taken': 'Bu kullanıcı adı başka biri tarafından kullanılıyor.',
                                                        'Nick is reserved': 'Bu kullanıcı adı kullanılamaz.',
                                                        'Duplicate connection blocked': 'Aynı hesapla başka bir bağlantı var.',
                                                    };
                                                    return tr[msg] || msg || 'Bu odaya giriş yapılamıyor.';
                                                })()}

                                            </p>
                                            <button
                                                onClick={() => {
                                                    const errorCode = room.state.roomError?.code;
                                                    if (errorCode === 'VIP_ONLY' || errorCode === 'ROOM_LIMIT_REACHED') {
                                                        const fallback = room.state.roomError?.fallbackSlug;
                                                        if (fallback) {
                                                            setActiveSlug(fallback);
                                                            window.history.replaceState(null, '', roomUrl(fallback));
                                                        } else {
                                                            const other = room.state.rooms?.find((r: any) => r.slug !== activeSlug && !r.isVipRoom);
                                                            if (other) {
                                                                setActiveSlug(other.slug);
                                                                window.history.replaceState(null, '', roomUrl(other.slug));
                                                            } else {
                                                                const tenantMatch2 = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                                window.location.href = tenantMatch2 ? `/t/${tenantMatch2[1]}` : '/';
                                                            }
                                                        }
                                                    } else {
                                                        const tenantMatch2 = window.location.pathname.match(/^\/t\/([^/]+)/);
                                                        window.location.href = tenantMatch2 ? `/t/${tenantMatch2[1]}` : '/';
                                                    }
                                                }}
                                                style={{
                                                    padding: '10px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                    background: room.state.roomError.code === 'VIP_ONLY' ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.08))' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
                                                    border: room.state.roomError.code === 'VIP_ONLY' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(239,68,68,0.25)',
                                                    color: room.state.roomError.code === 'VIP_ONLY' ? 'rgba(253,230,138,0.9)' : 'rgba(252,165,165,0.9)',
                                                }}
                                            >
                                                {(room.state.roomError.code === 'VIP_ONLY' || room.state.roomError.code === 'ROOM_LIMIT_REACHED') ? '← Diğer Odalara Git' : '← Giriş Sayfasına Dön'}
                                            </button>
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
                                            <div className="chat-area" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: 'none' }}>
                                                {/* ── Raptiyeler (pushpins) ── */}
                                                <div className="room-raptiye-left">
                                                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftL)" strokeWidth="1.8" strokeLinecap="round" />
                                                        <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadL)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                        <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                        <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                        <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                        <defs>
                                                            <radialGradient id="pinHeadL" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#d45b5b" /><stop offset="50%" stopColor="#bf3a3a" /><stop offset="100%" stopColor="#9a2a2a" /></radialGradient>
                                                            <linearGradient id="pinShaftL" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#b0b8c0" /><stop offset="50%" stopColor="#8a9298" /><stop offset="100%" stopColor="#606870" /></linearGradient>
                                                        </defs>
                                                    </svg>
                                                </div>
                                                <div className="room-raptiye-center">
                                                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftC)" strokeWidth="1.8" strokeLinecap="round" />
                                                        <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadC)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                        <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                        <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                        <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                        <defs>
                                                            <radialGradient id="pinHeadC" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#d45b5b" /><stop offset="50%" stopColor="#bf3a3a" /><stop offset="100%" stopColor="#9a2a2a" /></radialGradient>
                                                            <linearGradient id="pinShaftC" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#b0b8c0" /><stop offset="50%" stopColor="#8a9298" /><stop offset="100%" stopColor="#606870" /></linearGradient>
                                                        </defs>
                                                    </svg>
                                                </div>
                                                <div className="room-raptiye-right">
                                                    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftR)" strokeWidth="1.8" strokeLinecap="round" />
                                                        <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadR)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                        <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                        <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                        <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                        <defs>
                                                            <radialGradient id="pinHeadR" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#d45b5b" /><stop offset="50%" stopColor="#bf3a3a" /><stop offset="100%" stopColor="#9a2a2a" /></radialGradient>
                                                            <linearGradient id="pinShaftR" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#b0b8c0" /><stop offset="50%" stopColor="#8a9298" /><stop offset="100%" stopColor="#606870" /></linearGradient>
                                                        </defs>
                                                    </svg>
                                                </div>
                                                {/* ★ SOCKET BAĞLANTI YÜKLENİYOR OVERLAY — currentUser gelene kadar */}
                                                {showConnectingLoader && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0,
                                                        background: 'transparent',
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        zIndex: 40,
                                                    }}>
                                                        {/* Premium Ring Spinner */}
                                                        <div style={{
                                                            width: 36, height: 36,
                                                            borderRadius: '50%',
                                                            border: '2.5px solid rgba(100,116,139,0.15)',
                                                            borderTopColor: 'rgba(56,189,248,0.8)',
                                                            animation: 'spinLoader 0.8s linear infinite',
                                                            boxShadow: '0 0 12px rgba(56,189,248,0.15)',
                                                        }} />
                                                        <p style={{
                                                            marginTop: 10, fontSize: 11, fontWeight: 600,
                                                            color: 'rgba(148,163,184,0.7)',
                                                            letterSpacing: '0.08em',
                                                        }}>
                                                            Bağlanıyor...
                                                        </p>
                                                        <style>{`
                                                            @keyframes spinLoader {
                                                                from { transform: rotate(0deg); }
                                                                to { transform: rotate(360deg); }
                                                            }
                                                        `}</style>
                                                    </div>
                                                )}
                                                <ChatMessages
                                                    room={room}
                                                    messages={room.state.messages}
                                                    currentUser={room.state.currentUser}
                                                    onContextMenu={handleChatContextMenu}
                                                    roomName={room.state.rooms?.find((r: any) => r.slug === activeSlug)?.name}
                                                />
                                                {/* Toast — mesaj kartının hemen altında */}
                                                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 100, pointerEvents: 'none' }}>
                                                    <ToastContainer toasts={toasts} removeToast={removeToast} />
                                                </div>
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
                                                    onToggleProfile={() => setIsProfileOpen(prev => !prev)}
                                                    onTogglePremiumProfile={() => window.dispatchEvent(new CustomEvent('openPremiumProfile'))}
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
                                        tvBroadcastLevel={tvBroadcastLevel}
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
                                            nudgeActive={dmNudgeTargets.has(dmUser)}
                                            onNudge={() => sendDmNudge(dmUser)}
                                            nudgeCooldown={dmNudgeCooldowns[dmUser] || 0}
                                            nudgeDisabled={dmNudgeDisabled.has(dmUser)}
                                            onNudgeToggle={() => {
                                                setDmNudgeDisabled(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(dmUser)) next.delete(dmUser);
                                                    else next.add(dmUser);
                                                    return next;
                                                });
                                            }}
                                        />
                                    );
                                })}

                                {/* Theme Switcher moved to BottomToolbar */}
                            </div>
                            </div> {/* end of HOMEPAGE-STYLE FRAME wrapper */}

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
