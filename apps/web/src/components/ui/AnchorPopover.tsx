"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertTriangle, Info } from 'lucide-react';

interface AnchorPopoverProps {
    targetRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
    onClose: () => void;
    children?: ReactNode;
    variant?: 'toast' | 'confirm' | 'panel';
    title?: string;
    // For Confirm variant
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    // For Toast variant
    toastType?: 'error' | 'success' | 'info';
    message?: string;
    duration?: number;
}

export function AnchorPopover({
    targetRef,
    isOpen,
    onClose,
    children,
    variant = 'panel',
    title,
    onConfirm,
    confirmText = 'Tamam',
    cancelText = 'İptal',
    toastType = 'info',
    message,
    duration = 3000
}: AnchorPopoverProps) {
    const [position, setPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'top' });
    const popoverRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    // Drag state for panel variant
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Animate entrance
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
        }
    }, [isOpen]);

    // Dismiss logic for toast
    useEffect(() => {
        if (isOpen && variant === 'toast') {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, variant, duration, onClose]);

    // Position Calculation
    useEffect(() => {
        if (!isOpen || !targetRef.current) return;

        const updatePosition = () => {
            const target = targetRef.current;
            if (!target) return;

            const rect = target.getBoundingClientRect();
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            let top = rect.top + scrollY - 16;
            let left = rect.left + scrollX + (rect.width / 2);
            let placement: 'top' | 'bottom' = 'top';

            if (rect.top < 200) {
                top = rect.bottom + scrollY + 16;
                placement = 'bottom';
            }

            // Clamp left to prevent overflow
            const vw = window.innerWidth;
            if (left < 200) left = 200;
            if (left > vw - 200) left = vw - 200;

            setPosition({ top, left, placement });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [isOpen, targetRef]);

    // Reset drag offset when popover closes
    useEffect(() => {
        if (!isOpen) setDragOffset(null);
    }, [isOpen]);

    // Drag handlers for panel variant
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (variant !== 'panel' || !popoverRef.current) return;
        e.preventDefault();
        const rect = popoverRef.current.getBoundingClientRect();
        isDraggingRef.current = true;
        dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX: rect.left, elY: rect.top };

        const handleMouseMove = (ev: MouseEvent) => {
            if (!isDraggingRef.current || !dragStartRef.current) return;
            const dx = ev.clientX - dragStartRef.current.mouseX;
            const dy = ev.clientY - dragStartRef.current.mouseY;
            setDragOffset({
                x: dragStartRef.current.elX + dx,
                y: dragStartRef.current.elY + dy,
            });
        };
        const handleMouseUp = () => {
            isDraggingRef.current = false;
            dragStartRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [variant]);

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Don't close when interacting with native <select> dropdowns
            const el = e.target as HTMLElement;
            if (el.tagName === 'OPTION' || el.tagName === 'SELECT') return;
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                targetRef.current &&
                !targetRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, targetRef]);

    // ESC key handler
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    const content = (
        <>
            {/* Backdrop Overlay for panels */}
            {variant === 'panel' && (
                <div
                    className="fixed inset-0 z-[9998] bg-black/15"
                    style={{
                        opacity: animateIn ? 1 : 0,
                        transition: 'opacity 0.2s ease-out',
                    }}
                    onClick={onClose}
                />
            )}

            <div
                ref={popoverRef}
                className="fixed z-[9999]"
                style={{
                    ...(dragOffset ? {
                        top: dragOffset.y,
                        left: dragOffset.x,
                        transform: 'none',
                        transition: 'none',
                        opacity: 1,
                    } : {
                        top: position.top,
                        left: position.left,
                        transform: `translate(-50%, ${position.placement === 'top' ? '-100%' : '0'})`,
                        opacity: animateIn ? 1 : 0,
                        transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        ...(animateIn ? {} : {
                            transform: `translate(-50%, ${position.placement === 'top' ? 'calc(-100% + 12px)' : '-12px'})`,
                        }),
                    }),
                }}
            >
                {/* ═══ TOAST VARIANT ═══ */}
                {variant === 'toast' && (
                    <div className={`
                        relative overflow-hidden rounded-xl border shadow-lg
                        pl-4 pr-5 py-3 border-l-[3px] bg-white
                        ${toastType === 'error' ? 'border-l-red-500 border-gray-200' : ''}
                        ${toastType === 'success' ? 'border-l-green-500 border-gray-200' : ''}
                        ${toastType === 'info' ? 'border-l-blue-500 border-gray-200' : ''}
                    `}>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                            {toastType === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {toastType === 'success' && <Check className="w-4 h-4 text-green-500" />}
                            {toastType === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                            <span className="text-sm font-medium text-slate-700">{message || children}</span>
                        </div>
                    </div>
                )}

                {/* ═══ CONFIRM VARIANT ═══ */}
                {variant === 'confirm' && (
                    <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-lg bg-white p-5 min-w-[280px]">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <h4 className="text-sm font-bold text-slate-800">{title || 'Onaylıyor musunuz?'}</h4>
                                {children && <p className="text-xs text-slate-500 leading-relaxed">{children}</p>}
                            </div>
                            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-slate-600 transition-all duration-200 border border-gray-200"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => { onConfirm?.(); onClose(); }}
                                    className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-all duration-200 shadow-lg shadow-red-500/20"
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ PANEL VARIANT — Premium Glassmorphism ═══ */}
                {variant === 'panel' && (
                    <div className="relative overflow-hidden rounded-xl min-w-[240px]" style={{ border: 'none', background: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
                        <div className="relative z-10 flex flex-col max-h-[420px]">
                            {/* Header */}
                            {title && (
                                <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #f1f5f9', background: '#1e293b', borderRadius: '12px 12px 0 0', cursor: 'move', userSelect: 'none' }} onMouseDown={handleDragStart}>
                                    <h3 className="text-[11px] font-bold text-white tracking-wide uppercase">{title}</h3>
                                    <button
                                        onClick={onClose}
                                        className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 group"
                                    >
                                        <X className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>
                            )}

                            {/* Content */}
                            <div className="custom-scrollbar overflow-y-auto overflow-x-hidden">
                                {children}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    return createPortal(content, document.body);
}
