import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    Image,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface Gift {
    id: string;
    name: string;
    emoji: string;
    cost: number;
    category: 'basic' | 'premium' | 'legendary';
}

interface GiftPanelProps {
    visible: boolean;
    onClose: () => void;
    targetUserId: string;
    targetUsername: string;
    roomId: string;
    currentBalance?: number;
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
    basic: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#4ade80', label: '🌱 Temel' },
    premium: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', text: '#c084fc', label: '💎 Premium' },
    legendary: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24', label: '🔥 Efsanevi' },
};

// ═══ Default gift list — web ile aynı ═══
const DEFAULT_GIFTS: Gift[] = [
    { id: 'rose', name: 'Gül', emoji: '🌹', cost: 10, category: 'basic' },
    { id: 'heart', name: 'Kalp', emoji: '❤️', cost: 15, category: 'basic' },
    { id: 'star', name: 'Yıldız', emoji: '⭐', cost: 20, category: 'basic' },
    { id: 'cake', name: 'Pasta', emoji: '🎂', cost: 25, category: 'basic' },
    { id: 'coffee', name: 'Kahve', emoji: '☕', cost: 10, category: 'basic' },
    { id: 'ring', name: 'Yüzük', emoji: '💍', cost: 100, category: 'premium' },
    { id: 'crown', name: 'Taç', emoji: '👑', cost: 150, category: 'premium' },
    { id: 'diamond', name: 'Elmas', emoji: '💎', cost: 200, category: 'premium' },
    { id: 'rocket', name: 'Roket', emoji: '🚀', cost: 250, category: 'premium' },
    { id: 'trophy', name: 'Kupa', emoji: '🏆', cost: 500, category: 'legendary' },
    { id: 'castle', name: 'Kale', emoji: '🏰', cost: 750, category: 'legendary' },
    { id: 'dragon', name: 'Ejderha', emoji: '🐉', cost: 1000, category: 'legendary' },
];

export default function GiftPanel({
    visible,
    onClose,
    targetUserId,
    targetUsername,
    roomId,
    currentBalance = 0,
}: GiftPanelProps) {
    const [gifts, setGifts] = useState<Gift[]>(DEFAULT_GIFTS);
    const [balance, setBalance] = useState(currentBalance);
    const [selectedCategory, setSelectedCategory] = useState('basic');
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !visible) return;
        // Fetch available gifts & balance
        socket.emit('gift:list', {}, (data: { gifts?: Gift[]; balance?: number }) => {
            if (data?.gifts) setGifts(data.gifts);
            if (data?.balance !== undefined) setBalance(data.balance);
        });
    }, [visible]);

    const handleSendGift = useCallback((gift: Gift) => {
        if (balance < gift.cost) return;
        setSending(gift.id);
        const socket = getSocket();
        if (socket) {
            socket.emit('gift:send', {
                roomId,
                targetUserId,
                giftId: gift.id,
                quantity: 1,
            }, (res: any) => {
                if (res?.success) {
                    setBalance(prev => prev - gift.cost);
                }
                setSending(null);
            });
        }
    }, [balance, roomId, targetUserId]);

    const filteredGifts = gifts.filter(g => g.category === selectedCategory);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>🎁 Hediye Gönder</Text>
                        <View style={styles.balanceBadge}>
                            <Text style={styles.balanceText}>🪙 {balance}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Target user */}
                    <View style={styles.targetRow}>
                        <Text style={styles.targetLabel}>Alıcı: </Text>
                        <Text style={styles.targetName}>{targetUsername}</Text>
                    </View>

                    {/* Category tabs */}
                    <View style={styles.categoryTabs}>
                        {Object.entries(CATEGORY_STYLES).map(([key, cat]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.categoryTab,
                                    selectedCategory === key && { backgroundColor: cat.bg, borderColor: cat.border },
                                ]}
                                onPress={() => setSelectedCategory(key)}
                            >
                                <Text style={[styles.categoryTabText, selectedCategory === key && { color: cat.text }]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Gift grid */}
                    <FlatList
                        data={filteredGifts}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        renderItem={({ item }) => {
                            const canAfford = balance >= item.cost;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.giftItem,
                                        !canAfford && styles.giftItemDisabled,
                                        sending === item.id && styles.giftItemSending,
                                    ]}
                                    onPress={() => handleSendGift(item)}
                                    disabled={!canAfford || sending !== null}
                                >
                                    <Text style={styles.giftEmoji}>{item.emoji}</Text>
                                    <Text style={styles.giftName}>{item.name}</Text>
                                    <View style={styles.giftCostBadge}>
                                        <Text style={styles.giftCostText}>🪙 {item.cost}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        contentContainerStyle={styles.giftGrid}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: '#0F1626',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        maxHeight: '65%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        flex: 1,
        color: '#e5e7eb',
        fontSize: 16,
        fontWeight: '700',
    },
    balanceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.25)',
        marginRight: 8,
    },
    balanceText: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#6b7280',
        fontSize: 16,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    targetLabel: {
        color: '#6b7280',
        fontSize: 12,
    },
    targetName: {
        color: '#7b9fef',
        fontSize: 13,
        fontWeight: '600',
    },
    categoryTabs: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    categoryTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    categoryTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    giftGrid: {
        paddingHorizontal: 8,
        paddingBottom: 20,
    },
    giftItem: {
        flex: 1 / 3,
        alignItems: 'center',
        padding: 12,
        margin: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    giftItemDisabled: {
        opacity: 0.4,
    },
    giftItemSending: {
        borderColor: 'rgba(123,159,239,0.4)',
        backgroundColor: 'rgba(123,159,239,0.08)',
    },
    giftEmoji: {
        fontSize: 30,
        marginBottom: 4,
    },
    giftName: {
        color: '#e5e7eb',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    giftCostBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    giftCostText: {
        fontSize: 10,
        color: '#fbbf24',
        fontWeight: '600',
    },
});
