import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform, Dimensions,
  StyleSheet, Image, Animated, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLevel } from '../utils/roleHelpers';
import useStore from '../store';
import { useAppState } from '../hooks/useAppState';
import UserProfileModal from '../components/room/UserProfileModal';
import GiftPanel from '../components/room/GiftPanel';
import TokenShop from '../components/room/TokenShop';
import GiftAnimation from '../components/room/GiftAnimation';
import ActiveSpeaker from '../components/room/ActiveSpeaker';
import StageGrid from '../components/room/StageGrid';
import LiveChat from '../components/room/LiveChat';
import ControlPanel from '../components/room/ControlPanel';
import ChatPanel from '../components/room/ChatPanel';
import LiveReactions from '../components/room/LiveReactions';
import RoomInfoPanel from '../components/room/RoomInfoPanel';
import ConnectionQuality from '../components/room/ConnectionQuality';
import MicQueuePanel from '../components/room/MicQueuePanel';
import EmojiPicker from '../components/room/EmojiPicker';
import MiniRadioPlayer from '../components/room/MiniRadioPlayer';
import useLiveKit from '../hooks/useLiveKit';
import { Share } from 'react-native';
import type { Participant } from '../services/realtimeService';

const { width, height: H } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://sopranochat.com/avatars/neutral_1.png';

/* ═══════════════════════════════════════════════════════════
   PARILTILI ARKA PLAN YILDIZLARI
   ═══════════════════════════════════════════════════════════ */
function Sparkles() {
  const sparkles = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      opacity: new Animated.Value(Math.random() * 0.4),
      delay: Math.random() * 4000,
    }))
  ).current;

  useEffect(() => {
    sparkles.forEach(s => {
      Animated.loop(Animated.sequence([
        Animated.delay(s.delay),
        Animated.timing(s.opacity, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(s.opacity, { toValue: 0.03, duration: 2000, useNativeDriver: true }),
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
   ANA EKRAN — Modern Oda Tasarımı
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
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showListeners, setShowListeners] = useState(false);
  const [roomInfoVisible, setRoomInfoVisible] = useState(false);
  const [micQueueVisible, setMicQueueVisible] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [joinedAt] = useState(() => Date.now()); // Mesaj session timestamp

  // ═══ STORE ═══
  const {
    socketConnected, participants: storeParticipants, activeSpeaker,
    micQueue, roomError, connectionError, messages, joinRoom, leaveRoom,
    takeMic, releaseMic, requestMic, sendChatMessage, currentRoom, user,
    lastGiftAnimation, clearGiftAnimation, roomSettings, sendReaction,
    lastReaction,
    leaveQueue,
  } = useStore();

  // ═══ LIVEKIT ═══
  const roomSlug = currentRoom?.slug || params.roomId;
  const {
    connectionState: lkState, isPublishing: lkPublishing,
    error: lkError, publishAudio, unpublishAudio, setMicEnabled,
  } = useLiveKit({ roomSlug, enabled: socketConnected });

  // ═══ ACTIVE SPEAKER DATA ═══
  const speakerParticipant = storeParticipants.find(
    p => p.userId === activeSpeaker?.userId || (p as any).isSpeaking
  );

  // ═══ STAGE DATA (oda sahnesindekiler — aktif speaker hariç) ═══
  // Sahne: mic queue'da olanlar veya işaretli konusmacılar (özel onStage/isSpeaking)
  const STAGE = storeParticipants
    .filter(p => {
      if (p.userId === activeSpeaker?.userId) return false;
      const onStage = (p as any).onStage || (p as any).isSpeaking;
      const inQueue = micQueue.includes(p.userId);
      return onStage || inQueue;
    })
    .sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role))
    .map(p => ({
      id: p.userId, name: p.displayName || 'Kullanıcı',
      avatar: p.avatar || DEFAULT_AVATAR,
      speaking: (p as any).isSpeaking || false, muted: p.isMuted || false,
      role: p.role || 'listener', camOn: (p as any).camOn || false,
    }));

  const LISTENERS = storeParticipants.filter(p => {
    if (p.userId === activeSpeaker?.userId) return false;
    if ((p as any).onStage || (p as any).isSpeaking) return false;
    if (micQueue.includes(p.userId)) return false;
    return true;
  });

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

  // ═══ ANİMASYON — LIVE DOT ═══
  const liveDotAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(liveDotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(liveDotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  // ═══ HANDLERS ═══
  const handleExit = () => { leaveRoom(); router.back(); };
  const handleMicToggle = async () => {
    const next = !micOn;
    setMicOn(next);
    if (next) {
      console.log('[Room] Mic ON — takeMic + publishAudio');
      takeMic();
      const ok = await publishAudio();
      if (!ok) console.warn('[Room] publishAudio failed — LiveKit bağlantısı yok');
    } else {
      console.log('[Room] Mic OFF — releaseMic + unpublishAudio');
      releaseMic();
      await unpublishAudio();
    }
  };
  const handleCamToggle = () => {
    const next = !camOn;
    setCamOn(next);
    console.log('[Room] Kamera toggle:', next);
    // Kamera henüz LiveKit video entegrasyonu yok — sadece state değişir
  };
  const handleHandToggle = () => {
    const inQueue = micQueue.includes(user?.id || '');
    if (inQueue) {
      console.log('[Room] El kaldırma geri çekiliyor');
      leaveQueue();
    } else {
      console.log('[Room] Sıraya giriliyor');
      requestMic();
    }
  };
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const msgText = chatMessage.trim();
    // Optimistic UI — kendi mesajımızı hemen ekle
    const optimisticMsg: any = {
      id: `local_${Date.now()}`,
      sender: user?.id || 'me',
      senderName: user?.displayName || 'Ben',
      senderAvatar: user?.avatar,
      content: msgText,
      createdAt: new Date().toISOString(),
    };
    useStore.getState().messages.push(optimisticMsg);
    // Store update tetikle
    useStore.setState({ messages: [...useStore.getState().messages] });
    sendChatMessage(msgText);
    setChatMessage('');
  };
  const openProfile = (p: Participant) => {
    setSelectedParticipant(p);
    setProfileVisible(true);
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: `${currentRoom?.name || 'Oda'} odasına katıl! 🎙️\nhttps://sopranochat.com/room/${roomSlug}`,
        title: currentRoom?.name || 'SopranoChat Oda',
      });
    } catch (e) { /* kullanıcı iptal etti */ }
  };

  // Chat mesajlarını LiveChat formatına dönüştür
  const chatMessages = (messages || [])
    .map((m: any) => ({
      id: m.id || `${m.sender || m.userId}-${Date.parse(m.createdAt) || m.timestamp || Date.now()}`,
      userId: m.sender || m.userId,
      displayName: m.senderName || m.displayName || m.username || 'Kullanıcı',
      avatar: m.senderAvatar || m.avatar,
      role: m.role,
      text: m.content || m.text || m.message || '',
      timestamp: Date.parse(m.createdAt) || m.timestamp || Date.now(),
    }));

  return (
    <View style={st.container}>
      {/* ═══ ARKA PLAN GRADYAN — Koyu lacivert → koyu mor ═══ */}
      <LinearGradient
        colors={['#0a0e27', '#0d1133', '#120e3a', '#1a0a2e', '#1f0a35']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill as any}
      />
      <Sparkles />

      {/* Bannerlar */}
      {connectionError && <View style={st.banner}><Text style={st.bannerText}>⚠️ Bağlantı kurulamadı</Text></View>}
      {roomError && <View style={[st.banner, { backgroundColor: 'rgba(220,38,38,0.9)' }]}><Text style={st.bannerText}>{roomError.message}</Text></View>}
      {lkError && <View style={[st.banner, { backgroundColor: 'rgba(147,51,234,0.85)' }]}><Text style={st.bannerText}>🎙️ {lkError}</Text></View>}

      {/* ── HEADER ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={handleExit} style={st.hBtn}>
          <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={st.hCenter}>
          <TouchableOpacity style={st.hTitlePill} activeOpacity={tenantRooms.length > 1 ? 0.7 : 1}
            onPress={tenantRooms.length > 1 ? () => setShowRoomPicker(!showRoomPicker) : undefined}>
            <Animated.View style={[st.hLiveDot, { opacity: liveDotAnim }]} />
            <Text style={st.hTitle} numberOfLines={1}>{currentRoom?.name || roomSettings?.name || 'Oda'}</Text>
            {tenantRooms.length > 1 && <Ionicons name={showRoomPicker ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 2 }} />}
            <View style={st.hDivider} />
            <Ionicons name="people" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={st.hCount}>{storeParticipants.length}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <ConnectionQuality quality={lkState === 'connected' ? 'good' : lkState === 'connecting' ? 'fair' : socketConnected ? 'good' : 'poor'} compact />
          <TouchableOpacity style={st.hBtnSmall} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={st.hBtnSmall} onPress={() => setRoomInfoVisible(true)}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          {(user?.role === 'owner' || user?.role === 'godmaster' || user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'super_admin') && (
            <TouchableOpacity style={st.hBtnSmall} onPress={() => router.push('/(tenant-admin)')}>
              <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Oda seçici */}
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
                <View style={[st.rpDot, isActive && { backgroundColor: '#00ff88' }]} />
                <Text style={[st.rpText, isActive && { color: '#fff', fontWeight: '700' }]} numberOfLines={1}>{r.name}</Text>
                {isActive && <Ionicons name="checkmark" size={14} color="#00ff88" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── ANA İÇERİK ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>

        {/* ═══ AKTİF KONUŞMACI SPOTLIGHT ═══ */}
        <ActiveSpeaker
          userId={activeSpeaker?.userId || speakerParticipant?.userId}
          displayName={activeSpeaker?.displayName || speakerParticipant?.displayName}
          avatar={speakerParticipant?.avatar || DEFAULT_AVATAR}
          role={activeSpeaker?.role || speakerParticipant?.role}
          speaking={!!(speakerParticipant as any)?.isSpeaking}
          muted={speakerParticipant?.isMuted}
          duration={activeSpeaker?.duration}
          startedAt={activeSpeaker?.startedAt}
        />

        {/* ═══ SAHNE GRID — Diğer konuşmacılar ═══ */}
        <StageGrid
          speakers={STAGE}
          maxSlots={8}
          onPress={(userId) => {
            const pp = storeParticipants.find(x => x.userId === userId);
            if (pp) openProfile(pp);
          }}
        />

        {/* ═══ MIC QUEUE BADGE ═══ */}
        {micQueue.length > 0 && (
          <TouchableOpacity style={st.micQueueBadge} onPress={() => setMicQueueVisible(true)} activeOpacity={0.8}>
            <Ionicons name="list-outline" size={14} color="#ffb800" />
            <Text style={st.micQueueText}>Sıra: {micQueue.length} kişi</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}

        {/* ═══ DİNLEYİCİLER — Collapsible ═══ */}
        {LISTENERS.length > 0 && (
          <View style={st.listenerSection}>
            <TouchableOpacity style={st.listenerHeader} onPress={() => setShowListeners(!showListeners)} activeOpacity={0.7}>
              <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={st.listenerTitle}>DİNLEYİCİLER</Text>
              <View style={st.listenerCountBadge}>
                <Text style={st.listenerCountText}>{LISTENERS.length}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Ionicons name={showListeners ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            {showListeners && (
              <View style={st.listenerGrid}>
                {LISTENERS.map((p) => {
                  const isRequesting = micQueue.includes(p.userId);
                  const hasAvatar = p.avatar && p.avatar.startsWith('http');
                  const initial = (p.displayName || 'K').charAt(0).toUpperCase();
                  const bgColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
                  const bgColor = bgColors[initial.charCodeAt(0) % bgColors.length];
                  return (
                    <TouchableOpacity key={p.userId} activeOpacity={0.8}
                      onPress={() => openProfile(p)} style={st.listenerItem}>
                      <View style={st.listenerAvatarWrap}>
                        {hasAvatar ? (
                          <Image source={{ uri: p.avatar }} style={st.listenerAvatarImg} />
                        ) : (
                          <View style={[st.listenerAvatarImg, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{initial}</Text>
                          </View>
                        )}
                        {isRequesting && (
                          <View style={st.listenerMicReq}>
                            <Ionicons name="hand-left" size={7} color="#fff" />
                          </View>
                        )}
                      </View>
                      <Text style={st.listenerName} numberOfLines={1}>{p.displayName || 'Kullanıcı'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── KLAVYEYİ KAÇIRMA: Alt bar + input ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* ═══ CANLI MESAJ OVERLAY — ScrollView DIŞINDA (sabit konum) ═══ */}
        <LiveChat
          messages={chatMessages}
          maxVisible={4}
          onOpenFullChat={() => setChatPanelVisible(true)}
        />

        {/* ── CANLI EMOJI REACTİONLAR ── */}
        <LiveReactions onReaction={(emoji) => sendReaction(emoji)} incomingReaction={lastReaction} />

        {/* ── KOMPAKT KONTROL PANELİ (chat input dahil) ── */}
        <ControlPanel
          micOn={micOn}
          camOn={camOn}
          handRaised={micQueue.includes(user?.id || '')}
          onMicToggle={handleMicToggle}
          onCamToggle={handleCamToggle}
          onHandToggle={handleHandToggle}
          onChatOpen={() => setChatPanelVisible(true)}
          onGiftOpen={() => setGiftPanelVisible(true)}
          onExit={handleExit}
          chatMessage={chatMessage}
          onChatChange={setChatMessage}
          onChatSend={handleSendMessage}
          onEmojiPress={() => setEmojiPickerVisible(true)}
        />
      </KeyboardAvoidingView>

      {/* ══ FLOATING RADIO ══ */}
      <MiniRadioPlayer />

      {/* ══════ MODALS ══════ */}
      <EmojiPicker
        visible={emojiPickerVisible}
        onSelect={(emoji) => setChatMessage(prev => prev + emoji)}
        onClose={() => setEmojiPickerVisible(false)}
      />
      <UserProfileModal visible={profileVisible} onClose={() => { setProfileVisible(false); setSelectedParticipant(null); }} participant={selectedParticipant} />
      <GiftPanel visible={giftPanelVisible} onClose={() => setGiftPanelVisible(false)} onOpenShop={() => setTokenShopVisible(true)} />
      <TokenShop visible={tokenShopVisible} onClose={() => setTokenShopVisible(false)} />
      {chatPanelVisible && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(10,14,39,0.97)', paddingTop: Platform.OS === 'ios' ? 54 : 36 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 }}>
              <TouchableOpacity onPress={() => setChatPanelVisible(false)} style={st.hBtn}>
                <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' }}>Sohbet</Text>
              <View style={{ width: 38 }} />
            </View>
            <ChatPanel />
          </View>
        </View>
      )}
      <RoomInfoPanel
        visible={roomInfoVisible}
        onClose={() => setRoomInfoVisible(false)}
        roomName={currentRoom?.name || roomSettings?.name}
        roomDescription={(roomSettings as any)?.description}
        participantCount={storeParticipants.length}
        rules={(roomSettings as any)?.rules}
      />
      {micQueueVisible && (
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(10,14,39,0.97)', paddingTop: Platform.OS === 'ios' ? 54 : 36 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 }}>
              <TouchableOpacity onPress={() => setMicQueueVisible(false)} style={st.hBtn}>
                <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' }}>Mikrofon Sırası</Text>
              <View style={{ width: 38 }} />
            </View>
            <MicQueuePanel />
          </View>
        </View>
      )}
      <GiftAnimation data={lastGiftAnimation} onDone={clearGiftAnimation} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER — Koyu Lacivert/Mor Gradyan, Glassmorphism
   ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1 },

  banner: { backgroundColor: 'rgba(245,158,11,0.9)', paddingVertical: 5, paddingHorizontal: 16, alignItems: 'center' },
  bannerText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  /* HEADER */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 14, paddingBottom: 6, gap: 8,
  },
  hBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hCenter: { flex: 1, alignItems: 'center' },
  hTitlePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  hTitle: { fontSize: 14, fontWeight: '800', color: '#fff', maxWidth: 120 },
  hDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 4 },
  hLiveDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#00ff88',
    shadowColor: '#00ff88', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  hCount: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },

  /* Oda seçici */
  roomPicker: {
    marginHorizontal: 40, backgroundColor: 'rgba(10,14,39,0.95)', borderRadius: 14,
    paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rpItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  rpItemActive: { backgroundColor: 'rgba(0,255,136,0.06)' },
  rpDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  rpText: { flex: 1, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },

  /* DİNLEYİCİLER — Collapsible */
  listenerSection: {
    marginHorizontal: 14, marginTop: 8,
  },
  listenerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  listenerTitle: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const, letterSpacing: 1.2,
  },
  listenerCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 1.5,
    borderRadius: 6,
  },
  listenerCountText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  listenerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'flex-start', gap: 4,
    paddingHorizontal: 2, paddingTop: 8,
  },
  listenerItem: {
    alignItems: 'center',
    width: (width - 28 - 20) / 6,
    marginBottom: 8,
  },
  listenerAvatarWrap: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden' as const,
  },
  listenerAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  listenerMicReq: {
    position: 'absolute' as const, bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#ffb800', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0a0e27',
  },
  listenerName: {
    fontSize: 8, fontWeight: '500', color: 'rgba(255,255,255,0.45)',
    marginTop: 3, textAlign: 'center' as const, maxWidth: 50,
  },

  /* Header small buttons */
  hBtnSmall: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  /* Mic Queue Badge */
  micQueueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)',
  },
  micQueueText: {
    flex: 1, fontSize: 12, fontWeight: '600', color: '#ffb800',
  },
});
