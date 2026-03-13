'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const menuRef = useRef<HTMLDivElement>(null);

    // Ekran dışına taşmayı önle
    useEffect(() => {
        const menuWidth = 220;
        const maxMenuHeight = 360;
        const newX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x;
        const newY = y + maxMenuHeight > window.innerHeight ? window.innerHeight - maxMenuHeight - 8 : y;
        setAdjustedPos({ x: Math.max(8, newX), y: Math.max(8, newY) });
    }, [x, y, items.length]);

    useEffect(() => {
        const handleClickOutside = () => onClose();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    // Tab değiştiğinde submenu kapat
    useEffect(() => { setSubmenuOpen(null); }, []);

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

    // Danger / warning actions get red tint
    const isDanger = (id: string) =>
        /ban|kick|mute|gag|block|sil|remove|delete/i.test(id);

    return createPortal(
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
                className="ctx-modern fixed z-[10001]"
                style={{
                    position: 'fixed',
                    zIndex: 10001,
                    left: adjustedPos.x,
                    top: adjustedPos.y,
                    minWidth: '200px',
                    maxWidth: '240px',
                    maxHeight: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    animation: 'ctxMenuIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden',
                }}
                onClick={handleMenuClick}
                onMouseDown={(e) => e.preventDefault()}
            >
                {/* Top accent */}
                <div style={{
                    height: '1px',
                    background: '#e2e8f0',
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
                                        background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
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
                                        color: danger ? '#f87171' : '#1e293b',
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
                                            color: 'rgba(100,116,139,0.5)',
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
                                            background: '#dbeafe',
                                            color: '#2563eb',
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
                                            borderLeft: '1.5px solid #dbeafe',
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
                                                        color: subDanger ? '#f87171' : '#64748b',
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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ═══ Alt Bilgi ═══ */}
                {targetUser?.userId && (
                    <div style={{
                        padding: '6px 14px', background: 'rgba(0,0,0,0.04)',
                        fontSize: 9, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic',
                        borderTop: '1px solid #f1f5f9',
                    }}>
                        ID: {targetUser.userId.slice(0, 8)}
                    </div>
                )}
            </div>

            {/* Animations + hover styles */}
            <style>{`
                @keyframes ctxMenuIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-3px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes ctxSubIn {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 400px; }
                }
                .ctx-item:hover {
                    background: #dbeafe !important;
                    color: #1e293b !important;
                }
                .ctx-item[data-danger="true"]:hover {
                    background: rgba(220, 38, 38, 0.06) !important;
                    color: #dc2626 !important;
                }
                .ctx-scrollable::-webkit-scrollbar { width: 4px; }
                .ctx-scrollable::-webkit-scrollbar-track { background: #f1f5f9; }
                .ctx-scrollable::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .ctx-scrollable::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
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
