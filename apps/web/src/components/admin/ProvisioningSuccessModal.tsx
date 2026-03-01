import Modal from "../ui/Modal";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ProvisioningSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Result from provisionCustomer
}

export default function ProvisioningSuccessModal({ isOpen, onClose, data }: ProvisioningSuccessModalProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!data) return null;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const Field = ({ label, value, id }: { label: string, value: string, id: string }) => (
        <div className="mb-3">
            <label className="text-xs text-gray-500 font-bold uppercase block mb-1">{label}</label>
            <div className="flex gap-2">
                <div className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-[#a3bfff] font-mono break-all">
                    {value}
                </div>
                <button
                    onClick={() => copyToClipboard(value, id)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 flex items-center justify-center transition"
                    title="Kopyala"
                >
                    {copiedField === id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Müşteri Oluşturuldu! 🚀">
            <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-4 text-emerald-300 text-sm text-center">
                    Provisioning işlemi başarıyla tamamlandı. Aşağıdaki bilgileri müşteri ile paylaşın.
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Yönetici Kullanıcı Adı" value={data.credentials.username} id="username" />
                    <Field label="Yönetici Şifresi" value={data.credentials.password} id="password" />
                </div>

                <Field label="Panel Giriş Linki" value={data.links.roomUrl} id="url" />

                <div className="mb-3">
                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Embed Kodu (Iframe)</label>
                    <div className="relative">
                        <textarea
                            readOnly
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-[#a3bfff] font-mono h-24 resize-none focus:outline-none"
                            value={data.links.embedCode}
                        />
                        <button
                            onClick={() => copyToClipboard(data.links.embedCode, 'embed')}
                            className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded transition"
                        >
                            {copiedField === 'embed' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="bg-amber-700 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                        Tamam
                    </button>
                </div>
            </div>
        </Modal>
    );
}
