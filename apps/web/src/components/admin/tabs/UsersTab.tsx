import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User } from '@/types';
import { generateGenderAvatar } from '@/lib/avatar';
import { RefreshCw, Search, Save, Trash2, Star, UserPlus, Shield, Eye, EyeOff, X, Sparkles, Type, Image, AlertTriangle } from 'lucide-react';
import { useAdminPanelStore } from '@/stores/useAdminPanelStore';
import { adminApi } from '@/lib/admin/api';
import { Socket } from 'socket.io-client';
import '@/components/admin/AdminPanel.css';

interface UsersTabProps {
    socket: Socket | null;
    users: User[];
    currentUser: User | null;
}

// ─── Permission definitions for checkbox grid ───────────────
const PERMISSION_GROUPS = [
    {
        title: 'Kişisel',
        minRole: 'guest',
        permissions: [
            { key: 'self.change_name', label: 'İsim Değiştir' },
            { key: 'self.mic_test', label: 'Mikrofon Testi' },
            { key: 'self.stealth', label: 'Görünmezlik' },
            { key: 'self.webcam_1v1', label: 'Bire Bir WebCam' },
            { key: 'self.private_message', label: 'Özel Mesaj' },
        ],
    },
    {
        title: 'Oda Kontrolü',
        minRole: 'member',
        permissions: [
            { key: 'room.clear_chat_local', label: 'Sohbeti Temizle (Yerel)' },
            { key: 'room.freeze_chat_local', label: 'Sohbeti Dondur (Yerel)' },
            { key: 'room.freeze_chat_global', label: 'Sohbeti Dondur (Genel)' },
            { key: 'room.youtube', label: 'YouTube Paylaşımı' },
            { key: 'room.meeting_room', label: 'Toplantı Odası' },
        ],
    },
    {
        title: 'Yumuşak Moderasyon',
        minRole: 'operator',
        permissions: [
            { key: 'mod.mute', label: 'Sustur (Mute)' },
            { key: 'mod.gag', label: 'Yazı Yasağı (Gag)' },
            { key: 'mod.clear_text', label: 'Yazıları Sil' },
            { key: 'mod.kick', label: 'Atma (Kick)' },
            { key: 'mod.cam_block', label: 'Kamerayı Sonlandır' },
            { key: 'mod.give_mic', label: 'Mikrofon Serbest Bırak' },
            { key: 'mod.take_mic', label: 'Mikrofon Al' },
            { key: 'mod.move_to_room', label: 'Odaya Taşı' },
            { key: 'mod.move_to_meeting', label: 'Toplantıya Çek' },
            { key: 'mod.nudge', label: 'Titret (Nudge)' },
        ],
    },
    {
        title: 'Sert Moderasyon',
        minRole: 'moderator',
        permissions: [
            { key: 'mod.ban_permanent', label: 'Süresiz Ban' },
            { key: 'mod.ban_1day', label: '1 Gün Yasakla' },
            { key: 'mod.ban_1week', label: '1 Hafta Yasakla' },
            { key: 'mod.ban_1month', label: '1 Ay Yasakla' },
            { key: 'mod.ban_remove', label: 'Ban Kaldır' },
            { key: 'mod.gag_remove', label: 'Gag Kaldır' },
        ],
    },
    {
        title: 'Sistem Kontrolü',
        minRole: 'admin',
        permissions: [
            { key: 'ctrl.admin_panel', label: 'Yönetim Paneli' },
            { key: 'ctrl.users_global', label: 'Kullanıcı Listesi (Global)' },
            { key: 'ctrl.room_options', label: 'Oda Seçenekleri' },
            { key: 'ctrl.spy_rooms', label: 'Odaları Gözetle' },
            { key: 'ctrl.admin_add_user', label: 'Kullanıcı Ekle/Sil' },
        ],
    },
    {
        title: 'Platform',
        minRole: 'superadmin',
        permissions: [
            { key: 'platform.ban_list', label: 'Ban Listesi' },
            { key: 'platform.ip_ban_area', label: 'IP Ban Alanı' },
            { key: 'platform.ip_ban_list', label: 'IP Ban Listesi' },
            { key: 'platform.admin_login', label: 'Admin Giriş Logları' },
            { key: 'platform.forbidden_words', label: 'Yasaklı Kelimeler' },
            { key: 'platform.logo_name', label: 'Logo İsmi' },
            { key: 'platform.about', label: 'Hakkında' },
        ],
    },
];

const ROLE_OPTIONS = [
    { value: 'guest', label: 'Misafir', level: 1 },
    { value: 'member', label: 'Üye', level: 2 },
    { value: 'vip', label: 'VIP', level: 4 },
    { value: 'operator', label: 'Operatör', level: 5 },
    { value: 'moderator', label: 'Moderatör', level: 6 },
    { value: 'admin', label: 'Yönetici', level: 7 },
    { value: 'superadmin', label: 'Süper Admin', level: 9 },
    { value: 'owner', label: 'Sahip', level: 10 },
];

// ── Rol seviyesi yardımcı fonksiyonu ──
const ROLE_LEVELS: Record<string, number> = {
    guest: 1, member: 2, vip: 4, operator: 5,
    moderator: 6, admin: 7, superadmin: 9, owner: 10, godmaster: 11,
};
const getRoleLevel = (role?: string | null): number => ROLE_LEVELS[(role || '').toLowerCase()] ?? 0;

// ─── Varsayılan Yetki Taslakları (Her rol için ön tıklı yetkiler) ───
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    guest: [
        'self.change_name', 'self.mic_test', 'self.profile',
        'room.emoji',
    ],
    member: [
        'self.change_name', 'self.mic_test', 'self.profile', 'self.private_message',
        'self.camera',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local',
        'mod.nudge',
    ],
    vip: [
        'self.change_name', 'self.mic_test', 'self.profile', 'self.private_message',
        'self.camera', 'self.webcam_1v1',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local',
        'mod.nudge',
    ],
    operator: [
        'self.change_name', 'self.mic_test', 'self.profile', 'self.private_message',
        'self.camera', 'self.webcam_1v1',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local', 'room.freeze_chat_global',
        'mod.mute', 'mod.gag', 'mod.clear_text', 'mod.give_mic', 'mod.take_mic',
        'mod.nudge',
    ],
    moderator: [
        'self.change_name', 'self.mic_test', 'self.stealth', 'self.profile', 'self.private_message',
        'self.camera', 'self.webcam_1v1',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local', 'room.freeze_chat_global',
        'mod.mute', 'mod.gag', 'mod.clear_text', 'mod.kick', 'mod.cam_block',
        'mod.give_mic', 'mod.take_mic', 'mod.move_to_room', 'mod.nudge',
        'mod.ban_1day', 'mod.ban_1week',
        'mod.ban_remove', 'mod.gag_remove',
    ],
    admin: [
        'self.change_name', 'self.mic_test', 'self.stealth', 'self.profile', 'self.private_message',
        'self.camera', 'self.webcam_1v1',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local', 'room.freeze_chat_global',
        'mod.mute', 'mod.gag', 'mod.clear_text', 'mod.kick', 'mod.cam_block',
        'mod.give_mic', 'mod.take_mic', 'mod.move_to_room', 'mod.nudge',
        'mod.ban_permanent', 'mod.ban_1day', 'mod.ban_1week', 'mod.ban_1month',
        'mod.ban_remove', 'mod.gag_remove',
        'ctrl.admin_panel', 'ctrl.users_global', 'ctrl.room_admin', 'ctrl.room_options',
        'ctrl.admin_add_user',
    ],
    superadmin: [
        'self.change_name', 'self.mic_test', 'self.stealth', 'self.profile', 'self.private_message',
        'self.camera', 'self.webcam_1v1',
        'room.dm', 'room.emoji', 'room.sticker', 'room.gif',
        'room.clear_chat_local', 'room.freeze_chat_local', 'room.freeze_chat_global',
        'mod.mute', 'mod.gag', 'mod.clear_text', 'mod.kick', 'mod.cam_block',
        'mod.give_mic', 'mod.take_mic', 'mod.move_to_room',
        'mod.ban_permanent', 'mod.ban_1day', 'mod.ban_1week', 'mod.ban_1month',
        'mod.ban_remove', 'mod.gag_remove',
        'ctrl.admin_panel', 'ctrl.users_global', 'ctrl.room_admin',
        'ctrl.room_options', 'ctrl.spy_rooms',
        'ctrl.admin_add_user',
        'platform.ban_list', 'platform.ip_ban_area', 'platform.ip_ban_list',
        'platform.admin_login', 'platform.forbidden_words', 'platform.logo_name',
        'platform.allow_youtube', 'platform.about',
    ],
    owner: [
        // Owner tüm yetkilere sahiptir
        ...PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key)),
    ],
};

// Rol için varsayılan yetki map'i oluştur
function getDefaultPermsForRole(role: string): Record<string, boolean> {
    const perms: Record<string, boolean> = {};
    const defaults = DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] || [];
    // Tüm yetkileri false olarak başlat
    PERMISSION_GROUPS.forEach(g => g.permissions.forEach(p => { perms[p.key] = false; }));
    // Varsayılanları true yap
    defaults.forEach(key => { perms[key] = true; });
    return perms;
}

// ─── Varsayılan Avatarlar (Login sayfasıyla senkron) ──────
const DEFAULT_AVATARS = [
    '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
    '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
    '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];

interface DBUser {
    id: string;
    displayName: string;
    role: string;
    email?: string;
    password?: string;
    avatarUrl?: string;
    isPremium: boolean;
    isOnline: boolean;
    isBanned: boolean;
    loginCount: number;
    lastLoginAt?: string;
    permissions?: Record<string, boolean>;
    balance?: number;
    points?: number;
}

// ─── Toast Portal (Sağ-alt sabit) ───────────────────────────
function ToastPortal({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null;
    return createPortal(
        <div className="admin-toast-container">
            <div className={`admin-toast ${msg.type}`}>{msg.text}</div>
        </div>,
        document.body
    );
}

export function UsersTab({ socket, users, currentUser }: UsersTabProps) {
    const [dbUsers, setDbUsers] = useState<DBUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Editable fields
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('member');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showPerms, setShowPerms] = useState(false);

    // Column resize state
    const [leftPanelWidth, setLeftPanelWidth] = useState(42); // percentage
    const resizingRef = React.useRef(false);
    const splitRef = React.useRef<HTMLDivElement>(null);

    // Token loading
    const [tokenAmount, setTokenAmount] = useState('');
    const [tokenLoading, setTokenLoading] = useState(false);

    // Animated nickname (GodMaster only)
    const [animatedNickEnabled, setAnimatedNickEnabled] = useState(false);
    const [animatedNickType, setAnimatedNickType] = useState<'animated' | 'gif'>('animated'); // animated text vs gif
    const [animatedNickClass, setAnimatedNickClass] = useState('shimmer-gold');
    const [animatedNickFontSize, setAnimatedNickFontSize] = useState(13);
    const [animatedNickShowAvatar, setAnimatedNickShowAvatar] = useState(true);
    const [animatedNickGifUrl, setAnimatedNickGifUrl] = useState('');

    // Add user form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('member');

    // Status toast
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Inline confirm
    const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; name: string } | null>(null);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.getUsers();
            let userList = result.users || result || [];
            // Frontend safety: hide GodMaster from non-GodMaster users
            if (currentUser?.role?.toLowerCase() !== 'godmaster') {
                userList = userList.filter((u: any) => u.role?.toLowerCase() !== 'godmaster');
            }
            setDbUsers(userList);
        } catch (e: any) {
            showStatus('error', 'Kullanıcılar yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // When selectedId changes, populate edit fields
    useEffect(() => {
        if (!selectedId) return;
        const user = dbUsers.find(u => u.id === selectedId);
        if (user) {
            setEditName(user.displayName || '');
            setEditRole(user.role || 'member');
            setEditEmail(user.email || '');
            setEditPassword(user.password || '');
            setEditAvatar(user.avatarUrl || '');
            const savedPerms = user.permissions || {};
            const hasAnyPerms = Object.keys(savedPerms).length > 0;
            setEditPerms(hasAnyPerms ? savedPerms : getDefaultPermsForRole(user.role || 'member'));
            setShowPassword(false);
            setShowAvatarPicker(false);
            setConfirmAction(null);
            // Parse animated nick from avatarUrl
            if (user.avatarUrl?.startsWith('animated:')) {
                setAnimatedNickEnabled(true);
                setAnimatedNickType('animated');
                const parts = user.avatarUrl.split(':');
                setAnimatedNickClass(parts[1] || 'shimmer-gold');
                // parts[2] = fontSize, parts[3] = avatar (1/0), parts[4+] = text
                setAnimatedNickFontSize(parseInt(parts[2]) || 13);
                setAnimatedNickShowAvatar(parts[3] !== '0');
            } else if (user.avatarUrl?.startsWith('gifnick:')) {
                setAnimatedNickEnabled(true);
                setAnimatedNickType('gif');
                // gifnick:url:showAvatar
                const parts = user.avatarUrl.split('::');
                setAnimatedNickGifUrl(parts[1] || '');
                setAnimatedNickShowAvatar(parts[2] !== '0');
            } else {
                setAnimatedNickEnabled(false);
                setAnimatedNickType('animated');
                setAnimatedNickClass('shimmer-gold');
                setAnimatedNickFontSize(13);
                setAnimatedNickShowAvatar(true);
                setAnimatedNickGifUrl('');
            }
        }
    }, [selectedId, dbUsers]);

    // Socket'ten gelen gerçek zamanlı online kullanıcı ID'leri
    const onlineUserIds = new Set(users.map(u => u.userId).filter(Boolean));

    const _selectedUser = dbUsers.find(u => u.id === selectedId);
    const selectedUser = _selectedUser ? { ..._selectedUser, isOnline: onlineUserIds.has(_selectedUser.id) } : undefined;

    // ── Hiyerarşi kontrolleri ──
    const currentUserLevel = getRoleLevel(currentUser?.role);
    const selectedUserLevel = selectedUser ? getRoleLevel(selectedUser.role) : 0;
    const isSelf = selectedUser?.id === currentUser?.userId;
    // Owner kendini düzenleyebilir, aynı seviyedekileri de düzenleyebilir (owner→owner)
    const canEditSelected = selectedUser
        ? (currentUser?.role?.toLowerCase() === 'godmaster'
            ? true
            : isSelf ? true : currentUserLevel >= selectedUserLevel)
        : false;
    // Mevcut sahip sayısı (en fazla 3)
    const ownerCount = dbUsers.filter(u => u.role?.toLowerCase() === 'owner').length;
    const canSelectOwnerRole = ownerCount < 3;
    // Owner kendi seviyesine kadar roller görebilir, GodMaster hariç; sahip limiti doluysa owner seçeneği çıkmaz
    const allowedRoleOptions = ROLE_OPTIONS.filter(opt =>
        opt.level <= currentUserLevel &&
        opt.value !== 'godmaster' &&
        (opt.value !== 'owner' || canSelectOwnerRole)
    );

    // ─── Save handler ───────────────────────────────────────
    const handleSave = async () => {
        if (!selectedId) return;
        // Owner limit kontrolü: farklı bir kullanıcı owner'a yükseltiliyorsa
        if (editRole === 'owner' && selectedUser?.role?.toLowerCase() !== 'owner' && !canSelectOwnerRole) {
            showStatus('error', 'En fazla 3 sahip olabilir!');
            return;
        }
        try {
            // editAvatar hâlâ eski animated string'i tutabiliyor — temizle
            const cleanAvatar = (editAvatar && !editAvatar.startsWith('animated:') && !editAvatar.startsWith('gifnick:') && !editAvatar.startsWith('3d:'))
                ? editAvatar
                : undefined;
            const defaultAvatar = generateGenderAvatar(editName);
            const payload: any = {
                displayName: editName,
                role: editRole,
                email: editEmail || undefined,
                permissions: editPerms,
                avatarUrl: animatedNickEnabled
                    ? (animatedNickType === 'gif'
                        ? `gifnick::${animatedNickGifUrl}::${animatedNickShowAvatar ? '1' : '0'}`
                        : `animated:${animatedNickClass}:${animatedNickFontSize}:${animatedNickShowAvatar ? '1' : '0'}:${editName}`)
                    : (cleanAvatar || defaultAvatar),
            };
            if (editPassword) payload.password = editPassword;
            await adminApi.updateUser(selectedId, payload);
            showStatus('success', 'Değişiklikler kaydedildi');
            fetchUsers();

            // Live update via socket
            if (socket) {
                const avatarValue = animatedNickEnabled
                    ? (animatedNickType === 'gif'
                        ? `gifnick::${animatedNickGifUrl}::${animatedNickShowAvatar ? '1' : '0'}`
                        : `animated:${animatedNickClass}:${animatedNickFontSize}:${animatedNickShowAvatar ? '1' : '0'}:${editName}`)
                    : (cleanAvatar || defaultAvatar);
                socket.emit('admin:userUpdate', {
                    userId: selectedId,
                    displayName: editName,
                    role: editRole,
                    permissions: editPerms,
                    avatarUrl: avatarValue,
                });
            }
        } catch (e: any) {
            showStatus('error', e?.message || 'Kaydetme başarısız');
        }
    };


    // ─── Token (Jeton) Yükleme ───────────────────────────────
    const handleAddBalance = async () => {
        const amount = parseInt(tokenAmount);
        if (!selectedId || !amount || amount <= 0 || !socket) return;
        setTokenLoading(true);
        try {
            socket.emit('admin:addBalance', { userId: selectedId, amount }, (res: any) => {
                if (res?.success) {
                    showStatus('success', `${amount} jeton yüklendi!`);
                    setTokenAmount('');
                    // Update local state
                    setDbUsers(prev => prev.map(u => u.id === selectedId ? { ...u, balance: (u.balance || 0) + amount } : u));
                } else {
                    showStatus('error', res?.error || 'Yükleme başarısız');
                }
                setTokenLoading(false);
            });
        } catch {
            showStatus('error', 'Jeton yükleme hatası');
            setTokenLoading(false);
        }
    };

    // ─── Delete handler (inline confirm) ─────────────────────
    const requestDelete = (userId: string, name: string) => {
        setConfirmAction({ type: 'delete', userId, name });
    };

    const executeDelete = async () => {
        if (!confirmAction) return;
        try {
            await adminApi.deleteUser(confirmAction.userId);
            showStatus('success', 'Kullanıcı silindi');
            setSelectedId(null);
            setConfirmAction(null);
            fetchUsers();
        } catch (e: any) {
            showStatus('error', e?.message || 'Silme başarısız');
        }
    };

    // ─── Add user handler ────────────────────────────────────
    const handleAddUser = async () => {
        if (!newName.trim()) return;
        // Owner limit kontrolü
        if (newRole === 'owner' && !canSelectOwnerRole) {
            showStatus('error', 'En fazla 3 sahip olabilir!');
            return;
        }
        try {
            await adminApi.createMember({
                displayName: newName.trim(),
                email: newEmail.trim() || undefined,
                password: newPassword.trim() || undefined,
                role: newRole,
            });
            showStatus('success', `"${newName}" eklendi`);
            setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('member');
            setShowAddForm(false);
            fetchUsers();
        } catch (e: any) {
            showStatus('error', e?.message || 'Üye ekleme başarısız');
        }
    };

    // ─── Toggle permission ──────────────────────────────────
    const togglePermission = (key: string) => {
        // Yetki, seçili rolün seviyesinin üstünde mi kontrol et
        const group = PERMISSION_GROUPS.find(g => g.permissions.some(p => p.key === key));
        if (group && editRole) {
            const userRoleLevel = getRoleLevel(editRole);
            const minRoleLevel = getRoleLevel(group.minRole);
            if (userRoleLevel < minRoleLevel) {
                const roleName = ROLE_OPTIONS.find(r => r.value === editRole)?.label || editRole;
                const minRoleName = ROLE_OPTIONS.find(r => r.value === group.minRole)?.label || group.minRole;
                showStatus('error', `⚠️ "${group.title}" yetkileri ${roleName} sınıfında çalışmaz. En az ${minRoleName} rolü gerekir.`);
            }
        }
        setEditPerms(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    };

    // ─── Format date ────────────────────────────────────────
    const fmtDate = (d?: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // ─── Filter ─────────────────────────────────────────────

    const filteredUsers = dbUsers
        .filter(u =>
            u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            u.role?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
        )
        .map(u => ({ ...u, isOnline: onlineUserIds.has(u.id) }));

    const getRoleBadgeClass = (role: string) => {
        const r = role?.toLowerCase();
        if (r === 'owner') return 'role-badge role-owner';
        if (r === 'superadmin' || r === 'super_admin') return 'role-badge role-superadmin';
        if (r === 'admin') return 'role-badge role-admin';
        if (r === 'moderator') return 'role-badge role-moderator';
        if (r === 'operator') return 'role-badge role-operator';
        if (r === 'vip') return 'role-badge role-vip';
        if (r === 'member') return 'role-badge role-member';
        return 'role-badge role-guest';
    };

    const getRoleLabel = (role: string) => {
        return ROLE_OPTIONS.find(r => r.value === role?.toLowerCase())?.label || role;
    };

    const isSpecialUser = (role: string) => {
        const r = role?.toLowerCase();
        return ['owner', 'superadmin', 'super_admin', 'admin', 'vip'].includes(r);
    };

    return (
        <div className="admin-split" ref={splitRef} style={{ position: 'relative' }}>

            {/* ─── Sol Panel: Kullanıcı Listesi ─── */}
            <div className="admin-split-left" style={{ width: `${leftPanelWidth}%`, minWidth: 220, maxWidth: '65%' }}>
                {/* Toolbar */}
                <div className="admin-toolbar">
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                        <Search style={{ position: 'absolute', left: 12, width: 13, height: 13, color: 'rgba(37,99,235,0.35)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Kullanıcı ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 34, width: '100%' }}
                        />
                    </div>
                    <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowAddForm(!showAddForm)} title="Üye Ekle">
                        <UserPlus style={{ width: 12, height: 12 }} />
                    </button>
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={fetchUsers} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12 }} />
                    </button>
                </div>

                {/* Üye Ekleme Formu (inline) */}
                {showAddForm && (
                    <div style={{
                        padding: 14,
                        borderBottom: '1px solid rgba(148,163,184,0.12)',
                        background: 'rgba(226,232,240,0.5)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <UserPlus style={{ width: 12, height: 12 }} /> Yeni Üye Ekle
                            </span>
                            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setShowAddForm(false)}>
                                <X style={{ width: 11, height: 11 }} />
                            </button>
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>Kullanıcı Adı</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="İsim..." />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>E-Posta</label>
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@..." />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>Şifre</label>
                            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Şifre..." />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>Sınıf</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                                {allowedRoleOptions.filter(o => o.value !== 'guest').map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={handleAddUser} disabled={!newName.trim()}>
                                <UserPlus style={{ width: 11, height: 11 }} /> Ekle
                            </button>
                            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setShowAddForm(false)}>İptal</button>
                        </div>
                    </div>
                )}

                {/* Kullanıcı Tablosu */}
                {loading ? (
                    <div className="admin-loading">
                        <div className="admin-spinner" />
                        Yükleniyor...
                    </div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 34 }}></th>
                                    <th>İsim</th>
                                    <th>Sınıf</th>
                                    <th>Son Giriş</th>
                                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        className={selectedId === user.id ? 'selected' : ''}
                                        onClick={() => setSelectedId(user.id)}
                                    >
                                        <td style={{ textAlign: 'center', padding: '7px 6px' }}>
                                            {isSpecialUser(user.role) ? (
                                                <Star style={{ width: 12, height: 12, fill: '#2563eb', color: '#2563eb' }} className="star-icon" />
                                            ) : (
                                                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'rgba(37,99,235,0.4)', textTransform: 'uppercase', overflow: 'hidden' }}>{user.avatarUrl && !user.avatarUrl.startsWith('animated:') && !user.avatarUrl.startsWith('gifnick:') ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.displayName || '?').charAt(0)}</div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600, color: selectedId === user.id ? '#1e293b' : '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className={`status-dot ${user.isOnline ? 'online' : 'offline'}`} />
                                                {user.displayName}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={getRoleBadgeClass(user.role)}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>
                                            {fmtDate(user.lastLoginAt)}
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#334155', fontSize: 10 }}>
                                            {user.loginCount || 0}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#1e293b' }}>
                                            {search ? 'Sonuç bulunamadı' : 'Henüz kullanıcı yok'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer stats */}
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid rgba(148,163,184,0.12)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    color: '#64748b',
                    flexShrink: 0,
                    background: 'rgba(226,232,240,0.5)',
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Toplam: <span className="admin-count">{dbUsers.length}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="status-dot online" style={{ width: 5, height: 5 }} />
                        Çevrimiçi: <span style={{ color: '#22c55e', fontWeight: 700 }}>{users.length}</span>
                    </span>
                </div>
            </div>

            {/* ─── Resize Divider ─── */}
            <div
                style={{
                    width: 6,
                    cursor: 'col-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 5,
                    userSelect: 'none',
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    resizingRef.current = true;
                    const startX = e.clientX;
                    const startWidth = leftPanelWidth;
                    const container = splitRef.current;
                    if (!container) return;
                    const containerWidth = container.getBoundingClientRect().width;

                    const onMouseMove = (ev: MouseEvent) => {
                        if (!resizingRef.current) return;
                        const deltaX = ev.clientX - startX;
                        const newPercent = startWidth + (deltaX / containerWidth) * 100;
                        setLeftPanelWidth(Math.max(20, Math.min(65, newPercent)));
                    };
                    const onMouseUp = () => {
                        resizingRef.current = false;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                }}
            >
                <div style={{
                    width: 3,
                    height: 40,
                    borderRadius: 3,
                    background: 'rgba(148,163,184,0.12)',
                    transition: 'background 0.2s, height 0.2s',
                }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.2)'; e.currentTarget.style.height = '60px'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.12)'; e.currentTarget.style.height = '40px'; }}
                />
            </div>

            {/* ─── Sağ Panel: Kullanıcı Detayı ─── */}
            <div className="admin-split-right">
                {!selectedUser ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">👤</div>
                        <div className="admin-empty-text">Kullanıcı Seçin</div>
                        <div className="admin-empty-sub">Detayları görüntülemek için sol listeden bir kullanıcı seçin</div>
                    </div>
                ) : (
                    <>
                        {/* Premium Profile Header */}
                        <div className="admin-user-profile-header">
                            <div
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                style={{
                                    width: 56, height: 56, borderRadius: 14,
                                    background: 'rgba(37,99,235,0.08)',
                                    border: '2px solid rgba(37,99,235,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                    transition: 'all 0.2s',
                                }}
                                title="Avatar değiştirmek için tıklayın"
                            >
                                {editAvatar && (editAvatar.startsWith('animated:') || editAvatar.startsWith('gifnick:')) ? (
                                    <span style={{ fontSize: 20 }}>✨</span>
                                ) : editAvatar && !editAvatar.startsWith('animated:') && !editAvatar.startsWith('gifnick:') ? (
                                    <img src={editAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(37,99,235,0.5)', textTransform: 'uppercase' }}>{(selectedUser.displayName || '?').charAt(0)}</span>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{selectedUser.displayName}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
                                    <span className={getRoleBadgeClass(selectedUser.role)} style={{ fontSize: 8 }}>
                                        {getRoleLabel(selectedUser.role)}
                                    </span>
                                    <span className={`status-dot ${selectedUser.isOnline ? 'online' : 'offline'}`} />
                                    {selectedUser.isBanned ? (
                                        <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 10 }}>🚫 Yasaklı</span>
                                    ) : (
                                        <span style={{ fontWeight: 500 }}>{selectedUser.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ─── Inline Toast (Eylem alanında) ─── */}
                        {toastMsg && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                marginBottom: 10,
                                animation: 'adminToastIn 0.25s ease-out',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                ...(toastMsg.type === 'success'
                                    ? { background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)' }
                                    : { background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }),
                            }}>
                                <span>{toastMsg.type === 'success' ? '✅' : '⚠️'}</span>
                                {toastMsg.text}
                            </div>
                        )}

                        {/* ─── Action Buttons (Top) ─── */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            {confirmAction ? (
                                <div className="admin-inline-confirm" style={{ flex: 1 }}>
                                    <span>"{confirmAction.name}" silinecek. Emin misiniz?</span>
                                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={executeDelete}>Evet, Sil</button>
                                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirmAction(null)}>İptal</button>
                                </div>
                            ) : (
                                <>
                                    <button className="admin-btn admin-btn-success admin-btn-sm" onClick={handleSave} disabled={!canEditSelected}
                                        title={!canEditSelected ? 'Bu kullanıcıyı düzenleme yetkiniz yok' : 'Değiştir'}>
                                        <Save style={{ width: 12, height: 12 }} />
                                        Değiştir
                                    </button>
                                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => requestDelete(selectedUser.id, selectedUser.displayName)}
                                        disabled={!canEditSelected || isSelf}
                                        title={isSelf ? 'Kendi hesabınızı silemezsiniz' : !canEditSelected ? 'Bu kullanıcıyı silme yetkiniz yok' : 'Sil'}>
                                        <Trash2 style={{ width: 12, height: 12 }} />
                                        Sil
                                    </button>
                                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={fetchUsers}>
                                        <RefreshCw style={{ width: 12, height: 12 }} />
                                        Yenile
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Avatar Seçici */}
                        {showAvatarPicker && (
                            <div className="admin-info-card" style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <h4 style={{ margin: 0 }}>Avatar Seç</h4>
                                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => { setEditAvatar(''); setShowAvatarPicker(false); }}>
                                        Kaldır
                                    </button>
                                </div>
                                <div className="admin-avatar-grid">
                                    {DEFAULT_AVATARS.map(url => (
                                        <div
                                            key={url}
                                            className={`admin-avatar-option ${editAvatar === url ? 'selected' : ''}`}
                                            onClick={() => { setEditAvatar(url); setShowAvatarPicker(false); }}
                                        >
                                            <img src={url} alt="" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Form Fields */}
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>İsim</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} disabled={!canEditSelected} />
                            </div>
                            <div className="admin-form-group">
                                <label>E-Posta</label>
                                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="—" disabled={!canEditSelected} />
                            </div>
                        </div>

                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>Sınıf (Rol)</label>
                                <select value={editRole} onChange={e => { const r = e.target.value; setEditRole(r); setEditPerms(getDefaultPermsForRole(r)); }} disabled={!canEditSelected || isSelf}>
                                    {allowedRoleOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                    {/* Mevcut rol listede yoksa (üst sınıf), okuma amaçlı göster */}
                                    {!allowedRoleOptions.find(o => o.value === editRole) && (
                                        <option value={editRole} disabled>{ROLE_OPTIONS.find(o => o.value === editRole)?.label || editRole}</option>
                                    )}
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label>Şifre</label>
                                <div className="admin-password-field">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={editPassword}
                                        onChange={e => setEditPassword(e.target.value)}
                                        placeholder={canEditSelected ? 'Değiştirmek için yazın...' : 'Yetkiniz yok'}
                                        disabled={!canEditSelected}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Gizle' : 'Göster'}>
                                        {showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>Giriş Sayısı</label>
                                <input type="text" value={selectedUser.loginCount || 0} readOnly style={{ opacity: 0.6 }} />
                            </div>
                        </div>

                        <div className="admin-divider" />

                        {/* ─── İzinler (Permission Grid) - Varsayılan Kapalı ─── */}
                        <div className="admin-perms-section">
                            <div
                                className="admin-perms-title"
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setShowPerms(prev => !prev)}
                            >
                                <div className="perms-icon">
                                    <Shield style={{ width: 11, height: 11, color: '#2563eb' }} />
                                </div>
                                İzinler
                                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#334155', fontWeight: 400 }}>
                                    {showPerms ? '▼ Gizle' : '▶ Göster'}
                                </span>
                            </div>
                            {showPerms && PERMISSION_GROUPS.map(group => {
                                const userRoleLevel = getRoleLevel(editRole);
                                const minRoleLevel = getRoleLevel(group.minRole);
                                const isRoleTooLow = userRoleLevel < minRoleLevel;
                                const minRoleName = ROLE_OPTIONS.find(r => r.value === group.minRole)?.label || group.minRole;
                                const currentRoleName = ROLE_OPTIONS.find(r => r.value === editRole)?.label || editRole;
                                return (
                                    <div key={group.title}>
                                        <div className="admin-perms-title">
                                            <div className="perms-icon">
                                                {isRoleTooLow
                                                    ? <AlertTriangle style={{ width: 11, height: 11, color: '#f59e0b' }} />
                                                    : <Shield style={{ width: 11, height: 11, color: '#2563eb' }} />
                                                }
                                            </div>
                                            {group.title}
                                            {isRoleTooLow && (
                                                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#f59e0b', fontWeight: 400 }}>
                                                    En az {minRoleName}
                                                </span>
                                            )}
                                        </div>
                                        {isRoleTooLow && (
                                            <div style={{
                                                padding: '8px 12px',
                                                margin: '0 0 8px',
                                                borderRadius: 8,
                                                background: 'rgba(245, 158, 11, 0.08)',
                                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                                fontSize: 12,
                                                color: '#f59e0b',
                                                lineHeight: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}>
                                                <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
                                                "{group.title}" yetkileri {currentRoleName} sınıfında çalışmaz. Bu yetkileri kullanabilmesi için en az <strong style={{ color: '#fbbf24' }}>{minRoleName}</strong> rolü gerekir.
                                            </div>
                                        )}
                                        <div className="admin-perms-grid" style={isRoleTooLow ? { opacity: 0.45, pointerEvents: 'auto' } : undefined}>
                                            {group.permissions.map(perm => (
                                                <div key={perm.key} className="admin-perm-item" onClick={() => togglePermission(perm.key)}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!editPerms[perm.key]}
                                                        onChange={() => togglePermission(perm.key)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <label>{perm.label}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ─── Animated Nickname (GodMaster Only) ─── */}
                        {currentUser?.role?.toLowerCase() === 'godmaster' && selectedUser && (
                            <>
                                <div className="admin-divider" />
                                <div className="admin-perms-section">
                                    <div className="admin-perms-title" style={{ gap: 6 }}>
                                        <Sparkles style={{ width: 13, height: 13, color: '#fbbf24' }} />
                                        Hareketli Nickname
                                        <span style={{ fontSize: 11, color: '#334155', fontWeight: 400, marginLeft: 'auto' }}>Sadece GodMaster</span>
                                    </div>

                                    {/* Toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="checkbox"
                                                checked={animatedNickEnabled}
                                                onChange={e => setAnimatedNickEnabled(e.target.checked)}
                                                style={{ accentColor: '#fbbf24' }}
                                            />
                                            Hareketli Nick Aktif
                                        </label>
                                    </div>

                                    {animatedNickEnabled && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>

                                            {/* ── Type Selector: Animated Text vs GIF ── */}
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => setAnimatedNickType('animated')}
                                                    style={{
                                                        flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                        border: animatedNickType === 'animated' ? '2px solid #a78bfa' : '1px solid rgba(148,163,184,0.12)',
                                                        background: animatedNickType === 'animated' ? 'rgba(167,139,250,0.1)' : 'rgba(226,232,240,0.4)',
                                                        color: animatedNickType === 'animated' ? '#c4b5fd' : '#6b7280',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    }}
                                                >
                                                    <Type style={{ width: 12, height: 12 }} /> Animasyonlu Metin
                                                </button>
                                                <button
                                                    onClick={() => setAnimatedNickType('gif')}
                                                    style={{
                                                        flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                        border: animatedNickType === 'gif' ? '2px solid #f472b6' : '1px solid rgba(148,163,184,0.12)',
                                                        background: animatedNickType === 'gif' ? 'rgba(244,114,182,0.1)' : 'rgba(226,232,240,0.4)',
                                                        color: animatedNickType === 'gif' ? '#f9a8d4' : '#6b7280',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    }}
                                                >
                                                    <Image style={{ width: 12, height: 12 }} /> GIF Nickname
                                                </button>
                                            </div>

                                            {/* ── Animated Text Options ── */}
                                            {animatedNickType === 'animated' && (
                                                <>
                                                    {/* Animation Selector */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                                        {[
                                                            { cls: 'shimmer-gold', label: 'Altın Parıltı' },
                                                            { cls: 'neon-pulse', label: 'Neon Nabız' },
                                                            { cls: 'fire-glow', label: 'Ateş Parıltı' },
                                                            { cls: 'ice-shimmer', label: 'Buz Parıltı' },
                                                            { cls: 'matrix-glow', label: 'Matrix' },
                                                            { cls: 'royal-glow', label: 'Kraliyet' },
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.cls}
                                                                onClick={() => setAnimatedNickClass(opt.cls)}
                                                                style={{
                                                                    padding: '8px 6px',
                                                                    borderRadius: 8,
                                                                    border: animatedNickClass === opt.cls ? '2px solid #fbbf24' : '1px solid rgba(148,163,184,0.12)',
                                                                    background: animatedNickClass === opt.cls ? 'rgba(251,191,36,0.08)' : 'rgba(226,232,240,0.4)',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.2s',
                                                                }}
                                                            >
                                                                <span className={`animated-nick-preview ${opt.cls}`} style={{ fontSize: animatedNickFontSize }}>
                                                                    {editName || selectedUser.displayName}
                                                                </span>
                                                                <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{opt.label}</div>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Font Size Slider */}
                                                    <div style={{ padding: '4px 0' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Yazı Boyutu</span>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{animatedNickFontSize}px</span>
                                                        </div>
                                                        <input
                                                            type="range" min={11} max={22} value={animatedNickFontSize}
                                                            onChange={e => setAnimatedNickFontSize(Number(e.target.value))}
                                                            style={{ width: '100%', accentColor: '#fbbf24' }}
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#1e293b' }}>
                                                            <span>Küçük</span>
                                                            <span>Büyük</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* ── GIF Options ── */}
                                            {animatedNickType === 'gif' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <label
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                                                border: '2px dashed rgba(244,114,182,0.3)',
                                                                background: 'rgba(244,114,182,0.04)',
                                                                color: '#f9a8d4', fontSize: 11, fontWeight: 700,
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,114,182,0.6)'; e.currentTarget.style.background = 'rgba(244,114,182,0.08)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(244,114,182,0.3)'; e.currentTarget.style.background = 'rgba(244,114,182,0.04)'; }}
                                                        >
                                                            <Image style={{ width: 14, height: 14 }} />
                                                            {animatedNickGifUrl ? 'GIF Değiştir' : 'GIF Yükle'}
                                                            <input
                                                                type="file"
                                                                accept="image/gif"
                                                                style={{ display: 'none' }}
                                                                onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const reader = new FileReader();
                                                                    reader.onload = () => {
                                                                        setAnimatedNickGifUrl(reader.result as string);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    {animatedNickGifUrl && (
                                                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: 8, background: 'rgba(226,232,240,0.5)', borderRadius: 8, border: '1px solid rgba(148,163,184,0.12)' }}>
                                                            <img
                                                                src={animatedNickGifUrl}
                                                                alt="GIF Önizleme"
                                                                style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain', borderRadius: 6 }}
                                                            />
                                                            <button
                                                                onClick={() => setAnimatedNickGifUrl('')}
                                                                style={{
                                                                    position: 'absolute', top: 4, right: 4,
                                                                    width: 18, height: 18, borderRadius: '50%',
                                                                    background: 'rgba(239,68,68,0.8)', border: 'none',
                                                                    color: 'white', fontSize: 12, cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                }}
                                                                title="GIF'i Kaldır"
                                                            >
                                                                <X style={{ width: 10, height: 10 }} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ── Avatar Visibility Toggle ── */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={animatedNickShowAvatar}
                                                        onChange={e => setAnimatedNickShowAvatar(e.target.checked)}
                                                        style={{ accentColor: '#60a5fa' }}
                                                    />
                                                    {animatedNickShowAvatar ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Eye style={{ width: 12, height: 12, color: '#60a5fa' }} /> Avatar Görünsün
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <EyeOff style={{ width: 12, height: 12, color: '#334155' }} /> Avatar Gizli
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="admin-divider" />

                        {/* ─── Jeton Yükleme ─── */}
                        <div style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.06))',
                            border: '1px solid rgba(37,99,235,0.18)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 16 }}>🪙</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f' }}>Jeton Yönetimi</span>
                                <span style={{
                                    marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                                    color: '#1e3a5f', background: 'rgba(37,99,235,0.1)',
                                    padding: '3px 10px', borderRadius: 6,
                                    border: '1px solid rgba(37,99,235,0.15)',
                                }}>
                                    Bakiye: <span style={{ color: '#2563eb' }}>{selectedUser?.balance ?? 0}</span> | Puan: <span style={{ color: '#7c3aed' }}>{selectedUser?.points ?? 0}</span>
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="number"
                                    value={tokenAmount}
                                    onChange={e => setTokenAmount(e.target.value)}
                                    placeholder="Miktar"
                                    min="1"
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                                        background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(37,99,235,0.15)',
                                        color: '#1e293b', outline: 'none',
                                    }}
                                />
                                <button
                                    className="admin-btn admin-btn-primary admin-btn-sm"
                                    onClick={handleAddBalance}
                                    disabled={tokenLoading || !tokenAmount || parseInt(tokenAmount) <= 0}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {tokenLoading ? '...' : '💰 Yükle'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
