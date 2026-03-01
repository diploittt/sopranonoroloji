import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface TokenPackage {
    id: string;
    name: string;
    tokenAmount: number;
    price: number;
    currency: string;
    emoji: string;
    description?: string;
}

interface PendingOrder {
    id: string;
    packageName: string;
    packageEmoji: string;
    tokenAmount: number;
    price: number;
    status: string;
    createdAt: string;
}

interface TokenShopProps {
    visible: boolean;
    onClose: () => void;
}

export default function TokenShop({ visible, onClose }: TokenShopProps) {
    const [packages, setPackages] = useState<TokenPackage[]>([]);
    const [balance, setBalance] = useState(0);
    const [points, setPoints] = useState(0);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
    const [buying, setBuying] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        const socket = getSocket();
        if (!socket) return;

        socket.emit('token:packages');

        const onResponse = (data: any) => {
            setPackages(data.packages || []);
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
            setPendingOrders(data.pendingOrders || []);
        };
        const onBalanceUpdate = (data: { balance: number; points: number }) => {
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
        };

        socket.on('token:packagesResponse', onResponse);
        socket.on('gift:balance', onBalanceUpdate);

        return () => {
            socket.off('token:packagesResponse', onResponse);
            socket.off('gift:balance', onBalanceUpdate);
        };
    }, [visible]);

    const handleBuy = async (packageId: string) => {
        setBuying(packageId);
        setSuccessMsg(null);
        const socket = getSocket();
        if (!socket) { setBuying(null); return; }

        try {
            const result = await new Promise<any>((resolve) => {
                socket.emit('token:buy', { packageId }, (res: any) => resolve(res));
                setTimeout(() => resolve({ error: 'Zaman aşımı' }), 5000);
            });

            if (result?.success) {
                setSuccessMsg(result.message || '✅ Sipariş oluşturuldu!');
                socket.emit('token:packages');
            } else {
                setSuccessMsg(`❌ ${result?.error || 'Sipariş oluşturulamadı'}`);
            }
        } catch {
            setSuccessMsg('❌ Bir hata oluştu');
        } finally {
            setBuying(null);
        }
    };

    const renderPackage = ({ item: pkg }: { item: TokenPackage }) => (
        <TouchableOpacity
            style={s.packageCard}
            onPress={() => handleBuy(pkg.id)}
            disabled={buying === pkg.id}
        >
            <Text style={{ fontSize: 28 }}>{pkg.emoji || '💎'}</Text>
            <Text style={s.pkgName}>{pkg.name}</Text>
            <Text style={s.pkgTokens}>{pkg.tokenAmount.toLocaleString()} <Text style={s.pkgTokenLabel}>jeton</Text></Text>
            {pkg.description ? <Text style={s.pkgDesc}>{pkg.description}</Text> : null}
            <View style={s.priceTag}>
                <Text style={s.priceText}>{pkg.price} {pkg.currency}</Text>
            </View>
            {buying === pkg.id && (
                <View style={s.buyingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.buyingText}>İşleniyor...</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
                <View style={s.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 22 }}>🏪</Text>
                            <View>
                                <Text style={s.headerTitle}>Jeton Mağazası</Text>
                                <Text style={s.headerSubtitle}>Jeton paketleri satın al</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                            <Text style={s.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Balance bar */}
                    <View style={s.balanceBar}>
                        <View style={s.balanceItem}>
                            <Text style={{ fontSize: 14 }}>🪙</Text>
                            <Text style={s.balanceValue}>{balance.toLocaleString()}</Text>
                            <Text style={s.balanceLabel}>jeton</Text>
                        </View>
                        <View style={s.balanceDivider} />
                        <View style={s.balanceItem}>
                            <Text style={{ fontSize: 14 }}>⭐</Text>
                            <Text style={[s.balanceValue, { color: '#a855f7' }]}>{points.toLocaleString()}</Text>
                            <Text style={s.balanceLabel}>puan</Text>
                        </View>
                    </View>

                    {/* Success/Error */}
                    {successMsg && (
                        <View style={[s.msgBox, successMsg.startsWith('❌') ? s.msgError : s.msgSuccess]}>
                            <Text style={[s.msgText, { color: successMsg.startsWith('❌') ? '#f87171' : '#4ade80' }]}>{successMsg}</Text>
                        </View>
                    )}

                    {/* Packages grid */}
                    {packages.length === 0 ? (
                        <View style={s.emptyState}>
                            <Text style={{ fontSize: 32 }}>📦</Text>
                            <Text style={s.emptyText}>Henüz jeton paketi tanımlanmamış.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={packages}
                            renderItem={renderPackage}
                            keyExtractor={p => p.id}
                            numColumns={2}
                            contentContainerStyle={{ padding: 12, gap: 8 }}
                            columnWrapperStyle={{ gap: 8 }}
                        />
                    )}

                    {/* Pending Orders */}
                    {pendingOrders.length > 0 && (
                        <View style={s.pendingSection}>
                            <Text style={s.pendingTitle}>⏳ Bekleyen Siparişler</Text>
                            {pendingOrders.map(order => (
                                <View key={order.id} style={s.pendingRow}>
                                    <Text style={{ fontSize: 16 }}>{order.packageEmoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.pendingName}>{order.packageName}</Text>
                                        <Text style={s.pendingMeta}>{order.tokenAmount.toLocaleString()} jeton • {order.price} TL</Text>
                                    </View>
                                    <View style={s.pendingBadge}>
                                        <Text style={s.pendingBadgeText}>Bekliyor</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Footer */}
                    <View style={s.footer}>
                        <Text style={s.footerText}>💡 Sipariş verdikten sonra admin onayı ile jetonlarınız otomatik yüklenir.</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    container: { width: '90%', maxHeight: '80%', backgroundColor: '#0F1626', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    headerSubtitle: { color: '#94a3b8', fontSize: 10, marginTop: 1 },
    closeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    closeBtnText: { color: '#94a3b8', fontSize: 16 },
    balanceBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
    balanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    balanceDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
    balanceValue: { fontSize: 14, fontWeight: '700', color: '#fbbf24' },
    balanceLabel: { fontSize: 10, color: '#94a3b8' },
    msgBox: { marginHorizontal: 16, marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1 },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
    msgText: { fontSize: 12 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#64748b', fontSize: 13, marginTop: 8 },
    packageCard: { flex: 1, backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', borderRadius: 14, padding: 14, position: 'relative' },
    pkgName: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 6, marginBottom: 2 },
    pkgTokens: { fontSize: 18, fontWeight: '800', color: '#fbbf24', marginBottom: 4 },
    pkgTokenLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8' },
    pkgDesc: { fontSize: 10, color: '#64748b', marginBottom: 6 },
    priceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(99,102,241,0.2)', alignSelf: 'flex-start' },
    priceText: { fontSize: 12, fontWeight: '700', color: '#818cf8' },
    buyingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 4 },
    buyingText: { color: '#fff', fontSize: 11 },
    pendingSection: { paddingHorizontal: 16, paddingTop: 12 },
    pendingTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 8 },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.05)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.1)', marginBottom: 6 },
    pendingName: { fontSize: 12, fontWeight: '600', color: '#fbbf24' },
    pendingMeta: { fontSize: 10, color: '#64748b' },
    pendingBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(245,158,11,0.2)' },
    pendingBadgeText: { fontSize: 9, fontWeight: '600', color: '#fbbf24' },
    footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
    footerText: { fontSize: 10, color: '#64748b', textAlign: 'center' },
});
