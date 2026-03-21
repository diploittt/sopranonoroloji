import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLabel } from '../../utils/roleHelpers';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 110;
const RING_SIZE = AVATAR_SIZE + 16;
const MOON_SIZE = 100;

interface ActiveSpeakerProps {
  userId?: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  speaking?: boolean;
  muted?: boolean;
  duration?: number;
  startedAt?: number;
}

/* ── Neon Dalga Animasyonu ── */
function NeonSpeakingRing({ speaking }: { speaking: boolean }) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;
  const op1 = useRef(new Animated.Value(0)).current;
  const op2 = useRef(new Animated.Value(0)).current;
  const op3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!speaking) {
      [ring1, ring2, ring3].forEach(r => r.setValue(1));
      [op1, op2, op3].forEach(o => o.setValue(0));
      return;
    }
    const animate = (scale: Animated.Value, opacity: Animated.Value, maxScale: number, delay: number, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: maxScale, duration: dur, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: dur * 0.3, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: dur * 0.7, useNativeDriver: true }),
        ]),
      ]));
    animate(ring1, op1, 1.25, 0, 800).start();
    animate(ring2, op2, 1.35, 250, 900).start();
    animate(ring3, op3, 1.45, 500, 1000).start();
  }, [speaking]);

  if (!speaking) return null;
  return (
    <>
      {[
        { scale: ring1, opacity: op1, color: '#00ff88', width: 2.5 },
        { scale: ring2, opacity: op2, color: '#00cc6a', width: 2 },
        { scale: ring3, opacity: op3, color: '#009950', width: 1.5 },
      ].map((r, i) => (
        <Animated.View key={i} style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: RING_SIZE / 2,
          borderWidth: r.width,
          borderColor: r.color,
          opacity: r.opacity,
          transform: [{ scale: r.scale }],
        }} />
      ))}
    </>
  );
}

/* ── Yıldız Parçacıkları ── */
function TwinklingStars() {
  const stars = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      x: Math.cos((i / 10) * Math.PI * 2) * (MOON_SIZE / 2 + 10 + Math.random() * 16),
      y: Math.sin((i / 10) * Math.PI * 2) * (MOON_SIZE / 2 + 10 + Math.random() * 16),
      size: 1 + Math.random() * 1.2,
      opacity: new Animated.Value(0.1 + Math.random() * 0.2),
    }))
  ).current;

  useEffect(() => {
    stars.forEach((star) => {
      Animated.loop(Animated.sequence([
        Animated.timing(star.opacity, { toValue: 0.03, duration: 1500 + Math.random() * 2000, useNativeDriver: true }),
        Animated.timing(star.opacity, { toValue: 0.4 + Math.random() * 0.3, duration: 1500 + Math.random() * 2000, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  const center = (MOON_SIZE + 40) / 2;
  return (
    <>
      {stars.map((star, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: star.size, height: star.size, borderRadius: star.size / 2,
            backgroundColor: '#fff', opacity: star.opacity,
            left: center + star.x - star.size / 2,
            top: center + star.y - star.size / 2,
          }}
        />
      ))}
    </>
  );
}

/* ── Süre Sayacı ── */
function DurationCounter({ duration, startedAt }: { duration?: number; startedAt?: number }) {
  const [remaining, setRemaining] = React.useState<number | null>(null);
  useEffect(() => {
    if (!duration || !startedAt) { setRemaining(null); return; }
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, Math.ceil((duration - elapsed) / 1000)));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [duration, startedAt]);
  if (remaining == null) return null;
  return (
    <View style={s.timerPill}>
      <Ionicons name="timer-outline" size={11} color="#00ff88" />
      <Text style={s.timerText}>{Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════
   ACTIVE SPEAKER SPOTLIGHT
   ══════════════════════════════════════════ */
export default function ActiveSpeaker(props: ActiveSpeakerProps) {
  const { userId, displayName, avatar, role, speaking, muted, duration, startedAt } = props;
  const roleColor = getRoleColor(role);
  const roleIcon = getRoleIcon(role);
  const roleLabel = getRoleLabel(role);

  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  /* Konuşmacı YOK — GERÇEKÇİ AY */
  if (!userId) {
    return (
      <View style={s.container}>
        <View style={s.moonWrapper}>
          <TwinklingStars />

          {/* Ay — tek daire, glow yok, doğrudan yüzey */}
          <View style={s.moonOuter}>
            {/* Ana ay yüzeyi */}
            <LinearGradient
              colors={['#e8deb5', '#d8ce9f', '#c8be8f', '#bab080']}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={s.moonSurface}
            >
              {/* Maria — koyu lekeler */}
              <View style={[ms.m, { width: 28, height: 24, top: 16, left: 18, borderRadius: 14, opacity: 0.22, transform: [{ rotate: '-12deg' }] }]} />
              <View style={[ms.m, { width: 16, height: 14, top: 12, left: 48, borderRadius: 8, opacity: 0.15, transform: [{ rotate: '20deg' }] }]} />
              <View style={[ms.m, { width: 20, height: 18, top: 48, left: 14, borderRadius: 11, opacity: 0.18, transform: [{ rotate: '8deg' }] }]} />
              <View style={[ms.m, { width: 12, height: 10, top: 38, left: 55, borderRadius: 6, opacity: 0.12 }]} />
              <View style={[ms.m, { width: 15, height: 12, top: 65, left: 38, borderRadius: 7, opacity: 0.14, transform: [{ rotate: '-18deg' }] }]} />
              <View style={[ms.m, { width: 8, height: 7, top: 28, left: 35, borderRadius: 4, opacity: 0.10 }]} />

              {/* Krateler */}
              <View style={[ms.c, { width: 7, height: 7, top: 25, left: 62 }]} />
              <View style={[ms.c, { width: 4, height: 4, top: 76, left: 26 }]} />
              <View style={[ms.c, { width: 5, height: 5, top: 58, left: 68 }]} />
              <View style={[ms.c, { width: 3, height: 3, top: 14, left: 72 }]} />
              <View style={[ms.c, { width: 6, height: 6, top: 78, left: 54 }]} />

              {/* Mikrofon ikonu — çok hafif */}
              <View style={s.moonMicWrap}>
                <Ionicons name="mic-outline" size={26} color="rgba(90,80,50,0.45)" />
              </View>
            </LinearGradient>
          </View>

          <Text style={s.moonText}>Mikrofon boşta</Text>
          <Text style={s.moonSubText}>El kaldırarak söz isteyebilirsiniz</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Animated.View style={[s.avatarOuter, { transform: [{ scale: breathe }] }]}>
        <NeonSpeakingRing speaking={!!speaking} />
        <View style={[s.avatarBorder, speaking && { borderColor: '#00ff88' }]}>
          <Image source={{ uri: avatar || 'https://sopranochat.com/avatars/neutral_1.png' }} style={s.avatarImg} />
        </View>
        <View style={[s.micBadge, speaking ? { backgroundColor: '#00ff88' } : muted ? { backgroundColor: '#ef4444' } : { backgroundColor: 'rgba(100,100,100,0.8)' }]}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={12} color={speaking ? '#0a0e27' : '#fff'} />
        </View>
        {roleIcon ? (
          <View style={[s.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={s.roleEmoji}>{roleIcon}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text style={[s.name, { color: roleColor }]} numberOfLines={1}>{displayName || 'Bilinmiyor'}</Text>
      <View style={s.infoRow}>
        <View style={[s.rolePill, { borderColor: roleColor + '40' }]}>
          <Text style={[s.roleText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
        <DurationCounter duration={duration} startedAt={startedAt} />
      </View>
    </View>
  );
}

/* Ay yüzey stilleri */
const ms = StyleSheet.create({
  m: { position: 'absolute', backgroundColor: 'rgba(90,80,55,0.5)' },
  c: { position: 'absolute', borderRadius: 50, borderWidth: 0.8, borderColor: 'rgba(100,90,65,0.25)', backgroundColor: 'rgba(80,70,50,0.15)', opacity: 0.5 },
});

const s = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 },

  /* ── Ay ── */
  moonWrapper: {
    width: MOON_SIZE + 40, height: MOON_SIZE + 40,
    alignItems: 'center', justifyContent: 'center',
  },
  moonOuter: {
    width: MOON_SIZE, height: MOON_SIZE, borderRadius: MOON_SIZE / 2,
    overflow: 'hidden',
  },
  moonSurface: {
    width: MOON_SIZE, height: MOON_SIZE, borderRadius: MOON_SIZE / 2,
  },
  moonMicWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  moonText: { fontSize: 11, fontWeight: '600', color: 'rgba(210,200,150,0.4)', marginTop: 6 },
  moonSubText: { fontSize: 9, color: 'rgba(210,200,150,0.22)', marginTop: 2, textAlign: 'center' },

  /* Avatar */
  avatarOuter: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  avatarBorder: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0e27',
  },
  avatarImg: { width: AVATAR_SIZE - 8, height: AVATAR_SIZE - 8, borderRadius: (AVATAR_SIZE - 8) / 2 },
  micBadge: {
    position: 'absolute', bottom: 2, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#0a0e27',
  },
  roleBadge: {
    position: 'absolute', top: 0, left: 8,
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: '#0a0e27',
  },
  roleEmoji: { fontSize: 11 },
  name: {
    fontSize: 17, fontWeight: '800', marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  rolePill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  roleText: { fontSize: 10, fontWeight: '700' },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, backgroundColor: 'rgba(0,255,136,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)',
  },
  timerText: { fontSize: 11, fontWeight: '700', color: '#00ff88', fontVariant: ['tabular-nums'] },
});
