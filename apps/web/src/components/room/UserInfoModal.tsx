'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, User as UserIcon, Shield, Clock, Globe } from 'lucide-react';

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
        { label: 'IP', value: user.ip || 'Gizli', icon: '🌐' },
        { label: 'Katılım', value: user.joinedAt ? new Date(user.joinedAt).toLocaleString('tr-TR') : 'Bilinmiyor', icon: '📅' },
        { label: 'User ID', value: user.userId || user.id || '-', icon: '🆔' },
    ];

    return createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '380px', maxHeight: '90vh',
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.30)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05))',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', boxShadow: '0 0 20px rgba(99,102,241,0.3)',
                            overflow: 'hidden',
                        }}>
                            {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} /> : <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{(user.displayName || user.username || '?').charAt(0)}</span>}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '15px', fontWeight: 700, color: '#e2e0ff',
                                letterSpacing: '0.3px',
                            }}>{user.displayName || user.username}</div>
                            <div style={{
                                fontSize: '11px', color: 'rgba(167,139,250,0.7)', fontWeight: 500,
                            }}>{user.role || 'Misafir'}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none',
                            borderRadius: '10px', padding: '6px', cursor: 'pointer',
                            color: '#6b7280', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Fields */}
                <div style={{ padding: '16px 24px' }}>
                    {fields.map((field, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px' }}>{field.icon}</span>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                    {field.label}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '12px', color: '#e2e0ff', fontWeight: 600,
                                maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {field.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
