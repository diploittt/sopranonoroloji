import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLabel, getRoleLevel, sortUsersByRole } from '../utils/roleHelpers';
import useStore from '../store';
import { useAppState } from '../hooks/useAppState';
import ChatPanel from '../components/room/ChatPanel';
import ParticipantsList from '../components/room/ParticipantsList';
import MicQueuePanel from '../components/room/MicQueuePanel';
import UserProfileModal from '../components/room/UserProfileModal';
import GiftPanel from '../components/room/GiftPanel';
import TokenShop from '../components/room/TokenShop';
import GiftAnimation from '../components/room/GiftAnimation';
import useLiveKit from '../hooks/useLiveKit';
import type { Participant } from '../services/realtimeService';

const { width, height: H } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   STAGE USER TYPE
   ═══════════════════════════════════════════════════════════ */

interface StageUser {
  id: string;
  name: string;
  avatar: string;
  speaking: boolean;
  muted: boolean;
  role: string;
}

const DEFAULT_AVATAR = '/avatars/neutral_1.png';

/* ═══════════════════════════════════════════════════════════
   SPOTLIGHT PARTİKÜLLER — Zenginleştirilmiş
   ═══════════════════════════════════════════════════════════ */

function SpotlightParticles() {
  const COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#22d3ee', '#a78bfa', '#67e8f9', '#e879f9'];
  const pts = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      op: new Animated.Value(0),
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      size: 2 + Math.random() * 4,
      baseX: width * 0.05 + Math.random() * width * 0.9,
      baseY: H * 0.04 + Math.random() * H * 0.6,
      color: COLORS[i % COLORS.length],
    }))
  ).current;

  useEffect(() => {
    pts.forEach(p => {
      const go = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(p.op, { toValue: 0.2 + Math.random() * 0.4, duration: 1200 + Math.random() * 2000, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: -20 + Math.random() * 40, duration: 2500 + Math.random() * 2500, useNativeDriver: true }),
            Animated.timing(p.x, { toValue: -10 + Math.random() * 20, duration: 3000 + Math.random() * 2000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(p.op, { toValue: 0, duration: 1200 + Math.random() * 800, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: 0, duration: 1500, useNativeDriver: true }),
            Animated.timing(p.x, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
        ]).start(go);
      };
      setTimeout(go, Math.random() * 3000);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: p.size,
          backgroundColor: p.color,
          left: p.baseX, top: p.baseY, opacity: p.op,
          transform: [{ translateY: p.y }, { translateX: p.x }],
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   AMBİENT IŞIK KÜRELERİ — Arka plan hareketli orblar
   ═══════════════════════════════════════════════════════════ */

function AmbientOrbs() {
  const orbs = useRef([
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.12, baseY: H * 0.18, size: 180, color: 'rgba(56,189,248,0.05)' },
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.75, baseY: H * 0.12, size: 150, color: 'rgba(129,140,248,0.045)' },
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.35, baseY: H * 0.6, size: 200, color: 'rgba(192,132,252,0.04)' },
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.82, baseY: H * 0.45, size: 130, color: 'rgba(236,72,153,0.035)' },
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.5, baseY: H * 0.35, size: 160, color: 'rgba(34,211,238,0.04)' },
    { x: new Animated.Value(0), y: new Animated.Value(0), baseX: width * 0.2, baseY: H * 0.75, size: 140, color: 'rgba(167,139,250,0.035)' },
  ]).current;

  useEffect(() => {
    orbs.forEach((orb) => {
      const drift = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(orb.x, { toValue: -20 + Math.random() * 40, duration: 6000 + Math.random() * 4000, useNativeDriver: true }),
            Animated.timing(orb.y, { toValue: -15 + Math.random() * 30, duration: 7000 + Math.random() * 4000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(orb.x, { toValue: Math.random() * 20 - 10, duration: 6000 + Math.random() * 4000, useNativeDriver: true }),
            Animated.timing(orb.y, { toValue: Math.random() * 15 - 7, duration: 7000 + Math.random() * 4000, useNativeDriver: true }),
          ]),
        ]).start(drift);
      };
      setTimeout(drift, Math.random() * 2000);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          width: orb.size, height: orb.size, borderRadius: orb.size / 2,
          backgroundColor: orb.color,
          left: orb.baseX - orb.size / 2, top: orb.baseY - orb.size / 2,
          transform: [{ translateX: orb.x }, { translateY: orb.y }],
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   REAKTİF SES DALGASI BARLARI — Konuşmacı etrafı
   ═══════════════════════════════════════════════════════════ */

function AudioWaveBars({ side }: { side: 'left' | 'right' }) {
  const bars = useRef(Array.from({ length: 7 }, () => new Animated.Value(6 + Math.random() * 12))).current;

  useEffect(() => {
    bars.forEach((b, idx) => {
      const go = () => {
        const peak = 6 + Math.random() * 32;
        const valley = 3 + Math.random() * 6;
        Animated.sequence([
          Animated.timing(b, { toValue: peak, duration: 150 + Math.random() * 250, useNativeDriver: false }),
          Animated.timing(b, { toValue: valley, duration: 200 + Math.random() * 300, useNativeDriver: false }),
        ]).start(go);
      };
      setTimeout(go, idx * 80 + Math.random() * 200);
    });
  }, []);

  return (
    <View style={[s.waveBars, side === 'left' ? { left: 10 } : { right: 10 }]}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{
          width: 3, borderRadius: 2, marginVertical: 1,
          height: b,
          backgroundColor: i % 2 === 0
            ? `rgba(56,189,248,${0.35 + i * 0.08})`
            : `rgba(129,140,248,${0.3 + i * 0.07})`,
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA EKRAN
   ═══════════════════════════════════════════════════════════ */

export default function RoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'stage' | 'chat' | 'participants' | 'mic'>('stage');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [giftPanelVisible, setGiftPanelVisible] = useState(false);
  const [tokenShopVisible, setTokenShopVisible] = useState(false);

  // ═══ STORE ═══
  const {
    socketConnected, participants: storeParticipants, activeSpeaker,
    micQueue, roomError, connectionError, messages, joinRoom, leaveRoom,
    takeMic, releaseMic, requestMic, sendChatMessage, currentRoom, user,
    lastGiftAnimation, clearGiftAnimation,
  } = useStore();

  // ═══ LIVEKIT ═══
  const roomSlug = currentRoom?.slug || params.roomId;
  const {
    connectionState: lkState, isPublishing: lkPublishing,
    error: lkError, publishAudio, unpublishAudio, setMicEnabled,
  } = useLiveKit({ roomSlug, enabled: socketConnected });

  // Store participants → sorted StageUser format
  const STAGE: StageUser[] = storeParticipants.length > 0
    ? sortUsersByRole(
        storeParticipants.map((p) => ({
          id: p.userId,
          name: p.displayName,
          avatar: p.avatar || DEFAULT_AVATAR,
          speaking: activeSpeaker?.userId === p.userId,
          muted: p.isMuted || false,
          role: p.role || 'guest',
        }))
      )
    : [];

  const ACTIVE = activeSpeaker
    ? {
        id: activeSpeaker.userId,
        name: activeSpeaker.displayName,
        avatar: storeParticipants.find((p) => p.userId === activeSpeaker.userId)?.avatar || DEFAULT_AVATAR,
        role: storeParticipants.find((p) => p.userId === activeSpeaker.userId)?.role || 'guest',
      }
    : STAGE.length > 0
      ? { id: STAGE[0].id, name: STAGE[0].name, avatar: STAGE[0].avatar, role: STAGE[0].role }
      : { id: '', name: 'Bağlanıyor...', avatar: DEFAULT_AVATAR, role: 'guest' };

  const WAITERS = micQueue
    .map((userId) => storeParticipants.find((p) => p.userId === userId))
    .filter(Boolean)
    .map((p) => ({ id: p!.userId, name: p!.displayName, avatar: p!.avatar || DEFAULT_AVATAR }));

  // ═══ ROOM LIFECYCLE ═══
  useEffect(() => {
    const roomId = params.roomId;
    if (roomId && socketConnected) {
      joinRoom(roomId);
    }
    return () => {
      // Component unmount — odadan ayrıl
      leaveRoom();
    };
  }, [params.roomId, socketConnected]);

  // ═══ APP STATE (background/foreground) ═══
  useAppState({
    onForeground: () => {
      // Foreground'a dönüldüğünde — bağlantı yoksa reconnect
      console.log('[RoomScreen] App foregrounded');
    },
    onBackground: () => {
      console.log('[RoomScreen] App backgrounded');
    },
  });

  const avatarSize = width * 0.32;
  const ringBase = avatarSize + 4;

  // Animasyonlar
  const glowPulse = useRef(new Animated.Value(0.2)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const r1s = useRef(new Animated.Value(1)).current;
  const r1o = useRef(new Animated.Value(0.7)).current;
  const r2s = useRef(new Animated.Value(1)).current;
  const r2o = useRef(new Animated.Value(0.5)).current;
  const r3s = useRef(new Animated.Value(1)).current;
  const r3o = useRef(new Animated.Value(0.3)).current;
  const r4s = useRef(new Animated.Value(1)).current;
  const r4o = useRef(new Animated.Value(0.15)).current;
  const spotPulse = useRef(new Animated.Value(0.08)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const micBreathe = useRef(new Animated.Value(1)).current;
  const liveDotAnim = useRef(new Animated.Value(1)).current;
  const stripGlow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Glow nefes
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 0.8, duration: 1100, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.2, duration: 1100, useNativeDriver: true }),
    ])).start();

    // Avatar nefes
    Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();

    // Spotlight pulse
    Animated.loop(Animated.sequence([
      Animated.timing(spotPulse, { toValue: 0.14, duration: 2000, useNativeDriver: true }),
      Animated.timing(spotPulse, { toValue: 0.06, duration: 2000, useNativeDriver: true }),
    ])).start();

    // Halkalar
    const aR = (sc: Animated.Value, op: Animated.Value, d: number, mx: number, b: number) => {
      Animated.loop(Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(sc, { toValue: mx, duration: 1800, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(sc, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(op, { toValue: b, duration: 0, useNativeDriver: true }),
        ]),
      ])).start();
    };
    aR(r1s, r1o, 0, 1.3, 0.7);
    aR(r2s, r2o, 450, 1.5, 0.5);
    aR(r3s, r3o, 900, 1.7, 0.3);
    aR(r4s, r4o, 1350, 1.9, 0.15);
  }, []);

  // CANLI dot blink
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(liveDotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(liveDotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  // Konuşan strip glow
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(stripGlow, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
      Animated.timing(stripGlow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  // Mikrofon idle nefes
  useEffect(() => {
    if (!micOn) {
      Animated.loop(Animated.sequence([
        Animated.timing(micBreathe, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(micBreathe, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])).start();
    } else {
      micBreathe.setValue(1);
    }
  }, [micOn]);

  // Mikrofon açıkken agresif pulse
  useEffect(() => {
    if (micOn) {
      Animated.loop(Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0.95, duration: 400, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1.08, duration: 350, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])).start();
    } else { micPulse.setValue(1); }
  }, [micOn]);

  return (
    <View style={s.container}>
      {/* KOYU ARKA PLAN — Çok katmanlı premium gradient */}
      <LinearGradient 
        colors={['#0f172a', '#0c1427', '#0a0e1a', '#0e0a1f', '#020617']} 
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill as any} 
      />

      {/* ═══ CONNECTION STATUS BANNER ═══ */}
      {connectionError && (
        <View style={s.connectionBanner}>
          <Text style={s.connectionBannerText}>⚠️ Bağlantı kurulamadı — yeniden deneniyor...</Text>
        </View>
      )}
      {roomError && (
        <View style={[s.connectionBanner, { backgroundColor: 'rgba(220,38,38,0.9)' }]}>
          <Text style={s.connectionBannerText}>{roomError.message}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.connectionBannerBtn}>
            <Text style={s.connectionBannerBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* LiveKit bağlantı durumu */}
      {lkError && (
        <View style={[s.connectionBanner, { backgroundColor: 'rgba(147,51,234,0.85)' }]}>
          <Text style={s.connectionBannerText}>🎙️ {lkError}</Text>
        </View>
      )}
      {lkState === 'reconnecting' && (
        <View style={[s.connectionBanner, { backgroundColor: 'rgba(217,119,6,0.85)' }]}>
          <Text style={s.connectionBannerText}>🔄 Ses bağlantısı yeniden kuruluyor...</Text>
        </View>
      )}

      {/* AMBİENT IŞIK KÜRELERİ — arka plan hareketi */}
      <AmbientOrbs />

      <SpotlightParticles />

      {/* ── HEADER — minimal, şeffaf ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.hBtn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={s.hCenter}>
          <View style={s.liveDotRow}>
            <Animated.View style={[s.livePulse, { opacity: liveDotAnim, transform: [{ scale: liveDotAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1] }) }] }]} />
          <Text style={s.hTitle}>{currentRoom?.name || 'Oda'}</Text>
            {/* ● CANLI etiketi */}
            <View style={s.liveBadge}>
              <Animated.View style={[s.liveBadgeDot, { opacity: liveDotAnim }]} />
              <Text style={s.liveBadgeText}>CANLI</Text>
            </View>
          </View>
          <Text style={s.hSub}>🟢 {STAGE.length > 0 ? `${STAGE.length} kişi` : 'Bağlanıyor...'}</Text>
        </View>
        <TouchableOpacity style={s.hBtn}>
          <Ionicons name="person-add-outline" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <TouchableOpacity style={s.hBtn}>
          <Ionicons name="ellipsis-vertical" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* ══════ İÇERİK ALANI ══════ */}
      {activeTab === 'stage' ? (
        <>
          {/* Sahne tab: tam broadcastZone */}
          <View style={s.broadcastZone}>
            <AudioWaveBars side="left" />
            <AudioWaveBars side="right" />
            <View style={{ width: ringBase * 2.1, height: ringBase * 2.1, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', width: avatarSize * 1.6, height: avatarSize * 1.6, borderRadius: avatarSize * 0.8, backgroundColor: '#38bdf8', opacity: spotPulse }} />
              <Animated.View style={{ ...ring(ringBase), borderWidth: 3.5, borderColor: '#38bdf8', opacity: r1o, transform: [{ scale: r1s }] }} />
              <Animated.View style={{ ...ring(ringBase), borderWidth: 2.5, borderColor: '#60a5fa', opacity: r2o, transform: [{ scale: r2s }] }} />
              <Animated.View style={{ ...ring(ringBase), borderWidth: 2, borderColor: '#818cf8', opacity: r3o, transform: [{ scale: r3s }] }} />
              <Animated.View style={{ ...ring(ringBase), borderWidth: 1.5, borderColor: '#a78bfa', opacity: r4o, transform: [{ scale: r4s }] }} />
              <Animated.View style={{ position: 'absolute', width: avatarSize + 16, height: avatarSize + 16, borderRadius: (avatarSize + 16) / 2, backgroundColor: 'rgba(56,189,248,0.15)', opacity: glowPulse }} />
              <Animated.View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderWidth: 3, borderColor: '#38bdf8', shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 0 }, shadowRadius: 24, shadowOpacity: 0.7, elevation: 16, backgroundColor: '#0f172a', transform: [{ scale: breathe }], alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: ACTIVE.avatar }} style={{ width: avatarSize - 8, height: avatarSize - 8, borderRadius: (avatarSize - 8) / 2 }} />
              </Animated.View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {getRoleIcon(ACTIVE.role) ? <Text style={{ fontSize: 16 }}>{getRoleIcon(ACTIVE.role)}</Text> : null}
              <Text style={s.speakerName}>{ACTIVE.name}</Text>
            </View>
            <Text style={{ fontSize: 10, color: getRoleColor(ACTIVE.role), fontWeight: '700', marginTop: 2, letterSpacing: 0.5 }}>{getRoleLabel(ACTIVE.role)}</Text>
            <View style={s.speakingRow}>
              <View style={s.greenDot} />
              <Text style={s.speakingLabel}>Konuşuyor...</Text>
            </View>
          </View>

          {/* Sahne strip */}
          <View style={s.strip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripScroll}>
            {STAGE.map(u => (
              <TouchableOpacity key={u.id} onPress={() => {
                const part = storeParticipants.find(p => p.userId === u.id);
                if (part) { setSelectedParticipant(part); setProfileVisible(true); }
              }} activeOpacity={0.7}>
              <View style={s.stripItem}>
                <View style={[s.stripAv, u.speaking && s.stripAvActive]}>
                  {u.speaking && (
                    <Animated.View style={{ position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#38bdf8', opacity: stripGlow, transform: [{ scale: stripGlow.interpolate({ inputRange: [0.3, 0.9], outputRange: [1, 1.2] }) }] }} />
                  )}
                  <Image source={{ uri: u.avatar }} style={s.stripImg} />
                  {u.muted && (<View style={s.muteBadge}><Ionicons name="mic-off" size={8} color="#ef4444" /></View>)}
                  {getRoleIcon(u.role) ? (
                    <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 2, paddingVertical: 1, borderWidth: 1, borderColor: getRoleColor(u.role) + '60' }}>
                      <Text style={{ fontSize: 8 }}>{getRoleIcon(u.role)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.stripName, u.speaking && s.stripNameActive, { color: getRoleColor(u.role) }]}>{u.name}</Text>
              </View>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>

          {/* Söz isteyenler */}
          {WAITERS.length > 0 && (
            <View style={s.waitRow}>
              <Text style={s.waitLabel}>Söz İsteyenler</Text>
              <View style={s.waitBadge}><Text style={s.waitBadgeT}>{WAITERS.length}</Text></View>
              <View style={{ flex: 1 }} />
              {WAITERS.map(w => (<Image key={w.id} source={{ uri: w.avatar }} style={s.waitAvatar} />))}
              <TouchableOpacity style={s.waitSeeAll} onPress={() => setActiveTab('mic')}>
                <Text style={s.waitSeeAllT}>Gör</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        /* Sohbet / Katılımcılar / Mik tabları — mini bar + içerik */
        <View style={{ flex: 1 }}>
          <View style={s.miniSpeakerBar}>
            <Image source={{ uri: ACTIVE.avatar }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#38bdf8' }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#f1f5f9' }} numberOfLines={1}>{ACTIVE.name}</Text>
              <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '600' }}>● Konuşuyor</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveTab('stage')} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(56,189,248,0.12)' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#38bdf8' }}>Sahne</Text>
            </TouchableOpacity>
          </View>
          <View style={s.tabContent}>
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'participants' && <ParticipantsList />}
            {activeTab === 'mic' && <MicQueuePanel />}
          </View>
        </View>
      )}

      {/* ══════ BİRLEŞİK ALT BAR ══════ */}
      <View style={s.bottomBar}>
        {/* Üst sıra: Tab geçişleri */}
        <View style={s.bottomTabs}>
          {([
            { id: 'stage', icon: 'radio-outline', label: 'Sahne', badge: 0 },
            { id: 'chat', icon: 'chatbubble-ellipses-outline', label: 'Sohbet', badge: messages.length },
            { id: 'participants', icon: 'people-outline', label: `${storeParticipants.length}`, badge: 0 },
            { id: 'mic', icon: 'mic-outline', label: 'Mik', badge: micQueue.length },
          ] as { id: string; icon: string; label: string; badge: number }[]).map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.bTabItem, activeTab === tab.id && s.bTabItemActive]}
              onPress={() => setActiveTab(tab.id as any)}
              activeOpacity={0.7}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? '#818cf8' : 'rgba(255,255,255,0.3)'} />
                {tab.badge > 0 && (
                  <View style={s.bTabBadge}>
                    <Text style={s.bTabBadgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.bTabLabel, activeTab === tab.id && s.bTabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alt sıra: Kontroller */}
        <View style={s.bottomControls}>
          <CtrlBtn icon={camOn ? 'videocam' : 'videocam-off'} label="Kamera" active={camOn} color="#06b6d4" onPress={() => {
            const next = !camOn;
            setCamOn(next);
            console.log(`[Room] Kamera ${next ? 'AÇILDI' : 'KAPANDI'}`);
          }} />
          <CtrlBtn icon="hand-left" label="El" active={micQueue.includes(user?.id || '')} color="#f59e0b" onPress={() => {
            console.log('[Room] El Kaldır — requestMic() çağrılıyor...');
            requestMic();
          }} />

          {/* MİKROFON */}
          <TouchableOpacity onPress={async () => {
            const newMicState = !micOn;
            setMicOn(newMicState);
            console.log(`[Room] Mikrofon ${newMicState ? 'AÇILDI' : 'KAPANDI'}`);
            if (newMicState) { takeMic(); await publishAudio(); }
            else { releaseMic(); await unpublishAudio(); }
          }} activeOpacity={0.85} style={s.micWrap}>
            <Animated.View style={{ transform: [{ scale: micOn ? micPulse : micBreathe }] }}>
              {micOn && (
                <Animated.View style={{
                  position: 'absolute', width: 46, height: 46, borderRadius: 16,
                  left: -4, top: -4, borderWidth: 2, borderColor: 'rgba(236,72,153,0.3)',
                  opacity: micPulse.interpolate({ inputRange: [0.95, 1.15], outputRange: [0.6, 0] }),
                  transform: [{ scale: micPulse.interpolate({ inputRange: [0.95, 1.15], outputRange: [1, 1.25] }) }],
                }} />
              )}
              <LinearGradient colors={micOn ? ['#ec4899','#db2777'] : ['#475569','#334155']} style={s.micBtn}>
                <Ionicons name={micOn ? 'mic' : 'mic-off'} size={20} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <CtrlBtn icon="gift" label="Hediye" active={giftPanelVisible} color="#f59e0b" onPress={() => setGiftPanelVisible(true)} />
          <CtrlBtn icon="log-out-outline" label="Çıkış" active={false} color="#ef4444" onPress={() => {
            console.log('[Room] Odadan ayrılınıyor...');
            leaveRoom();
            router.back();
          }} />
        </View>
      </View>

      {/* ══════ USER PROFILE MODAL ══════ */}
      <UserProfileModal
        visible={profileVisible}
        onClose={() => { setProfileVisible(false); setSelectedParticipant(null); }}
        participant={selectedParticipant}
      />

      {/* ══════ GIFT PANEL ══════ */}
      <GiftPanel
        visible={giftPanelVisible}
        onClose={() => setGiftPanelVisible(false)}
        onOpenShop={() => setTokenShopVisible(true)}
      />

      {/* ══════ TOKEN SHOP ══════ */}
      <TokenShop
        visible={tokenShopVisible}
        onClose={() => setTokenShopVisible(false)}
      />

      {/* ══════ GIFT ANİMASYON ══════ */}
      <GiftAnimation
        data={lastGiftAnimation}
        onDone={clearGiftAnimation}
      />
    </View>
  );
}

/* ── Küçük kontrol butonu ── */
function CtrlBtn({ icon, label, active, color, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={s.ctrlItem}>
      <View style={[s.ctrlCircle, active && { backgroundColor: `${color}20`, borderColor: `${color}60` }]}>
        <Ionicons name={icon} size={18} color={active ? color : 'rgba(255,255,255,0.5)'} />
      </View>
      <Text style={[s.ctrlLabel, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── Halka helper ── */
function ring(size: number) {
  return { position: 'absolute' as const, width: size, height: size, borderRadius: size / 2 };
}

/* ═══════════════════════════════════════════════════════════
   STİLLER
   ═══════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080c18' },

  /* ── SPOTLIGHT — Radial Glow ── */
  spotlight: {
    position: 'absolute', top: H * 0.08, left: width * 0.18,
    width: width * 0.64, height: width * 0.64, borderRadius: width * 0.32,
    backgroundColor: '#38bdf8',
  },

  /* ── HEADER ── */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 34,
    paddingHorizontal: 12, paddingBottom: 6, gap: 6,
  },
  hBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  hCenter: { flex: 1, alignItems: 'center' },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3,
  },
  hTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.3 },
  hSub: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 1,
  },
  liveBadgeDot: {
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ef4444',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4,
  },
  liveBadgeText: { fontSize: 8, fontWeight: '900', color: '#ef4444', letterSpacing: 1 },

  /* ── BROADCAST ZONE ── */
  broadcastZone: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  waveBars: {
    position: 'absolute', top: '28%',
    alignItems: 'center',
  },

  /* ── İSİM ── */
  speakerName: {
    fontSize: 22, fontWeight: '900', color: '#f8fafc', marginTop: 10,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(56,189,248,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  speakingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  greenDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4,
  },
  speakingLabel: { fontSize: 13, fontWeight: '700', color: '#22c55e', letterSpacing: 0.3 },

  /* ── SPEAKER STRIP ── */
  strip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  stripScroll: { gap: 12 },
  stripItem: { alignItems: 'center', width: 48 },
  stripAv: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(129,140,248,0.08)', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 1,
  },
  stripAvActive: {
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
  },
  stripImg: { width: 34, height: 34, borderRadius: 17 },
  muteBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 1,
  },
  stripName: { fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginTop: 3 },
  stripNameActive: { color: '#67e8f9', fontWeight: '700' },

  /* ── SÖZ İSTEYENLER ── */
  waitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 6,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  waitLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  waitBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5,
  },
  waitBadgeT: { fontSize: 9, fontWeight: '700', color: '#ef4444' },
  waitAvatar: {
    width: 24, height: 24, borderRadius: 12, marginLeft: -6,
    borderWidth: 1.5, borderColor: '#080c18',
  },
  waitSeeAll: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(56,189,248,0.1)',
  },
  waitSeeAllT: { fontSize: 9, fontWeight: '700', color: '#38bdf8' },

  /* ── KONTROL BUTONLARI ── */
  ctrlItem: { alignItems: 'center', gap: 2, width: 44 },
  ctrlCircle: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ctrlLabel: { fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },

  /* ── MİKROFON ── */
  micWrap: { alignItems: 'center', gap: 2, marginHorizontal: 4 },
  micBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ec4899', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)',
  },

  /* ── CONNECTION BANNER ── */
  connectionBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 10,
    paddingHorizontal: 14, backgroundColor: 'rgba(217,119,6,0.9)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  connectionBannerText: { fontSize: 11, fontWeight: '600', color: '#fff', flex: 1 },
  connectionBannerBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  connectionBannerBtnText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  /* ═══ BİRLEŞİK ALT BAR ═══ */
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
  },
  bottomTabs: {
    flexDirection: 'row', justifyContent: 'space-evenly',
    paddingVertical: 4, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  bTabItem: {
    alignItems: 'center', gap: 1,
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 8,
  },
  bTabItemActive: {
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.15)',
  },
  bTabBadge: {
    position: 'absolute', top: -3, right: -7,
    backgroundColor: '#ef4444', borderRadius: 6,
    minWidth: 14, height: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)',
  },
  bTabBadgeText: { fontSize: 7, fontWeight: '900', color: '#fff' },
  bTabLabel: { fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  bTabLabelActive: { color: '#a5b4fc' },

  bottomControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 6, paddingHorizontal: 12,
  },

  /* ── MİNİ KONUŞMACI BARI ── */
  miniSpeakerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },

  /* ── TAB CONTENT ── */
  tabContent: {
    flex: 1,
    backgroundColor: 'rgba(8,12,24,0.96)',
    borderTopWidth: 0.5, borderTopColor: 'rgba(129,140,248,0.06)',
  },
});
