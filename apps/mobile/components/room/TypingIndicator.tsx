/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — TypingIndicator
   "X yazıyor..." animasyonlu gösterim
   ═══════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  typingUsers: string[];
}

export default function TypingIndicator({ typingUsers }: Props) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} yazıyor`
      : typingUsers.length <= 3
      ? `${typingUsers.join(', ')} yazıyor`
      : `${typingUsers.length} kişi yazıyor`;

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <PulseDots />
        <Text style={s.text}>{label}</Text>
      </View>
    </View>
  );
}

/* ── Animated Dots ── */
function PulseDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 200);
    const a3 = anim(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={s.dotsRow}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View
          key={i}
          style={[s.dot, { opacity: d, transform: [{ scale: d.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1] }) }] }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  dotsRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#818cf8' },
});
