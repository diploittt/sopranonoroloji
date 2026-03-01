
import React, { useState, useEffect } from 'react';
import { useDraggable } from '@/hooks/useDraggable';
import { X, RefreshCw, CheckCircle, XCircle, Clock, ShoppingBag, Globe, Server, Copy, Trash2 } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { useAdminStore } from '@/lib/admin/store';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Order {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    packageName: string;
    paymentCode: string;
    amount: string;
    currency: string;
    hostingType: string;
    customDomain?: string;
    roomName?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    details?: any;
    notes?: string;
}

export default function OrdersModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const { offset, handleMouseDown: onDragMouseDown } = useDraggable();
    const [error, setError] = useState('');
    const addToast = useAdminStore((state) => state.addToast);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'warning' | 'danger';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning'
    });

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Siparişler yüklenemedi');
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (err) {
            setError('Veri çekme hatası');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusClick = (id: string, status: string) => {
        const isApprove = status === 'APPROVED';
        setConfirmState({
            isOpen: true,
            title: isApprove ? 'Siparişi Onayla' : 'Siparişi Reddet',
            message: isApprove
                ? 'Bu siparişi onaylamak istediğinize emin misiniz? Sistem otomatik olarak müşteri hesabını ve odaları oluşturacaktır.'
                : 'Bu siparişi reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            type: isApprove ? 'warning' : 'danger',
            onConfirm: () => updateStatus(id, status)
        });
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/orders/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error('Güncelleme başarısız');
            const result = await res.json();

            if (result.provision) {
                addToast(
                    `✅ Sipariş ONAYLANDI — Müşteri otomatik oluşturuldu!\n` +
                    `Tenant: ${result.provision.tenant.slug}\n` +
                    `Giriş: ${result.provision.ownerEmail} / ${result.provision.ownerPassword}`,
                    'success'
                );
            } else if (result.provisionError) {
                addToast(`⚠️ Sipariş onaylandı fakat provision hatası: ${result.provisionError}`, 'error');
            } else {
                addToast(`Sipariş durumu ${status === 'APPROVED' ? 'ONAYLANDI' : 'REDDEDİLDİ'} olarak güncellendi.`, 'success');
            }
            fetchOrders();
        } catch (err) {
            addToast('Durum güncellenirken bir hata oluştu.', 'error');
        }
    };

    const handleDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Siparişi Sil',
            message: 'Bu siparişi kalıcı olarak silmek istediğinize emin misiniz?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('soprano_admin_token');
                    await fetch(`${API_URL}/admin/orders/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    addToast('Sipariş silindi.', 'success');
                    fetchOrders();
                } catch {
                    addToast('Sipariş silinirken hata oluştu.', 'error');
                }
            }
        });
    };

    const copyText = (t: string) => { navigator.clipboard.writeText(t).catch(() => { }); addToast('Kopyalandı!', 'success'); };

    useEffect(() => {
        if (isOpen) fetchOrders();
    }, [isOpen]);

    if (!isOpen) return null;

    const pendingCount = orders.filter(o => o.status === 'PENDING').length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-300" style={{
                background: 'linear-gradient(145deg, rgba(15,17,30,0.97) 0%, rgba(20,15,40,0.97) 100%)',
                borderRadius: 20,
                border: '1px solid rgba(16,185,129,0.2)',
                boxShadow: '0 0 60px rgba(16,185,129,0.15), 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                overflow: 'hidden',
            }}>
                {/* Neon glow line */}
                <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '70%', height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)',
                }} />

                {/* Header */}
                <div style={{ padding: '24px 28px 0' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
                                border: '1px solid rgba(16,185,129,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(16,185,129,0.2)',
                            }}>
                                <ShoppingBag className="w-5 h-5 text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white" style={{ letterSpacing: '-0.01em' }}>Sipariş Yönetimi</h2>
                                <p className="text-[11px] text-gray-500">Gelen paket satın alma talepleri</p>
                            </div>
                            {pendingCount > 0 && (
                                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20 ml-2">
                                    {pendingCount} Beklemede
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchOrders} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all" title="Yenile">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '16px 28px 20px' }}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
                            <span className="text-sm font-medium">Siparişler yükleniyor...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 py-10">{error}</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Henüz sipariş bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-[#15151a] border border-white/10 rounded-xl p-5 hover:border-emerald-500/30 transition-all group">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                                        {/* Customer Info */}
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-white uppercase text-sm border border-white/10">
                                                {(order.firstName || '?').charAt(0)}{(order.lastName || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{order.firstName} {order.lastName}</div>
                                                <div className="text-xs text-gray-500">{order.email}</div>
                                                <div className="text-xs text-gray-500">{order.phone}</div>
                                                {order.roomName && <div className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 mt-1">🏠 {order.roomName}</div>}
                                            </div>
                                        </div>

                                        {/* Package Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-emerald-400">{order.packageName}</span>
                                            </div>
                                            {/* Hosting Type */}
                                            <div className="flex items-center gap-2 mb-1">
                                                {order.hostingType === 'own_domain' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7b9fef] bg-amber-700/10 px-2 py-0.5 rounded border border-amber-700/20">
                                                        <Globe className="w-3 h-3" /> {order.customDomain || 'Kendi Domain'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7b9fef] bg-amber-600/10 px-2 py-0.5 rounded border border-amber-600/20">
                                                        <Server className="w-3 h-3" /> SopranoChat
                                                    </span>
                                                )}
                                            </div>
                                            {/* Payment Code */}
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors" onClick={() => copyText(order.paymentCode)} title="Kopyala">
                                                    {order.paymentCode}
                                                </span>
                                            </div>
                                            {/* Details */}
                                            {order.details && typeof order.details === 'object' && (
                                                <div className="text-[10px] text-gray-500 font-mono mt-1">
                                                    {(order.details as any).rooms && `${(order.details as any).rooms}`}
                                                    {(order.details as any).capacity && ` · ${(order.details as any).capacity}`}
                                                    {(order.details as any).camera && ` · ${(order.details as any).camera}`}
                                                    {(order.details as any).meeting && ` · Toplantı: ${(order.details as any).meeting}`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Badge */}
                                        <div className="flex items-center justify-center min-w-[120px]">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 
                                                ${order.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    order.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                {order.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                                                {order.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                                                {order.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                                {order.status === 'APPROVED' ? 'ONAYLANDI' : order.status === 'REJECTED' ? 'REDDEDİLDİ' : 'BEKLEMEDE'}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 lg:border-l lg:border-white/5 lg:pl-4">
                                            {order.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => handleStatusClick(order.id, 'APPROVED')} className="p-2 bg-green-500/10 hover:bg-green-500 hover:text-white text-green-400 rounded-lg transition-colors border border-green-500/20" title="Onayla">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleStatusClick(order.id, 'REJECTED')} className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-colors border border-red-500/20" title="Reddet">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => handleDelete(order.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors border border-white/5" title="Sil">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-600 flex justify-between">
                                        <span>Sipariş ID: {order.id.slice(0, 8)}...</span>
                                        <span>{new Date(order.createdAt).toLocaleString('tr-TR')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Confirm Modal */}
                <ConfirmModal
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmState.onConfirm}
                    title={confirmState.title}
                    message={confirmState.message}
                    type={confirmState.type}
                />
            </div>
        </div>
    );
}
