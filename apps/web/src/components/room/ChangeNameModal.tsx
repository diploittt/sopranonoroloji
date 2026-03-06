'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ChangeNameModalProps {
    isOpen: boolean;
    currentName: string;
    onClose: () => void;
    onSubmit: (newName: string) => void;
}

export function ChangeNameModal({ isOpen, currentName, onClose, onSubmit }: ChangeNameModalProps) {
    const [name, setName] = useState(currentName);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            setError('');
            setCentered(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, currentName]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        if (centered) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.top });
            offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCentered(false);
        } else {
            offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
        dragging.current = true;
        e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offset.current.y)),
            });
        };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    if (!isOpen) return null;

    const validate = (value: string): string => {
        if (value.trim().length < 2) return 'İsim en az 2 karakter olmalıdır.';
        if (value.trim().length > 20) return 'İsim en fazla 20 karakter olabilir.';
        if (value.trim() === currentName) return 'Yeni isim mevcut isimle aynı.';
        return '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validate(name);
        if (validationError) { setError(validationError); return; }
        onSubmit(name.trim());
        onClose();
    };

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[10000] bg-black/40" onClick={onClose} />
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4" style={centered ? {} : { display: 'block' }}>
                <div
                    ref={modalRef}
                    className="w-full max-w-md p-6 animate-pure-fade"
                    style={{
                        ...modalStyle,
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderTop: '1px solid rgba(255,255,255,0.30)',
                        borderRadius: '18px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px rgba(255,255,255,0.02)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Accent */}
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(251,191,36,0.3), transparent)', opacity: 0.7, borderRadius: '18px 18px 0 0', marginTop: '-1px' }} />

                    {/* Header - Draggable */}
                    <div
                        className="flex items-center justify-between mb-6 mt-4 px-1"
                        onMouseDown={handleMouseDown}
                        style={{ cursor: 'move', userSelect: 'none' }}
                    >
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl">✏️</span>
                            İsim Değiştir
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Mevcut İsim</label>
                            <div className="text-sm text-gray-300 bg-white/5 rounded-xl px-4 py-3 border border-white/5">{currentName}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Yeni İsim</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                                maxLength={20}
                                placeholder="Yeni isminizi yazın..."
                                className="w-full text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:border-sky-400/40 focus:outline-none transition-colors placeholder:text-gray-500"
                                style={{ background: 'rgba(15,23,42,0.6)' }}
                            />
                            <div className="flex justify-between mt-1">
                                {error && <span className="text-xs text-red-400">{error}</span>}
                                <span className={`text-xs ml-auto ${name.trim().length > 18 ? 'text-sky-400' : 'text-gray-500'}`}>
                                    {name.trim().length}/20
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors">İptal</button>
                            <button type="submit" className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 rounded-xl transition-all shadow-lg shadow-sky-600/20">Değiştir</button>
                        </div>
                    </form>
                </div>
            </div>
        </>,
        document.body
    );
}
