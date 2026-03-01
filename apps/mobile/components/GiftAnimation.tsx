import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Modal } from 'react-native';

interface GiftAnimationData {
    senderName: string;
    receiverName: string;
    gift: {
        name: string;
        emoji: string;
        animationType: string;
        category: string;
        price: number;
    };
    quantity: number;
}

const CATEGORY_CONFIG: Record<string, { bg: string; border: string; text: string; duration: number }> = {
    basic: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#4ade80', duration: 3000 },
    premium: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#c084fc', duration: 4000 },
    legendary: { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)', text: '#fbbf24', duration: 5000 },
};

export default function GiftAnimation({ animationData, onComplete }: { animationData: GiftAnimationData | null; onComplete: () => void }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.5)).current;
    const emojiScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!animationData) return;
        const config = CATEGORY_CONFIG[animationData.gift.category] || CATEGORY_CONFIG.basic;

        // Entrance animation
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        ]).start();

        // Emoji bounce
        Animated.sequence([
            Animated.delay(200),
            Animated.spring(emojiScale, { toValue: 1, friction: 3, tension: 60, useNativeDriver: true }),
        ]).start();

        // Auto-dismiss
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 0.8, duration: 400, useNativeDriver: true }),
            ]).start(onComplete);
        }, config.duration);

        return () => {
            clearTimeout(timer);
            opacity.setValue(0);
            scale.setValue(0.5);
            emojiScale.setValue(0);
        };
    }, [animationData]);

    if (!animationData) return null;

    const config = CATEGORY_CONFIG[animationData.gift.category] || CATEGORY_CONFIG.basic;
    const isLegendary = animationData.gift.category === 'legendary';

    return (
        <Modal visible transparent animationType="none">
            <Animated.View style={[s.overlay, { opacity }]}>
                <Animated.View style={[s.card, { transform: [{ scale }], backgroundColor: config.bg, borderColor: config.border }]}>
                    {/* Emoji */}
                    <Animated.Text style={[s.emoji, { transform: [{ scale: emojiScale }] }]}>
                        {animationData.gift.emoji}
                    </Animated.Text>

                    {/* Title */}
                    <Text style={[s.giftName, { color: config.text }]}>{animationData.gift.name}</Text>

                    {/* Quantity badge */}
                    {animationData.quantity > 1 && (
                        <View style={[s.qtyBadge, { backgroundColor: config.border }]}>
                            <Text style={s.qtyText}>x{animationData.quantity}</Text>
                        </View>
                    )}

                    {/* Sender → Receiver */}
                    <View style={s.namesRow}>
                        <Text style={[s.senderName, { color: config.text }]}>{animationData.senderName}</Text>
                        <Text style={s.arrow}>→</Text>
                        <Text style={s.receiverName}>{animationData.receiverName}</Text>
                    </View>

                    {/* Price */}
                    <Text style={s.priceText}>🪙 {animationData.gift.price * animationData.quantity}</Text>

                    {/* Decorative particles for legendary */}
                    {isLegendary && (
                        <View style={s.particlesContainer}>
                            {['🎉', '🏆', '✨', '🔥', '💎', '⚡'].map((p, i) => (
                                <Text key={i} style={[s.particle, { left: `${15 + i * 13}%`, top: `${10 + (i % 3) * 25}%` }]}>{p}</Text>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { width: '70%', borderRadius: 24, borderWidth: 2, padding: 24, alignItems: 'center', position: 'relative', overflow: 'hidden' },
    emoji: { fontSize: 64, marginBottom: 8 },
    giftName: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    qtyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8 },
    qtyText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    namesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
    senderName: { fontSize: 14, fontWeight: '700' },
    arrow: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
    receiverName: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
    priceText: { color: '#fbbf24', fontSize: 12, fontWeight: '600', marginTop: 4 },
    particlesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
    particle: { position: 'absolute', fontSize: 20, opacity: 0.6 },
});
