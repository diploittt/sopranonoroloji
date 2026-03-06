import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import '@/components/admin/AdminPanel.css';

interface SettingsTabProps {
    socket: Socket | null;
    systemSettings?: Record<string, any> | null;
}

interface SettingItem {
    key: string;
    label: string;
    type: 'checkbox' | 'text' | 'textarea' | 'number' | 'select' | 'image' | 'color';
    desc: string;
    options?: { value: string; label: string }[];
}

interface SettingsSection {
    key: string;
    title: string;
    icon: string;
    description: string;
    settings: SettingItem[];
}




// ─── SETTINGS SECTIONS ────────────────────────────
const SETTINGS_SECTIONS: SettingsSection[] = [
    {
        key: 'general',
        title: 'Tüm Ayarlar',
        icon: '⚙️',
        description: 'Genel sistem ayarları. Bu bölümde platformun temel güvenlik ve görüntü ayarlarını yönetebilirsiniz.',
        settings: [
            { key: 'banBlockEntry', label: 'Ban Girişini Bloke Et', type: 'checkbox', desc: 'Banlı kullanıcıların sisteme giriş yapmasını engeller.' },
            { key: 'forceOperatorIcon', label: 'Mecburi Operatör İkonu', type: 'checkbox', desc: 'Operatör, Moderatör, Admin, SuperAdmin ve Owner rollerinin Operatör ikonunu taşımasını zorunlu kılar.' },
            { key: 'blockHtmlColors', label: 'HTML Renkleri Engelle', type: 'checkbox', desc: 'Mesajlardaki HTML renk kodlarını filtreleyerek engeller.' },
            { key: 'showRoomName', label: 'Oda İsmi Görüntüle', type: 'checkbox', desc: 'Header\'da oda isimlerini gösterir/gizler.' },
            { key: 'adminAutoHdLock', label: 'Otomatik Admin Kilit', type: 'checkbox', desc: 'Aynı cihazdan 20 giriş sonrasında HD kilidini otomatik devreye sokar.' },
            { key: 'antiFlood', label: 'Anti-Flood', type: 'checkbox', desc: 'Kullanıcıların çok hızlı art arda mesaj göndermesini engeller.' },
            { key: 'antiFloodLimit', label: 'Anti-Flood Limit (mesaj/sn)', type: 'number', desc: 'Saniyede gönderilebilecek maksimum mesaj sayısı.' },
            { key: 'blockVirtualMachine', label: 'Sanal Makineyi Engelle', type: 'checkbox', desc: 'Sanal makinelerden (VM) giriş yapılmasını engeller.' },
        ],
    },
    {
        key: 'login',
        title: 'Kullanıcı Girişi',
        icon: '👤',
        description: 'Her rol sınıfı için özellik izinlerini ayrı ayrı ayarlayabilirsiniz. Sınıf seçerek o role ait izinleri düzenleyin.',
        settings: [
            { key: 'multiLoginBlock', label: 'Çoklu Giriş Engelle', type: 'checkbox', desc: 'Aynı hesapla birden fazla cihazdan eşzamanlı giriş yapılmasını engeller.' },
        ],
    },
    {
        key: 'welcome',
        title: 'Hoşgeldiniz Mesajı',
        icon: '💬',
        description: 'Kullanıcılar odaya girdiğinde gösterilecek karşılama mesajını buradan düzenleyebilirsiniz.',
        settings: [
            { key: 'welcomeMessage', label: 'Hoşgeldiniz Mesajı', type: 'textarea', desc: 'Kullanıcılar odaya girdiğinde gösterilecek mesaj.' },
        ],
    },
    {
        key: 'mic',
        title: 'Mikrofon Süresi',
        icon: '🎤',
        description: 'Her rol için mikrofon kullanım süresini belirleyebilirsiniz. Değerler saniye cinsindendir. Boş bırakılan roller bir üst rolün süresini devralır.',
        settings: [
            { key: 'micDurationGuest', label: 'Misafir (Guest)', type: 'number', desc: 'Misafir kullanıcıların mikrofon süresi (saniye).' },
            { key: 'micDurationMember', label: 'Üye (Member)', type: 'number', desc: 'Üye kullanıcıların mikrofon süresi (saniye).' },
            { key: 'micDurationVip', label: 'VIP', type: 'number', desc: 'VIP kullanıcıların mikrofon süresi (saniye).' },
            { key: 'micDurationAdmin', label: 'Admin ve üstü', type: 'number', desc: 'Admin, SuperAdmin, Owner, GodMaster mikrofon süresi (saniye).' },
        ],
    },

    {
        key: 'language',
        title: 'Dil',
        icon: '🌐',
        description: 'Sistemin varsayılan dilini belirleyebilirsiniz.',
        settings: [
            { key: 'defaultLanguage', label: 'Varsayılan Dil', type: 'select', options: [{ value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }], desc: 'Sistem varsayılan dili.' },
        ],
    },
    {
        key: 'branding',
        title: 'Logo / Marka',
        icon: '🏷️',
        description: 'Sol üstteki logoyu özelleştirin. Müşteri kendi logosunu (resim/gif) yükleyebilir. Sıfırla butonuyla varsayılan SopranoChat logosuna geri dönebilirsiniz.',
        settings: [
            { key: 'logoPosition', label: 'Logo Pozisyonu', type: 'select', options: [{ value: 'left', label: 'Sol' }, { value: 'center', label: 'Orta' }], desc: 'Logonun hizalanma yönü.' },
            { key: 'logoImageSize', label: 'Logo Boyutu (px)', type: 'number', desc: 'Logo görseli boyutu. Varsayılan: 112px' },
            { key: 'logoOffsetX', label: 'Logo X Kaydırma (px)', type: 'number', desc: 'Logonun yatay kaydırma miktarı.' },
            { key: 'logoOffsetY', label: 'Logo Y Kaydırma (px)', type: 'number', desc: 'Logonun dikey kaydırma miktarı.' },
        ],
    },

];

// ─── MAIN SETTINGS TAB ────────────────────────────
// ─── ROL BAZLI İZİN SİSTEMİ ────────────────────
const ROLE_CLASSES = [
    { value: 'guest', label: 'Misafir (Guest)' },
    { value: 'member', label: 'Üye (Member)' },
    { value: 'vip', label: 'VIP' },
    { value: 'operator', label: 'Operatör' },
    { value: 'moderator', label: 'Moderatör' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'SuperAdmin' },
    { value: 'owner', label: 'Owner' },
];

const ROLE_PERM_ITEMS = [
    { key: 'profile', label: 'Profilim' },
    { key: 'privateMessage', label: 'Özel Mesaj' },
    { key: 'privateRoom', label: 'Özel Oda' },
    { key: 'camera', label: 'Kamera' },
    { key: 'webcam1v1', label: 'Bire Bir WebCam' },
    { key: 'animation', label: 'Animasyon (Emoji, Sticker, GIF)' },
    { key: 'youtube', label: 'YouTube Paylaşımı' },
    { key: 'nudge', label: 'Titreme (Nudge)' },
    { key: 'duel', label: 'Düello' },
];

// Varsayılan izinler — üst roller daha fazla yetkiye sahip
const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
    guest: { profile: true, privateMessage: true, privateRoom: false, camera: true, webcam1v1: false, animation: false, youtube: false, nudge: false, duel: false },
    member: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    vip: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    operator: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    moderator: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    admin: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    super_admin: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
    owner: { profile: true, privateMessage: true, privateRoom: true, camera: true, webcam1v1: true, animation: true, youtube: true, nudge: true, duel: true },
};

export function SettingsTab({ socket, systemSettings }: SettingsTabProps) {
    const isCamera = systemSettings?.packageType === 'CAMERA';
    const filteredPermItems = isCamera ? ROLE_PERM_ITEMS : ROLE_PERM_ITEMS.filter(p => p.key !== 'camera' && p.key !== 'webcam1v1');
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [openSection, setOpenSection] = useState<string>('general');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('guest');
    const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(DEFAULT_ROLE_PERMS);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getSettings();
            console.log('[SettingsTab] loadSettings OK "” logoUrl:', data?.logoUrl ? `SET (${data.logoUrl.length} chars)` : 'NULL', '| logoName:', data?.logoName);
            setSettings(data || {});
            // rolePermissions JSON alanını yükle "” deep merge (her rolün izinleri ayrı birleştirilir)
            if (data?.rolePermissions && typeof data.rolePermissions === 'object') {
                setRolePermissions(() => {
                    const merged = { ...DEFAULT_ROLE_PERMS };
                    for (const [role, perms] of Object.entries(data.rolePermissions as Record<string, Record<string, boolean>>)) {
                        merged[role] = { ...(DEFAULT_ROLE_PERMS[role] || {}), ...perms };
                    }
                    return merged;
                });
            }
        } catch (e: any) {
            console.error('[SettingsTab] loadSettings FAILED:', e.message);
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // rolePermissions'ı da settings içine ekle, read-only alanları çıkar
            const { id, tenantId, updatedAt, createdAt, ...cleanSettings } = settings;

            // Eski guest alanlarını rolePermissions.guest ile senkronize et (geriye uyumluluk)
            const guestPerms = rolePermissions.guest || {};
            const syncedSettings = {
                ...cleanSettings,
                rolePermissions,
                guestProfile: guestPerms.profile ?? cleanSettings.guestProfile ?? true,
                guestPrivateMessage: guestPerms.privateMessage ?? cleanSettings.guestPrivateMessage ?? true,
                guestPrivateRoomInvite: guestPerms.privateRoom ?? cleanSettings.guestPrivateRoomInvite ?? false,
                guestCamera: guestPerms.camera ?? cleanSettings.guestCamera ?? true,
                guestWebcam1v1: guestPerms.webcam1v1 ?? cleanSettings.guestWebcam1v1 ?? false,
                guestAnimation: guestPerms.animation ?? cleanSettings.guestAnimation ?? false,
            };

            // Prisma'da olmayan alanları temizle (getSettings include/computed alanları)
            delete (syncedSettings as any).tenant;
            delete (syncedSettings as any).isMeetingRoom;
            delete (syncedSettings as any).packageType;

            // Int alanlarını garanti et
            const s = syncedSettings as any;
            if (s.logoImageSize !== undefined && s.logoImageSize !== null) {
                s.logoImageSize = parseInt(String(s.logoImageSize), 10) || 112;
            }
            if (s.micDuration !== undefined) {
                s.micDuration = parseInt(String(s.micDuration), 10) || 120;
            }
            if (s.antiFloodLimit !== undefined) {
                s.antiFloodLimit = parseInt(String(s.antiFloodLimit), 10) || 5;
            }

            console.log('[SettingsTab] handleSave "” keys:', Object.keys(syncedSettings).join(', '));
            await adminApi.updateSettings(syncedSettings);
            // Broadcast updated settings to all connected clients
            if (socket) {
                socket.emit('admin:refreshSettings');
            }
            showStatus('success', 'Ayarlar kaydedildi.');
        } catch (e: any) {
            console.error('[SettingsTab] handleSave FAILED:', e.message);
            showStatus('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Rol bazlı izin güncelleme ──────────────────────
    const updateRolePerm = (role: string, permKey: string, value: boolean) => {
        setRolePermissions(prev => ({
            ...prev,
            [role]: { ...(prev[role] || DEFAULT_ROLE_PERMS[role] || {}), [permKey]: value }
        }));
    };

    const currentRolePerms = rolePermissions[selectedRole] || DEFAULT_ROLE_PERMS[selectedRole] || {};

    const BRANDING_KEYS = ['logoUrl', 'logoPosition', 'logoImageSize', 'logoOffsetX', 'logoOffsetY', 'logoEffect'];

    const dispatchBrandingPreview = useCallback((s: Record<string, any>) => {
        const detail: Record<string, any> = {};
        BRANDING_KEYS.forEach(k => { detail[k] = s[k] ?? ''; });
        window.dispatchEvent(new CustomEvent('brandingPreview', { detail }));
    }, []);

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            // If branding key changed, dispatch live preview
            if (BRANDING_KEYS.includes(key) && openSection === 'branding') {
                setTimeout(() => dispatchBrandingPreview(next), 0);
            }
            return next;
        });
    };

    // Dispatch preview when branding section opens, clear when it closes
    useEffect(() => {
        if (openSection === 'branding') {
            dispatchBrandingPreview(settings);
        } else {
            window.dispatchEvent(new CustomEvent('brandingPreviewClear'));
        }
    }, [openSection]);

    // Clear preview on unmount
    useEffect(() => {
        return () => { window.dispatchEvent(new CustomEvent('brandingPreviewClear')); };
    }, []);



    const showStatus = (type: 'success' | 'error', msg: string) => {
        setStatusMsg({ type, msg });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const activeSection = SETTINGS_SECTIONS.find(s => s.key === openSection);

    if (loading) {
        return (
            <div className="admin-loading" style={{ flex: 1 }}>
                <div className="admin-spinner" />
                Ayarlar yükleniyor...
            </div>
        );
    }

    return (
        <div className="admin-split" style={{ position: 'relative' }}>

            {/* ─── Sol Panel: Accordion Menü ─── */}
            <div className="admin-split-left" style={{ maxWidth: 360 }}>
                <div className="admin-toolbar">
                    <Settings style={{ width: 13, height: 13, color: '#6b7280' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Tüm Ayarlar</span>
                    <div style={{ flex: 1 }} />
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadSettings} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12 }} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                    <div className="admin-accordion">
                        {SETTINGS_SECTIONS.map(section => (
                            <div
                                key={section.key}
                                className={`admin-accordion-item ${openSection === section.key ? 'active' : ''}`}
                            >
                                <div
                                    className="admin-accordion-header"
                                    onClick={() => setOpenSection(openSection === section.key ? '' : section.key)}
                                >
                                    <span className="toggle-icon">
                                        {openSection === section.key ? '−' : '+'}
                                    </span>
                                    <span style={{ fontSize: 14, marginRight: 6 }}>{section.icon}</span>
                                    <span className="acc-title">{section.title}</span>
                                </div>

                                {openSection === section.key && (
                                    <div className="admin-accordion-body">
                                        {/* ═══ BRANDING: Canlı Logo Önizleme (sol panelde) ═══ */}
                                        {section.key === 'branding' && (() => {
                                            const logoUrl = settings.logoUrl || '';
                                            const logoPosition = settings.logoPosition || 'left';
                                            const logoImageSize = settings.logoImageSize || 112;
                                            const offsetX = settings.logoOffsetX || 0;
                                            const offsetY = settings.logoOffsetY || 0;

                                            return (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{
                                                        fontSize: 9, fontWeight: 700, color: 'rgba(99,102,241,0.6)',
                                                        letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4,
                                                    }}>🔍 Sol üst logo alanı canlı önizlemesi</div>
                                                </div>
                                            );
                                        })()}

                                        {/* KULLANICI GIRISI — ROL BAZLI IZIN SECICI */}
                                        {section.key === 'login' && (
                                            <div style={{ marginBottom: 12 }}>
                                                {/* Sınıf Seçici */}
                                                <div style={{ marginBottom: 10 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4, display: 'block' }}>Sınıf</label>
                                                    <select
                                                        value={selectedRole}
                                                        onChange={e => setSelectedRole(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '7px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            background: 'rgba(255,255,255,0.06)',
                                                            border: '1px solid rgba(255,255,255,0.12)',
                                                            borderRadius: 6,
                                                            color: '#e0e0e0',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {ROLE_CLASSES.map(rc => (
                                                            <option key={rc.value} value={rc.value} style={{ background: '#1f2937' }}>
                                                                {rc.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* İzin Checkbox'ları */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {filteredPermItems.map(perm => (
                                                        <div
                                                            key={perm.key}
                                                            className="admin-perm-item"
                                                            onClick={() => updateRolePerm(selectedRole, perm.key, !currentRolePerms[perm.key])}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={!!currentRolePerms[perm.key]}
                                                                onChange={() => updateRolePerm(selectedRole, perm.key, !currentRolePerms[perm.key])}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            <label>{perm.label}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Sol panelde sadece başlığı göster, kontroller sağ panelde */}
                                        {(
                                            <>
                                                {section.settings.filter(s => s.type === 'checkbox').length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {section.settings.filter(s => s.type === 'checkbox').map(setting => (
                                                            <div
                                                                key={setting.key}
                                                                className="admin-perm-item"
                                                                onClick={() => updateSetting(setting.key, !settings[setting.key])}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!settings[setting.key]}
                                                                    onChange={() => updateSetting(setting.key, !settings[setting.key])}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                                <label>{setting.label}</label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {section.settings.filter(s => s.type !== 'checkbox').map(setting => {
                                                    // Offset alanlari icin range slider
                                                    const isOffsetField = section.key === 'branding' && ['logoOffsetX', 'logoOffsetY', 'textOffsetX', 'textOffsetY'].includes(setting.key);
                                                    const isSizeSlider = section.key === 'branding' && setting.key === 'logoImageSize';

                                                    if (isOffsetField || isSizeSlider) {
                                                        const isSize = isSizeSlider;
                                                        const min = isSize ? 40 : -200;
                                                        const max = isSize ? 300 : 200;
                                                        const val = settings[setting.key] ?? (isSize ? 112 : 0);
                                                        return (
                                                            <div key={setting.key} className="admin-form-group" style={{ marginBottom: 10 }}>
                                                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span>{setting.label}</span>
                                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{val}px</span>
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <span style={{ fontSize: 9, color: '#6b7280', width: 28, textAlign: 'right' }}>{min}</span>
                                                                    <input
                                                                        type="range"
                                                                        min={min}
                                                                        max={max}
                                                                        value={val}
                                                                        onChange={e => updateSetting(setting.key, Number(e.target.value))}
                                                                        style={{
                                                                            flex: 1,
                                                                            accentColor: '#6366f1',
                                                                            height: 6,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    />
                                                                    <span style={{ fontSize: 9, color: '#6b7280', width: 28 }}>{max}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateSetting(setting.key, isSize ? 112 : 0)}
                                                                        style={{
                                                                            background: 'rgba(255,255,255,0.06)',
                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                            borderRadius: 4,
                                                                            color: '#9ca3af',
                                                                            fontSize: 9,
                                                                            padding: '3px 6px',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        title="Sıfırla"
                                                                    >
                                                                        ↺
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={setting.key} className="admin-form-group" style={{ marginBottom: 8 }}>
                                                            <label>{setting.label}</label>
                                                            {setting.type === 'textarea' ? (
                                                                <textarea
                                                                    value={settings[setting.key] || ''}
                                                                    onChange={e => updateSetting(setting.key, e.target.value)}
                                                                    rows={3}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                                        borderRadius: 8,
                                                                        padding: '8px 12px',
                                                                        color: '#e0e0e0',
                                                                        fontSize: 12,
                                                                        outline: 'none',
                                                                        resize: 'vertical',
                                                                    }}
                                                                />
                                                            ) : setting.type === 'select' ? (
                                                                <select
                                                                    value={settings[setting.key] || ''}
                                                                    onChange={e => updateSetting(setting.key, e.target.value)}
                                                                >
                                                                    {setting.options?.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            ) : setting.type === 'color' ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <input
                                                                        type="color"
                                                                        value={settings[setting.key] || '#a3bfff'}
                                                                        onChange={e => updateSetting(setting.key, e.target.value)}
                                                                        style={{
                                                                            width: 40,
                                                                            height: 32,
                                                                            border: '1px solid rgba(255,255,255,0.15)',
                                                                            borderRadius: 6,
                                                                            background: 'transparent',
                                                                            cursor: 'pointer',
                                                                            padding: 2,
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={settings[setting.key] || ''}
                                                                        onChange={e => updateSetting(setting.key, e.target.value)}
                                                                        placeholder="#a3bfff"
                                                                        style={{
                                                                            flex: 1,
                                                                            background: 'rgba(255,255,255,0.04)',
                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                            borderRadius: 6,
                                                                            padding: '6px 10px',
                                                                            color: '#e0e0e0',
                                                                            fontSize: 12,
                                                                            outline: 'none',
                                                                        }}
                                                                    />
                                                                    {settings[setting.key] && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateSetting(setting.key, '')}
                                                                            style={{
                                                                                background: 'rgba(239,68,68,0.15)',
                                                                                border: '1px solid rgba(239,68,68,0.3)',
                                                                                borderRadius: 6,
                                                                                color: '#ef4444',
                                                                                fontSize: 10,
                                                                                padding: '5px 8px',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                            title="Varsayılana dön"
                                                                        >
                                                                            Sıfırla
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type={setting.type}
                                                                    value={settings[setting.key] || ''}
                                                                    onChange={e => updateSetting(setting.key, setting.type === 'number' ? Number(e.target.value) : e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* ═══ BRANDING: Logo Görsel Yükleme + Sıfırla ═══ */}
                                                {section.key === 'branding' && (
                                                    <div style={{ marginTop: 8 }}>
                                                        {/* Logo image upload */}
                                                        <div className="admin-form-group" style={{ marginBottom: 10 }}>
                                                            <label>Logo Görseli</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                {settings.logoUrl && (
                                                                    <img src={settings.logoUrl} alt="Logo" style={{
                                                                        height: 40, width: 'auto', maxWidth: 80,
                                                                        objectFit: 'contain', borderRadius: 6,
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        background: 'rgba(30,41,59,0.5)',
                                                                    }} />
                                                                )}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        const reader = new FileReader();
                                                                        reader.onload = () => updateSetting('logoUrl', reader.result as string);
                                                                        reader.readAsDataURL(file);
                                                                    }}
                                                                    style={{
                                                                        flex: 1, fontSize: 11, color: '#9ca3af',
                                                                        background: 'rgba(255,255,255,0.04)',
                                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                                        borderRadius: 6, padding: '6px 8px',
                                                                    }}
                                                                />
                                                                {settings.logoUrl && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateSetting('logoUrl', '')}
                                                                        style={{
                                                                            background: 'rgba(239,68,68,0.15)',
                                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                                            borderRadius: 6, color: '#ef4444',
                                                                            fontSize: 10, padding: '5px 8px', cursor: 'pointer',
                                                                        }}
                                                                    >Kaldır</button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Reset ALL branding */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const brandingKeys = ['logoUrl', 'logoPosition', 'logoImageSize', 'logoOffsetX', 'logoOffsetY', 'logoEffect'];
                                                                setSettings(prev => {
                                                                    const next = { ...prev };
                                                                    brandingKeys.forEach(k => { next[k] = ''; });
                                                                    return next;
                                                                });
                                                                showStatus('success', 'Logo ayarları sıfırlandı. Kaydetmeyi unutmayın!');
                                                            }}
                                                            style={{
                                                                width: '100%', padding: '8px 12px',
                                                                fontSize: 11, fontWeight: 600,
                                                                background: 'rgba(239,68,68,0.08)',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                borderRadius: 8, color: '#fca5a5',
                                                                cursor: 'pointer', transition: 'all 0.2s',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                            }}
                                                        >
                                                            🔄 Tüm Logo Ayarlarını Sıfırla
                                                        </button>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                    <button
                                                        className="admin-btn admin-btn-success admin-btn-sm"
                                                        onClick={handleSave}
                                                        disabled={saving}
                                                    >
                                                        <Save style={{ width: 11, height: 11 }} />
                                                        {saving ? 'Kaydediliyor...' : 'Değiştir'}
                                                    </button>
                                                    {statusMsg && (
                                                        <span className={`admin-toast ${statusMsg.type}`} style={{ position: 'relative' }}>
                                                            {statusMsg.type === 'success' ? '✔' : '✖'} {statusMsg.msg}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                    </div>
                                )}


                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Sağ Panel ─── */}
            <div className="admin-split-right">
                {activeSection ? (
                    <>
                        <div className="admin-detail-header">
                            <div className="header-accent" />
                            <span style={{ fontSize: 20, marginRight: 4 }}>{activeSection.icon}</span>
                            {activeSection.title}
                        </div>

                        <div className="admin-info-card">
                            <p style={{ lineHeight: 1.7 }}>{activeSection.description}</p>
                        </div>


                        {/* Setting Descriptions */}
                        <div style={{ marginTop: 16 }}>
                            {activeSection.settings.map(setting => (
                                <div key={setting.key} style={{
                                    padding: '10px 14px',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: settings[setting.key] ? '#6366f1' : '#374151',
                                        marginTop: 5, flexShrink: 0,
                                    }} />
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db', marginBottom: 2 }}>
                                            {setting.label}
                                            {setting.type === 'checkbox' && (
                                                <span style={{
                                                    marginLeft: 8,
                                                    fontSize: 9,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontWeight: 700,
                                                    background: settings[setting.key] ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                                                    color: settings[setting.key] ? '#86efac' : '#fca5a5',
                                                    border: `1px solid ${settings[setting.key] ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                                                }}>
                                                    {settings[setting.key] ? 'AKTİF' : 'KAPALI'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{setting.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">⚙️</div>
                        <div className="admin-empty-text">Ayarlar</div>
                        <div className="admin-empty-sub">Sol menüden bir bölüm seçerek ayarları görüntüleyebilirsiniz</div>
                    </div>
                )}
            </div>
        </div >
    );
}
