"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useDraggable } from "@/hooks/useDraggable";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const { offset, handleMouseDown: onDragMouseDown, reset: resetDrag } = useDraggable();

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) resetDrag();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="rounded-2xl w-full max-w-md shadow-2xl animate-pure-fade"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.30)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/[0.08] cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragMouseDown}>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

