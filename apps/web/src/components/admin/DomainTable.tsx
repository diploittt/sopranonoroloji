"use client";

import styles from "../../app/(admin)/admin/admin.module.css";
import { List, Globe, Settings, ExternalLink, Power, Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useAdminStore } from "@/lib/admin/store";
import { useState } from "react";
import Modal from "../ui/Modal";

export default function DomainTable() {
    const tenants = useAdminStore((state) => state.tenants);
    const deleteTenant = useAdminStore((state) => state.deleteTenant);
    const addToast = useAdminStore((state) => state.addToast);
    const getRoomsByTenant = useAdminStore((state) => state.getRoomsByTenant);
    const addRoom = useAdminStore((state) => state.addRoom);
    const deleteRoom = useAdminStore((state) => state.deleteRoom);

    const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    // Room Form Data
    const [roomForm, setRoomForm] = useState({ name: "", slug: "", maxUsers: 50 });

    const handleDeleteTenant = async (id: string) => {
        if (window.confirm("Bu müşteriyi silmek istediğine emin misin? Tüm odalar silinecek.")) {
            try {
                await deleteTenant(id);
                addToast("Tenant deleted", "success");
            } catch (e) {
                addToast("Failed to delete tenant", "error");
            }
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (window.confirm("Odayı silmek istediğine emin misin?")) {
            try {
                await deleteRoom(id);
                addToast("Room deleted", "success");
            } catch (e) {
                addToast("Failed to delete room", "error");
            }
        }
    };

    const handleAddRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenantId) return;
        try {
            await addRoom({
                ...roomForm,
                tenantId: selectedTenantId,
                videoEnabled: true // Default to true
            });
            addToast("Room created", "success");
            setIsRoomModalOpen(false);
            setRoomForm({ name: "", slug: "", maxUsers: 50 });
        } catch (e) {
            addToast("Failed to create room", "error");
        }
    };

    const openRoomModal = (tenantId: string) => {
        setSelectedTenantId(tenantId);
        setIsRoomModalOpen(true);
    };

    const toggleExpand = (id: string) => {
        setExpandedTenantId(expandedTenantId === id ? null : id);
    };

    return (
        <>
            <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <List className="w-4 h-4 text-[#7b9fef]" /> Aktif Domain Listesi
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Domain veya Müşteri Ara..."
                            className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4 p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                    <div className="col-span-3">Domain Adı</div>
                    <div className="col-span-3">Müşteri Adı</div>
                    <div className="col-span-2">Durum</div>
                    <div className="col-span-2">Online</div>
                    <div className="col-span-2 text-right">İşlemler</div>
                </div>

                {tenants.map((domain) => (
                    <div key={domain.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <div className={`grid grid-cols-12 gap-4 p-4 items-center group ${domain.status === 'PASSIVE' ? 'opacity-60' : ''}`}>
                            <div className="col-span-3 flex items-center gap-3">
                                <button onClick={() => toggleExpand(domain.id)} className="text-gray-500 hover:text-white">
                                    {expandedTenantId === domain.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <div className={`w-8 h-8 rounded bg-${domain.status === 'PASSIVE' ? 'gray' : 'indigo'}-500/20 flex items-center justify-center text-${domain.status === 'PASSIVE' ? 'gray' : 'indigo'}-400`}>
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className={`font-bold text-${domain.status === 'PASSIVE' ? 'gray-400 line-through' : 'white'} text-sm`}>{domain.domain}</div>
                                    <div className="text-[10px] text-gray-500">ID: {domain.id.substring(0, 8)}...</div>
                                </div>
                            </div>
                            <div className="col-span-3 flex items-center gap-2">
                                {/* Assuming 'name' in tenant is Customer Name. If not, we might need a separate field or relation */}
                                {/* Using domain.name as Customer Name based on earlier DTO */}
                                {domain.userImg && <img src={domain.userImg} className="w-5 h-5 rounded-full" alt="User" />}
                                <span className="text-sm text-gray-300">{domain.name}</span>
                            </div>
                            <div className="col-span-2">
                                <span className={`px-2 py-1 rounded bg-${domain.status === 'ACTIVE' ? 'emerald' : 'red'}-500/10 text-${domain.status === 'ACTIVE' ? 'emerald' : 'red'}-400 text-[10px] font-bold border border-${domain.status === 'ACTIVE' ? 'emerald' : 'red'}-500/20 shadow-${domain.status === 'ACTIVE' ? 'emerald' : 'red'}-500/20`}>
                                    {domain.status}
                                </span>
                            </div>
                            <div className="col-span-2 text-xs font-bold text-gray-400 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                0 Aktif
                            </div>
                            <div className="col-span-2 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => alert("God Mode: " + domain.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white" title="Yönetici Olarak Gir">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteTenant(domain.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400" title="Sil">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* EXPANDED ROOMS VIEW */}
                        {expandedTenantId === domain.id && (
                            <div className="bg-black/40 p-4 border-t border-white/5 pl-12">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase">Odalar</h4>
                                    <button
                                        onClick={() => openRoomModal(domain.id)}
                                        className="text-[10px] flex items-center gap-1 bg-amber-600/20 text-[#7b9fef] px-2 py-1 rounded hover:bg-amber-600/30 transition"
                                    >
                                        <Plus className="w-3 h-3" /> Oda Ekle
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {getRoomsByTenant(domain.id).length === 0 ? (
                                        <div className="text-sm text-gray-500 italic">Henüz oda yok.</div>
                                    ) : (
                                        getRoomsByTenant(domain.id).map(room => (
                                            <div key={room.id} className="flex justify-between items-center bg-white/5 p-2 rounded text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-white font-medium">{room.name}</span>
                                                    <span className="text-gray-500 text-xs">/{room.slug}</span>
                                                    <span className="text-xs bg-gray-700 px-1.5 rounded text-gray-300">0/{room.maxUsers}</span>
                                                </div>
                                                <button onClick={() => handleDeleteRoom(room.id)} className="text-gray-600 hover:text-red-400">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title="Yeni Oda Ekle">
                <form onSubmit={handleAddRoom} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Oda Adı</label>
                        <input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
                            value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Slug (URL)</label>
                        <input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
                            value={roomForm.slug} onChange={(e) => setRoomForm({ ...roomForm, slug: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Kapasite</label>
                        <input type="number" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
                            value={roomForm.maxUsers} onChange={(e) => setRoomForm({ ...roomForm, maxUsers: Number(e.target.value) })} />
                    </div>
                    <button type="submit" className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition">Oluştur</button>
                </form>
            </Modal>
        </>
    );
}
