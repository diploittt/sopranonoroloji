import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform, Dimensions,
  StyleSheet, Image, RefreshControl, FlatList, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import api from '../services/api';
import AppBackground from '../components/shared/AppBackground';
import BottomNav from '../components/shared/BottomNav';

const { width } = Dimensions.get('window');

const GRADS: [string, string][] = [
  ['#8b5cf6', '#6366f1'],
  ['#06b6d4', '#0ea5e9'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#059669'],
];

const CATEGORIES = [
  { id: 'all', label: 'Hepsi', icon: 'apps' },
  { id: 'music', label: 'Müzik', icon: 'musical-notes' },
  { id: 'talk', label: 'Sohbet', icon: 'chatbubbles' },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { id: 'education', label: 'Eğitim', icon: 'school' },
  { id: 'tech', label: 'Teknoloji', icon: 'hardware-chip' },
];

/* ═══════════════════════════════════════════════════════════
   KEŞFET EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [directLoading, setDirectLoading] = useState<string | null>(null);

  const {
    exploreTenants: rawTenants, exploreLoading, fetchExploreData,
    publicRooms, fetchPublicRooms, loginWithSocket, user,
  } = useStore();
  const exploreTenants = Array.isArray(rawTenants) ? rawTenants : [];

  const allRooms = [
    ...publicRooms,
    ...exploreTenants.flatMap((t: any) => (Array.isArray(t.rooms) ? t.rooms.map((r: any) => ({ ...r, tenantName: t.name, tenantId: t.id, tenantLogo: t.logoUrl })) : [])),
  ].filter((r: any) => r && r.name);

  const filtered = allRooms.filter((r: any) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name?.toLowerCase().includes(q) || r.tenantName?.toLowerCase().includes(q);
    }
    return true;
  });

  useEffect(() => { fetchExploreData(); fetchPublicRooms(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchExploreData(), fetchPublicRooms()]);
    setRefreshing(false);
  }, []);

  const enterRoom = async (room: any) => {
    const roomId = room.slug || room.id;
    if (room.tenantId) {
      if (user && user.tenantId === room.tenantId) {
        router.push({ pathname: '/room', params: { roomId } } as any);
        return;
      }
      setDirectLoading(roomId);
      try {
        const guestName = `Misafir_${Math.floor(Math.random() * 9000 + 1000)}`;
        const { data } = await api.post('/auth/guest', { username: guestName, gender: 'male', tenantId: room.tenantId });
        loginWithSocket(data.access_token, data.user, room.tenantId);
        router.push({ pathname: '/room', params: { roomId } } as any);
      } catch (err: any) {
        Alert.alert('Hata', err?.response?.data?.message || 'Giriş başarısız.');
      } finally { setDirectLoading(null); }
    } else {
      router.push({ pathname: '/room', params: { roomId } } as any);
    }
  };

  // Popüler: en çok katılımcı olanlar
  const popular = [...allRooms]
    .filter((r: any) => (r.participantCount || r.onlineUsers || 0) > 0)
    .sort((a: any, b: any) => (b.participantCount || b.onlineUsers || 0) - (a.participantCount || a.onlineUsers || 0))
    .slice(0, 6);

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Keşfet</Text>
        <View style={{ width: 42 }} />
      </View>

      {/* ARAMA */}
      <View style={st.searchWrap}>
        <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
        <TextInput
          style={st.searchInput}
          placeholder="Oda veya topluluk ara..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}>

        {/* KATEGORİ PİLL'LERİ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} activeOpacity={0.8}
              onPress={() => setCategory(cat.id)}
              style={[st.catPill, category === cat.id && st.catPillActive]}>
              <Ionicons name={cat.icon as any} size={13}
                color={category === cat.id ? '#fff' : 'rgba(255,255,255,0.4)'} />
              <Text style={[st.catText, category === cat.id && st.catTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {exploreLoading && !refreshing && (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#a78bfa" />
          </View>
        )}

        {/* 🔥 POPÜLER ODALAR */}
        {popular.length > 0 && !search.trim() && (
          <>
            <View style={st.secRow}>
              <Ionicons name="flame" size={16} color="#f59e0b" />
              <Text style={st.secTitle}>Popüler</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {popular.map((room: any, i: number) => {
                const grad = GRADS[i % GRADS.length];
                return (
                  <TouchableOpacity key={room.id || i} activeOpacity={0.88}
                    onPress={() => enterRoom(room)}>
                    <LinearGradient colors={grad} style={st.popCard}>
                      <View style={st.popBadge}>
                        <View style={st.popDot} />
                        <Text style={st.popBadgeText}>CANLI</Text>
                      </View>
                      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <Text style={st.popName} numberOfLines={1}>{room.name}</Text>
                        {room.tenantName && (
                          <Text style={st.popTenant} numberOfLines={1}>{room.tenantName}</Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="people" size={12} color="rgba(255,255,255,0.85)" />
                          <Text style={st.popMeta}>{room.participantCount || room.onlineUsers || 0} kişi</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* 📋 TÜM ODALAR */}
        <View style={[st.secRow, { marginTop: 18 }]}>
          <Ionicons name="list" size={16} color="#a78bfa" />
          <Text style={st.secTitle}>{search.trim() ? 'Sonuçlar' : 'Tüm Odalar'}</Text>
          <Text style={st.secCount}>{filtered.length}</Text>
        </View>

        {filtered.length === 0 && !exploreLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="search-outline" size={40} color="rgba(139,92,246,0.2)" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
              {search.trim() ? 'Sonuç bulunamadı' : 'Henüz oda yok'}
            </Text>
          </View>
        )}

        {filtered.map((room: any, i: number) => {
          const grad = GRADS[i % GRADS.length];
          const online = room.participantCount || room.onlineUsers || 0;
          const isLoading = directLoading === (room.slug || room.id);
          return (
            <TouchableOpacity key={room.id || i} activeOpacity={0.88}
              onPress={() => enterRoom(room)} style={st.roomCard}>
              <LinearGradient colors={grad} style={st.roomAvatar}>
                <Ionicons name="chatbubble" size={14} color="#fff" />
              </LinearGradient>
              <View style={st.roomInfo}>
                <Text style={st.roomName} numberOfLines={1}>{room.name}</Text>
                <View style={st.roomMeta}>
                  {room.tenantName && (
                    <>
                      <Ionicons name="storefront" size={10} color="rgba(255,255,255,0.3)" />
                      <Text style={st.roomTenant}>{room.tenantName}</Text>
                      <View style={st.roomDotSep} />
                    </>
                  )}
                  <View style={[st.roomOnlineDot, { backgroundColor: online > 0 ? '#22c55e' : 'rgba(255,255,255,0.15)' }]} />
                  <Text style={st.roomOnlineText}>{online > 0 ? `${online} kişi` : 'Boş'}</Text>
                </View>
              </View>
              {isLoading ? (
                <ActivityIndicator size="small" color="#a78bfa" />
              ) : (
                <View style={st.roomArrow}>
                  <Ionicons name="enter-outline" size={14} color="#a78bfa" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* TOPLULUKLAR */}
        {exploreTenants.length > 0 && !search.trim() && (
          <>
            <View style={[st.secRow, { marginTop: 18 }]}>
              <Ionicons name="globe" size={16} color="#10b981" />
              <Text style={st.secTitle}>Topluluklar</Text>
            </View>
            {exploreTenants.map((t: any, i: number) => {
              const rooms = Array.isArray(t.rooms) ? t.rooms : [];
              const totalOnline = rooms.reduce((s: number, r: any) => s + (r.onlineUsers || 0), 0);
              const grad = GRADS[i % GRADS.length];
              return (
                <TouchableOpacity key={t.id} activeOpacity={0.88}
                  onPress={() => router.push({
                    pathname: '/tenant-login',
                    params: {
                      tenantId: t.slug || t.id,
                      tenantSlug: t.slug || t.id,
                      tenantName: t.name,
                      tenantLogo: t.logoUrl || '',
                      tenantRooms: JSON.stringify(rooms),
                      firstRoom: rooms[0]?.slug || rooms[0]?.id || '',
                    }
                  } as any)}
                  style={st.comCard}>
                  {t.logoUrl ? (
                    <Image source={{ uri: t.logoUrl }} style={st.comLogo} />
                  ) : (
                    <LinearGradient colors={grad} style={st.comIcon}>
                      <Ionicons name="storefront" size={18} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={st.comName} numberOfLines={1}>{t.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Ionicons name="chatbubbles" size={10} color="#a78bfa" />
                      <Text style={st.comMeta}>{rooms.length} oda</Text>
                      <View style={st.roomDotSep} />
                      <View style={[st.roomOnlineDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={[st.comMeta, { color: '#22c55e' }]}>{totalOnline} çevrimiçi</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <BottomNav active="explore" />
    </AppBackground>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 4, gap: 10,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#f1f5f9' },

  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  catPillActive: {
    backgroundColor: '#8b5cf6', borderColor: '#8b5cf6',
  },
  catText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  catTextActive: { color: '#fff', fontWeight: '700' },

  secRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', flex: 1 },
  secCount: { fontSize: 12, fontWeight: '700', color: '#a78bfa', backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  popCard: { width: (width - 52) / 2, height: 150, borderRadius: 18, padding: 14, overflow: 'hidden' },
  popBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  popDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  popBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  popName: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  popTenant: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  popMeta: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  roomAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  roomTenant: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  roomDotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  roomOnlineDot: { width: 5, height: 5, borderRadius: 2.5 },
  roomOnlineText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  roomArrow: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },

  comCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  comLogo: { width: 46, height: 46, borderRadius: 14 },
  comIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  comName: { fontSize: 14, fontWeight: '800', color: '#f1f5f9' },
  comMeta: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
});
