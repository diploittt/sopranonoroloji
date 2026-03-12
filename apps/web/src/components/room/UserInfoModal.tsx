'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface UserInfoModalProps {
    user: any;
    onClose: () => void;
}

export function UserInfoModal({ user, onClose }: UserInfoModalProps) {
    if (!user) return null;

    const fields = [
        { label: 'Kullanıcı Adı', value: user.username || user.displayName, icon: '👤' },
        { label: 'Rol', value: user.role || 'Misafir', icon: '🛡️' },
        { label: 'Durum', value: user.status || 'Çevrimiçi', icon: '🟢' },
        { label: 'Cinsiyet', value: user.gender || 'Belirtilmemiş', icon: '⚧️' },
    ];

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '15vh',
                background: 'rgba(0,0,0,0.25)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '280px', maxHeight: '90vh',
                    background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                    backdropFilter: 'blur(28px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                    border: '1px solid rgba(255,255,255,0.65)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                            border: '2px solid rgba(255,255,255,0.25)',
                        }}>
                            {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>{(user.displayName || user.username || '?').charAt(0)}</span>}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '13px', fontWeight: 700, color: '#fff',
                                letterSpacing: '0.3px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            }}>{user.displayName || user.username}</div>
                            <div style={{
                                fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: 600,
                                textTransform: 'uppercase', letterSpacing: '1px',
                            }}>{user.role || 'Misafir'}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.12)', border: 'none',
                            borderRadius: '6px', padding: '4px', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    >
                        <X size={12} />
                    </button>
                </div>

                {/* Fields */}
                <div style={{ padding: '8px 16px 14px' }}>
                    {fields.map((field, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: i < fields.length - 1 ? '1px solid rgba(148,163,184,0.15)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px' }}>{field.icon}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                    {field.label}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '11px', color: '#1e293b', fontWeight: 700,
                                maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {field.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    );
}
