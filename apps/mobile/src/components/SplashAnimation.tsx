import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: Props) {
  // Phase 1: "SC" centered big → Phase 2: expand to "SopranoChat" → Phase 3: move to header
  const phase1Opacity = useRef(new Animated.Value(1)).current;      // SC visible
  const phase2Opacity = useRef(new Animated.Value(0)).current;      // full text visible
  const scScale = useRef(new Animated.Value(1.8)).current;          // SC starts large
  const scTranslateY = useRef(new Animated.Value(0)).current;       // starts centered
  const fullTextScale = useRef(new Animated.Value(1.2)).current;    // full text scale
  const fullTextTranslateY = useRef(new Animated.Value(0)).current; // move up to header
  const bgOpacity = useRef(new Animated.Value(1)).current;          // bg fade out
  const taglineOpacity = useRef(new Animated.Value(0)).current;     // "Senin Sesin"
  const glowOpacity = useRef(new Animated.Value(0)).current;        // glow pulse

  useEffect(() => {
    Animated.sequence([
      // ═══ Phase 1: "SC" appears centered, pulses with glow (1s) ═══
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(scScale, { toValue: 2, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(scScale, { toValue: 1.6, duration: 300, useNativeDriver: true }),

      // ═══ Phase 2: SC→SopranoChat transformation (0.8s) ═══
      Animated.parallel([
        Animated.timing(phase1Opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(phase2Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(fullTextScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),

      // ═══ Phase 2.5: Tagline fade in ═══
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),

      // ═══ Phase 3: Move up to header position + bg fade (0.8s) ═══
      Animated.parallel([
        Animated.timing(fullTextTranslateY, { toValue: -(height / 2 - 32), duration: 700, useNativeDriver: true }),
        Animated.timing(fullTextScale, { toValue: 0.65, duration: 700, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[st.container, { opacity: bgOpacity }]} pointerEvents="none">
      {/* Background */}
      <LinearGradient colors={['#0d1220', '#151d30', '#0d1220']} style={StyleSheet.absoluteFill} />

      {/* Glow circle */}
      <Animated.View style={[st.glowCircle, { opacity: glowOpacity }]} />

      {/* ═══ Phase 1: "SC" big centered ═══ */}
      <Animated.View style={[st.centered, {
        opacity: phase1Opacity,
        transform: [{ scale: scScale }],
      }]}>
        <Text style={st.scS}>S</Text>
        <Text style={st.scC}>C</Text>
      </Animated.View>

      {/* ═══ Phase 2+3: Full "SopranoChat" text ═══ */}
      <Animated.View style={[st.centered, {
        opacity: phase2Opacity,
        transform: [
          { scale: fullTextScale },
          { translateY: fullTextTranslateY },
        ],
      }]}>
        <View style={st.logoRow}>
          <Text style={st.logoS}>Soprano</Text>
          <View>
            <Text style={st.logoC}>Chat</Text>
            <Animated.Text style={[st.logoT, { opacity: taglineOpacity }]}>Senin Sesin</Animated.Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(94,200,200,0.15)',
    shadowColor: '#5ec8c8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 10,
  },
  scS: {
    fontSize: 48,
    fontFamily: 'Fraunces-Black',
    color: '#dde4ee',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 8,
    position: 'absolute',
    left: -28,
  },
  scC: {
    fontSize: 48,
    fontFamily: 'Fraunces-Black',
    color: '#5ec8c8',
    textShadowColor: 'rgba(94,200,200,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    position: 'absolute',
    left: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 0,
  },
  logoS: {
    fontSize: 42,
    fontFamily: 'Fraunces-Black',
    color: '#dde4ee',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  logoC: {
    fontSize: 42,
    fontFamily: 'Fraunces-Black',
    color: '#5ec8c8',
    textShadowColor: 'rgba(94,200,200,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  logoT: {
    fontSize: 10,
    fontFamily: 'Fraunces-Black',
    color: 'rgba(200,210,220,0.5)',
    letterSpacing: 1.5,
    textAlign: 'right',
    marginTop: -4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
