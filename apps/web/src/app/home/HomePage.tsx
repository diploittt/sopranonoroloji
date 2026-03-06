"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { useRouter } from "next/navigation";
import { getAuthUser, setAuthUser, removeAuthUser, clearAllSopranoAuth, AuthUser } from "@/lib/auth";
import { generateGenderAvatar } from "@/lib/avatar";
import {
    Mic, Video, Users, LogIn, Monitor,
    Headset, ShieldCheck, Play, Star, Sparkles,
    Volume2, User, Lock, Settings, Copy, Upload, X, Globe, Check,
    Phone, Mail, MessageCircle, Send, BookOpen,
    Hand, Smile, Sticker, Clapperboard, Power, SendHorizontal
} from "lucide-react";
import { API_URL } from '@/lib/api';
import { adminApi } from '@/lib/admin/api';
import ToastContainer from '@/components/ui/ToastContainer';
import { useAdminStore } from '@/lib/admin/store';
import { RadioPlayer } from '@/components/roomUI/RadioPlayer';
import { ChatMessages } from '@/components/roomUI/ChatMessages';
import { BottomToolbar } from '@/components/roomUI/BottomToolbar';
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

type DemoContextMenuItem = RoomMenuItem;

const AUTH_TOKEN_KEY = 'soprano_auth_token';

// ─── DEMO MENU ITEMS (same as room page) ─────────────────────────────
const DEMO_EMPTY_AREA_ITEMS: DemoContextMenuItem[] = [
    { id: 'change-name', label: 'İsim Değiştir', icon: '✏️', action: 'openChangeNameModal', description: 'Kullanıcı adını değiştir' },
    { id: 'admin-panel', label: 'Admin Paneli', icon: '⚙️', action: 'openAdminPanel', description: 'Admin paneline git' },
    { id: 'clear-chat', label: 'Yazıları Sil', icon: '🗑️', action: 'clearChatRealtime', description: 'Chat ekranını temizle (herkes için)', confirm: true, confirmMessage: 'Tüm chat geçmişi silinecek. Emin misiniz?' },
    { id: 'check-history', label: 'Geçmişi Kontrol Et', icon: '📜', action: 'openHistoryModal', description: 'Chat ve oda geçmişini görüntüle' },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', action: 'openUsersModal', description: 'Tüm odalardaki kullanıcıları göster' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: '🏠', action: 'openRoomMonitor', description: 'Tüm odaları izle ve yönet' },
    { id: 'mic-free', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicrophone', description: 'Mikrofonu serbest bırak' },
    { id: 'mic-take', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicrophone', description: 'Mikrofonu al' },
    { id: 'talk-test', label: 'Mikrofon Testi', icon: '🎙️', action: 'testUserAudio', description: 'Mikrofonun çalışıp çalışmadığını test et' },
    { id: 'my-profile', label: 'Profilim', icon: '👤', action: 'openMyProfile', description: 'Kendi profilim' },
];

function getDemoUserMenuItems(targetUser?: any): DemoContextMenuItem[] {
    const isMuted = targetUser?.isMuted;
    const isGagged = targetUser?.isGagged;
    const isBanned = targetUser?.isBanned;
    const isCamBlocked = targetUser?.isCamBlocked;
    return [
        isMuted
            ? { id: 'unmute', label: 'Sesi Aç', icon: '🔊', action: 'unmuteUser' }
            : { id: 'mute', label: 'Sustur', icon: '🔇', action: 'muteUser' },
        { id: 'kick', label: 'At', icon: '👢', action: 'kickUser', confirm: true, confirmMessage: 'Kullanıcı odadan atılacak. Emin misiniz?' },
        isGagged
            ? { id: 'ungag', label: 'Yazı Yasağını Kaldır', icon: '💬', action: 'ungagUser' }
            : { id: 'gag', label: 'Yazı Yasağı', icon: '🤐', action: 'gagUser' },
        ...(isBanned
            ? [{ id: 'unban', label: 'Yasağı Kaldır', icon: '✅', action: 'unbanUser', confirm: true, confirmMessage: 'Yasak kaldırılacak. Emin misiniz?' }]
            : [
                { id: 'ban-1day', label: '1 Gün Yasakla', icon: '🚫', action: 'banUser', duration: '1d' as any, confirm: true, confirmMessage: '1 gün yasaklanacak. Emin misiniz?' },
                {
                    id: 'ban-more', label: 'Daha Fazla Yasakla', icon: '⛔', type: 'submenu' as const,
                    submenu: [
                        { id: 'ban-1week', label: '1 Hafta', duration: '1w' as any, action: 'banUser', confirm: true, confirmMessage: '1 hafta yasaklanacak.' },
                        { id: 'ban-1month', label: '1 Ay', duration: '1m' as any, action: 'banUser', confirm: true, confirmMessage: '1 ay yasaklanacak.' },
                        { id: 'ban-permanent', label: 'Kalıcı', duration: 'permanent' as any, action: 'banUser', confirm: true, confirmMessage: 'Kalıcı yasaklanacak!' },
                    ]
                }
            ]
        ),
        isCamBlocked
            ? { id: 'cam-unblock', label: 'Kamera İznini Aç', icon: '📷', action: 'unblockCamera' }
            : { id: 'cam-block', label: 'Kamera Engelle', icon: '📷🚫', action: 'blockCamera' },
        { id: 'user-info', label: 'Kullanıcı Bilgisi', icon: 'ℹ️', action: 'openUserInfo' },
        { id: 'log-history', label: 'Geçmiş', icon: '📜', action: 'openUserLogs' },
        { id: 'nudge', label: 'Titret 📳', icon: '📳', action: 'nudgeUser' },
        { id: 'duel', label: '⚔️ Düello Et', icon: '⚔️', action: 'challengeDuel' },
        { id: 'send-gift', label: 'Hediye Gönder', icon: '🎁', action: 'sendGift' },
        { id: 'private-chat', label: 'Özel Mesaj', icon: '💬', action: 'openPrivateChat' },
        { id: 'ignore', label: 'Yoksay', icon: '🙈', action: 'ignoreUser' },
        { id: 'unignore', label: 'Yoksayı Kaldır', icon: '👁️', action: 'unignoreUser' },
        { id: 'my-profile', label: 'Profilim', icon: '👤', action: 'openMyProfile' },
    ];
}

const DEMO_CHAT_AREA_ITEMS: DemoContextMenuItem[] = [
    { id: 'admin-panel', label: 'Admin Paneli', icon: '⚙️', action: 'openAdminPanel' },
    { id: 'copy', label: 'Kopyala', icon: '📋', action: 'copy' },
    { id: 'select-all', label: 'Tümünü Seç', icon: '✅', action: 'selectAll' },
    { id: 'paste', label: 'Yapıştır', icon: '📌', action: 'paste' },
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
    { id: 'users', label: 'Kullanıcılar', icon: '👥', action: 'showAllUsers' },
    { id: 'room-monitor', label: 'Odaları Gözetle', icon: '🏠', action: 'openRoomMonitor' },
];

// ─── DEMO CHAT ROOM — backend bağlantılı, tüm mekanikler entegre ───
function DemoChatRoom({ slug, onRoomData }: { slug: string; onRoomData?: (data: { users: any[]; messages: any[]; currentSpeaker: any; actions: any; socket: any; state: any; demoAddToast: any; setIsSettingsOpen: any; setSettingsAnchor: any }) => void }) {
    const room = useRoomRealtime({ slug });
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
        });
    }, [room.state.users, room.state.messages, room.state.currentSpeaker]);

    // ─── Modal States ─────────────────────────────────────────────────
    const [isChangeNameOpen, setIsChangeNameOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isGodMasterProfileOpen, setIsGodMasterProfileOpen] = useState(false);
    const [isAllUsersOpen, setIsAllUsersOpen] = useState(false);
    const [isRoomMonitorOpen, setIsRoomMonitorOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsAnchor, setSettingsAnchor] = useState<React.RefObject<HTMLElement | null>>({ current: null });
    const [userInfoTarget, setUserInfoTarget] = useState<any>(null);
    const [userHistoryTarget, setUserHistoryTarget] = useState<{ userId: string; displayName: string } | null>(null);
    const [ignoredUsers, setIgnoredUsers] = useState<Set<string>>(new Set());

    // Gift system
    const [giftPanelOpen, setGiftPanelOpen] = useState(false);
    const [giftTargetUser, setGiftTargetUser] = useState<{ id: string; name: string } | null>(null);
    const [giftAnimation, setGiftAnimation] = useState<any>(null);
    const [tokenShopOpen, setTokenShopOpen] = useState(false);

    // Nudge
    const [nudgeActive, setNudgeActive] = useState(false);

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
        setContextMenu({ type: 'empty', x: e.clientX, y: e.clientY });
    };
    const handleUserContextMenu = (e: React.MouseEvent, user: any) => {
        e.preventDefault();
        setContextMenu({ type: 'user', x: e.clientX, y: e.clientY, targetUser: user });
    };
    const handleChatContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
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
                demoAddToast('success', 'Susturuldu', `${targetName} susturuldu.`);
                break;
            case 'unmuteUser':
                room.socket?.emit('admin:userAction', { action: 'mute', targetUserId: targetId, value: false });
                demoAddToast('success', 'Ses Açıldı', `${targetName} sesi açıldı.`);
                break;
            case 'kickUser':
                room.socket?.emit('admin:userAction', { action: 'kick', targetUserId: targetId });
                demoAddToast('success', 'Atıldı', `${targetName} odadan atıldı.`);
                break;
            case 'gagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId });
                demoAddToast('success', 'Yazı Yasağı', `${targetName} yazı yasağı verildi.`);
                break;
            case 'ungagUser':
                room.socket?.emit('admin:userAction', { action: 'gag', targetUserId: targetId, value: false });
                demoAddToast('success', 'Yazı Yasağı Kaldırıldı', `${targetName} yazı yasağı kaldırıldı.`);
                break;
            case 'banUser':
                room.socket?.emit('admin:userAction', { action: 'ban', targetUserId: targetId, duration });
                demoAddToast('success', 'Yasaklandı', `${targetName} yasaklandı.`);
                break;
            case 'unbanUser':
                room.socket?.emit('admin:userAction', { action: 'unban', targetUserId: targetId });
                demoAddToast('success', 'Yasak Kaldırıldı', `${targetName} yasağı kaldırıldı.`);
                break;
            case 'blockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId });
                demoAddToast('success', 'Kamera Engellendi', `${targetName} kamerası engellendi.`);
                break;
            case 'unblockCamera':
                room.socket?.emit('admin:userAction', { action: 'cam_block', targetUserId: targetId, value: false });
                demoAddToast('success', 'Kamera Açıldı', `${targetName} kamera izni verildi.`);
                break;
            case 'openAdminPanel': {
                const { openPanel: adminOpen } = useAdminPanelStore.getState();
                adminOpen();
                break;
            }
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
                room.socket?.emit('admin:userAction', { action: 'nudge', targetUserId: targetId });
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
                if (role.toLowerCase() === 'godmaster') setIsGodMasterProfileOpen(true);
                else setIsProfileOpen(true);
                break;
            }
            case 'openChangeNameModal':
            case 'changeName':
                setIsChangeNameOpen(true);
                break;
            case 'openHistoryModal':
                setUserHistoryTarget({ userId: '', displayName: 'Tüm Kullanıcılar' });
                break;
            case 'openRoomMonitor':
                setIsRoomMonitorOpen(true);
                break;
            case 'changeAvatar':
            case 'changePassword':
            case 'changeNameColor':
                setIsProfileOpen(true);
                break;
            case 'testUserAudio':
                demoAddToast('info', 'Mikrofon Testi', 'Mikrofon testi başlatıldı.');
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
            demoAddToast('info', '📳 Titretme', `${data.from} seni titretti!`);
            setNudgeActive(true);
            setTimeout(() => setNudgeActive(false), 1500);
            try { const a = new Audio('/sounds/msn-nudge.mp3'); a.volume = 0.7; a.play().catch(() => { }); } catch { }
        };
        room.socket.on('gift:received', onGift);
        room.socket.on('room:nudge', onNudge);
        return () => { room.socket?.off('gift:received', onGift); room.socket?.off('room:nudge', onNudge); };
    }, [room.socket]);

    // Sync ignoredUsers → hook
    useEffect(() => { room.actions.setDmIgnoredUserIds?.(ignoredUsers); }, [ignoredUsers]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            className={`demo-chatroom-override ${nudgeActive ? 'nudge-shake' : ''}`}
        >
            {/* CSS overrides — gerçek bileşenlerin arka planlarını demo glassmorphism temasına uyumlu yap */}
            <style>{`
                .demo-chatroom-override .chat-area,
                .demo-chatroom-override .chat-messages-container,
                .demo-chatroom-override [data-chat-messages] {
                    background: transparent !important;
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
                .demo-chatroom-override .bottom-toolbar .bg-\[\#070B14\]\/80 {
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
                /* Oda sekme butonları — HeaderRooms.tsx'teki lavanta renkler kullanılsın */

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

            {/* BottomToolbar artık parent glossy-panel kartında render ediliyor */}

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
                onChangeName={(n) => { if (room.socket) { room.socket.emit('status:change-name', { newName: n }); demoAddToast('success', 'İsim Değiştirildi', `Yeni isminiz: ${n}`); } }}
                onChangeAvatar={(a) => { if (room.socket) { room.socket.emit('status:change-avatar', { avatar: a }); demoAddToast('success', 'Avatar Değiştirildi', 'Yeni avatarınız kaydedildi.'); } }}
                onChangeNameColor={(c) => { if (room.socket) { room.socket.emit('status:change-name-color', { color: c }); demoAddToast('success', 'Renk Değiştirildi', 'İsim renginiz güncellendi.'); } }}
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
                onNavigateToRoom={() => { }}
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
                    />
                );
            })}

            {/* Toasts */}
            <RoomToastContainer toasts={demoToasts} removeToast={demoRemoveToast} />
        </div>
    );
}


// --- SAHTE VERİLER ---
const ACTIVE_ROOMS = [
    { id: 1, name: "Goygoy & Müzik", owner: "Celine", users: 142, max: 250, type: "Kamera + Ses", isVip: false },
    { id: 2, name: "Gece Kuşları", owner: "Karanlık", users: 85, max: 100, type: "Sadece Ses", isVip: false },
    { id: 3, name: "Radyo Soprano", owner: "DJ.Bora", users: 310, max: 500, type: "Yayın", isVip: false },
    { id: 4, name: "Oyun Lobisi", owner: "GamerTR", users: 45, max: 50, type: "Kamera + Ses", isVip: false },
    { id: 5, name: "VIP Sohbet", owner: "Admin", users: 12, max: 30, type: "Özel Oda", isVip: true },
];

export default function HomePage() {
    const router = useRouter();

    // Section geçiş animasyonu
    const isInitialLoad = useRef(true);
    const [sectionChangeKey, setSectionChangeKey] = useState(0);
    const lampAnimDone = useRef<Record<string, boolean>>({});
    const [guestNick, setGuestNick] = useState("");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestError, setGuestError] = useState('');
    const [memberUsername, setMemberUsername] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberError, setMemberError] = useState('');
    const [memberLoading, setMemberLoading] = useState(false);
    const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
    const [tvTilt, setTvTilt] = useState({ x: 0, y: 0 });
    const [dbRooms, setDbRooms] = useState<any[]>([]);
    const addToast = useAdminStore((s) => s.addToast);
    const [guestGender, setGuestGender] = useState<'Erkek' | 'Kadın' | 'Belirsiz' | ''>('');
    const [selectedAvatar, setSelectedAvatar] = useState<string>('');
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [memberGender, setMemberGender] = useState<'Erkek' | 'Kadın' | 'Belirsiz' | ''>('');
    const [profileTab, setProfileTab] = useState<'profil' | 'ayarlar' | 'mesajlar'>('profil');
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showMemberAvatars, setShowMemberAvatars] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
    const [regGender, setRegGender] = useState<'Erkek' | 'Kadın' | 'Belirsiz'>('Belirsiz');
    const [regAcceptTerms, setRegAcceptTerms] = useState(false);
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [showPackages, setShowPackages] = useState(false);
    const [showDemoToast, setShowDemoToast] = useState(false);
    const [showLoginToast, setShowLoginToast] = useState(false);
    const [roomsMode, setRoomsMode] = useState(false);
    useEffect(() => { document.body.style.overflow = roomsMode ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [roomsMode]);
    const [blurToOdalar, setBlurToOdalar] = useState<false | 'out' | 'silhouette'>(false);
    const [userStatus, setUserStatus] = useState<'online' | 'busy' | 'brb' | 'away' | 'phone'>('online');
    const [micActive, setMicActive] = useState(false);
    const [demoSlug, setDemoSlug] = useState('genel-sohbet');
    const [demoMsgText, setDemoMsgText] = useState('');
    const demoRoomRef = useRef<any>(null);
    const [demoRoomReady, setDemoRoomReady] = useState(false);
    const [cachedRooms, setCachedRooms] = useState<{ name: string; slug: string }[]>([]);
    useEffect(() => { adminApi.getRooms().then((rooms: any[]) => { if (rooms?.length) setCachedRooms(rooms.map(r => ({ name: r.name, slug: r.slug }))); }).catch(() => { }); }, []);
    const [statusDropdown, setStatusDropdown] = useState(false);
    const [demoPhase, setDemoPhase] = useState<'idle' | 'cards-out' | 'bar-up' | 'bar-down' | 'lamp-center' | 'active' | 'exit-lamp' | 'exit-bar-up' | 'exit-bar-down' | 'exit-cards-in'>('idle');
    const demoMode = demoPhase === 'active' || demoPhase === 'lamp-center' || demoPhase === 'exit-lamp' || demoPhase === 'exit-bar-up';
    const [showCustomConfig, setShowCustomConfig] = useState(false);
    const [lampsOff, setLampsOff] = useState(false);
    const [liveHidden, setLiveHidden] = useState(false);
    const [cfgRooms, setCfgRooms] = useState(1);
    const [cfgPersons, setCfgPersons] = useState(30);
    const [cfgCamera, setCfgCamera] = useState<'Kameralı' | 'Kamerasız'>('Kameralı');
    const [cfgMeeting, setCfgMeeting] = useState<'Mevcut' | 'Yok'>('Mevcut');

    // Checkout state
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<{ name: string; price: number; period: string } | null>(null);
    const [chkName, setChkName] = useState('');
    const [chkEmail, setChkEmail] = useState('');
    const [chkPhone, setChkPhone] = useState('');
    const [chkLogo, setChkLogo] = useState<File | null>(null);
    const [chkHosting, setChkHosting] = useState<'soprano' | 'own'>('soprano');
    const [chkDomain, setChkDomain] = useState('');
    const [chkRoomName, setChkRoomName] = useState('');
    const [chkBilling, setChkBilling] = useState<'monthly' | 'yearly'>('monthly');
    const [chkPaymentCode] = useState(() => 'SPR-' + Math.random().toString(36).substring(2, 7).toUpperCase());
    const [chkCopied, setChkCopied] = useState<string | null>(null);

    // Customer Support widget
    const [supportOpen, setSupportOpen] = useState(false);
    const [supName, setSupName] = useState('');
    const [supEmail, setSupEmail] = useState('');
    const [supSubject, setSupSubject] = useState('');
    const [supMessage, setSupMessage] = useState('');

    // Navigation sections
    const [activeSection, setActiveSection] = useState('home');
    const [guideOpen, setGuideOpen] = useState<string | null>(null);

    const openCheckout = (name: string, price: number, period: string) => {
        setCheckoutPlan({ name, price, period });
        setShowCheckout(true);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setChkCopied(label);
        setTimeout(() => setChkCopied(null), 2000);
    };

    // Auth check on mount

    // Track section changes for lamp dip animation
    useEffect(() => {
        if (isInitialLoad.current) {
            const timer = setTimeout(() => { isInitialLoad.current = false; }, 3000);
            return () => clearTimeout(timer);
        }
        setSectionChangeKey(k => k + 1);
        lampAnimDone.current = {};
    }, [activeSection]);

    // Demo geçiş animasyonu
    const startDemoTransition = () => {
        setDemoPhase('cards-out');
        setTimeout(() => {
            setDemoPhase('bar-up');
            setTimeout(() => {
                setDemoPhase('bar-down');
                setTimeout(() => {
                    setDemoPhase('lamp-center');
                    setTimeout(() => {
                        setDemoPhase('active');
                    }, 600);
                }, 500);
            }, 400);
        }, 600);
    };

    const exitDemoTransition = () => {
        setDemoPhase('exit-lamp');
        setTimeout(() => {
            setDemoPhase('exit-bar-up');
            setTimeout(() => {
                setDemoPhase('exit-bar-down');
                setTimeout(() => {
                    setDemoPhase('exit-cards-in');
                    setTimeout(() => {
                        setDemoPhase('idle');
                        setActiveSection('home');
                    }, 600);
                }, 500);
            }, 400);
        }, 600);
    };


    useEffect(() => {
        const initialUser = getAuthUser();
        if (initialUser && !initialUser.isMember) {
            clearAllSopranoAuth();
            setUser(null);
        } else {
            setUser(initialUser);
        }
        const onAuthChange = () => setUser(getAuthUser());
        window.addEventListener('auth-change', onAuthChange);
        return () => window.removeEventListener('auth-change', onAuthChange);
    }, []);

    // Fetch rooms
    useEffect(() => {
        const fetchRooms = () => {
            fetch(`${API_URL}/rooms/public`)
                .then(r => r.ok ? r.json() : [])
                .then((data: any[]) => {
                    if (Array.isArray(data) && data.length > 0)
                        setDbRooms(data.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug, users: r._count?.participants || 0 })));
                }).catch(() => { });
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestNick.trim()) return;
        setGuestError(''); setGuestLoading(true);
        localStorage.removeItem(AUTH_TOKEN_KEY); removeAuthUser();
        try {
            const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: guestNick.trim(), gender: guestGender }) });
            const data = await res.json();
            if (data.error) { setGuestError(data.error); return; }
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            const avatarUrl = selectedAvatar || generateGenderAvatar(guestNick.trim(), guestGender);
            const u: AuthUser = { userId: data.user.sub, username: data.user.username, avatar: avatarUrl, isMember: false, role: 'guest' as const, gender: guestGender };
            setAuthUser(u); setUser(u);
        } catch { setGuestError('Bağlantı hatası.'); } finally { setGuestLoading(false); }
    };

    const handleMemberLogin = async () => {
        if (!memberUsername.trim() || !memberPassword) { setMemberError('Kullanıcı adı ve şifre gerekli.'); return; }
        setMemberError(''); setMemberLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: memberUsername.trim(), password: memberPassword, tenantId: 'system' }) });
            const data = await res.json();
            if (!res.ok) { setMemberError(data.message === 'Invalid credentials' ? 'Geçersiz kullanıcı adı veya şifre.' : (data.message || 'Giriş başarısız.')); return; }
            if (data.access_token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
                const memberAvatar = selectedAvatar || data.user?.avatar || generateGenderAvatar(memberUsername.trim(), memberGender || undefined);
                const u: AuthUser = { userId: data.user?.sub || memberUsername.trim(), username: data.user?.displayName || memberUsername.trim(), avatar: memberAvatar, isMember: true, role: (data.user?.role || 'member') as any, gender: (memberGender || 'Belirsiz') as any, email: data.user?.username || '' };
                setAuthUser(u); setUser(u); setEditName(u.username); setEditEmail(u.email || data.user?.username || ''); window.dispatchEvent(new Event('auth-change'));
            } else { setMemberError(data.message || 'Giriş başarısız.'); }
        } catch { setMemberError('Bağlantı hatası.'); } finally { setMemberLoading(false); }
    };

    const handleProfileUpdate = async (field: 'displayName' | 'avatar' | 'email' | 'password', value: string) => {
        setProfileSaving(true); setProfileMsg('');
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const res = await fetch(`${API_URL}/auth/update-profile`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                const result = await res.json();
                // Yeni JWT token'ı kaydet
                if (result.access_token) {
                    localStorage.setItem(AUTH_TOKEN_KEY, result.access_token);
                }
                // Backend'den dönen user bilgisiyle state'i güncelle
                if (result.user && user) {
                    const u = { ...user, ...result.user };
                    setUser(u); setAuthUser(u);
                    if (field === 'avatar') setSelectedAvatar(value);
                }
                setProfileMsg('✅ Güncellendi!');
                setTimeout(() => setProfileMsg(''), 2000);
            } else { setProfileMsg('❌ Güncelleme başarısız.'); }
        } catch { setProfileMsg('❌ Bağlantı hatası.'); } finally { setProfileSaving(false); }
    };

    const handleRegister = async () => {
        if (!regUsername.trim()) { setRegError('Kullanıcı adı gerekli.'); return; }
        if (!regEmail.trim()) { setRegError('E-posta gerekli.'); return; }
        if (!regPassword || regPassword.length < 6) { setRegError('Şifre en az 6 karakter olmalı.'); return; }
        if (regPassword !== regPasswordConfirm) { setRegError('Şifreler eşleşmiyor.'); return; }
        if (!regAcceptTerms) { setRegError('Üyelik sözleşmesini onaylayın.'); return; }
        setRegError(''); setRegLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: regUsername.trim(), email: regEmail.trim(), password: regPassword, gender: regGender })
            });
            const data = await res.json();
            if (!res.ok) { setRegError(data.message || 'Kayıt başarısız.'); return; }
            addToast?.('Üyelik başarıyla oluşturuldu! Giriş yapabilirsiniz.', 'success');
            setShowRegister(false);
            setMemberUsername(regUsername.trim());
            setRegUsername(''); setRegEmail(''); setRegPassword(''); setRegPasswordConfirm(''); setRegGender('Belirsiz'); setRegAcceptTerms(false);
        } catch { setRegError('Bağlantı hatası.'); } finally { setRegLoading(false); }
    };

    const handleLogout = () => {
        clearAllSopranoAuth();
        setUser(null);
        setGuestNick("");
    };

    const goRoom = (slug?: string) => {
        const rooms = dbRooms.length > 0 ? dbRooms : [{ slug: 'genel-sohbet' }];
        const roomSlug = slug || rooms[0]?.slug || 'genel-sohbet';
        router.push(`/room/${roomSlug}`);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');

                body {
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(to bottom, #a3ace5 0%, #c4c9ee 50%, #d8dbf4 100%);
                    background-attachment: fixed;
                    font-family: 'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif;
                    color: #f8fafc;
                    min-height: 100vh;
                    overflow-x: hidden;
                    overflow-y: scroll;
                }

                .main-content {
                    width: 100%;
                    max-width: 1400px;
                    margin: 0 auto;
                    position: relative;
                    background-color: #7a7e9e;
                    min-height: 100vh;
                    border-left: 14px solid transparent;
                    border-right: 14px solid transparent;
                    border-image: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0.05) 100%) 1;
                    box-shadow:
                        0 0 40px rgba(0,0,0,0.5),
                        0 0 80px rgba(0,0,0,0.3),
                        inset 0 0 30px rgba(0,0,0,0.15),
                        -8px 0 20px rgba(0,0,0,0.4),
                        8px 0 20px rgba(0,0,0,0.4);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .retro-logo-text {
                    font-family: 'Arial Rounded MT Bold', 'Arial Black', sans-serif;
                    background: linear-gradient(180deg, #f0f2f6 0%, #c0c8d5 35%, #8a95a8 55%, #6a7588 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.9)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.2));
                    letter-spacing: -1.5px;
                    transform: scaleY(1.05);
                }

                .retro-subtitle {
                    color: #9abfd9;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 1px rgba(0,0,0,0.9);
                    margin-top: 0px;
                    font-style: italic;
                    padding-left: 2px;
                }

                /* ====== PREMIUM HEADER BAR ====== */
                @keyframes headerSlide {
                    0% { transform: translateY(-100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .premium-header {
                    position: relative;
                    width: 100%;
                    height: 78px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 36px;
                    /* Bombeli metalik gradient — barrel efekti */
                    background: linear-gradient(180deg,
                        #5a6070 0%,
                        #3d4250 15%,
                        #1e222e 50%,
                        #282c3a 75%,
                        #3a3f50 100%);
                    border-radius: 0 0 28px 28px;
                    border: 1px solid rgba(0,0,0,0.5);
                    border-top: 1px solid rgba(120,130,150,0.6);
                    box-shadow:
                        0 6px 20px rgba(0, 0, 0, 0.5),
                        0 2px 6px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.12),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.05);
                    animation: headerSlide 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                    z-index: 50;
                    overflow: hidden;
                }
                /* Üst parlak şerit — bombeli yansıma */
                .premium-header::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 10%;
                    right: 10%;
                    height: 35%;
                    background: linear-gradient(180deg,
                        rgba(255,255,255,0.06) 0%,
                        rgba(255,255,255,0.02) 50%,
                        transparent 100%);
                    border-radius: 0 0 50% 50%;
                    pointer-events: none;
                }

                /* Logo */
                .header-logo {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 2px;
                    flex-shrink: 0;
                    position: absolute;
                    left: 36px;
                }
                @keyframes premiumLogoReveal {
                    0% { opacity: 0; filter: brightness(0.5); transform: translateX(-12px); }
                    60% { opacity: 1; filter: brightness(1.8); }
                    100% { opacity: 1; filter: brightness(1); transform: translateX(0); }
                }
                .header-logo h1 {
                    margin: 0;
                    font-size: 44px;
                    line-height: 1;
                    letter-spacing: -1px;
                    animation: premiumLogoReveal 0.8s ease-out forwards;
                    animation-delay: 0.2s;
                    opacity: 0;
                }
                .header-logo .tagline {
                    font-size: 11px;
                    color: rgba(200, 180, 140, 0.5);
                    font-style: italic;
                    letter-spacing: 2px;
                    text-transform: lowercase;
                    opacity: 0;
                    animation: premiumLogoReveal 0.6s ease-out forwards;
                    animation-delay: 0.6s;
                }

                /* Nav linkleri */
                .header-nav {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding-left: 180px;
                }
                @keyframes navFadeIn {
                    0% { opacity: 0; transform: translateY(-6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .nav-link {
                    position: relative;
                    padding: 8px 18px;
                    background: none;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.55);
                    font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 2.5px;
                    text-transform: uppercase;
                    transition: color 0.3s ease;
                    animation: navFadeIn 0.4s ease-out forwards;
                    opacity: 0;
                }
                .nav-link-0 { animation-delay: 0.4s; }
                .nav-link-1 { animation-delay: 0.5s; }
                .nav-link-2 { animation-delay: 0.6s; }
                .nav-link-3 { animation-delay: 0.7s; }
                .nav-link-4 { animation-delay: 0.8s; }
                .nav-link-5 { animation-delay: 0.9s; }

                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    left: 50%;
                    width: 0;
                    height: 1.5px;
                    background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.8), transparent);
                    transition: width 0.3s ease, left 0.3s ease;
                }
                .nav-link:hover {
                    color: rgba(255, 255, 255, 0.95);
                }
                .nav-link:hover::after {
                    width: 70%;
                    left: 15%;
                }
                .nav-link:active {
                    color: rgba(200, 170, 110, 0.9);
                }

                .nav-dot {
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: rgba(200, 170, 110, 0.2);
                    flex-shrink: 0;
                }

                /* 6) İçerik kartları — sırayla süzülerek belirme */
                @keyframes contentFadeIn {
                    0% { transform: translateY(-30px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .content-fade { opacity: 0; animation: contentFadeIn 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }
                .content-fade-1 { animation-delay: 0.6s; }
                .content-fade-2 { animation-delay: 0.8s; }
                .content-fade-3 { animation-delay: 1.0s; }
                .content-fade-4 { animation-delay: 1.2s; }
                .content-fade-5 { animation-delay: 1.4s; }
                .content-fade-6 { animation-delay: 1.6s; }

                .glossy-panel {
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
                        0 50px 70px -20px rgba(0, 0, 0, 0.8),
                        0 20px 30px -10px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255,255,255,0.1),
                        inset 0 0 60px rgba(255,255,255,0.03);
                    border-radius: 22px;
                    overflow: hidden;
                }

                .btn-3d {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    overflow: hidden;
                }

                .btn-3d-blue { background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%); color: #bae6fd; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-blue:hover { background: linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(2,132,199,0.45) 100%); box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-blue:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-green { background: linear-gradient(180deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.35) 100%); color: #a7f3d0; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-green:hover { background: linear-gradient(180deg, rgba(52,211,153,0.35) 0%, rgba(5,150,105,0.45) 100%); box-shadow: 0 6px 24px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-green:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-gold { background: linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.35) 100%); color: #fef3c7; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-gold:hover { background: linear-gradient(180deg, rgba(251,191,36,0.35) 0%, rgba(217,119,6,0.45) 100%); box-shadow: 0 6px 24px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-gold:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-red { background: linear-gradient(180deg, rgba(220,38,38,0.3) 0%, rgba(153,27,27,0.45) 100%); color: #fca5a5; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04); }
                .btn-3d-red:hover { background: linear-gradient(180deg, rgba(220,38,38,0.4) 0%, rgba(153,27,27,0.55) 100%); box-shadow: 0 6px 24px rgba(220,38,38,0.25), 0 0 18px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.06); transform: translateY(-1px); }
                .btn-3d-red:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-white { background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(200,210,225,0.2) 100%); color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.08); border-top: 1px solid rgba(255,255,255,0.25); }
                .btn-3d-white:hover { background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(210,220,235,0.3) 100%); box-shadow: 0 6px 24px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.12); transform: translateY(-1px); }
                .btn-3d-white:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3); }

                .input-inset { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(0,0,0,0.4); box-shadow: inset 0 3px 6px rgba(0,0,0,0.3); border-radius: 10px; color: #fff; transition: all 0.2s ease; }
                .input-inset:focus { outline: none; background: rgba(0,0,0,0.3); border-color: #38bdf8; box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.2); }
                .input-inset::placeholder { color: rgba(255,255,255,0.3); }

                .room-item { transition: all 0.2s ease; border: 1px solid transparent; }
                .room-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); transform: scale(1.01); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

                .feature-toast { transition: background 0.3s ease, box-shadow 0.3s ease; cursor: default; }
                .feature-toast:hover { background: rgba(255,255,255,0.08) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }

                .btn-3d-logout { background: linear-gradient(180deg, rgba(148,163,184,0.15) 0%, rgba(71,85,105,0.25) 100%); color: #94a3b8; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.03); }
                .btn-3d-logout:hover { background: linear-gradient(180deg, rgba(148,163,184,0.25) 0%, rgba(71,85,105,0.35) 100%); color: #e2e8f0; box-shadow: 0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); transform: translateY(-1px); }
                .btn-3d-logout:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

                /* ====== MİKROFON & RADYO PLAY BUTONU HOVER / ACTIVE ====== */
                .mic-button,
                .radio-play-btn {
                    transition: all 0.3s ease !important;
                }
                .mic-button:hover,
                .radio-play-btn:hover {
                    background: linear-gradient(180deg, #4a6a8a 0%, #354a65 15%, #1e3348 50%, #283d52 75%, #3a5570 100%) !important;
                    box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05) !important;
                    transform: translateY(-1px);
                }
                .mic-button:active,
                .radio-play-btn:active {
                    background: linear-gradient(180deg, #2a5a7a 0%, #1e4060 15%, #0e2a42 50%, #1e3858 75%, #2a4e6a 100%) !important;
                    box-shadow: 0 2px 8px rgba(56,189,248,0.3), inset 0 2px 4px rgba(0,0,0,0.3) !important;
                    transform: translateY(1px);
                }

                /* ====== GÖNDER BUTONU HOVER / ACTIVE ====== */
                .send-button:hover {
                    background: linear-gradient(180deg, #4a6a8a 0%, #354a65 15%, #1e3348 50%, #283d52 75%, #3a5570 100%) !important;
                    box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05) !important;
                    transform: translateY(-1px);
                }
                .send-button:active {
                    background: linear-gradient(180deg, #2a5a7a 0%, #1e4060 15%, #0e2a42 50%, #1e3858 75%, #2a4e6a 100%) !important;
                    box-shadow: 0 2px 8px rgba(56,189,248,0.3), inset 0 2px 4px rgba(0,0,0,0.3) !important;
                    transform: translateY(1px);
                }
                .send-button:disabled:hover,
                .send-button:disabled:active {
                    background: rgba(255,255,255,0.03) !important;
                    box-shadow: none !important;
                    transform: none !important;
                }

                /* 3D TV Efekti */
                .tv-wrapper {
                    width: 290px;
                    height: 200px;
                    position: relative;
                    animation: tvSlideIn 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.8s both;
                }
                .tv-wrapper::before, .tv-wrapper::after { display: none !important; }
                @keyframes tvSlideIn {
                    from { opacity: 0; transform: translateX(80px) scale(0.8); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                .tv-monitor {
                    width: 100%;
                    height: 100%;
                    background: #1a1a1a;
                    border: 3px solid #c0c8d5;
                    border-top-color: #f0f2f6;
                    border-bottom-color: #6a7588;
                    border-left-color: #8a95a8;
                    border-right-color: #8a95a8;
                    border-radius: 18px;
                    box-shadow: 0 16px 50px rgba(0,0,0,0.7), 0 6px 16px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(192,200,213,0.15);
                    position: relative;
                    overflow: hidden;
                }
                .tv-screen {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, #697ab5 0%, #9cb1d9 50%, #d8dff0 100%);
                    position: relative;
                    overflow: hidden;
                }
                /* Scanline overlay */
                .tv-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                    z-index: 2;
                }
                /* Statik yayın noise efekti */
                .tv-static {
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
                    opacity: 0.12;
                    animation: tvStatic 0.15s infinite;
                    pointer-events: none;
                    z-index: 1;
                }
                @keyframes tvStatic {
                    0%, 100% { opacity: 0.10; }
                    25% { opacity: 0.14; }
                    50% { opacity: 0.08; }
                    75% { opacity: 0.12; }
                }
                /* Flash / flicker efekti */
                .tv-flash {
                    position: absolute;
                    inset: 0;
                    background: white;
                    opacity: 0;
                    animation: tvFlash 4s infinite;
                    pointer-events: none;
                    z-index: 3;
                }
                @keyframes tvFlash {
                    0%, 95%, 100% { opacity: 0; }
                    96% { opacity: 0.08; }
                    97% { opacity: 0; }
                    98% { opacity: 0.05; }
                }
                /* Akan scanline efekti */
                .tv-scanline {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.04) 48%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 52%, transparent 100%);
                    background-size: 100% 30%;
                    animation: tvScanMove 5s linear infinite;
                    pointer-events: none;
                    z-index: 2;
                }
                @keyframes tvScanMove {
                    0% { background-position: 0 -100%; }
                    100% { background-position: 0 300%; }
                }
                /* Sohbet simülasyonu */
                .chat-sim { display: flex; flex-direction: column; gap: 6px; padding: 8px; height: 100%; overflow: hidden; position: relative; z-index: 1; }
                .chat-bubble {
                    display: flex; align-items: flex-start; gap: 5px;
                    animation: chatFadeIn 0.5s ease backwards;
                }
                .chat-bubble:nth-child(1) { animation-delay: 0.3s; }
                .chat-bubble:nth-child(2) { animation-delay: 0.8s; }
                .chat-bubble:nth-child(3) { animation-delay: 1.3s; }
                .chat-bubble:nth-child(4) { animation-delay: 1.8s; }
                .chat-bubble:nth-child(5) { animation-delay: 2.3s; }
                @keyframes chatFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .chat-avatar {
                    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                .chat-msg {
                    font-size: 8px; font-family: 'Plus Jakarta Sans', sans-serif;
                    padding: 3px 6px; border-radius: 6px; max-width: 75%;
                    line-height: 1.3;
                }


                /* === TABLO LAMBASI (SVG Gallery Lamp) === */
                .gallery-lamp-svg {
                    position: absolute;
                    top: -48px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 60;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                @keyframes lampSlideDown {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                    40% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                .gallery-lamp-svg svg {
                    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
                }
                .gallery-lamp-svg-right {
                    position: absolute;
                    top: -48px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 60;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .gallery-lamp-svg-right svg {
                    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
                }
                .gallery-lamp-glow {
                    position: absolute;
                    top: 32px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200px;
                    height: 90px;
                    background: radial-gradient(ellipse at top center, rgba(255,210,120,0.22) 0%, rgba(255,180,80,0.08) 40%, transparent 70%);
                    pointer-events: none;
                    border-radius: 0 0 50% 50%;
                    filter: blur(8px);
                }
                @keyframes glowLightUp {
                    0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
                    100% { opacity: 1; transform: translateX(-50%) scale(1); }
                }
                @keyframes galleryGlowPulse {
                    0% { opacity: 0.75; transform: translateX(-50%) scale(1); }
                    50% { opacity: 1; transform: translateX(-50%) scale(1.04); }
                    100% { opacity: 0.8; transform: translateX(-50%) scale(0.98); }
                }


                /* Lamba hafif aşağı sarkma - section geçişi */
                @keyframes lampDip {
                    0% { transform: translateX(-50%) translateY(0); }
                    40% { transform: translateX(-50%) translateY(12px); }
                    100% { transform: translateX(-50%) translateY(0); }
                }

                /* Kart yukarıdan aşağı kayma - fade yok */
                @keyframes cardSlideIn {
                    0% { transform: translateY(-40px); }
                    100% { transform: translateY(0); }
                }

                /* Odalar kartı sağdan sola süzülerek gelme */
                @keyframes roomsCardSlideIn {
                    0% { opacity: 0; transform: translateX(80px) scale(0.95); }
                    100% { opacity: 1; transform: translateX(0) scale(1); }
                }

                /* Işık yavaş açılma - kartlar oturduktan sonra */
                @keyframes glowReveal {
                    0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
                    100% { opacity: 1; transform: translateX(-50%) scale(1); }
                }


                @keyframes cardDropDown {
                    0% {
                        opacity: 0;
                        transform: translateY(-40px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes tvSettle {
                    0% { opacity: 0; transform: rotateX(0deg) rotateY(10deg) scale(0.95); }
                    30% { opacity: 1; }
                    50% { transform: rotateX(1deg) rotateY(4deg) scale(1); }
                    75% { transform: rotateX(-1deg) rotateY(-2deg) scale(1); }
                    100% { opacity: 1; transform: rotateX(0deg) rotateY(0deg) scale(1); }
                }
                @keyframes btnSlideUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes btnSlideDown {
                    0% { opacity: 0; transform: translateY(-20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes btnSway {
                    0%, 100% { transform: rotateX(-6deg) translateY(2px); }
                    50% { transform: rotateX(6deg) translateY(-2px); }
                }
                .model-btn:hover {
                    animation-play-state: paused !important;
                    transform: scale(1.03) !important;
                    transition: transform 0.5s ease !important;
                }

                /* ====== ANTI-GRAVITY EFFECTS ====== */
                @keyframes floatY {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes badgePulseGlow {
                    0%, 100% { box-shadow: 0 0 6px var(--badge-color, rgba(56,189,248,0.4)); }
                    50% { box-shadow: 0 0 16px var(--badge-color, rgba(56,189,248,0.7)), 0 0 30px var(--badge-color, rgba(56,189,248,0.25)); }
                }
                .antigravity-float {
                    animation: floatY 3s ease-in-out infinite;
                }
                .badge-glow {
                    animation: badgePulseGlow 2s ease-in-out infinite;
                    border: 1px solid var(--badge-color, rgba(56,189,248,0.5)) !important;
                }
                .btn-3d-gold-float {
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                }
                .btn-3d-gold-float:hover {
                    transform: translateY(-4px) !important;
                    box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.2), 0 10px 0 #b45309, 0 14px 30px rgba(251,191,36,0.4), 0 0 40px rgba(251,191,36,0.2) !important;
                }
                @keyframes demoToastIn {
                    0% { opacity: 0; transform: translateX(-30px) scale(0.9); }
                    100% { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes arrowBounce {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(6px); }
                }
                @keyframes loginArrowBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(6px); }
                }
                @keyframes odalarSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes odalarToastIn {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `}</style>

            <ToastContainer />



            {/* --- ANA KASA --- */}
            <div className="main-content">

                {/* PREMIUM HEADER */}
                <header className="premium-header" style={{
                    transition: 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
                    transform: (demoPhase === 'bar-up' || demoPhase === 'exit-bar-up') ? 'translateY(-100%)' : 'translateY(0)',
                }}>
                    <div className="header-logo">
                        <h1 className="retro-logo-text">SopranoChat</h1>
                        <span className="tagline">hear my voice</span>
                    </div>

                    <nav className="header-nav">
                        {demoMode ? (
                            <>
                                {['Lobby', 'Room1', 'Room2', 'Room3'].map((room, i, arr) => (
                                    <React.Fragment key={room}>
                                        <button className="nav-link" style={{
                                            color: i === 0 ? '#fbbf24' : '#94a3b8',
                                            textShadow: i === 0 ? '0 0 10px rgba(251,191,36,0.4)' : undefined,
                                            animation: `contentFadeIn 0.4s ease ${0.1 * i}s both`,
                                        }}>{room}</button>
                                        {i < arr.length - 1 && <span className="nav-dot" />}
                                    </React.Fragment>
                                ))}
                                <span className="nav-dot" />
                                <button
                                    className="nav-link"
                                    onClick={exitDemoTransition}
                                    style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4, animation: 'contentFadeIn 0.4s ease 0.4s both' }}
                                >
                                    🏠 Ana Sayfa
                                </button>
                            </>
                        ) : (
                            [
                                { label: 'HOME', section: 'home' },
                                { label: 'DEMO', section: 'odalar' },
                                { label: 'REHBER', section: 'rehber' },
                                { label: 'FİYATLAR', section: 'fiyatlar' },
                                { label: 'REFERANSLAR', section: 'referanslar' },
                                { label: 'İLETİŞİM', section: 'iletisim' },
                            ].map((item, i, arr) => (
                                <React.Fragment key={i}>
                                    <button
                                        className={`nav-link nav-link-${i}`}
                                        onClick={() => {
                                            if (item.section === 'odalar' && !user) {
                                                setShowLoginToast(true);
                                                setTimeout(() => setShowLoginToast(false), 4000);
                                                return;
                                            }
                                            if (item.section === 'odalar' && user) {
                                                if (roomsMode) return; // Zaten DEMO modundayız
                                                setBlurToOdalar('out');
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                setTimeout(() => {
                                                    setActiveSection('odalar');
                                                    setRoomsMode(true);
                                                    setBlurToOdalar('silhouette');
                                                }, 400);
                                                setTimeout(() => {
                                                    setBlurToOdalar(false);
                                                }, 900);
                                                return;
                                            }
                                            if (roomsMode) setRoomsMode(false);
                                            setActiveSection(item.section);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        style={{
                                            color: activeSection === item.section ? '#38bdf8' : undefined,
                                            textShadow: activeSection === item.section ? '0 0 10px rgba(56,189,248,0.4)' : undefined,
                                        }}
                                    >{item.label}</button>
                                    {i < arr.length - 1 && <span className="nav-dot" />}
                                </React.Fragment>
                            ))
                        )}
                    </nav>
                </header>

                {/* DEMO MODU — Orta Lamba */}
                {(demoPhase === 'lamp-center' || demoPhase === 'active' || demoPhase === 'exit-lamp') && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '20px 0 0',
                        animation: demoPhase === 'exit-lamp' ? 'contentFadeIn 0.5s ease reverse forwards' : 'contentFadeIn 0.5s ease both',
                    }}>
                        <div className="gallery-lamp-svg-right" style={{ position: 'relative', top: 0 }}>
                            <svg width="300" height="52" viewBox="0 0 300 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="glBarMetalDemo" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                    </linearGradient>
                                    <linearGradient id="glMountPlateDemo" x1="150" y1="0" x2="150" y2="14" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                    </linearGradient>
                                    <linearGradient id="glArmMetalDemo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                    </linearGradient>
                                    <linearGradient id="glLightSpreadDemo" x1="150" y1="44" x2="150" y2="52" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                    </linearGradient>
                                    <linearGradient id="glLedStripDemo" x1="40" y1="43" x2="260" y2="43" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path d="M48 44 L30 52 L270 52 L252 44 Z" fill="url(#glLightSpreadDemo)" opacity="0.5" />
                                <rect x="135" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateDemo)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                <line x1="142" y1="10" x2="115" y2="30" stroke="url(#glArmMetalDemo)" strokeWidth="3" strokeLinecap="round" />
                                <line x1="158" y1="10" x2="185" y2="30" stroke="url(#glArmMetalDemo)" strokeWidth="3" strokeLinecap="round" />
                                <rect x="45" y="30" width="210" height="14" rx="3" fill="url(#glBarMetalDemo)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                                <rect x="40" y="43.5" width="220" height="1.5" rx="0.75" fill="url(#glLedStripDemo)" />
                                <circle cx="120" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="120" cy="34" r="1" fill="#555" />
                                <circle cx="180" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="180" cy="34" r="1" fill="#555" />
                            </svg>
                            <div className="gallery-lamp-glow" style={{
                                width: 300, height: 110, opacity: 1,
                                background: 'radial-gradient(ellipse at top center, rgba(255,210,120,0.32) 0%, rgba(255,180,80,0.14) 40%, transparent 70%)',
                            }}></div>
                        </div>
                        <p style={{ color: '#64748b', fontSize: 12, fontWeight: 500, marginTop: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Demo Oturumu Aktif</p>
                    </div>
                )}
                <main style={{
                    width: '100%', padding: '32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 0,
                    transition: 'transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease, filter 0.6s ease',
                    transform: (demoPhase === 'cards-out' || demoPhase === 'bar-up' || demoPhase === 'bar-down' || demoPhase === 'lamp-center' || demoPhase === 'active' || demoPhase === 'exit-lamp' || demoPhase === 'exit-bar-up') ? 'translateY(-100vh) scale(0.8)' : (demoPhase === 'exit-bar-down') ? 'translateY(-60vh) scale(0.9)' : 'translateY(0) scale(1)',
                    opacity: blurToOdalar ? 0 : (demoPhase === 'cards-out' || demoPhase === 'bar-up' || demoPhase === 'bar-down' || demoPhase === 'lamp-center' || demoPhase === 'active' || demoPhase === 'exit-lamp' || demoPhase === 'exit-bar-up' || demoPhase === 'exit-bar-down') ? 0 : 1,
                    filter: blurToOdalar === 'out' ? 'blur(8px)' : blurToOdalar === 'silhouette' ? 'blur(6px)' : 'blur(0px)',
                    pointerEvents: demoPhase !== 'idle' && demoPhase !== 'exit-cards-in' ? 'none' : blurToOdalar ? 'none' : 'auto',
                }}>


                    {activeSection !== 'scene' && (<div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: roomsMode ? 16 : 32, flexWrap: roomsMode ? 'nowrap' as const : 'wrap', alignItems: roomsMode ? 'stretch' : 'flex-start' }}>

                            {/* SOL ALAN */}
                            <div style={{ flex: '1 1 60%', minWidth: roomsMode ? 280 : 400, display: 'flex', flexDirection: 'column', gap: roomsMode ? 16 : 32, order: 2 }}>
                                {(activeSection === 'home' || activeSection === 'odalar') && (
                                    <div key={'home-content'} style={roomsMode ? { display: 'flex', flexDirection: 'column' as const, flex: 1, gap: 12, minHeight: 0 } : { display: 'contents' }}>

                                        {/* Karşılama Kartı + Tablo Lambası */}
                                        <div style={{ position: 'relative', ...(roomsMode ? { flex: 1, display: 'flex', flexDirection: 'column' as const } : {}) }}>
                                            {/* ===== TABLO LAMBASI (geniş — Hoşgeldiniz kartı) ===== */}
                                            <div className="gallery-lamp-svg" key={'lamp-home-' + sectionChangeKey} style={{ ...(roomsMode ? { display: 'none' } : {}), animation: lampAnimDone.current['home'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.8s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards') }} onAnimationEnd={() => { lampAnimDone.current['home'] = true; }}>
                                                <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <defs>
                                                        <linearGradient id="glBarMetalW" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                            <stop offset="0%" stopColor="#4a4a4a" />
                                                            <stop offset="25%" stopColor="#2a2a2a" />
                                                            <stop offset="50%" stopColor="#1a1a1a" />
                                                            <stop offset="75%" stopColor="#2a2a2a" />
                                                            <stop offset="100%" stopColor="#3a3a3a" />
                                                        </linearGradient>
                                                        <linearGradient id="glMountPlateW" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                            <stop offset="0%" stopColor="#555" />
                                                            <stop offset="50%" stopColor="#2a2a2a" />
                                                            <stop offset="100%" stopColor="#1a1a1a" />
                                                        </linearGradient>
                                                        <linearGradient id="glArmMetalW" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#555" />
                                                            <stop offset="50%" stopColor="#333" />
                                                            <stop offset="100%" stopColor="#2a2a2a" />
                                                        </linearGradient>
                                                        <linearGradient id="glLightSpreadW" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                            <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" />
                                                            <stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                        </linearGradient>
                                                        <linearGradient id="glLedStripW" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                            <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" />
                                                            <stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                            <stop offset="50%" stopColor="#fff0cc" stopOpacity="1" />
                                                            <stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                            <stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadW)" opacity="0.5" />
                                                    <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateW)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                    <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                    <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalW)" strokeWidth="3" strokeLinecap="round" />
                                                    <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                    <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalW)" strokeWidth="3" strokeLinecap="round" />
                                                    <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                    <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalW)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                    <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                    <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                    <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripW)" />
                                                    <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                                    <circle cx="205" cy="34" r="1" fill="#555" />
                                                    <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                                    <circle cx="295" cy="34" r="1" fill="#555" />
                                                </svg>
                                                <div className="gallery-lamp-glow" style={{ width: 450, opacity: lampAnimDone.current['homeGlow'] ? 1 : 0, animation: lampAnimDone.current['homeGlow'] ? 'none' : 'glowLightUp 1.8s cubic-bezier(0.4,0,0.2,1) 2.0s forwards' }} onAnimationEnd={() => { lampAnimDone.current['homeGlow'] = true; }}></div>
                                            </div>

                                            {roomsMode && (
                                                <div className="glossy-panel" style={{ padding: '10px 12px 0 0', borderRadius: '12px 12px 0 0', marginBottom: -1, marginTop: -16, position: 'relative', zIndex: 5, boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <div style={{ display: 'flex', gap: 2, position: 'relative', zIndex: 10 }}>
                                                        {(demoRoomRef.current?.state?.rooms && demoRoomRef.current.state.rooms.length > 0
                                                            ? demoRoomRef.current.state.rooms.map((r: any) => ({ name: r.name, slug: r.slug }))
                                                            : cachedRooms.length > 0 ? cachedRooms : [{ name: 'Lobby', slug: 'genel-sohbet' }]
                                                        ).map((tab: { name: string; slug: string }, i: number) => {
                                                            const isActive = tab.slug === demoSlug;
                                                            return (
                                                                <div key={tab.slug} onClick={() => setDemoSlug(tab.slug)} style={{
                                                                    padding: '14px 26px',
                                                                    fontSize: 12,
                                                                    fontWeight: isActive ? 700 : 500,
                                                                    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
                                                                    textTransform: 'uppercase' as const,
                                                                    letterSpacing: '0.14em',
                                                                    color: isActive ? '#2d3348' : '#7a8a9d',
                                                                    background: isActive
                                                                        ? 'linear-gradient(180deg, rgba(140,146,170,0.95) 0%, rgba(155,160,185,0.92) 40%, rgba(168,172,196,0.90) 70%, rgba(180,184,206,0.88) 100%)'
                                                                        : 'transparent',
                                                                    borderTop: isActive ? '1px solid rgba(180,184,206,0.5)' : '1px solid transparent',
                                                                    borderLeft: isActive ? '1px solid rgba(180,184,206,0.5)' : '1px solid transparent',
                                                                    borderRight: isActive ? '1px solid rgba(180,184,206,0.5)' : '1px solid transparent',
                                                                    borderBottom: 'none',
                                                                    borderRadius: '14px 14px 0 0',
                                                                    cursor: 'pointer',
                                                                    transition: 'color 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                                                                    boxShadow: isActive
                                                                        ? '0 -2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2)'
                                                                        : 'none',
                                                                    position: 'relative',
                                                                    zIndex: isActive ? 15 : 1,
                                                                    opacity: 0,
                                                                    animation: `cardDropDown 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) ${0.15 + i * 0.1}s forwards`,
                                                                }}>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                                                        <span style={{
                                                                            width: 5, height: 5, borderRadius: '50%',
                                                                            background: isActive ? '#5b6180' : '#475569',
                                                                            transition: 'background 0.3s ease',
                                                                        }} />
                                                                        {tab.name}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                        {/* Sağ taraf — kontrol düğmeleri */}
                                                        <div style={{ flex: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 8 }}>
                                                            {/* Lamba Düğmesi */}
                                                            <button
                                                                onClick={() => setLampsOff(p => !p)}
                                                                title={lampsOff ? 'Lambaları Aç' : 'Lambaları Kapat'}
                                                                style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                                                    color: lampsOff ? '#475569' : '#fbbf24',
                                                                    transition: 'all 0.3s', display: 'flex', alignItems: 'center',
                                                                    opacity: 0, animation: 'cardDropDown 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) 0.5s forwards',
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M9 18h6" /><path d="M10 22h4" />
                                                                    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                                                                </svg>
                                                            </button>
                                                            {/* Canlı Yayın Gizle/Göster */}
                                                            <button
                                                                onClick={() => setLiveHidden(p => !p)}
                                                                title={liveHidden ? 'Canlı Yayını Göster' : 'Canlı Yayını Gizle'}
                                                                style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                                                    color: liveHidden ? '#475569' : '#94a3b8',
                                                                    transition: 'all 0.3s', display: 'flex', alignItems: 'center',
                                                                    opacity: 0, animation: 'cardDropDown 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s forwards',
                                                                }}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    {liveHidden ? (
                                                                        <><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></>
                                                                    ) : (
                                                                        <><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="7 22 12 17 17 22" /></>
                                                                    )}
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="glossy-panel" style={{ padding: roomsMode ? '4px 16px' : '40px', position: 'relative', overflow: 'hidden', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', ...(roomsMode ? { flex: 1, display: 'flex', flexDirection: 'column' as const, borderRadius: '0 0 8px 8px', marginTop: -2, maxHeight: 710, boxShadow: '0 14px 28px -4px rgba(0,0,0,0.45)' } : {}) }}>
                                                {/* DEMO geçiş yükleniyor ikonu — chat zemini içinde */}
                                                {roomsMode && blurToOdalar && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0, zIndex: 50,
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                                                        backdropFilter: 'blur(12px)',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        borderRadius: '0 0 8px 8px',
                                                        animation: 'odalarToastIn 0.3s ease both',
                                                    }}>
                                                        <div style={{
                                                            width: 56, height: 56, borderRadius: '50%',
                                                            background: 'radial-gradient(circle at 35% 35%, #a3f7a3, #34d399 40%, #059669 80%, #047857)',
                                                            boxShadow: '0 0 30px rgba(52,211,153,0.6), 0 0 60px rgba(52,211,153,0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: '3px solid rgba(255,255,255,0.25)',
                                                            animation: 'odalarSpin 1.2s linear infinite',
                                                        }}>
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                                                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                                            </svg>
                                                        </div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textShadow: '0 0 20px rgba(52,211,153,0.5)', letterSpacing: 2, textTransform: 'uppercase' }}>Demo Yükleniyor</div>
                                                    </div>
                                                )}

                                                {roomsMode && (
                                                    <div style={{ opacity: blurToOdalar ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                                                        <DemoChatRoom
                                                            slug={demoSlug}
                                                            onRoomData={(data) => { demoRoomRef.current = data; if (!demoRoomReady) setDemoRoomReady(true); }}
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ position: 'relative', zIndex: 10, ...(roomsMode ? { display: 'none' } : {}) }}>
                                                    {/* Orijinal içerik — tümü birlikte fade/blur olur */}
                                                    <div style={{
                                                        display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap',
                                                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        opacity: showPackages ? 0 : 1,
                                                        filter: showPackages ? 'blur(8px)' : 'blur(0)',
                                                        transform: showPackages ? 'scale(0.97)' : 'scale(1)',
                                                        maxHeight: showPackages ? 0 : 2000,
                                                        overflow: 'hidden',
                                                        pointerEvents: showPackages ? 'none' : 'auto',
                                                    }}>
                                                        <div style={{ flex: 1, minWidth: 280 }}>
                                                            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                                Kendi Dijital Sahneni Yarat
                                                            </h2>
                                                            <p style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, lineHeight: 1.8, marginBottom: 20, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                                <strong style={{ color: '#fff' }}>Kişisel sohbet odanızı satın alın</strong> ve tamamen sizin kurallarınızla yönetin.
                                                                HD kalitesinde sesli ve görüntülü iletişim, şifreli giriş koruması, gelişmiş yönetici paneli ve
                                                                sınırsız kişiselleştirme seçenekleriyle topluluğunuzu büyütün.
                                                                Kurumsal düzeyde altyapı, bireysel kullanım kolaylığıyla buluşuyor.
                                                            </p>
                                                        </div>

                                                        {/* Feature Toasts — tam genişlik 2x2 grid */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, width: '100%' }}>
                                                            {[
                                                                { icon: <ShieldCheck style={{ width: 15, height: 15 }} />, label: 'Şifreli', desc: 'Uçtan uca şifreleme', color: '#34d399' },
                                                                { icon: <Video style={{ width: 15, height: 15 }} />, label: 'HD Video', desc: 'Kristal netliğinde görüntü', color: '#a78bfa' },
                                                                { icon: <Mic style={{ width: 15, height: 15 }} />, label: 'Kristal Ses', desc: 'Düşük gecikme, yüksek kalite', color: '#38bdf8' },
                                                                { icon: <Settings style={{ width: 15, height: 15 }} />, label: 'Tam Kontrol', desc: 'Gelişmiş yönetici paneli', color: '#fbbf24' },
                                                            ].map((t, i) => (
                                                                <div key={i} className="feature-toast" style={{
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    padding: '8px 12px', borderRadius: 10,
                                                                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}22`,
                                                                }}>
                                                                    <div style={{
                                                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        background: `${t.color}15`, color: t.color,
                                                                        border: `1px solid ${t.color}30`,
                                                                    }}>{t.icon}</div>
                                                                    <div>
                                                                        <div style={{ fontSize: 11, fontWeight: 800, color: t.color, letterSpacing: 0.5 }}>{t.label}</div>
                                                                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>{t.desc}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Paket Kartları — showPackages açıkken görünür */}
                                                    <div style={{
                                                        transition: 'opacity 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s, filter 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s, transform 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s, max-height 2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
                                                        opacity: showPackages ? 1 : 0,
                                                        filter: showPackages ? 'blur(0px)' : 'blur(16px)',
                                                        transform: showPackages ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.95)',
                                                        maxHeight: showPackages ? 9999 : 0,
                                                        overflow: 'hidden',
                                                        pointerEvents: showPackages ? 'auto' : 'none',
                                                        willChange: 'opacity, transform, filter, max-height',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                                Çözüm Modelleri
                                                            </h2>
                                                            <button onClick={() => setShowPackages(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
                                                        </div>
                                                        <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 20 }}>İşletmenizin ihtiyacına göre iki farklı entegrasyon modeli.</p>

                                                        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                                                            <div className="feature-toast" style={{ flex: 1, padding: '20px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Monitor style={{ width: 20, height: 20, color: '#38bdf8' }} />
                                                                </div>
                                                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Soprano Hosted</h3>
                                                                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>Tamamen bizim sunucularımızda barınan, teknik kurulum gerektirmeyen hızlı çözüm. Saniyeler içinde kendi odanızı yayına alın.</p>
                                                            </div>
                                                            <div className="feature-toast" style={{ flex: 1, padding: '20px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Sparkles style={{ width: 20, height: 20, color: '#fbbf24' }} />
                                                                </div>
                                                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>White-Label Embed</h3>
                                                                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>Kendi sitenize iframe veya SDK ile gömün. Kullanıcılar sitenizden ayrılmadan SopranoChat deneyimini markanızla yaşasın.</p>
                                                            </div>
                                                        </div>

                                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, textAlign: 'center' }}>⭐ Fiyatlandırma</h3>

                                                            {/* Kampanyalı Paketler — fade out */}
                                                            <div style={{
                                                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                opacity: showCustomConfig ? 0 : 1,
                                                                filter: showCustomConfig ? 'blur(6px)' : 'blur(0)',
                                                                transform: showCustomConfig ? 'scale(0.97)' : 'scale(1)',
                                                                maxHeight: showCustomConfig ? 0 : 2000,
                                                                overflow: 'hidden',
                                                                pointerEvents: showCustomConfig ? 'none' : 'auto',
                                                            }}>
                                                                <div style={{ display: 'flex', gap: 12 }}>
                                                                    {[
                                                                        { name: 'Ses + Metin', price: '200', priceNum: 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                                                        { name: 'Kamera + Ses', price: '400', priceNum: 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                                                        { name: 'White Label', price: '2.990', priceNum: 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                                                    ].map((plan, i) => (
                                                                        <div key={i} style={{
                                                                            flex: 1, padding: '20px 16px', borderRadius: 12,
                                                                            background: plan.popular ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                                                                            border: `1px solid ${plan.popular ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                                            position: 'relative', overflow: 'hidden',
                                                                            display: 'flex', flexDirection: 'column',
                                                                        }}>
                                                                            {plan.badge && <div style={{ position: 'absolute', top: 8, right: -24, background: plan.popular ? '#a78bfa' : '#fbbf24', color: plan.popular ? '#fff' : '#000', fontSize: 7, fontWeight: 800, padding: '2px 28px', transform: 'rotate(45deg)', letterSpacing: 1 }}>{plan.badge}</div>}
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                                                <span style={{ fontSize: 18 }}>{plan.icon}</span>
                                                                                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{plan.name}</span>
                                                                            </div>
                                                                            <div style={{ marginBottom: 16 }}>
                                                                                <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>{plan.price} ₺</span>
                                                                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}> {plan.period}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, flex: 1 }}>
                                                                                {plan.features.map((f, fi) => (
                                                                                    <div key={fi} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                        <span style={{ color: '#34d399', fontSize: 12 }}>✓</span> {f}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <button onClick={() => openCheckout(plan.name, plan.priceNum, plan.period)} className={`btn-3d ${plan.btnClass}`} style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 800 }}>{plan.btnText}</button>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Özel Yapılandırma Butonu */}
                                                                <div style={{ textAlign: 'center', marginTop: 20 }}>
                                                                    <button
                                                                        onClick={() => setShowCustomConfig(true)}
                                                                        className="btn-3d btn-3d-blue"
                                                                        style={{ padding: '10px 28px', fontSize: 12, fontWeight: 800, borderRadius: 10, letterSpacing: 1 }}
                                                                    >
                                                                        ⚙️ Özel Yapılandırma
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Özel Yapılandırma Paneli — fade in */}
                                                            <div style={{
                                                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
                                                                opacity: showCustomConfig ? 1 : 0,
                                                                filter: showCustomConfig ? 'blur(0)' : 'blur(6px)',
                                                                transform: showCustomConfig ? 'translateY(0)' : 'translateY(20px)',
                                                                maxHeight: showCustomConfig ? 2000 : 0,
                                                                overflow: 'hidden',
                                                                pointerEvents: showCustomConfig ? 'auto' : 'none',
                                                            }}>
                                                                <div style={{
                                                                    background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '24px',
                                                                    border: '1px solid rgba(56,189,248,0.2)',
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
                                                                        <div>
                                                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '3px 10px', borderRadius: 6, display: 'inline-block', letterSpacing: 1, marginBottom: 8 }}>⚙️ Özel Yapılandırma</div>
                                                                            <h4 style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Kendi Paketini Oluştur</h4>
                                                                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>İhtiyacın kadar oda, dilediğin kadar limit.</p>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <button onClick={() => setShowCustomConfig(false)} className="btn-3d btn-3d-white" style={{ padding: '8px 16px', fontSize: 10, fontWeight: 800, borderRadius: 10 }}>
                                                                                ← Paketlere Dön
                                                                            </button>
                                                                            <button onClick={() => {
                                                                                const rc = cfgRooms * 200;
                                                                                const cc = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                                                const mc = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                                                const pe = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                                                openCheckout('Özel Paket', rc + cc + mc + pe, '/ay');
                                                                            }} className="btn-3d btn-3d-red" style={{ padding: '8px 20px', fontSize: 11, fontWeight: 800, borderRadius: 10 }}>
                                                                                Satın Al →
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Dropdown'lar */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>🏠 Oda Sayısı</div>
                                                                            <select value={cfgRooms} onChange={e => setCfgRooms(Number(e.target.value))} style={{
                                                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                                cursor: 'pointer', outline: 'none',
                                                                            }}>
                                                                                {[1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Oda</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>👥 Oda Kişi Limiti</div>
                                                                            <select value={cfgPersons} onChange={e => setCfgPersons(Number(e.target.value))} style={{
                                                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                                cursor: 'pointer', outline: 'none',
                                                                            }}>
                                                                                {[30, 50, 100, 200, 500].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Kişi</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>📹 Kamera</div>
                                                                            <select value={cfgCamera} onChange={e => setCfgCamera(e.target.value as any)} style={{
                                                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                                cursor: 'pointer', outline: 'none',
                                                                            }}>
                                                                                <option value="Kameralı" style={{ background: '#1e293b' }}>Kameralı</option>
                                                                                <option value="Kamerasız" style={{ background: '#1e293b' }}>Kamerasız</option>
                                                                            </select>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>💛 Toplantı Modu</div>
                                                                            <select value={cfgMeeting} onChange={e => setCfgMeeting(e.target.value as any)} style={{
                                                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                                cursor: 'pointer', outline: 'none',
                                                                            }}>
                                                                                <option value="Mevcut" style={{ background: '#1e293b' }}>Mevcut</option>
                                                                                <option value="Yok" style={{ background: '#1e293b' }}>Yok</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    {/* Tahmini Fiyatlandırma */}
                                                                    {(() => {
                                                                        const roomCost = cfgRooms * 200;
                                                                        const cameraCost = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                                        const meetingCost = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                                        const personExtra = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                                        const monthlyTotal = roomCost + cameraCost + meetingCost + personExtra;
                                                                        const yearlyTotal = monthlyTotal * 10; // 2 ay hediye
                                                                        return (
                                                                            <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <span style={{ color: '#38bdf8' }}>₺</span> Tahmini Fiyatlandırma
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                        <span>🏠 {cfgRooms} Oda</span>
                                                                                        <span style={{ color: '#fff', fontWeight: 700 }}>+{roomCost.toLocaleString('tr-TR')} ₺</span>
                                                                                    </div>
                                                                                    {cameraCost > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                            <span>📹 Kamera</span>
                                                                                            <span style={{ color: '#fff', fontWeight: 700 }}>+{cameraCost.toLocaleString('tr-TR')} ₺</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {meetingCost > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                            <span>💛 Toplantı Modu</span>
                                                                                            <span style={{ color: '#fff', fontWeight: 700 }}>+{meetingCost.toLocaleString('tr-TR')} ₺</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {personExtra > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                            <span>👥 Ek Kişi Kapasitesi ({cfgPersons} kişi)</span>
                                                                                            <span style={{ color: '#fff', fontWeight: 700 }}>+{personExtra.toLocaleString('tr-TR')} ₺</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                                                    <div>
                                                                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Aylık</div>
                                                                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{monthlyTotal.toLocaleString('tr-TR')} ₺</div>
                                                                                    </div>
                                                                                    <div style={{ textAlign: 'right' }}>
                                                                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>Yıllık (2 Ay Ücretsiz)</div>
                                                                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{yearlyTotal.toLocaleString('tr-TR')} ₺</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* roomsMode: Gerçek BottomToolbar — ayrı glossy-panel kart */}
                                        {roomsMode && demoRoomReady && demoRoomRef.current && (
                                            <div className="glossy-panel demo-chatroom-override" style={{
                                                padding: '12px 16px', marginTop: -8, position: 'relative', zIndex: 6,
                                                boxShadow: '0 -12px 36px rgba(0,0,0,0.5), 0 -4px 12px rgba(0,0,0,0.35), 0 20px 50px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                                            }}>
                                                <BottomToolbar
                                                    onSendMessage={demoRoomRef.current.actions.sendMessage}
                                                    onRequestMic={demoRoomRef.current.actions.requestMic}
                                                    onReleaseMic={demoRoomRef.current.actions.releaseMic}
                                                    onJoinQueue={demoRoomRef.current.actions.joinQueue}
                                                    onLeaveQueue={demoRoomRef.current.actions.leaveQueue}
                                                    onToggleCamera={demoRoomRef.current.actions.toggleCamera}
                                                    onLeaveRoom={demoRoomRef.current.actions.leaveRoom}
                                                    onToggleSettings={() => demoRoomRef.current?.setIsSettingsOpen?.((prev: boolean) => !prev)}
                                                    onRegisterSettingsRef={(ref: any) => demoRoomRef.current?.setSettingsAnchor?.(ref)}
                                                    isCameraOn={demoRoomRef.current.state.isCameraOn}
                                                    isMicOn={demoRoomRef.current.state.isMicOn}
                                                    currentSpeaker={demoRoomRef.current.state.currentSpeaker}
                                                    currentUser={demoRoomRef.current.state.currentUser}
                                                    queue={demoRoomRef.current.state.queue}
                                                    lastError={demoRoomRef.current.state.lastError}
                                                    onDismissError={demoRoomRef.current.actions.dismissError}
                                                    onToggleRemoteVolume={demoRoomRef.current.actions.toggleRemoteVolume}
                                                    isRemoteMuted={demoRoomRef.current.state.isRemoteMuted}
                                                    remoteVolume={demoRoomRef.current.state.remoteVolume}
                                                    isChatLocked={demoRoomRef.current.state.isChatLocked}
                                                    isCurrentUserMuted={demoRoomRef.current.state.isCurrentUserMuted}
                                                    isCurrentUserGagged={demoRoomRef.current.state.isCurrentUserGagged}
                                                    onEmojiClick={() => demoRoomRef.current?.demoAddToast?.('info', 'Yakında', 'Emoji özelliği yakında eklenecek. 😊')}
                                                    onStickerClick={() => demoRoomRef.current?.demoAddToast?.('info', 'Yakında', 'Sticker özelliği yakında eklenecek. 🎨')}
                                                    onGifClick={() => demoRoomRef.current?.demoAddToast?.('info', 'Yakında', 'GIF özelliği yakında eklenecek. 🎬')}
                                                    onVolumeChange={demoRoomRef.current.actions.setRemoteVolume}
                                                    systemSettings={demoRoomRef.current.state.systemSettings}
                                                />
                                            </div>
                                        )}

                                        {/* Müşteri Platformları / Chat Toolbar */}
                                        <div className="glossy-panel content-fade content-fade-2" style={{ padding: roomsMode ? '16px 20px' : '24px 32px', ...(roomsMode ? { display: 'none' } : {}) }}>
                                            {roomsMode ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {/* Toolbar Üst Satır */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                                                            {/* Sıra Al */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Sıra Al">
                                                                <Hand style={{ width: 14, height: 14 }} />
                                                            </button>
                                                            {/* Ses */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Ses Ayarı">
                                                                <Volume2 style={{ width: 14, height: 14 }} />
                                                            </button>
                                                            {/* Ayırıcı */}
                                                            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />
                                                            {/* Emoji */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Emoji">
                                                                <Smile style={{ width: 14, height: 14 }} />
                                                            </button>
                                                            {/* Sticker */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Sticker">
                                                                <Sticker style={{ width: 14, height: 14 }} />
                                                            </button>
                                                            {/* GIF */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="GIF">
                                                                <Clapperboard style={{ width: 14, height: 14 }} />
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 5 }}>
                                                            {/* Ayarlar */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Ayarlar">
                                                                <Settings style={{ width: 14, height: 14 }} />
                                                            </button>
                                                            {/* Çıkış */}
                                                            <button className="feature-toast" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Çıkış">
                                                                <Power style={{ width: 14, height: 14 }} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Mesaj Input + Gönder */}
                                                    <div style={{ display: 'flex', gap: 8, height: 40 }}>
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <input type="text" placeholder="Mesajınızı buraya yazın..." style={{ width: '100%', height: '100%', padding: '0 14px', borderRadius: 10, fontSize: 12, fontWeight: 500, color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(8px)' }} />
                                                        </div>
                                                        <button style={{ height: '100%', padding: '0 18px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 1.5, transition: 'all 0.3s' }}>
                                                            GÖNDER <SendHorizontal style={{ width: 13, height: 13, color: '#64748b' }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                            <Users style={{ width: 24, height: 24, color: '#38bdf8' }} /> Müşteri Platformları
                                                        </h3>
                                                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>SopranoChat altyapısıyla çalışan sohbet odalarına katılanlar.</p>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {[
                                                            { name: 'Gurbetçiler', room: 'Gurbetçiler', users: 2, rooms: 1, color: '#fbbf24', emoji: '🌍' },
                                                            { name: 'MüzikSeverler', room: 'DJ Lounge', users: 5, rooms: 3, color: '#a78bfa', emoji: '🎵' },
                                                        ].map((p, i) => (
                                                            <div key={i} className="feature-toast" style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                padding: '14px 16px', borderRadius: 14,
                                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                                    <div style={{
                                                                        width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        background: `linear-gradient(135deg, ${p.color}33, ${p.color}11)`,
                                                                        border: `1px solid ${p.color}44`, fontSize: 22,
                                                                    }}>{p.emoji}</div>
                                                                    <div>
                                                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{p.name}</div>
                                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Oda: {p.room}</div>
                                                                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users style={{ width: 12, height: 12 }} /> {p.users}</span>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Monitor style={{ width: 12, height: 12 }} /> {p.rooms} oda</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button className="btn-3d btn-3d-blue" style={{
                                                                    padding: '6px 18px', fontSize: 11, fontWeight: 800, borderRadius: 10,
                                                                }}>Katıl</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* İLETİŞİM SECTION */}
                                {activeSection === 'iletisim' && (
                                    <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
                                        {/* Gallery Lamp */}
                                        <div className="gallery-lamp-svg" key={'lamp-section-' + sectionChangeKey} style={{ animation: lampAnimDone.current['iletisim'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards') }} onAnimationEnd={() => { lampAnimDone.current['iletisim'] = true; }}>
                                            <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="glBarMetalC" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                                    </linearGradient>
                                                    <linearGradient id="glMountPlateC" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                                    </linearGradient>
                                                    <linearGradient id="glArmMetalC" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                                    </linearGradient>
                                                    <linearGradient id="glLightSpreadC" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                    </linearGradient>
                                                    <linearGradient id="glLedStripC" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadC)" opacity="0.5" />
                                                <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateC)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalC)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalC)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalC)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripC)" />
                                                <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                                <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                            </svg>
                                            <div className="gallery-lamp-glow" key={'glow-section-' + sectionChangeKey} style={{ width: 450, animation: !isInitialLoad.current ? 'glowReveal 1.2s ease-out 0.9s both' : undefined }}></div>
                                        </div>
                                        <div className="glossy-panel" style={{ padding: '28px 32px', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', zIndex: 10 }}>
                                            {/* Başlık */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: 'linear-gradient(135deg, #38bdf8, #06b6d4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 6px 16px rgba(56,189,248,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                                }}>
                                                    <Phone style={{ width: 20, height: 20, color: '#fff' }} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Bizimle İletişime Geçin</h2>
                                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat Bilişim · Sorularınız ve önerileriniz için bize ulaşın.</p>
                                                </div>
                                            </div>

                                            {/* İletişim Butonları — yatay */}
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                                <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                                                    background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.18)',
                                                    transition: 'all 0.3s',
                                                }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <MessageCircle style={{ width: 15, height: 15, color: '#fff' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#25d366' }}>WhatsApp</div>
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>+90 552 036 3674</div>
                                                    </div>
                                                </a>
                                                <a href="mailto:destek@sopranochat.com" style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                                                    background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.18)',
                                                    transition: 'all 0.3s',
                                                }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Mail style={{ width: 15, height: 15, color: '#fff' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>E-Posta</div>
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>destek@sopranochat.com</div>
                                                    </div>
                                                </a>
                                                <div style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '12px 14px', borderRadius: 12,
                                                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)',
                                                }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Globe style={{ width: 15, height: 15, color: '#fff' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>Web</div>
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>sopranochat.com</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ayırıcı */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                                <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>Mesaj Gönderin</span>
                                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                            </div>

                                            {/* Form */}
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                                <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="Ad Soyad" style={{
                                                    flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                                                }} />
                                                <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="mail@ornek.com" style={{
                                                    flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                                                }} />
                                            </div>
                                            <input type="text" value={supSubject} onChange={e => setSupSubject(e.target.value)} placeholder="Mesajınızın konusu" style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 8,
                                            }} />
                                            <textarea value={supMessage} onChange={e => setSupMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..."
                                                rows={3} style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', marginBottom: 12,
                                                }} />
                                            <button className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                Mesaj Gönder <Send style={{ width: 14, height: 14 }} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* FİYATLAR SECTION */}
                                {activeSection === 'fiyatlar' && (
                                    <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
                                        {/* Gallery Lamp */}
                                        <div className="gallery-lamp-svg" key={'lamp-section-' + sectionChangeKey} style={{ animation: isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}>
                                            <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="glBarMetalP" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                                    </linearGradient>
                                                    <linearGradient id="glMountPlateP" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                                    </linearGradient>
                                                    <linearGradient id="glArmMetalP" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                                    </linearGradient>
                                                    <linearGradient id="glLightSpreadP" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                    </linearGradient>
                                                    <linearGradient id="glLedStripP" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadP)" opacity="0.5" />
                                                <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateP)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalP)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalP)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalP)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripP)" />
                                                <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                                <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                            </svg>
                                            <div className="gallery-lamp-glow" key={'glow-section-' + sectionChangeKey} style={{ width: 450, animation: !isInitialLoad.current ? 'glowReveal 1.2s ease-out 0.9s both' : undefined }}></div>
                                        </div>
                                        <div className="glossy-panel" style={{ padding: '28px 32px', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', zIndex: 10 }}>
                                            {/* Başlık */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 6px 16px rgba(251,191,36,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                                }}>
                                                    <Star style={{ width: 20, height: 20, color: '#fff' }} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Fiyatlandırma</h2>
                                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>İşletmenize uygun çözüm modelini seçin.</p>
                                                </div>
                                            </div>

                                            {/* Paket Kartları */}
                                            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                                {[
                                                    { name: 'Ses + Metin', price: '200', priceNum: 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                                    { name: 'Kamera + Ses', price: '400', priceNum: 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                                    { name: 'White Label', price: '2.990', priceNum: 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                                ].map((plan, i) => (
                                                    <div key={i} style={{
                                                        flex: 1, padding: '20px 16px', borderRadius: 14,
                                                        background: plan.popular ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                                                        border: `1px solid ${plan.popular ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                        position: 'relative', overflow: 'hidden',
                                                        display: 'flex', flexDirection: 'column',
                                                    }}>
                                                        {plan.badge && <div style={{ position: 'absolute', top: 8, right: -24, background: plan.popular ? '#a78bfa' : '#fbbf24', color: plan.popular ? '#fff' : '#000', fontSize: 7, fontWeight: 800, padding: '2px 28px', transform: 'rotate(45deg)', letterSpacing: 1 }}>{plan.badge}</div>}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                            <span style={{ fontSize: 18 }}>{plan.icon}</span>
                                                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{plan.name}</span>
                                                        </div>
                                                        <div style={{ marginBottom: 16 }}>
                                                            <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>{plan.price} ₺</span>
                                                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}> {plan.period}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, flex: 1 }}>
                                                            {plan.features.map((f, fi) => (
                                                                <div key={fi} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ color: '#34d399', fontSize: 12 }}>✓</span> {f}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button onClick={() => openCheckout(plan.name, plan.priceNum, plan.period)} className={`btn-3d ${plan.btnClass}`} style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 800 }}>{plan.btnText}</button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Özel Yapılandırma */}
                                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '20px', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                                    <div>
                                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '3px 10px', borderRadius: 6, display: 'inline-block', letterSpacing: 1, marginBottom: 6 }}>⚙️ Özel Yapılandırma</div>
                                                        <h4 style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0 }}>Kendi Paketini Oluştur</h4>
                                                    </div>
                                                    <button onClick={() => {
                                                        const rc = cfgRooms * 200;
                                                        const cc = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                        const mc = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                        const pe = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                        openCheckout('Özel Paket', rc + cc + mc + pe, '/ay');
                                                    }} className="btn-3d btn-3d-red" style={{ padding: '8px 20px', fontSize: 11, fontWeight: 800, borderRadius: 10 }}>
                                                        Satın Al →
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                                                    <div>
                                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>🏠 Oda Sayısı</div>
                                                        <select value={cfgRooms} onChange={e => setCfgRooms(Number(e.target.value))} style={{
                                                            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                                        }}>
                                                            {[1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Oda</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>👥 Kişi Limiti</div>
                                                        <select value={cfgPersons} onChange={e => setCfgPersons(Number(e.target.value))} style={{
                                                            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                                        }}>
                                                            {[30, 50, 100, 200, 500].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Kişi</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>📹 Kamera</div>
                                                        <select value={cfgCamera} onChange={e => setCfgCamera(e.target.value as any)} style={{
                                                            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                                        }}>
                                                            <option value="Kameralı" style={{ background: '#1e293b' }}>Kameralı</option>
                                                            <option value="Kamerasız" style={{ background: '#1e293b' }}>Kamerasız</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>💛 Toplantı</div>
                                                        <select value={cfgMeeting} onChange={e => setCfgMeeting(e.target.value as any)} style={{
                                                            width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                                        }}>
                                                            <option value="Mevcut" style={{ background: '#1e293b' }}>Mevcut</option>
                                                            <option value="Yok" style={{ background: '#1e293b' }}>Yok</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {/* Fiyat Hesaplama */}
                                                {(() => {
                                                    const roomCost = cfgRooms * 200;
                                                    const cameraCost = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                    const meetingCost = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                    const personExtra = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                    const monthlyTotal = roomCost + cameraCost + meetingCost + personExtra;
                                                    const yearlyTotal = monthlyTotal * 10;
                                                    return (
                                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                                    <span>🏠 {cfgRooms} Oda</span><span style={{ color: '#fff', fontWeight: 700 }}>+{roomCost.toLocaleString('tr-TR')} ₺</span>
                                                                </div>
                                                                {cameraCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                                    <span>📹 Kamera</span><span style={{ color: '#fff', fontWeight: 700 }}>+{cameraCost.toLocaleString('tr-TR')} ₺</span>
                                                                </div>}
                                                                {meetingCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                                    <span>💛 Toplantı</span><span style={{ color: '#fff', fontWeight: 700 }}>+{meetingCost.toLocaleString('tr-TR')} ₺</span>
                                                                </div>}
                                                                {personExtra > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                                    <span>👥 Ek Kapasite ({cfgPersons} kişi)</span><span style={{ color: '#fff', fontWeight: 700 }}>+{personExtra.toLocaleString('tr-TR')} ₺</span>
                                                                </div>}
                                                            </div>
                                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                                                                <div><div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Aylık</div><div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{monthlyTotal.toLocaleString('tr-TR')} ₺</div></div>
                                                                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Yıllık (2 Ay Ücretsiz)</div><div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{yearlyTotal.toLocaleString('tr-TR')} ₺</div></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Alt bilgi */}
                                            <div style={{ textAlign: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                                    Tüm paketler <span style={{ color: '#34d399', fontWeight: 700 }}>7 gün ücretsiz deneme</span> ile başlar. İstediğiniz zaman iptal edebilirsiniz.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* REHBER SECTION */}
                                {activeSection === 'rehber' && (
                                    <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
                                        {/* Gallery Lamp */}
                                        <div className="gallery-lamp-svg" key={'lamp-section-' + sectionChangeKey} style={{ animation: isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' }}>
                                            <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="glBarMetalR" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                                    </linearGradient>
                                                    <linearGradient id="glMountPlateR" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                                    </linearGradient>
                                                    <linearGradient id="glArmMetalR" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                                    </linearGradient>
                                                    <linearGradient id="glLightSpreadR" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                    </linearGradient>
                                                    <linearGradient id="glLedStripR" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadR)" opacity="0.5" />
                                                <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateR)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalR)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalR)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalR)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripR)" />
                                                <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                                <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                            </svg>
                                            <div className="gallery-lamp-glow" key={'glow-section-' + sectionChangeKey} style={{ width: 450, animation: !isInitialLoad.current ? 'glowReveal 1.2s ease-out 0.9s both' : undefined }}></div>
                                        </div>
                                        <div className="glossy-panel" style={{ padding: '28px 32px', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', zIndex: 10, background: 'linear-gradient(180deg, rgba(70,80,100,0.85) 0%, rgba(45,55,75,0.75) 20%, rgba(35,45,65,0.7) 50%, rgba(40,50,70,0.75) 80%, rgba(65,75,95,0.85) 100%)', border: '1px solid rgba(100,110,130,0.4)', borderTop: '1px solid rgba(160,170,190,0.5)', borderBottom: '1px solid rgba(140,150,170,0.4)', boxShadow: '0 40px 60px -15px rgba(0,0,0,0.8), 0 20px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.12)' }}>
                                            {/* Başlık */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: 'linear-gradient(135deg, #34d399, #10b981)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 6px 16px rgba(52,211,153,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                                }}>
                                                    <BookOpen style={{ width: 20, height: 20, color: '#fff' }} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Kullanım Rehberi</h2>
                                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat'i en verimli şekilde kullanmanız için rehber.</p>
                                                </div>
                                            </div>

                                            {/* Accordion */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {[
                                                    {
                                                        id: 'baslangic', icon: '🚀', title: 'Hızlı Başlangıç', color: '#38bdf8',
                                                        items: [
                                                            { q: 'Hesap Oluşturma', a: 'Ana sayfadaki "Kayıt Ol" butonuna tıklayın. Kullanıcı adı, e-posta ve şifrenizi girin. E-posta doğrulaması sonrası hesabınız aktif olacaktır.' },
                                                            { q: 'İlk Odaya Giriş', a: 'Giriş yaptıktan sonra oda listesinden istediğiniz odaya tıklayın. Bazı odalar şifreli olabilir, şifreyi oda sahibinden öğrenebilirsiniz.' },
                                                            { q: 'Mikrofon & Kamera İzinleri', a: 'Tarayıcınız mikrofon ve kamera erişimi isteyecektir. "İzin Ver" butonuna tıklayarak sesli/görüntülü sohbete katılabilirsiniz.' },
                                                        ],
                                                    },
                                                    {
                                                        id: 'oda', icon: '🎙️', title: 'Oda Kullanım Rehberi', color: '#a78bfa',
                                                        items: [
                                                            { q: 'Sesli Sohbet', a: 'Odaya girdikten sonra mikrofon butonuna tıklayarak sesli konuşmaya başlayabilirsiniz. Push-to-talk veya sürekli açık mod seçenekleri mevcuttur.' },
                                                            { q: 'Kamera Yayını', a: 'Kamera destekli odalarda kamera ikonuna tıklayarak görüntülü yayın başlatabilirsiniz. HD kalitede eşzamanlı yayın yapılır.' },
                                                            { q: 'Metin Sohbeti', a: 'Alt kısımdaki mesaj kutusundan yazılı mesajlar gönderebilirsiniz. Emoji, bağlantı ve özel formatlar desteklenir.' },
                                                            { q: 'Özel Mesaj (Private Chat)', a: 'Bir kullanıcıya sağ tıklayıp "Özel Mesaj" seçeneğini kullanarak birebir yazışma başlatabilirsiniz.' },
                                                            { q: 'One2One Görüşme', a: 'Bir kullanıcıya sağ tıklayıp "One2One Davet" ile özel birebir sesli/görüntülü görüşme başlatabilirsiniz.' },
                                                        ],
                                                    },
                                                    {
                                                        id: 'roller', icon: '👑', title: 'Roller & Yetkiler', color: '#fbbf24',
                                                        items: [
                                                            { q: 'Rol Sıralaması', a: 'Misafir → Üye → VIP → Operatör → Moderatör → Admin → Süper Admin → Owner → GodMaster. Her üst rol, altındaki tüm yetkilere sahiptir.' },
                                                            { q: 'Misafir & Üye', a: 'Temel sohbet özellikleri: mesaj yazma, sesli dinleme, özel mesaj gönderme. Üyeler ayrıca nudge ve düello gönderebilir.' },
                                                            { q: 'VIP', a: 'Özel VIP rozeti, öncelikli mikrofon sırası ve genişletilmiş profil özellikleri.' },
                                                            { q: 'Operatör & Moderatör', a: 'Kullanıcıları susturma (mute/gag), odadan atma (kick), mikrofon yönetimi ve kısa süreli ban yetkileri.' },
                                                            { q: 'Admin & Süper Admin', a: 'Uzun süreli ban, rol atama/kaldırma, admin paneli erişimi, oda izleme ve gelişmiş yönetim araçları.' },
                                                            { q: 'Owner', a: 'Oda sahibi. Kalıcı ban, tüm rolleri atama, oda ayarlarını değiştirme ve tam yönetim yetkisi.' },
                                                        ],
                                                    },
                                                    {
                                                        id: 'yonetim', icon: '🏠', title: 'Oda Yönetimi', color: '#ef4444',
                                                        items: [
                                                            { q: 'Oda Satın Alma', a: 'Fiyatlar bölümünden size uygun paketi seçin veya Özel Yapılandırma ile ihtiyacınıza göre paket oluşturun. Ödeme sonrası odanız anında aktif olur.' },
                                                            { q: 'Şifre Koruması', a: 'Admin panelinden odanıza şifre koyabilirsiniz. Şifreli odalara sadece şifreyi bilen kullanıcılar girebilir.' },
                                                            { q: 'Toplantı Modu', a: 'Toplantı modunu aktif ederek odayı kapalı bir konferans ortamına dönüştürebilirsiniz. Sadece davet edilen kullanıcılar katılabilir.' },
                                                            { q: 'Ban & Gag Listesi', a: 'Admin panelinden yasaklı (ban) ve susturulmuş (gag) kullanıcı listelerini yönetebilir, yasakları kaldırabilirsiniz.' },
                                                            { q: 'Oda İzleme (Monitor)', a: 'Süper Admin ve üzeri roller, Oda İzleme özelliğiyle odadaki tüm aktiviteleri gerçek zamanlı takip edebilir.' },
                                                        ],
                                                    },
                                                    {
                                                        id: 'yapilandirma', icon: '⚙️', title: 'Özel Yapılandırma', color: '#38bdf8',
                                                        items: [
                                                            { q: 'Kendi Paketini Oluştur', a: 'Fiyatlar sayfasındaki Özel Yapılandırma bölümünden oda sayısı, kişi limiti, kamera ve toplantı modu seçeneklerini istediğiniz gibi ayarlayabilirsiniz.' },
                                                            { q: 'White Label / Domain', a: 'White Label pakette kendi domaininizi kullanarak SopranoChat altyapısını kendi markanızla sunabilirsiniz. HTML/PHP embed desteği mevcuttur.' },
                                                            { q: 'Farklı Domain Desteği', a: 'Birden fazla domain üzerinden aynı altyapıyı kullanabilirsiniz. Her domain için ayrı oda yapılandırması mümkündür.' },
                                                        ],
                                                    },
                                                    {
                                                        id: 'sss', icon: '❓', title: 'Sık Sorulan Sorular', color: '#f472b6',
                                                        items: [
                                                            { q: 'Sesim karşı tarafa gitmiyorsa ne yapmalıyım?', a: 'Tarayıcı ayarlarından mikrofon izninin verildiğinden emin olun. Farklı bir mikrofon seçmeyi deneyin. Sayfayı yenileyip tekrar giriş yapın.' },
                                                            { q: 'Nasıl oda satın alabilirim?', a: 'Üst menüden FİYATLAR sekmesine gidin, size uygun paketi seçin ve ödeme adımlarını takip edin. 7 gün ücretsiz deneme ile başlayabilirsiniz.' },
                                                            { q: 'Kamera açılmıyorsa ne yapmalıyım?', a: 'Tarayıcınızın kamera iznini kontrol edin. Başka bir uygulama kamerayı kullanıyor olabilir, kapatıp tekrar deneyin.' },
                                                            { q: 'Ban yedim, ne yapabilirim?', a: 'Ban süresine bağlı olarak otomatik kalkar. Kalıcı banlarda oda sahibi veya adminlerle iletişime geçin. İletişim bölümünden destek alabilirsiniz.' },
                                                            { q: 'Odamdaki rolleri nasıl yönetirim?', a: 'Admin panelinden kullanıcılara sağ tıklayarak rol atama/kaldırma işlemlerini yapabilirsiniz. Yalnızca kendi rolünüzden düşük rolleri atayabilirsiniz.' },
                                                        ],
                                                    },
                                                ].map((section) => (
                                                    <div key={section.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${guideOpen === section.id ? `${section.color}30` : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                                                        <button onClick={() => setGuideOpen(guideOpen === section.id ? null : section.id)} style={{
                                                            width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                                                            background: guideOpen === section.id ? `${section.color}10` : 'rgba(0,0,0,0.15)',
                                                            border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                                                        }}>
                                                            <span style={{ fontSize: 18 }}>{section.icon}</span>
                                                            <span style={{ fontSize: 13, fontWeight: 800, color: guideOpen === section.id ? section.color : '#fff', flex: 1, textAlign: 'left' }}>{section.title}</span>
                                                            <span style={{ color: '#64748b', fontSize: 16, transition: 'transform 0.3s', transform: guideOpen === section.id ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                                        </button>
                                                        <div style={{
                                                            maxHeight: guideOpen === section.id ? 1200 : 0,
                                                            overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            background: 'rgba(0,0,0,0.1)',
                                                        }}>
                                                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {section.items.map((item, ii) => (
                                                                    <div key={ii} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 6 }}>{item.q}</div>
                                                                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>{item.a}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* REFERANSLAR SECTION */}
                                {activeSection === 'referanslar' && (
                                    <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
                                        {/* Gallery Lamp */}
                                        <div className="gallery-lamp-svg" key={'lamp-section-' + sectionChangeKey} style={{ animation: lampAnimDone.current['referanslar'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards') }} onAnimationEnd={() => { lampAnimDone.current['referanslar'] = true; }}>
                                            <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="glBarMetalF" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                                    </linearGradient>
                                                    <linearGradient id="glMountPlateF" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                                    </linearGradient>
                                                    <linearGradient id="glArmMetalF" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                                    </linearGradient>
                                                    <linearGradient id="glLightSpreadF" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                    </linearGradient>
                                                    <linearGradient id="glLedStripF" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadF)" opacity="0.5" />
                                                <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateF)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalF)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalF)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalF)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripF)" />
                                                <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                                <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                            </svg>
                                            <div className="gallery-lamp-glow" key={'glow-section-' + sectionChangeKey} style={{ width: 450, animation: !isInitialLoad.current ? 'glowReveal 1.2s ease-out 0.9s both' : undefined }}></div>
                                        </div>
                                        <div className="glossy-panel" style={{ padding: '28px 32px', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', zIndex: 10 }}>
                                            {/* Başlık */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 6px 16px rgba(167,139,250,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                                }}>
                                                    <Users style={{ width: 20, height: 20, color: '#fff' }} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Referanslarımız</h2>
                                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat altyapısını kullanan müşterilerimiz.</p>
                                                </div>
                                            </div>

                                            {/* Açıklama */}
                                            <div style={{ textAlign: 'center', padding: '16px', marginBottom: 20, borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                                                <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>🌐 White Label & Domain Müşterilerimiz</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Kendi domainleriyle SopranoChat altyapısını kullanan kurumsal müşterilerimiz aşağıda listelenmiştir.</div>
                                            </div>

                                            {/* Referans Kartları */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                                {[
                                                    { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#38bdf8', icon: '🌐' },
                                                    { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#a78bfa', icon: '🌐' },
                                                    { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#fbbf24', icon: '🌐' },
                                                    { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#34d399', icon: '🌐' },
                                                ].map((ref, i) => (
                                                    <div key={i} style={{
                                                        padding: '18px 16px', borderRadius: 12,
                                                        background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
                                                        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.3s',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: 10,
                                                                background: `linear-gradient(135deg, ${ref.color}20, ${ref.color}08)`,
                                                                border: `1px solid ${ref.color}25`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 18,
                                                            }}>{ref.icon}</div>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{ref.name}</div>
                                                                <div style={{ fontSize: 10, color: ref.color, fontWeight: 600 }}>{ref.domain}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, lineHeight: 1.6 }}>{ref.desc}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Alt bilgi */}
                                            <div style={{ textAlign: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                                    Siz de <span style={{ color: '#34d399', fontWeight: 700 }}>SopranoChat altyapısı</span> ile kendi markanızı oluşturun. <span style={{ color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setActiveSection('iletisim'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>İletişime geçin →</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>



                            {/* SAĞ ALAN */}
                            <div key={'right-col'} style={{ width: roomsMode ? 240 : undefined, flex: roomsMode ? '0 0 240px' : '1 1 20%', minWidth: 220, maxWidth: roomsMode ? 260 : undefined, display: 'flex', flexDirection: 'column', gap: 24, order: 1, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', ...(roomsMode ? { marginLeft: -24 } : {}) }}>
                                {/* GİRİŞ PANELİ + TABLO LAMBASI */}
                                <div style={{ position: 'relative' }}>
                                    {/* ===== TABLO LAMBASI (SVG Gallery Lamp) — bağımsız, content-fade dışı ===== */}
                                    <div className="gallery-lamp-svg-right" style={{ animation: lampAnimDone.current['right'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.9s both' : 'none') }} onAnimationEnd={() => { lampAnimDone.current['right'] = true; }}>
                                        <svg width="300" height="52" viewBox="0 0 300 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <linearGradient id="glBarMetal" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="#4a4a4a" />
                                                    <stop offset="25%" stopColor="#2a2a2a" />
                                                    <stop offset="50%" stopColor="#1a1a1a" />
                                                    <stop offset="75%" stopColor="#2a2a2a" />
                                                    <stop offset="100%" stopColor="#3a3a3a" />
                                                </linearGradient>
                                                <linearGradient id="glMountPlate" x1="150" y1="0" x2="150" y2="14" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="#555" />
                                                    <stop offset="50%" stopColor="#2a2a2a" />
                                                    <stop offset="100%" stopColor="#1a1a1a" />
                                                </linearGradient>
                                                <linearGradient id="glArmMetal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#555" />
                                                    <stop offset="50%" stopColor="#333" />
                                                    <stop offset="100%" stopColor="#2a2a2a" />
                                                </linearGradient>
                                                <linearGradient id="glLightSpread" x1="150" y1="44" x2="150" y2="52" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" />
                                                    <stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                </linearGradient>
                                                <linearGradient id="glLedStrip" x1="50" y1="43" x2="250" y2="43" gradientUnits="userSpaceOnUse">
                                                    <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" />
                                                    <stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                    <stop offset="50%" stopColor="#fff0cc" stopOpacity="1" />
                                                    <stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                    <stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M58 44 L35 52 L265 52 L242 44 Z" fill="url(#glLightSpread)" opacity="0.5" />
                                            <rect x="135" y="0" width="30" height="10" rx="2" fill="url(#glMountPlate)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                            <rect x="138" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                            <line x1="142" y1="10" x2="115" y2="30" stroke="url(#glArmMetal)" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="142.5" y1="10.5" x2="115.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                            <line x1="158" y1="10" x2="185" y2="30" stroke="url(#glArmMetal)" strokeWidth="3" strokeLinecap="round" />
                                            <line x1="157.5" y1="10.5" x2="184.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                            <rect x="48" y="30" width="204" height="14" rx="7" fill="url(#glBarMetal)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                            <rect x="58" y="32" width="184" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                            <rect x="58" y="42" width="184" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                            <rect x="55" y="43.5" width="190" height="1.5" rx="0.75" fill="url(#glLedStrip)" />
                                            <circle cx="115" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                            <circle cx="115" cy="34" r="1" fill="#555" />
                                            <circle cx="185" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                            <circle cx="185" cy="34" r="1" fill="#555" />
                                        </svg>
                                        <div className="gallery-lamp-glow" style={{
                                            width: 280,
                                            opacity: lampsOff ? 0 : (lampAnimDone.current['rightGlow'] ? (user ? 1 : 0.3) : 0),
                                            animation: lampAnimDone.current['rightGlow'] ? 'none' : 'glowLightUp 1.8s cubic-bezier(0.4,0,0.2,1) 2.8s forwards',
                                            transition: 'opacity 1.5s ease, height 1s ease, background 1s ease',
                                            ...(user ? {
                                                height: 110,
                                                background: 'radial-gradient(ellipse at top center, rgba(255,210,120,0.32) 0%, rgba(255,180,80,0.14) 40%, transparent 70%)',
                                            } : {
                                                height: 60,
                                                background: 'radial-gradient(ellipse at top center, rgba(255,210,120,0.10) 0%, rgba(255,180,80,0.04) 40%, transparent 70%)',
                                            }),
                                        }} onAnimationEnd={() => { lampAnimDone.current['rightGlow'] = true; }}></div>
                                    </div>

                                    {/* ══ DEMO TOAST ══ */}
                                    {showDemoToast && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 140,
                                            right: '103%',
                                            zIndex: 100,
                                            animation: 'demoToastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                                        }}>
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(251,191,36,0.88), rgba(245,158,11,0.82))',
                                                backdropFilter: 'blur(12px)',
                                                borderRadius: 10,
                                                padding: '10px 14px',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                boxShadow: '0 4px 16px rgba(251,191,36,0.25), 0 1px 0 rgba(255,255,255,0.3) inset',
                                                whiteSpace: 'nowrap' as const,
                                            }}>
                                                <span style={{ fontSize: 16 }}>🔑</span>
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e' }}>Önce giriş yapın</div>
                                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(26,26,46,0.55)', marginTop: 1 }}>Misafir veya üye girişi gerekli</div>
                                                </div>
                                                <span style={{
                                                    fontSize: 13, color: 'rgba(26,26,46,0.5)', marginLeft: 2,
                                                    animation: 'arrowBounce 1s ease-in-out infinite',
                                                }}>›</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* ══ LOGIN TOAST — Odalar için giriş uyarısı ══ */}
                                    {showLoginToast && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 100,
                                            left: '103%',
                                            zIndex: 200,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0,
                                            animation: 'demoToastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                                        }}>
                                            {/* Sola bakan ok */}
                                            <div style={{ animation: 'loginArrowBounce 1s ease-in-out infinite', marginRight: -1 }}>
                                                <svg width="14" height="20" viewBox="0 0 14 20" style={{ filter: 'drop-shadow(-2px 0 4px rgba(251,191,36,0.4))' }}>
                                                    <path d="M0 10 L14 0 L14 20 Z" fill="rgba(245,168,11,0.9)" />
                                                </svg>
                                            </div>
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(251,191,36,0.92), rgba(245,158,11,0.88))',
                                                backdropFilter: 'blur(14px)',
                                                borderRadius: 10,
                                                padding: '10px 14px',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                boxShadow: '0 4px 16px rgba(251,191,36,0.3), 0 1px 0 rgba(255,255,255,0.3) inset',
                                                whiteSpace: 'nowrap' as const,
                                            }}>
                                                <span style={{ fontSize: 16 }}>👋</span>
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e' }}>Önce giriş yapmalısın!</div>
                                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'rgba(26,26,46,0.55)', marginTop: 1 }}>Misafir veya üye olarak giriş yap</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ position: 'relative', zIndex: 10, animation: isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.0s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both', transformOrigin: 'top center' }}>
                                        <div className="glossy-panel" style={{ padding: roomsMode ? '12px 14px' : '16px 20px', position: 'relative', zIndex: 10, transition: roomsMode ? 'none' : 'padding 1s ease, min-height 1s ease', display: 'flex', flexDirection: 'column', ...(roomsMode ? { minHeight: 780, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' } : { minHeight: 0 }), ...(!roomsMode && user ? { border: '1px solid rgba(56,189,248,0.4)', boxShadow: '0 50px 70px -20px rgba(0,0,0,0.8), 0 20px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 60px rgba(255,255,255,0.03), 0 0 15px rgba(56,189,248,0.15)' } : {}) }}>
                                            {/* Üst başlık */}
                                            <h3 style={{ fontSize: roomsMode ? 9 : 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: roomsMode ? 0 : 10, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)', transition: 'font-size 0.8s ease, margin-bottom 0.8s ease, max-height 0.8s ease, opacity 0.6s ease', overflow: 'hidden', maxHeight: roomsMode ? 0 : 30, opacity: roomsMode ? 0 : 1 }}>
                                                <User style={{ width: 18, height: 18, color: user ? '#fbbf24' : '#38bdf8' }} /> Hesap Paneli
                                            </h3>

                                            {!user ? (
                                                <>
                                                    {/* Sekmeler */}
                                                    <div style={{ display: 'flex', marginBottom: 12, borderRadius: 10, overflow: 'hidden', gap: 8 }}>
                                                        <button
                                                            onClick={() => setLoginTab('guest')}
                                                            style={{
                                                                flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                                                textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                                                borderRadius: 8,
                                                                background: loginTab === 'guest' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : 'rgba(0,0,0,0.25)',
                                                                color: loginTab === 'guest' ? '#7dd3fc' : 'rgba(255,255,255,0.35)',
                                                                transition: 'all 0.3s ease',
                                                                boxShadow: loginTab === 'guest' ? '0 0 16px rgba(56,189,248,0.3), 0 0 4px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                                            }}
                                                        >👤 Misafir</button>
                                                        <button
                                                            onClick={() => setLoginTab('member')}
                                                            style={{
                                                                flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                                                textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                                                borderRadius: 8,
                                                                background: loginTab === 'member' ? 'linear-gradient(180deg, rgba(239,68,68,0.3), rgba(185,28,28,0.4))' : 'rgba(0,0,0,0.25)',
                                                                color: loginTab === 'member' ? '#fca5a5' : 'rgba(255,255,255,0.35)',
                                                                transition: 'all 0.3s ease',
                                                                boxShadow: loginTab === 'member' ? '0 0 16px rgba(239,68,68,0.3), 0 0 4px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                                            }}
                                                        >⭐ Üye Giriş</button>
                                                    </div>

                                                    {loginTab === 'guest' ? (
                                                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            <div>
                                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Takma Adınız</label>
                                                                <input
                                                                    type="text"
                                                                    value={guestNick}
                                                                    onChange={(e) => setGuestNick(e.target.value)}
                                                                    className="input-inset"
                                                                    style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }}
                                                                    placeholder="Nickname girin..."
                                                                    autoComplete="off"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    {(['Erkek', 'Kadın', 'Belirsiz'] as const).map(g => (
                                                                        <button key={g} type="button" onClick={() => setGuestGender(g)} style={{
                                                                            flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
                                                                            background: guestGender === g ? (g === 'Erkek' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : g === 'Kadın' ? 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))' : 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(71,85,105,0.4))') : 'rgba(0,0,0,0.2)',
                                                                            color: guestGender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                            boxShadow: guestGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                                                        }}>{g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Cinsiyet seçimine göre avatarlar otomatik açılır */}
                                                            <div style={{
                                                                maxHeight: guestGender ? 200 : 0,
                                                                opacity: guestGender ? 1 : 0,
                                                                overflow: 'hidden',
                                                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                marginTop: guestGender ? 4 : 0,
                                                            }}>
                                                                <div key={guestGender} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, animation: 'avatarFadeIn 0.4s ease-out' }}>
                                                                    {(guestGender === 'Erkek' ? ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'] :
                                                                        guestGender === 'Kadın' ? ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'] :
                                                                            ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png']
                                                                    ).map((av) => (
                                                                        <button key={av} type="button" onClick={() => setSelectedAvatar(av)} style={{
                                                                            padding: 3, border: 'none', borderRadius: '50%', cursor: 'pointer',
                                                                            background: 'transparent', transition: 'all 0.25s ease',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            transform: selectedAvatar === av ? 'scale(1.15)' : 'scale(1)',
                                                                            opacity: selectedAvatar && selectedAvatar !== av ? 0.5 : 1,
                                                                        }}>
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img src={av} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {guestError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{guestError}</p>}
                                                            <button type="submit" className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={guestLoading}>
                                                                <LogIn style={{ width: 14, height: 14 }} /> {guestLoading ? 'Giriş yapılıyor...' : 'Misafir Giriş'}
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                                                            {/* Login / Register geçiş container */}
                                                            <div style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: showRegister ? 'translateX(-100%)' : 'translateX(0)', opacity: showRegister ? 0 : 1, maxHeight: showRegister ? 0 : 600, overflow: 'hidden' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Kullanıcı Adı veya E-posta</label>
                                                                        <input type="text" value={memberUsername} onChange={(e) => setMemberUsername(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="Üye adınız veya e-posta" autoComplete="off" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Şifre</label>
                                                                        <input type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="••••••••" autoComplete="new-password" />
                                                                    </div>
                                                                    {/* Üye giriş: Avatar Seçimi — toggle ile açılır/kapanır */}
                                                                    <button type="button" onClick={() => setShowMemberAvatars(!showMemberAvatars)} style={{
                                                                        width: '100%', padding: '8px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                                                                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, cursor: 'pointer',
                                                                        background: showMemberAvatars ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                                        color: showMemberAvatars ? '#c4b5fd' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                    }}>
                                                                        {showMemberAvatars ? '▲ Kapat' : '🎭 Avatar Seç'}
                                                                    </button>
                                                                    <div style={{
                                                                        maxHeight: showMemberAvatars ? 200 : 0, opacity: showMemberAvatars ? 1 : 0, overflow: 'hidden',
                                                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', marginTop: showMemberAvatars ? 6 : 0,
                                                                    }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, animation: 'avatarFadeIn 0.4s ease-out' }}>
                                                                            {[
                                                                                '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
                                                                                '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
                                                                                '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
                                                                            ].map((av) => (
                                                                                <button key={av} type="button" onClick={() => { setSelectedAvatar(av); setShowMemberAvatars(false); }} style={{
                                                                                    padding: 2, border: 'none', borderRadius: '50%', cursor: 'pointer',
                                                                                    background: 'transparent', transition: 'all 0.25s ease',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    transform: selectedAvatar === av ? 'scale(1.15)' : 'scale(1)',
                                                                                    opacity: selectedAvatar && selectedAvatar !== av ? 0.5 : 1,
                                                                                }}>
                                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                    <img src={av} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    {memberError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{memberError}</p>}
                                                                    <button onClick={handleMemberLogin} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={memberLoading}>
                                                                        <LogIn style={{ width: 14, height: 14 }} /> {memberLoading ? 'Giriş yapılıyor...' : 'Üye Girişi'}
                                                                    </button>
                                                                    <button type="button" onClick={() => setShowRegister(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '4px 0', transition: 'color 0.2s' }}>
                                                                        Hesabın yok mu? <span style={{ color: '#fca5a5', fontWeight: 700 }}>Üye Ol</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Register Form */}
                                                            <div style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: showRegister ? 'translateX(0)' : 'translateX(100%)', opacity: showRegister ? 1 : 0, maxHeight: showRegister ? 800 : 0, overflow: 'hidden', position: showRegister ? 'relative' : 'absolute', top: 0, left: 0, right: 0 }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                    <h4 style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 4 }}>✨ Yeni Üyelik</h4>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Kullanıcı Adı</label>
                                                                        <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Kullanıcı adınız" autoComplete="off" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>E-posta</label>
                                                                        <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="ornek@mail.com" autoComplete="off" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre</label>
                                                                        <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="En az 6 karakter" autoComplete="new-password" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre Tekrar</label>
                                                                        <input type="password" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Şifrenizi tekrarlayın" autoComplete="new-password" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            {(['Erkek', 'Kadın', 'Belirsiz'] as const).map(g => (
                                                                                <button key={g} type="button" onClick={() => setRegGender(g)} style={{
                                                                                    flex: 1, padding: '7px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
                                                                                    background: regGender === g ? (g === 'Erkek' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : g === 'Kadın' ? 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))' : 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(71,85,105,0.4))') : 'rgba(0,0,0,0.2)',
                                                                                    color: regGender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                                    boxShadow: regGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                                                                }}>{g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}</button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                                                                        <input type="checkbox" checked={regAcceptTerms} onChange={(e) => setRegAcceptTerms(e.target.checked)} style={{ accentColor: '#ef4444', width: 16, height: 16, cursor: 'pointer' }} />
                                                                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}><span onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} style={{ color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer' }}>Üyelik Sözleşmesini</span> okudum ve kabul ediyorum</span>
                                                                    </label>
                                                                    {regError && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{regError}</p>}
                                                                    <button onClick={handleRegister} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={regLoading}>
                                                                        <Sparkles style={{ width: 14, height: 14 }} /> {regLoading ? 'Kayıt yapılıyor...' : 'Üye Ol'}
                                                                    </button>
                                                                    <button type="button" onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '2px 0', transition: 'color 0.2s' }}>
                                                                        ← Giriş ekranına dön
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ padding: '4px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    {/* Profil Header */}
                                                    <div style={{
                                                        textAlign: roomsMode ? 'left' : 'center',
                                                        marginBottom: roomsMode ? 0 : 10,
                                                        display: roomsMode ? 'none' : 'flex',
                                                        flexDirection: roomsMode ? 'row' : 'column',
                                                        alignItems: 'center',
                                                        gap: roomsMode ? 12 : 0,
                                                        transition: 'margin-bottom 0.8s ease, flex-direction 0.8s ease, gap 0.8s ease, text-align 0.8s ease',
                                                    }}>
                                                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: roomsMode ? 0 : 6, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}>
                                                            <div style={{
                                                                width: roomsMode ? 48 : 80,
                                                                height: roomsMode ? 48 : 80,
                                                                borderRadius: '50%',
                                                                border: roomsMode ? '2px solid rgba(56,189,248,0.3)' : '3px solid rgba(56,189,248,0.4)',
                                                                boxShadow: roomsMode ? '0 0 12px rgba(56,189,248,0.15)' : '0 0 20px rgba(56,189,248,0.2), 0 10px 25px rgba(0,0,0,0.5)',
                                                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: roomsMode ? 18 : 28, fontWeight: 900, color: 'rgba(56,189,248,0.7)',
                                                                textTransform: 'uppercase' as const,
                                                            }}><img src={user.avatar || generateGenderAvatar(user.displayName || user.username || '?')} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /></div>
                                                        </div>
                                                        <div style={{ transition: 'all 0.5s ease' }}>
                                                            <h4 style={{
                                                                fontSize: roomsMode ? 15 : 18,
                                                                fontWeight: 900,
                                                                color: '#fff',
                                                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                                                transition: 'all 0.5s ease',
                                                                margin: 0,
                                                                whiteSpace: 'nowrap' as const,
                                                            }}>{user.displayName || user.username}</h4>
                                                            <p style={{
                                                                fontSize: roomsMode ? 9 : 11,
                                                                fontWeight: 700,
                                                                color: user.isMember ? '#fbbf24' : '#38bdf8',
                                                                marginTop: roomsMode ? 1 : 4,
                                                                marginBottom: 0,
                                                                marginLeft: 0,
                                                                marginRight: 0,
                                                                textTransform: 'uppercase' as const,
                                                                letterSpacing: 2,
                                                                transition: 'all 0.5s ease',
                                                                overflow: 'hidden',
                                                                maxHeight: roomsMode ? 0 : 30,
                                                                opacity: roomsMode ? 0 : 1,
                                                            }}>{user.isMember ? (user.role === 'owner' ? '👑 Owner' : user.role === 'admin' ? '🛡️ Admin' : '✦ Üye') : '👤 Misafir'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Tab Navigation — üyeler için */}
                                                    {user.isMember && !roomsMode && (
                                                        <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: '3px', background: 'rgba(0,0,0,0.25)', borderRadius: 10, transition: 'all 0.4s ease' }}>
                                                            {([['profil', '👤'], ['ayarlar', '⚙️'], ['mesajlar', '💬']] as const).map(([tab, icon]) => (
                                                                <button key={tab} onClick={() => setProfileTab(tab as any)} style={{
                                                                    flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer',
                                                                    textTransform: 'uppercase', letterSpacing: 1, transition: 'all 0.25s ease',
                                                                    background: profileTab === tab ? 'rgba(56,189,248,0.2)' : 'transparent',
                                                                    color: profileTab === tab ? '#7dd3fc' : 'rgba(255,255,255,0.4)',
                                                                }}>{icon} {tab === 'profil' ? 'Profil' : tab === 'ayarlar' ? 'Ayarlar' : 'Mesajlar'}</button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Profil Tab */}
                                                    {profileTab === 'profil' && !roomsMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {/* Avatar Değiştir */}
                                                            {user.isMember && (
                                                                <div>
                                                                    <button type="button" onClick={() => setShowAvatarPicker(!showAvatarPicker)} style={{
                                                                        width: '100%', padding: '7px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                                                                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, cursor: 'pointer',
                                                                        background: showAvatarPicker ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.2)',
                                                                        color: showAvatarPicker ? '#c4b5fd' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                    }}>
                                                                        🎨 {showAvatarPicker ? 'Kapat' : 'Avatar Değiştir'}
                                                                    </button>
                                                                    <div style={{ display: showAvatarPicker ? 'block' : 'none', marginTop: 8 }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                                                            {(user.gender === 'Erkek' ? ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'] :
                                                                                user.gender === 'Kadın' || user.gender === 'Kadin' ? ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'] :
                                                                                    user.gender === 'Belirsiz' ? ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png'] :
                                                                                        ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
                                                                                            '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
                                                                                            '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png']
                                                                            ).map((av) => (
                                                                                <button key={av} type="button" onClick={() => { handleProfileUpdate('avatar', av); setShowAvatarPicker(false); }} style={{
                                                                                    padding: 2, border: 'none', borderRadius: '50%', cursor: 'pointer',
                                                                                    background: 'transparent', transition: 'all 0.25s ease',
                                                                                    transform: user.avatar === av ? 'scale(1.15)' : 'scale(1)',
                                                                                    opacity: user.avatar !== av ? 0.6 : 1,
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                }}>
                                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                    <img src={av} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <button onClick={() => {
                                                                if (roomsMode) return;
                                                                setBlurToOdalar('out');
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                setTimeout(() => {
                                                                    setActiveSection('odalar');
                                                                    setRoomsMode(true);
                                                                    setBlurToOdalar('silhouette');
                                                                }, 400);
                                                                setTimeout(() => {
                                                                    setBlurToOdalar(false);
                                                                }, 900);
                                                            }} className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }}>
                                                                Odaya Gir
                                                            </button>
                                                            <button onClick={handleLogout} className="btn-3d btn-3d-logout" style={{ width: '100%', padding: '10px 0', fontSize: 11 }}>
                                                                Çıkış Yap
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* roomsMode — Çevrimiçi Kullanıcılar sütunu */}
                                                    {roomsMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 0, animation: 'contentFadeIn 0.4s ease both', overflow: 'hidden' }}>
                                                            {/* Başlık — scroll'dan bağımsız */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)', animation: 'pulse 2s ease-in-out infinite' }} />
                                                                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Çevrimiçi</span>
                                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginLeft: 'auto' }}>
                                                                    {(demoRoomRef.current?.users || []).length || dbRooms.reduce((sum: number, r: any) => sum + (r.users || 0), 0)} kişi
                                                                </span>
                                                            </div>
                                                            {/* Kullanıcı listesi — scroll yapan bölüm */}
                                                            <div className="custom-scrollbar" onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); demoRoomRef.current?.handleEmptyAreaContextMenu?.(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto', maxHeight: 530, scrollbarWidth: 'none' as any, paddingTop: 4 }}>
                                                                {/* Gerçek kullanıcı listesi */}
                                                                {(() => {
                                                                    const roomUsers: any[] = demoRoomRef.current?.users || [];
                                                                    const getRoleLevel = (role?: string) => {
                                                                        switch (role?.toLowerCase()) {
                                                                            case 'godmaster': return 10;
                                                                            case 'owner': return 9;
                                                                            case 'superadmin': return 8;
                                                                            case 'admin': return 7;
                                                                            case 'moderator': return 6;
                                                                            case 'operator': return 5;
                                                                            case 'vip': return 4;
                                                                            case 'member': return 3;
                                                                            default: return 1;
                                                                        }
                                                                    };
                                                                    const getRoleIcon = (role?: string) => {
                                                                        switch (role?.toLowerCase()) {
                                                                            case 'godmaster': return '🔱';
                                                                            case 'owner': return '👑';
                                                                            case 'superadmin': return '⚡';
                                                                            case 'admin': return '🛡️';
                                                                            case 'moderator': return '🔧';
                                                                            case 'operator': return '🎯';
                                                                            case 'vip': return '💎';
                                                                            default: return null;
                                                                        }
                                                                    };
                                                                    const getRoleColor = (role?: string) => {
                                                                        switch (role?.toLowerCase()) {
                                                                            case 'godmaster': return '#d946ef';
                                                                            case 'owner': return '#fbbf24';
                                                                            case 'superadmin': return '#7b9fef';
                                                                            case 'admin': return '#60a5fa';
                                                                            case 'moderator': return '#34d399';
                                                                            case 'operator': return '#22d3ee';
                                                                            case 'vip': return '#fde047';
                                                                            case 'member': return '#94a3b8';
                                                                            default: return '#64748b';
                                                                        }
                                                                    };
                                                                    const getRoleLabel = (role?: string) => {
                                                                        switch (role?.toLowerCase()) {
                                                                            case 'godmaster': return 'GodMaster';
                                                                            case 'owner': return 'Site Sahibi';
                                                                            case 'superadmin': return 'Süper Admin';
                                                                            case 'admin': return 'Yönetici';
                                                                            case 'moderator': return 'Moderatör';
                                                                            case 'operator': return 'Operatör';
                                                                            case 'vip': return 'VIP';
                                                                            case 'member': return 'Üye';
                                                                            default: return 'Misafir';
                                                                        }
                                                                    };
                                                                    const speaker = demoRoomRef.current?.currentSpeaker;
                                                                    const sorted = [...roomUsers].sort((a, b) => {
                                                                        const isSpeakerA = speaker?.userId === a.userId;
                                                                        const isSpeakerB = speaker?.userId === b.userId;
                                                                        if (isSpeakerA && !isSpeakerB) return -1;
                                                                        if (!isSpeakerA && isSpeakerB) return 1;
                                                                        const la = getRoleLevel(a.role);
                                                                        const lb = getRoleLevel(b.role);
                                                                        if (la !== lb) return lb - la;
                                                                        return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
                                                                    });
                                                                    // Demo bot kullanıcılar
                                                                    const botNames = ['Yılmaz', 'Ayşe', 'Kemal', 'Fatma', 'Ahmet', 'Elif', 'Mehmet', 'Zeynep', 'Ali', 'Derya', 'Hüseyin', 'Gizem', 'İbrahim', 'Seda', 'Mustafa', 'Ebru', 'Ömer', 'Hülya', 'Emre', 'Büşra', 'Cem', 'Merve', 'Tolga', 'Cansu', 'Volkan', 'Aslı', 'Serkan', 'İrem', 'Kaan', 'Esra', 'Oğuz', 'Dilara', 'Deniz', 'Sibel', 'Burak', 'Pınar', 'Alp', 'Berfin', 'Utku', 'Naz', 'Barış', 'Ceyda', 'Onur', 'Gamze', 'Uğur', 'Tuğba', 'Arda', 'Simge', 'Selim', 'Damla'];
                                                                    const botRoles = ['member', 'member', 'member', 'guest', 'guest', 'guest', 'guest', 'vip', 'member', 'guest', 'member', 'guest', 'guest', 'member', 'guest', 'vip', 'guest', 'member', 'guest', 'guest', 'guest', 'member', 'guest', 'guest', 'guest', 'member', 'guest', 'guest', 'member', 'guest', 'guest', 'guest', 'member', 'guest', 'guest', 'guest', 'vip', 'member', 'guest', 'guest', 'guest', 'member', 'guest', 'guest', 'guest', 'member', 'guest', 'guest', 'guest', 'member'];
                                                                    const demoBots = botNames.map((n, i) => ({ userId: `bot-${i}`, displayName: n, username: n.toLowerCase(), role: botRoles[i], avatar: '' }));
                                                                    sorted.push(...demoBots);
                                                                    if (sorted.length === 0) {
                                                                        // Mevcut kullanıcıyı göster
                                                                        return (
                                                                            <div
                                                                                onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); demoRoomRef.current?.handleUserContextMenu?.(e, { userId: user.odaKullanicisi || user.odaWsId || user.odaId || '', displayName: user.displayName || user.username, role: user.role, avatar: user.avatar }); }}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                                    padding: '4px 6px', borderRadius: 10,
                                                                                    background: 'transparent',
                                                                                    cursor: 'pointer',
                                                                                }}>
                                                                                <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(56,189,248,0.3)' }}>
                                                                                    <img src={user.avatar || generateGenderAvatar(user.displayName || user.username || '?')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                </div>
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName || user.username}</div>
                                                                                    <div style={{ fontSize: 9, fontWeight: 600, color: '#34d399' }}>● Çevrimiçi</div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return sorted.map((u: any, idx: number) => {
                                                                        const name = u.displayName || u.username || 'Kullanıcı';
                                                                        const role = u.role?.toLowerCase() || 'guest';
                                                                        const roleIcon = getRoleIcon(role);
                                                                        const roleColor = getRoleColor(role);
                                                                        const roleLabel = getRoleLabel(role);
                                                                        const isSpeaking = speaker?.userId === u.userId;
                                                                        const isCurrentUser = u.userId === user.userId;
                                                                        const avatarSrc = u.avatar || generateGenderAvatar(name);
                                                                        const borderColor = role === 'godmaster' ? 'rgba(217,70,239,0.5)'
                                                                            : role === 'owner' ? 'rgba(251,191,36,0.5)'
                                                                                : isSpeaking ? 'rgba(239,68,68,0.5)'
                                                                                    : isCurrentUser ? 'rgba(56,189,248,0.3)'
                                                                                        : 'rgba(255,255,255,0.1)';
                                                                        return (
                                                                            <div key={u.odaUserId || u.odaRollId || u.odaSoketId || u.odaJoinedAt || u.userId || idx}
                                                                                onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); demoRoomRef.current?.handleUserContextMenu?.(e, u); }}
                                                                                style={{
                                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                                    padding: '4px 6px', borderRadius: 10,
                                                                                    background: isSpeaking ? 'rgba(239,68,68,0.06)' : 'transparent',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s ease',
                                                                                }}>
                                                                                {/* Avatar */}
                                                                                <div style={{
                                                                                    width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                                                                                    border: `2px solid ${borderColor}`,
                                                                                    boxShadow: isSpeaking ? '0 0 10px rgba(239,68,68,0.3)' : 'none',
                                                                                }}>
                                                                                    <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                </div>
                                                                                {/* İsim + Rol */}
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                                                                        {roleIcon && <span style={{ fontSize: 10 }}>{roleIcon}</span>}
                                                                                        {isSpeaking && <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 700, animation: 'pulse 2s ease-in-out infinite' }}>🎤</span>}
                                                                                    </div>
                                                                                    <div style={{ fontSize: 9, fontWeight: 600, color: roleColor }}>{roleLabel}</div>
                                                                                </div>
                                                                                {/* Online dot */}
                                                                                <div style={{
                                                                                    width: 6, height: 6, borderRadius: '50%',
                                                                                    background: isSpeaking ? '#ef4444' : '#34d399',
                                                                                    boxShadow: `0 0 4px ${isSpeaking ? 'rgba(239,68,68,0.5)' : 'rgba(52,211,153,0.4)'}`,
                                                                                    flexShrink: 0,
                                                                                }} />
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Alt kısım: Durum + Radyo + Mikrofon — glossy-panel'in doğrudan çocuğu */}
                                                    {roomsMode && (
                                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {/* Durum Çubuğu - Premium */}
                                                            <div style={{ position: 'relative' }}>
                                                                <button onClick={() => setStatusDropdown(p => !p)} style={{
                                                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                                                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    backdropFilter: 'blur(12px)',
                                                                    transition: 'all 0.3s ease',
                                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)',
                                                                }}>
                                                                    <div style={{
                                                                        width: 10, height: 10, borderRadius: '50%',
                                                                        background: `radial-gradient(circle at 35% 35%, ${{ online: '#6ee7b7', busy: '#fca5a5', brb: '#fde68a', away: '#cbd5e1', phone: '#c4b5fd' }[userStatus]}, ${{ online: '#059669', busy: '#dc2626', brb: '#d97706', away: '#64748b', phone: '#7c3aed' }[userStatus]})`,
                                                                        boxShadow: `0 0 8px ${{ online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa' }[userStatus]}80, 0 0 16px ${{ online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa' }[userStatus]}40`,
                                                                        animation: userStatus === 'online' ? 'pulse 2s ease-in-out infinite' : 'none',
                                                                    }} />
                                                                    <span style={{ fontSize: 10, fontWeight: 700, color: { online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa' }[userStatus], letterSpacing: 0.5 }}>
                                                                        {{ online: 'Çevrimiçi', busy: 'Meşgul', brb: 'Dönecek', away: 'Dışarıda', phone: 'Telefonda' }[userStatus]}
                                                                    </span>
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transform: statusDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}><polyline points="6 9 12 15 18 9" /></svg>
                                                                </button>
                                                                {statusDropdown && (
                                                                    <div style={{
                                                                        position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, zIndex: 20,
                                                                        background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
                                                                        backdropFilter: 'blur(20px)',
                                                                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                                                                        padding: 6, animation: 'contentFadeIn 0.2s ease both',
                                                                        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                                    }}>
                                                                        {[
                                                                            { key: 'online' as const, label: 'Çevrimiçi', color: '#34d399', icon: '●' },
                                                                            { key: 'busy' as const, label: 'Meşgul', color: '#f87171', icon: '⛔' },
                                                                            { key: 'brb' as const, label: 'Dönecek', color: '#fbbf24', icon: '⏳' },
                                                                            { key: 'away' as const, label: 'Dışarıda', color: '#94a3b8', icon: '🌙' },
                                                                            { key: 'phone' as const, label: 'Telefonda', color: '#a78bfa', icon: '📞' },
                                                                        ].map(s => (
                                                                            <button key={s.key} onClick={() => { setUserStatus(s.key); setStatusDropdown(false); demoRoomRef.current?.socket?.emit('user:setStatus', { status: s.key }); }}
                                                                                style={{
                                                                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                                                                    padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                                                                    background: userStatus === s.key ? `${s.color}18` : 'transparent',
                                                                                    color: userStatus === s.key ? s.color : '#94a3b8',
                                                                                    fontSize: 10, fontWeight: 600, transition: 'all 0.2s ease',
                                                                                }}
                                                                                onMouseEnter={e => { e.currentTarget.style.background = `${s.color}15`; }}
                                                                                onMouseLeave={e => { if (userStatus !== s.key) e.currentTarget.style.background = 'transparent'; }}
                                                                            >
                                                                                <span>{s.icon}</span> {s.label}
                                                                                {userStatus === s.key && <Check style={{ width: 10, height: 10, marginLeft: 'auto' }} />}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Radyo Çalar - Gerçek RadioPlayer bileşeni */}
                                                            <RadioPlayer />

                                                            {/* Mikrofon - Gerçek Room Actions */}
                                                            {(() => {
                                                                const rd = demoRoomRef.current;
                                                                const isMicOn = rd?.state?.isMicOn || false;
                                                                const currentSpeaker = rd?.currentSpeaker || rd?.state?.currentSpeaker;
                                                                const queue: string[] = rd?.state?.queue || [];
                                                                const myUserId = rd?.state?.currentUser?.userId || user?.userId || '';
                                                                const isSomeoneElseSpeaker = currentSpeaker && currentSpeaker.userId !== myUserId;
                                                                const isInQueue = queue.includes(myUserId);
                                                                const micTimeLeft = rd?.state?.micTimeLeft || 0;
                                                                const formatTime = (seconds: number) => {
                                                                    const m = Math.floor(seconds / 60);
                                                                    const s = seconds % 60;
                                                                    return `${m}:${s.toString().padStart(2, '0')}`;
                                                                };
                                                                return (
                                                                    <button onClick={() => {
                                                                        if (!rd?.actions) return;
                                                                        if (isMicOn) {
                                                                            rd.actions.releaseMic();
                                                                        } else if (isSomeoneElseSpeaker) {
                                                                            if (isInQueue) {
                                                                                rd.actions.leaveQueue();
                                                                            } else {
                                                                                rd.actions.joinQueue();
                                                                            }
                                                                        } else {
                                                                            rd.actions.takeMic();
                                                                        }
                                                                    }} className="mic-button" style={{
                                                                        width: '100%', height: 64, padding: '0 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                                                                        background: isMicOn
                                                                            ? 'linear-gradient(180deg, #5a3a3a 0%, #3d2020 15%, #2e1515 50%, #3a2222 75%, #4a2d2d 100%)'
                                                                            : isInQueue
                                                                                ? 'linear-gradient(180deg, #5a5030 0%, #3d3820 15%, #2e2a15 50%, #3a3522 75%, #4a432d 100%)'
                                                                                : 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                                                        transition: 'all 0.3s ease',
                                                                        boxShadow: isMicOn
                                                                            ? '0 4px 16px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)'
                                                                            : isInQueue
                                                                                ? '0 4px 16px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)'
                                                                                : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)',
                                                                        borderTop: '1px solid rgba(120,130,150,0.35)',
                                                                        borderBottom: '1px solid rgba(0,0,0,0.3)',
                                                                        position: 'relative', overflow: 'hidden',
                                                                    }}>
                                                                        <Mic style={{
                                                                            width: 15, height: 15,
                                                                            color: isMicOn ? '#fca5a5' : isInQueue ? '#fde68a' : '#94a3b8',
                                                                        }} />
                                                                        <span style={{
                                                                            fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
                                                                            color: isMicOn ? '#fca5a5' : isInQueue ? '#fde68a' : '#cbd5e1',
                                                                        }}>
                                                                            {isSomeoneElseSpeaker
                                                                                ? (isInQueue ? 'SIRADAN ÇIK' : 'SIRAYA GİR')
                                                                                : (isMicOn ? 'MİKROFONU BIRAK' : 'MİKROFONU AL')}
                                                                        </span>
                                                                        <div style={{
                                                                            width: 8, height: 8, borderRadius: '50%',
                                                                            background: isMicOn ? '#ef4444' : isSomeoneElseSpeaker ? '#fbbf24' : '#34d399',
                                                                            boxShadow: `0 0 8px ${isMicOn ? 'rgba(239,68,68,0.5)' : isSomeoneElseSpeaker ? 'rgba(251,191,36,0.5)' : 'rgba(52,211,153,0.5)'}`,
                                                                            animation: 'pulse 2s ease-in-out infinite', flexShrink: 0,
                                                                        }} />
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* Ayarlar Tab */}
                                                    {profileTab === 'ayarlar' && user.isMember && !roomsMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5 }}>Kullanıcı Adı</label>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-inset" style={{ flex: 1, padding: '8px 12px', fontSize: 12, boxSizing: 'border-box' }} placeholder={user.username} />
                                                                    <button onClick={() => editName.trim() && handleProfileUpdate('displayName', editName.trim())} className="btn-3d" style={{ padding: '8px 14px', fontSize: 9, fontWeight: 700, background: 'rgba(56,189,248,0.2)', color: '#7dd3fc', border: 'none', borderRadius: 8, cursor: 'pointer' }} disabled={profileSaving}>✓</button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5 }}>E-posta</label>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-inset" style={{ flex: 1, padding: '8px 12px', fontSize: 12, boxSizing: 'border-box' }} placeholder="yeni@mail.com" />
                                                                    <button onClick={() => editEmail.trim() && handleProfileUpdate('email', editEmail.trim())} className="btn-3d" style={{ padding: '8px 14px', fontSize: 9, fontWeight: 700, background: 'rgba(56,189,248,0.2)', color: '#7dd3fc', border: 'none', borderRadius: 8, cursor: 'pointer' }} disabled={profileSaving}>✓</button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5 }}>Yeni Şifre</label>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="input-inset" style={{ flex: 1, padding: '8px 12px', fontSize: 12, boxSizing: 'border-box' }} placeholder="••••••••" />
                                                                    <button onClick={() => editPassword.trim() && handleProfileUpdate('password', editPassword.trim())} className="btn-3d" style={{ padding: '8px 14px', fontSize: 9, fontWeight: 700, background: 'rgba(56,189,248,0.2)', color: '#7dd3fc', border: 'none', borderRadius: 8, cursor: 'pointer' }} disabled={profileSaving}>✓</button>
                                                                </div>
                                                            </div>
                                                            {profileMsg && <p style={{ fontSize: 11, fontWeight: 600, color: profileMsg.includes('✅') ? '#34d399' : '#ef4444', textAlign: 'center' }}>{profileMsg}</p>}
                                                        </div>
                                                    )}

                                                    {/* Mesajlar Tab */}
                                                    {profileTab === 'mesajlar' && user.isMember && !roomsMode && (
                                                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                                            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                                                            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Henüz mesajınız yok</p>
                                                            <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Odada birileri size mesaj gönderdiğinde burada görünecek.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div> {/* content-fade-3 kapanışı */}

                                {/* ODA SATIN AL */}
                                <div className="glossy-panel" style={{ padding: '24px 32px', position: 'relative', overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 191, 36, 0.4)', animation: isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.2s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both', transformOrigin: 'top center', ...(roomsMode ? { display: 'none' } : {}) }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: 192, height: 192, background: 'rgba(251, 191, 36, 0.2)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

                                    <div style={{ position: 'relative', zIndex: 10 }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                            <Star style={{ width: 16, height: 16 }} fill="currentColor" /> Premium Paket
                                        </h3>
                                        <h4 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Kendi Odanı Kur</h4>
                                        <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, marginBottom: 32, lineHeight: 1.7, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                            Yönetici yetkileri, HD yayın kalitesi ve şifreli koruma ile kendi topluluğunu oluştur.
                                        </p>
                                        <button onClick={() => { if (activeSection === 'home' || activeSection === 'odalar') { setShowPackages(true); } else { setActiveSection('fiyatlar'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 11 }}>
                                            Paketleri İncele
                                        </button>
                                    </div>
                                </div>

                                {/* CANLI DESTEK */}
                                <div className="glossy-panel" style={{ padding: '24px 32px', textAlign: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(52, 211, 153, 0.2)', animation: isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.4s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both', transformOrigin: 'top center', ...(roomsMode ? { display: 'none' } : {}) }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(180deg, #34d399, #059669)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 10px 20px rgba(16,185,129,0.3)' }}>
                                        <Headset style={{ width: 28, height: 28, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                    </div>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Müşteri Hizmetleri</h4>
                                    <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 20, fontWeight: 500 }}>Sorularınız ve önerileriniz için bize ulaşın.</p>
                                    <button onClick={() => setSupportOpen(!supportOpen)} className="btn-3d btn-3d-green" style={{ width: '100%', padding: '12px 0', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Headset style={{ width: 15, height: 15 }} /> {supportOpen ? 'Kapat' : 'Bize Ulaşın'}
                                    </button>

                                    {/* Expandable Content */}
                                    <div style={{
                                        maxHeight: supportOpen ? 600 : 0,
                                        opacity: supportOpen ? 1 : 0,
                                        overflow: 'hidden',
                                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                        marginTop: supportOpen ? 16 : 0,
                                    }}>
                                        {/* Quick Contact */}
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" style={{
                                                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                                                background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                                            }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <MessageCircle style={{ width: 12, height: 12, color: '#fff' }} />
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#25d366' }}>WhatsApp</div>
                                                    <div style={{ fontSize: 8, color: '#94a3b8' }}>+90 552 036 3674</div>
                                                </div>
                                            </a>
                                            <a href="mailto:destek@sopranochat.com" style={{
                                                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                                            }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Mail style={{ width: 12, height: 12, color: '#fff' }} />
                                                </div>
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8' }}>E-Posta</div>
                                                    <div style={{ fontSize: 8, color: '#94a3b8' }}>destek@sopranochat.com</div>
                                                </div>
                                            </a>
                                        </div>
                                        {/* Divider */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                            <span style={{ fontSize: 7, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>MESAJ GÖNDERİN</span>
                                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                        </div>
                                        {/* Form */}
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                            <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="Ad Soyad"
                                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                            <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="mail@ornek.com"
                                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                        </div>
                                        <input type="text" value={supSubject} onChange={e => setSupSubject(e.target.value)} placeholder="Mesajınızın konusu"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 6 }} />
                                        <textarea value={supMessage} onChange={e => setSupMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..."
                                            rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', marginBottom: 10 }} />
                                        <button className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '10px 0', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            Mesaj Gönder <Send style={{ width: 13, height: 13 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ODALAR — SAĞ SÜTÜN */}
                            {roomsMode && (
                                <div style={{ width: liveHidden ? 0 : 248, flex: liveHidden ? '0 0 0px' : '0 0 248px', maxWidth: liveHidden ? 0 : 268, display: 'flex', flexDirection: 'column', gap: 16, order: 3, marginRight: liveHidden ? 0 : -24, opacity: liveHidden ? 0 : 1, transform: liveHidden ? 'translateY(-60px)' : 'translateY(0)', transition: liveHidden ? 'opacity 0.5s ease, transform 0.5s ease, width 0.5s ease 0.3s, flex 0.5s ease 0.3s, max-width 0.5s ease 0.3s, margin-right 0.5s ease 0.3s' : 'width 0.5s ease, flex 0.5s ease, max-width 0.5s ease, margin-right 0.5s ease, opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s', pointerEvents: liveHidden ? 'none' : 'auto' }}>
                                    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {/* Lamba */}
                                        <div className="gallery-lamp-svg-right" style={{ animation: lampAnimDone.current['rightLive'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 1.1s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards') }} onAnimationEnd={() => { lampAnimDone.current['rightLive'] = true; }}>
                                            <svg width="300" height="52" viewBox="0 0 300 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <linearGradient id="glBarMetalR2" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#4a4a4a" />
                                                        <stop offset="25%" stopColor="#2a2a2a" />
                                                        <stop offset="50%" stopColor="#1a1a1a" />
                                                        <stop offset="75%" stopColor="#2a2a2a" />
                                                        <stop offset="100%" stopColor="#3a3a3a" />
                                                    </linearGradient>
                                                    <linearGradient id="glMountPlateR2" x1="150" y1="0" x2="150" y2="14" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#555" />
                                                        <stop offset="50%" stopColor="#2a2a2a" />
                                                        <stop offset="100%" stopColor="#1a1a1a" />
                                                    </linearGradient>
                                                    <linearGradient id="glArmMetalR2" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#555" />
                                                        <stop offset="50%" stopColor="#333" />
                                                        <stop offset="100%" stopColor="#2a2a2a" />
                                                    </linearGradient>
                                                    <linearGradient id="glLightSpreadR2" x1="150" y1="44" x2="150" y2="52" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" />
                                                        <stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                                    </linearGradient>
                                                    <linearGradient id="glLedStripR2" x1="50" y1="43" x2="250" y2="43" gradientUnits="userSpaceOnUse">
                                                        <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" />
                                                        <stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                        <stop offset="50%" stopColor="#fff0cc" stopOpacity="1" />
                                                        <stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                        <stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M58 44 L35 52 L265 52 L242 44 Z" fill="url(#glLightSpreadR2)" opacity="0.5" />
                                                <rect x="135" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateR2)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                                <rect x="138" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                                <line x1="142" y1="10" x2="115" y2="30" stroke="url(#glArmMetalR2)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="142.5" y1="10.5" x2="115.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <line x1="158" y1="10" x2="185" y2="30" stroke="url(#glArmMetalR2)" strokeWidth="3" strokeLinecap="round" />
                                                <line x1="157.5" y1="10.5" x2="184.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                                <rect x="48" y="30" width="204" height="14" rx="7" fill="url(#glBarMetalR2)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                                <rect x="58" y="32" width="184" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                                <rect x="58" y="42" width="184" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                                <rect x="55" y="43.5" width="190" height="1.5" rx="0.75" fill="url(#glLedStripR2)" />
                                                <circle cx="115" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                                <circle cx="115" cy="34" r="1" fill="#555" />
                                                <circle cx="185" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                                <circle cx="185" cy="34" r="1" fill="#555" />
                                            </svg>
                                            <div className="gallery-lamp-glow" style={{
                                                width: 280,
                                                opacity: lampsOff ? 0 : (lampAnimDone.current['rightLiveGlow'] ? 1 : 0),
                                                animation: lampAnimDone.current['rightLiveGlow'] ? 'none' : 'glowLightUp 1.8s cubic-bezier(0.4,0,0.2,1) 3.0s forwards',
                                                transition: 'opacity 1.5s ease',
                                                height: 90,
                                                background: 'radial-gradient(ellipse at top center, rgba(255,210,120,0.28) 0%, rgba(255,180,80,0.12) 40%, transparent 70%)',
                                            }} onAnimationEnd={() => { lampAnimDone.current['rightLiveGlow'] = true; }}></div>
                                        </div>

                                        <div className="glossy-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '4px 10px', borderRadius: 20,
                                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                                }}>
                                                    <span style={{ position: 'relative', display: 'flex', width: 6, height: 6 }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s ease-in-out infinite' }} />
                                                    </span>
                                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Canlı Yayın</span>
                                                </div>
                                            </div>
                                            {/* Curved TV Monitor */}
                                            <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', margin: '0', perspective: 800 }}
                                                onMouseEnter={e => { const m = e.currentTarget.querySelector('.tv-monitor') as HTMLElement; if (m) { m.style.transform = 'rotateY(0deg) rotateX(0deg)'; } }}
                                                onMouseLeave={e => { const m = e.currentTarget.querySelector('.tv-monitor') as HTMLElement; if (m) { m.style.transform = 'rotateY(-15deg) rotateX(2deg)'; } }}
                                            >
                                                <div className="tv-monitor" style={{
                                                    width: '100%', height: '100%', background: '#0a0a0a',
                                                    border: '3px solid #2a2a2a', borderRadius: 14,
                                                    position: 'relative', overflow: 'hidden',
                                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 20px 40px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.12), inset 0 0 20px rgba(0,0,0,0.8)',
                                                    transformStyle: 'preserve-3d' as const,
                                                }}>
                                                    {/* Curved screen glass effect */}
                                                    <div style={{
                                                        position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none',
                                                        background: 'radial-gradient(ellipse 120% 80% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)',
                                                        borderRadius: 11,
                                                    }} />
                                                    {/* Edge highlight for curved feel */}
                                                    <div style={{
                                                        position: 'absolute', inset: 0, zIndex: 31, pointerEvents: 'none',
                                                        borderRadius: 11,
                                                        boxShadow: 'inset 2px 0 8px rgba(255,255,255,0.04), inset -2px 0 8px rgba(255,255,255,0.04), inset 0 2px 6px rgba(255,255,255,0.03)',
                                                    }} />
                                                    {/* TV Static */}
                                                    <div className="absolute inset-0" style={{ background: 'url(https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif) center/cover', opacity: 0.6 }} />
                                                    {/* Scanlines */}
                                                    <div className="absolute inset-0 pointer-events-none z-[2]" style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
                                                    {/* Dot matrix */}
                                                    <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
                                                </div>
                                                {/* Thin bezel bottom strip */}
                                                <div style={{
                                                    position: 'absolute', bottom: -6, left: '15%', right: '15%', height: 4,
                                                    background: 'linear-gradient(90deg, transparent, #222, #333, #222, transparent)',
                                                    borderRadius: '0 0 4px 4px',
                                                }} />
                                            </div>
                                            <div style={{ textAlign: 'center', fontSize: 9, color: '#475569', fontWeight: 600, marginTop: 8 }}>
                                                Yayın bekleniyor...
                                            </div>
                                            {/* Kamera açan bot kullanıcılar */}
                                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                                {/* Başlık — scroll'dan bağımsız */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>📹 Kameralar</span>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginLeft: 'auto' }}>50 kişi</span>
                                                </div>
                                                {/* Kamera grid — scroll yapan bölüm */}
                                                <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' as any, maxHeight: 590, paddingTop: 4 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                                        {['Sera', 'Ece', 'Mira', 'Lina', 'Çınar', 'Ada', 'Defne', 'Eylül', 'Toprak', 'Nehir', 'Atlas', 'Duru', 'Poyraz', 'Maya', 'Rüzgar', 'Lara', 'Kayra', 'Asya', 'Yağız', 'Nil', 'Bora', 'Ela', 'Tan', 'İdil', 'Alya', 'Ege', 'Sena', 'Arda', 'Melis', 'Batu', 'Yaren', 'Doruk', 'İpek', 'Emir', 'Beril', 'Efe', 'Tuana', 'Koray', 'Ceren', 'Cenk', 'Nazlı', 'Mert', 'Ilgın', 'Aras', 'Deren', 'Umut', 'Hazal', 'Erdem', 'Gökçe', 'Kerem'].map((name, i) => (
                                                            <div key={`cam-${i}`} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '4/3', background: `linear-gradient(${135 + i * 7}deg, rgba(${30 + i * 4},${40 + i * 3},${60 + i * 2},0.9), rgba(${20 + i * 2},${30 + i * 2},${50 + i},0.95))`, border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <div style={{ position: 'absolute', top: 2, left: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />
                                                                    <span style={{ fontSize: 7, fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{name}</span>
                                                                </div>
                                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <span style={{ fontSize: 16, opacity: 0.3 }}>📷</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    )}

                    <footer style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)', ...(roomsMode ? { display: 'none' } : {}) }}>
                        &copy; 2026 SopranoChat Systems.
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 32 }}>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Kurallar</a>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Gizlilik Sözleşmesi</a>
                        </div>
                    </footer>
                </main >
            </div >

            {/* CHECKOUT MODAL */}
            {
                showCheckout && checkoutPlan && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeIn 0.4s ease',
                    }} onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
                        <div className="glossy-panel modal-scrollbar" style={{
                            width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto',
                            borderRadius: 18, position: 'relative',
                            border: '1px solid rgba(251,191,36,0.15)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(251,191,36,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                            padding: 0,
                        }}>
                            {/* Golden Header Bar */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.05))',
                                borderBottom: '1px solid rgba(251,191,36,0.12)',
                                padding: '14px 22px', borderRadius: '18px 18px 0 0',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>⭐ Sipariş Özeti</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                            {chkBilling === 'yearly'
                                                ? `${(checkoutPlan.price * 10).toLocaleString('tr-TR')} ₺`
                                                : `${checkoutPlan.price.toLocaleString('tr-TR')} ₺`}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>{chkBilling === 'yearly' ? '/yıl' : checkoutPlan.period}</span>
                                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>• {checkoutPlan.name}</span>
                                    </div>
                                </div>
                                <button onClick={() => setShowCheckout(false)} style={{
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                                }}><X style={{ width: 14, height: 14 }} /></button>
                            </div>

                            <div style={{ padding: '16px 22px' }}>
                                {/* Aylık / Yıllık Toggle */}
                                <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button onClick={() => setChkBilling('monthly')} style={{
                                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
                                        background: chkBilling === 'monthly' ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.1))' : 'transparent',
                                        color: chkBilling === 'monthly' ? '#38bdf8' : '#64748b',
                                        boxShadow: chkBilling === 'monthly' ? '0 2px 8px rgba(56,189,248,0.15)' : 'none',
                                        transition: 'all 0.3s',
                                    }}>💳 Aylık Ödeme</button>
                                    <button onClick={() => setChkBilling('yearly')} style={{
                                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
                                        background: chkBilling === 'yearly' ? 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(52,211,153,0.1))' : 'transparent',
                                        color: chkBilling === 'yearly' ? '#34d399' : '#64748b',
                                        boxShadow: chkBilling === 'yearly' ? '0 2px 8px rgba(52,211,153,0.15)' : 'none',
                                        transition: 'all 0.3s',
                                    }}>🎁 Yıllık <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 900, background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>2 AY HEDİYE</span></button>
                                </div>

                                {/* Kişisel Bilgiler Section */}
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User style={{ width: 11, height: 11 }} /> Kişisel Bilgiler
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {[
                                            { label: 'Ad Soyad', value: chkName, setter: setChkName, type: 'text', placeholder: 'Ahmet Yılmaz', icon: '👤' },
                                            { label: 'E-Posta', value: chkEmail, setter: setChkEmail, type: 'email', placeholder: 'ornek@mail.com', icon: '📧' },
                                            { label: 'Telefon', value: chkPhone, setter: setChkPhone, type: 'tel', placeholder: '0532 xxx xx xx', icon: '📱' },
                                        ].map((field, i) => (
                                            <div key={i} style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>{field.icon}</span>
                                                <input
                                                    type={field.type} value={field.value} onChange={e => field.setter(e.target.value)}
                                                    placeholder={field.placeholder}
                                                    style={{
                                                        width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                                                        outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                                    }}
                                                    onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.4)'; e.target.style.boxShadow = '0 0 12px rgba(56,189,248,0.1)'; }}
                                                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Logo Upload */}
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Upload style={{ width: 11, height: 11 }} /> Müşteri Logosu
                                    </div>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        padding: '12px', borderRadius: 12, cursor: 'pointer',
                                        background: chkLogo ? 'rgba(52,211,153,0.06)' : 'rgba(0,0,0,0.2)',
                                        border: `1.5px dashed ${chkLogo ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                        color: chkLogo ? '#34d399' : '#64748b', fontSize: 13, fontWeight: 700,
                                        transition: 'all 0.3s',
                                    }}>
                                        {chkLogo ? <Check style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
                                        {chkLogo ? chkLogo.name : 'Logo Yükle (.png, .jpg)'}
                                        <input type="file" accept="image/*" onChange={e => setChkLogo(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                                    </label>
                                </div>

                                {/* Hosting Tercihi */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Globe style={{ width: 11, height: 11 }} /> Hosting Tercihiniz
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {[
                                            { key: 'soprano' as const, label: 'SopranoChat', sub: 'sopranochat.com üzerinden', color: '#38bdf8', icon: '🎙️' },
                                            { key: 'own' as const, label: 'Kendi Domainin', sub: 'Embed ile kendi siten', color: '#a78bfa', icon: '🌐' },
                                        ].map(opt => (
                                            <div key={opt.key} onClick={() => setChkHosting(opt.key)} style={{
                                                flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                                                background: chkHosting === opt.key ? `linear-gradient(135deg, ${opt.color}11, ${opt.color}06)` : 'rgba(0,0,0,0.15)',
                                                border: `1.5px solid ${chkHosting === opt.key ? opt.color + '55' : 'rgba(255,255,255,0.06)'}`,
                                                transition: 'all 0.3s',
                                                boxShadow: chkHosting === opt.key ? `0 4px 16px ${opt.color}15` : 'none',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: '50%',
                                                        border: `2px solid ${chkHosting === opt.key ? opt.color : '#475569'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.3s',
                                                    }}>
                                                        {chkHosting === opt.key && <div style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />}
                                                    </div>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: chkHosting === opt.key ? opt.color : '#94a3b8' }}>{opt.icon} {opt.label}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: '#64748b', marginLeft: 30, fontWeight: 500 }}>{opt.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {chkHosting === 'soprano' && (
                                        <div style={{ marginTop: 8 }}>
                                            <input
                                                type="text" value={chkRoomName} onChange={e => setChkRoomName(e.target.value)}
                                                placeholder="Oda Adınız"
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)',
                                                    outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                                }}
                                                onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; e.target.style.boxShadow = '0 0 12px rgba(56,189,248,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = 'rgba(56,189,248,0.2)'; e.target.style.boxShadow = 'none'; }}
                                            />
                                            <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontWeight: 500 }}>🏠 sopranochat.com üzerinde odanız bu isimle oluşturulacak</div>
                                        </div>
                                    )}
                                    {chkHosting === 'own' && (
                                        <div style={{ marginTop: 8 }}>
                                            <input
                                                type="text" value={chkDomain} onChange={e => setChkDomain(e.target.value)}
                                                placeholder="ornek.com"
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                                                    outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                                }}
                                                onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 12px rgba(167,139,250,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = 'rgba(167,139,250,0.2)'; e.target.style.boxShadow = 'none'; }}
                                            />
                                            <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontWeight: 500 }}>🔗 Embed kodunu bu domain için oluşturacağız</div>
                                        </div>
                                    )}
                                </div>

                                {/* Ödeme Bilgileri Decorative Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2 }}>💰 Ödeme Bilgileri</span>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
                                </div>

                                {/* IBAN Card */}
                                <div style={{
                                    background: 'linear-gradient(145deg, rgba(0,0,0,0.3), rgba(0,0,0,0.15))',
                                    borderRadius: 14, padding: '14px 16px',
                                    border: '1px solid rgba(251,191,36,0.1)',
                                    marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 15, fontWeight: 900, color: '#fff',
                                            boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                                        }}>A</div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>AKBANK</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>SopranoChat Bilişim</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', borderRadius: 12,
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2.5, fontFamily: 'monospace' }}>TR78 0004 6006 1388 8000 0123 45</span>
                                        <button onClick={() => copyToClipboard('TR78000460061388800001234 5', 'iban')} style={{
                                            background: chkCopied === 'iban' ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
                                            border: `1px solid ${chkCopied === 'iban' ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                            color: chkCopied === 'iban' ? '#34d399' : '#38bdf8',
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                                            transition: 'all 0.2s',
                                        }}>
                                            {chkCopied === 'iban' ? <><Check style={{ width: 12, height: 12 }} /> Kopyalandı</> : <><Copy style={{ width: 12, height: 12 }} /> Kopyala</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Ödeme Kodu Card */}
                                <div style={{
                                    background: 'linear-gradient(145deg, rgba(56,189,248,0.06), rgba(56,189,248,0.02))',
                                    borderRadius: 14, padding: '12px 16px',
                                    border: '1px solid rgba(56,189,248,0.12)',
                                    marginBottom: 16,
                                }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>📋 Ödeme Kodu (Açıklamaya Yazılacak)</div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 16px', borderRadius: 12,
                                        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(56,189,248,0.15)',
                                    }}>
                                        <span style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8', letterSpacing: 4, fontFamily: 'monospace', textShadow: '0 0 10px rgba(56,189,248,0.3)' }}>{chkPaymentCode}</span>
                                        <button onClick={() => copyToClipboard(chkPaymentCode, 'code')} style={{
                                            background: chkCopied === 'code' ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
                                            border: `1px solid ${chkCopied === 'code' ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                            color: chkCopied === 'code' ? '#34d399' : '#38bdf8',
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                                            transition: 'all 0.2s',
                                        }}>
                                            {chkCopied === 'code' ? <><Check style={{ width: 12, height: 12 }} /> Kopyalandı</> : <><Copy style={{ width: 12, height: 12 }} /> Kopyala</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Ödemeyi Tamamla Butonu */}
                                <button className="btn-3d btn-3d-gold" style={{
                                    width: '100%', padding: '13px 0', fontSize: 13, fontWeight: 900, borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    letterSpacing: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                }}>
                                    Ödemeyi Gönderdim, Tamamla <Check style={{ width: 18, height: 18 }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Üyelik Sözleşmesi Modal */}
            {
                showTermsModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setShowTermsModal(false)}>
                        <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 16, padding: '28px 32px', maxWidth: 520, width: '90%', maxHeight: '70vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', color: '#e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 2 }}>Üyelik Sözleşmesi</h3>
                                <button onClick={() => setShowTermsModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ fontSize: 12, lineHeight: 1.8, color: '#cbd5e1' }}>
                                <p style={{ fontWeight: 700, marginBottom: 12 }}>Son Güncelleme: Mart 2026</p>
                                <p style={{ marginBottom: 10 }}>Bu sözleşme, SopranoChat platformuna üye olan kullanıcılar ile SopranoChat yönetimi arasında geçerli olan kullanım koşullarını belirler.</p>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginTop: 16, marginBottom: 8 }}>1. Üyelik Koşulları</h4>
                                <p>Üye olmak için geçerli bir e-posta adresi ve en az 4 karakterlik bir şifre gerekmektedir. Kullanıcı adı benzersiz olmalıdır. Sahte veya yanıltıcı bilgi verilmesi durumunda hesap askıya alınabilir.</p>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginTop: 16, marginBottom: 8 }}>2. Kullanım Kuralları</h4>
                                <p>Platform içerisinde hakaret, küfür, ırkçılık, cinsel içerik ve diğer topluma aykırı davranışlar yasaktır. Bu kurallara uymayan kullanıcıların hesapları kalıcı olarak kapatılabilir.</p>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginTop: 16, marginBottom: 8 }}>3. Gizlilik</h4>
                                <p>Kullanıcı bilgileri üçüncü şahıslarla paylaşılmaz. E-posta adresleri yalnızca hesap doğrulama ve bildirim amaçlı kullanılır.</p>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginTop: 16, marginBottom: 8 }}>4. Sorumluluk</h4>
                                <p>Kullanıcılar kendi hesaplarının güvenliğinden sorumludur. Şifre paylaşımı veya hesap devri yapılmamalıdır.</p>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginTop: 16, marginBottom: 8 }}>5. Değişiklikler</h4>
                                <p>SopranoChat yönetimi bu sözleşmeyi önceden bildirim yapmaksızın güncelleme hakkını saklı tutar.</p>
                            </div>
                            <button onClick={() => setShowTermsModal(false)} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, marginTop: 20 }}>Anladım, Kapat</button>
                        </div>
                    </div>
                )
            }
        </>
    );
}
