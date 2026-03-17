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
import { AudioTestPanel } from '@/components/roomUI/AudioTestPanel';
import { ToastContainer as RoomToastContainer, useToast } from '@/components/ui/Toast';
import { useAdminPanelStore } from '@/stores/useAdminPanelStore';
import { AdminPanelWindow } from '@/components/admin/AdminPanelWindow';



type DemoContextMenuItem = RoomMenuItem;

// YouTube video ID extract — RightLivePanel'deki aynı fonksiyon
function extractYoutubeId(url: string): string | null {
    try {
        const u = new URL(url.trim());
        if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
        if (u.pathname === '/watch') return u.searchParams.get('v');
        if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
        if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
    } catch { return null; }
    return null;
}

const AUTH_TOKEN_KEY = 'soprano_auth_token';





// --- SAHTE VERİLER ---
const ACTIVE_ROOMS = [
    { id: 1, name: "Goygoy & Müzik", owner: "Celine", users: 142, max: 250, type: "Kamera + Ses", isVip: false },
    { id: 2, name: "Gece Kuşları", owner: "Karanlık", users: 85, max: 100, type: "Sadece Ses", isVip: false },
    { id: 3, name: "Radyo Soprano", owner: "DJ.Bora", users: 310, max: 500, type: "Yayın", isVip: false },
    { id: 4, name: "Oyun Lobisi", owner: "GamerTR", users: 45, max: 50, type: "Kamera + Ses", isVip: false },
    { id: 5, name: "VIP Sohbet", owner: "Admin", users: 12, max: 30, type: "Özel Oda", isVip: true },
];

export default function HomePage({ initialRoomsMode, initialSlug, initialTenant }: { initialRoomsMode?: boolean; initialSlug?: string; initialTenant?: string } = {}) {
    // initialRoomsMode aktifken çıkış yapılırsa yönlendirilecek URL
    const roomExitUrl = initialRoomsMode ? (initialTenant && initialTenant !== 'system' ? `/t/${initialTenant}` : '/') : null;
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
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
    const [roomsMode, setRoomsMode] = useState(initialRoomsMode || false);
    useEffect(() => { document.body.style.overflow = roomsMode ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [roomsMode]);
    // ★ roomsMode aktif olduğunda doğrudan premium room sayfasına yönlendir
    useEffect(() => {
        if (roomsMode && user) {
            const slug = dbRooms.length > 0 ? dbRooms[0].slug : (initialSlug || 'genel-sohbet');
            const tenantPrefix = initialTenant && initialTenant !== 'system' ? `/t/${initialTenant}` : '';
            router.push(`${tenantPrefix}/room/${slug}`);
        }
    }, [roomsMode, user]);
    const [blurToOdalar, setBlurToOdalar] = useState<false | 'out' | 'silhouette'>(false);
    const [demoEntrance, setDemoEntrance] = useState<'idle' | 'in' | 'out'>(initialRoomsMode ? 'in' : 'idle');
    const [userStatus, setUserStatus] = useState<'online' | 'busy' | 'brb' | 'away' | 'phone' | 'invisible'>('online');
    const [micActive, setMicActive] = useState(false);
    const [demoSlug, setDemoSlug] = useState(initialSlug || 'genel-sohbet');
    const handleRoomSwitch = (slug: string) => {
        if (slug === demoSlug) return;
        setDemoSlug(slug);
    };
    const demoRoomRef = useRef<any>(null);
    const [demoRoomReady, setDemoRoomReady] = useState(false);
    const [demoRoomUsers, setDemoRoomUsers] = useState<any[]>([]);
    const [demoCurrentSpeaker, setDemoCurrentSpeaker] = useState<any>(null);
    const [demoIsMicOn, setDemoIsMicOn] = useState(false);
    const [demoQueue, setDemoQueue] = useState<string[]>([]);
    const [demoMicTimeLeft, setDemoMicTimeLeft] = useState(0);
    const [cachedRooms, setCachedRooms] = useState<{ name: string; slug: string }[]>(() => {
        if (typeof window === 'undefined') return [];
        try { const saved = localStorage.getItem('soprano_cached_rooms'); return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    useEffect(() => { if (dbRooms.length > 0) { const mapped = dbRooms.map(r => ({ name: r.name, slug: r.slug })); setCachedRooms(mapped); try { localStorage.setItem('soprano_cached_rooms', JSON.stringify(mapped)); } catch { } } }, [dbRooms]);
    const [statusDropdown, setStatusDropdown] = useState(false);
    const [demoPhase, setDemoPhase] = useState<'idle' | 'cards-out' | 'bar-up' | 'bar-down' | 'lamp-center' | 'active' | 'exit-lamp' | 'exit-bar-up' | 'exit-bar-down' | 'exit-cards-in'>('idle');
    const demoMode = roomsMode || demoPhase === 'active' || demoPhase === 'lamp-center' || demoPhase === 'exit-lamp' || demoPhase === 'exit-bar-up';
    const [showCustomConfig, setShowCustomConfig] = useState(false);
    const [lampsOff, setLampsOff] = useState(false);
    const [liveHidden, setLiveHidden] = useState(false);
    const [liveCollapsed, setLiveCollapsed] = useState(false);
    // YouTube/Video TV state
    const [tvVideoUrl, setTvVideoUrl] = useState<string | null>(null);
    const [tvVolume, setTvVolume] = useState(0.7);
    const [tvYtInputOpen, setTvYtInputOpen] = useState(false);
    const [tvYtInputValue, setTvYtInputValue] = useState('');
    const tvYtIframeRef = useRef<HTMLIFrameElement>(null);
    const [audioTestOpen, setAudioTestOpen] = useState(false);
    useEffect(() => { (window as any).__sopranoOpenAudioTest = () => setAudioTestOpen(true); return () => { delete (window as any).__sopranoOpenAudioTest; }; }, []);
    // Cookie consent
    const [showCookieConsent, setShowCookieConsent] = useState(false);
    useEffect(() => { if (typeof window !== 'undefined' && !localStorage.getItem('soprano_cookie_consent')) setShowCookieConsent(true); }, []);
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
    const [chkSending, setChkSending] = useState(false);
    const [chkSuccess, setChkSuccess] = useState(false);

    // Customer Support widget
    const [supportOpen, setSupportOpen] = useState(false);
    const [supName, setSupName] = useState('');
    const [supEmail, setSupEmail] = useState('');
    const [supSubject, setSupSubject] = useState('');
    const [supMessage, setSupMessage] = useState('');
    const [supSending, setSupSending] = useState(false);
    const [supSuccess, setSupSuccess] = useState(false);

    // ★ Branding — admin panelden gelen dinamik site config
    const [branding, setBranding] = useState<any>(null);

    // ★ Müşteri Tenant verileri — Müşteri Platformları + Referanslar
    const [sopranoChatCustomers, setSopranoChatCustomers] = useState<any[]>([]);
    const [ownDomainCustomers, setOwnDomainCustomers] = useState<any[]>([]);

    // Navigation sections
    const [activeSection, setActiveSection] = useState(initialRoomsMode ? 'odalar' : 'home');
    const [guideOpen, setGuideOpen] = useState<string | null>(null);

    // ★ Sosyal giriş profil düzenleme toast modal state
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [setupGender, setSetupGender] = useState('');
    const [setupAvatar, setSetupAvatar] = useState('');
    const [setupName, setSetupName] = useState('');
    const [setupSaving, setSetupSaving] = useState(false);

    // ★ Google/Facebook ile giriş sonrası profil toast modal açma
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('openProfile') === 'true' && user) {
                window.history.replaceState({}, '', window.location.pathname);
                setShowProfileSetup(true);
                setShowAvatarPicker(true);
                setTimeout(() => {
                    const el = document.getElementById('hesap-paneli');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    }, [user]);

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
        setUser(initialUser);
        const onAuthChange = () => setUser(getAuthUser());
        window.addEventListener('auth-change', onAuthChange);
        return () => window.removeEventListener('auth-change', onAuthChange);
    }, []);

    // ★ Fetch branding — admin panelden dinamik site config
    const fetchBranding = () => {
        fetch(`${API_URL}/admin/branding`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setBranding(data); })
            .catch(() => {});
    };
    useEffect(() => {
        fetchBranding();
        // Kayıt sonrası anlık yansıma: OwnerPanel kaydedince bu event tetiklenir
        const onConfigUpdated = () => fetchBranding();
        window.addEventListener('siteconfig-updated', onConfigUpdated);
        return () => window.removeEventListener('siteconfig-updated', onConfigUpdated);
    }, []);

    // ★ İletişim formu gönderme
    const handleContactSubmit = async () => {
        if (!supName.trim() || !supEmail.trim() || !supMessage.trim()) return;
        setSupSending(true);
        try {
            const res = await fetch(`${API_URL}/admin/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: supName.trim(), email: supEmail.trim(), subject: supSubject.trim(), message: supMessage.trim() }),
            });
            if (res.ok) {
                setSupSuccess(true);
                setSupName(''); setSupEmail(''); setSupSubject(''); setSupMessage('');
                setTimeout(() => setSupSuccess(false), 4000);
            }
        } catch { }
        setSupSending(false);
    };

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

    // ★ Fetch müşteri tenant verileri — Müşteri Platformları + Referanslar
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let failed = false;
        const fetchTenants = () => {
            if (failed) return;
            fetch(`${API_URL}/rooms/public/tenants`)
                .then(r => {
                    if (!r.ok) { failed = true; if (intervalId) clearInterval(intervalId); return null; }
                    return r.json();
                })
                .then(data => {
                    if (data) {
                        setSopranoChatCustomers(data.sopranoChatCustomers || []);
                        setOwnDomainCustomers(data.ownDomainCustomers || []);
                    }
                }).catch(() => { failed = true; if (intervalId) clearInterval(intervalId); });
        };
        fetchTenants();
        intervalId = setInterval(fetchTenants, 30000);
        return () => { if (intervalId) clearInterval(intervalId); };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestNick.trim()) return;
        setGuestError(''); setGuestLoading(true);
        sessionStorage.removeItem(AUTH_TOKEN_KEY); removeAuthUser();
        try {
            const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: guestNick.trim(), gender: guestGender }) });
            const data = await res.json();
            if (data.error) { setGuestError(data.error); return; }
            sessionStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
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
                sessionStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
                const memberAvatar = selectedAvatar || data.user?.avatar || generateGenderAvatar(memberUsername.trim(), memberGender || undefined);
                const u: AuthUser = { userId: data.user?.sub || memberUsername.trim(), username: data.user?.displayName || memberUsername.trim(), avatar: memberAvatar, isMember: true, role: (data.user?.role || 'member') as any, gender: (memberGender || 'Belirsiz') as any, email: data.user?.username || '' };
                setAuthUser(u); setUser(u); setEditName(u.username); setEditEmail(u.email || data.user?.username || ''); window.dispatchEvent(new Event('auth-change'));
            } else { setMemberError(data.message || 'Giriş başarısız.'); }
        } catch { setMemberError('Bağlantı hatası.'); } finally { setMemberLoading(false); }
    };

    const handleProfileUpdate = async (field: 'displayName' | 'avatar' | 'email' | 'password' | 'gender', value: string) => {
        setProfileSaving(true); setProfileMsg('');

        // ★ OPTIMISTIC UPDATE — UI ve sessionStorage'ı hemen güncelle (API yanıtını bekleme)
        if (user && (field === 'avatar' || field === 'gender' || field === 'displayName')) {
            const optimisticUser = { ...user, [field]: value };
            if (field === 'displayName') { (optimisticUser as any).username = value; }
            setUser(optimisticUser); setAuthUser(optimisticUser);
            if (field === 'avatar') setSelectedAvatar(value);

            // sessionStorage'ı da hemen güncelle — buildJoinPayload bunu okur
            try {
                for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                    const raw = sessionStorage.getItem(key);
                    if (raw) {
                        const stored = JSON.parse(raw);
                        if (field === 'avatar') stored.avatar = value;
                        if (field === 'displayName') { stored.displayName = value; stored.username = value; }
                        if (field === 'gender') stored.gender = value;
                        sessionStorage.setItem(key, JSON.stringify(stored));
                        // ★ Cross-tab senkronizasyon: localStorage'a da yaz
                        // useSocket.ts storage event'ini dinliyor ve emitProfileUpdate çağırıyor
                        // Bu sayede farklı tab'daki chat odası da profil güncellemesini alır
                        localStorage.setItem(key, JSON.stringify(stored));
                    }
                }
            } catch {}
            window.dispatchEvent(new Event('auth-change'));

            // Aynı tab'daki socket için direkt emit (farklı sayfa/route'da olsak bile)
            try {
                const sock = (window as any).__sopranoSocket;
                if (sock?.connected) {
                    sock.emit('user:profileUpdate', {
                        displayName: field === 'displayName' ? value : (user.displayName || user.username),
                        avatar: field === 'avatar' ? value : user.avatar,
                        nameColor: (user as any).nameColor || null,
                    });
                }
            } catch {}
        }

        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
            const res = await fetch(`${API_URL}/auth/update-profile`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                const result = await res.json();
                // Yeni JWT token'ı kaydet
                if (result.access_token) {
                    sessionStorage.setItem(AUTH_TOKEN_KEY, result.access_token);
                }
                // Backend'den dönen user bilgisiyle state'i nihai güncelle
                if (result.user && user) {
                    const u = { ...user, ...result.user };
                    setUser(u); setAuthUser(u);
                    if (field === 'avatar') setSelectedAvatar(value);
                    // ★ Backend sonucuyla sessionStorage'ı kesinleştir
                    try {
                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                            const raw = sessionStorage.getItem(key);
                            if (raw) {
                                const stored = JSON.parse(raw);
                                if (field === 'avatar') stored.avatar = result.user.avatar || value;
                                if (field === 'displayName') { stored.displayName = result.user.displayName || value; stored.username = result.user.displayName || value; }
                                if (field === 'email') stored.email = result.user.email || value;
                                if (field === 'gender') stored.gender = result.user.gender || value;
                                sessionStorage.setItem(key, JSON.stringify(stored));
                            }
                        }
                    } catch {}
                    window.dispatchEvent(new Event('auth-change'));
                }
                setProfileMsg('✅ Güncellendi!');
                setTimeout(() => setProfileMsg(''), 2000);
            } else {
                console.error('[handleProfileUpdate] API failed:', res.status, res.statusText);
                setProfileMsg('❌ Güncelleme başarısız.');
            }
        } catch (err) {
            console.error('[handleProfileUpdate] Network error:', err);
            setProfileMsg('❌ Bağlantı hatası.');
        } finally { setProfileSaving(false); }
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
                @import url('https://fonts.cdnfonts.com/css/cooper-black');

                body {
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(to bottom, ${branding?.siteConfig?.homepage?.bodyGradient1 || '#a3ace5'} 0%, ${branding?.siteConfig?.homepage?.bodyGradient2 || '#c4c9ee'} 50%, ${branding?.siteConfig?.homepage?.bodyGradient3 || '#d8dbf4'} 100%);
                    background-attachment: fixed;
                    font-family: 'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif;
                    color: #f8fafc;
                    min-height: 100vh;
                    overflow-x: hidden;
                    overflow-y: scroll;
                }

                .main-content {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    position: relative;
                    background-color: ${branding?.siteConfig?.homepage?.mainBg || '#7a7e9e'};
                    padding-bottom: 32px;
                    border-left: 14px solid rgba(255,255,255,0.85);
                    border-right: 14px solid rgba(255,255,255,0.85);
                    border-bottom: 14px solid rgba(255,255,255,0.85);
                    box-shadow:
                        0 0 30px rgba(0,0,0,0.25),
                        0 0 60px rgba(0,0,0,0.12),
                        -4px 0 15px rgba(0,0,0,0.18),
                        4px 0 15px rgba(0,0,0,0.18);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .retro-logo-text {
                    font-family: 'Cooper Black', 'Arial Rounded MT Bold', serif;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    transform: scaleY(1.05);
                    display: inline-flex;
                    gap: 0px;
                    position: relative;
                }
                @keyframes logoGlow {
                    0%, 100% { filter: drop-shadow(0 0 2px rgba(120,200,200,0)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                    50% { filter: drop-shadow(0 0 8px rgba(120,200,200,0.3)) drop-shadow(0 0 20px rgba(120,200,200,0.1)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                }
                .retro-logo-soprano {
                    background: linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(0,0,0,0.4));
                }
                .retro-logo-chat {
                    background: linear-gradient(180deg, #b8f0f0 0%, #5ec8c8 30%, #3a9e9e 65%, #4db0a8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(20,80,70,0.5));
                    animation: logoGlow 3s ease-in-out infinite;
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
                    width: 99%;
                    margin: 0 auto;
                    /* Bombeli metalik gradient — barrel efekti */
                    background: linear-gradient(180deg,
                        ${branding?.siteConfig?.homepage?.headerGradient1 || '#5a6070'} 0%,
                        ${branding?.siteConfig?.homepage?.headerGradient2 || '#3d4250'} 15%,
                        ${branding?.siteConfig?.homepage?.headerGradient3 || '#1e222e'} 50%,
                        ${branding?.siteConfig?.homepage?.headerGradient4 || '#282c3a'} 75%,
                        ${branding?.siteConfig?.homepage?.headerGradient5 || '#3a3f50'} 100%);
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

                /* ═══ Demo Giriş/Çıkış Animasyonları ═══ */
                @keyframes demoSlideDown {
                    0% { transform: translateY(-80px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes demoScaleIn {
                    0% { transform: scale(0.92) translateY(20px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes demoSlideUp {
                    0% { transform: translateY(30px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes demoGrowDown {
                    0% { transform: scaleY(0); opacity: 0; max-height: 0; }
                    40% { opacity: 1; }
                    100% { transform: scaleY(1); opacity: 1; max-height: 600px; }
                }
                @keyframes liveCollapseContent {
                    0% { transform: scaleY(1) translateY(0); opacity: 1; }
                    100% { transform: scaleY(0) translateY(-40px); opacity: 0; }
                }
                @keyframes liveExpandContent {
                    0% { transform: scaleY(0) translateY(-40px); opacity: 0; }
                    100% { transform: scaleY(1) translateY(0); opacity: 1; }
                }
                /* Mikrofon ses dalgası animasyonu */
                @keyframes micSoundWave {
                    0% { transform: scale(0.7); opacity: 0.7; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes micSoundWave2 {
                    0% { transform: scale(0.7); opacity: 0.5; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes micSoundWave3 {
                    0% { transform: scale(0.7); opacity: 0.35; }
                    100% { transform: scale(2.6); opacity: 0; }
                }
                @keyframes micGlow {
                    0%, 100% { filter: drop-shadow(0 0 3px rgba(251,191,36,0.4)); }
                    50% { filter: drop-shadow(0 0 8px rgba(251,191,36,0.7)) drop-shadow(0 0 14px rgba(251,191,36,0.3)); }
                }
                /* Giriş class'ları */
                .demo-enter-left   { animation: demoGrowDown 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 0.1s both; will-change: transform, opacity; transform-origin: top center; }
                .demo-enter-right  { animation: demoSlideDown 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) 0.15s both; will-change: transform, opacity; }
                .demo-enter-chat   { animation: demoScaleIn  0.5s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s both; will-change: transform, opacity; }
                .demo-enter-rooms  { animation: demoSlideUp  0.4s cubic-bezier(0.22, 0.61, 0.36, 1) 0.35s both; will-change: transform, opacity; }
                .demo-enter-input  { animation: demoSlideUp  0.4s cubic-bezier(0.22, 0.61, 0.36, 1) 0.4s both; will-change: transform, opacity; }
                /* Çıkış class'ları — ters animasyon */
                .demo-exit-left    { animation: demoGrowDown 0.35s cubic-bezier(0.55, 0.06, 0.68, 0.19) 0s reverse both; will-change: transform, opacity; transform-origin: top center; }
                .demo-exit-right   { animation: demoSlideDown 0.4s cubic-bezier(0.55, 0.06, 0.68, 0.19) 0s reverse both; will-change: transform, opacity; }
                .demo-exit-chat    { animation: demoScaleIn  0.35s cubic-bezier(0.55, 0.06, 0.68, 0.19) 0s reverse both; will-change: transform, opacity; }
                .demo-exit-rooms   { animation: demoSlideUp  0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19) 0s reverse both; will-change: transform, opacity; }
                .demo-exit-input   { animation: demoSlideUp  0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19) 0s reverse both; will-change: transform, opacity; }

                .glossy-panel {
                    background:
                        radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                        linear-gradient(180deg, ${branding?.siteConfig?.homepage?.loginBg || 'rgba(30, 41, 59, 0.85)'} 0%, rgba(15, 23, 42, 0.55) 100%);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid ${branding?.siteConfig?.homepage?.loginCardBorder || 'rgba(255,255,255,0.15)'};
                    border-top: 1px solid rgba(255,255,255,0.35);
                    border-left: 1px solid rgba(255,255,255,0.2);
                    box-shadow:
                        0 8px 32px rgba(0,0,0,0.4),
                        0 2px 8px rgba(0,0,0,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.06);
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
                .input-inset:focus { outline: none; background: rgba(0,0,0,0.3); border-color: ${branding?.siteConfig?.homepage?.loginAccentColor || '#38bdf8'}; box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px ${branding?.siteConfig?.homepage?.loginAccentColor || 'rgba(56, 189, 248, 0.2)'}33; }
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
                @keyframes hpBarBounce {
                    0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
                    50% { transform: scaleY(1); opacity: 0.9; }
                }
                @keyframes hpHandPulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
                @keyframes hpSpeakerGlow {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.08); }
                }
                @keyframes hpModPulse {
                    0%, 100% { opacity: 0.5; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                @keyframes hpBanScreenPulse {
                    0%, 100% { opacity: 0.7; transform: scale(0.95); }
                    50% { opacity: 1; transform: scale(1.05); }
                }

                /* ═══ WEBCAM ANİMASYONLARI ═══ */
                .hp-webcam-container { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .hp-webcam-container:hover { transform: scale(1.08) rotate(-3deg); z-index: 3 !important; }
                .hp-webcam-head {
                    transform-origin: 200px 260px;
                    animation: hpCamScan 10s infinite ease-in-out;
                }
                @keyframes hpCamScan {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(-6deg); }
                    40% { transform: rotate(-6deg); }
                    60% { transform: rotate(6deg); }
                    80% { transform: rotate(6deg); }
                }
                .hp-webcam-led {
                    animation: hpLedPulse 2s infinite ease-in-out;
                }
                @keyframes hpLedPulse {
                    0%, 100% { opacity: 0.3; filter: drop-shadow(0px 0px 2px #00ffcc); }
                    50% { opacity: 1; filter: drop-shadow(0px 0px 8px #00ffcc); }
                }

                /* ═══ HOPARLÖR ANİMASYONLARI ═══ */
                .hp-speaker-container { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .hp-speaker-container:hover { transform: scale(1.08) rotate(3deg); }
                .hp-speaker-body { animation: hpThumpBody 1.2s infinite ease-in-out; }
                .hp-speaker-cone { animation: hpThumpCone 1.2s infinite ease-in-out; }
                .hp-speaker-cap { animation: hpThumpCap 1.2s infinite ease-in-out; }
                .hp-ground-shadow { animation: hpThumpShadow 1.2s infinite ease-in-out; transform-origin: 210px 285px; }

                @keyframes hpThumpBody {
                    0% { transform: scale(1) translateX(0); }
                    6% { transform: scale(1.02) translateX(1.5px); }
                    12% { transform: scale(0.99) translateX(-1px); }
                    18% { transform: scale(1) translateX(0.5px); }
                    35% { transform: scale(1) translateX(0); }
                    40% { transform: scale(1.01) translateX(1px); }
                    45% { transform: scale(0.995) translateX(-0.5px); }
                    52% { transform: scale(1.02) translateX(1.5px); }
                    58% { transform: scale(0.99) translateX(-1px); }
                    65%, 100% { transform: scale(1) translateX(0); }
                }
                @keyframes hpThumpCone {
                    0% { transform: translateX(0); }
                    6% { transform: translateX(5px); }
                    12% { transform: translateX(-2px); }
                    18% { transform: translateX(1px); }
                    35% { transform: translateX(0); }
                    40% { transform: translateX(2px); }
                    45% { transform: translateX(-1px); }
                    52% { transform: translateX(5px); }
                    58% { transform: translateX(-2px); }
                    65%, 100% { transform: translateX(0); }
                }
                @keyframes hpThumpCap {
                    0% { transform: translateX(0) scale(1); }
                    6% { transform: translateX(10px) scale(1.05); }
                    12% { transform: translateX(-3px) scale(0.98); }
                    18% { transform: translateX(2px) scale(1.01); }
                    35% { transform: translateX(0) scale(1); }
                    40% { transform: translateX(4px) scale(1.02); }
                    45% { transform: translateX(-1px) scale(0.99); }
                    52% { transform: translateX(10px) scale(1.05); }
                    58% { transform: translateX(-3px) scale(0.98); }
                    65%, 100% { transform: translateX(0) scale(1); }
                }
                @keyframes hpThumpShadow {
                    0% { transform: scale(1); opacity: 0.6; }
                    6% { transform: scale(1.08); opacity: 0.8; }
                    12% { transform: scale(0.95); opacity: 0.5; }
                    18% { transform: scale(1.02); opacity: 0.65; }
                    35% { transform: scale(1); opacity: 0.6; }
                    40% { transform: scale(1.04); opacity: 0.7; }
                    45% { transform: scale(0.97); opacity: 0.55; }
                    52% { transform: scale(1.08); opacity: 0.8; }
                    58% { transform: scale(0.95); opacity: 0.5; }
                    65%, 100% { transform: scale(1); opacity: 0.6; }
                }

                /* Ses Dalgası Yayılımı */
                .hp-wave {
                    fill: none;
                    stroke: #fca311;
                    stroke-linecap: round;
                    opacity: 0;
                    filter: drop-shadow(0px 0px 8px rgba(252, 163, 17, 0.6));
                }
                .hp-wave-1 { stroke-width: 6; animation: hpSoundRipples 1.2s infinite ease-in-out; animation-delay: 0s; }
                .hp-wave-2 { stroke-width: 8; animation: hpSoundRipples 1.2s infinite ease-in-out; animation-delay: 0.08s; }
                .hp-wave-3 { stroke-width: 10; animation: hpSoundRipples 1.2s infinite ease-in-out; animation-delay: 0.16s; }

                @keyframes hpSoundRipples {
                    0% { opacity: 0; transform: translateX(-15px) scale(0.9); }
                    3% { opacity: 1; }
                    25% { opacity: 0; transform: translateX(45px) scale(1.3); }
                    52% { opacity: 0; transform: translateX(-15px) scale(0.9); }
                    55% { opacity: 1; }
                    77% { opacity: 0; transform: translateX(45px) scale(1.3); }
                    100% { opacity: 0; transform: translateX(45px) scale(1.3); }
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
                    <div className="header-logo" style={demoMode ? { transform: 'scale(0.65)', transformOrigin: 'left center' } : {}}>
                        <h1 className="retro-logo-text"><span className="retro-logo-soprano">{(branding?.siteConfig?.siteTitle || 'SopranoChat').replace(/Chat$/i, '') || 'Soprano'}</span><span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}><span className="retro-logo-chat">{(branding?.siteConfig?.siteTitle || 'SopranoChat').match(/Chat$/i) ? 'Chat' : ''}</span><span style={{ fontSize: 11, fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', sans-serif", fontStyle: 'normal', letterSpacing: '1.5px', lineHeight: 1, marginTop: -2, background: 'linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>{branding?.siteConfig?.siteSlogan || 'Senin Sesin'}</span></span></h1>
                    </div>

                    <nav className="header-nav">
                        {demoMode ? (
                            <>
                                {/* Sol: Home butonu — demo'dan çıkış */}
                                <button
                                    className="nav-link"
                                    onClick={() => {
                                        if (roomExitUrl) {
                                            // Room page — URL'ye yönlendir
                                            window.location.href = roomExitUrl;
                                            return;
                                        }
                                        // Önce roomsMode çıkış animasyonu, sonra geri dön
                                        setDemoEntrance('out');
                                        setTimeout(() => {
                                            setRoomsMode(false);
                                            setDemoEntrance('idle');
                                            setActiveSection('home');
                                            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                                        }, 500);
                                    }}
                                    style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, animation: 'contentFadeIn 0.4s ease 0.1s both', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontSize: 11 }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                    HOME
                                </button>
                                <span className="nav-dot" />
                                {/* Asılı Oda Tab'ları */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 0, alignSelf: 'stretch', justifyContent: 'center', flex: 1, marginRight: 200 }}>
                                    {(demoRoomRef.current?.state?.rooms && demoRoomRef.current.state.rooms.length > 0
                                        ? demoRoomRef.current.state.rooms.filter((r: any) => !r.name.toLowerCase().includes('toplantı') && !r.name.toLowerCase().includes('toplanti')).map((r: any) => ({ name: r.name, slug: r.slug }))
                                        : cachedRooms.length > 0 ? cachedRooms.filter((r: any) => !r.name.toLowerCase().includes('toplantı') && !r.name.toLowerCase().includes('toplanti')) : []
                                    ).map((tab: { name: string; slug: string }, i: number) => {
                                        const isActive = tab.slug === demoSlug;
                                        return (
                                            <div key={tab.slug} style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                position: 'relative',
                                                animation: `contentFadeIn 0.4s ease ${0.15 + i * 0.1}s both`,
                                                marginTop: 8,
                                                transform: isActive ? 'translateY(4px) translateZ(0)' : 'translateY(0) translateZ(0)',
                                                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                                            }}>
                                                {/* Tab Kartı */}
                                                <button
                                                    onClick={() => handleRoomSwitch(tab.slug)}
                                                    style={{
                                                        padding: '6px 16px',
                                                        fontSize: 10, fontWeight: 700,
                                                        textTransform: 'uppercase' as const,
                                                        letterSpacing: '0.12em',
                                                        color: isActive ? '#fbbf24' : '#94a3b8',
                                                        background: isActive
                                                            ? 'linear-gradient(180deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 100%)'
                                                            : 'linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.02) 100%)',
                                                        border: 'none',
                                                        borderLeft: isActive ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(148,163,184,0.12)',
                                                        borderRight: isActive ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(148,163,184,0.12)',
                                                        borderBottom: isActive ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(148,163,184,0.12)',
                                                        borderRadius: '0 0 8px 8px',
                                                        cursor: 'pointer',
                                                        transition: 'color 0.3s, background 0.3s, border-color 0.3s, box-shadow 0.3s',
                                                        textShadow: isActive ? '0 0 8px rgba(251,191,36,0.4)' : 'none',
                                                        boxShadow: isActive
                                                            ? '0 4px 12px rgba(251,191,36,0.15), inset 0 -1px 0 rgba(251,191,36,0.1)'
                                                            : '0 2px 6px rgba(0,0,0,0.15)',
                                                        whiteSpace: 'nowrap' as const,
                                                    }}
                                                >
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <span style={{
                                                            width: 4, height: 4, borderRadius: '50%',
                                                            background: isActive ? '#fbbf24' : '#475569',
                                                            boxShadow: isActive ? '0 0 4px rgba(251,191,36,0.5)' : 'none',
                                                            transition: 'background 0.3s, box-shadow 0.3s',
                                                        }} />
                                                        {tab.name}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <span className="nav-dot" />
                                {/* Kontrol Butonları */}
                                <button
                                    onClick={() => setLampsOff(p => !p)}
                                    title={lampsOff ? 'Lambaları Aç' : 'Lambaları Kapat'}
                                    className="nav-link"
                                    style={{
                                        color: lampsOff ? '#475569' : '#fbbf24',
                                        transition: 'all 0.3s', display: 'flex', alignItems: 'center', padding: 4,
                                        animation: 'contentFadeIn 0.4s ease 0.5s both',
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18h6" /><path d="M10 22h4" />
                                        <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        if (!liveHidden) { setLiveHidden(true); setTimeout(() => setLiveCollapsed(true), 900); }
                                        else { setLiveCollapsed(false); setTimeout(() => setLiveHidden(false), 500); }
                                    }}
                                    title={liveHidden ? 'Canlı Yayını Göster' : 'Canlı Yayını Gizle'}
                                    className="nav-link"
                                    style={{
                                        color: (liveHidden || liveCollapsed) ? '#475569' : '#94a3b8',
                                        transition: 'all 0.3s', display: 'flex', alignItems: 'center', padding: 4,
                                        animation: 'contentFadeIn 0.4s ease 0.6s both',
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
                            </>
                        ) : (
                            (branding?.siteConfig?.homepage?.navItems || [
                                { label: 'HOME', section: 'home', visible: true },
                                { label: 'ODALAR', section: '_odalar', visible: true },
                                { label: 'REHBER', section: 'rehber', visible: true },
                                { label: 'FİYATLAR', section: 'fiyatlar', visible: true },
                                { label: 'REFERANSLAR', section: 'referanslar', visible: true },
                                { label: 'İLETİŞİM', section: 'iletisim', visible: true },
                            ]).filter((item: any) => item.visible !== false).map((item: any, i: number, arr: any[]) => (
                                <React.Fragment key={i}>
                                    <button
                                        className={`nav-link nav-link-${i}`}
                                        onClick={() => {
                                            // ODALAR — doğrudan chat room'a yönlendir
                                            if (item.section === '_odalar') {
                                                if (!user) {
                                                    setShowLoginToast(true);
                                                    setTimeout(() => setShowLoginToast(false), 4000);
                                                    return;
                                                }
                                                const slug = dbRooms.length > 0 ? dbRooms[0].slug : 'genel-sohbet';
                                                router.push(`/room/${slug}`);
                                                return;
                                            }
                                            if (roomsMode) {
                                                if (roomExitUrl) {
                                                    window.location.href = roomExitUrl;
                                                    return;
                                                }
                                                // Çıkış animasyonu
                                                setDemoEntrance('out');
                                                setTimeout(() => {
                                                    setRoomsMode(false);
                                                    setDemoEntrance('idle');
                                                }, 500);
                                                return;
                                            }
                                            setActiveSection(item.section);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        style={{
                                            color: activeSection === item.section ? (branding?.siteConfig?.homepage?.loginAccentColor || '#38bdf8') : undefined,
                                            textShadow: activeSection === item.section ? `0 0 10px ${branding?.siteConfig?.homepage?.loginAccentColor || 'rgba(56,189,248,0.4)'}66` : undefined,
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
                    opacity: (demoPhase === 'cards-out' || demoPhase === 'bar-up' || demoPhase === 'bar-down' || demoPhase === 'lamp-center' || demoPhase === 'active' || demoPhase === 'exit-lamp' || demoPhase === 'exit-bar-up' || demoPhase === 'exit-bar-down') ? 0 : 1,
                    filter: 'blur(0px)',
                    pointerEvents: demoPhase !== 'idle' && demoPhase !== 'exit-cards-in' ? 'none' : 'auto',
                }}>


                    {activeSection !== 'scene' && (<div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: roomsMode ? 16 : 32, flexWrap: roomsMode ? 'nowrap' as const : 'wrap', alignItems: roomsMode ? 'stretch' : 'flex-start' }}>

                            {/* SOL ALAN */}
                            <div style={{ flex: '1 1 60%', minWidth: roomsMode ? 280 : 400, display: 'flex', flexDirection: 'column', gap: roomsMode ? 16 : 32, order: 2, transition: roomsMode ? 'flex 0.5s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
                                {(activeSection === 'home' || activeSection === 'odalar') && (
                                    <div key={'home-content'} style={roomsMode ? { display: 'flex', flexDirection: 'column' as const, flex: 1, gap: 12, minHeight: 0 } : { display: 'contents' }}>

                                        {/* Karşılama Kartı + Tablo Lambası */}
                                        <div style={{ position: 'relative', ...(roomsMode ? { display: 'flex', flexDirection: 'column' as const } : {}) }}>
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


                                            <div className={`glossy-panel`} style={{ padding: roomsMode ? '4px 16px' : '40px', position: 'relative', overflow: roomsMode ? 'visible' : 'hidden', animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both'), transformOrigin: 'top center', ...(roomsMode ? { flex: 1, display: 'flex', flexDirection: 'column' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' } : {}) }}>
                                                {/* Metalik köşe parıltıları */}
                                                {!roomsMode && (<>
                                                    <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, background: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.35) 0%, rgba(200,215,240,0.18) 25%, rgba(160,180,220,0.08) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                    <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25) 0%, rgba(200,215,240,0.12) 25%, rgba(160,180,220,0.05) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 100, height: 100, background: 'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.20) 0%, rgba(200,215,240,0.10) 25%, rgba(160,180,220,0.04) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 100, height: 100, background: 'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.18) 0%, rgba(200,215,240,0.08) 25%, rgba(160,180,220,0.03) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                </>)}
                                                {/* ── Raptiyeler (sadece roomsMode) ── */}
                                                {roomsMode && (<>
                                                    {/* ─── Sol Raptiye ─── */}
                                                    <div style={{ position: 'absolute', top: -10, left: 30, zIndex: 20, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                                                        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            {/* İğne gövdesi */}
                                                            <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftL)" strokeWidth="1.8" strokeLinecap="round" />
                                                            {/* Raptiye başı — yuvarlak */}
                                                            <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadL)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                            {/* 3D derinlik halkası */}
                                                            <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                            {/* Parlak yansıma */}
                                                            <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                            {/* Küçük parlama noktası */}
                                                            <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                            <defs>
                                                                <radialGradient id="pinHeadL" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#d45b5b" />
                                                                    <stop offset="50%" stopColor="#bf3a3a" />
                                                                    <stop offset="100%" stopColor="#9a2a2a" />
                                                                </radialGradient>
                                                                <linearGradient id="pinShaftL" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#b0b8c0" />
                                                                    <stop offset="50%" stopColor="#8a9298" />
                                                                    <stop offset="100%" stopColor="#606870" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    </div>

                                                    {/* ─── Orta Raptiye ─── */}
                                                    <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', zIndex: 20, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                                                        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftC)" strokeWidth="1.8" strokeLinecap="round" />
                                                            <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadC)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                            <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                            <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                            <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                            <defs>
                                                                <radialGradient id="pinHeadC" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#d45b5b" />
                                                                    <stop offset="50%" stopColor="#bf3a3a" />
                                                                    <stop offset="100%" stopColor="#9a2a2a" />
                                                                </radialGradient>
                                                                <linearGradient id="pinShaftC" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#b0b8c0" />
                                                                    <stop offset="50%" stopColor="#8a9298" />
                                                                    <stop offset="100%" stopColor="#606870" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    </div>

                                                    {/* ─── Sağ Raptiye ─── */}
                                                    <div style={{ position: 'absolute', top: -10, right: 30, zIndex: 20, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
                                                        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <line x1="10" y1="13" x2="10" y2="23" stroke="url(#pinShaftR)" strokeWidth="1.8" strokeLinecap="round" />
                                                            <circle cx="10" cy="8" r="7.5" fill="url(#pinHeadR)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                                                            <circle cx="10" cy="8" r="5.5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
                                                            <ellipse cx="7.5" cy="5.5" rx="3" ry="2.2" fill="rgba(255,255,255,0.35)" />
                                                            <circle cx="6.5" cy="4.5" r="1" fill="rgba(255,255,255,0.5)" />
                                                            <defs>
                                                                <radialGradient id="pinHeadR" cx="8" cy="6" r="8" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#d45b5b" />
                                                                    <stop offset="50%" stopColor="#bf3a3a" />
                                                                    <stop offset="100%" stopColor="#9a2a2a" />
                                                                </radialGradient>
                                                                <linearGradient id="pinShaftR" x1="10" y1="13" x2="10" y2="23" gradientUnits="userSpaceOnUse">
                                                                    <stop offset="0%" stopColor="#b0b8c0" />
                                                                    <stop offset="50%" stopColor="#8a9298" />
                                                                    <stop offset="100%" stopColor="#606870" />
                                                                </linearGradient>
                                                            </defs>
                                                        </svg>
                                                    </div>
                                                </>)}
                                                {/* Lavanta geçişli blur efekti */}
                                                {roomsMode && (<>
                                                    <div style={{ position: 'absolute', top: -20, right: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(147, 130, 220, 0.18) 0%, rgba(123, 159, 239, 0.08) 50%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
                                                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 160, height: 160, background: 'radial-gradient(circle, rgba(123, 159, 239, 0.12) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
                                                </>)}

                                                {/* Artık /room/[slug] premium temasına yönlendiriliyor */}
                                                {roomsMode && (
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                                            <div style={{ width: 32, height: 32, margin: '0 auto 8px', border: '2px solid rgba(148,163,184,0.3)', borderTop: '2px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                            Odaya yönlendiriliyorsunuz...
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ position: 'relative', zIndex: 10, ...(roomsMode ? { display: 'none' } : {}) }}>
                                                    {/* Orijinal içerik — Sol metin + Sağ CRT Monitör */}
                                                    <div style={{
                                                        display: 'flex', flexDirection: 'column' as const, gap: 16,
                                                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        opacity: showPackages ? 0 : 1,
                                                        filter: showPackages ? 'blur(8px)' : 'blur(0)',
                                                        transform: showPackages ? 'scale(0.97)' : 'scale(1)',
                                                        maxHeight: showPackages ? 0 : 2000,
                                                        overflow: showPackages ? 'hidden' : 'visible',
                                                        pointerEvents: showPackages ? 'none' : 'auto',
                                                    }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                                                            {/* ÜST: Başlık + Açıklama */}
                                                            <div style={{ textAlign: 'center' as const }}>
                                                                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                                    Kendi Dijital Sahneni Yarat
                                                                </h2>
                                                                <p style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, lineHeight: 1.8, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                                    <strong style={{ color: '#fff' }}>Kişisel sohbet odanızı satın alın</strong> ve tamamen sizin kurallarınızla yönetin.
                                                                    HD kalitesinde sesli ve görüntülü iletişim, şifreli giriş koruması, gelişmiş yönetici paneli ve
                                                                    sınırsız kişiselleştirme seçenekleriyle topluluğunuzu büyütün.
                                                                    Kurumsal düzeyde altyapı, bireysel kullanım kolaylığıyla buluşuyor.
                                                                </p>
                                                            </div>

                                                            {/* ALT: [Webcam] [Toasts] [Hoparlör] */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                                                                {/* SOL: Webcam */}
                                                                <div className="hp-webcam-container" style={{ width: 120, height: 120, flexShrink: 0, overflow: 'visible' }}>
                                                                    <svg viewBox="0 0 400 400" width="160" height="160" style={{ marginTop: -20, marginLeft: -20 }} xmlns="http://www.w3.org/2000/svg">
                                                                        <defs>
                                                                            <linearGradient id="hp-wc-bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                <stop offset="0%" stopColor="#4a4d54"/><stop offset="50%" stopColor="#1c1d21"/><stop offset="100%" stopColor="#0a0b0c"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-wc-rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                                <stop offset="0%" stopColor="#e0e3eb"/><stop offset="30%" stopColor="#7a7e85"/><stop offset="70%" stopColor="#2a2d35"/><stop offset="100%" stopColor="#0a0b0c"/>
                                                                            </linearGradient>
                                                                            <radialGradient id="hp-wc-lensGrad" cx="35%" cy="35%" r="65%">
                                                                                <stop offset="0%" stopColor="#2a75a3"/><stop offset="45%" stopColor="#0b1c2e"/><stop offset="100%" stopColor="#010305"/>
                                                                            </radialGradient>
                                                                            <radialGradient id="hp-wc-sensorGrad" cx="50%" cy="50%" r="50%">
                                                                                <stop offset="0%" stopColor="#1b2a38"/><stop offset="70%" stopColor="#040608"/><stop offset="100%" stopColor="#000"/>
                                                                            </radialGradient>
                                                                            <linearGradient id="hp-wc-glare" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                                <stop offset="0%" stopColor="#fff" stopOpacity="0.8"/><stop offset="40%" stopColor="#fff" stopOpacity="0.1"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/>
                                                                            </linearGradient>
                                                                            <filter id="hp-wc-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="15" result="blur"/></filter>
                                                                            <pattern id="hp-micPat" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.5" fill="#000" opacity="0.7"/></pattern>
                                                                        </defs>
                                                                        <ellipse cx="200" cy="360" rx="90" ry="16" fill="#000" filter="url(#hp-wc-shadow)" opacity="0.4"/>
                                                                        <g>
                                                                            <ellipse cx="200" cy="350" rx="70" ry="18" fill="url(#hp-wc-rimGrad)"/>
                                                                            <ellipse cx="200" cy="344" rx="64" ry="15" fill="url(#hp-wc-bodyGrad)"/>
                                                                            <path d="M 185 260 L 215 260 L 225 344 L 175 344 Z" fill="url(#hp-wc-rimGrad)"/>
                                                                            <ellipse cx="200" cy="260" rx="20" ry="14" fill="#0a0b0c"/>
                                                                            <ellipse cx="200" cy="260" rx="12" ry="8" fill="url(#hp-wc-rimGrad)"/>
                                                                            <g className="hp-webcam-head">
                                                                                <rect x="55" y="115" width="290" height="100" rx="50" ry="50" fill="url(#hp-wc-rimGrad)"/>
                                                                                <rect x="50" y="120" width="300" height="110" rx="55" ry="55" fill="url(#hp-wc-bodyGrad)" stroke="#4a4d54" strokeWidth="2"/>
                                                                                <rect x="65" y="130" width="270" height="90" rx="45" ry="45" fill="#0c0d10" stroke="#1c1d21" strokeWidth="1.5"/>
                                                                                <rect x="85" y="155" width="40" height="40" rx="20" ry="20" fill="#15161a"/>
                                                                                <rect x="85" y="155" width="40" height="40" rx="20" ry="20" fill="url(#hp-micPat)"/>
                                                                                <rect x="275" y="155" width="40" height="40" rx="20" ry="20" fill="#15161a"/>
                                                                                <rect x="275" y="155" width="40" height="40" rx="20" ry="20" fill="url(#hp-micPat)"/>
                                                                                <circle cx="200" cy="175" r="50" fill="url(#hp-wc-rimGrad)"/>
                                                                                <circle cx="200" cy="175" r="44" fill="#0a0b0c"/>
                                                                                <circle cx="200" cy="175" r="38" fill="url(#hp-wc-lensGrad)"/>
                                                                                <circle cx="200" cy="175" r="24" fill="none" stroke="#2a4b6c" strokeWidth="2" opacity="0.6"/>
                                                                                <circle cx="200" cy="175" r="16" fill="url(#hp-wc-sensorGrad)"/>
                                                                                <circle cx="200" cy="175" r="6" fill="#000"/>
                                                                                <ellipse cx="180" cy="148" rx="12" ry="26" fill="url(#hp-wc-glare)" transform="rotate(-35 180 148)"/>
                                                                                <ellipse cx="172" cy="158" rx="4" ry="10" fill="#fff" opacity="0.8" transform="rotate(-45 172 158)"/>
                                                                                <circle className="hp-webcam-led" cx="145" cy="175" r="6" fill="#00ffcc"/>
                                                                                <circle cx="145" cy="175" r="6" fill="none" stroke="#000" strokeWidth="1.5" opacity="0.5"/>
                                                                                <rect x="180" y="116" width="40" height="8" rx="4" ry="4" fill="#0a0b0c"/>
                                                                                <rect x="185" y="117" width="15" height="5" rx="2.5" ry="2.5" fill="url(#hp-wc-rimGrad)"/>
                                                                            </g>
                                                                        </g>
                                                                    </svg>
                                                                </div>

                                                                {/* ORTA: Feature Toasts 2x2 */}
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

                                                                {/* SAĞ: Hoparlör */}
                                                                <div className="hp-speaker-container" style={{ width: 140, height: 140, flexShrink: 0, overflow: 'visible' }}>
                                                                    <svg viewBox="0 0 400 400" width="240" height="240" style={{ marginTop: -50, marginLeft: -50 }} xmlns="http://www.w3.org/2000/svg">
                                                                        <defs>
                                                                            <filter id="hp-shadowHeavy" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="22" result="blur"/></filter>
                                                                            <filter id="hp-shadowLight" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur"/></filter>
                                                                            <linearGradient id="hp-glareGrad" x1="85%" y1="0%" x2="15%" y2="100%">
                                                                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/><stop offset="12%" stopColor="#ffffff" stopOpacity="0.95"/><stop offset="25%" stopColor="#ffffff" stopOpacity="0"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-magnetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                <stop offset="0%" stopColor="#8b93a0"/><stop offset="50%" stopColor="#545b66"/><stop offset="100%" stopColor="#2f343d"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                <stop offset="0%" stopColor="#d0d5e0"/><stop offset="40%" stopColor="#9097a8"/><stop offset="100%" stopColor="#4f5563"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-rimOuter" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                <stop offset="0%" stopColor="#e6eaf2"/><stop offset="60%" stopColor="#868e9e"/><stop offset="85%" stopColor="#4b5261"/><stop offset="100%" stopColor="#2a2e38"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-rimFace" x1="85%" y1="0%" x2="15%" y2="100%">
                                                                                <stop offset="0%" stopColor="#a9b0c2"/><stop offset="12%" stopColor="#ffffff"/><stop offset="25%" stopColor="#7b8396"/><stop offset="60%" stopColor="#464c59"/><stop offset="85%" stopColor="#1d2129"/><stop offset="100%" stopColor="#666e80"/>
                                                                            </linearGradient>
                                                                            <linearGradient id="hp-whiteRing" x1="85%" y1="0%" x2="15%" y2="100%">
                                                                                <stop offset="0%" stopColor="#ffffff"/><stop offset="15%" stopColor="#ffffff"/><stop offset="35%" stopColor="#d4d9e3"/><stop offset="70%" stopColor="#8a92a3"/><stop offset="100%" stopColor="#4a4f5c"/>
                                                                            </linearGradient>
                                                                            <radialGradient id="hp-coneGrad" cx="60%" cy="40%" r="70%" fx="70%" fy="30%">
                                                                                <stop offset="0%" stopColor="#3a4152"/><stop offset="45%" stopColor="#9aa3b5"/><stop offset="80%" stopColor="#dce1eb"/><stop offset="100%" stopColor="#8a93a6"/>
                                                                            </radialGradient>
                                                                            <linearGradient id="hp-tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                                <stop offset="0%" stopColor="#aeb5c4"/><stop offset="50%" stopColor="#686e7d"/><stop offset="100%" stopColor="#292d36"/>
                                                                            </linearGradient>
                                                                            <radialGradient id="hp-capGrad" cx="45%" cy="45%" r="55%" fx="35%" fy="35%">
                                                                                <stop offset="0%" stopColor="#ffffff"/><stop offset="15%" stopColor="#e0e5f0"/><stop offset="45%" stopColor="#8a92a3"/><stop offset="80%" stopColor="#3f4554"/><stop offset="100%" stopColor="#1a1e26"/>
                                                                            </radialGradient>
                                                                        </defs>
                                                                        <g className="hp-ground-shadow">
                                                                            <ellipse cx="210" cy="285" rx="90" ry="18" fill="#000" filter="url(#hp-shadowHeavy)" opacity="0.5"/>
                                                                            <ellipse cx="210" cy="285" rx="50" ry="8" fill="#000" filter="url(#hp-shadowLight)" opacity="0.7"/>
                                                                        </g>
                                                                        <g transform="translate(180, 200) scale(-1, 1) rotate(-32)">
                                                                            <g className="hp-speaker-body">
                                                                                <ellipse cx="-80" cy="0" rx="12" ry="30" fill="url(#hp-magnetGrad)"/>
                                                                                <path d="M -80 -30 L -55 -30 A 12 30 0 0 1 -55 30 L -80 30 Z" fill="url(#hp-magnetGrad)"/>
                                                                                <path d="M -70 -30 L -60 -30 A 12 30 0 0 1 -60 30 L -70 30 Z" fill="#1f2229"/>
                                                                                <path d="M -55 -35 L -15 -80 A 30 80 0 0 1 -15 80 L -55 35 Z" fill="url(#hp-bodyGrad)"/>
                                                                                <path d="M -15 -80 L 0 -85 A 32 85 0 0 1 0 85 L -15 80 Z" fill="url(#hp-rimOuter)"/>
                                                                                <path d="M -10 -81.5 L -5 -83 A 32 85 0 0 1 -5 83 L -10 81.5 Z" fill="#1a1c23" opacity="0.8"/>
                                                                                <ellipse cx="0" cy="0" rx="32" ry="85" fill="url(#hp-rimFace)"/>
                                                                                <ellipse cx="0" cy="0" rx="31" ry="83.5" fill="none" stroke="url(#hp-glareGrad)" strokeWidth="2"/>
                                                                                <ellipse cx="1" cy="0" rx="29.5" ry="78.5" fill="#14161c"/>
                                                                                <ellipse cx="2" cy="0" rx="28" ry="76" fill="url(#hp-whiteRing)"/>
                                                                                <ellipse cx="2.5" cy="0" rx="26" ry="72" fill="none" stroke="url(#hp-glareGrad)" strokeWidth="1.5"/>
                                                                                <ellipse cx="3" cy="0" rx="25" ry="70" fill="none" stroke="#2a2e38" strokeWidth="1" opacity="0.8"/>
                                                                                <path d="M 3 -70 L 8 -65 A 22 65 0 0 1 8 65 L 3 70 Z" fill="#14161c" opacity="0.9"/>
                                                                                <g className="hp-speaker-cone">
                                                                                    <ellipse cx="8" cy="0" rx="22" ry="65" fill="url(#hp-coneGrad)"/>
                                                                                    <ellipse cx="8" cy="0" rx="22" ry="65" fill="none" stroke="#1c1f26" strokeWidth="2" opacity="0.85"/>
                                                                                </g>
                                                                                <g className="hp-speaker-cap">
                                                                                    <path d="M 6 -24 L 14 -32 A 12 32 0 0 1 14 32 L 6 24 Z" fill="url(#hp-tubeGrad)"/>
                                                                                    <ellipse cx="13" cy="0" rx="12" ry="32" fill="none" stroke="#e6eaf2" strokeWidth="1.5"/>
                                                                                    <ellipse cx="14" cy="0" rx="11" ry="31" fill="#14161c"/>
                                                                                    <ellipse cx="18" cy="0" rx="16" ry="36" fill="url(#hp-capGrad)"/>
                                                                                </g>
                                                                            </g>
                                                                            <g>
                                                                                <path className="hp-wave hp-wave-1" d="M 45 -25 Q 65 0 45 25"/>
                                                                                <path className="hp-wave hp-wave-2" d="M 70 -45 Q 100 0 70 45"/>
                                                                                <path className="hp-wave hp-wave-3" d="M 95 -65 Q 135 0 95 65"/>
                                                                            </g>
                                                                        </g>
                                                                    </svg>
                                                                </div>

                                                            </div>
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
                                                                    {(() => {
                                                                        const p = branding?.siteConfig?.pricing || {};
                                                                        return [
                                                                        { name: p.p1Name || 'Ses + Metin', price: p.p1Monthly || '200', priceNum: parseInt(String(p.p1Monthly || '200').replace(/[^0-9]/g, '')) || 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                                                        { name: p.p2Name || 'Kamera + Ses', price: p.p2Monthly || '400', priceNum: parseInt(String(p.p2Monthly || '400').replace(/[^0-9]/g, '')) || 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                                                        { name: p.p3Name || 'White Label', price: p.p3Monthly || '2.990', priceNum: parseInt(String(p.p3Monthly || '2990').replace(/[^0-9]/g, '')) || 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                                                    ];
                                                                    })().map((plan, i) => (
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

                                        {/* ═══ BAN OVERLAY — tam ekran ban + kalan süre geri sayımı ═══ */}
                                        {roomsMode && demoRoomReady && demoRoomRef.current?.state?.banInfo?.banLevel === 'hard' && (() => {
                                            const banInfo = demoRoomRef.current.state.banInfo;
                                            const expiresAt = banInfo.expiresAt ? new Date(banInfo.expiresAt).getTime() : null;
                                            const now = Date.now();
                                            let remainingText = 'SÜRESİZ';
                                            if (expiresAt) {
                                                const diff = expiresAt - now;
                                                if (diff > 0) {
                                                    const days = Math.floor(diff / 86400000);
                                                    const hours = Math.floor((diff % 86400000) / 3600000);
                                                    const mins = Math.floor((diff % 3600000) / 60000);
                                                    const parts: string[] = [];
                                                    if (days > 0) parts.push(`${days} gün`);
                                                    if (hours > 0) parts.push(`${hours} saat`);
                                                    if (mins > 0) parts.push(`${mins} dakika`);
                                                    remainingText = parts.join(' ') || '< 1 dakika';
                                                } else {
                                                    remainingText = 'Süre doldu';
                                                }
                                            }
                                            return (
                                                <div style={{
                                                    position: 'fixed', inset: 0, zIndex: 9999,
                                                    background: 'linear-gradient(135deg, #1a0000 0%, #0d0d0d 50%, #1a0000 100%)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    gap: 16,
                                                }}>
                                                    <span style={{ fontSize: 96, animation: 'hpBanScreenPulse 1s ease-in-out infinite', filter: 'drop-shadow(0 0 40px rgba(220,38,38,0.8))' }}>⛔</span>
                                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', textAlign: 'center', textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>YASAKLANDINIZ</div>
                                                    <div style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', maxWidth: 400, marginTop: 4 }}>
                                                        {banInfo.reason || 'Bu odaya erişiminiz yasaklanmıştır.'}
                                                    </div>
                                                    <div style={{
                                                        marginTop: 16, padding: '16px 32px',
                                                        background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                                                        borderRadius: 12, textAlign: 'center',
                                                    }}>
                                                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>KALAN SÜRE</div>
                                                        <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
                                                            {remainingText}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => { window.location.href = '/'; }}
                                                        style={{
                                                            marginTop: 16, padding: '10px 28px',
                                                            background: '#333', color: '#fff', border: '1px solid #555',
                                                            borderRadius: 8, cursor: 'pointer', fontSize: 14,
                                                        }}
                                                    >
                                                        Ana Sayfaya Dön
                                                    </button>
                                                </div>
                                            );
                                        })()}

                                        {/* roomsMode: Gerçek BottomToolbar — ayrı glossy-panel kart */}
                                        {roomsMode && demoRoomReady && demoRoomRef.current && (
                                            <div className={`glossy-panel demo-chatroom-override`} style={{
                                                padding: '16px 20px', marginTop: -2, position: 'relative', zIndex: 6,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
                                            }}>
                                                <BottomToolbar
                                                    onSendMessage={demoRoomRef.current.actions.sendMessage}
                                                    onRequestMic={demoRoomRef.current.actions.requestMic}
                                                    onReleaseMic={demoRoomRef.current.actions.releaseMic}
                                                    onJoinQueue={demoRoomRef.current.actions.joinQueue}
                                                    onLeaveQueue={demoRoomRef.current.actions.leaveQueue}
                                                    onToggleCamera={demoRoomRef.current.actions.toggleCamera}
                                                    onLeaveRoom={() => {
                                                        demoRoomRef.current?.actions?.leaveRoom?.();
                                                        if (roomExitUrl) {
                                                            window.location.href = roomExitUrl;
                                                        }
                                                    }}
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
                                                    banInfo={demoRoomRef.current.state.banInfo}
                                                    onVolumeChange={demoRoomRef.current.actions.setRemoteVolume}
                                                    systemSettings={demoRoomRef.current.state.systemSettings}
                                                />
                                            </div>
                                        )}

                                        {/* Müşteri Platformları / Chat Toolbar */}
                                        <div className="glossy-panel content-fade content-fade-2" style={{ padding: roomsMode ? '16px 20px' : '24px 32px', minHeight: roomsMode ? undefined : 180, position: 'relative', ...(roomsMode ? { display: 'none' } : {}) }}>
                                            {/* Metalik köşe parıltıları */}
                                            {!roomsMode && (<>
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: 120, height: 120, background: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.35) 0%, rgba(200,215,240,0.18) 25%, rgba(160,180,220,0.08) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.25) 0%, rgba(200,215,240,0.12) 25%, rgba(160,180,220,0.05) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 100, height: 100, background: 'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.20) 0%, rgba(200,215,240,0.10) 25%, rgba(160,180,220,0.04) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 100, height: 100, background: 'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.18) 0%, rgba(200,215,240,0.08) 25%, rgba(160,180,220,0.03) 45%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
                                            </>)}
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
                                                            <button className="feature-toast" onClick={() => {
                                                                if (roomExitUrl) {
                                                                    window.location.href = roomExitUrl;
                                                                    return;
                                                                }
                                                                setDemoEntrance('out');
                                                                setTimeout(() => {
                                                                    setRoomsMode(false);
                                                                    setDemoEntrance('idle');
                                                                    setActiveSection('home');
                                                                    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                                                                }, 500);
                                                            }} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} title="Çıkış">
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
                                                            GÖNDER <SendHorizontal style={{ width: 13, height: 13, color: '#64748b', marginLeft: 2 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                            <Users style={{ width: 24, height: 24, color: '#38bdf8' }} /> Topluluk Platformları
                                                        </h3>
                                                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>SopranoChat altyapısıyla çalışan sohbet odalarına katılanlar.</p>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {sopranoChatCustomers.length === 0 ? (
                                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: 500 }}>
                                                                Henüz topluluk platformu bulunmuyor.
                                                            </div>
                                                        ) : sopranoChatCustomers.map((p, i) => {
                                                            const colors = ['#fbbf24', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#fb923c'];
                                                            const emojis = ['🌍', '🎵', '💬', '🎮', '🌟', '🚀'];
                                                            const color = colors[i % colors.length];
                                                            const emoji = emojis[i % emojis.length];
                                                            return (
                                                            <div key={p.id} className="feature-toast" style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                padding: '14px 16px', borderRadius: 14,
                                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                                    {p.logoUrl ? (
                                                                        <img src={p.logoUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', border: `1px solid ${color}44` }} />
                                                                    ) : (
                                                                        <div style={{
                                                                            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                                                                            border: `1px solid ${color}44`, fontSize: 22,
                                                                        }}>{emoji}</div>
                                                                    )}
                                                                    <div>
                                                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{p.name}</div>
                                                                        {p.firstRoomName && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Oda: {p.firstRoomName}</div>}
                                                                        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users style={{ width: 12, height: 12 }} /> {p.onlineUsers}</span>
                                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Monitor style={{ width: 12, height: 12 }} /> {p.roomCount} oda</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button className="btn-3d btn-3d-blue" onClick={() => window.open(`/t/${p.slug}`, '_blank')} style={{
                                                                    padding: '6px 18px', fontSize: 11, fontWeight: 800, borderRadius: 10,
                                                                }}>Katıl</button>
                                                            </div>
                                                            );
                                                        })}
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
                                                <a href={`https://wa.me/${(branding?.siteConfig?.contact?.whatsapp || '905520363674').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
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
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{branding?.siteConfig?.contact?.whatsapp || '+90 552 036 3674'}</div>
                                                    </div>
                                                </a>
                                                <a href={`mailto:${branding?.siteConfig?.contact?.email || 'destek@sopranochat.com'}`} style={{
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
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{branding?.siteConfig?.contact?.email || 'destek@sopranochat.com'}</div>
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
                                                        <div style={{ fontSize: 9, color: '#94a3b8' }}>{branding?.siteConfig?.contact?.address || 'sopranochat.com'}</div>
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
                                            {supSuccess && <div style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>✅ Mesajınız başarıyla gönderildi!</div>}
                                            <button onClick={handleContactSubmit} disabled={supSending || !supName.trim() || !supEmail.trim() || !supMessage.trim()} className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: supSending ? 0.6 : 1 }}>
                                                {supSending ? 'Gönderiliyor...' : 'Mesaj Gönder'} <Send style={{ width: 14, height: 14 }} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* FİYATLAR SECTION */}
                                {activeSection === 'fiyatlar' && (branding?.siteConfig?.homepage?.showPackages !== false) && (
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
                                                {(() => {
                                                    const p = branding?.siteConfig?.pricing || {};
                                                    return [
                                                        { name: p.p1Name || 'Ses + Metin', price: p.p1Monthly || '200', priceNum: parseInt(String(p.p1Monthly || '200').replace(/[^0-9]/g, '')) || 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                                        { name: p.p2Name || 'Kamera + Ses', price: p.p2Monthly || '400', priceNum: parseInt(String(p.p2Monthly || '400').replace(/[^0-9]/g, '')) || 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                                        { name: p.p3Name || 'White Label', price: p.p3Monthly || '2.990', priceNum: parseInt(String(p.p3Monthly || '2990').replace(/[^0-9]/g, '')) || 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                                    ];
                                                })().map((plan, i) => (
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
                                {activeSection === 'rehber' && (branding?.siteConfig?.homepage?.showGuide !== false) && (
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
                                {activeSection === 'referanslar' && (branding?.siteConfig?.homepage?.showReferences !== false) && (
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
                                                {ownDomainCustomers.length === 0 ? (
                                                    <div style={{ gridColumn: '1 / -1', padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: 500, background: 'rgba(0,0,0,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        Henüz kendi domain'iyle hizmet alan referans müşterimiz bulunmuyor.
                                                    </div>
                                                ) : ownDomainCustomers.map((ref, i) => {
                                                    const colors = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#f472b6', '#fb923c'];
                                                    const color = colors[i % colors.length];
                                                    return (
                                                    <div key={ref.id} style={{
                                                        padding: '18px 16px', borderRadius: 12,
                                                        background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
                                                        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.3s',
                                                        cursor: ref.domain ? 'pointer' : 'default',
                                                    }} onClick={() => ref.domain && window.open(`https://${ref.domain}`, '_blank')}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            {ref.logoUrl ? (
                                                                <img src={ref.logoUrl} alt={ref.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: `1px solid ${color}25` }} />
                                                            ) : (
                                                                <div style={{
                                                                    width: 36, height: 36, borderRadius: 10,
                                                                    background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                                                                    border: `1px solid ${color}25`,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 18,
                                                                }}>🌐</div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{ref.name}</div>
                                                                <div style={{ fontSize: 10, color: color, fontWeight: 600 }}>{ref.domain || ref.slug}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                                                            <span>{ref.roomCount} oda</span>
                                                            <span>{ref.onlineUsers} aktif kullanıcı</span>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
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
                            <div key={'right-col'} style={{ width: 240, flex: '0 0 240px', minWidth: 220, maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 24, order: 1, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', ...(roomsMode ? { marginLeft: -24 } : {}) }}>
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

                                    <div style={{ position: 'relative', zIndex: 10, animation: roomsMode ? 'none' : (isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.0s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both'), transformOrigin: 'top center' }}>
                                        <div className="glossy-panel" style={{ padding: roomsMode ? '12px 14px' : '12px 14px', position: 'relative', zIndex: 10, transition: roomsMode ? 'none' : 'padding 1s ease, min-height 1s ease', display: 'flex', flexDirection: 'column', ...(roomsMode ? { minHeight: 780, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' } : { minHeight: 0 }), ...(!roomsMode && user ? { border: '1px solid rgba(56,189,248,0.4)', boxShadow: '0 50px 70px -20px rgba(0,0,0,0.8), 0 20px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 60px rgba(255,255,255,0.03), 0 0 15px rgba(56,189,248,0.15)' } : {}) }}>
                                            {/* Üst başlık */}
                                            <h3 style={{ fontSize: roomsMode ? 9 : 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: roomsMode ? 0 : 10, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)', transition: 'font-size 0.8s ease, margin-bottom 0.8s ease, max-height 0.8s ease, opacity 0.6s ease', overflow: 'hidden', maxHeight: roomsMode ? 0 : 30, opacity: roomsMode ? 0 : 1 }}>
                                                <User style={{ width: 18, height: 18, color: user ? '#fbbf24' : '#38bdf8' }} /> Hesap Paneli
                                            </h3>
                                            <div id="hesap-paneli" />

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
                                                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 320 }}>
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
                                                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap', padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
                                                                            background: guestGender === g ? (g === 'Erkek' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : g === 'Kadın' ? 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))' : 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(71,85,105,0.4))') : 'rgba(0,0,0,0.2)',
                                                                            color: guestGender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                            boxShadow: guestGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                                                        }}>{g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Cinsiyet seçimine göre avatarlar otomatik açılır */}
                                                            <div style={{
                                                                maxHeight: guestGender ? 300 : 0,
                                                                opacity: guestGender ? 1 : 0,
                                                                overflow: 'hidden',
                                                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                marginTop: guestGender ? 4 : 0,
                                                            }}>
                                                                <div key={guestGender} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, animation: 'avatarFadeIn 0.4s ease-out' }}>
                                                                    {[
                                                                        '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
                                                                        '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
                                                                        '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
                                                                    ].map((av) => (
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

                                                            {/* ─── Sosyal Giriş Ayırıcı (Misafir) ─── */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                                                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                                                                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, whiteSpace: 'nowrap' }}>veya</span>
                                                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                                                            </div>

                                                            {/* ─── Google & Facebook Butonları (Misafir) ─── */}
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <button type="button" onClick={() => { window.location.href = `${API_URL}/auth/google`; }}
                                                                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#e2e8f0', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                                                    Google
                                                                </button>
                                                                <button type="button" onClick={() => { window.location.href = `${API_URL}/auth/facebook`; }}
                                                                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(24,119,242,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#93c5fd', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(24,119,242,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(24,119,242,0.15)'; e.currentTarget.style.transform = 'none'; }}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                                                    Facebook
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 320 }}>
                                                            {/* Login / Register geçiş container */}
                                                            <div style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: showRegister ? 'translateX(-100%)' : 'translateX(0)', opacity: showRegister ? 0 : 1, maxHeight: showRegister ? 0 : 600, overflow: 'hidden' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Kullanıcı Adı veya E-posta</label>
                                                                        <input type="text" name="search" value={memberUsername} onChange={(e) => setMemberUsername(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="Üye adınız veya e-posta" autoComplete="one-time-code" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Şifre</label>
                                                                        <input type="password" name="one-time-code" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="••••••••" autoComplete="one-time-code" />
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

                                                                    {/* ─── Sosyal Giriş Ayırıcı ─── */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                                                                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                                                                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, whiteSpace: 'nowrap' }}>veya</span>
                                                                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
                                                                    </div>

                                                                    {/* ─── Google & Facebook Butonları ─── */}
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        <button type="button" onClick={() => { window.location.href = `${API_URL}/auth/google`; }}
                                                                            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#e2e8f0', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                                                            Google
                                                                        </button>
                                                                        <button type="button" onClick={() => { window.location.href = `${API_URL}/auth/facebook`; }}
                                                                            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(24,119,242,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#93c5fd', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(24,119,242,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(24,119,242,0.15)'; e.currentTarget.style.transform = 'none'; }}
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                                                            Facebook
                                                                        </button>
                                                                    </div>

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
                                                                        <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="ornek@mail.com" autoComplete="one-time-code" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre</label>
                                                                        <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="En az 6 karakter" autoComplete="one-time-code" name="reg-otp1" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre Tekrar</label>
                                                                        <input type="password" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Şifrenizi tekrarlayın" autoComplete="one-time-code" name="reg-otp2" />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            {(['Erkek', 'Kadın', 'Belirsiz'] as const).map(g => (
                                                                                <button key={g} type="button" onClick={() => setRegGender(g)} style={{
                                                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap', padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
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
                                                                    flex: 1, padding: '4px 0', fontSize: 8, fontWeight: 800, border: 'none', borderRadius: 6, cursor: 'pointer',
                                                                    textTransform: 'uppercase', letterSpacing: 0.5, transition: 'all 0.25s ease',
                                                                    background: profileTab === tab ? 'rgba(56,189,248,0.2)' : 'transparent',
                                                                    color: profileTab === tab ? '#7dd3fc' : 'rgba(255,255,255,0.4)',
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px'
                                                                }}><span>{icon}</span> <span>{tab === 'profil' ? 'Profil' : tab === 'ayarlar' ? 'Ayarlar' : 'Mesajlar'}</span></button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Profil Tab */}
                                                    {profileTab === 'profil' && !roomsMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                                                            {/* ★ Sosyal Login — Profil Kurulum Bildirimi */}
                                                            {showProfileSetup && (
                                                                <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '10px 12px', animation: 'fadeIn 0.4s ease' }}>
                                                                    <p style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', margin: 0, lineHeight: 1.5 }}>🎙️ Hoş geldin! Sohbete başlamadan önce cinsiyetini ve avatarını seç.</p>
                                                                </div>
                                                            )}

                                                            {/* Cinsiyet Seçimi */}
                                                            {user.isMember && (
                                                                <div>
                                                                    <label style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 5 }}>Cinsiyet</label>
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        {['Erkek', 'Kadın', 'Belirtme'].map(g => (
                                                                            <button key={g} type="button" onClick={() => handleProfileUpdate('gender', g)} style={{
                                                                                flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer',
                                                                                background: (user as any).gender === g ? (g === 'Erkek' ? 'rgba(56,189,248,0.25)' : g === 'Kadın' ? 'rgba(244,114,182,0.25)' : 'rgba(148,163,184,0.25)') : 'rgba(0,0,0,0.2)',
                                                                                color: (user as any).gender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                                transition: 'all 0.2s',
                                                                            }}>
                                                                                {g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

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
                                                                            {[
                                                                                '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
                                                                                '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
                                                                                '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
                                                                            ].map((av) => (
                                                                                <button key={av} type="button" onClick={() => { handleProfileUpdate('avatar', av); setShowAvatarPicker(false); if (showProfileSetup) setShowProfileSetup(false); }} style={{
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
                                                                // System room page'e yönlendir — dbRooms varsa ilk odayı kullan
                                                                const slug = dbRooms.length > 0 ? dbRooms[0].slug : 'genel-sohbet';
                                                                router.push(`/room/${slug}`);
                                                            }} className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }}>
                                                                Odaya Gir
                                                            </button>
                                                            <button onClick={handleLogout} className="btn-3d btn-3d-logout" style={{ width: '100%', padding: '10px 0', fontSize: 11 }}>
                                                                Çıkış Yap
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* roomsMode — Çevrimiçi Kullanıcılar sütunu veya AudioTest */}
                                                    {roomsMode && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 0, overflow: 'hidden' }}>
                                                            {audioTestOpen ? (
                                                                <AudioTestPanel onClose={() => setAudioTestOpen(false)} />
                                                            ) : (
                                                                <>
                                                                    {/* Başlık — scroll'dan bağımsız */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)', animation: 'pulse 2s ease-in-out infinite' }} />
                                                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Çevrimiçi</span>
                                                                        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginLeft: 'auto' }}>
                                                                            {demoRoomUsers.length || dbRooms.reduce((sum: number, r: any) => sum + (r.users || 0), 0)} kişi
                                                                        </span>
                                                                    </div>
                                                                    {/* Kullanıcı listesi — scroll yapan bölüm */}
                                                                    <div className="hover-scroll" onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); demoRoomRef.current?.handleEmptyAreaContextMenu?.(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto', maxHeight: 470, paddingTop: 4, overscrollBehavior: 'contain' }}>
                                                                        {/* Gerçek kullanıcı listesi */}
                                                                        {(() => {
                                                                            const roomUsers: any[] = demoRoomUsers;
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
                                                                                    case 'member': return '#ffffff';
                                                                                    default: return '#ffffff';
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
                                                                            const speaker = demoCurrentSpeaker;
                                                                            const demoQueue = demoRoomRef.current?.state?.queue || [];
                                                                            const sorted = [...roomUsers].sort((a, b) => {
                                                                                const isSpeakerA = speaker?.userId === a.userId;
                                                                                const isSpeakerB = speaker?.userId === b.userId;
                                                                                if (isSpeakerA && !isSpeakerB) return -1;
                                                                                if (!isSpeakerA && isSpeakerB) return 1;
                                                                                // Queue position
                                                                                const qiA = demoQueue.indexOf(a.userId || '');
                                                                                const qiB = demoQueue.indexOf(b.userId || '');
                                                                                if (qiA !== -1 && qiB === -1) return -1;
                                                                                if (qiA === -1 && qiB !== -1) return 1;
                                                                                if (qiA !== -1 && qiB !== -1) return qiA - qiB;
                                                                                const la = getRoleLevel(a.role);
                                                                                const lb = getRoleLevel(b.role);
                                                                                if (la !== lb) return lb - la;
                                                                                return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
                                                                            });
                                                                            // Gerçek zamanlı kullanıcılar (botlar kaldırıldı)
                                                                            if (sorted.length === 0) {
                                                                                // Mevcut kullanıcıyı göster
                                                                                return (
                                                                                    <div
                                                                                        onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); demoRoomRef.current?.handleUserContextMenu?.(e, { userId: (user as any).userId || '', displayName: (user as any).displayName || (user as any).username, role: (user as any).role, avatar: (user as any).avatar }); }}
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
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                                <span style={{ fontSize: 8, fontWeight: 600, color: '#38bdf8' }}>Siz</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Online dot — userStatus state ile senkron */}
                                                                                        <div style={{
                                                                                            width: 6, height: 6, borderRadius: '50%',
                                                                                            background: ({ online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa', invisible: '#64748b' } as Record<string, string>)[userStatus] || '#34d399',
                                                                                            boxShadow: `0 0 4px ${({ online: 'rgba(52,211,153,0.4)', busy: 'rgba(248,113,113,0.4)', brb: 'rgba(251,191,36,0.4)', away: 'rgba(148,163,184,0.4)', phone: 'rgba(167,139,250,0.4)', invisible: 'rgba(100,116,139,0.3)' } as Record<string, string>)[userStatus] || 'rgba(52,211,153,0.4)'}`,
                                                                                            flexShrink: 0,
                                                                                        }} />
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <>
                                                                                    {/* ★ Konuşmacı başlığı — speaker varsa görünür */}
                                                                                    {speaker && sorted.some((u: any) => speaker.userId === u.userId) && (
                                                                                        <div style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase', paddingBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                                            <span style={{ fontSize: 11 }}>🎤</span> Konuşmacı
                                                                                        </div>
                                                                                    )}
                                                                                    {sorted.map((u: any, idx: number) => {
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
                                                                                                    : isCurrentUser ? 'rgba(34,211,238,0.4)'
                                                                                                        : 'rgba(255,255,255,0.1)';
                                                                                        // Hiyerarşi bazlı kart stilleri
                                                                                        const cardBg = isCurrentUser ? 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(56,189,248,0.03) 50%, transparent 100%)'
                                                                                            : isSpeaking ? 'rgba(239,68,68,0.06)'
                                                                                                : role === 'godmaster' ? 'linear-gradient(135deg, rgba(217,70,239,0.08), transparent)'
                                                                                                    : role === 'owner' ? 'linear-gradient(135deg, rgba(251,191,36,0.06), transparent)'
                                                                                                        : role === 'superadmin' ? 'linear-gradient(135deg, rgba(123,159,239,0.06), transparent)'
                                                                                                            : role === 'admin' ? 'linear-gradient(135deg, rgba(96,165,250,0.06), transparent)'
                                                                                                                : role === 'moderator' ? 'linear-gradient(135deg, rgba(52,211,153,0.05), transparent)'
                                                                                                                    : role === 'operator' ? 'linear-gradient(135deg, rgba(34,211,238,0.05), transparent)'
                                                                                                                        : role === 'vip' ? 'linear-gradient(135deg, rgba(253,224,71,0.04), transparent)'
                                                                                                                            : 'transparent';
                                                                                        const cardBorder = isCurrentUser ? 'none'
                                                                                            : role === 'godmaster' ? '1px solid rgba(217,70,239,0.25)'
                                                                                                : role === 'owner' ? '1px solid rgba(251,191,36,0.2)'
                                                                                                    : role === 'admin' ? '1px solid rgba(96,165,250,0.15)'
                                                                                                        : role === 'moderator' ? '1px solid rgba(52,211,153,0.12)'
                                                                                                            : role === 'operator' ? '1px solid rgba(34,211,238,0.12)'
                                                                                                                : role === 'vip' ? '1px solid rgba(253,224,71,0.1)'
                                                                                                                    : 'none';
                                                                                        const cardShadow = isCurrentUser ? 'none'
                                                                                            : role === 'owner' ? '0 0 8px rgba(251,191,36,0.08)'
                                                                                                : 'none';
                                                                                        // ★ İlk non-speaker kullanıcı öncesi "Çevrimiçi" ayırıcı
                                                                                        const showOnlineDivider = !isSpeaking && speaker && idx > 0 && sorted[idx - 1] && speaker.userId === sorted[idx - 1]?.userId;
                                                                                        return (
                                                                                            <React.Fragment key={u.odaSoketId || `${u.userId || u.odaUserId}-${idx}`}>
                                                                                                {showOnlineDivider && (
                                                                                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#34d399', letterSpacing: 1.5, textTransform: 'uppercase', paddingTop: 6, paddingBottom: 2, display: 'flex', alignItems: 'center', gap: 5, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                                                                                                        <span style={{ fontSize: 11 }}>🟢</span> Çevrimiçi
                                                                                                    </div>
                                                                                                )}
                                                                                                <div
                                                                                                    onContextMenu={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); demoRoomRef.current?.handleUserContextMenu?.(e, u); }}
                                                                                                    style={{
                                                                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                                                                        padding: '4px 6px', borderRadius: 10,
                                                                                                        background: cardBg,
                                                                                                        border: cardBorder,
                                                                                                        boxShadow: cardShadow,
                                                                                                        cursor: 'pointer',
                                                                                                        transition: 'all 0.2s ease',
                                                                                                        position: 'relative',
                                                                                                        overflow: 'hidden',
                                                                                                        ...(u.status === 'invisible' || u.status === 'stealth' || u.isStealth ? { opacity: 0.35, filter: 'grayscale(1)' } : {}),
                                                                                                    }}>
                                                                                                    {/* isSelf bulutsu glow çerçeve */}
                                                                                                    {isCurrentUser && (
                                                                                                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                                                                                                            {/* Sol kenar — bulutsu glow */}
                                                                                                            <div style={{ position: 'absolute', left: -2, top: '5%', bottom: '5%', width: 10, background: 'radial-gradient(ellipse at left, rgba(255,255,255,0.2) 0%, transparent 70%)', filter: 'blur(4px)' }} />
                                                                                                            {/* Üst kenar — sol yarısı bulutsu */}
                                                                                                            <div style={{ position: 'absolute', top: -1, left: 0, width: '50%', height: 8, background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.15) 0%, transparent 70%)', filter: 'blur(4px)' }} />
                                                                                                            {/* Alt kenar — sol yarısı bulutsu */}
                                                                                                            <div style={{ position: 'absolute', bottom: -1, left: 0, width: '50%', height: 8, background: 'radial-gradient(ellipse at bottom left, rgba(255,255,255,0.15) 0%, transparent 70%)', filter: 'blur(4px)' }} />
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {/* Avatar */}
                                                                                                    <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                                                                                                        {/* ★ Konuşmacı kırmızı blur glow */}
                                                                                                        {isSpeaking && (
                                                                                                            <div style={{
                                                                                                                position: 'absolute', inset: -4, borderRadius: '50%',
                                                                                                                background: 'radial-gradient(circle, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0.15) 50%, transparent 70%)',
                                                                                                                filter: 'blur(6px)',
                                                                                                                animation: 'hpSpeakerGlow 2s ease-in-out infinite',
                                                                                                            }} />
                                                                                                        )}
                                                                                                        {/* Self hafif glow */}
                                                                                                        {!isSpeaking && isCurrentUser && (
                                                                                                            <div style={{
                                                                                                                position: 'absolute', inset: -2, borderRadius: '50%',
                                                                                                                background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(56,189,248,0.1) 50%, transparent 70%)',
                                                                                                                filter: 'blur(3px)',
                                                                                                            }} />
                                                                                                        )}
                                                                                                        <div style={{
                                                                                                            width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                                                                                                            border: isSpeaking ? '2.5px solid rgba(239,68,68,0.8)' : `2px solid ${borderColor}`,
                                                                                                            boxShadow: isSpeaking ? '0 0 16px rgba(239,68,68,0.5), 0 0 32px rgba(239,68,68,0.2)' : isCurrentUser ? '0 0 8px rgba(34,211,238,0.25)' : 'none',
                                                                                                            position: 'relative', zIndex: 1,
                                                                                                        }}>
                                                                                                            <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* İsim + Rol + Status */}
                                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                                            <span style={{ fontSize: 12, fontWeight: 700, color: isSpeaking ? '#ef4444' : (roleColor || '#ffffff'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                                                                                            {roleIcon && <span style={{ fontSize: 10 }}>{roleIcon}</span>}
                                                                                                            {isCurrentUser && <span style={{ fontSize: 8, color: 'rgba(34,211,238,0.6)', fontWeight: 600, letterSpacing: '0.05em' }}>(sen)</span>}
                                                                                                            {/* ═══ MODERASYON İKONLARI — yanıp sönen ceza ikonları ═══ */}
                                                                                                            {u.isMuted && <span title="Susturuldu" style={{ fontSize: 11, animation: 'hpModPulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }}>🔇</span>}
                                                                                                            {u.isGagged && <span title="Yazma Yasağı" style={{ fontSize: 11, animation: 'hpModPulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.6))' }}>🚫</span>}
                                                                                                            {u.isBanned && <span title="Yasaklı" style={{ fontSize: 11, animation: 'hpModPulse 1.2s ease-in-out infinite', filter: 'drop-shadow(0 0 6px rgba(220,38,38,0.8))' }}>⛔</span>}
                                                                                                            {u.isCamBlocked && <span title="Kamera Yasağı" style={{ fontSize: 11, animation: 'hpModPulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(107,114,128,0.6))' }}>📵</span>}
                                                                                                            {isSpeaking && (
                                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 18, flexShrink: 0 }}>
                                                                                                                    {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                                                                                                                        <div key={i} style={{
                                                                                                                            width: 2.5,
                                                                                                                            height: [6, 10, 14, 10, 6][i],
                                                                                                                            borderRadius: 2,
                                                                                                                            background: 'linear-gradient(180deg, #34d399, #059669)',
                                                                                                                            animation: `hpBarBounce 1.2s ease-in-out ${delay}s infinite`,
                                                                                                                        }} />
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {/* Queue hand indicator */}
                                                                                                            {(() => {
                                                                                                                const qi = (demoRoomRef.current?.state?.queue || []).indexOf(u.userId || '');
                                                                                                                if (qi === -1 || isSpeaking) return null;
                                                                                                                return (
                                                                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, animation: 'hpHandPulse 1.5s ease-in-out infinite' }}>
                                                                                                                        <span style={{ fontSize: 12, filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' }}>✋</span>
                                                                                                                        <span style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.2)', padding: '0 3px', borderRadius: 4 }}>{qi + 1}</span>
                                                                                                                    </span>
                                                                                                                );
                                                                                                            })()}
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                                            <span style={{ fontSize: 8, fontWeight: 600, color: roleColor }}>{roleLabel}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* Online dot — kendi kullanıcı için userStatus, diğerleri için u.status */}
                                                                                                    <div style={{
                                                                                                        width: 6, height: 6, borderRadius: '50%',
                                                                                                        background: isSpeaking ? '#ef4444' : (() => {
                                                                                                            const st = isCurrentUser ? userStatus : (u.status || 'online');
                                                                                                            return ({ online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa', invisible: '#64748b' } as Record<string, string>)[st] || '#34d399';
                                                                                                        })(),
                                                                                                        boxShadow: `0 0 4px ${isSpeaking ? 'rgba(239,68,68,0.5)' : (() => {
                                                                                                            const st = isCurrentUser ? userStatus : (u.status || 'online');
                                                                                                            return ({ online: 'rgba(52,211,153,0.4)', busy: 'rgba(248,113,113,0.4)', brb: 'rgba(251,191,36,0.4)', away: 'rgba(148,163,184,0.4)', phone: 'rgba(167,139,250,0.4)', invisible: 'rgba(100,116,139,0.3)' } as Record<string, string>)[st] || 'rgba(52,211,153,0.4)';
                                                                                                        })()}`,
                                                                                                        flexShrink: 0,
                                                                                                    }} />
                                                                                                </div>
                                                                                            </React.Fragment>
                                                                                        );
                                                                                    })}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Alt kısım: Durum + Radyo + Mikrofon — glossy-panel'in doğrudan çocuğu */}
                                                    {roomsMode && (
                                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                            {/* Durum Çubuğu - Premium + Hiyerarşi */}
                                                            <div style={{ position: 'relative' }}>
                                                                <button onClick={() => setStatusDropdown(p => !p)} style={{
                                                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                                                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                                                    border: `1px solid ${statusDropdown ? 'rgba(123,159,239,0.25)' : 'rgba(255,255,255,0.1)'}`,
                                                                    backdropFilter: 'blur(12px)',
                                                                    transition: 'all 0.3s ease',
                                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)',
                                                                }}>
                                                                    <div style={{
                                                                        width: 10, height: 10, borderRadius: '50%',
                                                                        background: `radial-gradient(circle at 35% 35%, ${{ online: '#6ee7b7', busy: '#fca5a5', brb: '#fde68a', away: '#cbd5e1', phone: '#c4b5fd', invisible: '#94a3b8' }[userStatus]}, ${{ online: '#059669', busy: '#dc2626', brb: '#d97706', away: '#64748b', phone: '#7c3aed', invisible: '#475569' }[userStatus]})`,
                                                                        boxShadow: `0 0 8px ${{ online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa', invisible: '#64748b' }[userStatus]}80`,
                                                                        animation: userStatus === 'online' ? 'pulse 2s ease-in-out infinite' : 'none',
                                                                    }} />
                                                                    <span style={{ fontSize: 10, fontWeight: 700, color: { online: '#34d399', busy: '#f87171', brb: '#fbbf24', away: '#94a3b8', phone: '#a78bfa', invisible: '#64748b' }[userStatus], letterSpacing: 0.5 }}>
                                                                        {{ online: 'Çevrimiçi', busy: 'Meşgul', brb: 'Dönecek', away: 'Dışarıda', phone: 'Telefonda', invisible: 'Görünmez' }[userStatus]}
                                                                    </span>
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transform: statusDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}><polyline points="6 9 12 15 18 9" /></svg>
                                                                </button>
                                                                {statusDropdown && (
                                                                    <div style={{
                                                                        position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, zIndex: 20,
                                                                        background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
                                                                        backdropFilter: 'blur(20px)',
                                                                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                                                                        padding: 6,
                                                                        boxShadow: '0 12px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                                    }}>
                                                                        {/* ═══ Header ═══ */}
                                                                        <div style={{ padding: '4px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                            <span style={{ fontSize: 8, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.5 }}>Durumunu Değiştir</span>
                                                                        </div>

                                                                        {/* ═══ TEMEL DURUMLAR — Herkes ═══ */}
                                                                        {[
                                                                            { key: 'online' as const, label: 'Çevrimiçi', color: '#34d399', icon: '🟢' },
                                                                            { key: 'busy' as const, label: 'Meşgul', color: '#f87171', icon: '🔴' },
                                                                            { key: 'brb' as const, label: 'Dönecek', color: '#fbbf24', icon: '🟡' },
                                                                        ].map(s => (
                                                                            <button key={s.key} onClick={() => { setUserStatus(s.key); setStatusDropdown(false); demoRoomRef.current?.actions?.changeStatus?.(s.key); }}
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

                                                                        {/* ═══ GELİŞMİŞ DURUMLAR — VIP+ (roleLevel >= 3) ═══ */}
                                                                        {getRoleLevel(user.role) >= 3 && (
                                                                            <>
                                                                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                                                                                {[
                                                                                    { key: 'away' as const, label: 'Dışarıda', color: '#94a3b8', icon: '🌙' },
                                                                                    { key: 'phone' as const, label: 'Telefonda', color: '#a78bfa', icon: '📞' },
                                                                                ].map(s => (
                                                                                    <button key={s.key} onClick={() => { setUserStatus(s.key); setStatusDropdown(false); demoRoomRef.current?.actions?.changeStatus?.(s.key); }}
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
                                                                            </>
                                                                        )}

                                                                        {/* ═══ GÖRÜNMEZLİK — VIP+ roller (GodMaster hariç) ═══ */}
                                                                        {getRoleLevel(user.role) >= 4 && user.role?.toLowerCase() !== 'godmaster' && (
                                                                            <>
                                                                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                                                                                <button onClick={() => { setUserStatus('invisible'); setStatusDropdown(false); demoRoomRef.current?.actions?.changeStatus?.('stealth'); }}
                                                                                    style={{
                                                                                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                                                                        padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                                                                        background: userStatus === 'invisible' ? '#64748b18' : 'transparent',
                                                                                        color: userStatus === 'invisible' ? '#64748b' : '#94a3b8',
                                                                                        fontSize: 10, fontWeight: 600, transition: 'all 0.2s ease',
                                                                                    }}
                                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#64748b15'; }}
                                                                                    onMouseLeave={e => { if (userStatus !== 'invisible') e.currentTarget.style.background = 'transparent'; }}
                                                                                >
                                                                                    <span>👻</span> Görünmez
                                                                                    {userStatus === 'invisible' && <Check style={{ width: 10, height: 10, marginLeft: 'auto' }} />}
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        {/* ═══ GODMASTER ÖZEL MODLARI ═══ */}
                                                                        {user.role?.toLowerCase() === 'godmaster' && (
                                                                            <>
                                                                                <div style={{ height: 1, background: 'rgba(217,70,239,0.15)', margin: '4px 0 2px' }} />
                                                                                <div style={{ padding: '4px 10px 2px' }}>
                                                                                    <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(217,70,239,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 }}>🔱 GodMaster Modu</span>
                                                                                </div>
                                                                                {/* Görünür */}
                                                                                <button onClick={() => { demoRoomRef.current?.actions?.setGodmasterVisibility?.('visible'); setStatusDropdown(false); }}
                                                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#d946ef', fontSize: 10, fontWeight: 600, transition: 'all 0.2s ease' }}
                                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#d946ef15'; }}
                                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                                                ><span>🔱</span> Görünür (GodMaster)</button>
                                                                                {/* Kılık Değiştir — inline input */}
                                                                                <div style={{ padding: '4px 10px' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                                                        <span style={{ fontSize: 10 }}>👤</span>
                                                                                        <span style={{ fontSize: 10, fontWeight: 600, color: '#60a5fa' }}>Kılık Değiştir</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Takma isim girin..."
                                                                                            id="gm-disguise-input"
                                                                                            style={{ flex: 1, padding: '5px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(96,165,250,0.25)', outline: 'none' }}
                                                                                            onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) { demoRoomRef.current?.actions?.setGodmasterVisibility?.('disguised', v); setStatusDropdown(false); } } }}
                                                                                        />
                                                                                        <button onClick={() => { const el = document.getElementById('gm-disguise-input') as HTMLInputElement; const v = el?.value?.trim(); if (v) { demoRoomRef.current?.actions?.setGodmasterVisibility?.('disguised', v); setStatusDropdown(false); } }}
                                                                                            style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(96,165,250,0.2)', color: '#60a5fa', fontSize: 9, fontWeight: 700 }}
                                                                                        >✓</button>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Gizli Mod */}
                                                                                <button onClick={() => { demoRoomRef.current?.actions?.setGodmasterVisibility?.('hidden'); setStatusDropdown(false); }}
                                                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 10, fontWeight: 600, transition: 'all 0.2s ease' }}
                                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#64748b15'; }}
                                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                                                                ><span>👻</span> Gizli Mod</button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Radyo Çalar - Gerçek RadioPlayer bileşeni */}
                                                            <RadioPlayer />

                                                            {/* Mikrofon - Gerçek Room Actions */}
                                                            {(() => {
                                                                const rd = demoRoomRef.current;
                                                                const isMicOn = demoIsMicOn;
                                                                const currentSpeaker = demoCurrentSpeaker;
                                                                const queue: string[] = demoQueue;
                                                                const myUserId = rd?.state?.currentUser?.userId || user?.userId || '';
                                                                const isSomeoneElseSpeaker = currentSpeaker && currentSpeaker.userId !== myUserId;
                                                                const isInQueue = queue.includes(myUserId);
                                                                const micTimeLeft = demoMicTimeLeft;
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
                                                                                : `linear-gradient(180deg, ${branding?.siteConfig?.homepage?.headerGradient1 || '#5a6070'} 0%, ${branding?.siteConfig?.homepage?.headerGradient2 || '#3d4250'} 15%, ${branding?.siteConfig?.homepage?.headerGradient3 || '#1e222e'} 50%, ${branding?.siteConfig?.homepage?.headerGradient4 || '#282c3a'} 75%, ${branding?.siteConfig?.homepage?.headerGradient5 || '#3a3f50'} 100%)`,
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
                                                                        <svg style={{
                                                                            width: 15, height: 15,
                                                                            color: isMicOn ? '#fca5a5' : isInQueue ? '#fde68a' : '#94a3b8',
                                                                        }} viewBox="0 0 24 24" fill="none">
                                                                            <rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                                                                            <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                                            <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                                            <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                                        </svg>
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
                                                                    <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="input-inset" style={{ flex: 1, padding: '8px 12px', fontSize: 12, boxSizing: 'border-box' }} placeholder="••••••••" autoComplete="one-time-code" name="edit-otp" />
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
                                <div className="glossy-panel" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(251, 191, 36, 0.4)', animation: isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.2s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both', transformOrigin: 'top center', ...(roomsMode ? { display: 'none' } : {}) }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: 192, height: 192, background: 'rgba(251, 191, 36, 0.2)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

                                    <div style={{ position: 'relative', zIndex: 10 }}>
                                        <h3 style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                            <Star style={{ width: 14, height: 14 }} fill="currentColor" /> Premium Paket
                                        </h3>
                                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Kendi Odanı Kur</h4>
                                        <p style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500, marginBottom: 16, lineHeight: 1.6, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                            Yönetici yetkileri, HD yayın kalitesi ve şifreli koruma ile kendi topluluğunu oluştur.
                                        </p>
                                        <button onClick={() => { if (activeSection === 'home' || activeSection === 'odalar') { setShowPackages(true); } else { setActiveSection('fiyatlar'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 11 }}>
                                            Paketleri İncele
                                        </button>
                                    </div>
                                </div>

                                {/* CANLI DESTEK */}
                                <div className="glossy-panel" style={{ padding: '14px 16px', textAlign: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(52, 211, 153, 0.2)', animation: isInitialLoad.current ? 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 1.4s both' : 'cardSlideIn 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both', transformOrigin: 'top center', overflow: 'visible', ...(roomsMode ? { display: 'none' } : {}) }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(180deg, #34d399, #059669)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 10px 20px rgba(16,185,129,0.3)' }}>
                                        <Headset style={{ width: 20, height: 20, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                    </div>
                                    <h4 style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Müşteri Hizmetleri</h4>
                                    <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 12, fontWeight: 500 }}>Sorularınız ve önerileriniz için bize ulaşın.</p>
                                    <button onClick={() => setSupportOpen(!supportOpen)} className="btn-3d btn-3d-green" style={{ width: '100%', padding: '8px 0', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                            <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
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
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                                            <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="Ad Soyad"
                                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                            <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="mail@ornek.com"
                                                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                        </div>
                                        <input type="text" value={supSubject} onChange={e => setSupSubject(e.target.value)} placeholder="Mesajınızın konusu"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 6 }} />
                                        <textarea value={supMessage} onChange={e => setSupMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..."
                                            rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', marginBottom: 10 }} />
                                        {supSuccess && <div style={{ textAlign: 'center', padding: '6px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', fontSize: 10, fontWeight: 700, color: '#34d399', marginBottom: 6 }}>✅ Gönderildi!</div>}
                                        <button onClick={handleContactSubmit} disabled={supSending || !supName.trim() || !supEmail.trim() || !supMessage.trim()} className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '10px 0', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: supSending ? 0.6 : 1 }}>
                                            {supSending ? 'Gönderiliyor...' : 'Mesaj Gönder'} <Send style={{ width: 13, height: 13 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ODALAR — SAĞ SÜTÜN */}
                            {roomsMode && (
                                <div style={{ width: liveCollapsed ? 0 : 248, flex: liveCollapsed ? '0 0 0px' : '0 0 248px', maxWidth: liveCollapsed ? 0 : 268, display: 'flex', flexDirection: 'column', gap: liveCollapsed ? 0 : 16, order: 3, marginRight: liveCollapsed ? 0 : -24, overflow: liveCollapsed ? 'hidden' : 'visible', pointerEvents: liveHidden ? 'none' : 'auto', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1), flex 0.5s cubic-bezier(0.4,0,0.2,1), max-width 0.5s cubic-bezier(0.4,0,0.2,1), margin-right 0.5s cubic-bezier(0.4,0,0.2,1), gap 0.3s ease' }}>
                                    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {/* Lamba */}
                                        <div className="gallery-lamp-svg-right" style={{ animation: lampAnimDone.current['rightLive'] ? 'none' : (isInitialLoad.current ? 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 1.1s both' : 'lampDip 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'), ...(lampAnimDone.current['rightLive'] ? { transform: liveHidden ? 'translateX(-50%) translateY(-52px)' : 'translateX(-50%) translateY(0)', opacity: liveHidden ? 0 : 1, transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.6s ease' } : {}) }} onAnimationEnd={() => { lampAnimDone.current['rightLive'] = true; }}>
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

                                        <div className="glossy-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', filter: liveHidden ? 'blur(14px)' : 'blur(0)', opacity: liveHidden ? 0 : 1, transform: liveHidden ? 'scale(0.92) translateY(-20px)' : 'scale(1) translateY(0)', transition: 'filter 0.8s ease, opacity 0.7s ease, transform 0.8s cubic-bezier(0.4,0,0.2,1)' }}>
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
                                                    {/* TV Content: Mikrofon alan+Kamera > YouTube > Static GIF */}
                                                    {demoRoomRef.current?.isCameraOn && demoIsMicOn && demoRoomRef.current?.localStream ? (
                                                        <video
                                                            autoPlay
                                                            muted
                                                            playsInline
                                                            ref={(el) => { if (el && demoRoomRef.current?.localStream) el.srcObject = demoRoomRef.current.localStream; }}
                                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11, zIndex: 1, transform: 'scaleX(-1)' }}
                                                        />
                                                    ) : tvVideoUrl ? (
                                                        extractYoutubeId(tvVideoUrl) ? (
                                                            <iframe
                                                                ref={tvYtIframeRef}
                                                                src={`https://www.youtube.com/embed/${extractYoutubeId(tvVideoUrl)}?autoplay=1&mute=0&loop=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                                                title="TV Video"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', borderRadius: 11, zIndex: 1 }}
                                                            />
                                                        ) : (
                                                            <video
                                                                src={tvVideoUrl}
                                                                autoPlay
                                                                loop
                                                                playsInline
                                                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 11, zIndex: 1, background: '#000' }}
                                                            />
                                                        )
                                                    ) : (
                                                        <div className="absolute inset-0" style={{ background: 'url(https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif) center/cover', opacity: 0.6 }} />
                                                    )}
                                                    {/* YouTube Badge */}
                                                    {tvVideoUrl && !(demoRoomRef.current?.isCameraOn && demoIsMicOn) && (
                                                        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 40, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.5)' }}>
                                                            <span style={{ fontSize: 7 }}>▶</span>
                                                            <span style={{ fontSize: 7, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>{extractYoutubeId(tvVideoUrl) ? 'YouTube' : 'Video'}</span>
                                                        </div>
                                                    )}
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
                                            {/* Status text */}
                                            <div style={{ textAlign: 'center', fontSize: 9, color: (demoRoomRef.current?.isCameraOn && demoIsMicOn) ? '#34d399' : tvVideoUrl ? '#f87171' : '#475569', fontWeight: 600, marginTop: 8 }}>
                                                {(demoRoomRef.current?.isCameraOn && demoIsMicOn) ? '📹 Kameranız Açık' : tvVideoUrl ? (extractYoutubeId(tvVideoUrl) ? '▶ YouTube yayını devam ediyor' : '▶ Video yayını devam ediyor') : 'Yayın bekleniyor...'}
                                            </div>
                                            {/* YouTube URL Input + Controls */}
                                            <div style={{ marginTop: 6, padding: '0 4px' }}>
                                                {tvVideoUrl && !(demoRoomRef.current?.isCameraOn && demoIsMicOn) ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button
                                                            onClick={() => setTvVideoUrl(null)}
                                                            style={{ flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 600, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        >■ Yayını Durdur</button>
                                                    </div>
                                                ) : !(demoRoomRef.current?.isCameraOn && demoIsMicOn) && getRoleLevel(demoRoomRef.current?.state?.currentUser?.role) >= 3 ? (
                                                    tvYtInputOpen ? (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <input
                                                                type="text"
                                                                value={tvYtInputValue}
                                                                onChange={e => setTvYtInputValue(e.target.value)}
                                                                placeholder="YouTube veya Video URL..."
                                                                style={{ flex: 1, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: 9, outline: 'none' }}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' && tvYtInputValue.trim()) { setTvVideoUrl(tvYtInputValue.trim()); setTvYtInputValue(''); setTvYtInputOpen(false); }
                                                                    if (e.key === 'Escape') { setTvYtInputOpen(false); setTvYtInputValue(''); }
                                                                }}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => { if (tvYtInputValue.trim()) { setTvVideoUrl(tvYtInputValue.trim()); setTvYtInputValue(''); setTvYtInputOpen(false); } }}
                                                                style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: 9, fontWeight: 700 }}
                                                            >▶</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setTvYtInputOpen(true)}
                                                            style={{ width: '100%', padding: '5px 0', borderRadius: 6, fontSize: 9, fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseOver={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                                                            onMouseOut={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                                        >🎬 Video Yayını Başlat</button>
                                                    )
                                                ) : null}
                                            </div>
                                            {/* Kamera açan kullanıcılar — sadece kamerası açık olanlar */}
                                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                                {/* Başlık */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>📹 Kameralar</span>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginLeft: 'auto' }}>{demoRoomRef.current?.isCameraOn ? '1' : '0'} kişi</span>
                                                </div>
                                                {/* Kamera grid */}
                                                <div className="hover-scroll" style={{ flex: 1, overflowY: 'auto', maxHeight: 470, paddingTop: 4, paddingLeft: 4, paddingRight: 4, overscrollBehavior: 'contain' }}>
                                                    {!demoRoomRef.current?.isCameraOn ? (
                                                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 10, fontWeight: 600 }}>
                                                            Kamera açan yok
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                                            <div style={{ position: 'relative', width: '100%', borderRadius: 6, overflow: 'hidden', aspectRatio: '4/3', border: '1px solid rgba(52,211,153,0.3)' }}>
                                                                {demoRoomRef.current?.localStream && (
                                                                    <video
                                                                        autoPlay muted playsInline
                                                                        ref={(el) => { if (el && demoRoomRef.current?.localStream) el.srcObject = demoRoomRef.current.localStream; }}
                                                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                                                    />
                                                                )}
                                                                <div style={{ position: 'absolute', bottom: 2, right: 3, display: 'flex', alignItems: 'center', gap: 2, zIndex: 2 }}>
                                                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />
                                                                    <span style={{ fontSize: 7, fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Sen</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
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
                        {branding?.siteConfig?.footerText || '© 2026 SopranoChat Systems.'}
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 32 }}>
                            <a href="#" onClick={(e) => { e.preventDefault(); setShowRulesModal(true); }} style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }}>Kurallar</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }}>Gizlilik Sözleşmesi</a>
                        </div>
                    </footer>
                </main>
            </div>

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

                                {/* IBAN Cards — Tüm banka hesapları */}
                                {(() => {
                                    const banks = (branding?.siteConfig?.banks && branding.siteConfig.banks.length > 0) ? branding.siteConfig.banks : [{ bank: 'Akbank', name: 'SopranoChat Bilişim', iban: 'TR78 0004 6006 1388 8000 0123 45' }];
                                    return banks.map((bank: any, bankIdx: number) => (
                                <div key={bankIdx} style={{
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
                                        }}>{bank.bank?.charAt(0) || '?'}</div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{bank.bank}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{bank.name}</div>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', borderRadius: 12,
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2.5, fontFamily: 'monospace' }}>{bank.iban}</span>
                                        <button onClick={() => copyToClipboard(bank.iban.replace(/\s/g, ''), `iban-${bankIdx}`)} style={{
                                            background: chkCopied === `iban-${bankIdx}` ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
                                            border: `1px solid ${chkCopied === `iban-${bankIdx}` ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                            color: chkCopied === `iban-${bankIdx}` ? '#34d399' : '#38bdf8',
                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                                            transition: 'all 0.2s',
                                        }}>
                                            {chkCopied === `iban-${bankIdx}` ? <><Check style={{ width: 12, height: 12 }} /> Kopyalandı</> : <><Copy style={{ width: 12, height: 12 }} /> Kopyala</>}
                                        </button>
                                    </div>
                                </div>
                                    ));
                                })()}

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
                                {chkSuccess ? (
                                    <div style={{ textAlign: 'center', padding: '14px', borderRadius: 12, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', fontSize: 13, fontWeight: 800, color: '#34d399' }}>
                                        ✅ Siparişiniz başarıyla gönderildi! En kısa sürede sizinle iletişime geçeceğiz.
                                    </div>
                                ) : (
                                    <button onClick={async () => {
                                        if (!chkName.trim() || !chkEmail.trim()) return;
                                        setChkSending(true);
                                        try {
                                            const nameParts = chkName.trim().split(' ');
                                            const firstName = nameParts[0] || '';
                                            const lastName = nameParts.slice(1).join(' ') || '';
                                            const amount = chkBilling === 'yearly' ? checkoutPlan.price * 10 : checkoutPlan.price;
                                            // Convert logo to base64 if provided
                                            let logoBase64: string | null = null;
                                            if (chkLogo) {
                                                logoBase64 = await new Promise<string>((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onload = () => resolve(reader.result as string);
                                                    reader.readAsDataURL(chkLogo);
                                                });
                                            }
                                            const res = await fetch(`${API_URL}/admin/orders`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    firstName, lastName,
                                                    email: chkEmail.trim(),
                                                    phone: chkPhone.trim(),
                                                    packageName: checkoutPlan.name,
                                                    paymentCode: chkPaymentCode,
                                                    hostingType: chkHosting === 'own' ? 'own_domain' : 'sopranochat',
                                                    customDomain: chkHosting === 'own' ? chkDomain : null,
                                                    roomName: chkHosting === 'soprano' ? chkRoomName : null,
                                                    amount,
                                                    logo: logoBase64,
                                                    details: { billing: chkBilling, period: checkoutPlan.period },
                                                }),
                                            });
                                            if (res.ok) {
                                                setChkSuccess(true);
                                                setTimeout(() => {
                                                    setCheckoutPlan(null);
                                                    setChkSuccess(false);
                                                    setChkName('');
                                                    setChkEmail('');
                                                    setChkPhone('');
                                                    setChkLogo(null);
                                                    setChkHosting('soprano');
                                                    setChkDomain('');
                                                    setChkRoomName('');
                                                    setChkBilling('monthly');
                                                }, 3000);
                                            }
                                        } catch { }
                                        setChkSending(false);
                                    }} disabled={chkSending || !chkName.trim() || !chkEmail.trim()} className="btn-3d btn-3d-gold" style={{
                                        width: '100%', padding: '13px 0', fontSize: 13, fontWeight: 900, borderRadius: 12,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        letterSpacing: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                        opacity: chkSending ? 0.6 : 1,
                                    }}>
                                        {chkSending ? 'Gönderiliyor...' : 'Ödemeyi Gönderdim, Tamamla'} <Check style={{ width: 18, height: 18 }} />
                                    </button>
                                )}
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

            {/* KURALLAR MODAL */}
            {showRulesModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => setShowRulesModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: 16, padding: '28px 32px',
                        maxWidth: 560, width: '90vw', maxHeight: '85vh', overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0',
                        animation: 'ctxUiMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>📋 Platform Kuralları</h3>
                            <button onClick={() => setShowRulesModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, lineHeight: 1, transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = '#e2e8f0')} onMouseOut={e => (e.currentTarget.style.background = '#f1f5f9')}>✕</button>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 16 }}>Son Güncelleme: Mart 2026</p>
                        <div style={{ fontSize: 13, lineHeight: 1.9, color: '#334155' }}>
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #dbeafe' }}>
                                <p style={{ margin: 0, fontWeight: 600, color: '#1e40af' }}>SopranoChat platformunu kullanarak aşağıdaki kuralları kabul etmiş sayılırsınız. Kuralların ihlali durumunda hesabınız geçici veya kalıcı olarak askıya alınabilir.</p>
                            </div>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>1. Genel Davranış Kuralları</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Hakaret, küfür, aşağılama ve her türlü sözlü şiddet yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Irkçılık, cinsiyetçilik, homofobik veya ayrımcı söylemler kesinlikle yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Diğer kullanıcıları rahatsız eden, taciz veya tehdit içeren davranışlar yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Spam, flood ve toplu mesaj gönderimi yasaktır.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>2. İçerik Kuralları</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Cinsel içerikli, pornografik veya müstehcen materyal paylaşımı yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Telif hakkı ihlali içeren içerik paylaşılamaz.</li>
                                <li style={{ marginBottom: 6 }}>Zararlı yazılım, virüs veya kimlik avı bağlantıları paylaşmak yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Kişisel bilgi paylaşımı (doxxing) kesinlikle yasaktır.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>3. Sesli ve Görüntülü İletişim</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Mikrofon kullanırken diğer kullanıcıları sesi bozmadan iletişim kurun.</li>
                                <li style={{ marginBottom: 6 }}>Oda yöneticisinin talimatlarına uyun, mikrofon sırası kurallarına riayet edin.</li>
                                <li style={{ marginBottom: 6 }}>Kamera kullanımında uygunsuz görüntü paylaşımı yasaktır.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>4. Hesap Güvenliği</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Birden fazla hesap açmak (çoklu hesap) yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Hesap bilgilerinizi başkalarıyla paylaşmayın.</li>
                                <li style={{ marginBottom: 6 }}>Başka bir kullanıcının kimliğine bürünmek yasaktır.</li>
                                <li style={{ marginBottom: 6 }}>Bot, otomasyon veya hile yazılımı kullanımı yasaktır.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>5. Oda Yönetimi</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Oda sahipleri kendi odalarında ek kurallar belirleyebilir.</li>
                                <li style={{ marginBottom: 6 }}>Moderatörlerin uyarılarına uymak zorunludur.</li>
                                <li style={{ marginBottom: 6 }}>Oda yönetim yetkilerinin kötüye kullanımı durumunda yetki alınabilir.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>6. Yaptırımlar</h4>
                            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 16px', border: '1px solid #fecaca' }}>
                                <p style={{ margin: 0, color: '#991b1b', fontWeight: 600, fontSize: 12 }}>Kuralları ihlal eden kullanıcılara uyarı, geçici susturma, kick, geçici ban veya kalıcı ban uygulanabilir. Yaptırımlar ihlal şiddetine göre belirlenir.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowRulesModal(false)} style={{
                            width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700, marginTop: 24,
                            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                            transition: 'background 0.15s',
                        }} onMouseOver={e => (e.currentTarget.style.background = '#2563eb')} onMouseOut={e => (e.currentTarget.style.background = '#3b82f6')}>Anladım, Kapat</button>
                    </div>
                </div>
            )}

            {/* GİZLİLİK SÖZLEŞMESİ MODAL */}
            {showPrivacyModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => setShowPrivacyModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: 16, padding: '28px 32px',
                        maxWidth: 560, width: '90vw', maxHeight: '85vh', overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0',
                        animation: 'ctxUiMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🔒 Gizlilik Sözleşmesi</h3>
                            <button onClick={() => setShowPrivacyModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, lineHeight: 1, transition: 'background 0.15s' }} onMouseOver={e => (e.currentTarget.style.background = '#e2e8f0')} onMouseOut={e => (e.currentTarget.style.background = '#f1f5f9')}>✕</button>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 16 }}>Yürürlük Tarihi: Mart 2026</p>
                        <div style={{ fontSize: 13, lineHeight: 1.9, color: '#334155' }}>
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #dbeafe' }}>
                                <p style={{ margin: 0, fontWeight: 600, color: '#1e40af' }}>SopranoChat olarak kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu gizlilik politikası, hangi verileri topladığımızı, nasıl kullandığımızı ve haklarınızı açıklamaktadır.</p>
                            </div>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>1. Toplanan Veriler</h4>
                            <p style={{ marginBottom: 8 }}>Platformumuzu kullanırken aşağıdaki veriler toplanabilir:</p>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}><strong>Hesap Bilgileri:</strong> Kullanıcı adı, e-posta adresi, şifre (hash'li olarak saklanır).</li>
                                <li style={{ marginBottom: 6 }}><strong>Profil Bilgileri:</strong> Cinsiyet, avatar, durum mesajı gibi isteğe bağlı veriler.</li>
                                <li style={{ marginBottom: 6 }}><strong>Kullanım Verileri:</strong> Oturum süreleri, bağlantı logları, IP adresi.</li>
                                <li style={{ marginBottom: 6 }}><strong>İletişim Verileri:</strong> Sohbet mesajları (uçtan uca şifreli odalarda sunucuda saklanmaz).</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>2. Veri Kullanım Amacı</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Hesap oluşturma ve kimlik doğrulama işlemleri.</li>
                                <li style={{ marginBottom: 6 }}>Platform güvenliğini sağlama ve kötüye kullanımı önleme.</li>
                                <li style={{ marginBottom: 6 }}>Hizmet kalitesini iyileştirme ve teknik sorunları çözme.</li>
                                <li style={{ marginBottom: 6 }}>Yasal yükümlülüklere uyum.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>3. Veri Güvenliği</h4>
                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', marginBottom: 12, border: '1px solid #bbf7d0' }}>
                                <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: 12 }}>Tüm veriler SSL/TLS şifreleme ile iletilir. Şifreler bcrypt algoritması ile hash'lenir. Sesli ve görüntülü iletişim DTLS-SRTP protokolü ile korunur.</p>
                            </div>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Veriler güvenli sunucularda saklanır ve düzenli yedeklenir.</li>
                                <li style={{ marginBottom: 6 }}>Yetkisiz erişim girişimleri otomatik olarak engellenir ve loglanır.</li>
                                <li style={{ marginBottom: 6 }}>Çalışanlarımız gizlilik sözleşmesine tabidir.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>4. Üçüncü Taraflar</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Kişisel verileriniz üçüncü taraflarla <strong>paylaşılmaz</strong> ve <strong>satılmaz</strong>.</li>
                                <li style={{ marginBottom: 6 }}>Yasal zorunluluk durumları hariç, verileriniz yetkili makamlarla paylaşılmaz.</li>
                                <li style={{ marginBottom: 6 }}>Anonim istatistiksel veriler hizmet iyileştirmesi için kullanılabilir.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>5. Çerezler (Cookies)</h4>
                            <p>Platformumuz oturum yönetimi ve kullanıcı tercihleri için zorunlu çerezler kullanır. Bu çerezler reklam veya izleme amaçlı değildir.</p>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>6. Kullanıcı Hakları</h4>
                            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                                <li style={{ marginBottom: 6 }}>Hesap bilgilerinizi istediğiniz zaman görüntüleyebilir ve güncelleyebilirsiniz.</li>
                                <li style={{ marginBottom: 6 }}>Hesap silme talebinde bulunabilirsiniz — verileriniz 30 gün içinde kalıcı silinir.</li>
                                <li style={{ marginBottom: 6 }}>Verilerinizin bir kopyasını talep edebilirsiniz.</li>
                                <li style={{ marginBottom: 6 }}>Gizlilik ihlali şüphesi durumunda <strong>destek@sopranochat.com</strong> adresine bildirimde bulunabilirsiniz.</li>
                            </ul>

                            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginTop: 20, marginBottom: 8 }}>7. Değişiklikler</h4>
                            <p>Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler platform içi bildirim ile kullanıcılara duyurulur.</p>
                        </div>
                        <button onClick={() => setShowPrivacyModal(false)} style={{
                            width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 700, marginTop: 24,
                            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                            transition: 'background 0.15s',
                        }} onMouseOver={e => (e.currentTarget.style.background = '#2563eb')} onMouseOut={e => (e.currentTarget.style.background = '#3b82f6')}>Anladım, Kapat</button>
                    </div>
                </div>
            )}

            {/* ÇEREZ BİLDİRİMİ BANNER */}
            {showCookieConsent && !roomsMode && (branding?.siteConfig?.homepage?.showCookieConsent !== false) && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99998,
                    background: '#ffffff', borderTop: '1px solid #e2e8f0',
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
                    padding: '16px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                    animation: 'ctxUiMenuIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    <span style={{ fontSize: 20 }}>🍪</span>
                    <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.5, maxWidth: 600, fontWeight: 500 }}>
                        SopranoChat, oturum yönetimi ve kullanıcı tercihleri için <strong>zorunlu çerezler</strong> kullanır. Platformu kullanarak bunu kabul etmiş olursunuz.
                    </p>
                    <button
                        onClick={() => { localStorage.setItem('soprano_cookie_consent', 'true'); setShowCookieConsent(false); }}
                        style={{
                            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                            padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0,
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = '#2563eb')}
                        onMouseOut={e => (e.currentTarget.style.background = '#3b82f6')}
                    >Anladım</button>
                </div>
            )}
        </>
    );
}
