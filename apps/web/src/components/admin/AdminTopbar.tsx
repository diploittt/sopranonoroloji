"use client";

import { Bell, Search, Menu, Plus, ShieldAlert, X } from "lucide-react";
import { useAdminStore } from "@/lib/admin/store";
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import ProvisioningSuccessModal from "./ProvisioningSuccessModal";
import { ProvisioningDTO } from "@/lib/admin/store";

export default function AdminTopbar() {
    const [currentTime, setCurrentTime] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [provisioningResult, setProvisioningResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ProvisioningDTO>({
        name: "",
        phone: "",
        email: "",
        domain: "",
        hostingType: 'sopranochat',
        plan: "PRO",
        roomCount: 4,
        cameraEnabled: false,
        userLimit: 30
    });

    const maintenanceMode = useAdminStore((state) => state.maintenanceMode);
    const toggleMaintenance = useAdminStore((state) => state.toggleMaintenance);
    const provisionCustomer = useAdminStore((state) => state.provisionCustomer);
    const addToast = useAdminStore((state) => state.addToast);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleProvisioning = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await provisionCustomer(formData);
            setProvisioningResult(result);
            setIsAddModalOpen(false);
            setIsSuccessModalOpen(true);
            addToast("Müşteri başarıyla oluşturuldu", "success");
            // Reset form
            setFormData({
                name: "",
                phone: "",
                email: "",
                domain: "",
                hostingType: 'sopranochat',
                plan: "PRO",
                roomCount: 4,
                cameraEnabled: false,
                userLimit: 30
            });
        } catch (error) {
            addToast("Müşteri oluşturulurken hata oluştu", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <header className="h-16 px-6 border-b border-white/5 bg-[#0f111a]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
                {/* Left: Search & Breadcrumb */}
                <div className="flex items-center gap-4 flex-1">
                    <button className="lg:hidden text-gray-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="relative w-64 hidden md:block">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Panelde ara (Ctrl+K)"
                            className="w-full bg-black/20 border border-white/5 rounded-full pl-10 pr-4 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-rose-500/50 focus:bg-black/40 transition-all"
                        />
                    </div>
                </div>

                {/* Right: Actions & User */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-xs font-bold text-gray-400">ISTANBUL, TR</span>
                        <span className="text-xl font-black text-white leading-none tracking-tight">{currentTime}</span>
                    </div>

                    <button
                        onClick={toggleMaintenance}
                        className={`
                        h-9 px-4 rounded-full flex items-center gap-2 text-xs font-bold transition border
                        ${maintenanceMode
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }
                    `}
                    >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {maintenanceMode ? 'SİSTEMİ BAŞLAT' : 'SİSTEMİ DURDUR'}
                    </button>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-9 px-4 text-white rounded-full flex items-center gap-2 text-xs font-bold transition shadow-lg" style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.3)' }}
                    >
                        <Plus className="w-4 h-4" />
                        MÜŞTERİ EKLE
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition relative">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    </button>

                    <div className="w-9 h-9 rounded-full p-[1px]" style={{ background: 'linear-gradient(135deg, #f43f5e, #a855f7)' }}>
                        <div className="w-full h-full rounded-full bg-[#0f111a] flex items-center justify-center text-xs font-bold text-white">
                            YA
                        </div>
                    </div>
                </div>
            </header>

            {/* PROVISIONING MODAL */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Müşteri Oluştur">
                <form onSubmit={handleProvisioning} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Müşteri Adı Soyadı</label>
                            <input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Telefon</label>
                            <input required type="text" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-600 focus:outline-none"
                                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">E-posta</label>
                            <input required type="email" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-600 focus:outline-none"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Hosting Tipi</label>
                            <div className="flex p-1 rounded-lg border border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                <button type="button" onClick={() => setFormData({ ...formData, hostingType: 'sopranochat', domain: '' })} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${formData.hostingType === 'sopranochat' ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'text-gray-500 hover:text-white'}`}>SopranoChat</button>
                                <button type="button" onClick={() => setFormData({ ...formData, hostingType: 'own_domain' })} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${formData.hostingType === 'own_domain' ? 'bg-rose-700 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'text-gray-500 hover:text-white'}`}>Kendi Domain</button>
                            </div>
                        </div>
                        {formData.hostingType === 'own_domain' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Domain</label>
                                <input required type="text" placeholder="ornek.com" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                                    value={formData.domain} onChange={e => setFormData({ ...formData, domain: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Plan</label>
                            <select className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                                value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value as any })}>
                                <option value="FREE">Free</option>
                                <option value="PRO">Pro</option>
                                <option value="ENTERPRISE">Enterprise</option>
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full text-white font-bold py-2.5 rounded-xl transition" style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}
                    >
                        Oluştur
                    </button>
                </form>
            </Modal >
        </>
    );
}
