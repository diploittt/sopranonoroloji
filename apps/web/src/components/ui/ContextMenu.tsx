import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// MenuItem interface (previously from menuRegistry, now defined locally)
interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    divider?: boolean;
    danger?: boolean;
    disabled?: boolean;
}
import * as LucideIcons from 'lucide-react';

// Map string icon names to actual components
const IconMap: Record<string, any> = LucideIcons;

interface ContextMenuProps {
    items: MenuItem[];
    anchorPoint: { x: number; y: number } | null;
    x: number;
    y: number;
    onClose: () => void;
    onAction: (itemId: string) => void;
}

export function ContextMenu({ items, anchorPoint, onClose, onAction }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);

    // Track previous anchor to detect changes during render
    const [prevAnchor, setPrevAnchor] = useState<{ x: number; y: number } | null>(null);

    // If anchorPoint changes (new open or move), reset visibility to false immediately
    if (anchorPoint !== prevAnchor) {
        setPrevAnchor(anchorPoint);
        setIsVisible(false);
    }

    useLayoutEffect(() => {
        if (anchorPoint && menuRef.current) {
            const menu = menuRef.current;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = menu;

            let x = anchorPoint.x;
            let y = anchorPoint.y;

            const padding = 8;
            if (x + offsetWidth + padding > innerWidth) {
                x = Math.max(0, innerWidth - offsetWidth - padding);
            }
            if (y + offsetHeight + padding > innerHeight) {
                y = Math.max(0, innerHeight - offsetHeight - padding);
            }

            setPosition({ x, y });
            setIsVisible(true);
        }
    }, [anchorPoint]);

    // Close on click outside
    useLayoutEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick, true);
        return () => document.removeEventListener('mousedown', handleClick, true);
    }, [onClose]);

    // Close on scroll/resize
    useLayoutEffect(() => {
        const handleResizeOrScroll = () => onClose();
        window.addEventListener('scroll', handleResizeOrScroll, true);
        window.addEventListener('resize', handleResizeOrScroll);
        return () => {
            window.removeEventListener('scroll', handleResizeOrScroll, true);
            window.removeEventListener('resize', handleResizeOrScroll);
        };
    }, [onClose]);

    if (!anchorPoint || items.length === 0) return null;

    // Filter adjacent separators
    const displayItems = items.filter((item, i, arr) => {
        if (item.divider) {
            const prev = arr[i - 1];
            const next = arr[i + 1];
            if (!prev || prev.divider) return false;
            if (!next) return false;
        }
        return true;
    });

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                zIndex: 9999,
                minWidth: 220,
                top: position.y,
                left: position.x,
                opacity: isVisible ? 1 : 0,
                visibility: isVisible ? 'visible' : 'hidden',
                background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                backdropFilter: 'blur(28px) saturate(130%)',
                WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                border: '1px solid rgba(255,255,255,0.65)',
                borderRadius: 14,
                boxShadow: '0 16px 48px -8px rgba(0,0,0,0.22), 0 6px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                padding: '5px',
                overflow: 'hidden',
                animation: isVisible ? 'ctxUiMenuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {displayItems.map((item, idx) => {
                if (item.divider) {
                    return <div key={`sep-${idx}`} style={{
                        height: 1,
                        margin: '4px 10px',
                        background: 'linear-gradient(90deg, transparent 5%, rgba(148,163,184,0.25) 50%, transparent 95%)',
                    }} />;
                }

                const Icon = item.icon ? IconMap[item.icon] : null;

                return (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (!item.disabled) {
                                onAction(item.id);
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: item.danger ? '#dc2626' : '#1e293b',
                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                            opacity: item.disabled ? 0.45 : 1,
                            transition: 'background 0.12s ease',
                            lineHeight: 1.4,
                        }}
                        onMouseOver={(e) => {
                            if (!item.disabled) {
                                (e.currentTarget as HTMLElement).style.background = item.danger
                                    ? 'rgba(220,38,38,0.08)'
                                    : 'rgba(37,99,235,0.08)';
                            }
                        }}
                        onMouseOut={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                    >
                        {Icon && <Icon style={{
                            width: 16,
                            height: 16,
                            color: item.danger ? '#dc2626' : '#475569',
                            flexShrink: 0,
                        }} />}
                        <span style={{ flex: 1 }}>{item.label}</span>
                    </button>
                );
            })}

            <style>{`
                @keyframes ctxUiMenuIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    );
}
