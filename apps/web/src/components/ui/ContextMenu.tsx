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
    // This happens during render, before paint, avoiding the flash of old position
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

            // Padding from edge
            const padding = 8;

            // Check right edge
            if (x + offsetWidth + padding > innerWidth) {
                x = Math.max(0, innerWidth - offsetWidth - padding);
            }

            // Check bottom edge
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
        // Use mousedown capture to handle it before others
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
            if (!prev || prev.divider) return false; // No ref to previous, or prev is also divider
            if (!next) return false; // Last item can't be divider
        }
        return true;
    });

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[220px] bg-[#0a0f1c]/95 backdrop-blur-xl border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(123,159,239,0.04)] py-1.5 origin-top-left"
            style={{
                top: position.y,
                left: position.x,
                opacity: isVisible ? 1 : 0,
                visibility: isVisible ? 'visible' : 'hidden',
                borderColor: 'rgba(123, 159, 239, 0.15)',
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {displayItems.map((item, idx) => {
                if (item.divider) {
                    return <div key={`sep-${idx}`} className="my-1.5 h-px mx-2" style={{ background: 'linear-gradient(90deg, transparent, rgba(123, 159, 239, 0.15), transparent)' }} />;
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
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors text-sm font-medium
                            ${item.danger
                                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                : 'text-gray-300 hover:bg-[#7b9fef]/8 hover:text-[#a3bfff]'}
                            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                    >
                        {Icon && <Icon className={`w-4 h-4 ${item.danger ? 'text-red-400' : 'text-gray-500'}`} />}
                        <span className="flex-1">{item.label}</span>
                    </button>
                );
            })}
        </div>,
        document.body // Portal to body to avoid z-index/overflow issues within containers
    );
}
