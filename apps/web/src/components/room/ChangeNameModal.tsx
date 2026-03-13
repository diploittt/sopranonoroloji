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
            <div className="fixed inset-0 z-[10000]" onClick={onClose} style={{ background: 'rgba(0,0,0,0.12)' }} />
            <div className="fixed inset-0 z-[10001] flex items-start justify-center p-4" style={centered ? { paddingTop: '15vh' } : { display: 'block' }}>
                <div
                    ref={modalRef}
                    className="w-full max-w-[260px] animate-pure-fade"
                    style={{
                        ...modalStyle,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header — koyu tema */}
                    <div
                        className="flex items-center justify-between px-3 py-1.5"
                        onMouseDown={handleMouseDown}
                        style={{ cursor: 'move', userSelect: 'none', background: '#1e293b' }}
                    >
                        <h2 style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.04em', textTransform: 'uppercase' as any }}>
                            <span style={{ fontSize: 13 }}>✏️</span> İsim Değiştir
                        </h2>
                        <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >✕</button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div>
                            <label style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600 }}>Mevcut İsim</label>
                            <div style={{ fontSize: 11, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '5px 10px', border: '1px solid #e2e8f0' }}>{currentName}</div>
                        </div>
                        <div>
                            <label style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600 }}>Yeni İsim</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                                maxLength={20}
                                placeholder="Yeni isminizi yazın..."
                                style={{
                                    width: '100%', fontSize: 11, color: '#1e293b', borderRadius: 8,
                                    padding: '5px 10px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none',
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                {error && <span style={{ fontSize: 10, color: '#ef4444' }}>{error}</span>}
                                <span style={{ fontSize: 9, color: name.trim().length > 18 ? '#0f172a' : '#94a3b8', marginLeft: 'auto' }}>
                                    {name.trim().length}/20
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                            <button type="button" onClick={onClose} style={{
                                flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, color: '#475569',
                                background: '#f1f5f9', border: '1px solid #e2e8f0',
                                borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                            }}>İptal</button>
                            <button type="submit" style={{
                                flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, color: '#fff',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                border: 'none', borderRadius: 8, cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(30,58,95,0.15)',
                            }}>Değiştir</button>
                        </div>
                    </form>
                </div>
            </div>
        </>,
        document.body
    );
}
