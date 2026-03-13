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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 animate-in fade-in duration-200">
            <div
                className="rounded-xl w-full max-w-sm shadow-lg animate-pure-fade"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragMouseDown} style={{ borderBottom: '1px solid #f1f5f9', background: '#1e293b', borderRadius: '12px 12px 0 0' }}>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wide">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

