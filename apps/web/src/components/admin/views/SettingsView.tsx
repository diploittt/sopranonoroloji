'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Save, CreditCard, Phone, Globe, Palette, Building2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; adminUser: any; }

const TABS = [
    { id: 'branding' as const, label: 'Branding', icon: Building2, color: '#fb7185' },
    { id: 'pricing' as const, label: 'Fiyatlandırma', icon: CreditCard, color: '#fbbf24' },
    { id: 'banks' as const, label: 'Banka Hesapları', icon: Building2, color: '#34d399' },
    { id: 'contact' as const, label: 'İletişim', icon: Phone, color: '#38bdf8' },
];

type SettingsTab = typeof TABS[number]['id'];

export default function SettingsView({ token, adminUser }: Props) {
    const [tab, setTab] = useState<SettingsTab>('branding');
    const [config, setConfig] = useState<any>({
        siteTitle: '', siteSlogan: '', footerText: '',
        pricing: { p1Name: 'Ses + Metin', p1Monthly: '200', p2Name: 'Kamera + Ses', p2Monthly: '400', p3Name: 'White Label', p3Monthly: '2.990' },
        banks: [{ bank: '', name: '', iban: '' }],
        contact: { whatsapp: '', email: '', address: '' },
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setConfig({ ...config, ...d }); })
            .catch(() => {});
    }, [token]);

    const save = async () => {
        setSaving(true);
        try {
            await fetch(`${API_URL}/admin/settings`, { method: 'PATCH', headers, body: JSON.stringify(config) });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch { }
        setSaving(false);
    };

    const u = (path: string, value: any) => {
        const c = { ...config };
        const keys = path.split('.');
        let obj: any = c;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        setConfig(c);
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
    };
    const labelStyle = { fontSize: 10, fontWeight: 700 as const, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6, display: 'block' as const };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(148,163,184,0.15), rgba(148,163,184,0.05))',
                        border: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Settings style={{ width: 18, height: 18, color: '#94a3b8' }} /></div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Ayarlar</h1>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Site yapılandırması ve fiyatlandırma</p>
                    </div>
                </div>
                <button onClick={save} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                    background: saved ? 'linear-gradient(135deg, #059669, #34d399)' : 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff', opacity: saving ? 0.6 : 1, transition: 'all 0.3s',
                    boxShadow: saved ? '0 4px 15px rgba(52,211,153,0.3)' : '0 4px 15px rgba(225,29,72,0.3)',
                }}><Save style={{ width: 14, height: 14 }} /> {saving ? 'Kaydediliyor...' : saved ? '✅ Kaydedildi' : 'Kaydet'}</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
                            border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            background: tab === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                            color: tab === t.id ? t.color : '#64748b', transition: 'all 0.2s',
                            borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                        }}><Icon style={{ width: 13, height: 13 }} /> {t.label}</button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="glossy-panel" style={{ padding: '24px 28px' }}>
                {tab === 'branding' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div><label style={labelStyle}>Site Başlığı</label><input value={config.siteTitle || ''} onChange={e => u('siteTitle', e.target.value)} style={inputStyle} placeholder="SopranoChat" /></div>
                        <div><label style={labelStyle}>Slogan</label><input value={config.siteSlogan || ''} onChange={e => u('siteSlogan', e.target.value)} style={inputStyle} placeholder="Sesli & Görüntülü Sohbet" /></div>
                        <div><label style={labelStyle}>Footer Metni</label><input value={config.footerText || ''} onChange={e => u('footerText', e.target.value)} style={inputStyle} /></div>
                    </div>
                )}

                {tab === 'pricing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {[
                            { prefix: 'p1', label: 'Paket 1', color: '#38bdf8' },
                            { prefix: 'p2', label: 'Paket 2', color: '#a78bfa' },
                            { prefix: 'p3', label: 'Paket 3', color: '#fbbf24' },
                        ].map(pkg => (
                            <div key={pkg.prefix} style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: pkg.color, marginBottom: 12, textTransform: 'uppercase' as const }}>{pkg.label}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div><label style={labelStyle}>Paket Adı</label><input value={config.pricing?.[`${pkg.prefix}Name`] || ''} onChange={e => u(`pricing.${pkg.prefix}Name`, e.target.value)} style={inputStyle} /></div>
                                    <div><label style={labelStyle}>Aylık Fiyat (₺)</label><input value={config.pricing?.[`${pkg.prefix}Monthly`] || ''} onChange={e => u(`pricing.${pkg.prefix}Monthly`, e.target.value)} style={inputStyle} /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'banks' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {(config.banks || [{ bank: '', name: '', iban: '' }]).map((b: any, i: number) => (
                            <div key={i} style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>🏦 Hesap {i + 1}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <div><label style={labelStyle}>Banka</label><input value={b.bank || ''} onChange={e => { const banks = [...(config.banks || [])]; banks[i] = { ...banks[i], bank: e.target.value }; u('banks', banks); }} style={inputStyle} placeholder="Akbank" /></div>
                                    <div><label style={labelStyle}>Hesap Adı</label><input value={b.name || ''} onChange={e => { const banks = [...(config.banks || [])]; banks[i] = { ...banks[i], name: e.target.value }; u('banks', banks); }} style={inputStyle} placeholder="SopranoChat" /></div>
                                    <div><label style={labelStyle}>IBAN</label><input value={b.iban || ''} onChange={e => { const banks = [...(config.banks || [])]; banks[i] = { ...banks[i], iban: e.target.value }; u('banks', banks); }} style={inputStyle} placeholder="TR78..." /></div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => u('banks', [...(config.banks || []), { bank: '', name: '', iban: '' }])} style={{ padding: '8px', borderRadius: 8, border: '1px dashed rgba(52,211,153,0.3)', background: 'transparent', color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Hesap Ekle</button>
                    </div>
                )}

                {tab === 'contact' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div><label style={labelStyle}>WhatsApp</label><input value={config.contact?.whatsapp || ''} onChange={e => u('contact.whatsapp', e.target.value)} style={inputStyle} placeholder="+90 5xx xxx xx xx" /></div>
                        <div><label style={labelStyle}>E-posta</label><input value={config.contact?.email || ''} onChange={e => u('contact.email', e.target.value)} style={inputStyle} placeholder="info@sopranochat.com" /></div>
                        <div><label style={labelStyle}>Web Adresi</label><input value={config.contact?.address || ''} onChange={e => u('contact.address', e.target.value)} style={inputStyle} placeholder="www.sopranochat.com" /></div>
                    </div>
                )}
            </div>
        </div>
    );
}
