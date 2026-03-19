import React, { useState, useEffect } from 'react';
import { useDraggable } from '@/hooks/useDraggable';
import { API_URL } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EditUserModal from './EditUserModal';
import {
    X,
    Pencil,
    RefreshCw,
    CheckCircle,
    Undo2,
    Trash2,
    Shield,
    Crown,
    Star,
    User,
    Mail,
    Globe,
    Clock,
    Calendar,
    LogIn,
    Wifi,
    WifiOff,
    Ban,
    Wallet,
    Monitor,
    Search
} from 'lucide-react';
import { useAdminStore } from '@/lib/admin/store';

interface MemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId?: string;
    tenantName?: string;
}

// Rol hiyerarşisi (en yüksekten en düşüğe)
const ROLE_HIERARCHY: Record<string, number> = {
    superadmin: 1,
    owner: 2,
    admin: 3,
    moderator: 4,
    operator: 5,
    vip: 6,
    member: 7,
    guest: 99,
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
    superadmin: { label: 'Süper Admin', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', icon: <Crown className="w-3.5 h-3.5" /> },
    owner: { label: 'Sahip', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', icon: <Crown className="w-3.5 h-3.5" /> },
    admin: { label: 'Admin', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', icon: <Shield className="w-3.5 h-3.5" /> },
    moderator: { label: 'Moderatör', color: 'text-[#7b9fef]', bgColor: 'bg-amber-700/10', borderColor: 'border-amber-700/20', icon: <Shield className="w-3.5 h-3.5" /> },
    operator: { label: 'Operatör', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', icon: <Star className="w-3.5 h-3.5" /> },
    vip: { label: 'VIP', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', icon: <Star className="w-3.5 h-3.5" /> },
    member: { label: 'Üye', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', icon: <User className="w-3.5 h-3.5" /> },
};

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d: string | null | undefined) {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} gün önce`;
    return formatDate(d);
}

export default function MemberModal({ isOpen, onClose, tenantId, tenantName }: MemberModalProps) {
    const [members, setMembers] = useState<any[]>([]);
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Edit state
    const [editingMember, setEditingMember] = useState<any | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);

    // Delete state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Expanded member detail
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const addToast = useAdminStore((state) => state.addToast);

    const showModalToast = (message: string, type: 'success' | 'error') => {
        addToast(message, type);
    };

    const loadMembers = async (currentPage: number, searchTerm: string) => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            let url: string;
            if (tenantId) {
                url = `${API_URL}/admin/customers/${tenantId}/members`;
            } else {
                url = `${API_URL}/admin/users?page=${currentPage}&limit=${limit}&search=${searchTerm}`;
            }
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (tenantId) {
                const arr = Array.isArray(data) ? data : [];
                // Rol hiyerarşisine göre sırala
                arr.sort((a: any, b: any) => {
                    const aRank = ROLE_HIERARCHY[a.role] ?? 50;
                    const bRank = ROLE_HIERARCHY[b.role] ?? 50;
                    return aRank - bRank;
                });
                setMembers(arr);
                setTotal(arr.length);
            } else {
                setMembers(data.users || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Members load error:', error);
            showModalToast('Üyeler yüklenirken hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadMembers(page, search);
        }
    }, [isOpen, page, search]);

    const handleOpenEdit = (member: any) => {
        setEditingMember({
            ...member,
            permissions: member.permissions || {
                canCreateRoom: false,
                canBroadcast: false,
                isVip: false,
                ghostMode: false,
            }
        });
        setEditModalOpen(true);
    };

    const handleSaveMember = async (userId: string, data: any) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Güncelleme başarısız');

            showModalToast('Üye başarıyla güncellendi.', 'success');
            loadMembers(page, search);
        } catch (error) {
            showModalToast('Üye güncellenemedi.', 'error');
            console.error('Update member error:', error);
            throw error;
        }
    };

    const handleBanMember = async (userId: string, data: any) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/bans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    ...data
                })
            });

            if (!res.ok) throw new Error('Ban işlemi başarısız');

            showModalToast('Üye yasaklandı.', 'success');
            loadMembers(page, search);
        } catch (error) {
            showModalToast('Üye yasaklanamadı.', 'error');
            console.error('Ban member error:', error);
            throw error;
        }
    };

    const handleDeleteMember = async (id: string) => {
        try {
            const token = sessionStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Silme başarısız');

            showModalToast('Üye başarıyla silindi.', 'success');
            loadMembers(page, search);
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
            showModalToast('Üye silinemedi.', 'error');
            console.error('Delete member error:', error);
        }
    };

    // Arama filtresi (client-side for tenant members)
    const filteredMembers = search && tenantId
        ? members.filter(m =>
            (m.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
            (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (m.role || '').toLowerCase().includes(search.toLowerCase())
        )
        : members;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/15" onClick={onClose}></div>
            <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] animate-in zoom-in-95 fade-in duration-300" style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
                transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}>


                {/* Header */}
                <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragMouseDown}>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white" />
                        <h2 className="text-xs font-bold text-white">
                            {tenantName ? `${tenantName} — Kayıtlı Üyeler` : 'Admin & Yardımcılar'}
                        </h2>
                        <span className="text-[10px] text-gray-400 ml-1">({total})</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => loadMembers(page, search)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all" title="Yenile">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg pl-10 pr-4 py-2 text-slate-800 outline-none focus:border-blue-500 transition text-sm"
                            placeholder="İsim, e-posta veya rol ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-600" />
                            <p className="text-sm">Yükleniyor...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-[#0d0e14] border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-wider">
                                    <th className="px-4 py-3 font-bold">Durum</th>
                                    <th className="px-4 py-3 font-bold">Kullanıcı</th>
                                    <th className="px-4 py-3 font-bold">Rol</th>
                                    <th className="px-4 py-3 font-bold">E-Posta</th>
                                    <th className="px-4 py-3 font-bold">Cinsiyet</th>
                                    <th className="px-4 py-3 font-bold">Son Giriş</th>
                                    <th className="px-4 py-3 font-bold">IP Adresi</th>
                                    <th className="px-4 py-3 font-bold text-center">Giriş</th>
                                    <th className="px-4 py-3 font-bold">Kayıt</th>
                                    <th className="px-4 py-3 font-bold text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03] text-sm">
                                {filteredMembers.map((member) => {
                                    const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                                    const isExpanded = expandedId === member.id;

                                    return (
                                        <React.Fragment key={member.id}>
                                            <tr
                                                className={`hover:bg-white/[0.02] transition-colors cursor-pointer group ${member.isBanned ? 'opacity-50' : ''}`}
                                                onClick={() => setExpandedId(isExpanded ? null : member.id)}
                                            >
                                                {/* Online Status */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {member.isOnline ? (
                                                            <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-[10px] text-green-400 font-bold">Çevrimiçi</span></>
                                                        ) : (
                                                            <><WifiOff className="w-3.5 h-3.5 text-gray-600" /><span className="text-[10px] text-gray-600">Çevrimdışı</span></>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* User Info */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600/30 to-amber-700/30 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-[#a3bfff]">{(member.displayName || '??').substring(0, 2).toUpperCase()}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-white text-xs truncate flex items-center gap-1.5" style={{ color: member.nameColor || undefined }}>
                                                                {member.displayName || 'İsimsiz'}
                                                                {member.isPremium && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                                                                {member.isBanned && <Ban className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${rc.bgColor} ${rc.color} ${rc.borderColor}`}>
                                                        {rc.icon} {rc.label}
                                                    </span>
                                                </td>

                                                {/* Email */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-gray-400 truncate block max-w-[160px]">{member.email || '—'}</span>
                                                </td>

                                                {/* Gender */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-gray-500">
                                                        {member.gender === 'male' ? '♂ Erkek' : member.gender === 'female' ? '♀ Kadın' : '—'}
                                                    </span>
                                                </td>

                                                {/* Last Login */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-gray-500">{timeAgo(member.lastLoginAt)}</span>
                                                </td>

                                                {/* IP */}
                                                <td className="px-4 py-3">
                                                    <span className="text-[11px] text-gray-600 font-mono">{member.ipAddress || member.lastLoginIp || '—'}</span>
                                                </td>

                                                {/* Login Count */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs text-gray-400 font-mono">{member.loginCount || 0}</span>
                                                </td>

                                                {/* Created At */}
                                                <td className="px-4 py-3">
                                                    <span className="text-[11px] text-gray-600">{formatDate(member.createdAt)}</span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(member); }}
                                                            className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition"
                                                            title="Düzenle"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmModal({
                                                                    isOpen: true,
                                                                    title: 'Üyeyi Sil',
                                                                    message: `"${member.displayName || 'Unknown User'}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                                                                    onConfirm: () => handleDeleteMember(member.id)
                                                                });
                                                            }}
                                                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail Row */}
                                            {isExpanded && (
                                                <tr className="bg-amber-600/[0.03] border-l-2 border-l-amber-600">
                                                    <td colSpan={10} className="px-6 py-4">
                                                        <div className="grid grid-cols-4 gap-4 text-xs">
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">Kullanıcı Detayları</div>
                                                                <div className="flex justify-between"><span className="text-gray-500">ID:</span><span className="text-gray-300 font-mono text-[10px]">{member.id}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">İsim Rengi:</span><span className="font-mono text-[10px]" style={{ color: member.nameColor || '#888' }}>{member.nameColor || 'Varsayılan'}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Premium:</span><span className={member.isPremium ? 'text-yellow-400' : 'text-gray-600'}>{member.isPremium ? 'Evet ⭐' : 'Hayır'}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Bakiye:</span><span className="text-emerald-400 font-mono">{member.balance || '0.00'} ₺</span></div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">Güvenlik</div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Son IP:</span><span className="text-gray-300 font-mono text-[10px]">{member.lastLoginIp || '—'}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Mevcut IP:</span><span className="text-gray-300 font-mono text-[10px]">{member.ipAddress || '—'}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Banlı:</span><span className={member.isBanned ? 'text-red-400' : 'text-green-400'}>{member.isBanned ? 'Evet ⛔' : 'Hayır'}</span></div>
                                                                {member.banExpiresAt && <div className="flex justify-between"><span className="text-gray-500">Ban Bitiş:</span><span className="text-orange-400">{formatDate(member.banExpiresAt)}</span></div>}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">Aktivite</div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Son Giriş:</span><span className="text-gray-300">{formatDate(member.lastLoginAt)}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Son Görülme:</span><span className="text-gray-300">{timeAgo(member.lastSeenAt)}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Giriş Sayısı:</span><span className="text-gray-300 font-mono">{member.loginCount || 0}</span></div>
                                                                <div className="flex justify-between"><span className="text-gray-500">Güncelleme:</span><span className="text-gray-300">{formatDate(member.updatedAt)}</span></div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1">Cihaz Bilgisi</div>
                                                                {member.deviceInfo ? (
                                                                    <pre className="text-[10px] text-gray-500 bg-[#050505] rounded-lg p-2 overflow-auto max-h-20 font-mono">{typeof member.deviceInfo === 'string' ? member.deviceInfo : JSON.stringify(member.deviceInfo, null, 2)}</pre>
                                                                ) : (
                                                                    <p className="text-gray-600 italic">Veri yok</p>
                                                                )}
                                                                {member.permissions && (
                                                                    <>
                                                                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-2">İzinler</div>
                                                                        <pre className="text-[10px] text-gray-500 bg-[#050505] rounded-lg p-2 overflow-auto max-h-16 font-mono">{JSON.stringify(member.permissions, null, 2)}</pre>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {filteredMembers.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-16 text-center text-gray-600">
                                            Sonuç bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between rounded-b-2xl">
                    <div className="text-[11px] text-gray-600">
                        {filteredMembers.length} üye gösteriliyor {search && `(filtre: "${search}")`}
                    </div>
                    {!tenantId && (
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-medium flex items-center gap-1.5"
                            >
                                <Undo2 className="w-3 h-3" /> Önceki
                            </button>
                            <button
                                disabled={members.length < limit}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-medium flex items-center gap-1.5"
                            >
                                Sonraki <Undo2 className="w-3 h-3 rotate-180 transform scale-x-[-1]" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Edit Member Modal */}
            <EditUserModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                user={editingMember}
                onSave={handleSaveMember}
                onBan={handleBanMember}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                confirmText="Evet, Sil"
            />
        </div>
    );
}
