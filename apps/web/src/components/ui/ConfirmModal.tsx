
import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useDraggable } from '@/hooks/useDraggable';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    type = 'warning'
}: ConfirmModalProps) {
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();
    if (!isOpen) return null;

    const colors = {
        danger: { icon: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', btn: 'bg-gradient-to-r from-red-600 to-rose-600' },
        warning: { icon: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', btn: 'bg-gradient-to-r from-orange-600 to-amber-600' },
        info: { icon: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', btn: 'bg-gradient-to-r from-blue-600 to-indigo-600' }
    };

    const style = colors[type];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-sm shadow-2xl rounded-2xl p-6 animate-in zoom-in-95 fade-in duration-200 cursor-grab active:cursor-grabbing" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.30)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }} onMouseDown={onDragMouseDown}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full ${style.bg} ${style.border} border flex items-center justify-center mb-4`}>
                        <AlertTriangle className={`w-6 h-6 ${style.icon}`} />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-400 mb-6">{message}</p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition border border-white/5"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 py-2.5 rounded-xl ${style.btn} text-white font-bold text-sm shadow-lg hover:brightness-110 transition active:scale-95`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
