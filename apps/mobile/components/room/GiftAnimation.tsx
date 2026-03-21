/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — GiftAnimation
   Hediye alındığında overlay animasyon
   ═══════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export interface GiftAnimData {
  senderName: string;
  receiverName: string;
  giftEmoji: string;
  giftName: string;
  totalCost: number;
  giftCategory: string;
}

interface Props {
  data: GiftAnimData | null;
  onDone: () => void;
}

const CAT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  basic: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#4ade80', glow: '#22c55e' },
  premium: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)', text: '#c084fc', glow: '#a855f7' },
  legendary: { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.5)', text: '#fbbf24', glow: '#f59e0b' },
};

export default function GiftAnimation({ data, onDone }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!data) return;

    // Reset
    scale.setValue(0);
    opacity.setValue(0);
    emojiScale.setValue(0.3);

    // Animate in
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(emojiScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();

    // Auto dismiss after 3s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 400, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3000);

    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;

  const cat = CAT_COLORS[data.giftCategory] || CAT_COLORS.basic;

  return (
    <Animated.View style={[s.overlay, { opacity }]} pointerEvents="none">
      <Animated.View style={[s.card, {
        transform: [{ scale }],
        backgroundColor: cat.bg,
        borderColor: cat.border,
        shadowColor: cat.glow,
      }]}>
        {/* Emoji animasyonlu */}
        <Animated.Text style={[s.emoji, { transform: [{ scale: emojiScale }] }]}>
          {data.giftEmoji}
        </Animated.Text>

        {/* Gönderen → Alan */}
        <View style={s.namesRow}>
          <Text style={[s.senderName, { color: cat.text }]}>{data.senderName}</Text>
          <Text style={s.arrow}>→</Text>
          <Text style={[s.receiverName, { color: cat.text }]}>{data.receiverName}</Text>
        </View>

        {/* Hediye ismi + tutar */}
        <Text style={s.giftName}>{data.giftName}</Text>
        <View style={s.costRow}>
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text style={s.costText}>{data.totalCost}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    alignItems: 'center', gap: 8,
    paddingVertical: 24, paddingHorizontal: 32,
    borderRadius: 24, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30,
    elevation: 30,
  },
  emoji: { fontSize: 64, lineHeight: 72 },
  namesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  senderName: { fontSize: 14, fontWeight: '700' },
  arrow: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  receiverName: { fontSize: 14, fontWeight: '700' },
  giftName: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
});
