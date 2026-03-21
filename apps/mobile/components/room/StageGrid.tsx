import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor } from '../../utils/roleHelpers';

const { width } = Dimensions.get('window');
const CARD_W = 78;
const CARD_H = 100;
const AVATAR = 52;

interface StageUser {
  id: string;
  name: string;
  avatar: string;
  speaking: boolean;
  muted: boolean;
  role: string;
  camOn?: boolean;
}

/* ── Mini Speaking Ring ── */
function MiniSpeakingRing({ speaking }: { speaking: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (speaking) {
      Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ])).start();
    } else {
      scale.setValue(1); opacity.setValue(0);
    }
  }, [speaking]);

  if (!speaking) return null;
  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      borderRadius: AVATAR / 2 + 4,
      borderWidth: 2, borderColor: '#00ff88',
      opacity, transform: [{ scale }],
    }} />
  );
}

/* ══════════════════════════════════════════
   STAGE GRID — Sahne Avatarları
   Horizontal scroll, glassmorphism kartlar
   ══════════════════════════════════════════ */
export default function StageGrid({
  speakers,
  maxSlots = 8,
  onPress,
}: {
  speakers: StageUser[];
  maxSlots?: number;
  onPress?: (userId: string) => void;
}) {
  if (speakers.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDot} />
        <Text style={s.headerTitle}>SAHNE</Text>
        <View style={s.countPill}>
          <Text style={s.countText}>{speakers.length}/{maxSlots}</Text>
        </View>
      </View>

      {/* Horizontal scroll avatar kartları */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}>
        {speakers.map(sp => {
          const roleColor = getRoleColor(sp.role);
          const roleIcon = getRoleIcon(sp.role);
          return (
            <TouchableOpacity key={sp.id} activeOpacity={0.8}
              onPress={() => onPress?.(sp.id)} style={s.card}>
              {/* Avatar */}
              <View style={s.avatarOuter}>
                <MiniSpeakingRing speaking={sp.speaking} />
                <View style={[s.avatarBorder, sp.speaking && { borderColor: '#00ff88' }]}>
                  <Image source={{ uri: sp.avatar }} style={s.avatarImg} />
                </View>

                {/* Mic badge */}
                <View style={[s.micBadge,
                  sp.speaking ? { backgroundColor: '#00ff88' } :
                  sp.muted ? { backgroundColor: '#ef4444' } :
                  { backgroundColor: 'rgba(100,100,100,0.8)' }
                ]}>
                  <Ionicons name={sp.muted ? 'mic-off' : 'mic'} size={8} color={sp.speaking ? '#0a0e27' : '#fff'} />
                </View>

                {/* Rol badge */}
                {roleIcon ? (
                  <View style={[s.roleBadge, { backgroundColor: roleColor }]}>
                    <Text style={{ fontSize: 8 }}>{roleIcon}</Text>
                  </View>
                ) : null}
              </View>

              {/* İsim */}
              <Text style={[s.name, { color: roleColor }]} numberOfLines={1}>{sp.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, paddingHorizontal: 4,
  },
  headerDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff88',
  },
  headerTitle: {
    fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  countPill: {
    backgroundColor: 'rgba(0,255,136,0.1)', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)',
  },
  countText: { fontSize: 9, fontWeight: '800', color: '#00ff88' },

  scrollContent: {
    paddingHorizontal: 2, gap: 8, paddingBottom: 4,
  },

  /* Card */
  card: {
    width: CARD_W,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  /* Avatar */
  avatarOuter: {
    width: AVATAR + 8, height: AVATAR + 8,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBorder: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  avatarImg: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },

  micBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0a0e27',
  },
  roleBadge: {
    position: 'absolute', top: 0, left: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0a0e27',
  },

  name: {
    fontSize: 10, fontWeight: '700', marginTop: 6,
    textAlign: 'center', maxWidth: CARD_W - 8,
  },
});
