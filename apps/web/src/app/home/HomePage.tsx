"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { openChatWindow } from "@/components/ui/TitleBar";
import { getAuthUser, setAuthUser, removeAuthUser, clearAllSopranoAuth, AuthUser } from "@/lib/auth";
import { generateGenderAvatar } from "@/lib/avatar";
import {
    Heart, User, LogIn, X, Mail, Lock, ArrowRight, Sparkles, Users, Video, Mic, Camera,
    ShieldCheck, Crown, Store, Star, HelpCircle, Phone, HeartHandshake, PenLine,
    UserPlus, Headphones, Gamepad2, Music, Copy, Info, CheckCircle, SlidersHorizontal,
    Loader2, LogOut, Check, Swords, Building2, ChevronDown, ChevronUp, Send, MessageSquare,
    Moon, Sun,
} from "lucide-react";
import { API_URL } from '@/lib/api';
import { useAdminStore } from '@/lib/admin/store';
import ToastContainer from '@/components/ui/ToastContainer';
import SopranoChatLogo from '@/components/ui/SopranoChatLogo';

const AUTH_TOKEN_KEY = 'soprano_auth_token';

export default function HomePage() {
    const router = useRouter();
    const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
    const [activeForm, setActiveForm] = useState<'none' | 'misafir' | 'giris' | 'kayit'>('none');
    const [showButtons, setShowButtons] = useState(true);
    const [formVisible, setFormVisible] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    // ¦¦ Profil Düzenleme ¦¦
    const [profileEditing, setProfileEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [guestNick, setGuestNick] = useState('');
    const [guestGender, setGuestGender] = useState('Belirsiz');
    const [guestError, setGuestError] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);
    const [memberUsername, setMemberUsername] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberError, setMemberError] = useState('');
    const [memberLoading, setMemberLoading] = useState(false);
    const [regEmail, setRegEmail] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regGender, setRegGender] = useState('Belirsiz');
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingYearly, setPricingYearly] = useState(false);
    const [showReferencesModal, setShowReferencesModal] = useState(false);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [contactSubmitting, setContactSubmitting] = useState(false);
    const [contactSent, setContactSent] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentPackageName, setPaymentPackageName] = useState('');
    const [paymentCode, setPaymentCode] = useState('SPR-XXXX');
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [orderFirstName, setOrderFirstName] = useState('');
    const [orderLastName, setOrderLastName] = useState('');
    const [orderEmail, setOrderEmail] = useState('');
    const [orderPhone, setOrderPhone] = useState('');
    const [hostingType, setHostingType] = useState<'sopranochat' | 'own_domain'>('sopranochat');
    const [customDomain, setCustomDomain] = useState('');
    const [orderRoomName, setOrderRoomName] = useState('');
    const [orderLogo, setOrderLogo] = useState('');
    const [customRooms, setCustomRooms] = useState('1 Oda');
    const [customCapacity, setCustomCapacity] = useState('30 Kişi');
    const [customCam, setCustomCam] = useState('Kameralı');
    const [customMeeting, setCustomMeeting] = useState('Mevcut');
    const [tenants, setTenants] = useState<any[]>([]);
    const [showAllPlatforms, setShowAllPlatforms] = useState(false);
    // Beğeni sistemi
    const [myLikes, setMyLikes] = useState<string[]>([]);
    const [likeLoading, setLikeLoading] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifToast, setShowNotifToast] = useState(false);
    const addToast = useAdminStore((s) => s.addToast);
    // ¦¦ Branding (logo) ¦¦
    const [branding, setBranding] = useState<{ logoUrl: string | null; logoName: string; stats?: { userCount: number; roomCount: number; messageCount: number; onlineUsers?: number } }>({ logoUrl: null, logoName: 'SopranoChat' });
    useEffect(() => {
        const fetchBranding = () => {
            fetch(`${API_URL}/admin/branding`)
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) setBranding(data); })
                .catch(() => { });
        };
        fetchBranding();
        const interval = setInterval(fetchBranding, 15000); // 15 saniyede bir yenile
        return () => clearInterval(interval);
    }, []);
    const formatK = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K+' : String(n) + '+';



    // ¦¦ Oda Geçiş Efekti ¦¦
    const [roomTransition, setRoomTransition] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // ¦¦ Dönen Hero Görselleri ¦¦
    const heroImages = [
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2070&auto=format&fit=crop',
    ];
    const [heroIndex, setHeroIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % heroImages.length);
        }, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ¦¦ Kullanıcı Kartı Döngüsü (API'den gerçek üyeler) ¦¦
    const [publicUsers, setPublicUsers] = useState<any[]>([]);
    const [userCardIndex, setUserCardIndex] = useState(0);

    useEffect(() => {
        fetch(`${API_URL}/rooms/public/users`)
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => { if (Array.isArray(data) && data.length > 0) setPublicUsers(data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (publicUsers.length < 2) return;
        const interval = setInterval(() => {
            setUserCardIndex(prev => (prev + 1) % publicUsers.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [publicUsers]);

    // Oda adına göre görsel eşleştirme (sosyal medya tarzı olmayan, tematik fotoğraflar)
    const getRoomImage = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('müzik') || n.includes('muzik') || n.includes('akustik')) return 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=800&auto=format&fit=crop';
        if (n.includes('oyun') || n.includes('game') || n.includes('gamer')) return 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=800&auto=format&fit=crop';
        if (n.includes('geyik') || n.includes('muhabbet') || n.includes('goygoy')) return 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=800&auto=format&fit=crop';
        if (n.includes('sohbet') || n.includes('genel')) return 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop';
        if (n.includes('vip') || n.includes('özel') || n.includes('premium')) return 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=800&auto=format&fit=crop';
        if (n.includes('toplantı') || n.includes('meeting') || n.includes('konferans')) return 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop';
        if (n.includes('kafe') || n.includes('cafe') || n.includes('lounge')) return 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=800&auto=format&fit=crop';
        return 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop';
    };

    const fallbackRooms = [
        { id: 'genel', name: 'Genel Sohbet', slug: 'genel-sohbet', users: 12 },
        { id: 'muzik', name: 'Müzik Odası', slug: 'muzik-odasi', users: 8 },
        { id: 'oyun', name: 'Oyun Alanı', slug: 'oyun-alani', users: 5 },
    ];
    const [dbRooms, setDbRooms] = useState<any[]>([]);
    const rooms = dbRooms.length > 0 ? dbRooms : fallbackRooms;

    useEffect(() => {
        const saved = localStorage.getItem('soprano_landing_dark');
        if (saved === 'true') setDarkMode(true);
    }, []);

    // ¦¦ Avatar Seçenekleri ¦¦
    const avatarSeeds = ['Felix', 'Aneka', 'Luna', 'Max', 'Zoe', 'Leo', 'Mia', 'Kai', 'Nora', 'Sam', 'Lily', 'Oscar'];
    const getAvatarUrl = (seed: string, gender?: string) => generateGenderAvatar(seed, gender);

    const startEditing = () => {
        if (!loggedInUser) return;
        setEditName(loggedInUser.username);
        setEditEmail(loggedInUser.email || '');
        setEditPassword('');
        setEditAvatar(loggedInUser.avatar);
        setProfileMsg('');
        setProfileEditing(true);
    };

    const saveProfile = async () => {
        if (!loggedInUser || !editName.trim()) return;
        setProfileSaving(true); setProfileMsg('');
        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            if (token) {
                const body: any = { displayName: editName.trim(), avatar: editAvatar };
                if (loggedInUser.isMember) {
                    if (editEmail.trim()) body.email = editEmail.trim();
                    if (editPassword) body.password = editPassword;
                }
                const res = await fetch(`${API_URL}/auth/update-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
                if (res.ok) {
                    const data = await res.json();
                    if (data.access_token) localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
                    if (data.user) {
                        const updated = { ...loggedInUser, username: data.user.displayName || editName.trim(), avatar: data.user.avatar || editAvatar, email: data.user.email || loggedInUser.email, displayName: data.user.displayName || editName.trim() };
                        setAuthUser(updated); setLoggedInUser(updated);
                    }
                } else {
                    const updated = { ...loggedInUser, username: editName.trim(), avatar: editAvatar, email: editEmail.trim() || loggedInUser.email };
                    setAuthUser(updated); setLoggedInUser(updated);
                }
            } else {
                const updated = { ...loggedInUser, username: editName.trim(), avatar: editAvatar };
                setAuthUser(updated); setLoggedInUser(updated);
            }
            window.dispatchEvent(new Event('auth-change'));

            setProfileMsg('Profil güncellendi!');
            setTimeout(() => { setProfileEditing(false); setProfileMsg(''); }, 1200);
        } catch { setProfileMsg('Hata oluştu.'); } finally { setProfileSaving(false); }
    };

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            localStorage.setItem('soprano_landing_dark', (!prev).toString());
            return !prev;
        });
    };

    useEffect(() => {
        const checkAuth = () => {
            const user = getAuthUser();
            // Misafir kullanıcılar ana sayfaya döndüğünde oturumu temizle (güvenlik)
            if (user && !user.isMember) {
                console.info('[Auth] Guest session cleared on landing page visit.');
                clearAllSopranoAuth();
                setLoggedInUser(null);
                return;
            }
            setLoggedInUser(user);
        };
        checkAuth();
        window.addEventListener('auth-change', checkAuth);

        // Oda popup'ından çıkış mesajını dinle
        const handleRoomExit = (event: MessageEvent) => {
            if (event.data?.type === 'soprano-room-exit') {
                setShowExitConfirm(true);
            }
        };
        window.addEventListener('message', handleRoomExit);

        return () => {
            window.removeEventListener('auth-change', checkAuth);
            window.removeEventListener('message', handleRoomExit);
        };
    }, []);

    // Public endpoint  odaları login olmadan çek + 30 saniyede bir yenile
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

    // Beğeni ve bildirim sistemi — login sonrası
    useEffect(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!loggedInUser || !token) return;
        // Beğenilerimi çek
        fetch(`${API_URL}/rooms/public/my-likes`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => { if (Array.isArray(data)) setMyLikes(data); })
            .catch(() => { });
        // Bildirimleri çek
        fetch(`${API_URL}/rooms/public/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setNotifications(data);
                    setShowNotifToast(true);
                    // 8 sn sonra toast kapat + okundu işaretle
                    setTimeout(() => {
                        setShowNotifToast(false);
                        fetch(`${API_URL}/rooms/public/notifications/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => { });
                    }, 8000);
                }
            })
            .catch(() => { });
    }, [loggedInUser]);

    // Beğen/beğenme toggle
    const toggleLike = async (userId: string) => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!loggedInUser || !token || likeLoading) return;
        setLikeLoading(true);
        try {
            const isLiked = myLikes.includes(userId);
            if (isLiked) {
                await fetch(`${API_URL}/rooms/public/like/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                setMyLikes(prev => prev.filter(id => id !== userId));
            } else {
                await fetch(`${API_URL}/rooms/public/like`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ likedId: userId }) });
                setMyLikes(prev => [...prev, userId]);
            }
        } catch { } finally { setLikeLoading(false); }
    };

    // Müşterileri (tenant) public endpoint'ten çek
    useEffect(() => {
        fetch(`${API_URL}/tenants/public`)
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => { if (Array.isArray(data)) setTenants(data); })
            .catch(() => { });
    }, []);

    const openForm = (type: 'misafir' | 'giris' | 'kayit') => { setActiveForm(type); setShowButtons(false); setTimeout(() => setFormVisible(true), 50); };
    const closeForm = () => { setFormVisible(false); setActiveForm('none'); setShowButtons(true); };
    const switchForm = (type: 'misafir' | 'giris' | 'kayit') => { setActiveForm(type); };
    const handleLogout = () => { clearAllSopranoAuth(); setLoggedInUser(null); };

    const handleGuestLogin = async () => {
        const trimmed = guestNick.trim();
        if (!trimmed || trimmed.length < 2) { setGuestError('Takma ad en az 2 karakter olmalı.'); return; }
        setGuestError(''); setGuestLoading(true);
        localStorage.removeItem(AUTH_TOKEN_KEY); removeAuthUser();
        try {
            const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: trimmed, gender: guestGender }) });
            const data = await res.json();
            if (data.error) { setGuestError(data.error); return; }
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            const avatarUrl = generateGenderAvatar(trimmed, guestGender);
            const u = { userId: data.user.sub, username: data.user.username, avatar: data.user?.avatar || avatarUrl, isMember: false, role: 'guest' as const, gender: data.user?.gender || guestGender };
            setAuthUser(u); setLoggedInUser(u); window.dispatchEvent(new Event('auth-change'));
            // Giriş başarılı — hemen odaya yönlendir (landing page useEffect oturumu silmesin)
            window.location.href = '/room/genel-sohbet';
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
                const u = { userId: data.user?.sub || memberUsername.trim(), username: data.user?.displayName || memberUsername.trim(), avatar: data.user?.avatar || generateGenderAvatar(memberUsername.trim()), isMember: true, role: (data.user?.role || 'member') as any };
                setAuthUser(u); setLoggedInUser(u); window.dispatchEvent(new Event('auth-change'));
                closeForm();
            } else { setMemberError(data.message || 'Giriş başarısız.'); }
        } catch { setMemberError('Bağlantı hatası.'); } finally { setMemberLoading(false); }
    };

    const handleRegister = async () => {
        if (!regEmail.trim() || !regUsername.trim() || !regPassword) { setRegError('Tüm alanları doldurunuz.'); return; }
        if (regPassword.length < 4) { setRegError('Şifre en az 4 karakter.'); return; }
        setRegError(''); setRegLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail.trim(), username: regUsername.trim(), password: regPassword, gender: regGender }) });
            const data = await res.json();
            if (!res.ok) { setRegError(data.message || 'Kayıt başarısız.'); return; }
            if (data.access_token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
                setAuthUser({ userId: data.user?.sub || regUsername.trim(), username: data.user?.displayName || regUsername.trim(), avatar: data.user?.avatar || generateGenderAvatar(regUsername.trim(), regGender), isMember: true, role: 'member' as const });
                window.dispatchEvent(new Event('auth-change'));
                closeForm();
            } else { setRegError(data.message || 'Kayıt başarısız.'); }
        } catch { setRegError('Bağlantı hatası.'); } finally { setRegLoading(false); }
    };

    const openPricingModal = () => setShowPricingModal(true);
    const closePricingModal = () => setShowPricingModal(false);
    const openPaymentModal = (pkg: string) => { closePricingModal(); setPaymentCode('SPR-' + Math.random().toString(36).substring(2, 7).toUpperCase()); setPaymentPackageName(pkg); setShowPaymentModal(true); setPaymentSuccess(false); };
    const closePaymentModal = () => { setShowPaymentModal(false); setPaymentSuccess(false); };
    const completePayment = async () => {
        if (!orderFirstName.trim() || !orderLastName.trim() || !orderEmail.trim() || !orderPhone.trim()) {
            addToast('Lütfen tüm alanları doldurun.', 'error'); return;
        }
        if (hostingType === 'own_domain' && !customDomain.trim()) {
            addToast('Lütfen domain adresinizi yazın.', 'error'); return;
        }
        setPaymentSubmitting(true);
        try {
            const details = paymentPackageName === 'Özel Kurulum Paket' ? { rooms: customRooms, capacity: customCapacity, camera: customCam, meeting: customMeeting } : undefined;
            // Fiyat hesapla
            const roomPrices: Record<string, number> = { '1 Oda': 990, '2 Oda': 1790, '3 Oda': 2490, '5 Oda': 3490, '10 Oda': 5990, '15 Oda': 7990, '20 Oda': 9990, '25 Oda': 11990, '30 Oda': 13990, '40 Oda': 16990, '50 Oda': 19990, '75 Oda': 27990, '100 Oda': 34990 };
            const capPrices: Record<string, number> = { '30 Kişi': 0, '50 Kişi': 300, '100 Kişi': 790, '250 Kişi': 1490, '500 Kişi': 2990, 'Sınırsız': 5990 };
            const camPrice = customCam === 'Kameralı' ? 400 : 0;
            const meetPrice = customMeeting === 'Mevcut' ? 590 : 0;
            const calcAmount = paymentPackageName === 'Özel Kurulum Paket'
                ? (roomPrices[customRooms] || 990) + (capPrices[customCapacity] || 0) + camPrice + meetPrice
                : 0;
            await fetch(`${API_URL}/admin/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: orderFirstName.trim(),
                    lastName: orderLastName.trim(),
                    email: orderEmail.trim(),
                    phone: orderPhone.trim(),
                    packageName: paymentPackageName,
                    paymentCode,
                    hostingType,
                    customDomain: hostingType === 'own_domain' ? customDomain.trim() : null,
                    roomName: hostingType === 'own_domain' ? null : (orderRoomName.trim() || null),
                    logo: orderLogo || null,
                    details,
                    amount: calcAmount,
                }),
            });
            setPaymentSuccess(true);
        } catch {
            addToast('Sipariş gönderilemedi, lütfen tekrar deneyin.', 'error');
        } finally {
            setPaymentSubmitting(false);
        }
    };
    const copyText = (t: string) => { navigator.clipboard.writeText(t).catch(() => { }); addToast('Kopyalandı!', 'success'); };

    const goRoom = (slug?: string, _name?: string) => {
        const roomSlug = slug || rooms[0]?.slug || 'genel-sohbet';
        // Odayı sayfa içinde aç (SPA navigasyonu)
        router.push(`/room/${roomSlug}`);
    };
    const totalOnline = branding.stats?.onlineUsers || rooms.reduce((a, r) => a + (r.users || 0), 0) || 0;

    return (
        <div className="min-h-screen flex justify-center p-6 md:p-12" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#e2e8f0' }}>
            {/* Dalgalı Çöl Titanyum Arka Plan */}
            <div className="wavy-background">
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                <div className="sound-ring"></div>
                {/* Glow orbs */}
                <div className="wavy-bg-glow" style={{ width: 500, height: 500, top: '20%', left: '10%', background: 'rgba(6, 182, 212, 0.25)' }}></div>
                <div className="wavy-bg-glow" style={{ width: 550, height: 550, bottom: '10%', right: '5%', background: 'rgba(20, 184, 166, 0.35)', animationDelay: '3s' }}></div>
                <div className="wavy-bg-glow" style={{ width: 400, height: 400, top: '50%', left: '40%', background: 'rgba(34, 211, 238, 0.25)', animationDelay: '6s' }}></div>
                <div className="wavy-bg-glow" style={{ width: 350, height: 350, top: '10%', right: '30%', background: 'rgba(6, 182, 212, 0.20)', animationDelay: '9s' }}></div>
            </div>
            <ToastContainer />
            {/* Beğeni Bildirim Toast'ı */}
            {showNotifToast && notifications.length > 0 && (
                <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 animate-in slide-in-from-right" style={{ maxWidth: 360 }}>
                    {notifications.slice(0, 5).map((n, i) => (
                        <div key={n.id || i} className="flex items-center gap-3 p-3 rounded-2xl border shadow-xl backdrop-blur-xl" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(244, 63, 94, 0.3)', animation: `fadeIn 0.4s ${i * 0.1}s both` }}>
                            {n.fromAvatar && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={n.fromAvatar} alt="" className="w-8 h-8 rounded-full border border-pink-500/30" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{n.fromName || 'Birisi'}</p>
                                <p className="text-[10px] text-pink-400 flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> Seni beğendi!</p>
                            </div>
                            <button onClick={() => setShowNotifToast(false)} className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {notifications.length > 5 && (
                        <p className="text-[10px] text-slate-500 text-center">+{notifications.length - 5} bildirim daha</p>
                    )}
                </div>
            )}
            <div className={`landing-container transition-all duration-700 ease-out ${roomTransition ? 'opacity-0 scale-[0.96] pointer-events-none blur-sm' : ''}`}>
                {/* ¦¦ Dekoratif Arka Plan ¦¦ */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 -left-20 w-[600px] h-[600px] rounded-full mix-blend-screen blur-[80px] animate-blob opacity-15" style={{ background: 'rgba(6, 182, 212, 0.4)' }}></div>
                    <div className="absolute top-40 -right-20 w-[500px] h-[500px] rounded-full mix-blend-screen blur-[80px] animate-blob opacity-15" style={{ background: 'rgba(20, 184, 166, 0.25)', animationDelay: '2s' }}></div>
                    <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] rounded-full mix-blend-screen blur-[90px] animate-blob opacity-10" style={{ background: 'rgba(8, 145, 178, 0.4)', animationDelay: '4s' }}></div>
                </div>

                {/*  NAVBAR  */}
                <nav className="sticky top-0 w-full z-50 landing-glass-nav transition-all duration-300 rounded-t-[2.5rem]">
                    <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                        {/* === BRAND LOGO === */}
                        <div className="flex items-center cursor-pointer group -ml-4">
                            <SopranoChatLogo size="lg" animated showTagline />
                        </div>
                        {/* Pill Menü */}
                        <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-full border shadow-inner absolute left-1/2 -translate-x-1/2" style={{ background: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                            <button onClick={openPricingModal} className="landing-nav-btn px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 border border-transparent transition-all flex items-center gap-2"><Store className="w-4 h-4" /> Oda Satın Al</button>
                            <button onClick={() => setShowReferencesModal(true)} className="landing-nav-btn px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 border border-transparent transition-all flex items-center gap-2"><Star className="w-4 h-4" /> Referanslar</button>
                            <button onClick={() => setShowFaqModal(true)} className="landing-nav-btn px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 border border-transparent transition-all flex items-center gap-2"><HelpCircle className="w-4 h-4" /> SSS</button>
                            <button onClick={() => setShowContactModal(true)} className="landing-nav-btn px-5 py-2.5 rounded-full text-sm font-semibold text-slate-400 border border-transparent transition-all flex items-center gap-2"><Phone className="w-4 h-4" /> İletişim</button>
                        </div>
                        {/* Sağ  Online count + hamburger */}
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-400 px-4 py-2 rounded-full border shadow-sm" style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                {totalOnline.toLocaleString('tr-TR')} Çevrimiçi
                            </div>
                            {/* Hamburger  mobile only */}
                            <button className="mobile-hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Menüyü aç">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                            </button>
                        </div>
                    </div>
                </nav>

                {/* ¦¦ MOBILE FULLSCREEN MENU ¦¦ */}
                {mobileMenuOpen && (
                    <div className="mobile-menu-overlay">
                        <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)} aria-label="Menüyü kapat">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <button onClick={() => { setMobileMenuOpen(false); openPricingModal(); }}>
                            <Store className="w-5 h-5" /> Oda Satın Al
                        </button>
                        <button onClick={() => { setMobileMenuOpen(false); setShowReferencesModal(true); }}>
                            <Star className="w-5 h-5" /> Referanslar
                        </button>
                        <button onClick={() => { setMobileMenuOpen(false); setShowFaqModal(true); }}>
                            <HelpCircle className="w-5 h-5" /> SSS
                        </button>
                        <button onClick={() => { setMobileMenuOpen(false); setShowContactModal(true); }}>
                            <Phone className="w-5 h-5" /> İletişim
                        </button>
                        {/* Mobile online count inside menu */}
                        <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {totalOnline.toLocaleString('tr-TR')} Çevrimiçi
                        </div>
                    </div>
                )}

                {/*  HERO  */}
                <main className="relative z-10 flex-1 flex flex-col justify-center py-12 lg:py-20 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
                        {/* SOL */}
                        <div className="text-center lg:text-left relative z-20">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
                                Sesin Buluştuğu <br /><span className="landing-text-gradient">Dijital Sahne.</span>
                            </h1>
                            <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium max-w-lg mx-auto lg:mx-0">
                                Sıradan sohbet odalarını geride bırakın. Kameranızı açın, sahneye çıkın  gerçek insanlarla, gerçek anlar yaşayın.
                            </p>

                            {/* Giriş alanı / Profil kartı */}
                            {loggedInUser ? (
                                /* ¦¦¦ Giriş Yapıldı: Premium Profil Kartı ¦¦¦ */
                                <div className="w-full max-w-md mx-auto lg:mx-0">
                                    <div className="relative rounded-[1.75rem] border overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(139, 92, 246, 0.35)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                                        {/* Gradient üst şerit */}
                                        <div className="h-20 relative" style={{ background: 'linear-gradient(to right, #065a6e, #06b6d4, #67e8f9, #06b6d4, #065a6e)' }}>
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
                                            <div className="absolute -bottom-8 left-6">
                                                <div className="relative">
                                                    <img src={profileEditing ? editAvatar : loggedInUser.avatar} alt={loggedInUser.username} className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg object-cover bg-slate-200" />
                                                    {profileEditing ? (
                                                        <button onClick={() => { }} className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-white flex items-center justify-center" style={{ backgroundColor: '#06b6d4' }}>
                                                            <Camera className="w-3 h-3 text-white" />
                                                        </button>
                                                    ) : (
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-[3px] border-white" />
                                                    )}
                                                </div>
                                            </div>
                                            {/* Düzenle butonu (sağ üst) */}
                                            {!profileEditing && (
                                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-lg" style={{ color: '#67e8f9', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', textShadow: '0 0 8px rgba(204,34,34,0.4)' }}>Üye Paneli</span>
                                                    <button onClick={startEditing} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', color: '#67e8f9' }} title="Profili Düzenle">
                                                        <PenLine className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Profil bilgileri */}
                                        <div className="pt-12 pb-5 px-6">
                                            {!profileEditing ? (
                                                <>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-lg font-extrabold text-white tracking-tight">{loggedInUser.username}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${loggedInUser.isMember ? 'border-red-500/30' : 'border-slate-600 text-slate-400'}`} style={loggedInUser.isMember ? { color: '#67e8f9', background: 'rgba(6, 182, 212, 0.08)' } : { background: 'rgba(30, 41, 59, 0.6)' }}>
                                                                    {loggedInUser.isMember ? (loggedInUser.role === 'owner' ? '👑 Owner' : loggedInUser.role === 'admin' ? '🛡️ Admin' : loggedInUser.role === 'moderator' ? '⚡ Moderatör' : '✦ Üye') : '👤 Misafir'}
                                                                </span>
                                                                {loggedInUser.gender && (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${loggedInUser.gender === 'Erkek' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-pink-50 text-pink-500 border-pink-100'}`}>
                                                                        {loggedInUser.gender === 'Erkek' ? '♂' : '♀'} {loggedInUser.gender}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                            Çevrimiçi
                                                        </div>
                                                    </div>
                                                    {/* Aksiyon butonları */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button onClick={() => goRoom(rooms[0]?.slug, rooms[0]?.name || 'Genel Sohbet')} className="landing-btn-gold-primary py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2">
                                                            <ArrowRight className="w-4 h-4" /> Odaya Gir
                                                        </button>
                                                        <button onClick={handleLogout} className="py-3 rounded-xl font-bold text-sm hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-2 border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(100, 116, 139, 0.4)', color: '#94a3b8' }}>
                                                            <LogOut className="w-4 h-4" /> Çıkış
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                /* ¦¦¦ Düzenleme Modu ¦¦¦ */
                                                <div className="space-y-4">
                                                    {/* Avatar Seçici */}
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Avatar Seç</label>
                                                        <div className="grid grid-cols-6 gap-2">
                                                            {avatarSeeds.map(seed => (
                                                                <button key={seed} onClick={() => setEditAvatar(getAvatarUrl(seed))} className={`w-full aspect-square rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${editAvatar === getAvatarUrl(seed) ? 'ring-2 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`} style={editAvatar === getAvatarUrl(seed) ? { borderColor: '#2c4a7c', '--tw-ring-color': 'rgba(44,74,124,0.3)' } as any : undefined}>
                                                                    <img src={getAvatarUrl(seed)} alt={seed} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* İsim */}
                                                    <div>
                                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Görünür İsim</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><PenLine className="w-4 h-4 text-slate-400" /></div>
                                                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/30" />
                                                        </div>
                                                    </div>
                                                    {/* Üye: E-posta + Şifre */}
                                                    {loggedInUser.isMember && (
                                                        <>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">E-posta</label>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-slate-400" /></div>
                                                                    <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-posta adresiniz" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/30" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Yeni Şifre <span className="text-slate-400 normal-case">(boş bırakılırsa değişmez)</span></label>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-slate-400" /></div>
                                                                    <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/30" />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Mesaj */}
                                                    {profileMsg && <p className={`text-xs font-bold text-center ${profileMsg.includes('Hata') ? 'text-red-500' : 'text-green-600'}`}>{profileMsg}</p>}
                                                    {/* Kaydet / İptal */}
                                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                                        <button onClick={saveProfile} disabled={profileSaving} className="landing-btn-gold-primary py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                            {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Kaydet</>}
                                                        </button>
                                                        <button onClick={() => setProfileEditing(false)} className="py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(100, 116, 139, 0.4)', color: '#94a3b8' }}>
                                                            <X className="w-4 h-4" /> İptal
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
                                    {/* ¦¦¦ Misafir Girişi ¦¦¦ */}
                                    <div className={`landing-btn-expand border-2 rounded-2xl cursor-pointer shadow-sm hover:shadow-xl transition-all ${activeForm === 'misafir' ? 'expanded !cursor-default !max-h-[500px] col-span-2' : activeForm !== 'none' ? 'hidden' : 'px-8 py-4 hover:-translate-y-1'}`} style={activeForm === 'misafir' ? { background: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(6, 182, 212, 0.35)' } : activeForm === 'none' ? { background: 'rgba(15, 23, 42, 0.7)', borderColor: 'rgba(6, 182, 212, 0.3)' } : undefined}
                                        onClick={() => activeForm !== 'misafir' && openForm('misafir')}>
                                        {/* Buton İçeriği */}
                                        <div className={`landing-btn-content flex items-center justify-center gap-3 ${activeForm === 'misafir' ? 'h-0 opacity-0 overflow-hidden' : ''}`}>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.15)' }}><User className="w-4 h-4" style={{ color: '#06b6d4' }} /></div>
                                            <span className="font-bold text-lg" style={{ color: '#67e8f9' }}>Misafir Girişi</span>
                                        </div>
                                        {/* Genişleyen Form */}
                                        <div className={`landing-expand-form ${activeForm === 'misafir' ? '!max-h-[500px] !opacity-100' : ''}`}>
                                            <div className="landing-expand-header">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5" style={{ color: '#06b6d4' }} /> Misafir Katılımı</h3>
                                                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 transition-colors" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><PenLine className="w-4 h-4 text-slate-400" /></div>
                                                    <input type="text" value={guestNick} onChange={e => setGuestNick(e.target.value)} placeholder="Görünecek İsminiz" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setGuestGender('Erkek'); }} className={`gender-btn flex-1 py-2.5 border border-slate-600/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-400 transition-all hover:border-blue-400/50 ${guestGender === 'Erkek' ? 'active' : ''}`}><User className="w-4 h-4" /> Erkek</button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setGuestGender('Kadın'); }} className={`gender-btn flex-1 py-2.5 border border-slate-600/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-400 transition-all hover:border-pink-400/50 ${guestGender === 'Kadın' ? 'active-pink' : ''}`}><User className="w-4 h-4" /> Kadın</button>
                                                </div>
                                                {guestError && <p className="text-xs text-red-500 font-medium">{guestError}</p>}
                                                <button onClick={(e) => { e.stopPropagation(); handleGuestLogin(); }} disabled={guestLoading} className="landing-btn-gold-primary w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                    {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Odaya Katıl <ArrowRight className="w-4 h-4" /></>}
                                                </button>
                                                {/* Sosyal Giriş */}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-px bg-slate-600/40" />
                                                    <span className="text-[10px] text-slate-400 font-medium">veya</span>
                                                    <div className="flex-1 h-px bg-slate-600/40" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={e => { e.stopPropagation(); window.location.href = `${API_URL}/auth/google`; }} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                        Google
                                                    </button>
                                                    <button type="button" onClick={e => { e.stopPropagation(); window.location.href = `${API_URL}/auth/facebook`; }} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                                        Facebook
                                                    </button>
                                                    <button type="button" onClick={e => { e.stopPropagation(); window.location.href = `${API_URL}/auth/apple`; }} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#e2e8f0"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                                                        Apple
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ¦¦¦ Üye Girişi ¦¦¦ */}
                                    <div className={`landing-btn-expand rounded-2xl cursor-pointer shadow-lg transition-all ${activeForm === 'giris' || activeForm === 'kayit' ? 'expanded !cursor-default !max-h-[600px] border-2 col-span-2' : activeForm !== 'none' ? 'hidden' : 'px-8 py-4 text-white hover:-translate-y-1'}`} style={activeForm === 'giris' || activeForm === 'kayit' ? { background: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(6, 182, 212, 0.35)' } : activeForm === 'none' ? { background: 'linear-gradient(135deg, #06b6d4, #0891b2, #065a6e)', boxShadow: '0 10px 15px -3px rgba(6,182,212,0.3)' } : undefined}
                                        onClick={() => activeForm !== 'giris' && activeForm !== 'kayit' && openForm('giris')}>
                                        {/* Buton İçeriği */}
                                        <div className={`landing-btn-content flex items-center justify-center gap-3 ${activeForm === 'giris' || activeForm === 'kayit' ? 'h-0 opacity-0 overflow-hidden' : ''}`}>
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><LogIn className="w-4 h-4 text-white" /></div>
                                            <span className="font-bold text-lg">Üye Girişi</span>
                                        </div>
                                        {/* Genişleyen Form */}
                                        <div className={`landing-expand-form ${activeForm === 'giris' || activeForm === 'kayit' ? '!max-h-[600px] !opacity-100' : ''}`}>
                                            <div className="landing-expand-header">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    {activeForm === 'kayit' ? <><UserPlus className="w-5 h-5" style={{ color: '#06b6d4' }} /> Yeni Üyelik</> : <><LogIn className="w-5 h-5" style={{ color: '#06b6d4' }} /> Üye Girişi</>}
                                                </h3>
                                                <button onClick={(e) => { e.stopPropagation(); closeForm(); }} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 transition-colors" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-3.5 h-3.5" /></button>
                                            </div>

                                            {/* Üye Giriş Formu */}
                                            {activeForm === 'giris' && (
                                                <div className="space-y-3">
                                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-slate-400" /></div>
                                                        <input type="text" value={memberUsername} onChange={e => setMemberUsername(e.target.value)} placeholder="E-posta veya Kullanıcı Adı" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                    </div>
                                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-slate-400" /></div>
                                                        <input type="password" value={memberPassword} onChange={e => setMemberPassword(e.target.value)} placeholder="Şifreniz" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                    </div>
                                                    {memberError && <p className="text-xs text-red-500 font-medium">{memberError}</p>}
                                                    <button onClick={(e) => { e.stopPropagation(); handleMemberLogin(); }} disabled={memberLoading} className="landing-btn-gold-primary w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                        {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Giriş Yap <LogIn className="w-4 h-4" /></>}
                                                    </button>
                                                    <div className="text-center mt-2"><span className="text-xs text-slate-500">Hesabın yok mu? </span><button onClick={(e) => { e.stopPropagation(); switchForm('kayit'); }} className="text-xs font-bold hover:underline" style={{ color: '#06b6d4' }}>Hemen Üye Ol</button></div>
                                                </div>
                                            )}

                                            {/* Kayıt Formu */}
                                            {activeForm === 'kayit' && (
                                                <div className="space-y-3">
                                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><PenLine className="w-4 h-4 text-slate-400" /></div>
                                                        <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Görünecek İsminiz" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                    </div>
                                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="w-4 h-4 text-slate-400" /></div>
                                                        <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="E-posta Adresiniz" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                    </div>
                                                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="w-4 h-4 text-slate-400" /></div>
                                                        <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Şifre Belirleyin" className="w-full pl-11 pr-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all" onClick={e => e.stopPropagation()} />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setRegGender('Erkek'); }} className={`gender-btn flex-1 py-2.5 border border-slate-600/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-400 transition-all hover:border-blue-400/50 ${regGender === 'Erkek' ? 'active' : ''}`}><User className="w-4 h-4" /> Erkek</button>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setRegGender('Kadın'); }} className={`gender-btn flex-1 py-2.5 border border-slate-600/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-400 transition-all hover:border-pink-400/50 ${regGender === 'Kadın' ? 'active-pink' : ''}`}><User className="w-4 h-4" /> Kadın</button>
                                                    </div>
                                                    <label className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl cursor-pointer group hover:bg-slate-700/40 transition-colors" onClick={e => e.stopPropagation()}>
                                                        <div className="relative flex items-start pt-0.5"><input type="checkbox" className="w-4 h-4 rounded border-slate-600 cursor-pointer" style={{ accentColor: '#a855f7' }} /></div>
                                                        <span className="text-xs font-medium text-slate-400 leading-tight"><a href="#" className="hover:underline" style={{ color: '#c084fc' }}>Kullanım koşullarını</a> ve <a href="#" className="hover:underline" style={{ color: '#c084fc' }}>gizlilik politikasını</a> okudum, kabul ediyorum.</span>
                                                    </label>
                                                    {regError && <p className="text-xs text-red-500 font-medium">{regError}</p>}
                                                    <button onClick={(e) => { e.stopPropagation(); handleRegister(); }} disabled={regLoading} className="landing-btn-gold-primary w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                        {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Kayıt Ol ve Başla <Sparkles className="w-4 h-4" /></>}
                                                    </button>
                                                    {/* Sosyal Kayıt */}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-px bg-slate-600/40" />
                                                        <span className="text-[10px] text-slate-400 font-medium">veya ile kayıt ol</span>
                                                        <div className="flex-1 h-px bg-slate-600/40" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={e => e.stopPropagation()} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                        </button>
                                                        <button type="button" onClick={e => e.stopPropagation()} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                                        </button>
                                                        <button type="button" onClick={e => e.stopPropagation()} className="flex-1 py-2.5 rounded-xl border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/50 flex items-center justify-center gap-2 text-sm font-medium text-slate-300 transition-all">
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#e2e8f0"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                                                        </button>
                                                    </div>
                                                    <div className="text-center mt-2"><span className="text-xs text-slate-500">Zaten üye misin? </span><button onClick={(e) => { e.stopPropagation(); switchForm('giris'); }} className="text-xs font-bold hover:underline" style={{ color: '#06b6d4' }}>Giriş Yap</button></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 landing-animate-float hidden lg:block">
                            {/* Cyan-teal parlak gölge (hafif kırmızı dokunuş) */}
                            <div className="absolute -inset-6 rounded-[4rem] blur-3xl" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.6) 0%, rgba(20,184,166,0.5) 35%, rgba(200,60,60,0.12) 50%, rgba(6,182,212,0.45) 70%, rgba(14,165,233,0.35) 100%)', opacity: 0.7 }}></div>
                            <div className="absolute -inset-3 rounded-[3rem] blur-2xl" style={{ background: 'linear-gradient(160deg, rgba(34,211,238,0.4) 0%, rgba(6,182,212,0.5) 30%, rgba(180,50,50,0.08) 50%, rgba(20,184,166,0.45) 70%, rgba(13,148,136,0.3) 100%)', opacity: 0.55 }}></div>
                            {/* Kağıt çerçeve */}
                            <div className="relative rounded-[2.5rem] p-[6px] shadow-2xl" style={{
                                background: 'linear-gradient(145deg, #e8e4df 0%, #d4cfc8 15%, #c8c2ba 30%, #bfb8af 50%, #c8c2ba 70%, #d4cfc8 85%, #e8e4df 100%)',
                                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15)'
                            }}>
                                <div className="relative rounded-[2rem] overflow-hidden border border-slate-700 bg-slate-900">
                                    {/* Dönen Hero Görselleri */}
                                    <div className="relative w-full h-[500px]">
                                        {heroImages.map((src, idx) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={idx}
                                                src={src}
                                                alt={`SopranoChat ${idx + 1}`}
                                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
                                                style={{ opacity: heroIndex === idx ? 1 : 0 }}
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <div className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> CANLI
                                        </div>
                                    </div>
                                    {/* Dönen Kullanıcı Kartı */}
                                    <div className="absolute bottom-4 left-4 right-4 backdrop-blur-xl p-4 rounded-2xl shadow-lg flex items-center justify-between" style={{ background: 'rgba(15, 23, 42, 0.85)', borderColor: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={publicUsers.length > 0 ? (publicUsers[userCardIndex]?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${publicUsers[userCardIndex]?.displayName || 'user'}`) : 'https://api.dicebear.com/9.x/avataaars/svg?seed=SopranoUser'}
                                                    className="w-10 h-10 rounded-full border-2 border-white transition-all duration-500"
                                                    alt=""
                                                />
                                                {publicUsers.length > 0 && publicUsers[userCardIndex]?.isOnline ? (
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                                                ) : (
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="transition-all duration-500">
                                                <p className="font-bold text-sm text-white">{publicUsers.length > 0 ? publicUsers[userCardIndex]?.displayName : 'SopranoChat Üyesi'}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px]" style={{ color: publicUsers.length > 0 && publicUsers[userCardIndex]?.isOnline ? '#34d399' : '#94a3b8' }}>
                                                        {publicUsers.length > 0 && publicUsers[userCardIndex]?.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                                                    </p>
                                                    {publicUsers.length > 0 && publicUsers[userCardIndex]?._count?.likesReceived > 0 && (
                                                        <span className="text-[10px] text-pink-400 flex items-center gap-0.5">
                                                            <Heart className="w-2.5 h-2.5 fill-current" /> {publicUsers[userCardIndex]._count.likesReceived}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => publicUsers.length > 0 && toggleLike(publicUsers[userCardIndex]?.id)}
                                            disabled={likeLoading || !loggedInUser}
                                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40"
                                            style={{
                                                background: publicUsers.length > 0 && myLikes.includes(publicUsers[userCardIndex]?.id) ? 'rgba(244, 63, 94, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                                                color: publicUsers.length > 0 && myLikes.includes(publicUsers[userCardIndex]?.id) ? '#fb7185' : '#94a3b8',
                                                transform: publicUsers.length > 0 && myLikes.includes(publicUsers[userCardIndex]?.id) ? 'scale(1.15)' : 'scale(1)',
                                            }}
                                            title={!loggedInUser ? 'Beğenmek için giriş yapın' : publicUsers.length > 0 && myLikes.includes(publicUsers[userCardIndex]?.id) ? 'Beğeniyi geri al' : 'Beğen'}
                                        >
                                            <Heart className="w-4 h-4 fill-current" />
                                        </button>
                                    </div>
                                    {/* Görsel İndikatörleri */}
                                    <div className="absolute top-4 left-4 flex gap-1.5">
                                        {heroImages.map((_, idx) => (
                                            <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === idx ? 'bg-white w-6' : 'bg-white/50'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main >

                {/* == POPÜLER ODALAR == */}
                <section className="relative z-10 py-20 px-6" style={{ background: 'rgba(2, 6, 23, 0.9)' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Şu An <span className="landing-text-gradient">Popüler Odalar</span></h2>
                                <p className="text-slate-400 mt-2 font-medium text-lg">Hemen bir odaya katılın ve anın tadını çıkarın.</p>
                            </div>
                            <button onClick={() => loggedInUser ? goRoom() : openForm('misafir')} className="landing-btn-gold-outline px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">Tüm Odaları Gör <ArrowRight className="w-4 h-4" /></button>
                        </div>
                        <div className={`room-cards-grid grid grid-cols-1 ${rooms.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : rooms.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'} gap-8`}>
                            {rooms.map((rm, i) => {
                                // Oda adına göre tema eşleştirme
                                const name = (rm.name || '').toLowerCase();
                                const visual = name.includes('müzik') || name.includes('muzik') || name.includes('akustik')
                                    ? { gradientStyle: 'linear-gradient(to bottom right, #9333ea, #ec4899, #fb7185)', Icon: Music, label: 'Dinleyici' }
                                    : name.includes('oyun') || name.includes('game') || name.includes('gamer')
                                        ? { gradientStyle: 'linear-gradient(to bottom right, #2563eb, #06b6d4, #14b8a6)', Icon: Gamepad2, label: 'Oyuncu' }
                                        : name.includes('vip') || name.includes('özel') || name.includes('premium')
                                            ? { gradientStyle: 'linear-gradient(to bottom right, #f59e0b, #f97316, #67e8f9)', Icon: Crown, label: 'VIP Üye' }
                                            : name.includes('toplantı') || name.includes('meeting') || name.includes('konferans')
                                                ? { gradientStyle: 'linear-gradient(to bottom right, #4f46e5, #3b82f6, #38bdf8)', Icon: Video, label: 'Katılımcı' }
                                                : name.includes('kafe') || name.includes('cafe') || name.includes('lounge')
                                                    ? { gradientStyle: 'linear-gradient(to bottom right, #059669, #22c55e, #84cc16)', Icon: MessageSquare, label: 'Kişi' }
                                                    : name.includes('sohbet') || name.includes('goygoy') || name.includes('muhabbet') || name.includes('genel')
                                                        ? { gradientStyle: 'linear-gradient(to bottom right, #0284c7, #3b82f6, #6366f1)', Icon: Users, label: 'Kişi' }
                                                        : name.includes('geyik')
                                                            ? { gradientStyle: 'linear-gradient(to bottom right, #e11d48, #ec4899, #d946ef)', Icon: Headphones, label: 'Kişi' }
                                                            : i % 3 === 0
                                                                ? { gradientStyle: 'linear-gradient(to bottom right, #0284c7, #3b82f6, #6366f1)', Icon: Users, label: 'Kişi' }
                                                                : i % 3 === 1
                                                                    ? { gradientStyle: 'linear-gradient(to bottom right, #e11d48, #ec4899, #d946ef)', Icon: Headphones, label: 'Kişi' }
                                                                    : { gradientStyle: 'linear-gradient(to bottom right, #7c3aed, #a855f7, #6366f1)', Icon: Star, label: 'Kişi' };

                                return (
                                    <div key={rm.id || i} className="group rounded-3xl border overflow-hidden hover:-translate-y-2 transition-all duration-300" style={{ background: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(51, 65, 85, 0.5)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}>
                                        {/* Oda Görseli  Fotoğraf + Gradient Overlay */}
                                        <div className="h-32 relative overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={getRoomImage(rm.name)} alt={rm.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0" style={{ background: visual.gradientStyle, opacity: 0.55 }}></div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-15">
                                                <visual.Icon className="w-20 h-20 text-white" />
                                            </div>
                                            <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> CANLI
                                            </div>
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <h3 className="text-lg font-bold text-white drop-shadow-md">{rm.name}</h3>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex -space-x-3">
                                                    {[1, 2, 3].map(n => (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img key={n} src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${rm.slug || rm.name}-${n}`} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700" alt="" />
                                                    ))}
                                                    {(rm.users || 0) > 3 && <div className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400" style={{ background: 'rgba(30, 41, 59, 0.8)' }}>+{(rm.users || 0) - 3}</div>}
                                                </div>
                                                <div className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border" style={{ color: '#67e8f9', background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                                                    <visual.Icon className="w-3.5 h-3.5" />
                                                    {rm.users || 0} {visual.label}
                                                </div>
                                            </div>
                                            <button onClick={() => loggedInUser ? goRoom(rm.slug, rm.name) : openForm('misafir')} className="landing-btn-gold-outline w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-md">
                                                Odaya Katıl <LogIn className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section >

                {/* == MÜŞTERİ PLATFORMLARI == */}
                {(() => {
                    const platformTenants = tenants
                        .filter((t: any) => t.hostingType !== 'own_domain')
                        .sort((a: any, b: any) => ((b._count?.users || 0) + (b._count?.rooms || 0)) - ((a._count?.users || 0) + (a._count?.rooms || 0)));
                    const showAll = showAllPlatforms;
                    const visibleTenants = showAll ? platformTenants : platformTenants.slice(0, 4);
                    const hasMore = platformTenants.length > 4;

                    return platformTenants.length > 0 && (
                        <section className="relative z-10 py-16 px-6" style={{ background: 'linear-gradient(to bottom, rgba(2, 6, 23, 0.7), rgba(15, 23, 42, 0.9))' }}>
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Müşteri <span className="landing-text-gradient">Platformları</span></h2>
                                        <p className="text-slate-400 mt-2 font-medium text-lg">SopranoChat altyapısıyla çalışan sohbet odalarına katılın.</p>
                                    </div>
                                    {hasMore && (
                                        <button
                                            onClick={() => setShowAllPlatforms(p => !p)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border whitespace-nowrap"
                                            style={{
                                                color: '#67e8f9',
                                                background: 'rgba(6, 182, 212, 0.08)',
                                                borderColor: 'rgba(6, 182, 212, 0.25)',
                                            }}
                                        >
                                            {showAll ? (
                                                <><ChevronUp className="w-4 h-4" /> Daralt</>
                                            ) : (
                                                <><ChevronDown className="w-4 h-4" /> Tümünü Gör ({platformTenants.length})</>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {visibleTenants.map((t: any) => {
                                        const accessUrl = `/t/${t.accessCode || t.slug}`;
                                        return (
                                            <a key={t.id} href={accessUrl} target="_blank" rel="noopener noreferrer" className="group block rounded-2xl border overflow-hidden hover:-translate-y-1 transition-all duration-300" style={{ background: 'rgba(15, 23, 42, 0.7)', borderColor: 'rgba(51, 65, 85, 0.5)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                                                <div className="p-5">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {t.logoUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={t.logoUrl} alt={t.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ background: 'linear-gradient(to bottom right, #065a6e, #06b6d4)' }}>{(t.displayName || t.name)?.charAt(0)?.toUpperCase()}</div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-white text-sm truncate transition-colors">{t.displayName || t.name}</h3>
                                                            {t.firstRoom && <p className="text-[11px] text-slate-400 truncate">Oda: {t.firstRoom.name}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t._count?.users || 0}</span>
                                                            <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {t._count?.rooms || 0} oda</span>
                                                        </div>
                                                        <div className="text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors" style={{ color: '#67e8f9', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)', boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2), 0 0 15px rgba(6, 182, 212, 0.1)' }}>
                                                            Katıl
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    );
                })()}

                {/* == İSTATİSTİKLER == */}
                <section className="relative z-10 border-y backdrop-blur-md py-12" style={{ borderColor: 'rgba(6, 182, 212, 0.12)', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { val: formatK(branding.stats?.userCount ?? 0), label: 'Toplam Kullanıcı', Icon: Users, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                            { val: formatK(branding.stats?.roomCount ?? 0), label: 'Aktif Oda', Icon: Video, color: 'text-red-300', bg: 'bg-red-400/10', border: 'border-red-400/20' },
                            { val: formatK(branding.stats?.messageCount ?? 0), label: 'Toplam Mesaj', Icon: Mic, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                            { val: '%100', label: 'Güvenli ve Moderatörlü', Icon: ShieldCheck, color: 'text-rose-300', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
                        ].map((s, i) => (
                            <div key={i} className="flex flex-col items-center justify-center space-y-2">
                                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.color} mb-2 border ${s.border}`}><s.Icon className="w-6 h-6" /></div>
                                <h4 className="text-3xl font-extrabold text-white">{s.val}</h4>
                                <p className="text-sm font-bold text-slate-400">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* == FOOTER == */}
                <footer className="relative z-10 border-t pt-12 pb-8 mt-auto" style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(6, 182, 212, 0.12)' }}>
                    <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">

                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
                            <button onClick={() => setShowAboutModal(true)} className="landing-footer-btn text-slate-500 font-bold transition-colors text-sm">Hakkımızda</button>
                            <button onClick={() => setShowRulesModal(true)} className="landing-footer-btn text-slate-500 font-bold transition-colors text-sm">Topluluk Kuralları</button>
                            <button onClick={() => setShowPrivacyModal(true)} className="landing-footer-btn text-slate-500 font-bold transition-colors text-sm">Gizlilik Politikası</button>
                            <button onClick={() => setShowContactModal(true)} className="landing-footer-btn text-slate-500 font-bold transition-colors text-sm">İletişim</button>
                        </div>
                        <p className="text-slate-600 text-xs font-medium">&copy; 2026 SopranoChat. Tüm hakları saklıdır.</p>
                    </div>
                </footer>
            </div >

            {/* == HAKKIMIZDA MODALI == */}
            {
                showAboutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}></div>
                        <div className="relative w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => setShowAboutModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to top right, #2c4a7c, #c8962e)' }}><HeartHandshake className="text-white w-6 h-6" /></div>
                                    <h2 className="text-2xl font-extrabold text-white">Hakkımızda</h2>
                                </div>
                                <div className="space-y-4 text-slate-400 leading-relaxed">
                                    <p className="text-base"><strong className="text-white">SopranoChat</strong>, insanları sesli sohbet odalarında bir araya getiren yeni nesil bir iletişim platformudur. Amacımız, teknolojinin gücünü kullanarak mesafeleri ortadan kaldırmak ve herkesin güvenle sesini duyurabileceği bir alan yaratmaktır. Müzik dinlemekten oyun oynamaya, samimi sohbetlerden iş toplantılarına kadar geniş bir yelpazede kullanıcılarımıza benzersiz bir deneyim sunuyoruz.</p>
                                    <p className="text-base">Platformumuz, şeffaflık, güvenlik ve kullanıcı memnuniyetini temel ilkeleri olarak benimser. Gelişmiş moderasyon araçlarımız ve topluluk kurallarımızla her kullanıcının rahat ve huzurlu hissedeceği bir ortam oluşturuyoruz. SopranoChat olarak, sosyal etkileşimi zenginleştirmek ve küresel bir topluluk inşa etmek için çalışıyoruz. Türkiye'nin en yenilikçi sesli sohbet platformu olma vizyonuyla yolculuğumuza devam ediyoruz.</p>
                                    <div className="mt-6 p-4 rounded-2xl border" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                                        <p className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Kuruluş: 2026 | Merkez: Türkiye | Kullanıcı Sayısı: 12.000+</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == TOPLULUK KURALLARI MODALI == */}
            {
                showRulesModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRulesModal(false)}></div>
                        <div className="relative w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => setShowRulesModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg"><ShieldCheck className="text-white w-6 h-6" /></div>
                                    <h2 className="text-2xl font-extrabold text-white">Topluluk Kuralları</h2>
                                </div>
                                <p className="text-slate-400 mb-6">SopranoChat topluluğunun güvenli ve keyifli bir yer olması için aşağıdaki kurallara uyulması gerekmektedir.</p>
                                <div className="space-y-3">
                                    {[
                                        { icon: '\u{1F91D}', title: 'Saygılı İletişim', desc: 'Diğer kullanıcılara her zaman saygılı ve nazik davranın. Hakaret, aşağılama ve ayrımcılık kesinlikle yasaktır.' },
                                        { icon: '\u{1F6AB}', title: 'Spam ve Reklam Yasağı', desc: 'Odalarda izinsiz reklam, tekrarlayan mesajlar veya spam içerik paylaşmak yasaktır.' },
                                        { icon: '\u{26D4}', title: 'Uygunsuz İçerik Yasağı', desc: 'Müstehcen, şiddet içeren veya yasa dışı içeriklerin paylaşılması kesinlikle yasaktır.' },
                                        { icon: '\u{1F3AD}', title: 'Kimlik Taklidi Yasağı', desc: 'Başka bir kullanıcının, ünlünün veya yetkili kişinin kimliğine bürünmek yasaktır.' },
                                        { icon: '\u{1F512}', title: 'Kişisel Bilgi Güvenliği', desc: 'Başka kullanıcıların kişisel bilgilerini paylaşmak veya talep etmek yasaktır.' },
                                        { icon: '\u{00A9}\u{FE0F}', title: 'Telif Haklarına Saygı', desc: 'Telif hakkıyla korunan içerikleri izinsiz paylaşmak yasaktır.' },
                                        { icon: '\u{1F46E}', title: 'Moderatör Kararlarına Uyma', desc: 'Moderatörlerin aldığı kararlara saygı gösterilmelidir. İtirazlar uygun kanallardan yapılmalıdır.' },
                                        { icon: '\u{1F6E1}\u{FE0F}', title: 'Güvenlik', desc: 'Zararlı bağlantılar, virüs veya kötü amaçlı yazılım paylaşımı kesinlikle yasaktır.' },
                                        { icon: '\u{1F4C5}', title: 'Yaş Sınırı', desc: 'SopranoChat\'ı kullanabilmek için en az 13 yaşında olmanız gerekmektedir.' },
                                        { icon: '\u{1F3E0}', title: 'Oda Kurallarına Uyum', desc: 'Her odanın kendine özel kuralları olabilir. Oda sahiplerinin belirlediği kurallara uymak zorunludur.' },
                                    ].map((rule, i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl border transition-colors" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.4)' }}>
                                            <span className="text-2xl flex-shrink-0 mt-0.5">{rule.icon}</span>
                                            <div>
                                                <h3 className="font-bold text-white text-sm">{rule.title}</h3>
                                                <p className="text-slate-400 text-xs mt-0.5">{rule.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 p-4 rounded-2xl border" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                    <p className="text-xs text-red-400 font-semibold">{"\u26A0\uFE0F"} Kurallara uymayan kullanıcılar uyarılır, tekrar edilmesi durumunda geçici veya kalıcı olarak uzaklaştırılır.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == GİZLİLİK POLİTİKASI MODALI == */}
            {
                showPrivacyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPrivacyModal(false)}></div>
                        <div className="relative w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"><Lock className="text-white w-6 h-6" /></div>
                                    <h2 className="text-2xl font-extrabold text-white">Gizlilik Politikası</h2>
                                </div>
                                <p className="text-slate-400 mb-6 text-sm">Son güncelleme: Şubat 2026</p>
                                <div className="space-y-6 text-slate-400">
                                    <div>
                                        <h3 className="font-bold text-white mb-2">1. Toplanan Veriler</h3>
                                        <p className="text-sm leading-relaxed">SopranoChat, hizmetlerimizi sunabilmek için kullanıcı adı, e-posta adresi, profil bilgileri ve oturum verileri gibi temel bilgileri toplar. Sesli sohbet içerikleri sunucularımızda kayıt altına alınmaz ve saklanmaz.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">2. Verilerin Kullanımı</h3>
                                        <p className="text-sm leading-relaxed">Toplanan veriler yalnızca hizmet kalitesini artırmak, güvenliği sağlamak ve kullanıcı deneyimini iyileştirmek amacıyla kullanılır. Kişisel verileriniz hiçbir koşulda üçüncü taraflarla ticari amaçla paylaşılmaz.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">3. Çerezler</h3>
                                        <p className="text-sm leading-relaxed">Platformumuz, oturum yönetimi ve tercih kaydetme amacıyla çerezler kullanır. Çerez ayarlarınızı tarayıcınız üzerinden yönetebilirsiniz.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">4. Veri Güvenliği</h3>
                                        <p className="text-sm leading-relaxed">Verileriniz endüstri standardı şifreleme yöntemleriyle korunmaktadır. SSL/TLS sertifikaları ile tüm veri iletişimi güvenli bir şekilde gerçekleştirilir.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">5. Kullanıcı Hakları (KVKK)</h3>
                                        <p className="text-sm leading-relaxed">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında; verilerinize erişim, düzeltme, silme ve taşıma haklarına sahipsiniz. Bu haklarınızı kullanmak için iletişim sayfamızdan bize ulaşabilirsiniz.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-2">6. Değişiklikler</h3>
                                        <p className="text-sm leading-relaxed">Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişikliklerde kullanıcılarımız bilgilendirilecektir.</p>
                                    </div>
                                </div>
                                <div className="mt-6 p-4 rounded-2xl border" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                    <p className="text-xs text-emerald-400 font-semibold">{"\uD83D\uDD12"} SopranoChat, kullanıcı gizliliğini en yüksek öncelik olarak kabul eder.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == FİYATLANDIRMA MODALI == */}
            {
                showPricingModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closePricingModal}></div>
                        <div className="relative w-full max-w-[1050px] max-h-[95vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={closePricingModal} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-6 md:p-8">
                                <div className="text-center mb-8 relative z-10">
                                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-2">İhtiyacınıza <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #67e8f9, #06b6d4)' }}>Uygun Paket</span></h2>
                                    <p className="text-slate-400 text-sm font-medium">Kesintisiz ve güvenli iletişiminizi hemen oluşturun.</p>
                                    <div className="mt-6 inline-flex items-center p-1 border rounded-full shadow-sm" style={{ background: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                        <button onClick={() => setPricingYearly(false)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!pricingYearly ? 'text-white shadow-md' : 'text-slate-400 hover:text-white'}`} style={!pricingYearly ? { background: 'linear-gradient(135deg, #06b6d4, #0891b2)' } : undefined}>Aylık</button>
                                        <button onClick={() => setPricingYearly(true)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${pricingYearly ? 'text-white shadow-md' : 'text-slate-400 hover:text-white'}`} style={pricingYearly ? { background: 'linear-gradient(135deg, #06b6d4, #0891b2)' } : undefined}>Yıllık <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">2 Ay Hediye 🎁</span></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
                                    {/* Paket 1 */}
                                    <div className="rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-shadow flex flex-col" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}><Mic className="w-5 h-5" /></div><h3 className="text-lg font-extrabold text-white">Ses + Metin</h3></div>
                                        <div className="mb-4"><div className="flex items-end gap-1"><span className="text-3xl font-extrabold text-white">{pricingYearly ? '9.900' : '990'}</span><span className="text-lg font-bold text-white">₺</span><span className="text-xs font-medium text-slate-400 mb-1">/{pricingYearly ? 'yıl' : 'ay'}</span></div></div>
                                        <div className="space-y-3 mb-6 flex-1">{['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'].map((f, j) => <div key={j} className="flex items-start gap-2 text-xs text-slate-400 font-medium"><Check className="w-4 h-4 shrink-0" style={{ color: '#67e8f9' }} />{f}</div>)}</div>
                                        <button onClick={() => openPaymentModal('Ses + Metin Paketi')} className="landing-btn-gold-outline w-full py-3 rounded-xl font-bold text-sm transition-colors">Satın Al</button>
                                    </div>
                                    {/* Paket 2 */}
                                    <div className="rounded-2xl p-6 border-2 shadow-xl flex flex-col relative overflow-hidden md:-translate-y-2" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: '#06b6d4', boxShadow: '0 20px 25px -5px rgba(6,182,212,0.15)' }}>
                                        <div className="absolute top-0 right-0 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider" style={{ backgroundColor: '#06b6d4' }}>Popüler</div>
                                        <div className="flex items-center gap-3 mb-4 mt-2"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: '#06b6d4', boxShadow: '0 4px 6px -1px rgba(6,182,212,0.25)' }}><Video className="w-5 h-5" /></div><h3 className="text-lg font-extrabold text-white">Kamera + Ses</h3></div>
                                        <div className="mb-4"><div className="flex items-end gap-1"><span className="text-3xl font-extrabold" style={{ color: '#67e8f9' }}>{pricingYearly ? '13.900' : '1.390'}</span><span className="text-lg font-bold" style={{ color: '#67e8f9' }}>₺</span><span className="text-xs font-medium text-slate-400 mb-1">/{pricingYearly ? 'yıl' : 'ay'}</span></div></div>
                                        <div className="space-y-3 mb-6 flex-1">
                                            <div className="flex items-start gap-2 text-xs text-white font-bold"><Check className="w-4 h-4 shrink-0" style={{ color: '#67e8f9' }} />Standart paketteki tüm özellikler</div>
                                            {['Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'].map((f, j) => <div key={j} className="flex items-start gap-2 text-xs text-slate-400 font-medium"><Check className="w-4 h-4 shrink-0" style={{ color: '#67e8f9' }} />{f}</div>)}
                                        </div>
                                        <button onClick={() => openPaymentModal('Kamera + Ses Premium')} className="landing-btn-gold-primary w-full py-3 rounded-xl text-sm font-bold shadow-md transition-all">Hemen Başla</button>
                                    </div>
                                    {/* Paket 3 */}
                                    <div className="rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-shadow flex flex-col relative overflow-hidden" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                        <div className="absolute top-0 right-0 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider" style={{ background: '#06b6d4' }}>Bayi</div>
                                        <div className="flex items-center gap-3 mb-4 mt-2"><div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}><Crown className="w-5 h-5" /></div><h3 className="text-lg font-extrabold text-white">White Label</h3></div>
                                        <div className="mb-4"><div className="flex items-end gap-1"><span className="text-3xl font-extrabold text-white">{pricingYearly ? '69.900' : '6.990'}</span><span className="text-lg font-bold text-white">₺</span><span className="text-xs font-medium text-slate-400 mb-1">/{pricingYearly ? 'yıl' : 'ay'}</span></div></div>
                                        <div className="space-y-3 mb-6 flex-1">{['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'].map((f, j) => <div key={j} className="flex items-start gap-2 text-xs text-slate-400 font-medium"><Check className="w-4 h-4 shrink-0" style={{ color: '#67e8f9' }} />{f}</div>)}</div>
                                        <button onClick={() => openPaymentModal('White Label Bayi Paketi')} className="landing-btn-gold-outline w-full py-3 rounded-xl font-bold text-sm transition-colors">Satın Al</button>
                                    </div>
                                </div>
                                {/* Özel Paket */}
                                <div className="mt-6 relative overflow-visible pb-8">
                                    <div className="bg-gradient-to-br from-[#0891b2] via-[#06b6d4] to-[#67e8f9] rounded-3xl p-[1px]">
                                        <div className="rounded-3xl p-6" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                                            {/* Üst: Başlık */}
                                            <div className="flex items-center justify-between mb-5">
                                                <div>
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #67e8f9, #06b6d4)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(6,182,212,0.25)' }}><SlidersHorizontal className="w-3 h-3" /> Özel Yapılandırma</div>
                                                    <h3 className="text-xl font-extrabold text-white">Kendi Paketini Oluştur</h3>
                                                    <p className="text-sm text-slate-400 font-medium mt-0.5">İhtiyacın kadar oda, dilediğin kadar limit.</p>
                                                </div>
                                                <button onClick={() => openPaymentModal('Özel Kurulum Paket')} className="landing-btn-gold-primary hidden md:flex px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all items-center gap-2">Hesapla &amp; Al <ArrowRight className="w-4 h-4" /></button>
                                            </div>
                                            {/* Seçiciler  2x2 grid */}
                                            {(() => {
                                                const selectConfigs = [
                                                    { label: 'Oda Sayısı', val: customRooms, set: setCustomRooms, opts: ['1 Oda', '2 Oda', '3 Oda', '5 Oda', '10 Oda', '15 Oda', '20 Oda', '25 Oda', '30 Oda', '40 Oda', '50 Oda', '75 Oda', '100 Oda'], icon: '🏠' },
                                                    { label: 'Oda Başına Kişi Limiti', val: customCapacity, set: setCustomCapacity, opts: ['30 Kişi', '50 Kişi', '100 Kişi', '250 Kişi', '500 Kişi', 'Sınırsız'], icon: '👥' },
                                                    { label: 'Kamera Özelliği', val: customCam, set: setCustomCam, opts: ['Kameralı', 'Kamerasız (Sadece Ses)'], icon: '📷' },
                                                    { label: 'Toplantı Modu', val: customMeeting, set: setCustomMeeting, opts: ['Mevcut', 'İstemiyorum'], icon: '🤝' },
                                                ];
                                                return (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {selectConfigs.map((s, i) => (
                                                            <div key={i} className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const btn = e.currentTarget;
                                                                        const rect = btn.getBoundingClientRect();
                                                                        // Close all panels first
                                                                        document.querySelectorAll('[data-panel]').forEach(p => {
                                                                            (p as HTMLElement).style.opacity = '0';
                                                                            (p as HTMLElement).style.pointerEvents = 'none';
                                                                        });
                                                                        const panel = btn.parentElement?.querySelector('[data-panel]') as HTMLElement;
                                                                        if (panel) {
                                                                            const wasOpen = panel.getAttribute('data-open') === '1';
                                                                            if (!wasOpen) {
                                                                                panel.style.position = 'fixed';
                                                                                panel.style.left = rect.left + 'px';
                                                                                panel.style.top = (rect.bottom + 6) + 'px';
                                                                                panel.style.width = Math.max(rect.width, 200) + 'px';
                                                                                panel.style.opacity = '1';
                                                                                panel.style.pointerEvents = 'auto';
                                                                                panel.setAttribute('data-open', '1');
                                                                            } else {
                                                                                panel.setAttribute('data-open', '0');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="w-full border-2 px-4 py-3 rounded-2xl transition-all duration-200 text-left group" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }}
                                                                >
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#67e8f9' }}>{s.icon} {s.label}</div>
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-[13px] font-extrabold text-white">{s.val}</span>
                                                                        <ChevronDown className="w-4 h-4 transition-colors flex-shrink-0" style={{ color: '#c8962e' }} />
                                                                    </div>
                                                                </button>
                                                                <div
                                                                    data-panel
                                                                    data-open="0"
                                                                    style={{ opacity: 0, pointerEvents: 'none' as const, position: 'fixed', zIndex: 9999, transition: 'opacity 0.15s ease', borderColor: 'rgba(6, 182, 212, 0.25)', background: 'rgba(15, 23, 42, 0.95)' }}
                                                                    className="rounded-2xl shadow-2xl shadow-black/30 border overflow-hidden"
                                                                >
                                                                    <div className="p-1.5 max-h-[240px] overflow-y-auto">
                                                                        {s.opts.map(o => (
                                                                            <button
                                                                                key={o}
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    s.set(o);
                                                                                    const panel = e.currentTarget.closest('[data-panel]') as HTMLElement;
                                                                                    if (panel) {
                                                                                        panel.style.opacity = '0';
                                                                                        panel.style.pointerEvents = 'none';
                                                                                        panel.setAttribute('data-open', '0');
                                                                                    }
                                                                                }}
                                                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${s.val === o
                                                                                    ? 'text-white shadow-sm'
                                                                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                                                                    }`} style={s.val === o ? { background: 'linear-gradient(135deg, #06b6d4, #065a6e)' } : undefined}
                                                                            >
                                                                                {s.val === o && <Check className="w-3 h-3 flex-shrink-0" />}
                                                                                <span className="whitespace-nowrap">{o}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            {/* Mobil buton */}
                                            <button onClick={() => openPaymentModal('Özel Kurulum Paket')} className="md:hidden w-full mt-4 px-6 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2c4a7c)', boxShadow: '0 20px 25px -5px rgba(44,74,124,0.3)' }}>Hesapla & Al <ArrowRight className="w-4 h-4" /></button>
                                            {/* ¦¦ Dinamik Fiyat Hesaplama ¦¦ */}
                                            {(() => {
                                                const roomPrices: Record<string, number> = { '1 Oda': 990, '2 Oda': 1790, '3 Oda': 2490, '5 Oda': 3490, '10 Oda': 5990, '15 Oda': 7990, '20 Oda': 9990, '25 Oda': 11990, '30 Oda': 13990, '40 Oda': 16990, '50 Oda': 19990, '75 Oda': 27990, '100 Oda': 34990 };
                                                const capPrices: Record<string, number> = { '30 Kişi': 0, '50 Kişi': 300, '100 Kişi': 790, '250 Kişi': 1490, '500 Kişi': 2990, 'Sınırsız': 5990 };
                                                const rp = roomPrices[customRooms] || 990;
                                                const cp = capPrices[customCapacity] || 0;
                                                const camp = customCam === 'Kameralı' ? 400 : 0;
                                                const mp = customMeeting === 'Mevcut' ? 590 : 0;
                                                const monthly = rp + cp + camp + mp;
                                                const yearly = monthly * 10;
                                                const lines = [
                                                    { label: `📦 ${customRooms}`, price: rp },
                                                    ...(cp > 0 ? [{ label: `👥 ${customCapacity}`, price: cp }] : []),
                                                    ...(camp > 0 ? [{ label: '📷 Kamera', price: camp }] : []),
                                                    ...(mp > 0 ? [{ label: '🤝 Toplantı Modu', price: mp }] : []),
                                                ];
                                                return (
                                                    <div className="mt-5 rounded-2xl border p-5" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #065a6e)' }}><span className="text-white text-xs">₺</span></div>
                                                            <h4 className="text-sm font-extrabold text-white">Tahmini Fiyatlandırma</h4>
                                                        </div>
                                                        <div className="space-y-1.5 mb-3">
                                                            {lines.map((l, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-400 font-medium">{l.label}</span>
                                                                    <span className="text-slate-300 font-bold">+{l.price.toLocaleString('tr-TR')} ₺</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="border-t pt-3 flex justify-between items-end" style={{ borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#67e8f9' }}>Aylık</p>
                                                                <p className="text-2xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #67e8f9, #67e8f9)' }}>{monthly.toLocaleString('tr-TR')} <span className="text-sm">₺</span></p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Yıllık (2 ay ücretsiz)</p>
                                                                <p className="text-lg font-extrabold text-emerald-600">{yearly.toLocaleString('tr-TR')} <span className="text-xs">₺</span></p>
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
                )
            }

            {/* == ÖDEME MODALI == */}
            {
                showPaymentModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closePaymentModal}></div>
                        <div className="relative w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <div className="p-6 border-b flex items-center justify-between" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.4)' }}>
                                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}><ShieldCheck className="w-5 h-5" /></div><div><h3 className="text-lg font-extrabold text-white">Güvenli Ödeme</h3><p className="text-xs text-slate-400 font-medium">{paymentPackageName}</p></div></div>
                                <button onClick={closePaymentModal} className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors" style={{ background: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(51, 65, 85, 0.5)' }}><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto landing-scrollbar">
                                {paymentSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)' }}><CheckCircle className="w-10 h-10 text-emerald-400" /></div>
                                        <h3 className="text-xl font-extrabold text-white mb-2">Ödeme Bildiriminiz Alındı!</h3>
                                        <p className="text-sm text-slate-400 font-medium mb-4">Siparişiniz başarıyla oluşturuldu. Ödemeniz kontrol edildikten sonra hesabınız aktifleştirilecektir.</p>
                                        <div className="rounded-xl p-4 mb-4 border" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                            <p className="text-xs text-emerald-400 font-medium">Ödeme kodunuz: <span className="font-mono font-extrabold text-emerald-300 tracking-widest">{paymentCode}</span></p>
                                            <p className="text-xs text-emerald-400 mt-1">Bu kodu lütfen not alın. Destek taleplerinizde bu kod ile işlem yapılacaktır.</p>
                                        </div>
                                        <button onClick={closePaymentModal} className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-all">Tamam, Kapat</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Adınız</label><input type="text" value={orderFirstName} onChange={e => setOrderFirstName(e.target.value)} placeholder="Ad" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} /></div>
                                            <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Soyadınız</label><input type="text" value={orderLastName} onChange={e => setOrderLastName(e.target.value)} placeholder="Soyad" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} /></div>
                                        </div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">E-Posta Adresi</label><input type="email" value={orderEmail} onChange={e => setOrderEmail(e.target.value)} placeholder="mail@ornek.com" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} /></div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Telefon Numarası</label><input type="tel" value={orderPhone} onChange={e => setOrderPhone(e.target.value)} placeholder="+90 (555) 000 00 00" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} /></div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Oda Adı <span className="text-slate-500 normal-case">(Platformunuzun görünen adı)</span></label><input type="text" value={hostingType === 'own_domain' ? '' : orderRoomName} onChange={e => setOrderRoomName(e.target.value)} disabled={hostingType === 'own_domain'} placeholder={hostingType === 'own_domain' ? 'Kendi domaininizde oda adı gerekmez' : 'Örn: Dostlar Sohbet, Müzik Evi...'} className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border ${hostingType === 'own_domain' ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-white'}`} style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} /></div>
                                        {/* LOGO YÜKLEME */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Logo / Avatar <span className="text-slate-500 normal-case">(isteğe bağlı)</span></label>
                                            <div className="flex items-center gap-3">
                                                {orderLogo ? (
                                                    <div className="relative group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={orderLogo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                                        <button type="button" onClick={() => setOrderLogo('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-dashed" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                                        <Camera className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                )}
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="px-4 py-2.5 rounded-xl text-center text-sm font-medium transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)', color: '#94a3b8' }}>{orderLogo ? 'Değiştir' : 'Logo Yükle'}</div>
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        if (file.size > 1024 * 1024) { addToast('Logo 1MB\'dan küçük olmalı', 'error'); return; }
                                                        const reader = new FileReader();
                                                        reader.onload = () => setOrderLogo(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                        e.target.value = '';
                                                    }} />
                                                </label>
                                            </div>
                                        </div>
                                        {/* HOSTİNG TİPİ */}
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Hosting Tercihiniz</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button type="button" onClick={() => setHostingType('sopranochat')} className="p-3 rounded-xl border-2 text-left transition-all" style={hostingType === 'sopranochat' ? { background: 'rgba(6, 182, 212, 0.12)', borderColor: '#06b6d4', boxShadow: '0 4px 6px -1px rgba(204,34,34,0.1)' } : { background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={hostingType === 'sopranochat' ? { borderColor: '#06b6d4' } : { borderColor: 'rgba(100, 116, 139, 0.5)' }}>{hostingType === 'sopranochat' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>}</div>
                                                        <span className="text-xs font-bold" style={{ color: hostingType === 'sopranochat' ? '#67e8f9' : '#94a3b8' }}>SopranoChat</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 ml-6">sopranochat.com üzerinden</p>
                                                </button>
                                                <button type="button" onClick={() => setHostingType('own_domain')} className="p-3 rounded-xl border-2 text-left transition-all" style={hostingType === 'own_domain' ? { background: 'rgba(6, 182, 212, 0.12)', borderColor: '#06b6d4', boxShadow: '0 4px 6px -1px rgba(204,34,34,0.1)' } : { background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={hostingType === 'own_domain' ? { borderColor: '#06b6d4' } : { borderColor: 'rgba(100, 116, 139, 0.5)' }}>{hostingType === 'own_domain' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06b6d4' }}></div>}</div>
                                                        <span className="text-xs font-bold" style={{ color: hostingType === 'own_domain' ? '#67e8f9' : '#94a3b8' }}>Kendi Domainin</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 ml-6">Embed ile kendi siten</p>
                                                </button>
                                            </div>
                                        </div>
                                        {hostingType === 'own_domain' && (
                                            <div className="animate-in fade-in duration-300">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Domain Adresiniz</label>
                                                <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="ornek.com" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Odalarınız bu domain üzerinde embed koduyla çalışacaktır.</p>
                                            </div>
                                        )}
                                        {/* IBAN */}
                                        <div className="mt-2 rounded-2xl p-4 border" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                                            <div className="flex items-start gap-3 mb-3"><Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#67e8f9' }} /><p className="text-xs font-medium leading-relaxed text-slate-300">Lütfen ödemenizi aşağıdaki banka hesaplarından birine gönderirken, <b>Açıklama</b> kısmına size özel üretilen <b>Ödeme Kodunu</b> yazmayı unutmayın.</p></div>
                                            <div className="space-y-2 max-h-52 overflow-y-auto landing-scrollbar pr-1">
                                                {[
                                                    { bank: 'VakıfBank', name: 'Soprano Bilişim A.Ş.', iban: 'TR12 0001 5001 5800 7307 6543 21', ibanRaw: 'TR120001500158007307654321', color: 'from-yellow-500 to-amber-600' },
                                                    { bank: 'İş Bankası', name: 'Soprano Bilişim A.Ş.', iban: 'TR34 0006 4000 0011 2345 6789 01', ibanRaw: 'TR340006400000112345678901', color: 'from-blue-500 to-indigo-600' },
                                                    { bank: 'Halkbank', name: 'Soprano Bilişim A.Ş.', iban: 'TR56 0001 2009 8760 0010 0001 23', ibanRaw: 'TR560001200987600010000123', color: 'from-teal-500 to-emerald-600' },
                                                    { bank: 'Akbank', name: 'Soprano Bilişim A.Ş.', iban: 'TR78 0004 6006 1388 8000 0123 45', ibanRaw: 'TR780004600613888000012345', color: 'from-red-500 to-rose-600' },
                                                ].map((b, i) => (
                                                    <div key={i} className="rounded-xl border p-3 transition-colors" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.4)' }}>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${b.color} flex items-center justify-center`}><span className="text-white text-[9px] font-extrabold">{b.bank.charAt(0)}</span></div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{b.bank} <span className="text-slate-500 font-medium normal-case">({b.name})</span></span>
                                                        </div>
                                                        <div className="flex justify-between items-center"><span className="font-mono text-sm font-bold text-slate-300 tracking-wide">{b.iban}</span><button onClick={() => copyText(b.ibanRaw)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#67e8f9', background: 'rgba(6, 182, 212, 0.12)' }} title="Kopyala"><Copy className="w-3.5 h-3.5" /></button></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="rounded-xl border p-3 mt-2" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Ödeme Kodu (Açıklamaya Yazılacak)</span>
                                                <div className="flex justify-between items-center"><span className="font-mono text-lg font-extrabold tracking-widest" style={{ color: '#67e8f9' }}>{paymentCode}</span><button onClick={() => copyText(paymentCode)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#67e8f9', background: 'rgba(6, 182, 212, 0.12)' }} title="Kopyala"><Copy className="w-3.5 h-3.5" /></button></div>
                                            </div>
                                        </div>
                                        <button onClick={completePayment} disabled={paymentSubmitting} className="w-full py-4 mt-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                            {paymentSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Siparişiniz Gönderiliyor...</> : <>Ödemeyi Gönderdim, Tamamla <CheckCircle className="w-4 h-4" /></>}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == REFERANSLAR MODALI == */}
            {
                showReferencesModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowReferencesModal(false)}></div>
                        <div className="relative w-full max-w-[900px] max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => setShowReferencesModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-6 md:p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Bizi Tercih Eden <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #67e8f9, #67e8f9)' }}>Müşterilerimiz</span></h2>
                                    <p className="text-slate-400 text-sm font-medium">SopranoChat altyapısını kullanan aktif platformlar.</p>
                                </div>
                                {tenants.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {tenants.filter((t: any) => t.hostingType === 'own_domain').map((t: any, i: number) => {
                                            const colors = [
                                                { gradient: 'from-sky-500 to-blue-600', border: 'border-sky-200', bg: 'bg-sky-50' },
                                                { gradient: 'from-pink-500 to-rose-600', border: 'border-pink-200', bg: 'bg-pink-50' },
                                                { gradient: 'from-amber-500 to-orange-600', border: 'border-amber-200', bg: 'bg-amber-50' },
                                                { gradient: 'from-purple-500 to-indigo-600', border: 'border-purple-200', bg: 'bg-purple-50' },
                                                { gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
                                            ];
                                            const c = colors[i % colors.length];
                                            const packageLabels: Record<string, string> = { TEXT: 'Metin', VOICE: 'Ses', CAMERA: 'Kamera', WHITELABEL: 'White Label' };
                                            const badgeColors: Record<string, string> = {
                                                TEXT: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
                                                VOICE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
                                                CAMERA: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
                                                WHITELABEL: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
                                            };
                                            const badgeClass = badgeColors[t.packageType] || 'bg-slate-500/15 text-slate-300 border-slate-500/25';
                                            const accessUrl = t.domain ? (t.domain.startsWith('http') ? t.domain : `https://${t.domain}`) : `/t/${t.accessCode || t.slug}`;
                                            return (
                                                <div key={t.id} className={`rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`} style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.4)' }}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        {t.logoUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={t.logoUrl} alt={t.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                                                                <Building2 className="w-6 h-6 text-white/80" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="font-bold text-white text-sm">{t.domain || t.slug || t.name}</h3>
                                                            {!t.domain && t.slug && <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{t.slug}</p>}
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>{packageLabels[t.packageType] || t.packageType}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {t._count?.rooms || 0} Oda</span>
                                                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t._count?.users || 0} Üye</span>
                                                        <span className="flex items-center gap-1 ml-auto"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Aktif</span>
                                                    </div>
                                                    <a href={accessUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border hover:text-white" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#67e8f9', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                                                        Siteyi Ziyaret Et <ArrowRight className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-medium">Henüz referans müşteri bulunmuyor.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == SSS MODALI == */}
            {
                showFaqModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowFaqModal(false)}></div>
                        <div className="relative w-full max-w-[750px] max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => setShowFaqModal(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-6 md:p-8">
                                <div className="text-center mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"><HelpCircle className="w-7 h-7 text-white" /></div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Sıkça Sorulan <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Sorular</span></h2>
                                    <p className="text-slate-400 text-sm font-medium">Merak ettiğiniz her şey burada.</p>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { q: 'SopranoChat nedir?', a: 'SopranoChat, gerçek zamanlı sesli ve görüntülü sohbet odaları sunan bir iletişim platformudur. Kullanıcılar metin, ses ve kamera üzerinden eş zamanlı olarak iletişim kurabilir. Ayrıca işletmeler için özelleştirilebilir oda satışı ve white-label çözümler sunuyoruz.' },
                                        { q: 'Oda satın alma nasıl çalışıyor?', a: 'Navbar\u2019daki \u201cOda Satın Al\u201d butonundan fiyatlandırma modalini açabilirsiniz. Ses + Metin, Kamera + Ses ve White Label olmak üzere 3 hazır paket mevcuttur. Ayrıca \u201cÖzel Paket Oluşturucu\u201d ile oda sayısı, kapasite, kamera ve toplantı özelliklerini seçerek size özel paket oluşturabilirsiniz. Ödeme IBAN havale ile yapılmaktadır.' },
                                        { q: 'Sesli ve görüntülü sohbet kalitesi nasıl?', a: 'WebRTC tabanlı altyapımız sayesinde düşük gecikme süreli, yüksek kaliteli ses ve video iletişimi sağlıyoruz. Ses kalitesi otomatik olarak bağlantı hızınıza göre optimize edilir. Kamera çözünürlüğü HD seviyesine kadar desteklenmektedir.' },
                                        { q: 'Güvenlik ve gizlilik konusunda ne gibi önlemler alınıyor?', a: 'Tüm iletişim uçtan uca şifreleme ile korunmaktadır. Her oda için moderatör atanabilir; kullanıcılar susturulabilir, odadan atılabilir veya banlanabilir. IP bazında banlama, kelime filtreleme ve denetim logları gibi gelişmiş güvenlik özellikleri mevcuttur.' },
                                        { q: 'Moderatör ve admin yetkileri nelerdir?', a: 'Admin panelinden kullanıcı yönetimi, oda ayarları (tema, şifre, kapatma), ban yönetimi, kelime filtreleme, sistem duyuruları ve detaylı istatistikler gibi kapsamlı yönetim araçlarına erişebilirsiniz. Moderatörler oda içinde kullanıcıları susturabilir, sesini kapatabilir veya odadan atabilir.' },
                                        { q: 'Fiyatlandırma modeli nasıldır?', a: 'Aylık ve yıllık abonelik seçenekleri sunuyoruz. Yıllık planlarda %20 indirim uygulanmaktadır. Ses + Metin paketi aylık 1.499?\u2019dan, Kamera + Ses paketi 2.499?\u2019dan başlamaktadır. White Label çözümler için özel fiyatlandırma yapılmaktadır.' },
                                        { q: 'Hangi cihazlardan erişebilirim?', a: 'SopranoChat tamamen web tabanlıdır, herhangi bir uygulama indirmenize gerek yoktur. Masaüstü (Windows, macOS, Linux), tablet ve mobil cihazlardaki modern tarayıcılardan (Chrome, Firefox, Safari, Edge) sorunsuz erisebilirsiniz.' },
                                        { q: 'White Label çözüm ne anlama geliyor?', a: 'White Label paketimizle SopranoChat altyapısını tamamen kendi markanız altında kullanabilirsiniz. Özel domain, logo, renk şeması ve CSS özelleştirmesi desteği mevcuttur. Kullanıcılarınız SopranoChat\u2019i değil, sizin markanızı görür.' },
                                        { q: 'Misafir olarak giriş yapabilir miyim?', a: 'Evet! Kayıt olmadan takma ad ile misafir olarak giriş yapabilirsiniz. Misafirler metin ve sesli sohbete katılabilir. Ancak bazı özellikler (profil özelleştirme, VIP odalar vb.) üyelik gerektirmektedir. Üye olmak tamamen ücretsizdir.' },
                                        { q: 'Teknik destek nasıl alabilirim?', a: 'Navbar\u2019daki İletişim menüsünden bize ulaşabilirsiniz. Aktif müşterilerimize 7/24 öncelikli teknik destek sunulmaktadır. Ayrıca admin panelindeki sistem logları üzerinden sorunları kendiniz de teşhis edebilirsiniz.' },
                                    ].map((faq, i) => (
                                        <div key={i} className="rounded-2xl border overflow-hidden transition-all duration-300" style={{ background: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.4)' }}>
                                            <button onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                                                <span className="font-bold text-sm text-slate-300 pr-4">{faq.q}</span>
                                                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaqIndex === i ? 'rotate-180 text-yellow-400' : ''}`} />
                                            </button>
                                            {openFaqIndex === i && (
                                                <div className="px-5 pb-5 -mt-1">
                                                    <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* == İLETİŞİM MODALI == */}
            {
                showContactModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowContactModal(false); setContactSent(false); }}></div>
                        <div className="relative w-full max-w-[550px] max-h-[90vh] rounded-[2rem] shadow-2xl overflow-y-auto landing-scrollbar m-4 border" style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                            <button onClick={() => { setShowContactModal(false); setContactSent(false); }} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 shadow-sm transition-colors z-20" style={{ background: 'rgba(30, 41, 59, 0.8)' }}><X className="w-5 h-5" /></button>
                            <div className="p-6 md:p-8">
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #06b6d4, #065a6e)', boxShadow: '0 10px 15px -3px rgba(6,182,212,0.15)' }}><Phone className="w-7 h-7 text-white" /></div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Bizimle <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #67e8f9, #67e8f9)' }}>İletişime Geçin</span></h2>
                                    <p className="text-slate-400 text-sm font-medium">Sorularınız ve önerileriniz için bize ulaşın.</p>
                                </div>

                                {/* WhatsApp & E-Posta */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl border transition-colors group" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                                        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md shadow-green-500/20">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-green-400">WhatsApp</div>
                                            <div className="text-[11px] text-green-300">+9 552 036 3674</div>
                                        </div>
                                    </a>
                                    <a href="mailto:destek@sopranochat.com" className="flex items-center gap-3 p-4 rounded-2xl border transition-colors group" style={{ background: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.15)' }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#2c4a7c', boxShadow: '0 4px 6px -1px rgba(44,74,124,0.2)' }}>
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold" style={{ color: '#67e8f9' }}>E-Posta</div>
                                            <div className="text-[11px]" style={{ color: '#c8b49a' }}>destek@sopranochat.com</div>
                                        </div>
                                    </a>
                                </div>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-px" style={{ background: 'rgba(51, 65, 85, 0.5)' }}></div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">veya mesaj gönderin</span>
                                    <div className="flex-1 h-px" style={{ background: 'rgba(51, 65, 85, 0.5)' }}></div>
                                </div>

                                {/* İletişim Formu */}
                                {contactSent ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">Mesajınız Gönderildi!</h3>
                                        <p className="text-sm text-slate-500">En kısa sürede size dönüş yapacağız.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Adınız</label>
                                                <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Ad Soyad" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">E-Posta</label>
                                                <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="mail@ornek.com" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Konu</label>
                                            <input type="text" value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} placeholder="Mesajınızın konusu" className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Mesajınız</label>
                                            <textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} placeholder="Mesajınızı buraya yazın..." rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none border" style={{ background: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)' }} />
                                        </div>
                                        <button
                                            disabled={contactSubmitting || !contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message}
                                            onClick={async () => {
                                                setContactSubmitting(true);
                                                try {
                                                    await fetch(`${API_URL}/admin/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) });
                                                    setContactSent(true);
                                                    setContactForm({ name: '', email: '', subject: '', message: '' });
                                                } catch { }
                                                setContactSubmitting(false);
                                            }}
                                            className="w-full py-3.5 mt-1 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2c4a7c, #c8962e)', boxShadow: '0 10px 15px -3px rgba(44,74,124,0.2)' }}
                                        >
                                            {contactSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Gönderiliyor...</> : <>Mesaj Gönder <Send className="w-4 h-4" /></>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* === ODA ÇIKIŞ ONAY MODALİ === */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-[380px] rounded-2xl p-7 text-center shadow-2xl animate-in fade-in zoom-in duration-200" style={{ background: 'linear-gradient(180deg, #161825 0%, #0e101a 100%)', border: '1px solid rgba(184, 164, 124, 0.2)' }}>
                        {/* İkon */}
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(184, 164, 124, 0.2), rgba(184, 164, 124, 0.05))', border: '1px solid rgba(184, 164, 124, 0.3)' }}>
                            <LogOut className="w-8 h-8" style={{ color: '#b8a47c' }} />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2">Odadan Çıkış Yaptınız</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            Ana sayfadan da çıkış yapmak istiyor musunuz?<br />
                            <span className="text-gray-500 text-xs">Çıkış yapmazsanız tekrar odaya girebilirsiniz.</span>
                        </p>

                        <div className="flex gap-3">
                            {/* Hayır  Kalsın */}
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                            >
                                Hayır, Kalayım
                            </button>
                            {/* Evet  Çıkış */}
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.removeItem('soprano_auth_token');
                                        localStorage.removeItem('soprano_tenant_token');
                                        localStorage.removeItem('soprano_tenant_user');
                                        localStorage.removeItem('soprano_user');
                                        localStorage.removeItem('soprano_entry_url');
                                        sessionStorage.clear();
                                    } catch (e) { console.warn(e); }
                                    removeAuthUser();
                                    setLoggedInUser(null);
                                    window.dispatchEvent(new Event('auth-change'));
                                    setShowExitConfirm(false);
                                }}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #b8a47c, #d4c49a)', color: '#0a0a1a' }}
                            >
                                <LogOut className="w-4 h-4" />
                                Evet, Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

