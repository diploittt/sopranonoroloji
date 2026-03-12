'use client';

import { useState, useEffect, useRef } from 'react';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
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
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    x: number;
    y: number;
    onClose: () => void;
    onItemClick: (item: ContextMenuItem) => void;
}

export default function ContextMenu({
    items,
    x,
    y,
    onClose,
    onItemClick
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

    return (
        <>
            {/* Invisible overlay */}
            <div
                className="fixed inset-0 z-[10000]"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />

            {/* Menu */}
            <div
                ref={menuRef}
                className="ctx-modern fixed z-[10001]"
                style={{
                    left: adjustedPos.x,
                    top: adjustedPos.y,
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
                }}
                onClick={handleMenuClick}
                onMouseDown={(e) => e.preventDefault()}
            >
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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
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
                    background: rgba(123, 159, 239, 0.07) !important;
                    color: #d4daf0 !important;
                }
                .ctx-item[data-danger="true"]:hover {
                    background: rgba(239, 68, 68, 0.08) !important;
                    color: #fca5a5 !important;
                }
            `}</style>
        </>
    );
}
