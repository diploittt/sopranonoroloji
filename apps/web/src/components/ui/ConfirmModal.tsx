
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
        danger: { icon: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/20' },
        warning: { icon: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', btn: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' },
        info: { icon: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' }
    };

    const style = colors[type];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/15 transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-xs shadow-lg rounded-xl p-5 animate-in zoom-in-95 fade-in duration-200 cursor-grab active:cursor-grabbing" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} onMouseDown={onDragMouseDown}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`w-10 h-10 rounded-xl ${style.bg} ${style.border} border flex items-center justify-center mb-3`}>
                        <AlertTriangle className={`w-5 h-5 ${style.icon}`} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 mb-5">{message}</p>

                    <div className="flex gap-2.5 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium text-xs transition border border-gray-200"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 py-2 rounded-lg ${style.btn} text-white font-bold text-xs shadow-lg transition active:scale-95`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
