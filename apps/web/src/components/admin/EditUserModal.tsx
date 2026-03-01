import React, { useState, useEffect } from 'react';
import { useDraggable } from '@/hooks/useDraggable';
import {
    X,
    Save,
    User,
    Mail,
    Lock,
    Shield,
} from 'lucide-react';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onSave: (userId: string, data: any) => Promise<void>;
    onBan?: (userId: string, data: any) => Promise<void>;
}

const ROLE_OPTIONS = [
    { value: 'owner', label: 'Sahip', color: 'text-amber-400' },
    { value: 'admin', label: 'Admin', color: 'text-orange-400' },
    { value: 'moderator', label: 'Moderatör', color: 'text-[#7b9fef]' },
    { value: 'operator', label: 'Operatör', color: 'text-cyan-400' },
    { value: 'vip', label: 'VIP', color: 'text-yellow-400' },
    { value: 'member', label: 'Üye', color: 'text-sky-400' },
    { value: 'guest', label: 'Misafir', color: 'text-gray-400' },
];

export default function EditUserModal({ isOpen, onClose, user, onSave }: EditUserModalProps) {
    const [loading, setLoading] = useState(false);
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('member');

    // user değiştiğinde formları güncelle
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            setEmail(user.email || '');
            setPassword('');
            setRole(user.role || 'member');
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            const data: any = {
                displayName,
                email,
                role,
            };
            // Şifre sadece girilmişse gönder
            if (password.trim()) {
                data.password = password;
            }
            await onSave(user.id, data);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-600/5 to-amber-700/5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragMouseDown}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-amber-600/20">
                            {(user.displayName || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Üye Düzenle</h2>
                            <p className="text-[11px] text-gray-500">{user.displayName || user.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    {/* Kullanıcı Adı */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Kullanıcı Adı
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Kullanıcı adı"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-600 outline-none transition"
                        />
                    </div>

                    {/* E-posta */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> E-Posta
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="ornek@mail.com"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-600 outline-none transition"
                        />
                    </div>

                    {/* Şifre */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Şifre
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Değiştirmek için yeni şifre girin"
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-600 outline-none transition"
                        />
                        <p className="text-[10px] text-gray-600 ml-1">Boş bırakırsanız mevcut şifre korunur</p>
                    </div>

                    {/* Sınıf / Rol */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Sınıf
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {ROLE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRole(opt.value)}
                                    className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition ${role === opt.value
                                        ? `${opt.color} bg-white/10 border-white/20 shadow-sm`
                                        : 'text-gray-500 bg-[#050505] border-white/5 hover:border-white/10 hover:text-gray-400'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex justify-end gap-2 bg-[#0a0a0c] rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition text-sm font-medium"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-lg shadow-amber-600/20 transition active:scale-95 flex items-center gap-2"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}
