"use client";

import { useEffect, useRef, useState, ReactNode } from 'react';
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
                    className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[2px]"
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
                    top: position.top,
                    left: position.left,
                    transform: `translate(-50%, ${position.placement === 'top' ? '-100%' : '0'})`,
                    opacity: animateIn ? 1 : 0,
                    transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    ...(animateIn ? {} : {
                        transform: `translate(-50%, ${position.placement === 'top' ? 'calc(-100% + 12px)' : '-12px'})`,
                    }),
                }}
            >
                {/* ═══ TOAST VARIANT ═══ */}
                {variant === 'toast' && (
                    <div className={`
                        relative overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl ring-1 ring-white/10
                        bg-[#0f111a]/95 pl-4 pr-5 py-3 border-l-4
                        ${toastType === 'error' ? 'border-l-red-500 border-white/5' : ''}
                        ${toastType === 'success' ? 'border-l-emerald-500 border-white/5' : ''}
                        ${toastType === 'info' ? 'border-l-indigo-500 border-white/5' : ''}
                    `}>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                            {toastType === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                            {toastType === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                            {toastType === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
                            <span className="text-sm font-medium text-white">{message || children}</span>
                        </div>
                    </div>
                )}

                {/* ═══ CONFIRM VARIANT ═══ */}
                {variant === 'confirm' && (
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 bg-[#0c0e17]/95 p-5 min-w-[300px]">
                        {/* Decorative gradient top line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-orange-400 to-red-500 opacity-60" />

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <h4 className="text-sm font-bold text-white">{title || 'Onaylıyor musunuz?'}</h4>
                                {children && <p className="text-xs text-gray-400 leading-relaxed">{children}</p>}
                            </div>
                            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-all duration-200 border border-white/5 hover:border-white/10"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => { onConfirm?.(); onClose(); }}
                                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-xs font-bold text-white transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ PANEL VARIANT — Premium Glassmorphism ═══ */}
                {variant === 'panel' && (
                    <div className="relative overflow-hidden rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.4),0_0_30px_rgba(56,189,248,0.05)] min-w-[240px]" style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'linear-gradient(135deg, rgba(51,65,85,0.93), rgba(30,41,59,0.95))', backdropFilter: 'blur(28px)' }}>
                        {/* Glass Background */}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 100%)' }} />

                        {/* Decorative top accent — gradient line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(125,211,252,0.3), transparent)' }} />

                        {/* Corner glows */}
                        <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(56,189,248,0.04)' }} />
                        <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(125,211,252,0.03)' }} />

                        <div className="relative z-10 flex flex-col max-h-[600px]">
                            {/* Header */}
                            {title && (
                                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
                                    <h3 className="text-[13px] font-extrabold text-white/90 tracking-wide" style={{ textShadow: '0 0 20px rgba(123,159,239,0.15)' }}>{title}</h3>
                                    <button
                                        onClick={onClose}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all duration-200 group"
                                    >
                                        <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
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
