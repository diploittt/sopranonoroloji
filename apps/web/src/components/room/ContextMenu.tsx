'use client';

import { useState, useEffect } from 'react';

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

    // Ekran dışına taşmayı önle
    useEffect(() => {
        const menuWidth = 240;
        const menuHeight = items.length * 42 + 16;
        const newX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : x;
        const newY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 8 : y;
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
                className="context-menu fixed z-[10001] min-w-[230px] max-w-[280px] overflow-hidden"
                style={{
                    left: adjustedPos.x,
                    top: adjustedPos.y,
                    background: 'linear-gradient(160deg, rgba(10, 15, 28, 0.98) 0%, rgba(7, 11, 20, 0.99) 100%)',
                    border: '1px solid rgba(123, 159, 239, 0.15)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0,0,0,0.3), 0 0 30px rgba(123, 159, 239, 0.04), inset 0 1px 0 rgba(123, 159, 239, 0.06)',
                    animation: 'ctxMenuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={handleMenuClick}
                onMouseDown={(e) => e.preventDefault()}
            >
                {/* Accent line */}
                <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #7b9fef, #a3bfff, transparent)',
                    opacity: 0.6,
                }} />

                <div style={{ padding: '6px' }}>
                    {items.map((item, idx) => {
                        if (item.type === 'divider') {
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        height: '1px',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                                        margin: '4px 8px',
                                    }}
                                />
                            );
                        }

                        const isSubmenu = item.type === 'submenu';
                        const isSubOpen = submenuOpen === item.id;

                        return (
                            <div key={item.id} className="relative">
                                <button
                                    onClick={() => handleItemClick(item)}
                                    onMouseEnter={() => {
                                        if (isSubmenu) setSubmenuOpen(item.id);
                                        else setSubmenuOpen(null);
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        color: '#c8cdd3',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease',
                                        textAlign: 'left',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(123, 159, 239, 0.08)';
                                        e.currentTarget.style.color = '#a3bfff';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#c8cdd3';
                                    }}
                                >
                                    {item.icon && (
                                        <span style={{ fontSize: '15px', width: '22px', textAlign: 'center', flexShrink: 0 }}>
                                            {item.icon}
                                        </span>
                                    )}
                                    <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
                                    {isSubmenu && (
                                        <span style={{ color: '#4b5563', fontSize: '11px', marginLeft: 'auto' }}>▸</span>
                                    )}
                                    {item.confirm && (
                                        <span style={{
                                            width: '5px', height: '5px', borderRadius: '50%',
                                            background: '#ef4444', flexShrink: 0, opacity: 0.7,
                                        }} />
                                    )}
                                </button>

                                {isSubmenu && isSubOpen && (
                                    <div
                                        style={{
                                            overflow: 'hidden',
                                            marginTop: '2px',
                                            marginLeft: '12px',
                                            marginRight: '6px',
                                            borderLeft: '2px solid rgba(123, 159, 239, 0.25)',
                                            paddingLeft: '8px',
                                            animation: 'ctxSubIn 0.12s ease-out',
                                        }}
                                    >
                                        {item.submenu?.map(subItem => (
                                            <button
                                                key={subItem.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onItemClick(subItem);
                                                    onClose();
                                                }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '7px 12px',
                                                    border: 'none',
                                                    borderRadius: '7px',
                                                    background: 'transparent',
                                                    color: '#c8cdd3',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.12s ease',
                                                    textAlign: 'left',
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(123, 159, 239, 0.08)';
                                                    e.currentTarget.style.color = '#a3bfff';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = '#c8cdd3';
                                                }}
                                            >
                                                {subItem.icon && (
                                                    <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>
                                                        {subItem.icon}
                                                    </span>
                                                )}
                                                <span>{subItem.label}</span>
                                                {subItem.duration && (
                                                    <span style={{
                                                        marginLeft: 'auto',
                                                        fontSize: '10px',
                                                        color: 'rgba(255,255,255,0.3)',
                                                        fontWeight: 400,
                                                    }}>
                                                        {subItem.duration === 'permanent' ? '∞' : subItem.duration}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes ctxMenuIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes ctxSubIn {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 300px; }
                }
            `}</style>
        </>
    );
}
