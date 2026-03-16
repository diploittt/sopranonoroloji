import React, { useState, useEffect, useRef } from 'react';

import { io, Socket } from 'socket.io-client';

import { SOCKET_URL_BASE } from '@/lib/api';

import { useRouter } from 'next/navigation';

import {

    LayoutDashboard,

    Users,

    Wallet,

    Settings,

    LogOut,

    Search,

    Bell,

    TrendingUp,

    AlertCircle,

    UserPlus,

    Filter,

    Download,

    ChevronDown,

    ExternalLink,

    MoreVertical,

    ShieldCheck,

    Lock,

    Unlock,

    Ban,

    Trash2,

    CheckCircle,

    X,

    Megaphone,

    ScrollText,

    Pencil,

    LayoutGrid,

    Users2,

    CodeXml,

    Infinity,

    Video,

    VideoOff,

    Mail,

    Phone,

    Globe,

    Cpu,

    Briefcase,

    Server,

    Activity,

    Zap,

    Crown,

    BellRing,

    PlusCircle,

    Undo2,

    KeyRound,

    Shield,

    ShoppingBag,

    Calendar,

    Clock,

    AlertTriangle,

    EyeOff,

    RefreshCw,

    Wifi,

    Inbox,

    Eye,

    MailOpen,

    XCircle,

    Copy,

    Loader2,

    Check,

    Link2,

    UserCog,

    BarChart3

} from 'lucide-react';

import { useAdminStore } from '@/lib/admin/store';

import { Tenant } from '@/lib/admin/types';

import { removeAuthUser } from '@/lib/auth';

import { API_URL } from '@/lib/api';

import { adminApi } from '@/lib/admin/api';

import NewClientModal from './NewClientModal';

import EditCustomerModal from './EditCustomerModal';

import MemberModal from './MemberModal';

import SystemLogsModal from './SystemLogsModal';

import ToastContainer from '@/components/ui/ToastContainer';

import Image from 'next/image';



export default function OwnerPanel() {

    const router = useRouter();

    const [adminUser, setAdminUser] = useState<{ id?: string; displayName?: string; role?: string; avatarUrl?: string; email?: string } | null>(null);



    // Auth check — redirect to login if no token

    useEffect(() => {

        const token = sessionStorage.getItem('soprano_admin_token');

        if (!token) {

            router.replace('/riconun-odasi');

            return;

        }

        try {

            const userStr = localStorage.getItem('soprano_admin_user');

            if (userStr) setAdminUser(JSON.parse(userStr));

        } catch { /* ignore */ }

    }, [router]);



    const [drawers, setDrawers] = useState({

        newClient: false,

        announcement: false,

        logs: false,

        hqMembers: false,

        codes: false,

        orders: false

    });



    // Active view state — hydration-safe: her zaman 'dashboard' ile başla, mount sonrası hash'den oku

    const [activeView, setActiveViewState] = useState<'dashboard' | 'customers' | 'finance' | 'settings' | 'hqMembers' | 'contactMessages' | 'logs' | 'orders'>('dashboard');



    // Mount sonrası URL hash'den aktif sekmeyi oku (hydration-safe)

    useEffect(() => {

        const hash = window.location.hash.replace('#', '');

        const validViews = ['dashboard', 'customers', 'finance', 'settings', 'hqMembers', 'contactMessages', 'logs', 'orders'];

        if (validViews.includes(hash)) {

            setActiveViewState(hash as any);

        }

    }, []);



    // activeView değiştiğinde URL hash'i güncelle

    const setActiveView = (view: typeof activeView) => {

        setActiveViewState(view);

        window.location.hash = view;

    };



    // Orders inline state

    const [inlineOrders, setInlineOrders] = useState<any[]>([]);

    const [ordersLoading, setOrdersLoading] = useState(false);

    const [pendingOrderCount, setPendingOrderCount] = useState(0);

    const socketRef = useRef<Socket | null>(null);

    const [ordersError, setOrdersError] = useState('');

    const [orderConfirm, setOrderConfirm] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type: 'warning' | 'danger' }>({

        isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'warning'

    });



    const fetchInlineOrders = async () => {

        setOrdersLoading(true); setOrdersError('');

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });

            if (!res.ok) throw new Error('Siparişler yüklenemedi');

            const data = await res.json();

            setInlineOrders(data.orders || []);

        } catch { setOrdersError('Veri çekme hatası'); }

        setOrdersLoading(false);

    };



    const orderStatusClick = (id: string, status: string) => {

        const isApprove = status === 'APPROVED';

        setOrderConfirm({

            isOpen: true,

            title: isApprove ? 'Siparişi Onayla' : 'Siparişi Reddet',

            message: isApprove

                ? 'Bu siparişi onaylamak istediğinize emin misiniz? Sistem otomatik olarak müşteri hesabını ve odaları oluşturacaktır.'

                : 'Bu siparişi reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz.',

            type: isApprove ? 'warning' : 'danger',

            onConfirm: () => orderUpdateStatus(id, status)

        });

    };



    const orderUpdateStatus = async (id: string, status: string) => {

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {

                method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

                body: JSON.stringify({ status })

            });

            if (!res.ok) throw new Error('Güncelleme başarısız');

            const result = await res.json();

            if (result.provision) {

                const tenantSlug = result.provision.tenant?.slug;

                const accessLink = `${window.location.origin}/t/${tenantSlug}`;

                const embedCode = `<iframe src="${window.location.origin}/embed/${tenantSlug}" width="100%" height="1000" frameborder="0" allow="camera; microphone; fullscreen; display-capture" style="border:none;border-radius:12px;max-width:1300px;"></iframe>`;

                const loginInfo = `Email: ${result.provision.ownerEmail}\nŞifre: ${result.provision.ownerPassword}`;

                addToast(`✅ Sipariş ONAYLANDI — Müşteri otomatik oluşturuldu!\n\n🔗 Erişim Linki: ${accessLink}\n👤 ${loginInfo}`, 'success');

                // Copy all info to clipboard automatically

                const allInfo = `--- MÜŞTERİ BİLGİLERİ ---\nErişim Linki: ${accessLink}\nEmbed Kodu: ${embedCode}\n${loginInfo}\nAccess Code: ${result.provision.tenant?.accessCode || '—'}`;

                navigator.clipboard.writeText(allInfo).catch(() => {});

            } else if (result.provisionError) {

                addToast(`âš ️ Sipariş onaylandı fakat provision hatası: ${result.provisionError}`, 'error');

            } else {

                addToast(`Sipariş durumu ${status === 'APPROVED' ? 'ONAYLANDI' : 'REDDEDİLDİ'} olarak güncellendi.`, 'success');

            }

            fetchInlineOrders();

        } catch { addToast('Durum güncellenirken bir hata oluştu.', 'error'); }

    };



    const orderDelete = (id: string) => {

        setOrderConfirm({

            isOpen: true, title: 'Siparişi Sil',

            message: 'Bu siparişi kalıcı olarak silmek istediğinize emin misiniz?',

            type: 'danger',

            onConfirm: async () => {

                try {

                    const token = sessionStorage.getItem('soprano_admin_token');

                    await fetch(`${API_URL}/admin/orders/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

                    addToast('Sipariş silindi.', 'success');

                    fetchInlineOrders();

                } catch { addToast('Sipariş silinirken hata oluştu.', 'error'); }

            }

        });

    };



    const copyText = (t: string) => { navigator.clipboard.writeText(t).catch(() => { }); addToast('Kopyalandı!', 'success'); };



    useEffect(() => {

        if (activeView === 'orders') {

            fetchInlineOrders();

            setPendingOrderCount(0);

        }

    }, [activeView]);



    // Mount'ta bekleyen sipariş sayısını çek + socket listener kur

    useEffect(() => {

        // Pending count API

        const fetchPendingCount = async () => {

            try {

                const token = sessionStorage.getItem('soprano_admin_token');

                const res = await fetch(`${API_URL}/admin/orders/pending-count`, {

                    headers: { Authorization: `Bearer ${token}` },

                });

                if (res.ok) {

                    const data = await res.json();

                    setPendingOrderCount(data.pendingCount || 0);

                }

            } catch { /* ignore */ }

        };

        fetchPendingCount();



        // Socket.IO bağlantısı — admin:new_order dinle

        const token = sessionStorage.getItem('soprano_admin_token');

        let mounted = true;

        let socketTimer: ReturnType<typeof setTimeout>;

        if (token) {

            socketTimer = setTimeout(() => {

                if (!mounted) return;

                const socket = io(SOCKET_URL_BASE, {

                    auth: { token },

                    transports: ['websocket', 'polling'],

                });

                socketRef.current = socket;



                socket.on('admin:new_order', (data: any) => {

                    setPendingOrderCount(data.pendingCount || 0);

                    const name = data.order?.firstName ? `${data.order.firstName} ${data.order.lastName || ''}`.trim() : 'Bilinmeyen';

                    addToast(`🛒 Yeni sipariş: ${name} — ${data.order?.packageName || 'Paket'}`, 'success');

                    fetchInlineOrders();

                });

            }, 500);



            return () => {

                mounted = false;

                clearTimeout(socketTimer);

                socketRef.current?.disconnect();

                socketRef.current = null;

            };

        }

    }, []);



    // System Logs state

    const [systemLogs, setSystemLogs] = useState<any[]>([]);

    const [logTotal, setLogTotal] = useState(0);

    const [logPage, setLogPage] = useState(1);

    const [logFilter, setLogFilter] = useState('');

    const [logLoading, setLogLoading] = useState(false);



    const fetchSystemLogs = async () => {

        setLogLoading(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const params = new URLSearchParams();

            params.set('page', String(logPage));

            params.set('limit', '25');

            if (logFilter) params.set('event', logFilter);

            const res = await fetch(`${API_URL}/admin/system-logs?${params}`, {

                headers: { 'Authorization': `Bearer ${token}` },

            });

            if (res.ok) {

                const data = await res.json();

                setSystemLogs(data.logs || []);

                setLogTotal(data.total || 0);

            }

        } catch { /* ignore */ }

        setLogLoading(false);

    };



    useEffect(() => {

        if (activeView === 'logs') fetchSystemLogs();

    }, [activeView, logPage, logFilter]);



    // Contact messages state

    const [contactMessages, setContactMessages] = useState<any[]>([]);

    const [contactMsgLoading, setContactMsgLoading] = useState(false);

    const [contactMsgSelected, setContactMsgSelected] = useState<any | null>(null);

    const [unreadCount, setUnreadCount] = useState(0);



    // HQ Admin Members state

    const [hqMembers, setHqMembers] = useState<any[]>([]);

    const [hqMembersLoading, setHqMembersLoading] = useState(false);

    const [hqSearch, setHqSearch] = useState('');



    // Yardımcı ekleme state

    const [showAddHelper, setShowAddHelper] = useState(false);

    const [newHelper, setNewHelper] = useState({ displayName: '', email: '', password: '', role: 'admin' });

    const [addingHelper, setAddingHelper] = useState(false);



    // Şifre değiştirme state

    const [passwordEditId, setPasswordEditId] = useState<string | null>(null);

    const [newPassword, setNewPassword] = useState('');

    const [savingPassword, setSavingPassword] = useState(false);



    // Kullanıcı adı değiştirme state

    const [usernameEditId, setUsernameEditId] = useState<string | null>(null);

    const [newDisplayName, setNewDisplayName] = useState('');

    const [savingUsername, setSavingUsername] = useState(false);



    // Bakiye yönetimi state

    const [balanceEditId, setBalanceEditId] = useState<string | null>(null);

    const [balanceAmount, setBalanceAmount] = useState('');

    const [balanceOp, setBalanceOp] = useState<'add' | 'subtract' | 'set'>('add');

    const [savingBalance, setSavingBalance] = useState(false);



    // Toplu jeton dağıtımı state

    const [showBulkBalance, setShowBulkBalance] = useState(false);

    const [bulkAmount, setBulkAmount] = useState('');

    const [bulkRoles, setBulkRoles] = useState<string[]>([]);

    const [bulkLoading, setBulkLoading] = useState(false);

    const [bulkResult, setBulkResult] = useState<string | null>(null);



    const isGodMaster = adminUser?.role === 'owner' || adminUser?.role === 'superadmin' || adminUser?.role === 'godmaster';



    // ── Profil düzenleme state'leri ──

    const [editingProfile, setEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({ displayName: '', email: '', avatarUrl: '' });

    const [savingProfile, setSavingProfile] = useState(false);



    const loadHqMembers = async () => {

        setHqMembersLoading(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users?limit=100`, {

                headers: { 'Authorization': `Bearer ${token}` }

            });

            const data = await res.json();

            const users = data.users || [];

            // Sadece admin-login panel yetkili rolleri göster (oda kullanıcıları hariç)

            const adminRoles = ['godmaster', 'owner', 'superadmin', 'admin'];

            let filtered = users.filter((u: any) => adminRoles.includes(u.role?.toLowerCase()));

            // Yardımcı giriş yaptığında GodMaster'ı göremez (backend zaten filtreler ama frontend'de de kontrol)

            if (!isGodMaster) {

                filtered = filtered.filter((u: any) => u.role !== 'godmaster' && u.role !== 'owner' && u.role !== 'superadmin');

            }

            setHqMembers(filtered);

        } catch (error) {

            console.error('HQ members load error:', error);

        } finally {

            setHqMembersLoading(false);

        }

    };



    const loadContactMessages = async () => {

        setContactMsgLoading(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/contact-messages`, {

                headers: { 'Authorization': `Bearer ${token}` }

            });

            const data = await res.json();

            const msgs = data.messages || [];

            setContactMessages(msgs);

            setUnreadCount(msgs.filter((m: any) => !m.isRead).length);

        } catch (error) {

            console.error('Contact messages load error:', error);

        } finally {

            setContactMsgLoading(false);

        }

    };



    const markContactMessageRead = async (id: string) => {

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            await fetch(`${API_URL}/admin/contact-messages/${id}/read`, {

                method: 'PATCH',

                headers: { 'Authorization': `Bearer ${token}` }

            });

            setContactMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));

            setUnreadCount(prev => Math.max(0, prev - 1));

        } catch { }

    };



    const deleteContactMsg = async (id: string, wasUnread: boolean) => {

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            await fetch(`${API_URL}/admin/contact-messages/${id}`, {

                method: 'DELETE',

                headers: { 'Authorization': `Bearer ${token}` }

            });

            setContactMessages(prev => prev.filter(m => m.id !== id));

            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));

        } catch { }

    };



    const handleAddHelper = async () => {

        if (!newHelper.displayName || !newHelper.email || !newHelper.password) return;

        setAddingHelper(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/members`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                body: JSON.stringify({

                    displayName: newHelper.displayName,

                    email: newHelper.email,

                    password: newHelper.password,

                    role: newHelper.role,

                })

            });

            if (!res.ok) throw new Error('Ekleme başarısız');

            addToast('Yardımcı başarıyla eklendi ✅', 'success');

            setNewHelper({ displayName: '', email: '', password: '', role: 'admin' });

            setShowAddHelper(false);

            loadHqMembers();

        } catch (error) {

            addToast('Yardımcı eklenemedi!', 'error');

        } finally {

            setAddingHelper(false);

        }

    };



    const handleChangePassword = async (userId: string) => {

        if (!newPassword || newPassword.length < 4) {

            addToast('Şifre en az 4 karakter olmalı!', 'error');

            return;

        }

        setSavingPassword(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users/${userId}`, {

                method: 'PATCH',

                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                body: JSON.stringify({ password: newPassword })

            });

            if (!res.ok) throw new Error('Şifre güncellenemedi');

            addToast('Şifre başarıyla güncellendi 🔑', 'success');

            setPasswordEditId(null);

            setNewPassword('');

        } catch (error) {

            addToast('Şifre güncellenemedi!', 'error');

        } finally {

            setSavingPassword(false);

        }

    };



    const handleChangeUsername = async (userId: string) => {

        if (!newDisplayName || newDisplayName.length < 2) {

            addToast('Kullanıcı adı en az 2 karakter olmalı!', 'error');

            return;

        }

        setSavingUsername(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users/${userId}`, {

                method: 'PATCH',

                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                body: JSON.stringify({ displayName: newDisplayName })

            });

            if (!res.ok) throw new Error('Kullanıcı adı güncellenemedi');

            addToast('Kullanıcı adı güncellendi ✅', 'success');

            setUsernameEditId(null);

            setNewDisplayName('');

            loadHqMembers();

        } catch (error) {

            addToast('Kullanıcı adı güncellenemedi!', 'error');

        } finally {

            setSavingUsername(false);

        }

    };



    const handleBalanceUpdate = async (userId: string) => {

        if (!balanceAmount || isNaN(Number(balanceAmount))) return;

        setSavingBalance(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users/${userId}/balance`, {

                method: 'PATCH',

                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },

                body: JSON.stringify({ amount: Number(balanceAmount), operation: balanceOp }),

            });

            const data = await res.json();

            if (data.success) {

                addToast(`${data.displayName} bakiyesi güncellendi: ${data.balance} jeton ✅`, 'success');

                setBalanceEditId(null);

                setBalanceAmount('');

                loadHqMembers();

            } else {

                addToast(`Hata: ${data.message || 'Bakiye güncellenemedi'}`, 'error');

            }

        } catch (error) {

            addToast('Bakiye güncellenemedi!', 'error');

        } finally {

            setSavingBalance(false);

        }

    };



    const handleDeleteHelper = async (userId: string) => {

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users/${userId}`, {

                method: 'DELETE',

                headers: { 'Authorization': `Bearer ${token}` }

            });

            if (!res.ok) throw new Error('Silme başarısız');

            addToast('Yardımcı silindi 🗑️', 'success');

            loadHqMembers();

        } catch (error) {

            addToast('Yardımcı silinemedi!', 'error');

        }

    };



    // ── Profil güncelleme handler ──

    const handleSaveProfile = async () => {

        if (!adminUser?.id) return;

        setSavingProfile(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/users/${adminUser.id}`, {

                method: 'PATCH',

                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                body: JSON.stringify({

                    displayName: profileForm.displayName || undefined,

                    email: profileForm.email || undefined,

                    avatarUrl: profileForm.avatarUrl || undefined,

                }),

            });

            if (!res.ok) throw new Error('Güncelleme başarısız');

            const updated = { ...adminUser, ...profileForm };

            setAdminUser(updated);

            localStorage.setItem('soprano_admin_user', JSON.stringify(updated));

            addToast('Profil güncellendi ✅', 'success');

            setEditingProfile(false);

        } catch (error) {

            addToast('Profil güncellenemedi!', 'error');

        } finally {

            setSavingProfile(false);

        }

    };



    useEffect(() => {

        if (activeView === 'hqMembers') {

            loadHqMembers();

        }

    }, [activeView]);



    const [searchQuery, setSearchQuery] = useState('');

    const [codesClientName, setCodesClientName] = useState('');

    const [announcementText, setAnnouncementText] = useState('');

    const [announcementSending, setAnnouncementSending] = useState(false);

    const [pastAnnouncements, setPastAnnouncements] = useState<{ id: string; message: string; createdAt: string }[]>([]);

    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

    const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

    const [editAnnouncementText, setEditAnnouncementText] = useState('');

    const [overdueTenants, setOverdueTenants] = useState<{ id: string; name: string; displayName: string | null; email: string | null; expiresAt: string | null; paymentReminderAt: string | null }[]>([]);

    const [loadingOverdue, setLoadingOverdue] = useState(false);

    const [sendingReminder, setSendingReminder] = useState<Record<string, boolean>>({});

    const [adminStats, setAdminStats] = useState<{ onlineUsers: number; paymentDue: number; activeSpeakers?: number; activeRooms?: number; system?: { uptimeSeconds: number; memoryMB: number; heapUsedMB: number; heapTotalMB: number }; recentLogs?: any[] }>({ onlineUsers: 0, paymentDue: 0 });

    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');

    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [showNotifPanel, setShowNotifPanel] = useState(false);

    const [notifications, setNotifications] = useState<{ id: string; message: string; createdAt: string }[]>([]);



    // Edit Client Modal State

    const [editClientModal, setEditClientModal] = useState({

        isOpen: false,

        clientId: ''

    });



    // Tenant Members Modal State

    const [tenantMembersModal, setTenantMembersModal] = useState({

        isOpen: false,

        tenantId: '',

        tenantName: ''

    });



    // Delete Confirmation State

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const [systemTenantId, setSystemTenantId] = useState<string | null>(null);

    const [systemTenantActive, setSystemTenantActive] = useState(true);



    // ── Müşteri Detay (Odalar & Üyeler) ──

    const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

    const [tenantRooms, setTenantRooms] = useState<any[]>([]);

    const [tenantMembers, setTenantMembers] = useState<any[]>([]);

    const [tenantDetailLoading, setTenantDetailLoading] = useState(false);



    // ── Site Ayarları (Panel Ayarları) ──

    const [settingsTab, setSettingsTab] = useState<'pricing' | 'banks' | 'branding' | 'contact' | 'theme' | 'homepage' | 'general' | 'rooms'>('pricing');

    const [roomConfigTab, setRoomConfigTab] = useState<'design' | 'toolbar' | 'permissions' | 'chat' | 'layout' | 'media'>('design');

    const [siteConfig, setSiteConfig] = useState<any>({

        siteTitle: 'SopranoChat', siteSlogan: 'Premium Sohbet Platformu', footerText: '',

        pricing: {

            p1Monthly: '990', p1Yearly: '9.900', p1Name: 'Ses + Metin',

            p2Monthly: '1.390', p2Yearly: '13.900', p2Name: 'Kamera + Ses',

            p3Monthly: '6.990', p3Yearly: '69.900', p3Name: 'White Label',

            yearlyDiscount: '2 Ay Hediye 🎁',

        },

        banks: [

            { bank: 'VakıfBank', name: 'Soprano Bilişim A.Ş.', iban: 'TR12 0001 5001 5800 7307 6543 21' },

            { bank: 'İş Bankası', name: 'Soprano Bilişim A.Ş.', iban: 'TR34 0006 4000 0011 2345 6789 01' },

            { bank: 'Halkbank', name: 'Soprano Bilişim A.Ş.', iban: 'TR56 0001 2009 8760 0010 0001 23' },

            { bank: 'Akbank', name: 'Soprano Bilişim A.Ş.', iban: 'TR78 0004 6006 1388 8000 0123 45' },

        ],

        contact: { phone: '', whatsapp: '', email: '', address: '' },

        roomConfig: {

            design: {

                bgType: 'gradient', bgColor1: '#0a0a12', bgColor2: '#1a1a2e',

                bgImage: '', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)',

                accentColor: '#6366f1', headerBg: 'rgba(10,10,18,0.9)',

            },

            toolbar: {

                showEmoji: true, showSticker: true, showGif: true,

                showCamera: true, showMic: true, showVolume: true,

                showSettings: true, showHandRaise: true, showThemeSwitcher: true,

                buttonSize: 'normal', position: 'bottom',

                buttonOrder: ['mic', 'camera', 'emoji', 'sticker', 'gif', 'volume', 'settings', 'handRaise'],

            },

            permissions: {

                guest: { mic: true, camera: true, emoji: true, sticker: true, gif: true, dm: false, profile: true, changeNick: true },

                member: { mic: true, camera: true, emoji: true, sticker: true, gif: true, dm: true, profile: true, changeNick: true },

                vip: { mic: true, camera: true, emoji: true, sticker: true, gif: true, dm: true, profile: true, changeNick: true },

                operator: { mic: true, camera: true, emoji: true, sticker: true, gif: true, dm: true, profile: true, changeNick: true, kick: true, ban: true, mute: true },

                admin: { mic: true, camera: true, emoji: true, sticker: true, gif: true, dm: true, profile: true, changeNick: true, kick: true, ban: true, mute: true, manageRooms: true },

            },

            chat: {

                maxMessageLength: 500, fontSize: 14, fontFamily: 'Inter',

                antiFlood: true, antiFloodDelay: 3, showTimestamps: true,

                bubbleStyle: 'modern', showAvatars: true, showRoleIcons: true,

            },

            layout: {

                sidebarWidth: 280, rightPanelWidth: 320,

                chatAreaFlex: 1, showRadioPlayer: true,

                showRoomTabs: true, mobileLayout: 'auto',

            },

            media: {

                allowYoutube: true, radioUrl: '',

                stickerPacks: 'default', gifApiKey: '',

                maxUploadSize: 5,

            },

        },

        homepage: {

            bodyGradient1: '#a3ace5', bodyGradient2: '#c4c9ee', bodyGradient3: '#d8dbf4',

            mainBg: '#7a7e9e',

            headerGradient1: '#5a6070', headerGradient2: '#3d4250', headerGradient3: '#1e222e', headerGradient4: '#282c3a', headerGradient5: '#3a3f50',

            heroTitle: '', heroSubtitle: '', heroCTA1: 'Hemen Başla', heroCTA2: 'Detaylı Bilgi',

            navItems: [

                { label: 'HOME', section: 'home', visible: true },

                { label: 'ODALAR', section: '_odalar', visible: true },

                { label: 'REHBER', section: 'rehber', visible: true },

                { label: 'FİYATLAR', section: 'fiyatlar', visible: true },

                { label: 'REFERANSLAR', section: 'referanslar', visible: true },

                { label: 'İLETİŞİM', section: 'iletisim', visible: true },

            ],

            loginBg: 'rgba(30,41,59,0.85)', loginCardBorder: 'rgba(255,255,255,0.15)',

            loginAccentColor: '#38bdf8',

            showCookieConsent: true, showPackages: true, showReferences: true, showGuide: true,

            featureCards: [

                { icon: '🎤', title: 'Kristal Ses', desc: 'HD kalitesinde kesintisiz sesli sohbet' },

                { icon: '📹', title: 'HD Kamera', desc: 'Yüksek çözünürlüklü video görüşme' },

                { icon: '👥', title: 'Topluluk', desc: 'Binlerce aktif kullanıcı ile sohbet' },

                { icon: '🛡️', title: 'Güvenlik', desc: 'Gelişmiş moderasyon ve güvenlik araçları' },

            ],

        },

    });

    const [siteConfigLoading, setSiteConfigLoading] = useState(false);

    const [siteConfigSaving, setSiteConfigSaving] = useState(false);

    const [siteLogoUrl, setSiteLogoUrl] = useState('');

    const [siteLogoName, setSiteLogoName] = useState('SopranoChat');



    // Site config'i backend'den çek (tenant-specific settings)

    const fetchSiteConfig = async () => {

        setSiteConfigLoading(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });

            if (res.ok) {

                const data = await res.json();

                if (data.siteConfig) {

                    setSiteConfig((prev: any) => ({ ...prev, ...(typeof data.siteConfig === 'object' ? data.siteConfig : {}) }));

                }

                if (data.logoUrl) setSiteLogoUrl(data.logoUrl);

                if (data.logoName) setSiteLogoName(data.logoName);

            }

        } catch { }

        setSiteConfigLoading(false);

    };



    // Site config'i kaydet

    const saveSiteConfig = async () => {

        setSiteConfigSaving(true);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const tenantId = systemTenantId || 'system';

            // Settings endpoint'ine PUT et

            const res = await fetch(`${API_URL}/admin/settings`, {

                method: 'PATCH',

                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },

                body: JSON.stringify({ siteConfig, logoUrl: siteLogoUrl, logoName: siteLogoName }),

            });

            if (res.ok) { addToast('Site ayarları kaydedildi ✅', 'success'); window.dispatchEvent(new Event('siteconfig-updated')); }

            else { addToast('Kaydetme hatası', 'error'); }

        } catch { addToast('Kaydetme hatası', 'error'); }

        setSiteConfigSaving(false);

    };





    // Settings view açıldığında config'i çek

    useEffect(() => { if (activeView === 'settings') fetchSiteConfig(); }, [activeView]);



    const loadTenantDetails = async (tenantId: string) => {

        if (expandedTenantId === tenantId) { setExpandedTenantId(null); return; }

        setExpandedTenantId(tenantId);

        setTenantDetailLoading(true);

        setTenantRooms([]); setTenantMembers([]);

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const headers = { Authorization: `Bearer ${token}` };

            const [roomsRes, membersRes] = await Promise.all([

                fetch(`${API_URL}/admin/customers/${tenantId}/rooms`, { headers }),

                fetch(`${API_URL}/admin/customers/${tenantId}/members`, { headers }),

            ]);

            if (roomsRes.ok) { const d = await roomsRes.json(); setTenantRooms(Array.isArray(d) ? d : d.rooms || []); }

            if (membersRes.ok) { const d = await membersRes.json(); setTenantMembers(Array.isArray(d) ? d : d.members || []); }

        } catch (e: any) { addToast('Müşteri detayları yüklenemedi: ' + e.message, 'error'); }

        setTenantDetailLoading(false);

    };



    const handleGodMasterEnter = async (tenantId: string, roomSlug?: string) => {

        try {

            const token = sessionStorage.getItem('soprano_admin_token');

            const res = await fetch(`${API_URL}/admin/customers/${tenantId}/godmaster-token`, {

                method: 'POST',

                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },

            });

            if (!res.ok) throw new Error('Token alınamadı');

            const data = await res.json();

            const godmasterToken = data.access_token;

            const tenantSlug = data.slug;

            if (!godmasterToken || !tenantSlug) throw new Error('Token veya slug alınamadı');

            const url = `${window.location.origin}/t/${tenantSlug}?godmaster_token=${godmasterToken}${roomSlug ? '&room=' + roomSlug : ''}`;

            window.open(url, '_blank');

        } catch (e: any) { addToast('GodMaster giriş hatası: ' + e.message, 'error'); }

    };



    const addToast = useAdminStore((state) => state.addToast);

    const tenants = useAdminStore((state) => state.tenants);

    const loadInitialData = useAdminStore((state) => state.loadInitialData);

    const deleteTenant = useAdminStore((state) => state.deleteTenant);

    const updateTenant = useAdminStore((state) => state.updateTenant);



    // Load tenant data from backend on mount

    useEffect(() => {

        loadInitialData();

        // Fetch system tenant ID separately (excluded from getCustomers)

        (async () => {

            try {

                const token = sessionStorage.getItem('soprano_admin_token');

                const res = await fetch(`${API_URL}/admin/customers/system-tenant`, {

                    headers: { 'Authorization': `Bearer ${token}` }

                });

                if (res.ok) {

                    const data = await res.json();

                    if (data?.id) {

                        setSystemTenantId(data.id);

                        setSystemTenantActive(data.status === 'ACTIVE');

                    }

                }

            } catch { /* ignore */ }

        })();

    }, [loadInitialData]);



    // Müşteriler sekmesine geçildiğinde verileri yeniden yükle

    useEffect(() => {

        if (activeView === 'customers') {

            loadInitialData();

        }

    }, [activeView, loadInitialData]);



    // Stats polling — her 10 saniyede bir güncelle

    useEffect(() => {

        const fetchStats = async () => {

            try {

                const token = sessionStorage.getItem('soprano_admin_token');

                const res = await fetch(`${API_URL}/admin/stats`, {

                    headers: { 'Authorization': `Bearer ${token}` },

                });

                if (res.ok) {

                    const data = await res.json();

                    setAdminStats(data);

                }

            } catch { /* ignore */ }

        };

        fetchStats();

        const interval = setInterval(fetchStats, 10000);

        return () => clearInterval(interval);

    }, []);



    // Son duyuruları yükle

    useEffect(() => {

        const fetchNotifs = async () => {

            try {

                const token = sessionStorage.getItem('soprano_admin_token');

                const res = await fetch(`${API_URL}/admin/announcements`, {

                    headers: { 'Authorization': `Bearer ${token}` },

                });

                if (res.ok) {

                    const data = await res.json();

                    setNotifications(data);

                    setPastAnnouncements(data);

                }

                // Vadesi geçmiş müşterileri de yükle

                const res2 = await fetch(`${API_URL}/admin/overdue-tenants`, {

                    headers: { 'Authorization': `Bearer ${token}` },

                });

                if (res2.ok) setOverdueTenants(await res2.json());

            } catch { /* ignore */ }

        };

        fetchNotifs();

    }, []);



    // İletişim mesajlarını başlangıçta yükle (bell badge için)

    useEffect(() => {

        loadContactMessages();

        const msgInterval = setInterval(loadContactMessages, 30000);

        return () => clearInterval(msgInterval);

    }, []);



    // CSV Dışa Aktarma

    const exportCSV = () => {

        const headers = ['Müşteri', 'Domain', 'Durum', 'Oda Limiti', 'Bitiş Tarihi', 'E-posta', 'Telefon'];

        const rows = tenants.map(t => [

            t.name || '', t.domain || '', t.status || '', t.roomLimit || '',

            t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('tr-TR') : '',

            (t as any).email || '', (t as any).phone || ''

        ]);

        const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;

        a.download = `musteriler_${new Date().toISOString().slice(0, 10)}.csv`;

        a.click();

        URL.revokeObjectURL(url);

        showToast('CSV dosyası indirildi 📥');

    };



    const toggleDrawer = (drawer: keyof typeof drawers, isOpen: boolean) => {

        setDrawers(prev => ({ ...prev, [drawer]: isOpen }));

    };



    const showToast = (message: string) => {

        addToast(message, 'success');

    };



    const openEditModal = (clientId: string) => {

        setEditClientModal({ isOpen: true, clientId });

    };



    const closeEditModal = () => {

        setEditClientModal({ isOpen: false, clientId: '' });

    };



    const openCodeDrawer = (domain: string) => {

        setCodesClientName(domain);

        toggleDrawer('codes', true);

    };



    const handleLogout = () => {

        // Clear auth state

        removeAuthUser();

        // Clear admin token

        sessionStorage.removeItem('soprano_admin_token');

        sessionStorage.removeItem('soprano_admin_user');

        // Redirect to admin login

        router.push('/riconun-odasi');

    };



    return (

        <>

        <style>{`

            .owner-glossy {

                background:

                    radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),

                    linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),

                    linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);

                backdrop-filter: blur(24px);

                -webkit-backdrop-filter: blur(24px);

                border: 1px solid rgba(255,255,255,0.15);

                border-top: 1px solid rgba(255,255,255,0.35);

                border-left: 1px solid rgba(255,255,255,0.2);

                box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);

                border-radius: 22px;

                overflow: hidden;

            }

        `}</style>

        <div className="owner-panel-root" style={{ background: 'linear-gradient(to bottom, #a3ace5 0%, #c4c9ee 50%, #d8dbf4 100%)', minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif" }}>

            <div className="flex w-full max-w-[1600px] h-screen text-[#e2e8f0]" style={{

                background: '#7a7e9e',

                borderLeft: '14px solid rgba(255,255,255,0.85)',

                borderRight: '14px solid rgba(255,255,255,0.85)',

                borderBottom: '14px solid rgba(255,255,255,0.85)',

                boxShadow: '0 0 30px rgba(0,0,0,0.25), 0 0 60px rgba(0,0,0,0.12), -4px 0 15px rgba(0,0,0,0.18), 4px 0 15px rgba(0,0,0,0.18)',

            }}>



            {/* Sidebar */}

            <aside className="owner-sidebar w-20 lg:w-64 flex flex-col z-20 transition-all duration-300" style={{

                background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)',

                backdropFilter: 'blur(24px)',

                borderRight: '1px solid rgba(255,255,255,0.15)',

                borderTop: '1px solid rgba(255,255,255,0.1)',

                boxShadow: '4px 0 20px rgba(0,0,0,0.3), inset -1px 0 0 rgba(255,255,255,0.06)',

            }}>

                <div className="h-20 flex items-center justify-center lg:justify-start lg:px-5 border-b border-white/10">

                    <div className="flex items-center gap-2">

                        <div className="hidden lg:flex flex-col">

                            <h1 style={{ fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', serif", fontSize: 28, lineHeight: 1, margin: 0, letterSpacing: 0.5 }}>

                                <span style={{ background: 'linear-gradient(180deg, #fff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>Soprano</span>

                                <span style={{ background: 'linear-gradient(180deg, #b8f0f0 0%, #5ec8c8 30%, #3a9e9e 65%, #4db0a8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>Chat</span>

                            </h1>

                            <span style={{ fontSize: 9, color: 'rgba(200,180,140,0.5)', fontStyle: 'italic', letterSpacing: 2, textTransform: 'lowercase' }}>owner panel</span>

                        </div>

                        <div className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.25), rgba(2,132,199,0.35))', boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}>

                            <span style={{ fontFamily: "'Cooper Black', serif", fontSize: 16, color: '#bae6fd' }}>S</span>

                        </div>

                    </div>

                </div>



                <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">

                    {[

                        { key: 'dashboard' as const, icon: <LayoutDashboard className="w-5 h-5" />, label: 'Genel Bakış', color: '#bae6fd' },

                        { key: 'customers' as const, icon: <Users className="w-5 h-5" />, label: 'Müşteriler', color: '#fbbf24' },

                        { key: 'finance' as const, icon: <Wallet className="w-5 h-5" />, label: 'Finans & Ödemeler', color: '#a7f3d0' },

                        { key: 'orders' as const, icon: <div className="relative"><ShoppingBag className="w-5 h-5" />{pendingOrderCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">{pendingOrderCount}</span>}</div>, label: 'Siparişler', color: '#34d399' },

                        { key: 'logs' as const, icon: <ScrollText className="w-5 h-5" />, label: 'Sistem Logları', color: '#fef3c7' },

                    ].map(item => (

                        <button key={item.key} onClick={() => setActiveView(item.key)} className="owner-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all" style={{

                            background: activeView === item.key ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)' : 'transparent',

                            border: activeView === item.key ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',

                            boxShadow: activeView === item.key ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)' : 'none',

                            color: activeView === item.key ? '#fff' : 'rgba(255,255,255,0.5)',

                        }}>

                            <span style={{ color: activeView === item.key ? item.color : undefined }}>{item.icon}</span>

                            <span className="hidden lg:block font-semibold text-[11px] uppercase tracking-wider">{item.label}</span>

                        </button>

                    ))}



                    <div style={{ margin: '16px 0', borderTop: '1px solid rgba(200,170,110,0.15)' }} />



                    <div className="px-3 py-2 hidden lg:block" style={{ fontSize: 9, fontWeight: 800, color: 'rgba(200,170,110,0.4)', textTransform: 'uppercase', letterSpacing: 3 }}>Yönetim</div>

                    {[

                        { key: 'hqMembers' as const, icon: <ShieldCheck className="w-5 h-5" />, label: 'Panel Yönetimi', color: '#67e8f9' },

                        { key: 'contactMessages' as const, icon: <div className="relative"><Inbox className="w-5 h-5" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}</div>, label: 'Mesajlar', color: '#a7f3d0' },

                        { key: 'settings' as const, icon: <Settings className="w-5 h-5" />, label: 'Panel Ayarları', color: '#94a3b8' },

                    ].map(item => (

                        <button key={item.key} onClick={() => { setActiveView(item.key); if (item.key === 'contactMessages') loadContactMessages(); }} className="owner-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all" style={{

                            background: activeView === item.key ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)' : 'transparent',

                            border: activeView === item.key ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',

                            boxShadow: activeView === item.key ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)' : 'none',

                            color: activeView === item.key ? '#fff' : 'rgba(255,255,255,0.5)',

                        }}>

                            <span style={{ color: activeView === item.key ? item.color : undefined }}>{item.icon}</span>

                            <span className="hidden lg:block font-semibold text-[11px] uppercase tracking-wider">{item.label}</span>

                        </button>

                    ))}

                </nav>



                <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>

                    <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-full overflow-hidden" style={{ border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>

                            <Image src={adminUser?.avatarUrl && (adminUser.avatarUrl.startsWith('http') || adminUser.avatarUrl.startsWith('/')) ? adminUser.avatarUrl : `/avatars/neutral_1.png`} width={36} height={36} alt="Owner" className="w-full h-full object-cover" />

                        </div>

                        <div className="hidden lg:block overflow-hidden flex-1">

                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }} className="truncate">{adminUser?.displayName || 'Admin'}</div>

                            <div style={{ fontSize: 9, color: 'rgba(200,170,110,0.5)' }}>{adminUser?.role === 'owner' ? 'Owner' : adminUser?.role === 'superadmin' ? 'Super Admin' : 'Admin'}</div>

                        </div>

                        <button

                            onClick={() => { setEditingProfile(p => !p); setActiveView('hqMembers'); }}

                            className="ml-auto owner-nav-btn hidden lg:flex"

                            title="Profil Ayarları"

                            style={{ padding: '6px', borderRadius: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}

                        >

                            <UserCog className="w-4 h-4" />

                        </button>

                        <button

                            onClick={handleLogout}

                            className="owner-nav-btn"

                            title="Çıkış Yap"

                            style={{ padding: '6px', borderRadius: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}

                        >

                            <LogOut className="w-4 h-4" />

                        </button>

                    </div>

                </div>

            </aside>



            {/* Main Content */}

            <main className="flex-1 flex flex-col relative z-10 overflow-hidden">

                {/* Header — Premium Metalik Bar */}

                <header style={{

                    height: 72,

                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',

                    padding: '0 28px',

                    background: 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',

                    borderBottom: '1px solid rgba(0,0,0,0.5)',

                    boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.05)',

                    position: 'sticky', top: 0, zIndex: 30,

                }}>

                    <div className="flex-1 max-w-xl">

                        <div className="relative flex items-center owner-input-inset" style={{ padding: '0 14px', height: 38, borderRadius: 10 }}>

                            <Search className="w-4 h-4 mr-3" style={{ color: 'rgba(255,255,255,0.3)' }} />

                            <input

                                type="text"

                                placeholder="Müşteri, domain veya e-posta ara..."

                                className="bg-transparent border-none outline-none text-sm text-white w-full"

                                style={{ fontSize: 12 }}

                                value={searchQuery}

                                onChange={(e) => setSearchQuery(e.target.value)}

                            />

                        </div>

                    </div>



                    <div className="flex items-center gap-3 ml-6">

                        <button onClick={() => { const el = document.getElementById('inline-announcement-card'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.boxShadow = '0 0 30px rgba(99,102,241,0.4)'; setTimeout(() => { el.style.boxShadow = ''; }, 2000); } }} className="hidden md:flex items-center gap-2 owner-btn-3d owner-btn-3d-gold" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>

                            <Megaphone className="w-4 h-4" />

                            Duyuru

                        </button>



                        <button onClick={() => toggleDrawer('newClient', true)} className="hidden md:flex items-center gap-2 owner-btn-3d owner-btn-3d-red" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>

                            <PlusCircle className="w-4 h-4" />

                            Yeni Müşteri

                        </button>

                        <div className="w-px h-8 bg-white/10"></div>

                        <div className="relative">

                            <button onClick={() => setShowNotifPanel(p => !p)} className="relative p-2 text-gray-400 hover:text-white transition-colors">

                                {unreadCount > 0 ? <BellRing className="w-5 h-5 text-emerald-400 animate-bounce" /> : <Bell className="w-5 h-5" />}

                                {unreadCount > 0 && (

                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-[#1e222e] shadow-lg shadow-red-500/30">{unreadCount > 99 ? '99+' : unreadCount}</span>

                                )}

                            </button>

                            {showNotifPanel && (

                                <div className="absolute right-0 top-12 w-96 max-h-[480px] overflow-y-auto rounded-xl border border-white/10 bg-[#0f111a]/95 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                                    <div className="p-4 border-b border-white/5 flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <span className="text-sm font-bold text-white">📩 İletişim Mesajları</span>

                                            {unreadCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">{unreadCount} yeni</span>}

                                        </div>

                                        <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-white transition-colors text-xs">Kapat</button>

                                    </div>

                                    {contactMessages.filter(m => !m.isRead).length === 0 ? (

                                        <div className="p-8 text-center">

                                            <Inbox className="w-8 h-8 text-gray-600 mx-auto mb-2" />

                                            <div className="text-gray-400 text-xs">Okunmamış mesaj yok</div>

                                        </div>

                                    ) : (

                                        contactMessages.filter(m => !m.isRead).slice(0, 8).map(msg => (

                                            <div key={msg.id} className="p-4 border-b border-white/5 hover:bg-emerald-500/5 transition-colors cursor-pointer" onClick={() => { setShowNotifPanel(false); setActiveView('contactMessages'); loadContactMessages(); setContactMsgSelected(msg); markContactMessageRead(msg.id); }}>

                                                <div className="flex items-center gap-3 mb-1">

                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-bold flex-shrink-0">{msg.name?.charAt(0)?.toUpperCase()}</div>

                                                    <div className="flex-1 min-w-0">

                                                        <div className="text-xs font-bold text-white truncate">{msg.name}</div>

                                                        <div className="text-[10px] text-gray-400 truncate">{msg.email}</div>

                                                    </div>

                                                    <span className="text-[9px] text-gray-400 flex-shrink-0">{new Date(msg.createdAt).toLocaleDateString('tr-TR')}</span>

                                                </div>

                                                <div className="text-[11px] text-emerald-300 font-semibold truncate">{msg.subject}</div>

                                                <div className="text-[10px] text-gray-400 truncate mt-0.5">{msg.message?.substring(0, 80)}...</div>

                                            </div>

                                        ))

                                    )}

                                    <button onClick={() => { setShowNotifPanel(false); setActiveView('contactMessages'); loadContactMessages(); }} className="w-full p-3 text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 transition-colors border-t border-white/5">

                                        Tüm Mesajları Gör →

                                    </button>

                                </div>

                            )}

                        </div>

                    </div>

                </header>



                {/* Dashboard Content */}

                <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar" style={{ background: 'linear-gradient(180deg, rgba(15,20,35,0.75) 0%, rgba(20,25,40,0.7) 50%, rgba(15,20,35,0.75) 100%)' }}>



                    {activeView === 'hqMembers' ? (

                        /* ══════════ PANEL YÖNETİMİ VIEW ═══════════ */

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">

                                        <ShieldCheck className="w-6 h-6 text-cyan-400" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>Panel Yönetimi</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">GodMaster hesaplarını yönetin</p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-3">

                                    <button onClick={loadHqMembers} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all">

                                        <RefreshCw className={`w-4 h-4 ${hqMembersLoading ? 'animate-spin' : ''}`} />

                                    </button>

                                    <button

                                        onClick={() => setShowAddHelper(!showAddHelper)}

                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${showAddHelper ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'}`}

                                    >

                                        {showAddHelper ? <><X className="w-4 h-4" /> İptal</> : <><UserPlus className="w-4 h-4" /> GodMaster Ekle</>}

                                    </button>

                                </div>

                            </div>



                            {/* Profil Kartı */}

                            <div className="owner-glossy p-6">

                                <div className="flex items-center justify-between mb-4">

                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">

                                        <Crown className="w-4 h-4 text-amber-400" /> Aktif Oturum

                                    </h3>

                                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">

                                        {adminUser?.role || 'godmaster'}

                                    </span>

                                </div>

                                <div className="flex items-center gap-4">

                                    <div className="relative">

                                        <Image

                                            src={adminUser?.avatarUrl && (adminUser.avatarUrl.startsWith('http') || adminUser.avatarUrl.startsWith('/')) ? adminUser.avatarUrl : `/avatars/neutral_1.png`}

                                            alt="avatar"

                                            width={56} height={56}

                                            className="rounded-2xl border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10"

                                        />

                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0c14]" />

                                    </div>

                                    <div className="flex-1 min-w-0">

                                        <div className="font-bold text-white text-lg">{adminUser?.displayName || 'GodMaster'}</div>

                                        <div className="text-sm text-gray-400 truncate">{adminUser?.email || 'godmaster@system.system'}</div>

                                    </div>

                                    <button

                                        onClick={() => {

                                            if (editingProfile) {

                                                setEditingProfile(false);

                                            } else {

                                                setProfileForm({

                                                    displayName: adminUser?.displayName || '',

                                                    email: adminUser?.email || '',

                                                    avatarUrl: adminUser?.avatarUrl || '',

                                                });

                                                setEditingProfile(true);

                                            }

                                        }}

                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${editingProfile ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'}`}

                                    >

                                        <Pencil className="w-4 h-4" />

                                        {editingProfile ? 'İptal' : 'Profili Düzenle'}

                                    </button>

                                </div>



                                {/* Profil Düzenleme Formu */}

                                {editingProfile && (

                                    <div className="mt-5 pt-5 border-t border-white/10 space-y-4">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                            <div className="space-y-1.5">

                                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">İsim</label>

                                                <input

                                                    type="text"

                                                    value={profileForm.displayName}

                                                    onChange={e => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}

                                                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none transition"

                                                    placeholder="GodMaster"

                                                />

                                            </div>

                                            <div className="space-y-1.5">

                                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">E-Posta</label>

                                                <input

                                                    type="email"

                                                    value={profileForm.email}

                                                    onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}

                                                    className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none transition"

                                                    placeholder="godmaster@system.system"

                                                />

                                            </div>

                                        </div>

                                        <div className="flex items-center justify-end gap-3">

                                            <button

                                                onClick={async () => {

                                                    if (!adminUser?.id) return;

                                                    setSavingProfile(true);

                                                    try {

                                                        const token = sessionStorage.getItem('soprano_admin_token');

                                                        const res = await fetch(`${API_URL}/admin/users/${adminUser.id}`, {

                                                            method: 'PATCH',

                                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                                                            body: JSON.stringify(profileForm),

                                                        });

                                                        if (!res.ok) throw new Error();

                                                        const updated = { ...adminUser, ...profileForm };

                                                        setAdminUser(updated);

                                                        localStorage.setItem('soprano_admin_user', JSON.stringify(updated));

                                                        addToast('Profil güncellendi ✅', 'success');

                                                        setEditingProfile(false);

                                                    } catch { addToast('Profil güncellenemedi', 'error'); }

                                                    setSavingProfile(false);

                                                }}

                                                disabled={savingProfile}

                                                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"

                                            >

                                                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}

                                                Kaydet

                                            </button>

                                        </div>

                                    </div>

                                )}

                            </div>



                            {/* GodMaster Ekleme Formu */}

                            {showAddHelper && (

                                <div className="owner-glossy p-5 space-y-4 animate-in slide-in-from-top-3 duration-300">

                                    <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">

                                        <UserPlus className="w-4 h-4" /> Yeni GodMaster Ekle

                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                        <div className="space-y-1.5">

                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kullanıcı Adı</label>

                                            <input

                                                type="text"

                                                value={newHelper.displayName}

                                                onChange={e => setNewHelper(prev => ({ ...prev, displayName: e.target.value }))}

                                                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none transition"

                                                placeholder="Kullanıcı adı"

                                            />

                                        </div>

                                        <div className="space-y-1.5">

                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">E-Posta</label>

                                            <input

                                                type="email"

                                                value={newHelper.email}

                                                onChange={e => setNewHelper(prev => ({ ...prev, email: e.target.value }))}

                                                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none transition"

                                                placeholder="E-posta adresi"

                                            />

                                        </div>

                                        <div className="space-y-1.5">

                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Şifre</label>

                                            <input

                                                type="password"

                                                value={newHelper.password}

                                                onChange={e => setNewHelper(prev => ({ ...prev, password: e.target.value }))}

                                                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none transition"

                                                placeholder="Şifre belirle"

                                            />

                                        </div>

                                    </div>

                                    <div className="flex items-center justify-end">

                                        <button

                                            onClick={() => {

                                                setNewHelper(prev => ({ ...prev, role: 'godmaster' }));

                                                handleAddHelper();

                                            }}

                                            disabled={addingHelper || !newHelper.displayName || !newHelper.email || !newHelper.password}

                                            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition"

                                        >

                                            {addingHelper ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}

                                            GodMaster Oluştur

                                        </button>

                                    </div>

                                </div>

                            )}



                            {/* GodMaster Listesi */}

                            <div className="owner-glossy">

                                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">

                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">

                                        <Shield className="w-4 h-4 text-cyan-400" /> GodMaster Hesapları

                                    </h3>

                                    <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">

                                        {hqMembers.length} hesap

                                    </span>

                                </div>

                                <table className="w-full">

                                    <thead>

                                        <tr className="border-b border-white/[0.04]">

                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Durum</th>

                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kullanıcı</th>

                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</th>

                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-Posta</th>

                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son Giriş</th>

                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">İşlemler</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {hqMembersLoading ? (

                                            <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>

                                        ) : hqMembers.length === 0 ? (

                                            <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400">Henüz GodMaster hesabı yok.</td></tr>

                                        ) : (

                                            hqMembers.map((member: any) => {

                                                const isOnline = member.isOnline || member.status === 'online';

                                                const isSelf = member.id === adminUser?.id;

                                                return (

                                                    <React.Fragment key={member.id}>

                                                        <tr className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isSelf ? 'bg-cyan-500/[0.03]' : ''}`}>

                                                            <td className="px-6 py-4">

                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/10'}`}>

                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />

                                                                    {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}

                                                                </span>

                                                            </td>

                                                            <td className="px-6 py-4">

                                                                <div className="flex items-center gap-3">

                                                                    <Image

                                                                        src={member.avatarUrl && (member.avatarUrl.startsWith('http') || member.avatarUrl.startsWith('/')) ? member.avatarUrl : `/avatars/neutral_1.png`}

                                                                        alt="avatar" width={36} height={36}

                                                                        className="rounded-xl border border-white/10"

                                                                    />

                                                                    <div>

                                                                        <div className="text-sm font-bold text-white flex items-center gap-1.5">

                                                                            {member.displayName}

                                                                            {isSelf && <span className="text-[8px] text-cyan-400">✦</span>}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </td>

                                                            <td className="px-6 py-4">

                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">

                                                                    <Crown className="w-3 h-3" /> GodMaster

                                                                </span>

                                                            </td>

                                                            <td className="px-6 py-4">

                                                                <span className="text-xs text-gray-400">{member.email}</span>

                                                            </td>

                                                            <td className="px-6 py-4">

                                                                <span className="text-xs text-gray-400">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>

                                                            </td>

                                                            <td className="px-6 py-4">

                                                                <div className="flex items-center justify-end gap-2">

                                                                    {/* Şifre Değiştir */}

                                                                    <button

                                                                        onClick={() => { setPasswordEditId(passwordEditId === member.id ? null : member.id); setNewPassword(''); }}

                                                                        className={`p-1.5 rounded-lg transition-colors border ${passwordEditId === member.id ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 hover:bg-amber-500/10 text-gray-400 hover:text-amber-400 border-white/5 hover:border-amber-500/20'}`}

                                                                        title="Şifre Değiştir"

                                                                    >

                                                                        <KeyRound className="w-3.5 h-3.5" />

                                                                    </button>

                                                                    {/* Sil */}

                                                                    {!isSelf && (

                                                                        <button

                                                                            onClick={() => {

                                                                                setOrderConfirm({

                                                                                    isOpen: true,

                                                                                    title: 'GodMaster Sil',

                                                                                    message: `${member.displayName} hesabını silmek istediğinize emin misiniz?`,

                                                                                    type: 'danger',

                                                                                    onConfirm: () => handleDeleteHelper(member.id),

                                                                                });

                                                                            }}

                                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"

                                                                            title="Hesabı Sil"

                                                                        >

                                                                            <Trash2 className="w-3.5 h-3.5" />

                                                                        </button>

                                                                    )}

                                                                </div>

                                                            </td>

                                                        </tr>

                                                        {/* Şifre Değiştirme Satırı */}

                                                        {passwordEditId === member.id && (

                                                            <tr className="bg-amber-500/[0.03]">

                                                                <td colSpan={6} className="px-6 py-3">

                                                                    <div className="flex items-center gap-3 flex-wrap">

                                                                        <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0" />

                                                                        <span className="text-xs text-amber-400 font-semibold flex-shrink-0">{member.displayName} — Yeni Şifre:</span>

                                                                        <input

                                                                            type="text"

                                                                            placeholder="Yeni şifre girin..."

                                                                            className="bg-[#0a0b14] border border-amber-500/20 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-amber-500/50 transition w-48"

                                                                            value={newPassword}

                                                                            onChange={(e) => setNewPassword(e.target.value)}

                                                                            onKeyDown={(e) => e.key === 'Enter' && handleChangePassword(member.id)}

                                                                        />

                                                                        <button

                                                                            onClick={() => handleChangePassword(member.id)}

                                                                            disabled={savingPassword || !newPassword || newPassword.length < 4}

                                                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition"

                                                                        >

                                                                            {savingPassword ? 'Değiştiriliyor...' : 'Değiştir'}

                                                                        </button>

                                                                        <button

                                                                            onClick={() => { setPasswordEditId(null); setNewPassword(''); }}

                                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-lg transition"

                                                                        >

                                                                            İptal

                                                                        </button>

                                                                    </div>

                                                                </td>

                                                            </tr>

                                                        )}

                                                    </React.Fragment>

                                                );

                                            })

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    ) : activeView === 'contactMessages' ? (

                        /* ══════════ İLETİŞİM MESAJLARI VIEW ═══════════ */

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">

                                        <Inbox className="w-6 h-6 text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>İletişim Mesajları</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">Landing page&apos;den gelen iletişim formları</p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-3">

                                    <button onClick={() => loadContactMessages()} className="p-2.5 bg-white/5 hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 rounded-xl transition-all">

                                        <RefreshCw className={`w-4 h-4 ${contactMsgLoading ? 'animate-spin' : ''}`} />

                                    </button>

                                </div>

                            </div>



                            {/* Stats */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div className="owner-glossy p-4 flex items-center gap-3">

                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Inbox className="w-4 h-4" /></div>

                                    <div>

                                        <div className="text-2xl font-extrabold text-white">{contactMessages.length}</div>

                                        <div className="text-[11px] text-gray-400">Toplam Mesaj</div>

                                    </div>

                                </div>

                                <div className="owner-glossy p-4 flex items-center gap-3">

                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><Mail className="w-4 h-4" /></div>

                                    <div>

                                        <div className="text-2xl font-extrabold text-white">{contactMessages.filter(m => !m.isRead).length}</div>

                                        <div className="text-[11px] text-gray-400">Okunmamış</div>

                                    </div>

                                </div>

                                <div className="owner-glossy p-4 flex items-center gap-3">

                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><MailOpen className="w-4 h-4" /></div>

                                    <div>

                                        <div className="text-2xl font-extrabold text-white">{contactMessages.filter(m => m.isRead).length}</div>

                                        <div className="text-[11px] text-gray-400">Okunan</div>

                                    </div>

                                </div>

                            </div>



                            {/* Mesaj Detay Modal */}

                            {contactMsgSelected && (

                                <div className="owner-glossy p-6 relative">

                                    <button onClick={() => setContactMsgSelected(null)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"><X className="w-4 h-4" /></button>

                                    <div className="flex items-center gap-3 mb-4">

                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">{contactMsgSelected.name?.charAt(0)?.toUpperCase()}</div>

                                        <div>

                                            <div className="font-bold text-white">{contactMsgSelected.name}</div>

                                            <div className="text-xs text-gray-400">{contactMsgSelected.email}</div>

                                        </div>

                                    </div>

                                    <div className="mb-2"><span className="text-xs font-bold text-emerald-400 uppercase">Konu:</span> <span className="text-sm text-white ml-1">{contactMsgSelected.subject}</span></div>

                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 rounded-xl p-4 border border-white/5">{contactMsgSelected.message}</div>

                                    <div className="mt-3 flex items-center justify-between">

                                        <span className="text-[10px] text-gray-400">{new Date(contactMsgSelected.createdAt).toLocaleString('tr-TR')}</span>

                                        <a href={`mailto:${contactMsgSelected.email}?subject=Re: ${contactMsgSelected.subject}`} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"><Mail className="w-3 h-3" /> Yanıtla</a>

                                    </div>

                                </div>

                            )}



                            {/* Mesaj Listesi */}

                            <div className="owner-glossy">

                                <table className="w-full">

                                    <thead>

                                        <tr className="border-b border-white/5">

                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gönderen</th>

                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Konu</th>

                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tarih</th>

                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Durum</th>

                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">İşlemler</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {contactMsgLoading ? (

                                            <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">Yükleniyor...</td></tr>

                                        ) : contactMessages.length === 0 ? (

                                            <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">Henüz mesaj yok.</td></tr>

                                        ) : (

                                            contactMessages.map(msg => (

                                                <tr key={msg.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!msg.isRead ? 'bg-emerald-500/[0.03]' : ''}`} onClick={() => { setContactMsgSelected(msg); if (!msg.isRead) markContactMessageRead(msg.id); }}>

                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">{msg.name?.charAt(0)?.toUpperCase()}</div>

                                                            <div>

                                                                <div className={`text-sm font-semibold ${!msg.isRead ? 'text-white' : 'text-gray-400'}`}>{msg.name}</div>

                                                                <div className="text-[11px] text-gray-400">{msg.email}</div>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td className="px-6 py-4">

                                                        <span className={`text-sm ${!msg.isRead ? 'text-white font-semibold' : 'text-gray-400'}`}>{msg.subject}</span>

                                                    </td>

                                                    <td className="px-6 py-4">

                                                        <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString('tr-TR')}</span>

                                                    </td>

                                                    <td className="px-6 py-4 text-center">

                                                        {msg.isRead ? (

                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20"><Eye className="w-3 h-3" /> Okundu</span>

                                                        ) : (

                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"><Mail className="w-3 h-3" /> Yeni</span>

                                                        )}

                                                    </td>

                                                    <td className="px-6 py-4 text-right">

                                                        <button onClick={(e) => { e.stopPropagation(); setOrderConfirm({ isOpen: true, title: 'Mesajı Sil', message: 'Bu mesajı silmek istediğinize emin misiniz?', type: 'danger', onConfirm: () => deleteContactMsg(msg.id, !msg.isRead) }); }} className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20" title="Mesajı Sil"><Trash2 className="w-3.5 h-3.5" /></button>

                                                    </td>

                                                </tr>

                                            ))

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    ) : activeView === 'orders' ? (

                        /* ══════════ SİPARİŞLER VIEW ═══════════ */

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">

                                        <ShoppingBag className="w-6 h-6 text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>Sipariş Yönetimi</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">Ana sayfadan gelen paket satın alma talepleri</p>

                                    </div>

                                    {inlineOrders.filter(o => o.status === 'PENDING').length > 0 && (

                                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20 ml-2">

                                            {inlineOrders.filter(o => o.status === 'PENDING').length} Beklemede

                                        </span>

                                    )}

                                </div>

                                <button onClick={fetchInlineOrders} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition border border-white/5" title="Yenile">

                                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />

                                </button>

                            </div>



                            {/* Orders Grid */}

                            {ordersLoading ? (

                                <div className="flex items-center justify-center py-16">

                                    <div className="w-7 h-7 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>

                                </div>

                            ) : ordersError ? (

                                <div className="text-center text-red-400 py-10">{ordersError}</div>

                            ) : inlineOrders.length === 0 ? (

                                <div className="text-center py-16">

                                    <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-3" />

                                    <p className="text-sm text-gray-400">Henüz sipariş bulunmuyor.</p>

                                </div>

                            ) : (

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                                    {inlineOrders.map((order: any) => {

                                        const isPending = order.status === 'PENDING';

                                        const isApproved = order.status === 'APPROVED';

                                        const isRejected = order.status === 'REJECTED';

                                        const isSoprano = order.hostingType !== 'own_domain';

                                        const isYearly = (order.details as any)?.billing === 'yearly' || order.billing === 'yearly';

                                        const displayPrice = order.amount ? Number(order.amount).toLocaleString('tr-TR') : '?';



                                        return (

                                            <div key={order.id} style={{

                                                background: 'linear-gradient(145deg, rgba(13,15,25,0.95), rgba(8,10,18,0.98))',

                                                border: `1px solid ${isPending ? 'rgba(251,191,36,0.15)' : isApproved ? 'rgba(52,211,153,0.12)' : isRejected ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)'}`,

                                                borderRadius: 18, overflow: 'hidden',

                                                boxShadow: isPending ? '0 4px 30px rgba(251,191,36,0.05)' : 'none',

                                            }}>

                                                {/* ─── SİPARİŞ ÖZETİ ─── */}

                                                <div style={{

                                                    padding: '16px 20px',

                                                    background: isPending ? 'linear-gradient(135deg, rgba(251,191,36,0.05), transparent)' : isApproved ? 'linear-gradient(135deg, rgba(52,211,153,0.05), transparent)' : 'linear-gradient(135deg, rgba(239,68,68,0.03), transparent)',

                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',

                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                                                }}>

                                                    <div>

                                                        <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>⭐ SİPARİŞ ÖZETİ</div>

                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>

                                                            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{displayPrice} ₺</span>

                                                            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>{isYearly ? '/yıl' : '/ay'}</span>

                                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>• {order.packageName || 'Paket'}</span>

                                                        </div>

                                                    </div>

                                                    {/* Status Badge */}

                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5

                                                        ${isApproved ? 'bg-green-500/10 text-green-400 border-green-500/20' :

                                                            isRejected ? 'bg-red-500/10 text-red-400 border-red-500/20' :

                                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>

                                                        {isApproved && <CheckCircle className="w-3 h-3" />}

                                                        {isRejected && <XCircle className="w-3 h-3" />}

                                                        {isPending && <Clock className="w-3 h-3" />}

                                                        {isApproved ? 'ONAYLANDI' : isRejected ? 'REDDEDİLDİ' : 'BEKLEMEDE'}

                                                    </span>

                                                </div>



                                                {/* ─── ÖDEME PERİYODU ─── */}

                                                <div style={{ padding: '10px 20px', display: 'flex', gap: 8 }}>

                                                    <div style={{

                                                        flex: 1, padding: '7px 0', borderRadius: 8, textAlign: 'center', fontSize: 11, fontWeight: 700,

                                                        background: !isYearly ? 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.08))' : 'rgba(255,255,255,0.02)',

                                                        color: !isYearly ? '#38bdf8' : '#475569',

                                                        border: !isYearly ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.04)',

                                                    }}>💳 Aylık Ödeme</div>

                                                    <div style={{

                                                        flex: 1, padding: '7px 0', borderRadius: 8, textAlign: 'center', fontSize: 11, fontWeight: 700,

                                                        background: isYearly ? 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.08))' : 'rgba(255,255,255,0.02)',

                                                        color: isYearly ? '#34d399' : '#475569',

                                                        border: isYearly ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.04)',

                                                    }}>🎁 Yıllık {isYearly && <span style={{ fontSize: 9, background: 'rgba(52,211,153,0.15)', padding: '1px 6px', borderRadius: 6, marginLeft: 4 }}>2 AY HEDİYE</span>}</div>

                                                </div>



                                                {/* ─── KİŞİSEL BİLGİLER ─── */}

                                                <div style={{ padding: '6px 20px 12px' }}>

                                                    <div style={{ fontSize: 8, fontWeight: 800, color: '#7b9fef', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>👤 KİŞİSEL BİLGİLER</div>

                                                    {[

                                                        { icon: '👤', value: `${order.firstName || ''} ${order.lastName || ''}`.trim() || '-' },

                                                        { icon: '📧', value: order.email || '-' },

                                                        { icon: '📱', value: order.phone || '-' },

                                                    ].map((row, ri) => (

                                                        <div key={ri} style={{

                                                            padding: '8px 14px', marginBottom: 4, borderRadius: 10,

                                                            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',

                                                            fontSize: 12, color: '#e2e8f0', fontWeight: 600,

                                                            display: 'flex', alignItems: 'center', gap: 10,

                                                        }}>

                                                            <span style={{ fontSize: 13 }}>{row.icon}</span>

                                                            <span>{row.value}</span>

                                                        </div>

                                                    ))}

                                                </div>



                                                {/* ─── LOGO ─── */}

                                                {(order.logoUrl || order.logoFileName) && (

                                                    <div style={{ padding: '0 20px 10px' }}>

                                                        <div style={{ fontSize: 8, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>🎨 MÜŞTERİ LOGOSU</div>

                                                        <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', fontSize: 11, color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>

                                                            <CheckCircle className="w-3.5 h-3.5" /> {order.logoFileName || order.logoUrl || 'Logo yüklendi'}

                                                        </div>

                                                    </div>

                                                )}



                                                {/* ─── HOSTİNG TERCİHİ ─── */}

                                                <div style={{ padding: '0 20px 12px' }}>

                                                    <div style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>🌐 HOSTİNG TERCİHİ</div>

                                                    <div style={{ display: 'flex', gap: 8 }}>

                                                        <div style={{

                                                            flex: 1, padding: '10px 14px', borderRadius: 12, textAlign: 'center',

                                                            background: isSoprano ? 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.03))' : 'rgba(0,0,0,0.15)',

                                                            border: `1.5px solid ${isSoprano ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.05)'}`,

                                                        }}>

                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>

                                                                {isSoprano && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />}

                                                                <span style={{ fontSize: 12, fontWeight: 800, color: isSoprano ? '#38bdf8' : '#475569' }}>🎙️ SopranoChat</span>

                                                            </div>

                                                            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>sopranochat.com üzerinden</div>

                                                        </div>

                                                        <div style={{

                                                            flex: 1, padding: '10px 14px', borderRadius: 12, textAlign: 'center',

                                                            background: !isSoprano ? 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))' : 'rgba(0,0,0,0.15)',

                                                            border: `1.5px solid ${!isSoprano ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)'}`,

                                                        }}>

                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>

                                                                {!isSoprano && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />}

                                                                <span style={{ fontSize: 12, fontWeight: 800, color: !isSoprano ? '#fbbf24' : '#475569' }}>🌐 Kendi Domainin</span>

                                                            </div>

                                                            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Embed ile kendi siten</div>

                                                        </div>

                                                    </div>

                                                    {/* Oda adı veya Domain bilgisi */}

                                                    {isSoprano && order.roomName && (

                                                        <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>

                                                            {order.roomName}

                                                            <div style={{ fontSize: 9, color: '#475569', fontWeight: 500, marginTop: 2 }}>🏠 sopranochat.com üzerinde odanız bu isimle oluşturulacak</div>

                                                        </div>

                                                    )}

                                                    {!isSoprano && order.customDomain && (

                                                        <div style={{ marginTop: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>

                                                            {order.customDomain}

                                                            <div style={{ fontSize: 9, color: '#475569', fontWeight: 500, marginTop: 2 }}>🌐 Bu domain'e embed kodu sağlanacak</div>

                                                        </div>

                                                    )}

                                                </div>



                                                {/* ─── ÖDEME KODU ─── */}

                                                <div style={{ padding: '0 20px 12px' }}>

                                                    <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>💳 ÖDEME KODU (AÇIKLAMAYA YAZILACAK)</div>

                                                    <div style={{

                                                        padding: '10px 16px', borderRadius: 12,

                                                        background: 'linear-gradient(135deg, rgba(56,189,248,0.05), rgba(56,189,248,0.02))',

                                                        border: '1.5px solid rgba(56,189,248,0.2)',

                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',

                                                    }}>

                                                        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#38bdf8', letterSpacing: 3 }}>{order.paymentCode || '-'}</span>

                                                        <button onClick={() => copyText(order.paymentCode)} style={{

                                                            fontSize: 10, fontWeight: 700, color: '#38bdf8',

                                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',

                                                            borderRadius: 8, padding: '4px 12px', cursor: 'pointer',

                                                        }}>📋 Kopyala</button>

                                                    </div>

                                                </div>



                                                {/* ─── TARİH ─── */}

                                                <div style={{ padding: '0 20px 8px', fontSize: 9, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>

                                                    <span>📅 {order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : '-'}</span>

                                                    {order.details && typeof order.details === 'object' && (

                                                        <span style={{ color: '#64748b' }}>

                                                            {(order.details as any).rooms && `🏠 ${(order.details as any).rooms}`}

                                                            {(order.details as any).capacity && ` · 👥 ${(order.details as any).capacity}`}

                                                            {(order.details as any).camera && ` · 📷 ${(order.details as any).camera}`}

                                                        </span>

                                                    )}

                                                </div>



                                                {/* ─── AKSİYONLAR ─── */}

                                                {isPending && (

                                                    <div style={{ padding: '10px 20px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>

                                                        <button onClick={() => orderStatusClick(order.id, 'APPROVED')} style={{

                                                            flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',

                                                            background: 'linear-gradient(135deg, #059669, #34d399)', color: '#fff',

                                                            fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,

                                                            boxShadow: '0 4px 15px rgba(52,211,153,0.2)', transition: 'all 0.2s',

                                                        }}>

                                                            <CheckCircle className="w-4 h-4" /> Onayla

                                                        </button>

                                                        <button onClick={() => orderStatusClick(order.id, 'REJECTED')} style={{

                                                            flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',

                                                            background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',

                                                            fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,

                                                            transition: 'all 0.2s',

                                                        }}>

                                                            <XCircle className="w-4 h-4" /> Reddet

                                                        </button>

                                                        <button onClick={() => orderDelete(order.id)} style={{

                                                            padding: '9px 14px', borderRadius: 10,

                                                            border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',

                                                            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s',

                                                        }}>

                                                            <Trash2 className="w-4 h-4" />

                                                        </button>

                                                    </div>

                                                )}

                                                {!isPending && (

                                                    <div style={{ padding: '8px 20px 12px', display: 'flex', justifyContent: 'flex-end' }}>

                                                        <button onClick={() => orderDelete(order.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors border border-white/5" title="Sil">

                                                            <Trash2 className="w-4 h-4" />

                                                        </button>

                                                    </div>

                                                )}

                                            </div>

                                        );

                                    })}

                                </div>

                            )}

                        </div>

                    ) : activeView === 'logs' ? (

                        /* ══════════ SİSTEM LOGLARI VIEW ═══════════ */

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center shadow-lg shadow-yellow-500/10">

                                        <ScrollText className="w-6 h-6 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(234,179,8,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>Sistem Logları</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">Owner panel işlem geçmişi</p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-3">

                                    <input

                                        type="text"

                                        value={logFilter}

                                        onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}

                                        placeholder="Filtre (event)..."

                                        className="bg-black/30 border border-yellow-500/15 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-yellow-500/40 transition placeholder:text-gray-400 w-56"

                                    />

                                    <button onClick={() => { setLogFilter(''); setLogPage(1); }} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition border border-white/5" title="Sıfırla">

                                        <RefreshCw className="w-4 h-4" />

                                    </button>

                                </div>

                            </div>



                            {/* Logs List */}

                            <div className="owner-glossy">

                                {logLoading ? (

                                    <div className="flex items-center justify-center py-16">

                                        <div className="w-7 h-7 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>

                                    </div>

                                ) : systemLogs.length === 0 ? (

                                    <div className="text-center py-16">

                                        <ScrollText className="w-12 h-12 text-gray-700 mx-auto mb-3" />

                                        <p className="text-sm text-gray-400">Henüz sistem logu yok</p>

                                    </div>

                                ) : (

                                    <div className="divide-y divide-white/5">

                                        {systemLogs.map((log: any, idx: number) => {

                                            const eventColors: Record<string, string> = {

                                                'tenant.update': 'bg-blue-500/20 text-blue-400 border-blue-500/30',

                                                'tenant.admin_password_reset': 'bg-amber-500/20 text-amber-400 border-amber-500/30',

                                                'tenant.create': 'bg-green-500/20 text-green-400 border-green-500/30',

                                                'tenant.provision': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',

                                                'tenant.delete': 'bg-red-500/20 text-red-400 border-red-500/30',

                                                'tenant.status_change': 'bg-amber-700/20 text-[#7b9fef] border-amber-700/30',

                                                'tenant.godmaster_password_reset': 'bg-rose-500/20 text-rose-400 border-rose-500/30',

                                            };

                                            return (

                                                <div key={log.id || idx} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition">

                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${eventColors[log.event] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>

                                                        {log.event}

                                                    </span>

                                                    <div className="flex-1 min-w-0">

                                                        <span className="text-sm text-gray-400 truncate block">

                                                            {log.targetUser?.displayName || '—'}

                                                        </span>

                                                    </div>

                                                    <span className="text-xs text-[#7b9fef] font-medium flex-shrink-0">

                                                        {log.admin?.displayName || '—'}

                                                    </span>

                                                    <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">

                                                        {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}

                                                    </span>

                                                </div>

                                            );

                                        })}

                                    </div>

                                )}

                            </div>



                            {/* Pagination */}

                            <div className="flex items-center justify-between px-2">

                                <span className="text-[11px] text-gray-400">Toplam: {logTotal} kayıt</span>

                                <div className="flex items-center gap-2">

                                    <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">â€ Önceki</button>

                                    <span className="text-xs text-gray-400 tabular-nums">{logPage} / {Math.ceil(logTotal / 25) || 1}</span>

                                    <button disabled={logPage >= Math.ceil(logTotal / 25)} onClick={() => setLogPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Sonraki ›</button>

                                </div>

                            </div>

                        </div>

                    ) : activeView === 'customers' ? (

                        /* ══════════ MÜŞTERİLER VIEW ═══════════ */

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">

                                        <Users className="w-6 h-6 text-[#7b9fef]" style={{ filter: 'drop-shadow(0 0 6px rgba(123,159,239,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>Müşteri Yönetimi</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">Tüm müşteri hesapları ve abonelik durumları</p>

                                    </div>

                                </div>

                                <div className="flex items-center gap-3">

                                    <div className="relative">

                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

                                        <input

                                            type="text"

                                            placeholder="Müşteri veya domain ara..."

                                            className="bg-[#0f111a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-amber-500/50 transition text-sm w-64"

                                            value={searchQuery}

                                            onChange={(e) => setSearchQuery(e.target.value)}

                                        />

                                    </div>

                                    {/* Filtre */}

                                    <div className="relative">

                                        <button onClick={() => setShowFilterDropdown(p => !p)} className={`p-2.5 border rounded-xl transition-all flex items-center gap-2 text-sm ${statusFilter !== 'ALL' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>

                                            <Filter className="w-4 h-4" />

                                            <span className="hidden md:inline">{statusFilter === 'ALL' ? 'Tümü' : statusFilter === 'ACTIVE' ? 'Aktif' : 'Pasif'}</span>

                                        </button>

                                        {showFilterDropdown && (

                                            <div className="absolute right-0 top-12 w-36 rounded-xl border border-white/10 bg-[#0f111a]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">

                                                {(['ALL', 'ACTIVE', 'PASSIVE'] as const).map(f => (

                                                    <button key={f} onClick={() => { setStatusFilter(f); setShowFilterDropdown(false); }} className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${statusFilter === f ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>

                                                        {f === 'ALL' ? 'Tümü' : f === 'ACTIVE' ? '🟢 Aktif' : '🔴 Pasif'}

                                                    </button>

                                                ))}

                                            </div>

                                        )}

                                    </div>

                                    <button onClick={() => loadInitialData()} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all" title="Yenile">

                                        <RefreshCw className="w-4 h-4" />

                                    </button>

                                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-400 hover:text-white text-sm font-medium transition-all" title="CSV İndir">

                                        <Download className="w-4 h-4" />

                                        <span className="hidden md:inline">CSV</span>

                                    </button>

                                </div>

                            </div>



                            {/* Stats */}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

                                <div className="p-5 flex items-center gap-4 transition-transform hover:-translate-y-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', borderRadius: 22 }}>

                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(59,130,246,0.25), inset 0 1px 1px rgba(255,255,255,0.4)', flexShrink: 0 }}><Briefcase style={{ width: 20, height: 20, color: '#fff' }} /></div>

                                    <div>

                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{tenants.length}</div>

                                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Toplam Müşteri</div>

                                    </div>

                                </div>

                                <div className="p-5 flex items-center gap-4 transition-transform hover:-translate-y-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', borderRadius: 22 }}>

                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #34d399, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(52,211,153,0.25), inset 0 1px 1px rgba(255,255,255,0.4)', flexShrink: 0 }}><CheckCircle style={{ width: 20, height: 20, color: '#fff' }} /></div>

                                    <div>

                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{tenants.filter(t => t.status === 'ACTIVE').length}</div>

                                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Aktif Müşteri</div>

                                    </div>

                                </div>

                                <div className="p-5 flex items-center gap-4 transition-transform hover:-translate-y-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', borderRadius: 22 }}>

                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #f43f5e, #e11d48)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(244,63,94,0.25), inset 0 1px 1px rgba(255,255,255,0.4)', flexShrink: 0 }}><AlertCircle style={{ width: 20, height: 20, color: '#fff' }} /></div>

                                    <div>

                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{tenants.filter(t => { if (!t.expiresAt) return false; const d = new Date(t.expiresAt); const now = new Date(); const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 7; }).length}</div>

                                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>7 Gün İçinde Biten</div>

                                    </div>

                                </div>

                                <div className="p-5 flex items-center gap-4 transition-transform hover:-translate-y-1 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', borderRadius: 22 }}>

                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(6,182,212,0.25), inset 0 1px 1px rgba(255,255,255,0.4)', flexShrink: 0 }}><Server style={{ width: 20, height: 20, color: '#fff' }} /></div>

                                    <div>

                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{tenants.reduce((sum, t) => sum + (t.roomLimit || 0), 0)}</div>

                                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Toplam Kapasite</div>

                                    </div>

                                </div>

                            </div>



                            {/* Table */}

                            <div className="overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.35)', borderLeft: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', borderRadius: 22 }}>

                                <table className="w-full text-left border-collapse">

                                    <thead>

                                        <tr className="bg-black/20 text-gray-400 text-xs uppercase tracking-widest">

                                            <th className="px-6 py-5 font-bold">Müşteri</th>

                                            <th className="px-6 py-5 font-bold">Domain / Erişim</th>

                                            <th className="px-6 py-5 font-bold">Hosting</th>

                                            <th className="px-6 py-5 font-bold">Oda</th>

                                            <th className="px-6 py-5 font-bold">Durum</th>

                                            <th className="px-6 py-5 font-bold">Bitiş</th>

                                            <th className="px-6 py-5 font-bold text-right">İşlemler</th>

                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-white/[0.03] text-sm">

                                        {/* ── System Tenant Satırı ── */}

                                        {systemTenantId && (

                                            <tr className="hover:bg-purple-500/[0.06] transition-colors group bg-purple-500/[0.02] border-b border-purple-500/20">

                                                <td className="px-6 py-5">

                                                    <div className="flex items-center gap-3">

                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>

                                                            <Crown className="w-4 h-4" />

                                                        </div>

                                                        <div>

                                                            <div className="font-bold text-white text-sm flex items-center gap-2">System Tenant

                                                                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-bold border border-purple-500/20">SYSTEM</span>

                                                            </div>

                                                            <div className="text-xs text-gray-400">Ana sistem odaları</div>

                                                        </div>

                                                    </div>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <span className="text-xs text-gray-400">—</span>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <span className="text-xs text-purple-400 font-semibold">Kendi Domaini</span>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <span className="text-sm text-white font-semibold">∞</span>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${systemTenantActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>

                                                        <span className={`w-1.5 h-1.5 rounded-full ${systemTenantActive ? 'bg-green-400' : 'bg-red-400'}`}></span>

                                                        {systemTenantActive ? 'Aktif' : 'Pasif'}

                                                    </span>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <span className="text-xs text-gray-400">Süresiz</span>

                                                </td>

                                                <td className="px-6 py-5">

                                                    <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">

                                                        {/* Düzenle */}

                                                        <button

                                                            onClick={() => openEditModal(systemTenantId!)}

                                                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-[#7b9fef] hover:text-white rounded-lg transition-colors border border-amber-500/20"

                                                            title="Düzenle"

                                                        >

                                                            <Pencil className="w-4 h-4" />

                                                        </button>

                                                        {/* Erişim Linki */}

                                                        <button

                                                            onClick={() => {

                                                                const link = `${window.location.origin}/t/system`;

                                                                navigator.clipboard.writeText(link).then(() => {

                                                                    addToast(`Erişim linki kopyalandı! ✅\n${link}`, 'success');

                                                                }).catch(() => addToast('Kopyalama başarısız', 'error'));

                                                            }}

                                                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors border border-blue-500/20"

                                                            title="Erişim Linki Kopyala"

                                                        >

                                                            <Link2 className="w-4 h-4" />

                                                        </button>

                                                        {/* Embed Kodu */}

                                                        <button

                                                            onClick={() => {

                                                                const embedCode = `<iframe src="${window.location.origin}/embed/system" width="100%" height="1000" frameborder="0" allow="camera; microphone; fullscreen; display-capture" style="border:none;border-radius:12px;max-width:1300px;"></iframe>`;

                                                                navigator.clipboard.writeText(embedCode).then(() => {

                                                                    addToast('Embed kodu kopyalandı! ✅', 'success');

                                                                }).catch(() => addToast('Kopyalama başarısız', 'error'));

                                                            }}

                                                            className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-lg transition-colors border border-cyan-500/20"

                                                            title="Embed Kodu Kopyala"

                                                        >

                                                            <CodeXml className="w-4 h-4" />

                                                        </button>

                                                        {/* Aktif/Pasif Toggle */}

                                                        <button

                                                            onClick={() => {

                                                                const newStatus = systemTenantActive ? 'PASSIVE' : 'ACTIVE';

                                                                updateTenant(systemTenantId!, { status: newStatus });

                                                                setSystemTenantActive(!systemTenantActive);

                                                                addToast(`System Tenant ${newStatus === 'ACTIVE' ? 'aktifleştirildi' : 'pasifleştirildi'} ✅`, 'success');

                                                            }}

                                                            className={`p-1.5 rounded-lg transition-colors border ${systemTenantActive ? 'bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border-orange-500/20' : 'bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border-green-500/20'}`}

                                                            title={systemTenantActive ? 'Pasifleştir' : 'Aktifleştir'}

                                                        >

                                                            {systemTenantActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}

                                                        </button>

                                                        {/* Sil */}

                                                        <button

                                                            onClick={() => setDeleteConfirmId(systemTenantId!)}

                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"

                                                            title="Sil"

                                                        >

                                                            <Trash2 className="w-4 h-4" />

                                                        </button>

                                                        {/* GodMaster Giriş */}

                                                        <button

                                                            onClick={() => handleGodMasterEnter(systemTenantId!)}

                                                            className="p-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-colors border border-purple-500/20"

                                                            title="GodMaster olarak giriş yap"

                                                        >

                                                            <Crown className="w-4 h-4" />

                                                        </button>

                                                        {/* Detay Genişlet */}

                                                        <button

                                                            onClick={() => loadTenantDetails(systemTenantId!)}

                                                            className={`p-1.5 rounded-lg transition-colors border ${expandedTenantId === systemTenantId ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 border-white/5 hover:border-blue-500/20'}`}

                                                            title="Odalar & Üyeler"

                                                        >

                                                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedTenantId === systemTenantId ? 'rotate-180' : ''}`} />

                                                        </button>

                                                    </div>

                                                    {/* Silme onay */}

                                                    {deleteConfirmId === systemTenantId && (

                                                        <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-150">

                                                            <span className="text-xs text-red-400 font-semibold">Emin misiniz?</span>

                                                            <button onClick={() => { deleteTenant(systemTenantId!); setDeleteConfirmId(null); addToast('System Tenant silindi 🗑️', 'success'); }} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md font-bold hover:bg-red-400 transition">Evet</button>

                                                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-md hover:bg-white/10 transition">Hayır</button>

                                                        </div>

                                                    )}

                                                </td>

                                            </tr>

                                        )}

                                        {/* ── Müşteri Satırları ── */}

                                        {tenants

                                            .filter(t => {

                                                if (statusFilter === 'ACTIVE' && t.status !== 'ACTIVE') return false;

                                                if (statusFilter === 'PASSIVE' && t.status !== 'PASSIVE') return false;

                                                if (searchQuery) {

                                                    const q = searchQuery.toLowerCase();

                                                    return (t.name || '').toLowerCase().includes(q) || (t.domain || '').toLowerCase().includes(q) || ((t as any).email || '').toLowerCase().includes(q) || (t.accessCode || '').toLowerCase().includes(q);

                                                }

                                                return true;

                                            })

                                            .map((t: any) => {

                                                const isExpiringSoon = t.expiresAt && (() => { const d = new Date(t.expiresAt); const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 7; })();

                                                const isExpired = t.expiresAt && new Date(t.expiresAt) < new Date();

                                                return (

                                                    <React.Fragment key={t.id}>

                                                        <tr className="hover:bg-white/[0.06] bg-white/[0.01] transition-all group" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

                                                            <td className="px-6 py-5">

                                                                <div className="flex items-center gap-3">

                                                                    {t.logoUrl ? (

                                                                        // eslint-disable-next-line @next/next/no-img-element

                                                                        <img src={t.logoUrl} alt={t.name} className="w-9 h-9 rounded-xl object-cover border border-white/10" />

                                                                    ) : (

                                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow" style={{ background: 'linear-gradient(135deg, #2c4a7c, #c8962e)' }}>{(t.displayName || t.name)?.charAt(0)?.toUpperCase()}</div>

                                                                    )}

                                                                    <div className="min-w-0">

                                                                        <div className="text-sm font-bold text-white truncate max-w-[180px]">{t.displayName || t.name}</div>

                                                                        <div className="text-xs text-gray-400 truncate max-w-[180px]">{(t as any).email || '—'}</div>

                                                                    </div>

                                                                </div>

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                <div className="flex flex-col gap-0.5">

                                                                    <span className="text-xs text-white font-medium truncate max-w-[140px]">{t.domain || '—'}</span>

                                                                    {t.accessCode && <span className="text-xs text-gray-400">kod: {t.accessCode}</span>}

                                                                </div>

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${t.hostingType === 'own_domain' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

                                                                    }`}>

                                                                    {t.hostingType === 'own_domain' ? 'Kendi Domaini' : 'SopranoChat'}

                                                                </span>

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                <span className="text-sm text-white font-semibold">{t.roomLimit || 0}</span>

                                                                <span className="text-xs text-gray-400 ml-1">oda</span>

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${t.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'

                                                                    }`}>

                                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'}`}></span>

                                                                    {t.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}

                                                                </span>

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                {t.expiresAt ? (

                                                                    <span className={`text-xs font-semibold ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-400'

                                                                        }`}>{new Date(t.expiresAt).toLocaleDateString('tr-TR')}</span>

                                                                ) : (

                                                                    <span className="text-xs text-gray-400">Süresiz</span>

                                                                )}

                                                            </td>

                                                            <td className="px-6 py-5">

                                                                <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">

                                                                    <button

                                                                        onClick={() => openEditModal(t.id)}

                                                                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-[#7b9fef] hover:text-white rounded-lg transition-colors border border-amber-500/20"

                                                                        title="Düzenle"

                                                                    >

                                                                        <Pencil className="w-4 h-4" />

                                                                    </button>

                                                                    {/* Erişim Linki */}

                                                                    <button

                                                                        onClick={() => {

                                                                            const link = `${window.location.origin}/t/${t.slug}`;

                                                                            navigator.clipboard.writeText(link).then(() => {

                                                                                addToast(`Erişim linki kopyalandı! ✅\n${link}`, 'success');

                                                                            }).catch(() => addToast('Kopyalama başarısız', 'error'));

                                                                        }}

                                                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors border border-blue-500/20"

                                                                        title="Erişim Linki Kopyala"

                                                                    >

                                                                        <Link2 className="w-4 h-4" />

                                                                    </button>

                                                                    {/* Embed Kodu */}

                                                                    <button

                                                                        onClick={() => {

                                                                            const embedCode = `<iframe src="${window.location.origin}/embed/${t.slug}" width="100%" height="1000" frameborder="0" allow="camera; microphone; fullscreen; display-capture" style="border:none;border-radius:12px;max-width:1300px;"></iframe>`;

                                                                            navigator.clipboard.writeText(embedCode).then(() => {

                                                                                addToast('Embed kodu kopyalandı! ✅', 'success');

                                                                            }).catch(() => addToast('Kopyalama başarısız', 'error'));

                                                                        }}

                                                                        className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded-lg transition-colors border border-cyan-500/20"

                                                                        title="Embed Kodu Kopyala"

                                                                    >

                                                                        <CodeXml className="w-4 h-4" />

                                                                    </button>

                                                                    <button

                                                                        onClick={() => {

                                                                            const newStatus = t.status === 'ACTIVE' ? 'PASSIVE' : 'ACTIVE';

                                                                            updateTenant(t.id, { status: newStatus });

                                                                            addToast(`Müşteri ${newStatus === 'ACTIVE' ? 'aktifleştirildi' : 'pasifleştirildi'} ✅`, 'success');

                                                                        }}

                                                                        className={`p-1.5 rounded-lg transition-colors border ${t.status === 'ACTIVE' ? 'bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border-orange-500/20' : 'bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border-green-500/20'}`}

                                                                        title={t.status === 'ACTIVE' ? 'Pasifleştir' : 'Aktifleştir'}

                                                                    >

                                                                        {t.status === 'ACTIVE' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}

                                                                    </button>

                                                                    <button

                                                                        onClick={() => setDeleteConfirmId(t.id)}

                                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"

                                                                        title="Sil"

                                                                    >

                                                                        <Trash2 className="w-4 h-4" />

                                                                    </button>

                                                                    {/* GodMaster Giriş */}

                                                                    <button

                                                                        onClick={() => handleGodMasterEnter(t.id)}

                                                                        className="p-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-colors border border-purple-500/20"

                                                                        title="GodMaster olarak giriş yap"

                                                                    >

                                                                        <Crown className="w-4 h-4" />

                                                                    </button>

                                                                    {/* Detay Genişlet */}

                                                                    <button

                                                                        onClick={() => loadTenantDetails(t.id)}

                                                                        className={`p-1.5 rounded-lg transition-colors border ${expandedTenantId === t.id ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 border-white/5 hover:border-blue-500/20'}`}

                                                                        title="Odalar & Üyeler"

                                                                    >

                                                                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedTenantId === t.id ? 'rotate-180' : ''}`} />

                                                                    </button>

                                                                </div>

                                                                {/* Silme onay */}

                                                                {deleteConfirmId === t.id && (

                                                                    <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-150">

                                                                        <span className="text-xs text-red-400 font-semibold">Emin misiniz?</span>

                                                                        <button onClick={() => { deleteTenant(t.id); setDeleteConfirmId(null); addToast('Müşteri silindi 🗑️', 'success'); }} className="px-2 py-1 bg-red-500 text-white text-xs rounded-md font-bold hover:bg-red-400 transition">Evet</button>

                                                                        <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-md hover:bg-white/10 transition">Hayır</button>

                                                                    </div>

                                                                )}

                                                            </td>

                                                        </tr>

                                                        {/* ── Genişletilebilir Detay Satırı ── */}

                                                        {

                                                            expandedTenantId === t.id && (

                                                                <tr className="bg-blue-500/[0.02]">

                                                                    <td colSpan={7} className="px-6 py-4">

                                                                        {tenantDetailLoading ? (

                                                                            <div className="flex items-center gap-2 py-4 justify-center text-gray-400 text-sm">

                                                                                <RefreshCw className="w-4 h-4 animate-spin" /> Yükleniyor...

                                                                            </div>

                                                                        ) : (

                                                                            <div className="space-y-4">

                                                                                {/* Odalar */}

                                                                                <div>

                                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">

                                                                                        <Server className="w-3.5 h-3.5 text-blue-400" /> Odalar ({tenantRooms.length})

                                                                                    </h4>

                                                                                    {tenantRooms.length > 0 ? (

                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">

                                                                                            {tenantRooms.map((room: any) => (

                                                                                                <div key={room.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-colors">

                                                                                                    <div className="flex items-center gap-2 min-w-0">

                                                                                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: room.buttonColor || '#3b82f6' }}></div>

                                                                                                        <span className="text-sm text-white font-medium truncate">{room.name}</span>

                                                                                                        <span className="text-xs text-gray-400 flex-shrink-0">{room.slug}</span>

                                                                                                    </div>

                                                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">

                                                                                                        {room.isLocked && <Lock className="w-3 h-3 text-amber-400" />}

                                                                                                        {room.isVipRoom && <Crown className="w-3 h-3 text-yellow-400" />}

                                                                                                        <span className="text-xs text-gray-400">{room._count?.participants || 0} kişi</span>

                                                                                                        <button

                                                                                                            onClick={() => handleGodMasterEnter(t.id, room.slug)}

                                                                                                            className="ml-1 p-1 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded transition-colors text-xs font-bold"

                                                                                                            title={`${room.name} odasına GodMaster giriş`}

                                                                                                        >

                                                                                                            <Crown className="w-3 h-3" />

                                                                                                        </button>

                                                                                                    </div>

                                                                                                </div>

                                                                                            ))}

                                                                                        </div>

                                                                                    ) : (

                                                                                        <div className="text-xs text-gray-400 italic">Henüz oda yok</div>

                                                                                    )}

                                                                                </div>



                                                                                {/* Üyeler */}

                                                                                <div>

                                                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">

                                                                                        <Users className="w-3.5 h-3.5 text-green-400" /> Üyeler ({tenantMembers.length})

                                                                                    </h4>

                                                                                    {tenantMembers.length > 0 ? (

                                                                                        <div className="rounded-xl border border-white/5 overflow-hidden">

                                                                                            <table className="w-full text-left">

                                                                                                <thead>

                                                                                                    <tr className="bg-white/[0.03] text-xs text-gray-400 uppercase tracking-wider">

                                                                                                        <th className="px-3 py-2 font-bold">Kullanıcı</th>

                                                                                                        <th className="px-3 py-2 font-bold">E-Posta</th>

                                                                                                        <th className="px-3 py-2 font-bold">Rol</th>

                                                                                                        <th className="px-3 py-2 font-bold">Durum</th>

                                                                                                        <th className="px-3 py-2 font-bold">Son Giriş</th>

                                                                                                    </tr>

                                                                                                </thead>

                                                                                                <tbody className="divide-y divide-white/[0.02]">

                                                                                                    {tenantMembers.map((m: any) => (

                                                                                                        <tr key={m.id} className="text-xs hover:bg-white/[0.02] transition-colors">

                                                                                                            <td className="px-3 py-2">

                                                                                                                <div className="flex items-center gap-2">

                                                                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>

                                                                                                                        {(m.displayName || m.username)?.[0]?.toUpperCase() || '?'}

                                                                                                                    </div>

                                                                                                                    <span className="text-white font-medium">{m.displayName || m.username || '—'}</span>

                                                                                                                </div>

                                                                                                            </td>

                                                                                                            <td className="px-3 py-2 text-gray-400 font-mono text-xs">{m.email || '—'}</td>

                                                                                                            <td className="px-3 py-2">

                                                                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${m.role === 'owner' || m.role === 'godmaster' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :

                                                                                                                    m.role === 'admin' || m.role === 'superadmin' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :

                                                                                                                        m.role === 'moderator' ? 'bg-green-500/10 text-green-400 border-green-500/20' :

                                                                                                                            m.role === 'vip' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :

                                                                                                                                'bg-white/5 text-gray-400 border-white/5'

                                                                                                                    }`}>{m.role}</span>

                                                                                                            </td>

                                                                                                            <td className="px-3 py-2">

                                                                                                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${m.isOnline ? 'bg-green-400' : 'bg-gray-600'}`}></span>

                                                                                                            </td>

                                                                                                            <td className="px-3 py-2 text-gray-400 text-xs">

                                                                                                                {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString('tr-TR') : '—'}

                                                                                                            </td>

                                                                                                        </tr>

                                                                                                    ))}

                                                                                                </tbody>

                                                                                            </table>

                                                                                        </div>

                                                                                    ) : (

                                                                                        <div className="text-xs text-gray-400 italic">Henüz üye yok</div>

                                                                                    )}

                                                                                </div>

                                                                            </div>

                                                                        )}

                                                                    </td>

                                                                </tr>

                                                            )}

                                                    </React.Fragment>

                                                );

                                            })}

                                        {tenants.filter(t => {

                                            if (statusFilter === 'ACTIVE' && t.status !== 'ACTIVE') return false;

                                            if (statusFilter === 'PASSIVE' && t.status !== 'PASSIVE') return false;

                                            if (searchQuery) { const q = searchQuery.toLowerCase(); return (t.name || '').toLowerCase().includes(q) || (t.domain || '').toLowerCase().includes(q); }

                                            return true;

                                        }).length === 0 && (

                                                <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-400">Sonuç bulunamadı.</td></tr>

                                            )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    ) : activeView === 'settings' ? (

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div className="flex items-center gap-4">

                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 flex items-center justify-center shadow-lg shadow-gray-500/10">

                                        <Settings className="w-6 h-6 text-gray-400" style={{ filter: 'drop-shadow(0 0 6px rgba(156,163,175,0.5))' }} />

                                    </div>

                                    <div>

                                        <h1 className="text-2xl font-extrabold text-white" style={{ letterSpacing: '-0.02em' }}>Panel Ayarları</h1>

                                        <p className="text-sm text-gray-400 mt-0.5">Site yapılandırması ve yönetim</p>

                                    </div>

                                </div>

                                <button onClick={saveSiteConfig} disabled={siteConfigSaving} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2 border border-green-500/30 shadow-lg shadow-green-500/10 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>

                                    {siteConfigSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}

                                    {siteConfigSaving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}

                                </button>

                            </div>



                            {/* Tab Nav */}

                            <div className="flex items-center gap-1 owner-glossy p-1.5 overflow-x-auto">

                                {[

                                    { id: 'pricing' as const, label: 'Fiyatlar', icon: <Wallet className="w-4 h-4" /> },

                                    { id: 'banks' as const, label: 'IBAN', icon: <Briefcase className="w-4 h-4" /> },

                                ].map(tab => (

                                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${settingsTab === tab.id ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>

                                        {tab.icon} {tab.label}

                                    </button>

                                ))}

                            </div>



                            {siteConfigLoading ? (

                                <div className="flex items-center justify-center py-16 text-gray-400"> <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...</div>

                            ) : (

                                <div className="flex gap-4">

                                    {/* Sol Taraf — Ayarlar */}

                                    <div className="flex-1 min-w-0">

                                        {/* ── BRANDING ── */}

                                        {settingsTab === 'branding' && (

                                            <div className="owner-glossy">

                                                <div className="p-5 border-b border-white/5">

                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> Branding & Logo</h2>

                                                    <p className="text-xs text-gray-400 mt-1">Ana sayfa ve genel site görünümü ayarları</p>

                                                </div>

                                                <div className="p-5 space-y-5">

                                                    {/* Logo Yükleme */}

                                                    <div className="flex items-start gap-5">

                                                        <div className="relative group">

                                                            {siteLogoUrl ? (

                                                                // eslint-disable-next-line @next/next/no-img-element

                                                                <img src={siteLogoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />

                                                            ) : (

                                                                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400"><Crown className="w-8 h-8" /></div>

                                                            )}

                                                            <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-2xl flex items-center justify-center">

                                                                <span className="text-white text-xs font-bold">Değiştir</span>

                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {

                                                                    const f = e.target.files?.[0]; if (!f) return;

                                                                    if (f.size > 2 * 1024 * 1024) { addToast('Logo 2MB\'dan küçük olmalı', 'error'); return; }

                                                                    const r = new FileReader(); r.onload = () => setSiteLogoUrl(r.result as string); r.readAsDataURL(f);

                                                                }} />

                                                            </label>

                                                        </div>

                                                        <div className="flex-1 space-y-3">

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Site Adı</label>

                                                                <input value={siteLogoName} onChange={(e) => setSiteLogoName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-amber-500/40" placeholder="SopranoChat" />

                                                            </div>

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Site Başlığı</label>

                                                                <input value={siteConfig.siteTitle || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, siteTitle: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40" placeholder="SopranoChat" />

                                                            </div>

                                                        </div>

                                                    </div>

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Slogan</label>

                                                        <input value={siteConfig.siteSlogan || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, siteSlogan: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40" placeholder="Premium Sohbet Platformu" />

                                                    </div>

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Footer Metni</label>

                                                        <textarea value={siteConfig.footerText || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, footerText: e.target.value }))} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40 resize-none" placeholder="© 2025 SopranoChat. Tüm hakları saklıdır." />

                                                    </div>

                                                </div>

                                            </div>

                                        )}



                                        {/* ── FİYATLANDIRMA ── */}

                                        {settingsTab === 'pricing' && (

                                            <div className="owner-glossy">

                                                <div className="p-6 border-b border-white/5">

                                                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-green-400" /> Fiyatlandırma</h2>

                                                    <p className="text-sm text-gray-400 mt-1">Ana sayfadaki paket fiyatlarını düzenleyin</p>

                                                </div>

                                                <div className="p-6 space-y-6">

                                                    {/* Yıllık indirim metni */}

                                                    <div>

                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Yıllık İndirim Mesajı</label>

                                                        <input value={siteConfig.pricing?.yearlyDiscount || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, pricing: { ...(p.pricing || {}), yearlyDiscount: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/40" placeholder="2 Ay Hediye 🎁" />

                                                    </div>

                                                    {/* Paketler */}

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                                                        {[

                                                            { key: 'p1', label: 'Paket 1', color: 'amber' },

                                                            { key: 'p2', label: 'Paket 2 (Popüler)', color: 'green' },

                                                            { key: 'p3', label: 'Paket 3 (Bayi)', color: 'blue' },

                                                        ].map(pkg => (

                                                            <div key={pkg.key} className={`rounded-xl border border-white/10 p-5 space-y-4 bg-white/[0.02]`}>

                                                                <div className="text-sm font-bold text-white uppercase tracking-wider">{pkg.label}</div>

                                                                <div>

                                                                    <label className="text-xs text-gray-400 block mb-1.5">Paket Adı</label>

                                                                    <input value={siteConfig.pricing?.[`${pkg.key}Name`] || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, pricing: { ...(p.pricing || {}), [`${pkg.key}Name`]: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/40" />

                                                                </div>

                                                                <div className="grid grid-cols-2 gap-3">

                                                                    <div>

                                                                        <label className="text-xs text-gray-400 block mb-1.5">Aylık (₺)</label>

                                                                        <input value={siteConfig.pricing?.[`${pkg.key}Monthly`] || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, pricing: { ...(p.pricing || {}), [`${pkg.key}Monthly`]: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/40" placeholder="990" />

                                                                    </div>

                                                                    <div>

                                                                        <label className="text-xs text-gray-400 block mb-1.5">Yıllık (₺)</label>

                                                                        <input value={siteConfig.pricing?.[`${pkg.key}Yearly`] || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, pricing: { ...(p.pricing || {}), [`${pkg.key}Yearly`]: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/40" placeholder="9.900" />

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        ))}

                                                    </div>

                                                </div>

                                            </div>

                                        )}



                                        {/* ── BANKA / IBAN ── */}

                                        {settingsTab === 'banks' && (

                                            <div className="owner-glossy">

                                                <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                                    <div>

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-amber-400" /> Banka Hesapları (IBAN)</h2>

                                                        <p className="text-xs text-gray-400 mt-1">Ödeme sayfasında görünecek banka hesapları</p>

                                                    </div>

                                                    <button onClick={() => setSiteConfig((p: any) => ({ ...p, banks: [...(p.banks || []), { bank: '', name: '', iban: '' }] }))} className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20 transition-colors flex items-center gap-1.5">

                                                        <PlusCircle className="w-3.5 h-3.5" /> Hesap Ekle

                                                    </button>

                                                </div>

                                                <div className="p-5 space-y-3">

                                                    {(siteConfig.banks || []).map((b: any, i: number) => (

                                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 group">

                                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">

                                                                <div>

                                                                    <label className="text-[10px] text-gray-400 block mb-1">Banka Adı</label>

                                                                    <input value={b.bank} onChange={(e) => { const arr = [...siteConfig.banks]; arr[i] = { ...arr[i], bank: e.target.value }; setSiteConfig((p: any) => ({ ...p, banks: arr })); }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40" placeholder="VakıfBank" />

                                                                </div>

                                                                <div>

                                                                    <label className="text-[10px] text-gray-400 block mb-1">Hesap Sahibi</label>

                                                                    <input value={b.name} onChange={(e) => { const arr = [...siteConfig.banks]; arr[i] = { ...arr[i], name: e.target.value }; setSiteConfig((p: any) => ({ ...p, banks: arr })); }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40" placeholder="Soprano Bilişim A.Ş." />

                                                                </div>

                                                                <div>

                                                                    <label className="text-[10px] text-gray-400 block mb-1">IBAN</label>

                                                                    <input value={b.iban} onChange={(e) => { const arr = [...siteConfig.banks]; arr[i] = { ...arr[i], iban: e.target.value }; setSiteConfig((p: any) => ({ ...p, banks: arr })); }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-amber-500/40" placeholder="TR00 0000 0000 0000 0000 0000 00" />

                                                                </div>

                                                            </div>

                                                            <button onClick={() => { const arr = siteConfig.banks.filter((_: any, j: number) => j !== i); setSiteConfig((p: any) => ({ ...p, banks: arr })); }} className="p-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-4">

                                                                <Trash2 className="w-4 h-4" />

                                                            </button>

                                                        </div>

                                                    ))}

                                                    {(!siteConfig.banks || siteConfig.banks.length === 0) && (

                                                        <div className="py-8 text-center text-gray-400 text-sm">Henüz banka hesabı eklenmedi</div>

                                                    )}

                                                </div>

                                            </div>

                                        )}



                                        {/* ── İLETİŞİM ── */}

                                        {settingsTab === 'contact' && (

                                            <div className="owner-glossy">

                                                <div className="p-5 border-b border-white/5">

                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Phone className="w-5 h-5 text-blue-400" /> İletişim Bilgileri</h2>

                                                    <p className="text-xs text-gray-400 mt-1">Site genelinde görünecek iletişim bilgileri</p>

                                                </div>

                                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon</label>

                                                        <input value={siteConfig.contact?.phone || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, contact: { ...(p.contact || {}), phone: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="+90 555 123 45 67" />

                                                    </div>

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> WhatsApp</label>

                                                        <input value={siteConfig.contact?.whatsapp || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, contact: { ...(p.contact || {}), whatsapp: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/40" placeholder="+90 555 123 45 67" />

                                                    </div>

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> E-Posta</label>

                                                        <input value={siteConfig.contact?.email || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, contact: { ...(p.contact || {}), email: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="info@sopranochat.com" />

                                                    </div>

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Adres</label>

                                                        <input value={siteConfig.contact?.address || ''} onChange={(e) => setSiteConfig((p: any) => ({ ...p, contact: { ...(p.contact || {}), address: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="İstanbul, Türkiye" />

                                                    </div>

                                                </div>

                                            </div>

                                        )}



                                        {/* ── TEMA ── */}

                                        {settingsTab === 'theme' && (

                                            <div className="owner-glossy">

                                                <div className="p-5 border-b border-white/5">

                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-purple-400" /> Tema Ayarları</h2>

                                                    <p className="text-xs text-gray-400 mt-1">Varsayılan tema ve renk şeması</p>

                                                </div>

                                                <div className="p-5 space-y-5">

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                                        <div>

                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Ana Renk</label>

                                                            <div className="flex items-center gap-3">

                                                                <input type="color" value={siteConfig.primaryColor || '#c8962e'} onChange={(e) => setSiteConfig((p: any) => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />

                                                                <input value={siteConfig.primaryColor || '#c8962e'} onChange={(e) => setSiteConfig((p: any) => ({ ...p, primaryColor: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/40" />

                                                            </div>

                                                        </div>

                                                        <div>

                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Vurgu Rengi</label>

                                                            <div className="flex items-center gap-3">

                                                                <input type="color" value={siteConfig.accentColor || '#a8927e'} onChange={(e) => setSiteConfig((p: any) => ({ ...p, accentColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />

                                                                <input value={siteConfig.accentColor || '#a8927e'} onChange={(e) => setSiteConfig((p: any) => ({ ...p, accentColor: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500/40" />

                                                            </div>

                                                        </div>

                                                    </div>

                                                    {/* Hazır renk paletleri */}

                                                    <div>

                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Hazır Paletler</label>

                                                        <div className="flex flex-wrap gap-2">

                                                            {[

                                                                { name: 'Gold', primary: '#c8962e', accent: '#a8927e' },

                                                                { name: 'Ocean', primary: '#0ea5e9', accent: '#06b6d4' },

                                                                { name: 'Forest', primary: '#22c55e', accent: '#10b981' },

                                                                { name: 'Sunset', primary: '#f97316', accent: '#ef4444' },

                                                                { name: 'Royal', primary: '#8b5cf6', accent: '#a855f7' },

                                                                { name: 'Rose', primary: '#ec4899', accent: '#f43f5e' },

                                                            ].map(pal => (

                                                                <button key={pal.name} onClick={() => setSiteConfig((p: any) => ({ ...p, primaryColor: pal.primary, accentColor: pal.accent }))} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-xs font-bold text-gray-400 hover:text-white">

                                                                    <div className="flex gap-1">

                                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.primary }}></div>

                                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.accent }}></div>

                                                                    </div>

                                                                    {pal.name}

                                                                </button>

                                                            ))}

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>

                                        )}



                                        {/* ── ANA SAYFA ── */}

                                        {settingsTab === 'homepage' && (

                                            <div className="space-y-4">

                                                {/* Arka Plan Renkleri */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /> Arka Plan & Renkler</h2>

                                                        <p className="text-xs text-gray-400 mt-1">Ana sayfanın genel arka plan ve header renkleri</p>

                                                    </div>

                                                    <div className="p-5 space-y-5">

                                                        {/* Body Gradient */}

                                                        <div>

                                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Sayfa Arka Plan Gradient</label>

                                                            <div className="grid grid-cols-3 gap-3">

                                                                {[{ key: 'bodyGradient1', label: 'Üst' }, { key: 'bodyGradient2', label: 'Orta' }, { key: 'bodyGradient3', label: 'Alt' }].map(g => (

                                                                    <div key={g.key}>

                                                                        <label className="text-[10px] text-gray-400 block mb-1">{g.label}</label>

                                                                        <div className="flex items-center gap-2">

                                                                            <input type="color" value={siteConfig.homepage?.[g.key] || '#a3ace5'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), [g.key]: e.target.value } }))} className="w-8 h-8 rounded-lg cursor-pointer border border-white/10" />

                                                                            <input type="text" value={siteConfig.homepage?.[g.key] || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), [g.key]: e.target.value } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono outline-none focus:border-blue-500/50" />

                                                                        </div>

                                                                    </div>

                                                                ))}

                                                            </div>

                                                        </div>

                                                        {/* Main Content BG */}

                                                        <div>

                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Ana içerik Arka Planı</label>

                                                            <div className="flex items-center gap-3">

                                                                <input type="color" value={siteConfig.homepage?.mainBg || '#7a7e9e'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), mainBg: e.target.value } }))} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10" />

                                                                <input type="text" value={siteConfig.homepage?.mainBg || '#7a7e9e'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), mainBg: e.target.value } }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-blue-500/50" />

                                                            </div>

                                                        </div>

                                                        {/* Header Gradient */}

                                                        <div>

                                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Header Bar Gradient (5 nokta)</label>

                                                            <div className="grid grid-cols-5 gap-2">

                                                                {[{ key: 'headerGradient1', label: 'Üst' }, { key: 'headerGradient2', label: '15%' }, { key: 'headerGradient3', label: 'Orta' }, { key: 'headerGradient4', label: '75%' }, { key: 'headerGradient5', label: 'Alt' }].map(g => (

                                                                    <div key={g.key}>

                                                                        <label className="text-[9px] text-gray-400 block mb-1 text-center">{g.label}</label>

                                                                        <input type="color" value={siteConfig.homepage?.[g.key] || '#1e222e'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), [g.key]: e.target.value } }))} className="w-full h-8 rounded-lg cursor-pointer border border-white/10" />

                                                                    </div>

                                                                ))}

                                                            </div>

                                                        </div>

                                                        {/* Login Renkleri */}

                                                        <div className="grid grid-cols-3 gap-3">

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Giriş Kartı Arka Plan</label>

                                                                <div className="flex items-center gap-2">

                                                                    <input type="color" value={siteConfig.homepage?.loginBg || '#1e293b'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), loginBg: e.target.value } }))} className="w-8 h-8 rounded-lg cursor-pointer border border-white/10" />

                                                                    <input type="text" value={siteConfig.homepage?.loginBg || 'rgba(30,41,59,0.85)'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), loginBg: e.target.value } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono outline-none" />

                                                                </div>

                                                            </div>

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Giriş Kenarlık</label>

                                                                <input type="text" value={siteConfig.homepage?.loginCardBorder || 'rgba(255,255,255,0.15)'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), loginCardBorder: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono outline-none" />

                                                            </div>

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 block mb-1">Giriş Vurgu Rengi</label>

                                                                <div className="flex items-center gap-2">

                                                                    <input type="color" value={siteConfig.homepage?.loginAccentColor || '#38bdf8'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), loginAccentColor: e.target.value } }))} className="w-8 h-8 rounded-lg cursor-pointer border border-white/10" />

                                                                    <input type="text" value={siteConfig.homepage?.loginAccentColor || '#38bdf8'} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), loginAccentColor: e.target.value } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono outline-none" />

                                                                </div>

                                                            </div>

                                                        </div>

                                                        {/* Hazır Renk Temaları */}

                                                        <div>

                                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Hazır Temalar</label>

                                                            <div className="grid grid-cols-4 gap-2">

                                                                {[

                                                                    { name: 'Klasik', bg1: '#a3ace5', bg2: '#c4c9ee', bg3: '#d8dbf4', main: '#7a7e9e', hg1: '#5a6070', hg3: '#1e222e', login: '#38bdf8' },

                                                                    { name: 'Gece', bg1: '#1a1a2e', bg2: '#16213e', bg3: '#0f3460', main: '#0a0a12', hg1: '#2a2a40', hg3: '#0a0a18', login: '#6366f1' },

                                                                    { name: 'Okyanus', bg1: '#0e4166', bg2: '#1a5276', bg3: '#2980b9', main: '#154360', hg1: '#1b4f72', hg3: '#0e2f44', login: '#00d2ff' },

                                                                    { name: 'Orman', bg1: '#1a3c34', bg2: '#2d5a4e', bg3: '#3d7b6e', main: '#1a3c34', hg1: '#2d4a3e', hg3: '#0e2a22', login: '#22c55e' },

                                                                    { name: 'Gün Batımı', bg1: '#4a1a3a', bg2: '#6a2a4a', bg3: '#8a3a5a', main: '#3a1a2e', hg1: '#5a3040', hg3: '#2a1020', login: '#f97316' },

                                                                    { name: 'Kraliyet', bg1: '#2d1b69', bg2: '#44278a', bg3: '#5b34a5', main: '#1a0f45', hg1: '#3a2870', hg3: '#15083a', login: '#a855f7' },

                                                                    { name: 'Gül', bg1: '#4a1a2a', bg2: '#6a2a3a', bg3: '#8a3a4a', main: '#3a1020', hg1: '#5a2030', hg3: '#2a0a18', login: '#ec4899' },

                                                                    { name: 'Altın', bg1: '#3a3020', bg2: '#5a4a30', bg3: '#7a6a40', main: '#2a2818', hg1: '#4a3820', hg3: '#1a1808', login: '#fbbf24' },

                                                                ].map(t => (

                                                                    <button key={t.name} onClick={() => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), bodyGradient1: t.bg1, bodyGradient2: t.bg2, bodyGradient3: t.bg3, mainBg: t.main, headerGradient1: t.hg1, headerGradient3: t.hg3, loginAccentColor: t.login } }))} className="p-2 rounded-lg border border-white/5 hover:border-white/20 transition-all group">

                                                                        <div className="h-8 rounded mb-1 overflow-hidden" style={{ background: `linear-gradient(180deg, ${t.bg1}, ${t.bg2}, ${t.bg3})` }}>

                                                                            <div className="h-2 rounded-t" style={{ background: t.hg3 }}></div>

                                                                        </div>

                                                                        <span className="text-[9px] text-gray-400 group-hover:text-white transition-colors">{t.name}</span>

                                                                    </button>

                                                                ))}

                                                            </div>

                                                        </div>

                                                        {/* Önizleme */}

                                                        <div>

                                                            <label className="text-xs font-bold text-gray-400 mb-2 block">Önizleme</label>

                                                            <div className="h-28 rounded-xl border border-white/10 overflow-hidden" style={{ background: `linear-gradient(180deg, ${siteConfig.homepage?.bodyGradient1 || '#a3ace5'}, ${siteConfig.homepage?.bodyGradient2 || '#c4c9ee'}, ${siteConfig.homepage?.bodyGradient3 || '#d8dbf4'})` }}>

                                                                <div className="mx-4 mt-2 h-20 rounded-t-lg" style={{ background: siteConfig.homepage?.mainBg || '#7a7e9e' }}>

                                                                    <div className="h-5 rounded-b-xl mx-auto" style={{ width: '90%', background: `linear-gradient(180deg, ${siteConfig.homepage?.headerGradient1 || '#5a6070'}, ${siteConfig.homepage?.headerGradient3 || '#1e222e'}, ${siteConfig.homepage?.headerGradient5 || '#3a3f50'})` }}>

                                                                        <div className="flex items-center justify-center h-full gap-2">

                                                                            <span className="text-[6px] text-gray-300 font-bold">SopranoChat</span>

                                                                            <span className="text-[5px] text-gray-400">HOME</span>

                                                                            <span className="text-[5px] text-gray-400">ODALAR</span>

                                                                        </div>

                                                                    </div>

                                                                    <div className="flex items-center justify-center h-10">

                                                                        <div className="px-3 py-1 rounded text-[6px] font-bold text-white" style={{ background: siteConfig.homepage?.loginAccentColor || '#38bdf8' }}>Hemen Başla</div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>



                                                {/* Hero Section */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">✨ Hero Bölümü</h2>

                                                        <p className="text-xs text-gray-400 mt-1">Ana sayfadaki karşılama başlığı ve buton metinleri</p>

                                                    </div>

                                                    <div className="p-5 space-y-4">

                                                        <div>

                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hero Başlık (boş bırakılırsa varsayılan kullanılır)</label>

                                                            <input value={siteConfig.homepage?.heroTitle || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), heroTitle: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="Hoş Geldiniz!" />

                                                        </div>

                                                        <div>

                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Alt Başlık</label>

                                                            <input value={siteConfig.homepage?.heroSubtitle || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), heroSubtitle: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="En iyi sesli & görüntülü sohbet platformu" />

                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">CTA Buton 1 Metni</label>

                                                                <input value={siteConfig.homepage?.heroCTA1 || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), heroCTA1: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="Hemen Başla" />

                                                            </div>

                                                            <div>

                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">CTA Buton 2 Metni</label>

                                                                <input value={siteConfig.homepage?.heroCTA2 || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), heroCTA2: e.target.value } }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40" placeholder="Detaylı Bilgi" />

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>



                                                {/* Navigasyon Menüsü */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">🧭 Navigasyon Menüsü</h2>

                                                        <p className="text-xs text-gray-400 mt-1">Header'daki menü öğelerini özelleştirin</p>

                                                    </div>

                                                    <div className="p-5 space-y-2">

                                                        {(siteConfig.homepage?.navItems || [

                                                            { label: 'HOME', section: 'home', visible: true },

                                                            { label: 'ODALAR', section: '_odalar', visible: true },

                                                            { label: 'REHBER', section: 'rehber', visible: true },

                                                            { label: 'FİYATLAR', section: 'fiyatlar', visible: true },

                                                            { label: 'REFERANSLAR', section: 'referanslar', visible: true },

                                                            { label: 'İLETİŞİM', section: 'iletisim', visible: true },

                                                        ]).map((item: any, i: number) => (

                                                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${item.visible !== false ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/5 border-red-500/10 opacity-60'}`}>

                                                                <button onClick={() => {

                                                                    const items = [...(siteConfig.homepage?.navItems || [])];

                                                                    items[i] = { ...items[i], visible: items[i].visible === false ? true : false };

                                                                    setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), navItems: items } }));

                                                                }} className={`w-7 h-4 rounded-full transition-all relative ${item.visible !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${item.visible !== false ? 'left-3.5' : 'left-0.5'}`}></div>

                                                                </button>

                                                                <input

                                                                    value={item.label}

                                                                    onChange={e => {

                                                                        const items = [...(siteConfig.homepage?.navItems || [])];

                                                                        items[i] = { ...items[i], label: e.target.value };

                                                                        setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), navItems: items } }));

                                                                    }}

                                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-bold uppercase tracking-wider outline-none focus:border-blue-500/40"

                                                                />

                                                                <span className="text-[9px] text-gray-400 font-mono bg-white/5 px-2 py-1 rounded">{item.section}</span>

                                                            </div>

                                                        ))}

                                                    </div>

                                                </div>



                                                {/* Özellik Kartları */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                                        <div>

                                                            <h2 className="text-lg font-bold text-white flex items-center gap-2">🃏 Özellik Kartları</h2>

                                                            <p className="text-xs text-gray-400 mt-1">Ana sayfadaki özellik kartlarının içerikleri</p>

                                                        </div>

                                                        <button onClick={() => {

                                                            const cards = [...(siteConfig.homepage?.featureCards || [])];

                                                            cards.push({ icon: '⚡', title: 'Yeni Özellik', desc: 'Açıklama ekleyin' });

                                                            setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), featureCards: cards } }));

                                                        }} className="px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20 transition-colors flex items-center gap-1.5">

                                                            <PlusCircle className="w-3.5 h-3.5" /> Kart Ekle

                                                        </button>

                                                    </div>

                                                    <div className="p-5 space-y-3">

                                                        {(siteConfig.homepage?.featureCards || []).map((card: any, i: number) => (

                                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group">

                                                                <input value={card.icon} onChange={e => {

                                                                    const cards = [...(siteConfig.homepage?.featureCards || [])];

                                                                    cards[i] = { ...cards[i], icon: e.target.value };

                                                                    setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), featureCards: cards } }));

                                                                }} className="w-12 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-lg outline-none" />

                                                                <div className="flex-1 space-y-2">

                                                                    <input value={card.title} onChange={e => {

                                                                        const cards = [...(siteConfig.homepage?.featureCards || [])];

                                                                        cards[i] = { ...cards[i], title: e.target.value };

                                                                        setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), featureCards: cards } }));

                                                                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-blue-500/40" placeholder="Başlık" />

                                                                    <input value={card.desc} onChange={e => {

                                                                        const cards = [...(siteConfig.homepage?.featureCards || [])];

                                                                        cards[i] = { ...cards[i], desc: e.target.value };

                                                                        setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), featureCards: cards } }));

                                                                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-500/40" placeholder="Açıklama" />

                                                                </div>

                                                                <button onClick={() => {

                                                                    const cards = (siteConfig.homepage?.featureCards || []).filter((_: any, j: number) => j !== i);

                                                                    setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), featureCards: cards } }));

                                                                }} className="p-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">

                                                                    <Trash2 className="w-4 h-4" />

                                                                </button>

                                                            </div>

                                                        ))}

                                                    </div>

                                                </div>



                                                {/* Bölüm Görünürlüğü */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">👁️ Bölüm Görünürlüğü</h2>

                                                        <p className="text-xs text-gray-400 mt-1">Ana sayfadaki bölümleri açıp kapatın</p>

                                                    </div>

                                                    <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">

                                                        {[

                                                            { key: 'showPackages', label: '💰 Fiyat Paketleri' },

                                                            { key: 'showReferences', label: '⭐ Referanslar' },

                                                            { key: 'showGuide', label: '📖 Rehber' },

                                                            { key: 'showCookieConsent', label: '🍪 Çerez Onayı' },

                                                        ].map(item => (

                                                            <button key={item.key} onClick={() => setSiteConfig((p: any) => ({ ...p, homepage: { ...(p.homepage || {}), [item.key]: !(p.homepage || {})[item.key] } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${siteConfig.homepage?.[item.key] !== false ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>

                                                                <div className="flex items-center justify-between">

                                                                    <span className="text-white">{item.label}</span>

                                                                    <div className={`w-7 h-4 rounded-full transition-all relative ${siteConfig.homepage?.[item.key] !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${siteConfig.homepage?.[item.key] !== false ? 'left-3.5' : 'left-0.5'}`}></div>

                                                                    </div>

                                                                </div>

                                                            </button>

                                                        ))}

                                                    </div>

                                                </div>

                                            </div>

                                        )}





                                        {/* ── GENEL ── */}

                                        {settingsTab === 'general' && (

                                            <div className="space-y-4">

                                                {/* System Info Cards */}

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                                    <div className="owner-glossy p-5">

                                                        <div className="flex items-center gap-3 mb-3">

                                                            <div className="p-2 rounded-lg bg-green-500/10 text-green-400"><Wifi className="w-4 h-4" /></div>

                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">API Durumu</span>

                                                        </div>

                                                        <div className="text-sm text-white font-mono break-all">{API_URL}</div>

                                                        <div className="flex items-center gap-1.5 mt-2"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><span className="text-[10px] text-green-400 font-bold">Bağlı</span></div>

                                                    </div>

                                                    <div className="owner-glossy p-5">

                                                        <div className="flex items-center gap-3 mb-3">

                                                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Shield className="w-4 h-4" /></div>

                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Oturum</span>

                                                        </div>

                                                        <div className="text-sm text-white font-semibold">{adminUser?.displayName || 'Admin'}</div>

                                                        <div className="text-[11px] text-gray-400 mt-1">{adminUser?.email || '—'}</div>

                                                        <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded border ${isGodMaster ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>{adminUser?.role || 'Bilinmiyor'}</span>

                                                    </div>

                                                    <div className="owner-glossy p-5">

                                                        <div className="flex items-center gap-3 mb-3">

                                                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><Briefcase className="w-4 h-4" /></div>

                                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sistem</span>

                                                        </div>

                                                        <div className="text-sm text-white font-semibold">SopranoChat Admin</div>

                                                        <div className="text-[11px] text-gray-400 mt-1">Toplam {tenants.length} müşteri &middot; {hqMembers.length} yönetici</div>

                                                    </div>

                                                </div>

                                                {/* Güvenlik */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-400" /> Güvenlik</h2>

                                                    </div>

                                                    <div className="p-5 space-y-4">

                                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                                            <div><div className="text-sm font-semibold text-white">Otomatik Admin Oluşturma</div><div className="text-[11px] text-gray-400 mt-0.5">Sunucu başlatıldığında otomatik admin hesabı</div></div>

                                                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">Devre Dışı</span>

                                                        </div>

                                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                                            <div><div className="text-sm font-semibold text-white">Admin Token</div><div className="text-[11px] text-gray-400 mt-0.5">Mevcut oturum token bilgisi</div></div>

                                                            <div className="flex items-center gap-2">

                                                                <span className="text-xs text-gray-400 font-mono">{(sessionStorage.getItem('soprano_admin_token') || '').substring(0, 20)}...</span>

                                                                <button onClick={() => { navigator.clipboard.writeText(sessionStorage.getItem('soprano_admin_token') || ''); addToast('Token kopyalandı', 'success'); }} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Copy className="w-3.5 h-3.5" /></button>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                                {/* Hızlı İşlemler */}

                                                <div className="owner-glossy">

                                                    <div className="p-5 border-b border-white/5">

                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Hızlı İşlemler</h2>

                                                    </div>

                                                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">

                                                        <button onClick={() => setActiveView('logs')} className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-yellow-500/20 transition-all text-left group">

                                                            <ScrollText className="w-5 h-5 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />

                                                            <div className="text-sm font-semibold text-white">Sistem Logları</div>

                                                            <div className="text-[10px] text-gray-400 mt-0.5">Tüm logları görüntüle</div>

                                                        </button>

                                                        <button onClick={() => setActiveView('hqMembers')} className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-500/20 transition-all text-left group">

                                                            <ShieldCheck className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />

                                                            <div className="text-sm font-semibold text-white">Yönetici Yönetimi</div>

                                                            <div className="text-[10px] text-gray-400 mt-0.5">Admin ve yardımcılar</div>

                                                        </button>

                                                        <button onClick={() => { sessionStorage.removeItem('soprano_admin_token'); sessionStorage.removeItem('soprano_admin_user'); router.replace('/riconun-odasi'); }} className="p-4 rounded-xl bg-white/[0.02] hover:bg-red-500/[0.05] border border-white/5 hover:border-red-500/20 transition-all text-left group">

                                                            <LogOut className="w-5 h-5 text-red-400 mb-2 group-hover:scale-110 transition-transform" />

                                                            <div className="text-sm font-semibold text-white">Çıkış Yap</div>

                                                            <div className="text-[10px] text-gray-400 mt-0.5">Oturumu sonlandır</div>

                                                        </button>

                                                    </div>

                                                </div>

                                            </div>

                                        )}



                                        {/* ── ODA YÖNETİMİ ── */}

                                        {settingsTab === 'rooms' && (

                                            <div className="flex gap-4">

                                                {/* Sol Taraf — Ayarlar */}

                                                <div className="flex-1 min-w-0 space-y-4">

                                                    {/* Sub-tabs */}

                                                    <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1 overflow-x-auto">

                                                        {[

                                                            { id: 'design' as const, label: '🎨 Tasarım' },

                                                            { id: 'toolbar' as const, label: '🔧 Toolbar' },

                                                            { id: 'permissions' as const, label: '👥 Yetkiler' },

                                                            { id: 'chat' as const, label: '💬 Chat' },

                                                            { id: 'layout' as const, label: '📐 Yerleşim' },

                                                            { id: 'media' as const, label: '📻 Medya' },

                                                        ].map(sub => (

                                                            <button key={sub.id} onClick={() => setRoomConfigTab(sub.id)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${roomConfigTab === sub.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>

                                                                {sub.label}

                                                            </button>

                                                        ))}

                                                    </div>



                                                    {/* ── TASARIM ── */}

                                                    {roomConfigTab === 'design' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">🎨 Oda Tasarım Editörü</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Arka plan, renkler ve genel görünüm ayarları</p>

                                                                </div>

                                                                <div className="p-5 space-y-5">

                                                                    {/* Arka Plan Tipi */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Arka Plan Tipi</label>

                                                                        <div className="grid grid-cols-3 gap-2">

                                                                            {[{ v: 'gradient', l: 'Gradient' }, { v: 'solid', l: 'Düz Renk' }, { v: 'image', l: 'Resim' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgType: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${siteConfig.roomConfig?.design?.bgType === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                    {/* Renk Seçiciler */}

                                                                    <div className="grid grid-cols-2 gap-4">

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Arka Plan Renk 1</label>

                                                                            <div className="flex items-center gap-2">

                                                                                <input type="color" value={siteConfig.roomConfig?.design?.bgColor1 || '#0a0a12'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgColor1: e.target.value } } }))} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10" />

                                                                                <input type="text" value={siteConfig.roomConfig?.design?.bgColor1 || '#0a0a12'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgColor1: e.target.value } } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50" />

                                                                            </div>

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Arka Plan Renk 2</label>

                                                                            <div className="flex items-center gap-2">

                                                                                <input type="color" value={siteConfig.roomConfig?.design?.bgColor2 || '#1a1a2e'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgColor2: e.target.value } } }))} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10" />

                                                                                <input type="text" value={siteConfig.roomConfig?.design?.bgColor2 || '#1a1a2e'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgColor2: e.target.value } } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50" />

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Accent & Card */}

                                                                    <div className="grid grid-cols-2 gap-4">

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Vurgu Rengi (Accent)</label>

                                                                            <div className="flex items-center gap-2">

                                                                                <input type="color" value={siteConfig.roomConfig?.design?.accentColor || '#6366f1'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), accentColor: e.target.value } } }))} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10" />

                                                                                <input type="text" value={siteConfig.roomConfig?.design?.accentColor || '#6366f1'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), accentColor: e.target.value } } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50" />

                                                                            </div>

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Header Arka Plan</label>

                                                                            <div className="flex items-center gap-2">

                                                                                <input type="color" value={siteConfig.roomConfig?.design?.headerBg || '#0a0a12'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), headerBg: e.target.value } } }))} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10" />

                                                                                <input type="text" value={siteConfig.roomConfig?.design?.headerBg || 'rgba(10,10,18,0.9)'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), headerBg: e.target.value } } }))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50" />

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Arka plan resim */}

                                                                    {siteConfig.roomConfig?.design?.bgType === 'image' && (

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Arka Plan Resim URL</label>

                                                                            <input type="text" value={siteConfig.roomConfig?.design?.bgImage || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, design: { ...(p.roomConfig?.design || {}), bgImage: e.target.value } } }))} placeholder="https://example.com/bg.jpg" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                    )}

                                                                    {/* Önizleme */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Önizleme</label>

                                                                        <div className="h-32 rounded-xl border border-white/10 overflow-hidden" style={{

                                                                            background: siteConfig.roomConfig?.design?.bgType === 'image'

                                                                                ? `url(${siteConfig.roomConfig?.design?.bgImage}) center/cover`

                                                                                : siteConfig.roomConfig?.design?.bgType === 'solid'

                                                                                    ? siteConfig.roomConfig?.design?.bgColor1

                                                                                    : `linear-gradient(135deg, ${siteConfig.roomConfig?.design?.bgColor1 || '#0a0a12'}, ${siteConfig.roomConfig?.design?.bgColor2 || '#1a1a2e'})`

                                                                        }}>

                                                                            <div className="h-8 flex items-center px-3 gap-2" style={{ background: siteConfig.roomConfig?.design?.headerBg || 'rgba(10,10,18,0.9)' }}>

                                                                                <div className="w-2 h-2 rounded-full" style={{ background: siteConfig.roomConfig?.design?.accentColor || '#6366f1' }}></div>

                                                                                <span className="text-[10px] text-gray-400">Oda Başlığı</span>

                                                                            </div>

                                                                            <div className="p-3 space-y-1.5">

                                                                                <div className="flex items-start gap-2">

                                                                                    <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0"></div>

                                                                                    <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">

                                                                                        <span className="text-[9px] text-gray-300">Merhaba!</span>

                                                                                    </div>

                                                                                </div>

                                                                                <div className="flex items-start gap-2 justify-end">

                                                                                    <div className="px-2.5 py-1 rounded-lg border" style={{ background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}20`, borderColor: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}40` }}>

                                                                                        <span className="text-[9px] text-gray-300">Hoş geldin 👋</span>

                                                                                    </div>

                                                                                </div>

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Hazır Paletler */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Hazır Paletler</label>

                                                                        <div className="grid grid-cols-4 gap-2">

                                                                            {[

                                                                                { name: 'Midnight', c1: '#0a0a12', c2: '#1a1a2e', accent: '#6366f1' },

                                                                                { name: 'Ocean', c1: '#0a192f', c2: '#112240', accent: '#64ffda' },

                                                                                { name: 'Crimson', c1: '#1a0a0a', c2: '#2e1a1a', accent: '#ef4444' },

                                                                                { name: 'Forest', c1: '#0a1a0a', c2: '#1a2e1a', accent: '#22c55e' },

                                                                                { name: 'Amber', c1: '#1a150a', c2: '#2e2510', accent: '#f59e0b' },

                                                                                { name: 'Lavender', c1: '#150a1a', c2: '#25102e', accent: '#a855f7' },

                                                                                { name: 'Teal', c1: '#0a1a1a', c2: '#102e2e', accent: '#14b8a6' },

                                                                                { name: 'Rose', c1: '#1a0a10', c2: '#2e1525', accent: '#f43f5e' },

                                                                            ].map(p => (

                                                                                <button key={p.name} onClick={() => setSiteConfig((prev: any) => ({ ...prev, roomConfig: { ...prev.roomConfig, design: { ...(prev.roomConfig?.design || {}), bgColor1: p.c1, bgColor2: p.c2, accentColor: p.accent } } }))} className="p-2 rounded-lg border border-white/5 hover:border-white/20 transition-all group">

                                                                                    <div className="h-6 rounded mb-1" style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}>

                                                                                        <div className="w-full h-full flex items-center justify-center">

                                                                                            <div className="w-3 h-3 rounded-full" style={{ background: p.accent, boxShadow: `0 0 8px ${p.accent}60` }}></div>

                                                                                        </div>

                                                                                    </div>

                                                                                    <span className="text-[9px] text-gray-400 group-hover:text-white transition-colors">{p.name}</span>

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}



                                                    {/* ── TOOLBAR ── */}

                                                    {roomConfigTab === 'toolbar' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">🔧 Toolbar Yapılandırması</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Alt çubuktaki butonları açıp kapatın ve sıralayın</p>

                                                                </div>

                                                                <div className="p-5 space-y-5">

                                                                    {/* Buton Görünürlük */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-3 block">Buton Görünürlüğü</label>

                                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                                                                            {[

                                                                                { key: 'showMic', label: '🎤 Mikrofon', desc: 'Konuşma butonu' },

                                                                                { key: 'showCamera', label: '📷 Kamera', desc: 'Video butonu' },

                                                                                { key: 'showEmoji', label: '😊 Emoji', desc: 'Emoji seçici' },

                                                                                { key: 'showSticker', label: '🎯 Sticker', desc: 'Sticker seçici' },

                                                                                { key: 'showGif', label: '🎬 GIF', desc: 'GIF arama' },

                                                                                { key: 'showVolume', label: '🔊 Ses', desc: 'Ses kontrolü' },

                                                                                { key: 'showSettings', label: 'âš™️ Ayarlar', desc: 'Kullanıcı ayarları' },

                                                                                { key: 'showHandRaise', label: '✋ El Kaldır', desc: 'Söz isteme' },

                                                                                { key: 'showThemeSwitcher', label: '🎨 Tema', desc: 'Tema değiştirici' },

                                                                            ].map(item => (

                                                                                <button key={item.key} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, toolbar: { ...(p.roomConfig?.toolbar || {}), [item.key]: !(p.roomConfig?.toolbar || {})[item.key] } } }))} className={`p-3 rounded-xl text-left transition-all border ${siteConfig.roomConfig?.toolbar?.[item.key] !== false ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40' : 'bg-red-500/5 border-red-500/10 hover:border-red-500/30'}`}>

                                                                                    <div className="flex items-center justify-between mb-1">

                                                                                        <span className="text-xs font-bold text-white">{item.label}</span>

                                                                                        <div className={`w-8 h-4 rounded-full transition-all relative ${siteConfig.roomConfig?.toolbar?.[item.key] !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                                            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${siteConfig.roomConfig?.toolbar?.[item.key] !== false ? 'left-4' : 'left-0.5'}`}></div>

                                                                                        </div>

                                                                                    </div>

                                                                                    <span className="text-[10px] text-gray-400">{item.desc}</span>

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                    {/* Buton Boyutu */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Buton Boyutu</label>

                                                                        <div className="grid grid-cols-3 gap-2">

                                                                            {[{ v: 'small', l: 'Küçük' }, { v: 'normal', l: 'Normal' }, { v: 'large', l: 'Büyük' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, toolbar: { ...(p.roomConfig?.toolbar || {}), buttonSize: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${siteConfig.roomConfig?.toolbar?.buttonSize === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                    {/* Toolbar Pozisyonu */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Toolbar Pozisyonu</label>

                                                                        <div className="grid grid-cols-2 gap-2">

                                                                            {[{ v: 'bottom', l: 'â¬‡️ Alt' }, { v: 'top', l: 'â¬†️ Üst' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, toolbar: { ...(p.roomConfig?.toolbar || {}), position: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${(siteConfig.roomConfig?.toolbar?.position || 'bottom') === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}



                                                    {/* ── YETKİLER ── */}

                                                    {roomConfigTab === 'permissions' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                                                    <div>

                                                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">👥 Rol Bazlı Yetkiler</h2>

                                                                        <p className="text-xs text-gray-400 mt-1">Her rol için izin verilebilecek eylemleri belirleyin</p>

                                                                    </div>

                                                                </div>

                                                                <div className="p-5 overflow-x-auto">

                                                                    <table className="w-full text-xs">

                                                                        <thead>

                                                                            <tr className="border-b border-white/5">

                                                                                <th className="text-left py-3 px-2 text-gray-400 font-bold">Yetki</th>

                                                                                {['guest', 'member', 'vip', 'operator', 'admin'].map(role => (

                                                                                    <th key={role} className="text-center py-3 px-2">

                                                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :

                                                                                            role === 'operator' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :

                                                                                                role === 'vip' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :

                                                                                                    role === 'member' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :

                                                                                                        'bg-gray-500/10 text-gray-400 border-gray-500/20'

                                                                                            }`}>{role === 'guest' ? 'Misafir' : role === 'member' ? 'Üye' : role === 'vip' ? 'VIP' : role === 'operator' ? 'Operatör' : 'Admin'}</span>

                                                                                    </th>

                                                                                ))}

                                                                                <th className="w-8"></th>

                                                                            </tr>

                                                                        </thead>

                                                                        <tbody>

                                                                            {/* Sabit Yetkiler */}

                                                                            {[

                                                                                { key: 'mic', label: '🎤 Mikrofon', builtin: true },

                                                                                { key: 'camera', label: '📷 Kamera', builtin: true },

                                                                                { key: 'emoji', label: '😊 Emoji', builtin: true },

                                                                                { key: 'sticker', label: '🎯 Sticker', builtin: true },

                                                                                { key: 'gif', label: '🎬 GIF', builtin: true },

                                                                                { key: 'dm', label: 'âœ‰️ Özel Mesaj', builtin: true },

                                                                                { key: 'profile', label: '👤 Profil', builtin: true },

                                                                                { key: 'changeNick', label: 'âœ️ Nick Değiştir', builtin: true },

                                                                                { key: 'kick', label: '🦶 Kullanıcı At', builtin: true },

                                                                                { key: 'ban', label: '🚫 Yasakla', builtin: true },

                                                                                { key: 'mute', label: '🔇 Sustur', builtin: true },

                                                                                { key: 'manageRooms', label: '🏠 Oda Yönetimi', builtin: true },

                                                                                ...(siteConfig.roomConfig?.customPermissions || []).map((cp: any) => ({ key: cp.key, label: `${cp.icon || '⚡'} ${cp.label}`, builtin: false })),

                                                                            ].map(perm => (

                                                                                <tr key={perm.key} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">

                                                                                    <td className="py-2.5 px-2 text-gray-300 font-medium">

                                                                                        <div className="flex items-center gap-1">

                                                                                            {perm.label}

                                                                                            {!perm.builtin && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded">Özel</span>}

                                                                                        </div>

                                                                                    </td>

                                                                                    {['guest', 'member', 'vip', 'operator', 'admin'].map(role => (

                                                                                        <td key={role} className="text-center py-2.5 px-2">

                                                                                            <button onClick={() => setSiteConfig((p: any) => {

                                                                                                const perms = { ...p.roomConfig?.permissions?.[role] };

                                                                                                perms[perm.key] = !perms[perm.key];

                                                                                                return { ...p, roomConfig: { ...p.roomConfig, permissions: { ...(p.roomConfig?.permissions || {}), [role]: perms } } };

                                                                                            })} className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center ${siteConfig.roomConfig?.permissions?.[role]?.[perm.key] ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/[0.02] border-white/5 text-gray-400'}`}>

                                                                                                {siteConfig.roomConfig?.permissions?.[role]?.[perm.key] ? '✓' : '—'}

                                                                                            </button>

                                                                                        </td>

                                                                                    ))}

                                                                                    <td className="py-2.5 px-1">

                                                                                        {!perm.builtin && (

                                                                                            <button onClick={() => setSiteConfig((p: any) => ({

                                                                                                ...p,

                                                                                                roomConfig: {

                                                                                                    ...p.roomConfig,

                                                                                                    customPermissions: (p.roomConfig?.customPermissions || []).filter((cp: any) => cp.key !== perm.key)

                                                                                                }

                                                                                            }))} className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all" title="Sil">

                                                                                                <span className="text-[10px]">✕</span>

                                                                                            </button>

                                                                                        )}

                                                                                    </td>

                                                                                </tr>

                                                                            ))}

                                                                        </tbody>

                                                                    </table>

                                                                </div>

                                                            </div>

                                                            {/* Yeni Yetki Ekleme */}

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">⚡ Yeni Yetki Tanımla</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Sisteme yeni bir özel yetki ekleyin</p>

                                                                </div>

                                                                <div className="p-5">

                                                                    <div className="grid grid-cols-3 gap-3">

                                                                        <div>

                                                                            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">Yetki Adı</label>

                                                                            <input id="newPermLabel" type="text" placeholder="Ör: Duyuru Gönderme" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">Yetki Anahtarı</label>

                                                                            <input id="newPermKey" type="text" placeholder="Ör: sendAnnouncement" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">İkon</label>

                                                                            <input id="newPermIcon" type="text" placeholder="Ör: 📢" defaultValue="⚡" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                    </div>

                                                                    <button onClick={() => {

                                                                        const labelEl = document.getElementById('newPermLabel') as HTMLInputElement;

                                                                        const keyEl = document.getElementById('newPermKey') as HTMLInputElement;

                                                                        const iconEl = document.getElementById('newPermIcon') as HTMLInputElement;

                                                                        if (!labelEl?.value || !keyEl?.value) return;

                                                                        const newPerm = { key: keyEl.value.trim(), label: labelEl.value.trim(), icon: iconEl?.value?.trim() || '⚡' };

                                                                        setSiteConfig((p: any) => ({

                                                                            ...p,

                                                                            roomConfig: {

                                                                                ...p.roomConfig,

                                                                                customPermissions: [...(p.roomConfig?.customPermissions || []), newPerm]

                                                                            }

                                                                        }));

                                                                        labelEl.value = '';

                                                                        keyEl.value = '';

                                                                        iconEl.value = '⚡';

                                                                    }} className="mt-3 px-4 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-all flex items-center gap-2">

                                                                        <span>＋</span> Yetki Ekle

                                                                    </button>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}



                                                    {/* ── CHAT AYARLARI ── */}

                                                    {roomConfigTab === 'chat' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">💬 Chat & Mesaj Ayarları</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Mesaj limiti, font ayarları ve görünüm</p>

                                                                </div>

                                                                <div className="p-5 space-y-5">

                                                                    <div className="grid grid-cols-2 gap-4">

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Maksimum Mesaj Uzunluğu</label>

                                                                            <input type="number" value={siteConfig.roomConfig?.chat?.maxMessageLength || 500} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), maxMessageLength: parseInt(e.target.value) || 500 } } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Font Boyutu (px)</label>

                                                                            <input type="number" value={siteConfig.roomConfig?.chat?.fontSize || 14} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), fontSize: parseInt(e.target.value) || 14 } } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-4">

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Font Ailesi</label>

                                                                            <select value={siteConfig.roomConfig?.chat?.fontFamily || 'Inter'} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), fontFamily: e.target.value } } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50 appearance-none">

                                                                                {['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Nunito', 'Lato', 'Montserrat', 'Source Code Pro'].map(f => <option key={f} value={f} className="bg-[#121218]">{f}</option>)}

                                                                            </select>

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Anti-Flood Gecikme (sn)</label>

                                                                            <input type="number" value={siteConfig.roomConfig?.chat?.antiFloodDelay || 3} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), antiFloodDelay: parseInt(e.target.value) || 3 } } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                        </div>

                                                                    </div>

                                                                    {/* Mesaj Baloncuk Stili */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Mesaj Baloncuk Stili</label>

                                                                        <div className="grid grid-cols-3 gap-2">

                                                                            {[{ v: 'modern', l: '🟣 Modern' }, { v: 'classic', l: '🔵 Klasik' }, { v: 'minimal', l: '⚪ Minimal' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), bubbleStyle: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${(siteConfig.roomConfig?.chat?.bubbleStyle || 'modern') === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                    {/* Toggle Ayarlar */}

                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                                                                        {[

                                                                            { key: 'antiFlood', label: '🛡️ Anti-Flood' },

                                                                            { key: 'showTimestamps', label: '🕐 Zaman Damgası' },

                                                                            { key: 'showAvatars', label: '👤 Avatarlar' },

                                                                            { key: 'showRoleIcons', label: '🏅 Rol İkonları' },

                                                                        ].map(item => (

                                                                            <button key={item.key} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, chat: { ...(p.roomConfig?.chat || {}), [item.key]: !(p.roomConfig?.chat || {})[item.key] } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${siteConfig.roomConfig?.chat?.[item.key] !== false ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>

                                                                                <div className="flex items-center justify-between">

                                                                                    <span className="text-white">{item.label}</span>

                                                                                    <div className={`w-7 h-4 rounded-full transition-all relative ${siteConfig.roomConfig?.chat?.[item.key] !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${siteConfig.roomConfig?.chat?.[item.key] !== false ? 'left-3.5' : 'left-0.5'}`}></div>

                                                                                    </div>

                                                                                </div>

                                                                            </button>

                                                                        ))}

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}



                                                    {/* ── YERLEŞİM ── */}

                                                    {roomConfigTab === 'layout' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">📐 Yerleşim Ayarları</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Panel boyutları ve düzen ayarları</p>

                                                                </div>

                                                                <div className="p-5 space-y-5">

                                                                    <div className="grid grid-cols-2 gap-4">

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Sol Panel Genişliği (px)</label>

                                                                            <input type="range" min="200" max="400" value={siteConfig.roomConfig?.layout?.sidebarWidth || 280} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, layout: { ...(p.roomConfig?.layout || {}), sidebarWidth: parseInt(e.target.value) } } }))} className="w-full accent-indigo-500" />

                                                                            <div className="text-right text-[10px] text-gray-400 font-mono mt-1">{siteConfig.roomConfig?.layout?.sidebarWidth || 280}px</div>

                                                                        </div>

                                                                        <div>

                                                                            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Sağ Panel Genişliği (px)</label>

                                                                            <input type="range" min="200" max="500" value={siteConfig.roomConfig?.layout?.rightPanelWidth || 320} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, layout: { ...(p.roomConfig?.layout || {}), rightPanelWidth: parseInt(e.target.value) } } }))} className="w-full accent-indigo-500" />

                                                                            <div className="text-right text-[10px] text-gray-400 font-mono mt-1">{siteConfig.roomConfig?.layout?.rightPanelWidth || 320}px</div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Layout Önizleme */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Yerleşim Önizleme</label>

                                                                        <div className="h-24 rounded-xl border border-white/10 bg-white/[0.02] flex overflow-hidden">

                                                                            <div className="border-r border-white/10 flex items-center justify-center" style={{ width: `${((siteConfig.roomConfig?.layout?.sidebarWidth || 280) / 1000) * 100}%`, minWidth: 40 }}>

                                                                                <span className="text-[8px] text-gray-400 writing-vertical">Sol Panel</span>

                                                                            </div>

                                                                            <div className="flex-1 flex items-center justify-center border-r border-white/10">

                                                                                <span className="text-[8px] text-gray-400">Chat Alanı</span>

                                                                            </div>

                                                                            <div className="flex items-center justify-center" style={{ width: `${((siteConfig.roomConfig?.layout?.rightPanelWidth || 320) / 1000) * 100}%`, minWidth: 40 }}>

                                                                                <span className="text-[8px] text-gray-400">Sağ Panel</span>

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Toggle ayarlar */}

                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                                                                        {[

                                                                            { key: 'showRadioPlayer', label: '📻 Radyo Player' },

                                                                            { key: 'showRoomTabs', label: '🔖 Oda Tabları' },

                                                                        ].map(item => (

                                                                            <button key={item.key} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, layout: { ...(p.roomConfig?.layout || {}), [item.key]: !(p.roomConfig?.layout || {})[item.key] } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border text-left ${siteConfig.roomConfig?.layout?.[item.key] !== false ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>

                                                                                <div className="flex items-center justify-between">

                                                                                    <span className="text-white">{item.label}</span>

                                                                                    <div className={`w-7 h-4 rounded-full transition-all relative ${siteConfig.roomConfig?.layout?.[item.key] !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                                        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${siteConfig.roomConfig?.layout?.[item.key] !== false ? 'left-3.5' : 'left-0.5'}`}></div>

                                                                                    </div>

                                                                                </div>

                                                                            </button>

                                                                        ))}

                                                                    </div>

                                                                    {/* Mobil Layout */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Mobil Görünüm</label>

                                                                        <div className="grid grid-cols-3 gap-2">

                                                                            {[{ v: 'auto', l: '🔄 Otomatik' }, { v: 'compact', l: '📱 Kompakt' }, { v: 'full', l: '💻 Tam' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, layout: { ...(p.roomConfig?.layout || {}), mobileLayout: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${(siteConfig.roomConfig?.layout?.mobileLayout || 'auto') === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}



                                                    {/* ── MEDYA ── */}

                                                    {roomConfigTab === 'media' && (

                                                        <div className="space-y-4">

                                                            <div className="owner-glossy">

                                                                <div className="p-5 border-b border-white/5">

                                                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">📻 Medya & Erişim</h2>

                                                                    <p className="text-xs text-gray-400 mt-1">Radyo, video ve medya yapılandırması</p>

                                                                </div>

                                                                <div className="p-5 space-y-5">

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-1.5 block">Radyo Stream URL</label>

                                                                        <input type="text" value={siteConfig.roomConfig?.media?.radioUrl || ''} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, media: { ...(p.roomConfig?.media || {}), radioUrl: e.target.value } } }))} placeholder="https://stream.example.com/radio.mp3" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                    </div>

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-1.5 block">Maks. Dosya Yükleme (MB)</label>

                                                                        <input type="number" value={siteConfig.roomConfig?.media?.maxUploadSize || 5} onChange={e => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, media: { ...(p.roomConfig?.media || {}), maxUploadSize: parseInt(e.target.value) || 5 } } }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50" />

                                                                    </div>

                                                                    {/* Toggle */}

                                                                    <div className="grid grid-cols-2 gap-3">

                                                                        <button onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, media: { ...(p.roomConfig?.media || {}), allowYoutube: !(p.roomConfig?.media || {}).allowYoutube } } }))} className={`p-4 rounded-xl text-xs font-bold transition-all border text-left ${siteConfig.roomConfig?.media?.allowYoutube !== false ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/5 border-red-500/10'}`}>

                                                                            <div className="flex items-center justify-between">

                                                                                <div>

                                                                                    <div className="text-white mb-0.5">🎬 YouTube İzni</div>

                                                                                    <div className="text-[10px] text-gray-400">Kullanıcılar YouTube video paylaşabilir</div>

                                                                                </div>

                                                                                <div className={`w-8 h-4 rounded-full transition-all relative ${siteConfig.roomConfig?.media?.allowYoutube !== false ? 'bg-green-500' : 'bg-gray-700'}`}>

                                                                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${siteConfig.roomConfig?.media?.allowYoutube !== false ? 'left-4' : 'left-0.5'}`}></div>

                                                                                </div>

                                                                            </div>

                                                                        </button>

                                                                    </div>

                                                                    {/* Sticker Paketi */}

                                                                    <div>

                                                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Sticker Paketi</label>

                                                                        <div className="grid grid-cols-3 gap-2">

                                                                            {[{ v: 'default', l: '📦 Varsayılan' }, { v: 'premium', l: '✨ Premium' }, { v: 'custom', l: '🎨 Özel' }].map(opt => (

                                                                                <button key={opt.v} onClick={() => setSiteConfig((p: any) => ({ ...p, roomConfig: { ...p.roomConfig, media: { ...(p.roomConfig?.media || {}), stickerPacks: opt.v } } }))} className={`p-3 rounded-xl text-xs font-bold transition-all border ${(siteConfig.roomConfig?.media?.stickerPacks || 'default') === opt.v ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border-white/5 hover:border-white/10'}`}>

                                                                                    {opt.l}

                                                                                </button>

                                                                            ))}

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    )}

                                                </div>

                                                {/* Sağ Taraf — Canlı Önizleme */}

                                                <div className="w-[380px] flex-shrink-0 sticky top-4 self-start hidden xl:block">

                                                    <div className="owner-glossy">

                                                        <div className="p-3 border-b border-white/5 flex items-center justify-between">

                                                            <span className="text-xs font-bold text-gray-400 flex items-center gap-2">👁️ Canlı Önizleme</span>

                                                            <span className="text-[9px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">Gerçek zamanlı</span>

                                                        </div>

                                                        {/* Mini Oda Önizleme — Gerçek Oda Görünümü */}

                                                        <div className="relative" style={{ height: 480 }}>

                                                            {/* Oda arkaplan */}

                                                            <div className="absolute inset-0" style={{

                                                                background: siteConfig.roomConfig?.design?.bgType === 'image'

                                                                    ? `url(${siteConfig.roomConfig?.design?.bgImage}) center/cover`

                                                                    : siteConfig.roomConfig?.design?.bgType === 'solid'

                                                                        ? siteConfig.roomConfig?.design?.bgColor1

                                                                        : `linear-gradient(135deg, ${siteConfig.roomConfig?.design?.bgColor1 || '#0a0a12'}, ${siteConfig.roomConfig?.design?.bgColor2 || '#1a1a2e'})`

                                                            }}></div>

                                                            {/* Gövde: Sol Panel + Orta (Tabs + Chat + Toolbar) + Sağ Panel */}

                                                            <div className="relative flex" style={{ height: 'calc(100%)' }}>

                                                                {/* Sol Panel — Logo + Katılımcılar + Durum + Radyo + Mikrofon */}

                                                                <div className="border-r border-white/5 flex flex-col" style={{ width: `${Math.max(80, Math.min(130, ((siteConfig.roomConfig?.layout?.sidebarWidth || 280) / 1000) * 380))}px`, background: 'rgba(0,0,0,0.3)' }}>

                                                                    {/* Logo Alanı */}

                                                                    <div className="px-2 py-2 border-b border-white/5 flex items-center gap-1.5">

                                                                        {siteLogoUrl ? (

                                                                            // eslint-disable-next-line @next/next/no-img-element

                                                                            <img src={siteLogoUrl} alt="" className="w-6 h-6 rounded object-cover" />

                                                                        ) : (

                                                                            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500/30 to-amber-700/30 border border-amber-500/20 flex items-center justify-center"><span className="text-[7px] font-bold text-amber-300">S</span></div>

                                                                        )}

                                                                        <div>

                                                                            <div className="text-[7px] font-bold text-amber-200/90">{siteLogoName || 'SopranoChat'}</div>

                                                                            <div className="text-[5px] text-gray-400">SENİN SEÇİN</div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Katılımcı başlığı */}

                                                                    <div className="px-2 py-1 border-b border-white/5">

                                                                        <span className="text-[6px] text-gray-400">› çevrimiçi (6)</span>

                                                                    </div>

                                                                    {/* Katılımcı listesi */}

                                                                    <div className="flex-1 p-1 space-y-0.5 overflow-hidden">

                                                                        {[

                                                                            { name: 'Admin', color: '#ef4444', badge: '👑', selected: true },

                                                                            { name: 'Operatör', color: '#f59e0b', badge: '⭐' },

                                                                            { name: 'VIP_User', color: '#a855f7', badge: '💎' },

                                                                            { name: 'Üye1', color: '#22c55e', badge: '' },

                                                                            { name: 'Üye2', color: '#3b82f6', badge: '' },

                                                                            { name: 'Misafir', color: '#6b7280', badge: '' },

                                                                        ].map((u, i) => (

                                                                            <div key={i} className={`flex items-center gap-1 px-1.5 py-1 rounded-lg transition-colors ${u.selected ? 'bg-indigo-500/15 border border-indigo-500/20' : 'hover:bg-white/5'}`}>

                                                                                <div className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10" style={{ background: `${u.color}30` }}></div>

                                                                                <div className="min-w-0">

                                                                                    <span className="text-[6px] font-bold truncate block" style={{ color: u.color }}>{u.badge} {u.name}</span>

                                                                                    {u.selected && <span className="text-[5px] text-gray-400">GodMaster</span>}

                                                                                </div>

                                                                            </div>

                                                                        ))}

                                                                    </div>

                                                                    {/* Durum Alanı */}

                                                                    <div className="px-2 py-1.5 border-t border-white/5">

                                                                        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-1.5 py-1">

                                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>

                                                                            <span className="text-[6px] text-gray-400">Durum: Çevrimiçi</span>

                                                                        </div>

                                                                    </div>

                                                                    {/* Radyo Player */}

                                                                    {siteConfig.roomConfig?.layout?.showRadioPlayer !== false && (

                                                                        <div className="px-1.5 py-1.5 border-t border-white/5 bg-black/20">

                                                                            <div className="flex items-center gap-1.5 mb-1">

                                                                                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center"><span className="text-[6px]">▶</span></div>

                                                                                <div>

                                                                                    <div className="text-[6px] font-bold text-white/70">🎵 TRT FM</div>

                                                                                    <div className="text-[5px] text-gray-400">Türk Müziği</div>

                                                                                </div>

                                                                            </div>

                                                                            <div className="flex items-center gap-1">

                                                                                <div className="flex-1 px-1.5 py-0.5 rounded bg-white/5 text-[5px] text-gray-400 text-center">🎵 Kanallar</div>

                                                                                <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><span className="text-[6px]">🔊</span></div>

                                                                            </div>

                                                                        </div>

                                                                    )}

                                                                    {/* Mikrofon Butonu */}

                                                                    <div className="px-1.5 py-1.5 border-t border-white/5">

                                                                        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg" style={{ background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}25`, border: `1px solid ${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}30` }}>

                                                                            <span className="text-[7px]">🏆</span>

                                                                            <div>

                                                                                <div className="text-[6px] font-bold" style={{ color: siteConfig.roomConfig?.design?.accentColor || '#6366f1' }}>MİKROFONU AL</div>

                                                                                <div className="text-[5px] text-gray-400">Konuşmak için tıkla</div>

                                                                            </div>

                                                                            <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                                {/* Orta Alan — Oda Sekmeleri + Chat + Toolbar */}

                                                                <div className="flex-1 flex flex-col min-w-0">

                                                                    {/* Oda Sekmeleri — Üst Ortada */}

                                                                    {siteConfig.roomConfig?.layout?.showRoomTabs !== false && (

                                                                        <div className="flex items-center justify-center gap-1 px-2 py-1.5 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.25)' }}>

                                                                            {['Genel Sohbet', 'Geyik Muhabbeti', 'Müzik Odası'].map((tab, i) => (

                                                                                <div key={tab} className={`px-2 py-0.5 rounded-full text-[6px] font-bold ${i === 0 ? 'text-white border' : 'text-gray-400'}`} style={i === 0 ? { background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}20`, borderColor: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}40`, color: siteConfig.roomConfig?.design?.accentColor || '#6366f1' } : {}}>

                                                                                    {tab}

                                                                                </div>

                                                                            ))}

                                                                        </div>

                                                                    )}

                                                                    {/* Hoş geldiniz mesajı */}

                                                                    <div className="flex items-center justify-center py-1">

                                                                        <span className="text-[5px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">Genel Sohbet odasına hoş geldiniz</span>

                                                                    </div>

                                                                    {/* Chat Alanı */}

                                                                    <div className="flex-1 p-2 space-y-1.5 overflow-hidden" style={{ fontFamily: siteConfig.roomConfig?.chat?.fontFamily || 'Inter' }}>

                                                                        {/* Mesaj balonları */}

                                                                        <div className="flex items-start gap-1">

                                                                            <div className="w-4 h-4 rounded-full bg-red-500/30 flex-shrink-0 mt-0.5"></div>

                                                                            <div>

                                                                                <span className="text-[7px] font-bold text-red-400">Admin</span>

                                                                                <div className={`px-2 py-1 rounded-lg mt-0.5 ${(siteConfig.roomConfig?.chat?.bubbleStyle || 'modern') === 'classic' ? 'bg-white/5 border border-white/5' : (siteConfig.roomConfig?.chat?.bubbleStyle || 'modern') === 'flat' ? 'bg-white/[0.03]' : 'bg-white/5 border border-white/5 backdrop-blur-sm'}`}>

                                                                                    <span className="text-white/80" style={{ fontSize: `${Math.max(7, Math.min(10, (siteConfig.roomConfig?.chat?.fontSize || 14) * 0.65))}px` }}>Herkese merhaba! 👋</span>

                                                                                </div>

                                                                            </div>

                                                                        </div>

                                                                        <div className="flex items-start gap-1">

                                                                            <div className="w-4 h-4 rounded-full bg-green-500/30 flex-shrink-0 mt-0.5"></div>

                                                                            <div>

                                                                                <span className="text-[7px] font-bold text-green-400">Üye1</span>

                                                                                <div className={`px-2 py-1 rounded-lg mt-0.5 ${(siteConfig.roomConfig?.chat?.bubbleStyle || 'modern') === 'classic' ? 'bg-white/5 border border-white/5' : (siteConfig.roomConfig?.chat?.bubbleStyle || 'modern') === 'flat' ? 'bg-white/[0.03]' : 'bg-white/5 border border-white/5 backdrop-blur-sm'}`}>

                                                                                    <span className="text-white/80" style={{ fontSize: `${Math.max(7, Math.min(10, (siteConfig.roomConfig?.chat?.fontSize || 14) * 0.65))}px` }}>Selam! Bugün nasılsınız?</span>

                                                                                </div>

                                                                            </div>

                                                                        </div>

                                                                        {siteConfig.roomConfig?.chat?.showTimestamps !== false && (

                                                                            <div className="text-center"><span className="text-[6px] text-gray-400">14:32</span></div>

                                                                        )}

                                                                        <div className="flex items-start gap-1 justify-end">

                                                                            <div>

                                                                                <div className="text-right"><span className="text-[7px] font-bold" style={{ color: siteConfig.roomConfig?.design?.accentColor || '#6366f1' }}>Ben</span></div>

                                                                                <div className="px-2 py-1 rounded-lg mt-0.5 border" style={{ background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}15`, borderColor: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}30` }}>

                                                                                    <span className="text-white/80" style={{ fontSize: `${Math.max(7, Math.min(10, (siteConfig.roomConfig?.chat?.fontSize || 14) * 0.65))}px` }}>Harika, teşekkürler! 🎉</span>

                                                                                </div>

                                                                            </div>

                                                                            <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}40` }}></div>

                                                                        </div>

                                                                    </div>

                                                                    {/* Alt kısım — Toolbar + Mesaj Giriş */}

                                                                    <div className="border-t border-white/5" style={{ background: 'rgba(0,0,0,0.2)' }}>

                                                                        {/* Toolbar — Yuvarlak ikonlar */}

                                                                        <div className={`flex items-center gap-1 px-2 py-1 ${(siteConfig.roomConfig?.toolbar?.position || 'bottom') === 'top' ? 'order-first' : ''}`}>

                                                                            {[

                                                                                { key: 'mic', icon: '🎤', show: siteConfig.roomConfig?.toolbar?.mic },

                                                                                { key: 'camera', icon: '📷', show: siteConfig.roomConfig?.toolbar?.camera },

                                                                                { key: 'speaker', icon: '🔊', show: true },

                                                                                { key: 'emoji', icon: '😊', show: siteConfig.roomConfig?.toolbar?.emoji },

                                                                                { key: 'sticker', icon: '🎯', show: siteConfig.roomConfig?.toolbar?.sticker },

                                                                                { key: 'gif', icon: '🎬', show: siteConfig.roomConfig?.toolbar?.gif },

                                                                            ].filter(t => t.show !== false).map(t => {

                                                                                const sz = siteConfig.roomConfig?.toolbar?.buttonSize === 'small' ? 'w-4 h-4 text-[7px]' : siteConfig.roomConfig?.toolbar?.buttonSize === 'large' ? 'w-6 h-6 text-[9px]' : 'w-5 h-5 text-[8px]';

                                                                                return <div key={t.key} className={`${sz} rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-default`}>{t.icon}</div>;

                                                                            })}

                                                                            <div className="ml-auto flex items-center gap-1">

                                                                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><span className="text-[7px]">â“</span></div>

                                                                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><span className="text-[7px]">🔄</span></div>

                                                                                <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center"><span className="text-[7px]">🔴</span></div>

                                                                            </div>

                                                                        </div>

                                                                        {/* Mesaj Giriş Alanı */}

                                                                        <div className="flex items-center gap-1.5 px-2 py-1.5">

                                                                            <div className="flex-1 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center px-2">

                                                                                <span className="text-[6px] text-gray-400">Mesajınızı buraya yazın...</span>

                                                                            </div>

                                                                            <div className="px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: `${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}`, boxShadow: `0 0 8px ${siteConfig.roomConfig?.design?.accentColor || '#6366f1'}40` }}>

                                                                                <span className="text-[6px] font-bold text-white">GÖNDER</span>

                                                                                <span className="text-[6px] text-white/70">➤</span>

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                                {/* Sağ Panel — Canlı Yayın */}

                                                                <div className="border-l border-white/5 flex flex-col" style={{ width: `${Math.max(70, Math.min(130, ((siteConfig.roomConfig?.layout?.rightPanelWidth || 320) / 1000) * 380))}px`, background: 'rgba(0,0,0,0.15)' }}>

                                                                    <div className="px-2 py-1.5 border-b border-white/5 flex items-center justify-between">

                                                                        <span className="text-[7px] font-bold text-red-400 flex items-center gap-1">🔴 CANLI YAYIN</span>

                                                                        <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><span className="text-[6px]">⚙</span></div>

                                                                    </div>

                                                                    <div className="flex-1 p-1.5 space-y-1.5">

                                                                        {/* Ana Yayın Alanı */}

                                                                        <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-amber-900/20 to-amber-800/10 border border-amber-500/10 flex items-center justify-center overflow-hidden">

                                                                            <div className="text-center">

                                                                                <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center">

                                                                                    <span className="text-[10px] opacity-40">📺</span>

                                                                                </div>

                                                                                <span className="text-[5px] text-gray-400 block">SINYAL YOK</span>

                                                                            </div>

                                                                        </div>

                                                                        <div className="text-center">

                                                                            <span className="text-[5px] text-gray-400">Yayın için bekleniyor</span>

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>

                                        )}

                                    </div>

                                    {/* Sağ Taraf — Ana Sayfa Önizleme (rooms sekmesi hariç, o kendi önizlemesine sahip) */}

                                    {settingsTab !== 'rooms' && settingsTab !== 'pricing' && (

                                        <div className="w-[380px] flex-shrink-0 sticky top-4 self-start hidden xl:block">

                                            <div className="owner-glossy">

                                                <div className="p-3 border-b border-white/5 flex items-center justify-between">

                                                    <span className="text-xs font-bold text-gray-400 flex items-center gap-2">👁️ Ana Sayfa Önizleme</span>

                                                    <span className="text-[9px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">Gerçek zamanlı</span>

                                                </div>

                                                {/* Mini Ana Sayfa — Gerçek Retro Tasarımla Eşleşen Ön İzleme */}

                                                <div className="relative overflow-hidden" style={{ height: 520, background: `linear-gradient(180deg, ${siteConfig.homepage?.bodyGradient1 || '#a3ace5'} 0%, ${siteConfig.homepage?.bodyGradient2 || '#c4c9ee'} 50%, ${siteConfig.homepage?.bodyGradient3 || '#d8dbf4'} 100%)`, padding: '8px 0' }}>

                                                    {/* Ana Kasa — Beyaz kenar bordürlü */}

                                                    <div style={{

                                                        margin: '0 auto', width: '94%', background: siteConfig.homepage?.mainBg || '#7a7e9e',

                                                        borderLeft: '6px solid rgba(255,255,255,0.85)', borderRight: '6px solid rgba(255,255,255,0.85)', borderBottom: '6px solid rgba(255,255,255,0.85)',

                                                        boxShadow: '0 0 15px rgba(0,0,0,0.25), -2px 0 8px rgba(0,0,0,0.18), 2px 0 8px rgba(0,0,0,0.18)',

                                                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 490

                                                    }}>

                                                        {/* Barrel Header */}

                                                        <div style={{

                                                            width: '99%', height: 32, margin: '0 auto',

                                                            background: `linear-gradient(180deg, ${siteConfig.homepage?.headerGradient1 || '#5a6070'} 0%, ${siteConfig.homepage?.headerGradient2 || '#3d4250'} 15%, ${siteConfig.homepage?.headerGradient3 || '#1e222e'} 50%, ${siteConfig.homepage?.headerGradient4 || '#282c3a'} 75%, ${siteConfig.homepage?.headerGradient5 || '#3a3f50'} 100%)`,

                                                            borderRadius: '0 0 12px 12px', border: '1px solid rgba(0,0,0,0.5)', borderTop: '1px solid rgba(120,130,150,0.6)',

                                                            display: 'flex', alignItems: 'center', padding: '0 10px', position: 'relative'

                                                        }}>

                                                            {/* Retro Logo */}

                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>

                                                                <span style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 10, color: '#f5e6d3', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>

                                                                    {(siteConfig.siteTitle || 'SopranoChat').replace(/Chat$/i, '') || 'Soprano'}

                                                                </span>

                                                                <span style={{ fontFamily: 'serif', fontWeight: 900, fontSize: 10, color: '#d4c5a9', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>

                                                                    {(siteConfig.siteTitle || 'SopranoChat').match(/Chat$/i) ? 'Chat' : ''}

                                                                </span>

                                                            </div>

                                                            {/* Nav Items */}

                                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

                                                                {(siteConfig.homepage?.navItems || [

                                                                    { label: 'HOME', section: 'home' }, { label: 'ODALAR', section: '_odalar' }, { label: 'REHBER', section: 'rehber' },

                                                                    { label: 'FİYATLAR', section: 'fiyatlar' }, { label: 'İLETİŞİM', section: 'iletisim' }

                                                                ]).filter((n: any) => n.visible !== false).slice(0, 4).map((n: any, i: number) => (

                                                                    <span key={i} style={{ fontSize: 5, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 }}>{n.label}</span>

                                                                ))}

                                                            </div>

                                                        </div>



                                                        {/* Glossy Panel — Login / Hero */}

                                                        <div style={{

                                                            width: '85%', margin: '12px auto 8px',

                                                            background: `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 40%), linear-gradient(180deg, ${siteConfig.homepage?.loginBg || 'rgba(30,41,59,0.85)'} 0%, rgba(15,23,42,0.55) 100%)`,

                                                            border: `1px solid ${siteConfig.homepage?.loginCardBorder || 'rgba(255,255,255,0.15)'}`,

                                                            borderTop: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '14px 12px', textAlign: 'center',

                                                            backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'

                                                        }}>

                                                            <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', marginBottom: 2, fontFamily: 'serif', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>

                                                                {siteConfig.siteTitle || 'SopranoChat'}

                                                            </div>

                                                            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>

                                                                {siteConfig.siteSlogan || 'Premium Sohbet Platformu'}

                                                            </div>

                                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>

                                                                <div style={{ padding: '3px 10px', borderRadius: 6, fontSize: 6, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${siteConfig.homepage?.loginAccentColor || '#38bdf8'}, ${siteConfig.primaryColor || '#6366f1'})`, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>

                                                                    {siteConfig.homepage?.heroCTA1 || 'Hemen Başla'}

                                                                </div>

                                                                <div style={{ padding: '3px 10px', borderRadius: 6, fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}>

                                                                    {siteConfig.homepage?.heroCTA2 || 'Detaylı Bilgi'}

                                                                </div>

                                                            </div>

                                                        </div>



                                                        {/* Paketler Glossy Panel */}

                                                        <div style={{

                                                            width: '85%', margin: '0 auto 8px',

                                                            background: `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(180deg, ${siteConfig.homepage?.loginBg || 'rgba(30,41,59,0.85)'} 0%, rgba(15,23,42,0.5) 100%)`,

                                                            border: `1px solid ${siteConfig.homepage?.loginCardBorder || 'rgba(255,255,255,0.12)'}`,

                                                            borderTop: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '10px',

                                                            backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'

                                                        }}>

                                                            <div style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase' }}>Paketler</div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>

                                                                {[

                                                                    { name: siteConfig.pricing?.p1Name || 'Ses + Metin', price: siteConfig.pricing?.p1Monthly || '990', accent: '#fbbf24' },

                                                                    { name: siteConfig.pricing?.p2Name || 'Kamera + Ses', price: siteConfig.pricing?.p2Monthly || '1.390', accent: '#a78bfa', popular: true },

                                                                    { name: siteConfig.pricing?.p3Name || 'White Label', price: siteConfig.pricing?.p3Monthly || '6.990', accent: '#34d399' },

                                                                ].map((p, i) => (

                                                                    <div key={i} style={{

                                                                        borderRadius: 6, padding: '5px 4px', textAlign: 'center',

                                                                        border: p.popular ? `1px solid ${p.accent}40` : '1px solid rgba(255,255,255,0.06)',

                                                                        background: p.popular ? `${p.accent}08` : 'rgba(255,255,255,0.02)',

                                                                    }}>

                                                                        {p.popular && <div style={{ fontSize: 4, fontWeight: 800, color: p.accent, marginBottom: 1 }}>POPÜLER</div>}

                                                                        <div style={{ fontSize: 6, fontWeight: 700, color: '#fff' }}>{p.name}</div>

                                                                        <div style={{ fontSize: 8, fontWeight: 900, color: '#fff', marginTop: 1 }}>₺{p.price}</div>

                                                                        <div style={{ fontSize: 4, color: 'rgba(255,255,255,0.4)' }}>/ay</div>

                                                                    </div>

                                                                ))}

                                                            </div>

                                                            {siteConfig.pricing?.yearlyDiscount && (

                                                                <div style={{ textAlign: 'center', marginTop: 4 }}>

                                                                    <span style={{ fontSize: 5, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '1px 6px', borderRadius: 8 }}>{siteConfig.pricing.yearlyDiscount}</span>

                                                                </div>

                                                            )}

                                                        </div>



                                                        {/* İletişim Mini */}

                                                        <div style={{

                                                            width: '85%', margin: '0 auto 8px',

                                                            background: `linear-gradient(180deg, ${siteConfig.homepage?.loginBg || 'rgba(30,41,59,0.85)'} 0%, rgba(15,23,42,0.5) 100%)`,

                                                            border: `1px solid ${siteConfig.homepage?.loginCardBorder || 'rgba(255,255,255,0.1)'}`,

                                                            borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6,

                                                            backdropFilter: 'blur(8px)'

                                                        }}>

                                                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 7 }}>📧</span></div>

                                                            <div>

                                                                <div style={{ fontSize: 6, fontWeight: 700, color: '#fff' }}>{siteConfig.contact?.email || 'info@soprano.chat'}</div>

                                                                <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)' }}>{siteConfig.contact?.phone || siteConfig.contact?.whatsapp || '+90 555 000 00 00'}</div>

                                                            </div>

                                                        </div>



                                                        {/* Footer */}

                                                        <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center' }}>

                                                            <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: 0.5 }}>{siteConfig.footerText || '© 2026 SopranoChat Systems.'}</div>

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    )}

                                </div>

                            )}

                        </div>

                    ) : activeView === 'finance' ? (

                        <div className="space-y-6">

                            {/* Header */}

                            <div className="flex items-center justify-between flex-wrap gap-4">

                                <div>

                                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">

                                        <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20">

                                            <Wallet className="w-6 h-6 text-green-400" />

                                        </div>

                                        Finans & Ödemeler

                                    </h1>

                                    <p className="text-sm text-gray-400 mt-1 ml-14">Gelir takibi ve ödeme durumları</p>

                                </div>

                            </div>



                            {/* Finance Stats */}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                                {/* Aylık Ciro */}

                                <div className="owner-glossy p-5 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20"><TrendingUp className="w-5 h-5 text-green-400" /></div>

                                    </div>

                                    <div className="text-3xl font-extrabold text-white mb-1">₺{tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod !== 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0).toLocaleString('tr-TR')}</div>

                                    <div className="text-xs text-gray-400 font-medium">Aylık Tekrarlayan Gelir</div>

                                </div>



                                {/* Yıllık Ciro */}

                                <div className="owner-glossy p-5 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"><Wallet className="w-5 h-5 text-amber-400" /></div>

                                    </div>

                                    <div className="text-3xl font-extrabold text-white mb-1">₺{tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod === 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0).toLocaleString('tr-TR')}</div>

                                    <div className="text-xs text-gray-400 font-medium">Yıllık Sözleşme Geliri</div>

                                </div>



                                {/* Aktif Abonelik */}

                                <div className="owner-glossy p-5 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20"><Briefcase className="w-5 h-5 text-cyan-400" /></div>

                                    </div>

                                    <div className="text-3xl font-extrabold text-white mb-1">{tenants.filter(t => t.status === 'ACTIVE').length}</div>

                                    <div className="text-xs text-gray-400 font-medium">Aktif Abonelik</div>

                                </div>



                                {/* Ödeme Bekleyen */}

                                <div className="owner-glossy p-5 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20"><AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" /></div>

                                    </div>

                                    <div className="text-3xl font-extrabold text-white mb-1">{adminStats.paymentDue}</div>

                                    <div className="text-xs text-gray-400 font-medium">Ödeme Bekleyen</div>

                                </div>

                            </div>



                            {/* Gelir Tablosu */}

                            <div className="owner-glossy">

                                <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                    <div>

                                        <h2 className="text-lg font-bold text-white">Müşteri Gelir Tablosu</h2>

                                        <p className="text-xs text-gray-400 mt-1">Aktif aboneliklerin ödeme detayları</p>

                                    </div>

                                    <div className="flex items-center gap-2">

                                        <button onClick={exportCSV} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-medium text-gray-300 transition-colors flex items-center gap-2">

                                            <Download className="w-3 h-3" /> CSV

                                        </button>

                                    </div>

                                </div>

                                <table className="w-full text-left border-collapse">

                                    <thead>

                                        <tr className="bg-white/5 border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">

                                            <th className="px-6 py-4 font-bold">Müşteri</th>

                                            <th className="px-6 py-4 font-bold">Paket Tipi</th>

                                            <th className="px-6 py-4 font-bold text-center">Periyot</th>

                                            <th className="px-6 py-4 font-bold text-right">Ücret</th>

                                            <th className="px-6 py-4 font-bold">Bitiş Tarihi</th>

                                            <th className="px-6 py-4 font-bold text-center">Durum</th>

                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-white/5 text-sm">

                                        {[...tenants].sort((a, b) => {

                                            const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;

                                            const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;

                                            return aExp - bExp;

                                        }).map((t: any) => {

                                            const price = parseFloat(t.price) || 0;

                                            const period = t.billingPeriod === 'YEARLY' ? 'Yıllık' : 'Aylık';

                                            const expiresAt = t.expiresAt ? new Date(t.expiresAt) : null;

                                            const now = new Date();

                                            const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                                            const isExpired = daysLeft !== null && daysLeft <= 0;

                                            const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

                                            const cameraOn = t.packageType !== 'NO_CAMERA';



                                            return (

                                                <tr key={t.id} className={`hover:bg-white/[0.02] transition-colors ${isExpired ? 'opacity-50' : ''}`}>

                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-3">

                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.status === 'ACTIVE' ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : 'bg-gray-900 border border-white/5 text-gray-400'}`}>

                                                                {(t.domain || t.name || '??').substring(0, 2).toUpperCase()}

                                                            </div>

                                                            <div>

                                                                <div className="font-bold text-white text-sm">{t.domain || t.name}</div>

                                                                <div className="text-[11px] text-gray-400">{t.name}</div>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-2">

                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${cameraOn ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>

                                                                {cameraOn ? '📹 Kameralı' : '💬 Mesaj'}

                                                            </span>

                                                            <span className="text-[10px] text-gray-400">x{t.roomLimit || 1} Oda</span>

                                                        </div>

                                                    </td>

                                                    <td className="px-6 py-4 text-center">

                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${t.billingPeriod === 'YEARLY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>

                                                            {period}

                                                        </span>

                                                    </td>

                                                    <td className="px-6 py-4 text-right">

                                                        <span className={`text-lg font-extrabold ${price > 0 ? 'text-green-400' : 'text-gray-400'}`}>₺{price.toLocaleString('tr-TR')}</span>

                                                    </td>

                                                    <td className="px-6 py-4">

                                                        {expiresAt ? (

                                                            <div className="flex flex-col gap-0.5">

                                                                <span className={`text-xs font-bold ${isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-gray-300'}`}>

                                                                    {expiresAt.toLocaleDateString('tr-TR')}

                                                                </span>

                                                                <span className={`text-[10px] ${isExpired ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-gray-400'}`}>

                                                                    {isExpired ? 'Süresi doldu' : `${daysLeft} gün kaldı`}

                                                                </span>

                                                            </div>

                                                        ) : (

                                                            <span className="text-xs text-gray-400">—</span>

                                                        )}

                                                    </td>

                                                    <td className="px-6 py-4 text-center">

                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>

                                                            {t.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}

                                                        </span>

                                                    </td>

                                                </tr>

                                            );

                                        })}

                                    </tbody>

                                </table>

                                {/* Toplam Satır */}

                                <div className="p-5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">

                                    <div className="text-sm text-gray-400">

                                        <span className="font-bold text-white">{tenants.filter(t => t.status === 'ACTIVE').length}</span> aktif abonelik

                                    </div>

                                    <div className="flex items-center gap-6">

                                        <div className="text-right">

                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Aylık Toplam</div>

                                            <div className="text-lg font-extrabold text-green-400">₺{tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod !== 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0).toLocaleString('tr-TR')}</div>

                                        </div>

                                        <div className="w-px h-8 bg-white/10"></div>

                                        <div className="text-right">

                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Yıllık Toplam</div>

                                            <div className="text-lg font-extrabold text-amber-400">₺{tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod === 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0).toLocaleString('tr-TR')}</div>

                                        </div>

                                        <div className="w-px h-8 bg-white/10"></div>

                                        <div className="text-right">

                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Tahmini Yıllık</div>

                                            <div className="text-lg font-extrabold text-white">₺{(

                                                tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod !== 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0) * 12 +

                                                tenants.filter(t => t.status === 'ACTIVE' && (t as any).billingPeriod === 'YEARLY').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0)

                                            ).toLocaleString('tr-TR')}</div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ) : (

                        <>



                            {/* Stats Grid */}

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">

                                {/* Ciro */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20"><TrendingUp className="w-4 h-4 text-green-400" /></div>

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">₺{tenants.filter(t => t.status === 'ACTIVE').reduce((sum, t) => sum + (parseFloat((t as any).price) || 0), 0).toLocaleString('tr-TR')}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Aylık Ciro</div>

                                </div>



                                {/* Müşteri */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-amber-600/10 rounded-lg border border-amber-600/20"><Briefcase className="w-4 h-4 text-[#7b9fef]" /></div>

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{tenants.length}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Toplam Müşteri</div>

                                </div>



                                {/* Toplam Oda */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-700/10 rounded-full blur-xl group-hover:bg-amber-700/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-amber-700/10 rounded-lg border border-amber-700/20"><Server className="w-4 h-4 text-[#7b9fef]" /></div>

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{tenants.reduce((sum, t) => sum + (t.roomLimit || 0), 0)}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Toplam Oda</div>

                                </div>



                                {/* Ödeme Geciken */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20"><AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" /></div>

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{adminStats.paymentDue}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Ödeme Gecikenler</div>

                                </div>



                                {/* Online Kullanıcı */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20"><Users className="w-4 h-4 text-cyan-400" /></div>

                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{adminStats.onlineUsers}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Anlık Online</div>

                                </div>



                                {/* Mikrofonda Konuşan */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20"><Activity className="w-4 h-4 text-purple-400" /></div>

                                        {(adminStats.activeSpeakers || 0) > 0 && <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>}

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{adminStats.activeSpeakers || 0}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Mikrofonda</div>

                                </div>



                                {/* Aktif Oda */}

                                <div className="owner-glossy p-4 relative group hover:bg-white/5 transition-all hover:-translate-y-0.5">

                                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>

                                    <div className="flex justify-between items-start mb-3">

                                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><Wifi className="w-4 h-4 text-emerald-400" /></div>

                                        {(adminStats.activeRooms || 0) > 0 && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>}

                                    </div>

                                    <div className="text-2xl font-extrabold text-white mb-0.5">{adminStats.activeRooms || 0}</div>

                                    <div className="text-[10px] text-gray-400 font-medium">Aktif Oda</div>

                                </div>

                            </div>



                            {/* Vadesi Geçmiş Ödemeler Paneli */}

                            {overdueTenants.length > 0 && (

                                <div className="rounded-2xl overflow-hidden border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.04] to-amber-500/[0.02] backdrop-blur-md">

                                    <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                        <div className="flex items-center gap-3">

                                            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">

                                                <AlertTriangle className="w-5 h-5 text-rose-400" />

                                            </div>

                                            <div>

                                                <h2 className="text-base font-bold text-white">Vadesi Geçmiş Ödemeler</h2>

                                                <p className="text-xs text-gray-400">{overdueTenants.length} müşterinin ödeme süresi geçmiş</p>

                                            </div>

                                        </div>

                                        <button

                                            onClick={async () => {

                                                setLoadingOverdue(true);

                                                try {

                                                    const token = sessionStorage.getItem('soprano_admin_token');

                                                    const res = await fetch(`${API_URL}/admin/overdue-tenants`, {

                                                        headers: { Authorization: `Bearer ${token}` },

                                                    });

                                                    if (res.ok) setOverdueTenants(await res.json());

                                                } catch { } finally { setLoadingOverdue(false); }

                                            }}

                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"

                                        >

                                            <RefreshCw className={`w-4 h-4 ${loadingOverdue ? 'animate-spin' : ''}`} />

                                        </button>

                                    </div>

                                    <div className="divide-y divide-white/5">

                                        {overdueTenants.map(t => {

                                            const daysOverdue = t.expiresAt ? Math.floor((Date.now() - new Date(t.expiresAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

                                            const lastReminder = t.paymentReminderAt ? new Date(t.paymentReminderAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Hiç gönderilmedi';

                                            return (

                                                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">

                                                    <div className="flex items-center gap-3 flex-1 min-w-0">

                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${daysOverdue >= 7 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : daysOverdue >= 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>

                                                            {daysOverdue}g

                                                        </div>

                                                        <div className="min-w-0">

                                                            <div className="text-sm font-medium text-white truncate">{t.displayName || t.name}</div>

                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">

                                                                {t.email && <span className="truncate">{t.email}</span>}

                                                                <span>•</span>

                                                                <span>Son hatırlatma: {lastReminder}</span>

                                                            </div>

                                                        </div>

                                                    </div>

                                                    <button

                                                        disabled={!!sendingReminder[t.id]}

                                                        onClick={async () => {

                                                            setSendingReminder(p => ({ ...p, [t.id]: true }));

                                                            try {

                                                                const token = sessionStorage.getItem('soprano_admin_token');

                                                                const res = await fetch(`${API_URL}/admin/customers/${t.id}/payment-reminder`, {

                                                                    method: 'POST',

                                                                    headers: { Authorization: `Bearer ${token}` },

                                                                });

                                                                if (res.ok) {

                                                                    addToast(`${t.displayName || t.name} müşterisine ödeme hatırlatması gönderildi 📩`, 'success');

                                                                    setOverdueTenants(prev => prev.map(x => x.id === t.id ? { ...x, paymentReminderAt: new Date().toISOString() } : x));

                                                                } else { addToast('Gönderilemedi', 'error'); }

                                                            } catch { addToast('Gönderilemedi', 'error'); }

                                                            finally { setSendingReminder(p => ({ ...p, [t.id]: false })); }

                                                        }}

                                                        className="flex-shrink-0 px-4 py-2 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"

                                                    >

                                                        {sendingReminder[t.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><BellRing className="w-3.5 h-3.5" /> Hatırlat</>}

                                                    </button>

                                                </div>

                                            );

                                        })}

                                    </div>

                                </div>

                            )}



                            {/* Dashboard Widgets Grid */}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



                                {/* Soprano HQ Card */}

                                <div className="glass-panel rounded-2xl overflow-hidden border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.03] backdrop-blur-md">

                                    <div className="p-6">

                                        <div className="flex items-center justify-between mb-4">

                                            <div className="flex items-center gap-3">

                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">

                                                    <span className="font-bold text-white text-lg">S</span>

                                                </div>

                                                <div>

                                                    <div className="font-bold text-white flex items-center gap-2">

                                                        sopranochat.com

                                                        <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wide shadow-[0_0_10px_rgba(244,63,94,0.4)]">HQ</span>

                                                    </div>

                                                    <div className="text-xs text-gray-400">Ana Merkez</div>

                                                </div>

                                            </div>

                                            <div className="flex items-center gap-2">

                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>

                                                <span className="text-blue-400 font-bold text-xs">Daima Aktif</span>

                                            </div>

                                        </div>

                                        <div className="flex items-center gap-2">

                                            <button onClick={async () => {

                                                try {

                                                    let tenantId = systemTenantId;

                                                    if (!tenantId) {

                                                        const token = sessionStorage.getItem('soprano_admin_token');

                                                        const res = await fetch(`${API_URL}/admin/customers/system-tenant`, { headers: { 'Authorization': `Bearer ${token}` } });

                                                        if (res.ok) { const data = await res.json(); tenantId = data.id; setSystemTenantId(tenantId!); }

                                                    }

                                                    if (!tenantId) { addToast('Sistem tenant bulunamadı', 'error'); return; }

                                                    const token = sessionStorage.getItem('soprano_admin_token');

                                                    const res = await fetch(`${API_URL}/admin/customers/${tenantId}/godmaster-token`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });

                                                    if (!res.ok) throw new Error('Token alınamadı');

                                                    const data = await res.json();

                                                    localStorage.setItem('soprano_tenant_token', data.access_token);

                                                    localStorage.setItem('soprano_tenant_user', JSON.stringify({ userId: data.user.id, username: data.user.displayName, avatar: data.user.avatar || '', isMember: true, role: 'godmaster', displayName: data.user.displayName }));

                                                    window.open(`/t/${data.slug}?gm=1`, '_blank');

                                                    showToast('GodMaster olarak giriş yapılıyor...');

                                                } catch (err) { addToast('GodMaster girişi başarısız!', 'error'); console.error(err); }

                                            }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all text-sm font-bold border border-rose-500/30">

                                                <LayoutGrid className="w-4 h-4" /> GodMaster Giriş

                                            </button>

                                            <button

                                                onClick={async () => {

                                                    let tid = systemTenantId;

                                                    if (!tid) {

                                                        const token = sessionStorage.getItem('soprano_admin_token');

                                                        const res = await fetch(`${API_URL}/admin/customers/system-tenant`, { headers: { 'Authorization': `Bearer ${token}` } });

                                                        if (res.ok) { const data = await res.json(); tid = data.id; setSystemTenantId(tid!); }

                                                    }

                                                    if (tid) {

                                                        setTenantMembersModal({ isOpen: true, tenantId: tid, tenantName: 'sopranochat.com' });

                                                    } else {

                                                        addToast('Sistem tenant bulunamadı', 'error');

                                                    }

                                                }}

                                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-sm font-medium border border-white/10 flex items-center gap-2"

                                                title="Oda Kullanıcıları"

                                            >

                                                <Users2 className="w-4 h-4" />

                                            </button>

                                        </div>

                                    </div>

                                </div>



                                {/* Son Siparişler */}

                                <div className="owner-glossy">

                                    <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <ShoppingBag className="w-4 h-4 text-emerald-400" />

                                            <span className="text-sm font-bold text-white">Son Siparişler</span>

                                            {inlineOrders.filter(o => o.status === 'PENDING').length > 0 && (

                                                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] font-bold rounded-full border border-yellow-500/20">{inlineOrders.filter(o => o.status === 'PENDING').length} Bekleyen</span>

                                            )}

                                        </div>

                                        <button onClick={() => setActiveView('orders')} className="text-xs text-gray-400 hover:text-[#7b9fef] transition-colors">Tümünü Gör →</button>

                                    </div>

                                    <div className="divide-y divide-white/[0.03]">

                                        {inlineOrders.length === 0 ? (

                                            <div className="px-5 py-8 text-center text-gray-400 text-sm">Henüz sipariş yok</div>

                                        ) : inlineOrders.slice(0, 4).map((o: any) => (

                                            <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">

                                                <div className="flex items-center gap-3">

                                                    <div className={`w-2 h-2 rounded-full ${o.status === 'PENDING' ? 'bg-yellow-400 animate-pulse' : o.status === 'APPROVED' ? 'bg-green-400' : 'bg-red-400'}`}></div>

                                                    <div>

                                                        <div className="text-sm text-white font-medium">{o.firstName} {o.lastName}</div>

                                                        <div className="text-[11px] text-gray-400">{o.paymentCode}</div>

                                                    </div>

                                                </div>

                                                <div className="text-right">

                                                    <div className="text-sm font-bold text-white">₺{parseFloat(o.amount || '0').toLocaleString('tr-TR')}</div>

                                                    <div className="text-[10px] text-gray-400">{new Date(o.createdAt).toLocaleDateString('tr-TR')}</div>

                                                </div>

                                            </div>

                                        ))}

                                    </div>

                                </div>



                                {/* Okunmamış Mesajlar */}

                                <div className="owner-glossy">

                                    <div className="p-5 border-b border-white/5 flex items-center justify-between">

                                        <div className="flex items-center gap-2">

                                            <Inbox className="w-4 h-4 text-emerald-400" />

                                            <span className="text-sm font-bold text-white">İletişim Mesajları</span>

                                            {unreadCount > 0 && (

                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20 animate-pulse">{unreadCount} Yeni</span>

                                            )}

                                        </div>

                                        <button onClick={() => { setActiveView('contactMessages'); loadContactMessages(); }} className="text-xs text-gray-400 hover:text-[#7b9fef] transition-colors">Tümünü Gör →</button>

                                    </div>

                                    <div className="divide-y divide-white/[0.03]">

                                        {contactMessages.length === 0 ? (

                                            <div className="px-5 py-8 text-center text-gray-400 text-sm">Henüz mesaj yok</div>

                                        ) : contactMessages.slice(0, 4).map((msg: any) => (

                                            <div key={msg.id} className={`px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer ${!msg.isRead ? 'bg-emerald-500/[0.03]' : ''}`} onClick={() => { setActiveView('contactMessages'); loadContactMessages(); }}>

                                                <div className="flex items-center gap-3">

                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${!msg.isRead ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>{msg.name?.charAt(0)?.toUpperCase()}</div>

                                                    <div>

                                                        <div className={`text-sm font-medium ${!msg.isRead ? 'text-white' : 'text-gray-400'}`}>{msg.name}</div>

                                                        <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{msg.subject}</div>

                                                    </div>

                                                </div>

                                                <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleDateString('tr-TR')}</span>

                                            </div>

                                        ))}

                                    </div>

                                </div>



                                {/* Sistem Performansı */}

                                <div className="owner-glossy">

                                    <div className="p-5 border-b border-white/5">

                                        <div className="flex items-center gap-2">

                                            <Cpu className="w-4 h-4 text-purple-400" />

                                            <span className="text-sm font-bold text-white">Sistem Performansı</span>

                                        </div>

                                    </div>

                                    <div className="p-5 space-y-4">

                                        {/* Uptime */}

                                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2">

                                                <Clock className="w-4 h-4 text-green-400" />

                                                <span className="text-xs text-gray-400 font-medium">Uptime</span>

                                            </div>

                                            <span className="text-xs font-bold text-white font-mono">

                                                {adminStats.system ? (() => {

                                                    const s = adminStats.system.uptimeSeconds;

                                                    const d = Math.floor(s / 86400);

                                                    const h = Math.floor((s % 86400) / 3600);

                                                    const m = Math.floor((s % 3600) / 60);

                                                    return d > 0 ? `${d}g ${h}s ${m}dk` : h > 0 ? `${h}s ${m}dk` : `${m}dk`;

                                                })() : '—'}

                                            </span>

                                        </div>

                                        {/* RAM */}

                                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2">

                                                <Server className="w-4 h-4 text-cyan-400" />

                                                <span className="text-xs text-gray-400 font-medium">RAM Kullanımı</span>

                                            </div>

                                            <span className="text-xs font-bold text-white font-mono">{adminStats.system?.memoryMB || 0} MB</span>

                                        </div>

                                        {/* Heap */}

                                        <div className="space-y-1.5">

                                            <div className="flex items-center justify-between">

                                                <span className="text-[10px] text-gray-400 font-medium">Heap Kullanımı</span>

                                                <span className="text-[10px] font-bold text-gray-400 font-mono">{adminStats.system?.heapUsedMB || 0} / {adminStats.system?.heapTotalMB || 0} MB</span>

                                            </div>

                                            <div className="w-full bg-white/5 rounded-full h-1.5">

                                                <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all" style={{ width: `${adminStats.system?.heapTotalMB ? Math.min((adminStats.system.heapUsedMB / adminStats.system.heapTotalMB) * 100, 100) : 0}%` }}></div>

                                            </div>

                                        </div>

                                        {/* Node Process */}

                                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2">

                                                <Activity className="w-4 h-4 text-amber-400" />

                                                <span className="text-xs text-gray-400 font-medium">Node Process</span>

                                            </div>

                                            <div className="flex items-center gap-1.5">

                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>

                                                <span className="text-[10px] font-bold text-green-400">Çalışıyor</span>

                                            </div>

                                        </div>

                                    </div>

                                </div>





                                {/* ── Duyuru Yönetimi (Inline) ── */}

                                <div id="inline-announcement-card" className="owner-glossy" style={{ transition: 'box-shadow 0.5s ease' }}>

                                    <div className="p-5 border-b border-white/5">

                                        <div className="flex items-center gap-2">

                                            <Megaphone className="w-4 h-4 text-indigo-400" />

                                            <span className="text-sm font-bold text-white">Duyuru Yönetimi</span>

                                        </div>

                                    </div>

                                    <div className="p-5 space-y-4">

                                        <textarea

                                            value={announcementText}

                                            onChange={(e) => setAnnouncementText(e.target.value.slice(0, 500))}

                                            rows={3}

                                            className="w-full bg-black/30 border border-indigo-500/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/40 resize-none transition placeholder:text-gray-500"

                                            placeholder="Duyuru mesajınızı yazın..."

                                        />

                                        <div className="flex items-center justify-between">

                                            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden mr-3">

                                                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(announcementText.length / 500) * 100}%`, background: announcementText.length > 400 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #6366f1, #a855f7)' }} />

                                            </div>

                                            <span className={`text-[10px] font-mono ${announcementText.length > 400 ? 'text-amber-400' : 'text-gray-400'}`}>{announcementText.length}/500</span>

                                        </div>

                                        <button

                                            disabled={!announcementText.trim() || announcementSending}

                                            onClick={async () => {

                                                if (!announcementText.trim()) return;

                                                setAnnouncementSending(true);

                                                try {

                                                    const token = sessionStorage.getItem('soprano_admin_token');

                                                    const res = await fetch(`${API_URL}/admin/announcement`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message: announcementText.trim() }) });

                                                    if (res.ok) { showToast('Duyuru yayınlandı! 📢'); setAnnouncementText(''); try { const r = await fetch(`${API_URL}/admin/announcements`, { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) { const d = await r.json(); setPastAnnouncements(d); setNotifications(d); } } catch { } }

                                                    else showToast('Duyuru gönderilemedi!');

                                                } catch { showToast('Duyuru gönderilemedi!'); } finally { setAnnouncementSending(false); }

                                            }}

                                            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"

                                            style={{ background: !announcementText.trim() || announcementSending ? 'rgba(55,55,70,0.8)' : 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: announcementText.trim() && !announcementSending ? '0 0 20px rgba(99,102,241,0.2)' : 'none' }}

                                        >

                                            <Megaphone className="w-4 h-4" />

                                            {announcementSending ? 'Gönderiliyor...' : 'Duyuruyu Yayınla'}

                                        </button>



                                        {/* Son Duyurular */}

                                        <div className="pt-4 border-t border-white/5">

                                            <div className="flex items-center justify-between mb-3">

                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">

                                                    <ScrollText className="w-3.5 h-3.5" /> Son Duyurular

                                                </h3>

                                                <button onClick={async () => { setLoadingAnnouncements(true); try { const token = sessionStorage.getItem('soprano_admin_token'); const res = await fetch(`${API_URL}/admin/announcements`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setPastAnnouncements(await res.json()); } catch { } finally { setLoadingAnnouncements(false); } }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">

                                                    <RefreshCw className={`w-3 h-3 ${loadingAnnouncements ? 'animate-spin' : ''}`} />

                                                </button>

                                            </div>

                                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">

                                                {loadingAnnouncements ? (

                                                    <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>

                                                ) : pastAnnouncements.length === 0 ? (

                                                    <p className="text-xs text-gray-400 text-center py-4">Henüz duyuru yok.</p>

                                                ) : pastAnnouncements.map(ann => (

                                                    <div key={ann.id} className="group rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 transition-all p-3">

                                                        {editingAnnouncementId === ann.id ? (

                                                            <div className="space-y-2">

                                                                <textarea value={editAnnouncementText} onChange={e => setEditAnnouncementText(e.target.value.slice(0, 500))} rows={2} className="w-full bg-black/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500/60 resize-none transition" />

                                                                <div className="flex items-center gap-2 justify-end">

                                                                    <button onClick={() => { setEditingAnnouncementId(null); setEditAnnouncementText(''); }} className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition">İptal</button>

                                                                    <button onClick={async () => { if (!editAnnouncementText.trim()) return; try { const token = sessionStorage.getItem('soprano_admin_token'); const res = await fetch(`${API_URL}/admin/announcements/${ann.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message: editAnnouncementText.trim() }) }); if (res.ok) { setPastAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, message: editAnnouncementText.trim() } : a)); addToast('Duyuru güncellendi ✅', 'success'); setEditingAnnouncementId(null); setEditAnnouncementText(''); } else { addToast('Güncellenemedi', 'error'); } } catch { addToast('Güncellenemedi', 'error'); } }} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition">Kaydet</button>

                                                                </div>

                                                            </div>

                                                        ) : (

                                                            <>

                                                                <p className="text-sm text-gray-300 leading-relaxed mb-2 whitespace-pre-wrap">{ann.message}</p>

                                                                <div className="flex items-center justify-between">

                                                                    <span className="text-[10px] text-gray-400">{new Date(ann.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>

                                                                    <div className="flex items-center gap-1">

                                                                        <button onClick={() => { setEditingAnnouncementId(ann.id); setEditAnnouncementText(ann.message); }} className="p-1 rounded-md bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition-colors" title="Düzenle"><Pencil className="w-3 h-3" /></button>

                                                                        <button onClick={() => { setOrderConfirm({ isOpen: true, title: 'Duyuru Sil', message: 'Bu duyuru kalıcı olarak silinecek. Emin misiniz?', type: 'danger', onConfirm: async () => { try { const token = sessionStorage.getItem('soprano_admin_token'); const res = await fetch(`${API_URL}/admin/announcements/${ann.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { setPastAnnouncements(prev => prev.filter(a => a.id !== ann.id)); addToast('Duyuru silindi 🗑️', 'success'); } else { addToast('Silinemedi', 'error'); } } catch { addToast('Silinemedi', 'error'); } } }); }} className="p-1 rounded-md bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Sil"><Trash2 className="w-3 h-3" /></button>

                                                                    </div>

                                                                </div>

                                                            </>

                                                        )}

                                                    </div>

                                                ))}

                                            </div>

                                        </div>

                                    </div>

                                </div>



                                {/* ── Ziyaretçi İstatistikleri ── */}

                                <div className="owner-glossy">

                                    <div className="p-5 border-b border-white/5">

                                        <div className="flex items-center gap-2">

                                            <BarChart3 className="w-4 h-4 text-cyan-400" />

                                            <span className="text-sm font-bold text-white">Ziyaretçi İstatistikleri</span>

                                        </div>

                                    </div>

                                    <div className="p-5 grid grid-cols-2 gap-3">

                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2 mb-2">

                                                <Globe className="w-4 h-4 text-blue-400" />

                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Toplam Ziyaret</span>

                                            </div>

                                            <div className="text-2xl font-black text-white">{(adminStats as any)?.totalVisits?.toLocaleString('tr-TR') || '—'}</div>

                                            <div className="text-[10px] text-gray-400 mt-1">Tüm zamanlar</div>

                                        </div>

                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2 mb-2">

                                                <Users className="w-4 h-4 text-emerald-400" />

                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Kayıtlı Üye</span>

                                            </div>

                                            <div className="text-2xl font-black text-white">{(adminStats as any)?.totalUsers?.toLocaleString('tr-TR') || '—'}</div>

                                            <div className="text-[10px] text-gray-400 mt-1">Toplam kayıt</div>

                                        </div>

                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2 mb-2">

                                                <Users2 className="w-4 h-4 text-amber-400" />

                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Misafir Giriş</span>

                                            </div>

                                            <div className="text-2xl font-black text-white">{(adminStats as any)?.guestEntries?.toLocaleString('tr-TR') || '—'}</div>

                                            <div className="text-[10px] text-gray-400 mt-1">Misafir olarak giren</div>

                                        </div>

                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">

                                            <div className="flex items-center gap-2 mb-2">

                                                <LayoutGrid className="w-4 h-4 text-purple-400" />

                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Oda Giriş</span>

                                            </div>

                                            <div className="text-2xl font-black text-white">{(adminStats as any)?.roomEntries?.toLocaleString('tr-TR') || '—'}</div>

                                            <div className="text-[10px] text-gray-400 mt-1">Toplam oda giriş</div>

                                        </div>

                                    </div>

                                </div>



                            </div>

                        </>

                    )

                    }

                </div >

            </main >



            {/* NEW CLIENT MODAL */}

            < NewClientModal isOpen={drawers.newClient} onClose={() => toggleDrawer('newClient', false)

            } />







            {/* TENANT MEMBERS MODAL */}

            {

                tenantMembersModal.isOpen && (

                    <MemberModal

                        isOpen={tenantMembersModal.isOpen}

                        onClose={() => setTenantMembersModal({ isOpen: false, tenantId: '', tenantName: '' })}

                        tenantId={tenantMembersModal.tenantId}

                        tenantName={tenantMembersModal.tenantName}

                    />

                )

            }



            {/* ANNOUNCEMENT — artık inline dashboard kartı olarak gösteriliyor */}





            {/* SYSTEM LOGS — artık inline page view olarak gösteriliyor */}



            {/* HQ MEMBERS — artık Admin & Yardımcılar sekmesinden yönetiliyor */}



            {/* ORDERS — artık inline page view olarak gösteriliyor */}



            {/* INTERNAL TOAST CONTAINER */}

            <ToastContainer />



            {/* Global Order Confirm Modal */}

            {

                orderConfirm.isOpen && (

                    <div className="fixed inset-0 z-[200] flex items-center justify-center">

                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOrderConfirm(prev => ({ ...prev, isOpen: false }))}></div>

                        <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">

                            <h3 className="text-lg font-bold text-white mb-2">{orderConfirm.title}</h3>

                            <p className="text-sm text-gray-400 mb-6">{orderConfirm.message}</p>

                            <div className="flex gap-3 justify-end">

                                <button onClick={() => setOrderConfirm(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm transition">Vazgeç</button>

                                <button onClick={() => { orderConfirm.onConfirm(); setOrderConfirm(prev => ({ ...prev, isOpen: false })); }} className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition ${orderConfirm.type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>Onayla</button>

                            </div>

                        </div>

                    </div>

                )

            }



            <EditCustomerModal

                isOpen={editClientModal.isOpen}

                onClose={closeEditModal}

                clientId={editClientModal.clientId}

            />



            <style jsx global>{`

                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');

                @import url('https://fonts.cdnfonts.com/css/cooper-black');



                .owner-panel-root * { font-family: 'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif; }



                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }

                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }

                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }



                /* ═══ Glossy Panel — kart/tablo container ═══ */

                .owner-glossy-panel {

                    background:

                        radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),

                        linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),

                        linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);

                    backdrop-filter: blur(24px);

                    border: 1px solid rgba(255,255,255,0.15);

                    border-top: 1px solid rgba(255,255,255,0.35);

                    border-left: 1px solid rgba(255,255,255,0.2);

                    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);

                    border-radius: 18px;

                    overflow: hidden;

                }



                /* ═══ 3D Butonlar ═══ */

                .owner-btn-3d {

                    position: relative; display: inline-flex; align-items: center; justify-content: center;

                    border: none; outline: none; cursor: pointer; font-weight: 600;

                    transition: all 0.3s ease; overflow: hidden;

                }

                .owner-btn-3d-blue { background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%); color: #bae6fd; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }

                .owner-btn-3d-blue:hover { background: linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(2,132,199,0.45) 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.2); }

                .owner-btn-3d-green { background: linear-gradient(180deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.35) 100%); color: #a7f3d0; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }

                .owner-btn-3d-green:hover { background: linear-gradient(180deg, rgba(52,211,153,0.35) 0%, rgba(5,150,105,0.45) 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.2); }

                .owner-btn-3d-gold { background: linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.35) 100%); color: #fef3c7; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }

                .owner-btn-3d-gold:hover { background: linear-gradient(180deg, rgba(251,191,36,0.35) 0%, rgba(217,119,6,0.45) 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.2); }

                .owner-btn-3d-red { background: linear-gradient(180deg, rgba(220,38,38,0.3) 0%, rgba(153,27,27,0.45) 100%); color: #fca5a5; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.12); }

                .owner-btn-3d-red:hover { background: linear-gradient(180deg, rgba(220,38,38,0.4) 0%, rgba(153,27,27,0.55) 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(220,38,38,0.25), 0 0 18px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.18); }

                .owner-btn-3d-white { background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(200,210,225,0.2) 100%); color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.08); }

                .owner-btn-3d-white:hover { background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(210,220,235,0.3) 100%); transform: translateY(-1px); }

                .owner-btn-3d:active { transform: translateY(1px) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1) !important; }



                /* ═══ Input Inset ═══ */

                .owner-input-inset {

                    background: rgba(0,0,0,0.2);

                    border: 1px solid rgba(255,255,255,0.1);

                    border-top: 1px solid rgba(0,0,0,0.4);

                    box-shadow: inset 0 3px 6px rgba(0,0,0,0.3);

                    color: #fff;

                    transition: all 0.2s ease;

                }

                .owner-input-inset:focus-within {

                    background: rgba(0,0,0,0.3);

                    border-color: #38bdf8;

                    box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56,189,248,0.2);

                }

                .owner-input-inset::placeholder { color: rgba(255,255,255,0.3); }



                /* ═══ Nav Hover ═══ */

                .owner-nav-btn { transition: all 0.2s ease; }

                .owner-nav-btn:hover { background: rgba(255,255,255,0.06) !important; color: #fff !important; }



                /* ═══ Stat Card ═══ */

                .owner-stat-card {

                    background:

                        radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.06) 0%, transparent 50%),

                        linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.5) 100%);

                    backdrop-filter: blur(16px);

                    border: 1px solid rgba(255,255,255,0.12);

                    border-top: 1px solid rgba(255,255,255,0.25);

                    box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);

                    border-radius: 16px;

                    padding: 16px;

                    display: flex; align-items: center; gap: 12px;

                }



                @keyframes blink-urgent {

                    0%, 100% { border-left-color: transparent; }

                    50% { border-left-color: #ef4444; }

                }

                .blink-urgent {

                    border-left: 3px solid #ef4444;

                    animation: blink-urgent 1.5s ease-in-out infinite;

                }

                @keyframes blink-text {

                    0%, 100% { opacity: 1; }

                    50% { opacity: 0.3; }

                }

                .blink-text {

                    animation: blink-text 1.2s ease-in-out infinite;

                }

            `}</style>

        </div>

        </div>

        </>

    );

}

