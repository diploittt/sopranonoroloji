import React, { useRef, useEffect } from 'react';
import { View, Dimensions, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   SPARKLE PARTİKÜLLER — koyu tema
   ═══════════════════════════════════════════════════════════ */
function Sparkles() {
  const dots = useRef(
    Array.from({ length: 8 }, () => ({
      x: Math.random() * W,
      baseY: Math.random() * H * 0.6 + 80,
      y: new Animated.Value(0),
      op: new Animated.Value(0),
      size: 1.5 + Math.random() * 2.5,
      colorIdx: Math.floor(Math.random() * 3),
    }))
  ).current;

  useEffect(() => {
    dots.forEach((d) => {
      const loop = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(d.op, { toValue: 0.15 + Math.random() * 0.25, duration: 2200 + Math.random() * 2000, useNativeDriver: true }),
            Animated.timing(d.y, { toValue: -15 + Math.random() * 30, duration: 3500 + Math.random() * 2500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(d.op, { toValue: 0, duration: 1800, useNativeDriver: true }),
            Animated.timing(d.y, { toValue: 0, duration: 1800, useNativeDriver: true }),
          ]),
        ]).start(loop);
      };
      setTimeout(loop, Math.random() * 2000);
    });
  }, []);

  const COLORS = ['#5eead4', '#a78bfa', '#818cf8'];

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: d.size,
            height: d.size,
            borderRadius: d.size,
            backgroundColor: COLORS[d.colorIdx],
            left: d.x,
            top: d.baseY,
            opacity: d.op,
            transform: [{ translateY: d.y }],
          }}
        />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP BACKGROUND — koyu gradient + orblar + sparkles
   ═══════════════════════════════════════════════════════════ */
interface AppBackgroundProps {
  /** Gradient renklerini override et */
  colors?: string[];
  /** Sparkle partikülleri göster (default: true) */
  sparkles?: boolean;
  children?: React.ReactNode;
}

export default function AppBackground({
  colors = ['#0a0e27', '#10082a', '#1a0a2e'],
  sparkles = true,
  children,
}: AppBackgroundProps) {
  return (
    <View style={styles.root}>
      {/* Ana gradient */}
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill as any} />

      {/* Dekoratif orblar */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />
      <View style={styles.orbCenter} />

      {/* Sparkle partiküller */}
      {sparkles && <Sparkles />}

      {/* İçerik */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  orbTopRight: {
    position: 'absolute', top: -60, right: -70,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(94,234,212,0.06)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 80, left: -90,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  orbCenter: {
    position: 'absolute', top: '35%' as any, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.04)',
  },
});
