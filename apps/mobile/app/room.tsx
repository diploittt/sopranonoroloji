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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLabel, getRoleLevel } from '../utils/roleHelpers';
import useStore from '../store';
import { useAppState } from '../hooks/useAppState';
import UserProfileModal from '../components/room/UserProfileModal';
import GiftPanel from '../components/room/GiftPanel';
import TokenShop from '../components/room/TokenShop';
import GiftAnimation from '../components/room/GiftAnimation';
import useLiveKit from '../hooks/useLiveKit';
import type { Participant } from '../services/realtimeService';

const { width, height: H } = Dimensions.get('window');
const DEFAULT_AVATAR = '/avatars/neutral_1.png';

/* ═══════════════════════════════════════════════════════════
   SES DALGASI ANİMASYONU — konuşurken avatar çevresi
   ═══════════════════════════════════════════════════════════ */
function SpeakingWave({ size, speaking }: { size: number; speaking: boolean }) {
  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (speaking) {
      Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(wave1, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.5, duration: 200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(wave1, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(wave2, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.3, duration: 250, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(wave2, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
      ])).start();
    } else {
      wave1.setValue(1); wave2.setValue(1);
      opacity1.setValue(0); opacity2.setValue(0);
    }
  }, [speaking]);

  if (!speaking) return null;
  const r = size / 2;
  return (
    <>
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: r,
        borderWidth: 2.5, borderColor: '#22c55e',
        opacity: opacity1, transform: [{ scale: wave1 }],
      }} />
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: r,
        borderWidth: 1.5, borderColor: '#4ade80',
        opacity: opacity2, transform: [{ scale: wave2 }],
      }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   YANIP SÖNEN MİKROFON İSTEĞİ
   ═══════════════════════════════════════════════════════════ */
function BlinkingMicRequest() {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', top: -2, right: -2,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
      opacity: blink,
    }}>
      <Ionicons name="mic" size={9} color="#fff" />
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   PARILTILI ARKA PLAN YILDIZLARI
   ═══════════════════════════════════════════════════════════ */
function Sparkles() {
  const sparkles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      opacity: new Animated.Value(Math.random() * 0.6),
      delay: Math.random() * 3000,
    }))
  ).current;

  useEffect(() => {
    sparkles.forEach(s => {
      Animated.loop(Animated.sequence([
        Animated.delay(s.delay),
        Animated.timing(s.opacity, { toValue: 0.7, duration: 1200, useNativeDriver: true }),
        Animated.timing(s.opacity, { toValue: 0.05, duration: 1500, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparkles.map(s => (
        <Animated.View key={s.id} style={{
          position: 'absolute',
          left: `${s.left}%` as any, top: `${s.top}%` as any,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: '#fff', opacity: s.opacity,
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   RENKLİ HEDİYE KUTUSU İKONU — referans görsele birebir
   ═══════════════════════════════════════════════════════════ */
function ColorfulGiftIcon({ size = 28 }: { size?: number }) {
  const s = size;
  const ribbonW = s * 0.12;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Fiyonk — iki yuvarlak lob + merkez düğüm */}
      <View style={{ position: 'absolute', top: 0, alignItems: 'center', zIndex: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{
            width: s * 0.22, height: s * 0.18, borderRadius: s * 0.1,
            backgroundColor: '#f59e0b',
            transform: [{ rotate: '-15deg' }],
            marginRight: -1,
          }} />
          <View style={{
            width: s * 0.22, height: s * 0.18, borderRadius: s * 0.1,
            backgroundColor: '#fbbf24',
            transform: [{ rotate: '15deg' }],
            marginLeft: -1,
          }} />
        </View>
        {/* Düğüm noktası */}
        <View style={{
          width: s * 0.1, height: s * 0.08, borderRadius: s * 0.04,
          backgroundColor: '#f59e0b', marginTop: -3,
        }} />
      </View>

      {/* Kapak — pembe/magenta */}
      <View style={{
        width: s * 0.92, height: s * 0.18,
        borderTopLeftRadius: 4, borderTopRightRadius: 4,
        backgroundColor: '#ec4899', flexDirection: 'row', overflow: 'hidden',
        marginTop: s * 0.28,
      }}>
        <View style={{ flex: 1, backgroundColor: '#ec4899' }} />
        <View style={{ width: ribbonW, backgroundColor: '#fbbf24' }} />
        <View style={{ flex: 1, backgroundColor: '#ec4899' }} />
      </View>

      {/* Kutu gövdesi — mavi sol, mor sağ */}
      <View style={{
        width: s * 0.85, height: s * 0.44,
        borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
        flexDirection: 'row', overflow: 'hidden',
      }}>
        <View style={{ flex: 1, backgroundColor: '#3b82f6' }} />
        <View style={{ width: ribbonW, backgroundColor: '#fbbf24' }} />
        <View style={{ flex: 1, backgroundColor: '#a855f7' }} />
      </View>
    </View>
  );
}

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
  camOn?: boolean;
}

/* ═══════════════════════════════════════════════════════════
   ANA EKRAN
   ═══════════════════════════════════════════════════════════ */
export default function RoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; tenantRooms?: string }>();

  let tenantRooms: any[] = [];
  try { tenantRooms = JSON.parse(params.tenantRooms || '[]'); } catch { tenantRooms = []; }

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [giftPanelVisible, setGiftPanelVisible] = useState(false);
  const [tokenShopVisible, setTokenShopVisible] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // ═══ STORE ═══
  const {
    socketConnected, participants: storeParticipants, activeSpeaker,
    micQueue, roomError, connectionError, messages, joinRoom, leaveRoom,
    takeMic, releaseMic, requestMic, sendChatMessage, currentRoom, user,
    lastGiftAnimation, clearGiftAnimation, roomSettings,
  } = useStore();

  // ═══ LIVEKIT ═══
  const roomSlug = currentRoom?.slug || params.roomId;
  const {
    connectionState: lkState, isPublishing: lkPublishing,
    error: lkError, publishAudio, unpublishAudio, setMicEnabled,
  } = useLiveKit({ roomSlug, enabled: socketConnected });

  // ═══ STAGE DATA ═══
  const STAGE: StageUser[] = storeParticipants
    .filter(p => (p as any).onStage || (p as any).isSpeaking)
    .sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role))
    .map(p => ({
      id: p.userId, name: p.displayName || 'Kullanıcı',
      avatar: p.avatar || DEFAULT_AVATAR,
      speaking: (p as any).isSpeaking || false, muted: p.isMuted || false,
      role: p.role || 'listener', camOn: (p as any).camOn || false,
    }));

  const LISTENERS = storeParticipants.filter(p => !(p as any).onStage && !(p as any).isSpeaking);

  // ═══ ROOM LIFECYCLE ═══
  useEffect(() => {
    const roomId = params.roomId;
    if (roomId && socketConnected) joinRoom(roomId);
    return () => { leaveRoom(); };
  }, [params.roomId, socketConnected]);

  useAppState({
    onForeground: () => console.log('[RoomScreen] Foreground'),
    onBackground: () => console.log('[RoomScreen] Background'),
  });

  // ═══ ANİMASYON ═══
  const liveDotAnim = useRef(new Animated.Value(1)).current;
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(liveDotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(liveDotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (micOn) {
      Animated.loop(Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.1, duration: 400, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0.95, duration: 400, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])).start();
    } else { micPulse.setValue(1); }
  }, [micOn]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    sendChatMessage(chatMessage.trim());
    setChatMessage('');
  };

  const handleExit = () => { leaveRoom(); router.back(); };

  const openProfile = (p: Participant) => {
    setSelectedParticipant(p);
    setProfileVisible(true);
  };




  return (
    <View style={st.container}>
      {/* ═══ ARKA PLAN GRADYAN ═══ */}
      <LinearGradient
        colors={['#0f3443', '#1a5c6e', '#34868e', '#7a6b9a', '#b06aa8', '#d580b0', '#e8a0bb']}
        locations={[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]}
        style={StyleSheet.absoluteFill as any}
      />
      {/* Parlayan yıldızlar */}
      <Sparkles />

      {/* Bannerlar */}
      {connectionError && <View style={st.banner}><Text style={st.bannerText}>⚠️ Bağlantı kurulamadı</Text></View>}
      {roomError && <View style={[st.banner, { backgroundColor: 'rgba(220,38,38,0.9)' }]}><Text style={st.bannerText}>{roomError.message}</Text></View>}
      {lkError && <View style={[st.banner, { backgroundColor: 'rgba(147,51,234,0.85)' }]}><Text style={st.bannerText}>🎙️ {lkError}</Text></View>}

      {/* ── HEADER ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={handleExit} style={st.hBtn}>
          <Ionicons name="close" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={st.hCenter}>
          <TouchableOpacity style={st.hTitlePill} activeOpacity={tenantRooms.length > 1 ? 0.7 : 1}
            onPress={tenantRooms.length > 1 ? () => setShowRoomPicker(!showRoomPicker) : undefined}>
            <Ionicons name="radio" size={14} color="#e2e8f0" style={{ marginRight: 6 }} />
            <Text style={st.hTitle} numberOfLines={1}>{currentRoom?.name || roomSettings?.name || 'Oda'}</Text>
            {tenantRooms.length > 1 && <Ionicons name={showRoomPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#e2e8f0" style={{ marginLeft: 2 }} />}
            <View style={st.hDivider} />
            <Animated.View style={[st.hLiveDot, { opacity: liveDotAnim }]} />
            <Text style={st.hSub}>{storeParticipants.length}</Text>
          </TouchableOpacity>
        </View>
        {(user?.role === 'owner' || user?.role === 'godmaster' || user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'super_admin') ? (
          <TouchableOpacity style={st.hBtn} onPress={() => router.push('/(tenant-admin)')}>
            <Ionicons name="settings-outline" size={20} color="#e2e8f0" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Oda seçici dropdown */}
      {showRoomPicker && tenantRooms.length > 1 && (
        <View style={st.roomPicker}>
          {tenantRooms.map((r: any) => {
            const isActive = (r.slug || r.id) === params.roomId;
            return (
              <TouchableOpacity key={r.id} activeOpacity={0.7}
                onPress={() => {
                  if (!isActive) { leaveRoom(); setShowRoomPicker(false); router.replace({ pathname: '/room', params: { roomId: r.slug || r.id, tenantRooms: params.tenantRooms || '[]' } } as any); }
                  else setShowRoomPicker(false);
                }}
                style={[st.rpItem, isActive && st.rpItemActive]}>
                <View style={[st.rpDot, isActive && { backgroundColor: '#22c55e' }]} />
                <Text style={[st.rpText, isActive && { color: '#fff', fontWeight: '700' }]} numberOfLines={1}>{r.name}</Text>
                {isActive && <Ionicons name="checkmark" size={14} color="#22c55e" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── ANA İÇERİK — STAGE + DİNLEYİCİLER ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>

        {/* ═══ KONUŞMACI STAGE — 2×4 Grid (8 Slot) ═══ */}
        <View style={st.stageSection}>
          <View style={st.stageHeader}>
            <Ionicons name="mic" size={14} color="#22c55e" />
            <Text style={st.stageTitle}>SAHNE</Text>
            <View style={st.stageBadge}>
              <Text style={st.stageBadgeText}>{STAGE.length}/8</Text>
            </View>
          </View>
          <View style={st.stageGrid}>
            {Array.from({ length: 8 }).map((_, idx) => {
              const speaker = STAGE[idx];
              if (!speaker) {
                // Boş slot — noktalı çerçeve
                return (
                  <View key={`empty-${idx}`} style={st.stageItem}>
                    <View style={st.stageSlotEmpty}>
                      <Ionicons name="add" size={20} color="rgba(255,255,255,0.2)" />
                    </View>
                    <Text style={st.stageEmptyLabel}>Boş</Text>
                  </View>
                );
              }
              const isRequesting = micQueue.includes(speaker.id);
              const isSpeaking = speaker.speaking;
              const roleColor = getRoleColor(speaker.role);
              return (
                <TouchableOpacity key={speaker.id} activeOpacity={0.8}
                  onPress={() => { const pp = storeParticipants.find(x => x.userId === speaker.id); if (pp) openProfile(pp); }}
                  style={st.stageItem}>
                  <View style={[st.stageAvatarWrap, isSpeaking && st.stageAvatarSpeaking]}>
                    <SpeakingWave size={68} speaking={isSpeaking} />
                    <Image source={{ uri: speaker.avatar }} style={st.stageAvatarImg} />
                    {/* Mic durumu badge */}
                    <View style={[st.stageMicBadge, isSpeaking ? { backgroundColor: '#22c55e' } : speaker.muted ? { backgroundColor: '#ef4444' } : { backgroundColor: 'rgba(100,100,100,0.75)' }]}>
                      <Ionicons name={speaker.muted ? 'mic-off' : 'mic'} size={9} color="#fff" />
                    </View>
                    {/* Rol badge — sol üst */}
                    {speaker.role !== 'listener' && speaker.role !== 'guest' && (
                      <View style={[st.stageRoleBadge, { backgroundColor: roleColor }]}>
                        <Text style={st.stageRoleBadgeText}>{getRoleIcon(speaker.role)}</Text>
                      </View>
                    )}
                    {isRequesting && <BlinkingMicRequest />}
                  </View>
                  <Text style={[st.stageName, { color: roleColor || 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>{speaker.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ DİNLEYİCİLER — 5 Sütun Küçük Avatar Grid ═══ */}
        {LISTENERS.length > 0 && (
          <View style={st.listenerSection}>
            <View style={st.listenerHeader}>
              <Ionicons name="headset" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={st.listenerTitle}>DİNLEYİCİLER</Text>
              <View style={st.listenerCountBadge}>
                <Text style={st.listenerCountText}>{LISTENERS.length}</Text>
              </View>
            </View>
            <View style={st.listenerGrid}>
              {LISTENERS.map((p) => {
                const isRequesting = micQueue.includes(p.userId);
                return (
                  <TouchableOpacity key={p.userId} activeOpacity={0.8}
                    onPress={() => openProfile(p)}
                    style={st.listenerItem}>
                    <View style={st.listenerAvatarWrap}>
                      <Image source={{ uri: p.avatar || DEFAULT_AVATAR }} style={st.listenerAvatarImg} />
                      {isRequesting && (
                        <View style={st.listenerMicReq}>
                          <Ionicons name="hand-left" size={8} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={st.listenerName} numberOfLines={1}>{p.displayName || 'Kullanıcı'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── SABİT CHAT INPUT ── */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={st.chatBar}>
          <View style={st.chatWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="rgba(255,255,255,0.55)" />
            <TextInput style={st.chatInput} placeholder="Mesaj yaz..."
              placeholderTextColor="rgba(255,255,255,0.5)" value={chatMessage}
              onChangeText={setChatMessage} returnKeyType="send"
              onSubmitEditing={handleSendMessage} />
            {chatMessage.trim().length > 0 && (
              <TouchableOpacity onPress={handleSendMessage}>
                <Ionicons name="send" size={15} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── KONTROL BAR ── */}
      <View style={st.ctrlBar}>
        {/* Mikrofon — kapalıyken kırmızı ikon */}
        <TouchableOpacity onPress={async () => {
          const next = !micOn; setMicOn(next);
          if (next) { takeMic(); await publishAudio(); }
          else { releaseMic(); await unpublishAudio(); }
        }} style={[st.ctrlBtn, micOn && st.ctrlMicOn]}>
          <Animated.View style={{ transform: [{ scale: micOn ? micPulse : 1 }] }}>
            <Ionicons name={micOn ? 'mic' : 'mic-off'} size={18} color={micOn ? '#fff' : '#ef4444'} />
          </Animated.View>
        </TouchableOpacity>

        {/* Kamera — beyaz ikon */}
        <TouchableOpacity onPress={() => setCamOn(!camOn)}
          style={[st.ctrlBtn, camOn && st.ctrlCamOn]}>
          <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={18} color="#fff" />
        </TouchableOpacity>

        {/* El kaldır — ten rengi */}
        <TouchableOpacity onPress={() => requestMic()}
          style={[st.ctrlBtn, micQueue.includes(user?.id || '') && st.ctrlHandOn]}>
          <Ionicons name="hand-left" size={18} color={micQueue.includes(user?.id || '') ? '#fff' : '#f5c6a0'} />
        </TouchableOpacity>

        {/* Hediye — renkli kutu */}
        <TouchableOpacity onPress={() => setGiftPanelVisible(true)} style={st.ctrlBtnGift}>
          <ColorfulGiftIcon size={22} />
        </TouchableOpacity>
      </View>

      {/* ══════ MODALS ══════ */}
      <UserProfileModal visible={profileVisible} onClose={() => { setProfileVisible(false); setSelectedParticipant(null); }} participant={selectedParticipant} />
      <GiftPanel visible={giftPanelVisible} onClose={() => setGiftPanelVisible(false)} onOpenShop={() => setTokenShopVisible(true)} />
      <TokenShop visible={tokenShopVisible} onClose={() => setTokenShopVisible(false)} />
      
      <GiftAnimation data={lastGiftAnimation} onDone={clearGiftAnimation} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER — REFERANS GÖRSEL: Teal → Mor Gradyan, Glass-morphism
   ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1 },

  banner: { backgroundColor: 'rgba(245,158,11,0.9)', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  bannerText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  /* HEADER */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
  },
  hBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  hCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hTitlePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  hTitle: { fontSize: 15, fontWeight: '800', color: '#fff', maxWidth: 130 },
  hDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10 },
  hLiveDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e',
    shadowColor: '#22c55e', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    marginRight: 5,
  },
  hSub: { fontSize: 14, fontWeight: '800', color: '#fff' },

  /* ODA SEÇİCİ */
  roomPicker: {
    marginHorizontal: 40, backgroundColor: 'rgba(20,30,50,0.92)', borderRadius: 14,
    paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  rpItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  rpItemActive: { backgroundColor: 'rgba(34,197,94,0.1)' },
  rpDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.25)' },
  rpText: { flex: 1, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

  /* ═══ STAGE — Konuşmacı Alanı ═══ */
  stageSection: {
    marginHorizontal: 14, marginTop: 8, marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 18,
    paddingVertical: 12, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  stageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10, paddingHorizontal: 6,
  },
  stageTitle: {
    fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase' as const, letterSpacing: 1.5,
  },
  stageBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
  },
  stageBadgeText: { fontSize: 9, fontWeight: '800', color: '#22c55e' },
  stageGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 6,
  },
  stageItem: {
    alignItems: 'center',
    width: (width - 28 - 20 - 18) / 4, // 4 sütun
    marginBottom: 6,
  },
  stageSlotEmpty: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed' as const, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  stageEmptyLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3 },
  stageAvatarWrap: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', overflow: 'visible' as const,
  },
  stageAvatarSpeaking: {
    borderColor: '#22c55e',
    shadowColor: '#22c55e', shadowOpacity: 0.6, shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  stageAvatarImg: { width: 58, height: 58, borderRadius: 29 },
  stageMicBadge: {
    position: 'absolute' as const, bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.4)',
  },
  stageRoleBadge: {
    position: 'absolute' as const, top: -3, left: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.3)',
  },
  stageRoleBadgeText: { fontSize: 9 },
  stageName: {
    fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' as const,
    maxWidth: 72,
  },

  /* ═══ DİNLEYİCİLER — Küçük Avatar Grid ═══ */
  listenerSection: {
    marginHorizontal: 14, marginTop: 4,
  },
  listenerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10, paddingHorizontal: 6,
  },
  listenerTitle: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase' as const, letterSpacing: 1.2,
  },
  listenerCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6,
  },
  listenerCountText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  listenerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'flex-start', gap: 4,
    paddingHorizontal: 2,
  },
  listenerItem: {
    alignItems: 'center',
    width: (width - 28 - 16) / 5, // 5 sütun
    marginBottom: 8,
  },
  listenerAvatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden' as const,
  },
  listenerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  listenerMicReq: {
    position: 'absolute' as const, bottom: -1, right: -1,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.3)',
  },
  listenerName: {
    fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.6)',
    marginTop: 3, textAlign: 'center' as const, maxWidth: 56,
  },

  /* CHAT BAR — koyu teal opak, küçük */
  chatBar: {
    paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: '#1e4a50',
  },
  chatWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chatInput: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },

  /* KONTROL BAR — opak mor-gri zemin, küçük */
  ctrlBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 20, gap: 12,
    backgroundColor: '#6b5878',
  },
  ctrlBtn: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: '#2a4a55', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  ctrlBtnGift: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  ctrlMicOn: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  ctrlCamOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  ctrlHandOn: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
});
