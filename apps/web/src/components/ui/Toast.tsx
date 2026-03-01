"use client";

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Fade in
        requestAnimationFrame(() => setVisible(true));

        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onRemove, 300); // Wait for fade-out
        }, toast.duration || 2500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast.id]);

    const neonColors: Record<ToastType, { border: string; shadow: string; text: string }> = {
        success: {
            border: 'border-emerald-400/40',
            shadow: '0 0 12px rgba(52,211,153,0.3)',
            text: 'text-emerald-300',
        },
        error: {
            border: 'border-red-400/40',
            shadow: '0 0 12px rgba(248,113,113,0.3)',
            text: 'text-red-300',
        },
        info: {
            border: 'border-cyan-400/40',
            shadow: '0 0 12px rgba(34,211,238,0.3)',
            text: 'text-cyan-300',
        },
    };

    const style = neonColors[toast.type];

    return (
        <div
            className={`pointer-events-auto px-4 py-2 rounded-lg border bg-black/60 backdrop-blur-sm ${style.border} ${style.text} transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ boxShadow: style.shadow }}
        >
            <span className="text-xs font-medium">{toast.message || toast.title}</span>
        </div>
    );
}

// Hook to manage toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message, duration }]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, removeToast };
}
