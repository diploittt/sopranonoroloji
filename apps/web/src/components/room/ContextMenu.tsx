'use client';

<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
=======
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string | React.ReactNode;
    action?: string;
    type?: 'item' | 'submenu' | 'divider';
    submenu?: ContextMenuItem[];
    confirm?: boolean;
    confirmMessage?: string;
    description?: string;
    showWhen?: string;
    badge?: string;
    features?: string[];
    duration?: number | string;
    scope?: string;
    _confirmed?: boolean;
    danger?: boolean;
    /** Kategori: 'mod' | 'social' | 'info' — tab filtreleme için */
    category?: 'mod' | 'social' | 'info';
    /** Hızlı işlem grid'de gösterilsin mi */
    quickAction?: boolean;
    /** Hover rengi */
    hoverColor?: string;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    x: number;
    y: number;
    onClose: () => void;
    onItemClick: (item: ContextMenuItem) => void;
    title?: string;
    titleIcon?: string;
    /** Hedef kullanıcı bilgisi — varsa üstte profil header gösterilir */
    targetUser?: {
        displayName?: string;
        username?: string;
        avatar?: string;
        role?: string;
        userId?: string;
    };
}

/* ─── Rol yardımcıları ────────────────────────────────────────── */
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
const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
        case 'godmaster': return '#9333ea';
        case 'owner': return '#d97706';
        case 'superadmin': return '#2563eb';
        case 'admin': return '#3b82f6';
        case 'moderator': return '#059669';
        case 'operator': return '#0891b2';
        case 'vip': return '#ca8a04';
        case 'member': return '#64748b';
        default: return '#94a3b8';
    }
};

/* ─── Kategori Tab'ları ────────────────────────────────────────── */
const TABS = [
    { id: 'all', label: 'Tümü' },
    { id: 'mod', label: 'Yönetim' },
    { id: 'social', label: 'Sosyal' },
] as const;

/* ─── Kategori başlıkları ────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
    mod: 'Yönetim',
    social: 'Etkileşim',
    info: 'Bilgi',
};

/* ─── Ana Bileşen ────────────────────────────────────────────── */
export default function ContextMenu({
    items,
    x,
    y,
    onClose,
    onItemClick,
    title,
    titleIcon,
    targetUser,
}: ContextMenuProps) {
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
    const [adjustedPos, setAdjustedPos] = useState({ x, y });
<<<<<<< HEAD
    const menuRef = useRef<HTMLDivElement>(null);

    // Ekran dışına taşmayı önle
    useEffect(() => {
        const menuWidth = 220;
        const maxMenuHeight = 360;
        const newX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x;
        const newY = y + maxMenuHeight > window.innerHeight ? window.innerHeight - maxMenuHeight - 8 : y;
        setAdjustedPos({ x: Math.max(8, newX), y: Math.max(8, newY) });
=======
    const [activeTab, setActiveTab] = useState<string>('all');
    const menuRef = useRef<HTMLDivElement>(null);

    const hasUser = !!targetUser;

    // Ekran dışına taşmayı önle
    useLayoutEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const pad = 8;
        let newX = x;
        let newY = y;
        if (x + rect.width + pad > window.innerWidth) newX = Math.max(pad, window.innerWidth - rect.width - pad);
        if (y + rect.height + pad > window.innerHeight) newY = Math.max(pad, window.innerHeight - rect.height - pad);
        setAdjustedPos({ x: newX, y: newY });
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
    }, [x, y, items.length]);

    useEffect(() => {
        const handleClickOutside = () => onClose();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    // Tab değiştiğinde submenu kapat
    useEffect(() => { setSubmenuOpen(null); }, [activeTab]);

    const handleItemClick = (item: ContextMenuItem) => {
        if (item.type === 'submenu') {
            setSubmenuOpen(submenuOpen === item.id ? null : item.id);
            return;
        }
        onItemClick(item);
        onClose();
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

<<<<<<< HEAD
    // Danger / warning actions get red tint
    const isDanger = (id: string) =>
        /ban|kick|mute|gag|block|sil|remove|delete/i.test(id);

    return (
=======
    /* ─── Quick action items ─── */
    const quickItems = items.filter(i => i.quickAction && i.type !== 'divider');

    /* ─── Hangi tab'lar item içeriyor? Boş olanları gizle ─── */
    const regularItems = items.filter(i => !i.quickAction && i.type !== 'divider');
    const visibleTabs = TABS.filter(tab => {
        if (tab.id === 'all') return true; // "Tümü" her zaman göster
        return regularItems.some(i => i.category === tab.id);
    });

    /* ─── Tab filtresi ─── */
    const filteredItems = items.filter(i => {
        if (i.quickAction) return false;
        if (i.type === 'divider') return false;
        if (activeTab === 'all') return true;
        return i.category === activeTab;
    });

    /* ─── Gruplandırma ─── */
    const groupedItems: Record<string, ContextMenuItem[]> = {};
    filteredItems.forEach(item => {
        const cat = item.category || 'other';
        if (!groupedItems[cat]) groupedItems[cat] = [];
        groupedItems[cat].push(item);
    });

    const roleColor = getRoleColor(targetUser?.role);

    return createPortal(
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
        <>
            {/* Invisible overlay */}
            <div
                className="fixed inset-0 z-[10000]"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />

            {/* Menu — Admin Panel açık tema */}
            <div
                ref={menuRef}
<<<<<<< HEAD
                className="ctx-modern fixed z-[10001]"
=======
                className="ctx-menu-container"
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                style={{
                    position: 'fixed',
                    zIndex: 10001,
                    left: adjustedPos.x,
                    top: adjustedPos.y,
<<<<<<< HEAD
                    minWidth: '200px',
                    maxWidth: '240px',
                    maxHeight: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(160deg, rgba(12, 17, 30, 0.97) 0%, rgba(8, 12, 22, 0.99) 100%)',
                    border: '1px solid rgba(123, 159, 239, 0.12)',
                    borderRadius: '12px',
                    boxShadow: '0 16px 56px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0,0,0,0.4), 0 0 24px rgba(123, 159, 239, 0.03)',
                    animation: 'ctxMenuIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden',
=======
                    width: 280,
                    maxWidth: 320,
                    background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                    backdropFilter: 'blur(28px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                    border: '1px solid rgba(255,255,255,0.65)',
                    borderRadius: 14,
                    boxShadow: '0 16px 48px -8px rgba(0,0,0,0.22), 0 6px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    animation: 'ctxMenuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#1e293b',
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                }}
                onClick={handleMenuClick}
                onMouseDown={(e) => e.preventDefault()}
            >
<<<<<<< HEAD
                {/* Top accent */}
                <div style={{
                    height: '1.5px',
                    background: 'linear-gradient(90deg, transparent 5%, rgba(123, 159, 239, 0.5) 50%, transparent 95%)',
                    flexShrink: 0,
                }} />

                {/* Scrollable items */}
                <div className="hover-scroll" style={{
                    padding: '4px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    flex: 1,
                    minHeight: 0,
                }}>
                    {items.map((item, idx) => {
                        if (item.type === 'divider') {
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        height: '1px',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                                        margin: '3px 10px',
                                    }}
                                />
                            );
                        }

                        const isSubmenu = item.type === 'submenu';
                        const isSubOpen = submenuOpen === item.id;
                        const danger = isDanger(item.id);

                        return (
                            <div key={item.id}>
                                <button
                                    onClick={() => handleItemClick(item)}
                                    onMouseEnter={() => {
                                        if (isSubmenu) setSubmenuOpen(item.id);
                                        else setSubmenuOpen(null);
                                    }}
                                    className="ctx-item"
                                    data-danger={danger ? 'true' : undefined}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 10px',
                                        border: 'none',
                                        borderRadius: '7px',
                                        background: 'transparent',
                                        color: danger ? '#f87171' : '#bcc3ce',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.1s ease',
                                        textAlign: 'left',
                                        lineHeight: '1.2',
                                    }}
                                >
                                    {item.icon && (
                                        <span style={{
                                            fontSize: '13px',
                                            width: '20px',
                                            textAlign: 'center',
                                            flexShrink: 0,
                                            opacity: 0.85,
                                        }}>
                                            {item.icon}
                                        </span>
                                    )}
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.label}
                                    </span>
                                    {isSubmenu && (
                                        <span style={{
                                            color: 'rgba(123,159,239,0.4)',
                                            fontSize: '9px',
                                            marginLeft: 'auto',
                                            transition: 'transform 0.15s ease',
                                            transform: isSubOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                        }}>▶</span>
                                    )}
                                    {item.confirm && (
                                        <span style={{
                                            width: '4px', height: '4px', borderRadius: '50%',
                                            background: danger ? '#ef4444' : '#fbbf24',
                                            flexShrink: 0, opacity: 0.6,
                                        }} />
                                    )}
                                    {item.badge && (
                                        <span style={{
                                            fontSize: '9px',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(123,159,239,0.12)',
                                            color: '#7b9fef',
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                        }}>{item.badge}</span>
                                    )}
                                </button>

                                {/* Inline submenu — compact accordion */}
                                {isSubmenu && isSubOpen && (
                                    <div
                                        style={{
                                            overflow: 'hidden',
                                            marginLeft: '16px',
                                            marginRight: '4px',
                                            marginTop: '1px',
                                            marginBottom: '2px',
                                            borderLeft: '1.5px solid rgba(123, 159, 239, 0.15)',
                                            paddingLeft: '6px',
                                            animation: 'ctxSubIn 0.12s ease-out',
                                        }}
                                    >
                                        {item.submenu?.map(subItem => {
                                            const subDanger = isDanger(subItem.id);
                                            return (
                                                <button
                                                    key={subItem.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onItemClick(subItem);
                                                        onClose();
                                                    }}
                                                    className="ctx-item"
                                                    data-danger={subDanger ? 'true' : undefined}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '7px',
                                                        padding: '5px 8px',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        background: 'transparent',
                                                        color: subDanger ? '#f87171' : '#9ca3af',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.1s ease',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {subItem.icon && (
                                                        <span style={{ fontSize: '12px', width: '18px', textAlign: 'center', flexShrink: 0, opacity: 0.8 }}>
                                                            {subItem.icon}
                                                        </span>
                                                    )}
                                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {subItem.label}
                                                    </span>
                                                    {subItem.duration && (
                                                        <span style={{
                                                            marginLeft: 'auto',
                                                            fontSize: '9px',
                                                            color: 'rgba(255,255,255,0.2)',
                                                            fontWeight: 400,
                                                            fontFamily: 'monospace',
                                                        }}>
                                                            {subItem.duration === 'permanent' ? '∞' : subItem.duration}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
=======
                {/* ═══ Kullanıcı Header + Quick Actions ═══ */}
                {hasUser && (
                    <div style={{
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {targetUser?.avatar ? (
                                        <img src={targetUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 18, filter: 'brightness(1.2)' }}>👤</span>
                                    )}
                                </div>
                                {/* Online dot */}
                                <div style={{
                                    position: 'absolute', bottom: -1, right: -1,
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: '#34d399',
                                    border: '2px solid #0f172a',
                                }} />
                            </div>
                            {/* İsim + Rol */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: 13, fontWeight: 800, color: '#fff',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                }}>
                                    {targetUser?.displayName || targetUser?.username || 'Kullanıcı'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                    {getRoleIcon(targetUser?.role) && (
                                        <span style={{ fontSize: 10 }}>{getRoleIcon(targetUser.role)}</span>
                                    )}
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                    }}>
                                        {getRoleLabel(targetUser?.role)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Action butonları — sağ taraf */}
                            {quickItems.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    {quickItems.slice(0, 5).map(item => (
                                        <button
                                            key={item.id}
                                            title={item.label}
                                            onClick={() => handleItemClick(item)}
                                            style={{
                                                width: 30, height: 30, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                borderRadius: 7,
                                                background: 'rgba(255,255,255,0.12)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                cursor: 'pointer', transition: 'background 0.15s, transform 0.1s',
                                                color: '#fff', padding: 0,
                                            }}
                                            onMouseOver={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)';
                                            }}
                                            onMouseOut={(e) => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                                            }}
                                            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'; }}
                                            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                                        >
                                            <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon || '•'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ Başlık Bandı (title varsa, user yoksa) ═══ */}
                {!hasUser && title && (
                    <div style={{
                        padding: '10px 14px 8px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        {titleIcon && <span style={{ fontSize: 16 }}>{titleIcon}</span>}
                        <span style={{
                            fontSize: 11, fontWeight: 800, color: '#fff',
                            textTransform: 'uppercase', letterSpacing: '1.5px',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}>{title}</span>
                    </div>
                )}

                {/* ═══ Kategori Sekmeleri — boş olanlar gizlenir ═══ */}
                {hasUser && visibleTabs.length > 1 && (
                    <div style={{
                        display: 'flex', gap: 3, margin: '6px 8px 4px',
                        padding: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 9,
                    }}>
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                                style={{
                                    flex: 1, padding: '4px 0', fontSize: 10.5, fontWeight: 700,
                                    borderRadius: 7, border: 'none', cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    background: activeTab === tab.id ? 'rgba(37,99,235,0.1)' : 'transparent',
                                    color: activeTab === tab.id ? '#0f172a' : '#94a3b8',
                                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ═══ Menü İçerik ═══ */}
                <div className="ctx-scrollable" style={{
                    maxHeight: 380, overflowY: 'auto', padding: 5,
                }}>
                    {activeTab === 'all' || !hasUser ? (
                        Object.entries(groupedItems).map(([cat, catItems]) => (
                            <div key={cat} style={{ marginBottom: 4 }}>
                                {hasUser && CATEGORY_LABELS[cat] && (
                                    <div style={{
                                        padding: '5px 12px 3px', fontSize: 9, fontWeight: 800,
                                        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2,
                                    }}>
                                        {CATEGORY_LABELS[cat]}
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                                    </div>
                                )}
                                {catItems.map(item => (
                                    <MenuItemRow
                                        key={item.id} item={item}
                                        submenuOpen={submenuOpen}
                                        onItemClick={handleItemClick}
                                        onSubmenuHover={(id) => setSubmenuOpen(id)}
                                        onClose={onClose} onItemClickDirect={onItemClick}
                                    />
                                ))}
                            </div>
                        ))
                    ) : (
                        filteredItems.map(item => (
                            <MenuItemRow
                                key={item.id} item={item}
                                submenuOpen={submenuOpen}
                                onItemClick={handleItemClick}
                                onSubmenuHover={(id) => setSubmenuOpen(id)}
                                onClose={onClose} onItemClickDirect={onItemClick}
                            />
                        ))
                    )}
                    {filteredItems.length === 0 && (
                        <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            Bu kategoride işlem yok
                        </div>
                    )}
                </div>

                {/* ═══ Alt Bilgi ═══ */}
                {hasUser && targetUser?.userId && (
                    <div style={{
                        padding: '6px 14px', background: 'rgba(0,0,0,0.04)',
                        fontSize: 9, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic',
                        borderTop: '1px solid rgba(148,163,184,0.12)',
                    }}>
                        ID: {targetUser.userId.slice(0, 8)}
                    </div>
                )}
            </div>

<<<<<<< HEAD
            {/* Animations + hover styles */}
            <style>{`
                @keyframes ctxMenuIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-3px); }
=======
            {/* Animations + Scrollbar */}
            <style>{`
                @keyframes ctxMenuIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes ctxSubIn {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 400px; }
<<<<<<< HEAD
                }
                .ctx-item:hover {
                    background: rgba(123, 159, 239, 0.07) !important;
                    color: #d4daf0 !important;
                }
                .ctx-item[data-danger="true"]:hover {
                    background: rgba(239, 68, 68, 0.08) !important;
                    color: #fca5a5 !important;
=======
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                }
                .ctx-scrollable::-webkit-scrollbar { width: 4px; }
                .ctx-scrollable::-webkit-scrollbar-track { background: transparent; }
                .ctx-scrollable::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
                .ctx-scrollable::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.35); }
            `}</style>
        </>,
        document.body
    );
}

/* ─── Menü Satırı Alt Bileşen ───────────────────────────────── */
function MenuItemRow({
    item, submenuOpen, onItemClick, onSubmenuHover, onClose, onItemClickDirect,
}: {
    item: ContextMenuItem; submenuOpen: string | null;
    onItemClick: (item: ContextMenuItem) => void;
    onSubmenuHover: (id: string | null) => void;
    onClose: () => void; onItemClickDirect: (item: ContextMenuItem) => void;
}) {
    const isSubmenu = item.type === 'submenu';
    const isSubOpen = submenuOpen === item.id;
    const isDanger = item.danger || item.id?.includes('ban') || item.id?.includes('kick') || item.id?.includes('delete');

    return (
        <div className="relative">
            <button
                onClick={() => onItemClick(item)}
                onMouseEnter={() => {
                    if (isSubmenu) onSubmenuHover(item.id);
                    else onSubmenuHover(null);
                }}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 12px', border: 'none', borderRadius: 8,
                    background: isSubOpen ? 'rgba(37,99,235,0.08)' : 'transparent',
                    color: isDanger ? '#dc2626' : '#1e293b',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.12s, color 0.12s',
                    textAlign: 'left', lineHeight: 1.4,
                }}
                onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isDanger
                        ? 'rgba(220,38,38,0.08)' : 'rgba(37,99,235,0.08)';
                }}
                onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isSubOpen
                        ? 'rgba(37,99,235,0.08)' : 'transparent';
                }}
            >
                {item.icon && (
                    <span style={{
                        fontSize: 15, width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: isDanger ? '#dc2626' : '#475569',
                    }}>{item.icon}</span>
                )}
                <span style={{ flex: 1 }}>{item.label}</span>
                {isSubmenu && (
                    <span style={{
                        color: '#94a3b8', fontSize: 13, fontWeight: 700, marginLeft: 'auto',
                        transform: isSubOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                    }}>›</span>
                )}
                {item.badge && (
                    <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                    }}>{item.badge}</span>
                )}
                {item.confirm && (
                    <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#ef4444', flexShrink: 0, opacity: 0.7,
                    }} />
                )}
            </button>

            {/* İç Submenu (accordion) */}
            {isSubmenu && isSubOpen && (
                <div style={{
                    overflow: 'hidden', margin: '2px 6px 2px 16px',
                    paddingLeft: 10,
                    borderLeft: '2px solid rgba(37,99,235,0.15)',
                    animation: 'ctxSubIn 0.15s ease-out',
                }}>
                    {item.submenu?.map(subItem => {
                        const isSubDanger = subItem.danger || subItem.id?.includes('ban') || subItem.id?.includes('kick') || subItem.id?.includes('delete');
                        return (
                            <button
                                key={subItem.id}
                                onClick={(e) => { e.stopPropagation(); onItemClickDirect(subItem); onClose(); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 10px', border: 'none', borderRadius: 7,
                                    background: 'transparent',
                                    color: isSubDanger ? '#dc2626' : '#334155',
                                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                    transition: 'background 0.12s', textAlign: 'left',
                                }}
                                onMouseOver={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = isSubDanger
                                        ? 'rgba(220,38,38,0.06)' : 'rgba(37,99,235,0.06)';
                                }}
                                onMouseOut={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                {subItem.icon && (
                                    <span style={{
                                        fontSize: 13, width: 20, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: isSubDanger ? '#dc2626' : '#64748b',
                                    }}>{subItem.icon}</span>
                                )}
                                <span>{subItem.label}</span>
                                {subItem.duration && (
                                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                                        {subItem.duration === 'permanent' ? '∞' : subItem.duration}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
