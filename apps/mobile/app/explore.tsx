import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  StyleSheet,
  Image,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import type { Room } from '../types';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   KATEGORİLER (UI config — mock değil)
   ═══════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: 'all', label: 'Tümü', icon: 'grid' as const },
  { id: 'general', label: 'Genel', icon: 'chatbubbles' as const },
  { id: 'music', label: 'Müzik', icon: 'musical-notes' as const },
  { id: 'game', label: 'Oyun', icon: 'game-controller' as const },
  { id: 'chat', label: 'Sohbet', icon: 'cafe' as const },
  { id: 'meet', label: 'Tanışma', icon: 'heart' as const },
  { id: 'stream', label: 'Yayın', icon: 'radio' as const },
];

/* Gradient paleti — popüler oda kartları için döngüsel renk */
const GRADIENTS: [string, string][] = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#06b6d4', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#059669'],
];

/* ═══════════════════════════════════════════════════════════
   PARTİKÜLLER
   ═══════════════════════════════════════════════════════════ */

function FloatingParticles() {
  const pts = useRef(
    Array.from({ length: 6 }, () => ({
      x: Math.random() * width,
      y: new Animated.Value(Math.random() * 400),
      op: new Animated.Value(0),
      size: 2 + Math.random() * 3,
    }))
  ).current;

  useEffect(() => {
    pts.forEach(p => {
      const go = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(p.op, { toValue: 0.25 + Math.random() * 0.15, duration: 2500, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: Math.random() * 350, duration: 4500, useNativeDriver: true }),
          ]),
          Animated.timing(p.op, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]).start(go);
      };
      setTimeout(go, Math.random() * 2000);
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: p.size,
          backgroundColor: i % 2 === 0 ? '#5eead4' : '#a78bfa',
          left: p.x, opacity: p.op, transform: [{ translateY: p.y }],
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   CANLI PULSE DOT — animasyonlu
   ═══════════════════════════════════════════════════════════ */

function LiveDot({ size = 6, color = '#22c55e' }: { size?: number; color?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.8, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ width: size * 2.2, height: size * 2.2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: size * 2.2, height: size * 2.2, borderRadius: size * 1.1,
        backgroundColor: color, opacity: 0.3, transform: [{ scale: pulse }],
      }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   CANLI BADGE — animasyonlu (pulse eden kırmızı etiket)
   ═══════════════════════════════════════════════════════════ */

function LiveBadge({ style }: { style?: any }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const dotOp = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOp, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOp, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={[st.liveBadge, style, { transform: [{ scale: pulse }] }]}>
      <Animated.View style={[st.liveBadgeDot, { opacity: dotOp }]} />
      <Text style={st.liveBadgeText}>CANLI</Text>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   KATILIMCI SAYISI BADGE (Avatar stack yerine — gerçek veride avatar yok)
   ═══════════════════════════════════════════════════════════ */

function ParticipantBadge({ count, size = 30 }: { count: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(99,102,241,0.12)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name="people" size={size * 0.5} color="#6366f1" />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{count}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   AKTİF ODA SAYISI BANNER — dikkat çekici
   ═══════════════════════════════════════════════════════════ */

function ActiveRoomsBanner() {
  const { exploreRooms } = useStore();
  const glow = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={st.activeBanner}>
      <LinearGradient colors={['rgba(99,102,241,0.08)','rgba(99,102,241,0.15)']} style={st.activeBannerGradient}>
        <Animated.View style={{ opacity: glow }}>
          <LiveDot size={5} color="#6366f1" />
        </Animated.View>
        <Text style={st.activeBannerText}>
          <Text style={st.activeBannerCount}>{exploreRooms.length}</Text> aktif oda şu an yayında
        </Text>
        <Ionicons name="arrow-forward" size={14} color="#6366f1" />
      </LinearGradient>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ÖNE ÇIKAN ODA KARTI — büyük, gradient, katıl butonu
   ═══════════════════════════════════════════════════════════ */

function FeaturedCard({ room, index }: { room: Room; index: number }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, friction: 8, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}
    >
      <Animated.View style={[st.featCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={['#6366f1','#8b5cf6']} style={st.featGradient}>
          {/* CANLI badge animasyonlu */}
          <View style={st.featLiveBadgeWrap}>
            <LiveDot size={4} color="#fff" />
            <Text style={st.featLiveText}>CANLI</Text>
          </View>

          <View style={st.featBottom}>
            <Text style={st.featName} numberOfLines={1}>{room.name}</Text>
            <Text style={st.featDesc} numberOfLines={1}>{room.announcement || 'Sohbet odası'}</Text>
            <View style={st.featMeta}>
              <View style={st.featUserCount}>
                <Ionicons name="people" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={st.featUserText}>{room.participantCount || 0}</Text>
              </View>
            </View>
          </View>

          {/* Katıl butonu — kartın içinde */}
          <TouchableOpacity style={st.featJoinBtn} activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}>
            <Text style={st.featJoinText}>Katıl →</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════
   CANLI ODA KARTI — animasyonlu, glow buton
   ═══════════════════════════════════════════════════════════ */

function LiveRoomCard({ room, index }: { room: Room; index: number }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const btnGlow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(btnGlow, { toValue: 0.8, duration: 1500 + index * 200, useNativeDriver: true }),
      Animated.timing(btnGlow, { toValue: 0.3, duration: 1500 + index * 200, useNativeDriver: true }),
    ])).start();
  }, []);

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, friction: 8, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();

  const statusLabel = room.isLocked ? '🔒' : room.isVipRoom ? '💎' : '';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}
    >
      <Animated.View style={[st.roomCard, { transform: [{ scale: scaleAnim }] }]}>
        {/* Sol — katılımcı badge */}
        <ParticipantBadge count={room.participantCount || 0} size={34} />

        {/* Orta — bilgi */}
        <View style={st.roomInfo}>
          <View style={st.roomNameRow}>
            <Text style={st.roomName} numberOfLines={1}>{statusLabel}{statusLabel ? ' ' : ''}{room.name}</Text>
          </View>
          <Text style={st.roomDesc} numberOfLines={1}>{room.announcement || 'Sohbet odası'}</Text>
          <View style={st.roomMeta}>
            <LiveDot size={3.5} color="#22c55e" />
            <Text style={st.roomMetaText}>{room.participantCount || 0} kişi dinliyor</Text>
          </View>
        </View>

        {/* Sağ — Katıl butonu (glow efektli) */}
        <TouchableOpacity style={st.joinBtnWrap} activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}>
          <Animated.View style={[st.joinGlow, { opacity: btnGlow }]} />
          <LinearGradient colors={['#4ecdc4','#44b8b0']} style={st.joinGradient}>
            <Ionicons name="enter-outline" size={13} color="#fff" />
            <Text style={st.joinText}>Katıl</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* CANLI badge — animasyonlu */}
        <LiveBadge style={st.roomLiveBadgePos} />
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALT NAVİGASYON
   ═══════════════════════════════════════════════════════════ */

function BottomNavigation() {
  const router = useRouter();
  const items = [
    { id: 'home', icon: 'home-outline' as const, label: 'Anasayfa', route: '/home' },
    { id: 'explore', icon: 'compass' as const, label: 'Keşfet', route: '/explore' },
    { id: 'create', icon: 'add', label: 'Topluluk Aç', isCenter: true, route: '/create-room' },
    { id: 'notifications', icon: 'notifications-outline' as const, label: 'Bildirimler', route: '/notifications' },
    { id: 'profile', icon: 'person-outline' as const, label: 'Profil', route: null },
  ];

  return (
    <View style={st.bottomNav}>
      {items.map(item => {
        if (item.isCenter) {
          return (
            <TouchableOpacity key={item.id} style={st.bottomNavCenter} activeOpacity={0.85}
              onPress={() => item.route && router.push(item.route as any)}>
              <LinearGradient colors={['#4ecdc4','#44b8b0']} style={st.bottomNavCenterGrad}>
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
              <Text style={st.bottomNavCenterLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        }
        const isActive = item.id === 'explore';
        return (
          <TouchableOpacity key={item.id}
            onPress={() => {
              if (item.route) router.push(item.route as any);
              else if (item.id === 'profile') Alert.alert('Profil', 'Profil sayfası yakında eklenecek.', [{ text: 'Tamam' }]);
            }}
            style={st.bottomNavItem}>
            <Ionicons name={isActive ? 'compass' : (item.icon as any)} size={26}
              color={isActive ? '#4f46e5' : '#94a3b8'} />
            <Text style={[st.bottomNavLabel, isActive && st.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA EXPLORE EKRANI
   ═══════════════════════════════════════════════════════════ */

export default function ExploreScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ── Store bağlantısı ──
  const { exploreRooms, exploreLoading, exploreError, fetchExploreData } = useStore();

  useEffect(() => {
    fetchExploreData();
  }, []);

  // Gerçek veriden çalış — mock fallback yok
  const rooms = exploreRooms;

  // Arama filtresi
  const searchFiltered = searchText.trim()
    ? rooms.filter((r: Room) => r.name.toLowerCase().includes(searchText.toLowerCase()))
    : rooms;

  // Kategori filtresi (kategori verisi backend'de yoksa tümünü göster)
  const filteredRooms = searchFiltered;

  // Popüler odalar — en çok katılımcılı ilk 3
  const featuredRooms = [...rooms]
    .sort((a, b) => (b.participantCount || 0) - (a.participantCount || 0))
    .slice(0, 3);

  return (
    <View style={st.container}>
      <LinearGradient colors={['#eee8f5','#d0cce0','#b8b3d1']} style={StyleSheet.absoluteFill as any} />
      <View style={st.orbTopRight} />
      <View style={st.orbBottomLeft} />
      <FloatingParticles />

      {/* ── ÜST BAR ── */}
      <View style={st.topBar}>
        <TouchableOpacity style={st.topBarBtn} onPress={() => setSearchText('')}>
          <Ionicons name="search" size={20} color="#475569" />
        </TouchableOpacity>
        <View style={st.topBarCenter}>
          <Text style={st.topBarTitle}>Keşfet</Text>
        </View>
        <TouchableOpacity style={st.topBarBtn} onPress={() => Alert.alert('Filtreler', 'Gelişmiş filtreler yakında eklenecek.', [{ text: 'Tamam' }])}>
          <Ionicons name="options-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LOADING STATE ── */}
        {exploreLoading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' }}>Odalar yükleniyor...</Text>
          </View>
        )}

        {/* ── ERROR STATE ── */}
        {exploreError && !exploreLoading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#ef4444', fontWeight: '600' }}>{exploreError}</Text>
            <TouchableOpacity
              onPress={() => fetchExploreData()}
              style={{ marginTop: 16, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* ── AKTİF ODA BANNER — belirgin ── */}
        <ActiveRoomsBanner />

        {/* ── ARAMA ── */}
        <View style={st.searchWrap}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={st.searchInput}
            placeholder="Oda ara..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── KATEGORİLER ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catScroll}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity key={cat.id} onPress={() => setActiveCategory(cat.id)} activeOpacity={0.8}>
                {isActive ? (
                  <LinearGradient colors={['#6366f1','#8b5cf6']} style={st.catChip}>
                    <Ionicons name={cat.icon as any} size={14} color="#fff" />
                    <Text style={[st.catText, { color: '#fff' }]}>{cat.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[st.catChip, st.catChipInactive]}>
                    <Ionicons name={cat.icon as any} size={14} color="#64748b" />
                    <Text style={st.catText}>{cat.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── ÖNE ÇIKAN ODALAR ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionEmoji}>🔥</Text>
          <Text style={st.sectionTitle}>Popüler Odalar</Text>
          <View style={{ flex: 1 }} />
          <Text style={st.sectionSeeAll}>Tümü</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.featScroll}>
          {featuredRooms.map((room, i) => (
            <FeaturedCard key={room.id} room={room} index={i} />
          ))}
        </ScrollView>

        {/* ── CANLI ODALAR ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionEmoji}>🎙️</Text>
          <Text style={st.sectionTitle}>Canlı Odalar</Text>
          <View style={{ flex: 1 }} />
          <View style={st.sectionCountBadge}>
            <LiveDot size={3} color="#22c55e" />
            <Text style={st.sectionCountText}>{filteredRooms.length} oda</Text>
          </View>
        </View>

        {/* ── EMPTY STATE ── */}
        {!exploreLoading && !exploreError && filteredRooms.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="radio-outline" size={48} color="#94a3b8" />
            <Text style={{ marginTop: 12, fontSize: 15, color: '#64748b', fontWeight: '700' }}>Henüz aktif oda yok</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Bu kategoride şu an yayında oda bulunmuyor</Text>
          </View>
        )}

        {filteredRooms.map((room: any, i: number) => (
          <LiveRoomCard key={room.id} room={room} index={i} />
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER
   ═══════════════════════════════════════════════════════════ */

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d0cce0' },

  orbTopRight: {
    position: 'absolute', top: -50, right: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(94,234,212,0.15)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 80, left: -90,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },

  /* ── ÜST BAR ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  topBarBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(99,102,241,0.08)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

  scrollContent: { paddingBottom: 20 },

  /* ── AKTİF ODA BANNER ── */
  activeBanner: { marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
  activeBannerGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
  },
  activeBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },
  activeBannerCount: { fontWeight: '800', color: '#4f46e5', fontSize: 15 },

  /* ── ARAMA — Premium Glass ── */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1e293b' },

  /* ── KATEGORİLER ── */
  catScroll: { paddingHorizontal: 16, gap: 8, marginBottom: 18 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  catChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 0.5, borderColor: 'rgba(226,232,240,0.5)',
  },
  catText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  /* ── SECTION HEADER ── */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  sectionSeeAll: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  sectionCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(34,197,94,0.08)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.2)',
  },
  sectionCountText: { fontSize: 11, fontWeight: '700', color: '#22c55e' },

  /* ── ÖNE ÇIKAN ── */
  featScroll: { paddingHorizontal: 16, gap: 12, marginBottom: 22 },
  featCard: {
    width: width * 0.62, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  featGradient: { height: 175, padding: 16, justifyContent: 'flex-end' },
  featLiveBadgeWrap: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
  },
  featLiveText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  featBottom: {},
  featName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  featDesc: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  featMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featUserCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featUserText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  featJoinBtn: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  featJoinText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* ── CANLI ODA KARTI — Premium Glass ── */
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: 20, padding: 15, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
    overflow: 'hidden',
  },
  roomInfo: { flex: 1 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  roomName: { fontSize: 14, fontWeight: '700', color: '#1e293b', flexShrink: 1 },
  roomCatBadge: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  roomCatText: { fontSize: 9, fontWeight: '700', color: '#6366f1' },
  roomDesc: { fontSize: 11, fontWeight: '500', color: '#94a3b8', marginBottom: 4 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomMetaText: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  /* Katıl butonu — glow efektli */
  joinBtnWrap: { position: 'relative' },
  joinGlow: {
    position: 'absolute', top: 2, left: 2, right: 2, bottom: -2,
    borderRadius: 11, backgroundColor: '#8b5cf6',
  },
  joinGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  joinText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* CANLI badge — animasyonlu */
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(239,68,68,0.12)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.25)',
    borderTopWidth: 0,
  },
  liveBadgeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' },
  liveBadgeText: { fontSize: 8, fontWeight: '800', color: '#ef4444', letterSpacing: 0.5 },
  roomLiveBadgePos: { position: 'absolute', top: 0, left: 14 },

  /* ── ALT NAV — Premium Glass ── */
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.88)', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 15,
  },
  bottomNavItem: { alignItems: 'center', gap: 2, paddingVertical: 4, minWidth: 56 },
  bottomNavLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  bottomNavLabelActive: { color: '#4f46e5' },
  bottomNavCenter: { alignItems: 'center', marginTop: -22 },
  bottomNavCenterGrad: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  bottomNavCenterLabel: { fontSize: 9, fontWeight: '800', color: '#4f46e5', marginTop: 4 },
});
