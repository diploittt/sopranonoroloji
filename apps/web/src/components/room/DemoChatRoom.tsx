"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { getAuthUser, setAuthUser } from '@/lib/auth';
import { ChatMessages } from '@/components/roomUI/ChatMessages';
import { SettingsModal } from '@/components/roomUI/SettingsModal';
import { DMWindow } from '@/components/roomUI/DMWindow';
import { GiftPanel } from '@/components/roomUI/GiftPanel';
import { TokenShop } from '@/components/roomUI/TokenShop';
import { GiftAnimation } from '@/components/roomUI/GiftAnimation';
import DuelArena from '@/components/roomUI/DuelArena';
import ContextMenu from '@/components/room/ContextMenu';
import { ConfirmModal } from '@/components/room/ConfirmModal';
import { ChangeNameModal } from '@/components/room/ChangeNameModal';
import { ProfileModal } from '@/components/room/ProfileModal';
import { GodMasterProfileModal } from '@/components/room/GodMasterProfileModal';
import AllUsersModal from '@/components/room/AllUsersModal';
import { UserInfoModal } from '@/components/room/UserInfoModal';
import { UserHistoryModal } from '@/components/room/UserHistoryModal';
import { RoomMonitorModal } from '@/components/room/RoomMonitorModal';
import { ROLE_HIERARCHY, ALL_PERMISSIONS, getMenuForUser, getRoleLevel, RoomMenuItem } from '@/common/roomPermissions';
import { ToastContainer as RoomToastContainer, useToast } from '@/components/ui/Toast';
import { useAdminPanelStore } from '@/stores/useAdminPanelStore';
import { AdminPanelWindow } from '@/components/admin/AdminPanelWindow';
import {
    MicOff, Mic, Volume2, UserMinus, UserX, MessageSquare, User, Ban, CameraOff, Camera,
    Monitor, Settings, ShieldOff, Trash2, Handshake, Users, Gift, Sword, Vibrate,
    EyeOff, Eye, Info, History, AudioLines, Edit3, Home, Copy, CheckSquare, ClipboardPaste,
    Pause, FileText, UserPlus, Heart
} from 'lucide-react';
import { FriendsPanel } from './FriendsPanel';

type DemoContextMenuItem = RoomMenuItem;

/** Lucide icon helper — 16px boyutunda, menü için optimize */
const I = (Icon: any, color?: string) => <Icon size={16} style={color ? { color } : undefined} />;

// ─── DEMO MENU ITEMS ─────────────────────────────────────────────────
export const DEMO_EMPTY_AREA_ITEMS: DemoContextMenuItem[] = [
    { id: 'change-name', label: 'İsim Değiştir', icon: I(Edit3), action: 'openChangeNameModal', description: 'Kullanıcı adını değiştir' },
    { id: 'admin-panel', label: 'Admin Paneli', icon: I(Settings), action: 'openAdminPanel', description: 'Admin paneline git' },
    { id: 'meeting-room', label: 'Toplantı Odası', icon: I(Home), action: 'createMeetingRoom', description: 'Özel toplantı odası oluştur' },
    { id: 'clear-chat', label: 'Yazıları Sil', icon: I(Trash2, '#dc2626'), action: 'clearChatRealtime', description: 'Chat ekranını temizle (herkes için)', confirm: true, confirmMessage: 'Tüm chat geçmişi silinecek. Emin misiniz?', danger: true },
    { id: 'check-history', label: 'Geçmişi Kontrol Et', icon: I(History), action: 'openHistoryModal', description: 'Chat ve oda geçmişini görüntüle' },
    { id: 'users', label: 'Kullanıcılar', icon: I(Users), action: 'openUsersModal', description: 'Tüm odalardaki kullanıcıları göster' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: I(Monitor), action: 'openRoomMonitor', description: 'Tüm odaları izle ve yönet' },
    { id: 'mic-free', label: 'Mikrofonu Serbest Bırak', icon: I(Mic), action: 'freeMicrophone', description: 'Mikrofonu serbest bırak' },
    { id: 'mic-take', label: 'Mikrofonu Al', icon: I(Mic, '#2563eb'), action: 'takeMicrophone', description: 'Mikrofonu al' },
    { id: 'talk-test', label: 'Mikrofon Testi', icon: I(AudioLines), action: 'testUserAudio', description: 'Mikrofonun çalışıp çalışmadığını test et' },
    { id: 'my-profile', label: 'Profilim', icon: I(User), action: 'openMyProfile', description: 'Kendi profilim' },
    { id: 'friends-panel', label: 'Arkadaşlar', icon: I(Heart, '#ec4899'), action: 'openFriendsPanel', description: 'Arkadaş listesi ve mesajlaşma' },
];

export function getDemoUserMenuItems(targetUser?: any): DemoContextMenuItem[] {
    const isMuted = targetUser?.isMuted;
    const isGagged = targetUser?.isGagged;
    const isBanned = targetUser?.isBanned;
    const isCamBlocked = targetUser?.isCamBlocked;
    return [
        /* ── Quick Actions (grid'de gösterilir) ── */
        isMuted
            ? { id: 'unmute', label: 'Sesi Aç', icon: I(Volume2, '#22c55e'), action: 'unmuteUser', category: 'mod', quickAction: true, hoverColor: '#f87171' }
            : { id: 'mute', label: 'Sustur', icon: I(MicOff, '#ef4444'), action: 'muteUser', category: 'mod', quickAction: true, hoverColor: '#f87171' },
        { id: 'kick', label: 'At', icon: I(UserMinus, '#fb923c'), action: 'kickUser', confirm: true, confirmMessage: 'Kullanıcı odadan atılacak. Emin misiniz?', category: 'mod', quickAction: true, hoverColor: '#fb923c', danger: true },
        { id: 'private-chat', label: 'Mesaj', icon: I(MessageSquare, '#3b82f6'), action: 'openPrivateChat', category: 'social', quickAction: true, hoverColor: '#60a5fa' },
        { id: 'user-info-quick', label: 'Profil', icon: I(User, '#6366f1'), action: 'openUserInfo', category: 'info', quickAction: true, hoverColor: '#818cf8' },
        { id: 'add-friend-quick', label: 'Arkadaş Ekle', icon: I(Heart, '#ec4899'), action: 'sendFriendRequest', category: 'social', quickAction: true, hoverColor: '#f472b6' },

        /* ── Yönetim (mod) ── */
        { id: 'hard-kick', label: 'Zorla At', icon: I(UserX, '#dc2626'), action: 'hardKickUser', confirm: true, confirmMessage: 'Kullanıcı zorla atılacak. Emin misiniz?', category: 'mod', danger: true },
        isGagged
            ? { id: 'ungag', label: 'Yazı Yasağını Kaldır', icon: I(MessageSquare, '#22c55e'), action: 'ungagUser', category: 'mod' }
            : { id: 'gag', label: 'Yazı Yasağı', icon: I(MessageSquare, '#ef4444'), action: 'gagUser', category: 'mod' },
        ...(isBanned
            ? [{ id: 'unban', label: 'Yasağı Kaldır', icon: I(Ban, '#22c55e'), action: 'unbanUser', confirm: true, confirmMessage: 'Yasak kaldırılacak. Emin misiniz?', category: 'mod' as const }]
            : [
                { id: 'ban-1day', label: '1 Gün Yasakla', icon: I(Ban, '#dc2626'), action: 'banUser', duration: '1d' as any, confirm: true, confirmMessage: '1 gün yasaklanacak. Emin misiniz?', category: 'mod' as const, danger: true },
                {
                    id: 'ban-more', label: 'Daha Fazla Yasakla', icon: I(Ban, '#991b1b'), type: 'submenu' as const, category: 'mod' as const,
                    submenu: [
                        { id: 'ban-1week', label: '1 Hafta', duration: '1w' as any, action: 'banUser', confirm: true, confirmMessage: '1 hafta yasaklanacak.', danger: true },
                        { id: 'ban-1month', label: '1 Ay', duration: '1m' as any, action: 'banUser', confirm: true, confirmMessage: '1 ay yasaklanacak.', danger: true },
                        { id: 'ban-permanent', label: 'Kalıcı', duration: 'permanent' as any, action: 'banUser', confirm: true, confirmMessage: 'Kalıcı yasaklanacak!', danger: true },
                    ]
                }
            ]
        ),
        isCamBlocked
            ? { id: 'cam-unblock', label: 'Kamera İznini Aç', icon: I(Camera, '#22c55e'), action: 'unblockCamera', category: 'mod' }
            : { id: 'cam-block', label: 'Kamera Engelle', icon: I(CameraOff, '#ef4444'), action: 'blockCamera', category: 'mod' },
        { id: 'exit-browser', label: 'Tarayıcıyı Kapat', icon: I(Monitor, '#dc2626'), action: 'exitBrowser', confirm: true, confirmMessage: 'Kullanıcının tarayıcısı kapatılacak. Emin misiniz?', category: 'mod', danger: true },
        { id: 'admin-panel', label: 'Yönetim Paneli', icon: I(Settings), action: 'openAdminPanel', category: 'mod' },
        { id: 'revoke-role', label: 'Yetkiyi Geri Al', icon: I(ShieldOff, '#dc2626'), action: 'revokeRole', confirm: true, confirmMessage: 'Kullanıcının yetkisi geri alınacak. Emin misiniz?', category: 'mod', danger: true },
        { id: 'clear-text', label: 'Mesajları Sil', icon: I(Trash2, '#dc2626'), action: 'deleteUserMessages', confirm: true, confirmMessage: 'Kullanıcının tüm mesajları silinecek. Emin misiniz?', category: 'mod', danger: true },
        { id: 'free-mic', label: 'Mikrofonu Serbest Bırak', icon: I(Mic), action: 'freeMicrophone', category: 'mod' },
        { id: 'take-mic', label: 'Mikrofonu Al', icon: I(Mic, '#2563eb'), action: 'takeMicrophone', category: 'mod' },
        { id: 'move-to-meeting', label: 'Toplantıya Çek', icon: I(Home), action: 'moveToMeeting', category: 'mod' },
        { id: 'user-list', label: 'Kullanıcı Listesi', icon: I(Users), action: 'openUserList', category: 'mod' },

        /* ── Etkileşim (social) ── */
        { id: 'send-gift', label: 'Hediye Gönder', icon: I(Gift, '#ec4899'), action: 'sendGift', category: 'social' },
        { id: 'duel', label: 'Düello Et', icon: I(Sword, '#f59e0b'), action: 'challengeDuel', category: 'social' },
        { id: 'nudge', label: 'Titret', icon: I(Vibrate), action: 'nudgeUser', category: 'social' },
        { id: 'invite-one2one', label: 'Bire Bir Davet', icon: I(UserPlus), action: 'inviteOneToOne', category: 'social' },
        { id: 'ignore', label: 'Yoksay', icon: I(EyeOff), action: 'ignoreUser', category: 'social' },
        { id: 'unignore', label: 'Yoksayı Kaldır', icon: I(Eye), action: 'unignoreUser', category: 'social' },
        { id: 'add-friend', label: 'Arkadaş Ekle', icon: I(Heart, '#ec4899'), action: 'sendFriendRequest', category: 'social' },

        /* ── Bilgi (info) ── */
        { id: 'user-info', label: 'Kullanıcı Bilgisi', icon: I(Info), action: 'openUserInfo', category: 'info' },
        { id: 'log-history', label: 'Geçmiş', icon: I(History), action: 'openUserLogs', category: 'info' },
        { id: 'talk-test', label: 'Ses Testi', icon: I(AudioLines), action: 'testUserAudio', category: 'info' },
        { id: 'my-profile', label: 'Profil Ayarları', icon: I(Settings), action: 'openMyProfile', category: 'info' },
        { id: 'friends-panel', label: 'Arkadaşlar', icon: I(Heart, '#ec4899'), action: 'openFriendsPanel', category: 'info' },
        { id: 'change-name', label: 'İsim Değiştir', icon: I(Edit3), action: 'openChangeNameModal', category: 'info' },
    ];
}

export const DEMO_CHAT_AREA_ITEMS: DemoContextMenuItem[] = [
    { id: 'admin-panel', label: 'Admin Paneli', icon: I(Settings), action: 'openAdminPanel' },
    { id: 'copy', label: 'Kopyala', icon: I(Copy), action: 'copy' },
    { id: 'select-all', label: 'Tümünü Seç', icon: I(CheckSquare), action: 'selectAll' },
    { id: 'paste', label: 'Yapıştır', icon: I(ClipboardPaste), action: 'paste' },
    { id: 'stop-text', label: 'Yazıları Durdur', icon: I(Pause, '#f59e0b'), action: 'stopMessagesGlobal', scope: 'global', confirm: true, confirmMessage: 'Tüm yazılar durdurulacak. Emin misiniz?' },
    { id: 'stop-text-local', label: 'Yazıları Durdur (Yerel)', icon: I(Pause), action: 'stopMessagesLocal', scope: 'local' },
    { id: 'clear-text-global', label: 'Yazıları Temizle', icon: I(Trash2, '#dc2626'), action: 'clearMessagesGlobal', scope: 'global', confirm: true, confirmMessage: 'Tüm yazılar temizlenecek. Emin misiniz?', danger: true },
    { id: 'clear-text-local', label: 'Yazıları Temizle (Yerel)', icon: I(Trash2), action: 'clearMessagesLocal', scope: 'local' },
    { id: 'my-profile', label: 'Profilim', icon: I(User), action: 'openMyProfile' },
    { id: 'users', label: 'Kullanıcılar', icon: I(Users), action: 'showAllUsers' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: I(Monitor), action: 'openRoomMonitor' },
];

// ─── DEMO CHAT ROOM — backend bağlantılı, tüm mekanikler entegre ───
export function DemoChatRoom({ slug, room: externalRoom, onRoomData }: { slug: string; room?: ReturnType<typeof useRoomRealtime>; onRoomData?: (data: { users: any[]; messages: any[]; currentSpeaker: any; actions: any; socket: any; state: any; demoAddToast: any; setIsSettingsOpen: any; setSettingsAnchor: any; handleUserContextMenu: any; handleEmptyAreaContextMenu: any; localStream: MediaStream | null; isCameraOn: boolean; openAudioTest: any }) => void }) {
    // Always call hook (React rules), but skip connection when externalRoom is provided
    const internalRoom = useRoomRealtime({ slug: externalRoom ? '__skip__' : slug });
    const room = externalRoom || internalRoom;
    const { toasts: demoToasts, addToast: demoAddToast, removeToast: demoRemoveToast } = useToast();

    // Expose room data to parent via callback
    useEffect(() => {
        onRoomData?.({
            users: room.state.users,
            messages: room.state.messages,
            currentSpeaker: room.state.currentSpeaker,
            actions: room.actions,
            socket: room.socket,
            state: room.state,
            demoAddToast,
            setIsSettingsOpen,
            setSettingsAnchor,
            handleUserContextMenu,
            handleEmptyAreaContextMenu,
            localStream: room.state.localStream,
            isCameraOn: room.state.isCameraOn,
            openAudioTest: () => { /* will be handled by parent */ },
        });
    }, [room.state.users, room.state.messages, room.state.currentSpeaker, room.state.isCameraOn, room.state.localStream, room.state.isMicOn, room.state.queue, room.state.micTimeLeft, room.state.isChatLocked, room.state.isCurrentUserMuted, room.state.isCurrentUserGagged]);

    // ─── Modal States ─────────────────────────────────────────────────
    const [isChangeNameOpen, setIsChangeNameOpen] = React.useState(false);
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [isGodMasterProfileOpen, setIsGodMasterProfileOpen] = React.useState(false);
    const [isAllUsersOpen, setIsAllUsersOpen] = React.useState(false);
    const [isRoomMonitorOpen, setIsRoomMonitorOpen] = React.useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [settingsAnchor, setSettingsAnchor] = React.useState<React.RefObject<HTMLElement | null>>({ current: null });
    const [userInfoTarget, setUserInfoTarget] = React.useState<any>(null);
    const [userHistoryTarget, setUserHistoryTarget] = React.useState<{ userId: string; displayName: string } | null>(null);
    const [ignoredUsers, setIgnoredUsers] = React.useState<Set<string>>(new Set());
    const [isFriendsPanelOpen, setIsFriendsPanelOpen] = React.useState(false);

    /** Tüm modalleri kapat — tek modal kuralı için */
    const closeAllModals = React.useCallback(() => {
        setIsChangeNameOpen(false);
        setIsProfileOpen(false);
        setIsGodMasterProfileOpen(false);
        setIsAllUsersOpen(false);
        setIsRoomMonitorOpen(false);
        setIsSettingsOpen(false);
        setUserInfoTarget(null);
        setUserHistoryTarget(null);
        setIsFriendsPanelOpen(false);
    }, []);

    // Gift system
    const [giftPanelOpen, setGiftPanelOpen] = useState(false);
    const [giftTargetUser, setGiftTargetUser] = useState<{ id: string; name: string } | null>(null);
    const [giftAnimation, setGiftAnimation] = useState<any>(null);
    const [tokenShopOpen, setTokenShopOpen] = useState(false);

    // Nudge
    const [nudgeTargetUsername, setNudgeTargetUsername] = useState<string | null>(null);
    const [nudgeCooldown, setNudgeCooldown] = useState(0);
    const [nudgeDisabledUsers, setNudgeDisabledUsers] = useState<Set<string>>(new Set());
    const nudgeCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // ★ Stale closure koruması — socket listener'larında güncel değerlere erişim
    const roomActionsRef = useRef(room.actions);
    const currentUserRef = useRef(room.state.currentUser);
    roomActionsRef.current = room.actions;
    currentUserRef.current = room.state.currentUser;

    // Nudge cooldown timer
    useEffect(() => {
        if (nudgeCooldown > 0) {
            nudgeCooldownRef.current = setInterval(() => {
                setNudgeCooldown(prev => {
                    if (prev <= 1) {
                        if (nudgeCooldownRef.current) clearInterval(nudgeCooldownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => { if (nudgeCooldownRef.current) clearInterval(nudgeCooldownRef.current); };
        }
    }, [nudgeCooldown > 0]);

    // ★ Ana Sayfa Profil → Oda Senkronizasyonu
    useEffect(() => {
        const onAuthChange = () => {
            if (room.socket) {
                const au = getAuthUser();
                if (au) {
                    room.socket.emit('user:profileUpdate', {
                        displayName: au.username,
                        avatar: au.avatar,
                        nameColor: (au as any).nameColor,
                    });
                }
            }
        };
        window.addEventListener('auth-change', onAuthChange);
        return () => window.removeEventListener('auth-change', onAuthChange);
    }, [room.socket]);

    // ─── Context Menu ─────────────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<{
        type: 'user' | 'empty' | 'chat';
        x: number; y: number;
        targetUser?: any;
    } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title?: string; message: string; variant?: string;
        onConfirm: () => void;
    }>({ isOpen: false, message: '', onConfirm: () => { } });
    const savedSelectionRef = useRef<string>('');

    const userLevel = ROLE_HIERARCHY[room.state.currentUser?.role || 'guest'] || 0;

    const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
<<<<<<< HEAD
        if (room.state.banInfo) { demoAddToast('error', '⛔ Yasaklı', 'Yasaklısınız — hiçbir işlem yapamazsınız.'); return; }
=======
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
        setContextMenu({ type: 'empty', x: e.clientX, y: e.clientY });
    };
    const handleUserContextMenu = (e: React.MouseEvent, user: any) => {
        e.preventDefault();
<<<<<<< HEAD
        if (room.state.banInfo) { demoAddToast('error', '⛔ Yasaklı', 'Yasaklısınız — hiçbir işlem yapamazsınız.'); return; }
=======
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
        setContextMenu({ type: 'user', x: e.clientX, y: e.clientY, targetUser: user });
    };
    const handleChatContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
<<<<<<< HEAD
        if (room.state.banInfo) { demoAddToast('error', '⛔ Yasaklı', 'Yasaklısınız — hiçbir işlem yapamazsınız.'); return; }
=======
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
        const sel = window.getSelection();
        savedSelectionRef.current = sel?.toString() || '';
        setContextMenu({ type: 'chat', x: e.clientX, y: e.clientY });
    };

    const getMenuItems = React.useCallback(() => {
        if (!contextMenu) return [];
        let items: DemoContextMenuItem[];
        if (contextMenu.type === 'empty') items = DEMO_EMPTY_AREA_ITEMS;
        else if (contextMenu.type === 'chat') items = DEMO_CHAT_AREA_ITEMS;
        else items = getDemoUserMenuItems(contextMenu.targetUser);

        // Filter by user level
        items = getMenuForUser(items, userLevel, contextMenu.type, getRoleLevel(contextMenu.targetUser?.role),
            contextMenu.type === 'user' && contextMenu.targetUser?.userId === room.state.currentUser?.userId);

        // Toggle ignore/unignore
        const targetId = contextMenu.targetUser?.userId || contextMenu.targetUser?.id;
        const isIgnored = targetId && ignoredUsers.has(targetId);
        items = items.filter(item => {
            if (isIgnored && item.id === 'ignore') return false;
            if (!isIgnored && item.id === 'unignore') return false;
            return true;
        });
        return items;
    }, [contextMenu, userLevel, room.state.currentUser, ignoredUsers]);

    // ─── Action handler ───────────────────────────────────────────────
    const handleMenuItemClick = React.useCallback((item: any) => {
        const targetId = contextMenu?.targetUser?.userId || contextMenu?.targetUser?.id;
        const targetName = contextMenu?.targetUser?.username || contextMenu?.targetUser?.displayName || 'Kullanıcı';
        const duration = item.duration;

        if (item.confirm && !item._confirmed) {
            setConfirmModal({
                isOpen: true, title: 'Onay', message: item.confirmMessage || 'Emin misiniz?',
                onConfirm: () => {
                    handleMenuItemClick({ ...item, _confirmed: true });
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                },
            });
            setContextMenu(null);
            return;
        }
        setContextMenu(null);

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
            case 'openAdminPanel': {
                const { openPanel: adminOpen } = useAdminPanelStore.getState();
                adminOpen();
                break;
            }
            case 'openUsersModal':
            case 'showAllUsers':
            case 'openUserList':
                if (isAllUsersOpen) break; // toggle
                closeAllModals();
                setIsAllUsersOpen(true);
                break;
            case 'openUserInfo':
                if (userInfoTarget) { setUserInfoTarget(null); break; } // toggle
                closeAllModals();
                setUserInfoTarget(contextMenu?.targetUser || { userId: targetId, displayName: targetName });
                break;
            case 'sendFriendRequest':
                if (targetId && room.socket) {
                    room.socket.emit('friend:request', { receiverId: targetId });
                    demoAddToast('info', 'Arkadaşlık İsteği', `${targetName} kullanıcısına arkadaşlık isteği gönderildi.`);
                }
                break;
            case 'openUserLogs':
                if (userHistoryTarget) { setUserHistoryTarget(null); break; } // toggle
                closeAllModals();
                setUserHistoryTarget({ userId: targetId || '', displayName: targetName });
                break;
            case 'clearChatRealtime':
            case 'clearMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'clear_chat_global' });
                demoAddToast('success', 'Yazılar Temizlendi', 'Tüm yazılar temizlendi.');
                break;
            case 'clearMessagesLocal':
                room.actions.clearLocalChat();
                demoAddToast('success', 'Yazılar Temizlendi', 'Yerel yazılar temizlendi.');
                break;
            case 'stopMessagesGlobal':
                room.socket?.emit('admin:userAction', { action: 'stop_messages_global' });
                demoAddToast('success', 'Yazılar Durduruldu', 'Tüm yazılar durduruldu.');
                break;
            case 'stopMessagesLocal':
                room.actions.toggleLocalChatStop();
                demoAddToast('info', 'Yazılar Durduruldu', 'Yerel yazılar durduruldu/açıldı.');
                break;
            case 'freeMicrophone':
            case 'freeMicForUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'release_mic', targetUserId: targetId });
                } else {
                    room.actions.releaseMic();
                }
                demoAddToast('success', 'Mikrofon Serbest', 'Mikrofon serbest bırakıldı.');
                break;
            case 'takeMicrophone':
            case 'takeMicFromUser':
                if (targetId) {
                    room.socket?.emit('admin:userAction', { action: 'take_mic', targetUserId: targetId });
                } else {
                    room.actions.forceTakeMic();
                }
                demoAddToast('success', 'Mikrofon Alındı', 'Mikrofon alındı.');
                break;
            case 'nudgeUser':
                if (nudgeCooldown > 0) { demoAddToast('info', 'Bekle', `${nudgeCooldown} saniye sonra tekrar titretebilirsiniz.`); break; }
                room.socket?.emit('admin:userAction', { action: 'nudge', targetUserId: targetId });
                // Gönderenin DM penceresinde hedefi aç ve titremeyi göster
                if (targetName) {
                    room.actions.openDM(targetName);
                    setNudgeTargetUsername(targetName);
                    setTimeout(() => setNudgeTargetUsername(null), 1500);
                }
                setNudgeCooldown(10);
                demoAddToast('info', 'Titretildi', `${targetName} titretildi.`);
                try { const a = new Audio('/sounds/msn-nudge.mp3'); a.volume = 0.5; a.play().catch(() => { }); } catch { }
                break;
            case 'challengeDuel':
                if (targetId) room.socket?.emit('duel:challenge', { targetUserId: targetId });
                break;
            case 'sendGift':
                if (targetId) { setGiftTargetUser({ id: targetId, name: targetName }); setGiftPanelOpen(true); }
                break;
            case 'openPrivateChat':
                if (targetName) room.actions.openDM(targetName);
                break;
            case 'ignoreUser':
                setIgnoredUsers(prev => new Set(prev).add(targetId || ''));
                demoAddToast('info', 'Yoksayıldı', `${targetName} yoksayıldı.`);
                break;
            case 'unignoreUser':
                setIgnoredUsers(prev => { const n = new Set(prev); n.delete(targetId || ''); return n; });
                demoAddToast('info', 'Yoksay Kaldırıldı', `${targetName} artık yoksayılmıyor.`);
                break;
            case 'openMyProfile': {
                const role = room.state.currentUser?.role || '';
                if (role.toLowerCase() === 'godmaster') {
                    if (isGodMasterProfileOpen) break; // toggle
                    closeAllModals();
                    setIsGodMasterProfileOpen(true);
                } else {
                    if (isProfileOpen) break; // toggle
                    closeAllModals();
                    setIsProfileOpen(true);
                }
                break;
            }
            case 'openFriendsPanel':
                closeAllModals();
                setIsFriendsPanelOpen(true);
                break;
            case 'openChangeNameModal':
            case 'changeName':
                if (isChangeNameOpen) break; // toggle
                closeAllModals();
                setIsChangeNameOpen(true);
                break;
            case 'openHistoryModal':
                if (userHistoryTarget) { setUserHistoryTarget(null); break; }
                closeAllModals();
                setUserHistoryTarget({ userId: '', displayName: 'Tüm Kullanıcılar' });
                break;
            case 'openRoomMonitor':
                if (isRoomMonitorOpen) break; // toggle
                closeAllModals();
                setIsRoomMonitorOpen(true);
                break;
            case 'createMeetingRoom':
                if (room.socket) {
                    room.socket.emit('room:create-meeting', {}, (res: any) => {
                        if (res?.success) demoAddToast('success', 'Toplantı Odası', 'Toplantı odası oluşturuldu.');
                        else demoAddToast('error', 'Hata', res?.message || 'Toplantı odası oluşturulamadı.');
                    });
                }
                break;
            case 'changeAvatar':
            case 'changePassword':
            case 'changeNameColor':
                if (isProfileOpen) break;
                closeAllModals();
                setIsProfileOpen(true);
                break;
            case 'testUserAudio':
                (window as any).__sopranoOpenAudioTest?.();
                break;
            case 'copy': {
                const txt = savedSelectionRef.current;
                if (txt) { navigator.clipboard.writeText(txt).then(() => demoAddToast('success', 'Kopyalandı', 'Metin kopyalandı.')).catch(() => demoAddToast('error', 'Hata', 'Kopyalama başarısız.')); }
                else demoAddToast('info', 'Seçim Yok', 'Kopyalanacak metin seçilmemiş.');
                break;
            }
            case 'selectAll': {
                const c = document.querySelector('[data-chat-messages]');
                if (c) { const r = document.createRange(); r.selectNodeContents(c); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); demoAddToast('info', 'Tümü Seçildi', 'Tüm mesajlar seçildi.'); }
                break;
            }
            case 'paste': {
                navigator.clipboard.readText().then((t) => {
                    if (t) {
                        const inp = document.querySelector('.message-input') as HTMLInputElement;
                        if (inp) {
                            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                            if (setter) { setter.call(inp, inp.value + t); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); }
                        }
                        demoAddToast('success', 'Yapıştırıldı', 'Metin yapıştırıldı.');
                    }
                }).catch(() => demoAddToast('error', 'İzin Gerekli', 'Pano erişimi reddedildi.'));
                break;
            }
        }
    }, [contextMenu, room.socket, room.actions, room.state.currentUser, demoAddToast]);

    // Socket event listeners
    useEffect(() => {
        if (!room.socket) return;
        const onGift = (data: any) => setGiftAnimation(data);
        const onNudge = (data: { from: string }) => {
            // Titreme kapatılmışsa yoksay
            if (nudgeDisabledUsers.has(data.from)) return;
            demoAddToast('info', '📳 Titretme', `${data.from} seni titretti!`);
            // DM penceresini aç ve titremeyi başlat
            room.actions.openDM(data.from);
            setNudgeTargetUsername(data.from);
            setTimeout(() => setNudgeTargetUsername(null), 1500);
            try { const a = new Audio('/sounds/msn-nudge.mp3'); a.volume = 0.7; a.play().catch(() => { }); } catch { }
        };
        // ★ Backend toast & error listener — backend aksiyonlarının sonuçlarını göster
        const onToast = (data: { type: string; title: string; message: string }) => {
            demoAddToast((data.type as any) || 'info', data.title, data.message);
        };
        const onError = (data: { message: string }) => {
            demoAddToast('error', 'Hata', data.message);
        };
        // ★ Room-wide action notifications — toast sadece actor ve target'a, kart overlay herkes için
        const onActionNotify = (data: { type: string; icon: string; message: string; action: string; actor: string; actorUserId: string; targetUserId: string }) => {
            const myUserId = currentUserRef.current?.userId;
            // ★ Kart overlay — herkes için profil kartında geçici gösterim
            const setIndicators = roomActionsRef.current?.setActionIndicators;
            if (data.targetUserId && setIndicators) {
                setIndicators((prev: Map<string, any>) => {
                    const next = new Map(prev);
                    next.set(data.targetUserId, {
                        icon: data.icon,
                        message: data.message,
                        type: data.type,
                        action: data.action,
                        actor: data.actor,
                        ts: Date.now(),
                    });
                    return next;
                });
                // 3.5s sonra otomatik temizle
                setTimeout(() => {
                    roomActionsRef.current?.setActionIndicators?.((prev: Map<string, any>) => {
                        const next = new Map(prev);
                        const entry = next.get(data.targetUserId);
                        if (entry && Date.now() - entry.ts >= 3400) next.delete(data.targetUserId);
                        return next;
                    });
                }, 3500);
            }
            // ★ Toast sadece eylemi yapan veya eyleme maruz kalan kullanıcıya gösterilir
            if (myUserId && (myUserId === data.actorUserId || myUserId === data.targetUserId)) {
                demoAddToast((data.type as any) || 'info', data.icon || '•', data.message);
            }
        };
        room.socket.on('gift:received', onGift);
        room.socket.on('room:nudge', onNudge);
        room.socket.on('room:toast', onToast);
        room.socket.on('room:error', onError);
        room.socket.on('room:action-notify', onActionNotify);
        return () => {
            room.socket?.off('gift:received', onGift);
            room.socket?.off('room:nudge', onNudge);
            room.socket?.off('room:toast', onToast);
            room.socket?.off('room:error', onError);
            room.socket?.off('room:action-notify', onActionNotify);
        };
    }, [room.socket]);

    // Sync ignoredUsers → hook
    useEffect(() => { room.actions.setDmIgnoredUserIds?.(ignoredUsers); }, [ignoredUsers]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            className="demo-chatroom-override"
        >
            {/* CSS overrides — gerçek bileşenlerin arka planlarını demo glassmorphism temasına uyumlu yap */}
            <style>{`
                .demo-chatroom-override .chat-area,
                .demo-chatroom-override [data-chat-messages] {
                    background: transparent !important;
                }
                .demo-chatroom-override .chat-messages-container {
                    background: transparent !important;
                    max-height: 540px !important;
                    padding-bottom: 20px !important;
                    flex: none !important;

                }
                .demo-chatroom-override .chat-messages-container .animate-in {
                    animation: none !important;
                    opacity: 1 !important;
                    transform: none !important;
                }
                /* ── Bottom Toolbar ana kart: tamamen saydam, gölgesiz ── */
                .demo-chatroom-override .bottom-toolbar {
                    background: transparent !important;
                    border-top: none !important;
                    backdrop-filter: none !important;
                    box-shadow: none !important;
                }
                /* Tüm iç div'ler: bg, border, shadow tamamen sıfır */
                .demo-chatroom-override .bottom-toolbar > div,
                .demo-chatroom-override .bottom-toolbar > div > div,
                .demo-chatroom-override .bottom-toolbar > div > div > div {
                    background: transparent !important;
                    box-shadow: none !important;
                    border-color: transparent !important;
                }
                /* İkon satırı kartı — ince çerçeve, saydam bg */
                .demo-chatroom-override .bottom-toolbar .bg-\\[\\#070B14\\]\\/80 {
                    background: rgba(255,255,255,0.025) !important;
                    border: 1px solid rgba(255,255,255,0.06) !important;
                    box-shadow: none !important;
                    border-radius: 16px !important;
                    overflow: hidden !important;
                }
                /* İkon butonları — hafif çerçeve */
                .demo-chatroom-override .bottom-toolbar button:not(.send-button) {
                    background: rgba(255,255,255,0.04) !important;
                    border-color: rgba(255,255,255,0.06) !important;
                    box-shadow: none !important;
                }
                /* GÖNDER butonu */
                .demo-chatroom-override .bottom-toolbar .send-button {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06) !important;
                }
                /* Input alanı — chat kartıyla aynı tonda */
                .demo-chatroom-override .bottom-toolbar input,
                .demo-chatroom-override .bottom-toolbar textarea {
                    background: rgba(255,255,255,0.03) !important;
                    border: 1px solid rgba(255,255,255,0.08) !important;
                    backdrop-filter: none !important;
                    border-radius: 12px !important;
                    box-shadow: none !important;
                }
                /* Mesaj balonları — yarı saydam */
                .demo-chatroom-override .message-bubble,
                .demo-chatroom-override .message-mine {
                    background: rgba(255,255,255,0.04) !important;
                    border-color: rgba(255,255,255,0.08) !important;
                }
            `}</style>

            {/* Düello Arenası */}
            <DuelArena socket={room.socket} currentUserId={room.state.currentUser?.id || ''} roomSlug={slug} />

            {/* Gerçek ChatMessages bileşeni */}
            <div className="chat-area" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'transparent' }}
                onContextMenu={handleChatContextMenu}
            >
                <ChatMessages
                    room={room}
                    messages={room.state.messages}
                    currentUser={room.state.currentUser}
                    onContextMenu={handleChatContextMenu}
                />
            </div>

            {/* ═══ Admin Panel Window ═══ */}
            {userLevel >= ROLE_HIERARCHY.admin && (
                <AdminPanelWindow
                    socket={room.socket}
                    users={room.state.users}
                    currentUser={room.state.currentUser}
                    roomState={room.state}
                    systemSettings={room.state.systemSettings}
                />
            )}

            {/* ═══ Context Menu ═══ */}
            {contextMenu && (
                <ContextMenu
                    items={getMenuItems()}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onItemClick={handleMenuItemClick}
                    targetUser={contextMenu.type === 'user' ? contextMenu.targetUser : undefined}
                />
            )}

            {/* ═══ Confirm Modal ═══ */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title || 'Onay'}
                message={confirmModal.message}
                variant={(confirmModal.variant as 'info' | 'danger' | 'warning') || undefined}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            {/* ═══ Modals ═══ */}
            <AllUsersModal
                isOpen={isAllUsersOpen}
                onClose={() => setIsAllUsersOpen(false)}
                socket={room.socket}
                currentUser={room.state.currentUser}
                onOpenDM={(username) => { room.actions.openDM(username); demoAddToast('info', 'Özel Mesaj', `${username} ile mesajlaşma başlatıldı.`); }}
            />
            <ChangeNameModal
                isOpen={isChangeNameOpen}
                currentName={room.state.currentUser?.username || ''}
                onClose={() => setIsChangeNameOpen(false)}
                onSubmit={(newName) => {
                    if (room.socket) { room.socket.emit('status:change-name', { newName }); demoAddToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${newName}`); }
                }}
            />
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
                onLanguageChange={(lang) => { if (room.socket) room.socket.emit('admin:saveSetting', { key: 'defaultLanguage', value: lang }); }}
            />
            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                currentUser={room.state.currentUser}
                onChangeName={(n) => {
                    if (room.socket) {
                        room.socket.emit('status:change-name', { newName: n });
                        const au = getAuthUser();
                        if (au) { au.username = n; setAuthUser(au); window.dispatchEvent(new Event('auth-change')); }
                        demoAddToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${n}`);
                    }
                }}
                onChangeAvatar={(a) => {
                    if (room.socket) {
                        room.socket.emit('status:change-avatar', { avatar: a });
                        const au = getAuthUser();
                        if (au) { au.avatar = a; setAuthUser(au); window.dispatchEvent(new Event('auth-change')); }
                        demoAddToast('success', 'Avatar Değiştirildi', 'Yeni avatarınız kaydedildi.');
                    }
                }}
                onChangeNameColor={(c) => {
                    if (room.socket) {
                        room.socket.emit('status:change-name-color', { color: c });
                        const au = getAuthUser();
                        if (au) { (au as any).nameColor = c; setAuthUser(au); window.dispatchEvent(new Event('auth-change')); }
                        demoAddToast('success', 'Renk Değiştirildi', 'İsim renginiz güncellendi.');
                    }
                }}
                onChangePassword={(o, n) => { if (room.socket) { room.socket.emit('status:change-password', { oldPassword: o, newPassword: n }); demoAddToast('success', 'Şifre Değiştirildi', 'Şifreniz güncellendi.'); } }}
            />
            <GodMasterProfileModal
                isOpen={isGodMasterProfileOpen}
                onClose={() => setIsGodMasterProfileOpen(false)}
                currentUser={room.state.currentUser}
                onChangeName={(n) => { if (room.socket) room.socket.emit('status:change-name', { newName: n }); }}
                onChangeAvatar={(a) => { if (room.socket) room.socket.emit('status:change-avatar', { avatar: a }); }}
                onChangeNameColor={(c) => { if (room.socket) room.socket.emit('status:change-name-color', { color: c }); }}
                onChangeIcon={(i) => { if (room.socket) room.socket.emit('status:change-godmaster-icon', { icon: i }); }}
            />
            {userInfoTarget && <UserInfoModal user={userInfoTarget} onClose={() => setUserInfoTarget(null)} />}
            <RoomMonitorModal
                isOpen={isRoomMonitorOpen}
                onClose={() => setIsRoomMonitorOpen(false)}
                socket={room.socket}
                currentRoomSlug={slug}
                onNavigateToRoom={(roomSlug: string) => { demoAddToast('info', 'Oda Değiştirildi', `Odaya geçildi: ${roomSlug}`); }}
                onUserAction={(item, targetUser) => handleMenuItemClick(item)}
                userLevel={userLevel}
                currentUserId={room.state.currentUser?.userId}
                currentUserRole={room.state.currentUser?.role}
            />
            <UserHistoryModal
                isOpen={!!userHistoryTarget}
                onClose={() => setUserHistoryTarget(null)}
                userId={userHistoryTarget?.userId || ''}
                displayName={userHistoryTarget?.displayName || ''}
            />

            {/* Gift System */}
            <GiftAnimation animationData={giftAnimation} onComplete={() => setGiftAnimation(null)} />
            <GiftPanel
                isOpen={giftPanelOpen}
                onClose={() => { setGiftPanelOpen(false); setGiftTargetUser(null); }}
                onSendGift={(giftId) => {
                    if (room.socket && giftTargetUser) {
                        room.socket.emit('gift:send', { receiverId: giftTargetUser.id, giftId }, (response: any) => {
                            if (response?.error) demoAddToast('error', '❌ Hediye Hatası', response.error);
                        });
                    }
                }}
                socket={room.socket}
                targetUserName={giftTargetUser?.name}
                onOpenShop={() => setTokenShopOpen(true)}
            />
            <TokenShop isOpen={tokenShopOpen} onClose={() => setTokenShopOpen(false)} socket={room.socket} />

            {/* DM Windows */}
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
                            setIgnoredUsers(prev => { const n = new Set(prev); if (n.has(dmUserId)) n.delete(dmUserId); else n.add(dmUserId); return n; });
                        } : undefined}
                        isIgnored={isDmIgnored}
                        initialPosition={{ x: 200 + (idx * 30), y: 150 + (idx * 30) }}
                        nudgeActive={nudgeTargetUsername === dmUser}
                        onNudge={dmUserId ? () => {
                            if (nudgeCooldown > 0) return;
                            room.socket?.emit('admin:userAction', { action: 'nudge', targetUserId: dmUserId });
                            setNudgeTargetUsername(dmUser);
                            setTimeout(() => setNudgeTargetUsername(null), 1500);
                            setNudgeCooldown(10);
                            demoAddToast('info', 'Titretildi', `${dmUser} titretildi.`);
                            try { const a = new Audio('/sounds/msn-nudge.mp3'); a.volume = 0.5; a.play().catch(() => { }); } catch { }
                        } : undefined}
                        nudgeCooldown={nudgeCooldown}
                        nudgeDisabled={nudgeDisabledUsers.has(dmUser)}
                        onNudgeToggle={() => {
                            setNudgeDisabledUsers(prev => {
                                const next = new Set(prev);
                                if (next.has(dmUser)) { next.delete(dmUser); demoAddToast('info', 'Titreme Açıldı', `${dmUser} sizi titretebilir.`); }
                                else { next.add(dmUser); demoAddToast('info', 'Titreme Kapatıldı', `${dmUser} sizi titretemez.`); }
                                return next;
                            });
                        }}
                    />
                );
            })}

            {/* Toasts */}
            <RoomToastContainer toasts={demoToasts} removeToast={demoRemoveToast} />

            {/* Friends Panel */}
            <FriendsPanel
                isOpen={isFriendsPanelOpen}
                onClose={() => setIsFriendsPanelOpen(false)}
                socket={room.socket}
                token={typeof window !== 'undefined' ? localStorage.getItem('soprano_tenant_token') || '' : ''}
                currentUserId={room.state.currentUser?.id || room.state.currentUser?.userId || ''}
            />
        </div>
    );
}
