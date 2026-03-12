'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@/hooks/useDraggable';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const variantConfig = {
    danger: {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        ),
        iconBg: 'bg-red-500/15',
        iconRing: 'ring-red-500/30',
        buttonBg: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/30',
        accentColor: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.15)',
    },
    warning: {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        iconBg: 'bg-orange-500/15',
        iconRing: 'ring-orange-500/30',
        buttonBg: 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-900/30',
        accentColor: '#f97316',
        glowColor: 'rgba(249, 115, 22, 0.15)',
    },
    info: {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
        iconBg: 'bg-sky-500/15',
        iconRing: 'ring-sky-500/30',
        buttonBg: 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 shadow-lg shadow-sky-900/30',
        accentColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.15)',
    },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Onayla',
    cancelLabel = 'İptal',
    variant = 'info',
    onConfirm,
    onCancel,
}) => {
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();
    // ESC key handler
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        },
        [onCancel]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const config = variantConfig[variant];

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-start justify-center p-4" style={{ paddingTop: '15vh' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 animate-pure-fade"
                style={{ background: 'rgba(0,0,0,0.25)' }}
                onClick={onCancel}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-[300px] rounded-2xl overflow-hidden animate-pure-fade cursor-grab active:cursor-grabbing"
                style={{
                    background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                    backdropFilter: 'blur(28px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                    border: '1px solid rgba(255,255,255,0.65)',
                    boxShadow: `0 25px 60px rgba(0,0,0,0.18), 0 0 30px ${config.glowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                onMouseDown={onDragMouseDown}
            >
                {/* Top accent line */}
                <div
                    className="h-[2px] w-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)` }}
                />

                {/* Content */}
                <div className="p-4">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.iconBg} ring-1 ${config.iconRing} flex items-center justify-center`}>
                            {config.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="text-[15px] font-bold text-gray-800 leading-tight">{title}</h3>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-[12px] text-gray-600 leading-relaxed ml-12 mb-4">
                        {message}
                    </p>

                    {/* Divider */}
                    <div className="h-px mb-3" style={{ background: 'rgba(148,163,184,0.15)' }} />

                    {/* Buttons */}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onCancel}
                            className="confirm-btn-cancel px-4 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 transition-all duration-200"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            className={`confirm-btn-confirm px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-200 ${config.buttonBg}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
