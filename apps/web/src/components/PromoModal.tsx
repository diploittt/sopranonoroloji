"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDraggable } from "@/hooks/useDraggable";

interface PromoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PromoModal({ isOpen, onClose }: PromoModalProps) {
    const [visible, setVisible] = useState(false);
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 backdrop-blur-md bg-black/80' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>

            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div
                className={`relative w-full max-w-5xl aspect-video bg-black rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            >
                {/* Drag Handle */}
                <div className="absolute top-0 left-0 right-14 h-12 z-40 cursor-grab active:cursor-grabbing" onMouseDown={onDragMouseDown} />
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/60 hover:bg-red-500/20 text-white/70 hover:text-white border border-white/10 hover:border-red-500/50 rounded-lg transition-all backdrop-blur-md group"
                >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>

                {/* Iframe Content */}
                <iframe
                    src="/tanitim.html"
                    className="w-full h-full border-0 bg-black"
                    title="SopranoChat Simulation"
                    allow="microphone; camera; autoplay"
                />

                {/* Loading State Overlay (optional, hides white flash of iframe) */}
                <div className="absolute inset-0 bg-black -z-10 animate-pulse"></div>
            </div>
        </div>
    );
}
