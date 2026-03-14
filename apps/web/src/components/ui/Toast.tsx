"use client";

import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'danger' | 'cyan' | 'white' | 'purple';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastProps) {
    return (
        <div className="flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

type StyleDef = { bg: string; border: string; shadow: string; text: string; icon: string; iconBg: string };

const TOAST_STYLES: Record<ToastType, StyleDef> = {
    success: {
        bg: 'rgba(6,78,59,0.88)',
        border: '1px solid rgba(52,211,153,0.55)',
        shadow: '0 8px 32px rgba(16,185,129,0.35), 0 0 0 1px rgba(52,211,153,0.15)',
        text: '#a7f3d0',
        icon: '✓',
        iconBg: 'rgba(52,211,153,0.25)',
    },
    error: {
        bg: 'rgba(127,29,29,0.88)',
        border: '1px solid rgba(248,113,113,0.55)',
        shadow: '0 8px 32px rgba(239,68,68,0.35), 0 0 0 1px rgba(248,113,113,0.15)',
        text: '#fecaca',
        icon: '✕',
        iconBg: 'rgba(248,113,113,0.25)',
    },
    info: {
        bg: 'rgba(30,58,138,0.88)',
        border: '1px solid rgba(96,165,250,0.55)',
        shadow: '0 8px 32px rgba(59,130,246,0.35), 0 0 0 1px rgba(96,165,250,0.15)',
        text: '#bfdbfe',
        icon: 'ℹ',
        iconBg: 'rgba(96,165,250,0.25)',
    },
    warning: {
        bg: 'rgba(113,63,18,0.88)',
        border: '1px solid rgba(251,191,36,0.55)',
        shadow: '0 8px 32px rgba(245,158,11,0.35), 0 0 0 1px rgba(251,191,36,0.15)',
        text: '#fde68a',
        icon: '⚠',
        iconBg: 'rgba(251,191,36,0.25)',
    },
    danger: {
        bg: 'rgba(153,27,27,0.90)',
        border: '1px solid rgba(220,38,38,0.6)',
        shadow: '0 8px 32px rgba(220,38,38,0.4), 0 0 0 1px rgba(239,68,68,0.2)',
        text: '#fca5a5',
        icon: '🚫',
        iconBg: 'rgba(239,68,68,0.3)',
    },
    cyan: {
        bg: 'rgba(8,51,68,0.88)',
        border: '1px solid rgba(34,211,238,0.55)',
        shadow: '0 8px 32px rgba(6,182,212,0.35), 0 0 0 1px rgba(34,211,238,0.15)',
        text: '#a5f3fc',
        icon: '💬',
        iconBg: 'rgba(34,211,238,0.25)',
    },
    white: {
        bg: 'rgba(30,41,59,0.90)',
        border: '1px solid rgba(255,255,255,0.35)',
        shadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
        text: '#f1f5f9',
        icon: '•',
        iconBg: 'rgba(255,255,255,0.15)',
    },
    purple: {
        bg: 'rgba(76,29,149,0.88)',
        border: '1px solid rgba(168,85,247,0.55)',
        shadow: '0 8px 32px rgba(147,51,234,0.35), 0 0 0 1px rgba(168,85,247,0.15)',
        text: '#e9d5ff',
        icon: '🔱',
        iconBg: 'rgba(168,85,247,0.25)',
    },
};

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onRemove, 300);
        }, toast.duration || 2500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast.id]);

    const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

    return (
        <div
            style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px 10px 12px',
                borderRadius: 16,
                background: s.bg,
                backdropFilter: 'blur(24px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
                border: 'none',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                color: s.text,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.95)',
                minWidth: 220,
                maxWidth: 400,
            }}
        >
            <span style={{
                width: 26, height: 26, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.iconBg,
                fontSize: 14, fontWeight: 900, flexShrink: 0,
            }}>{s.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{toast.message || toast.title}</span>
        </div>
    );
}

// Hook to manage toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message, duration }]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}
