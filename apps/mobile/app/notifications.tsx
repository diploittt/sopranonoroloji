import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform, Dimensions,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import AppBackground from '../components/shared/AppBackground';
import BottomNav from '../components/shared/BottomNav';

const { width } = Dimensions.get('window');

type NType = 'gift' | 'mention' | 'follow' | 'system' | 'dm' | 'room';

const N_ICONS: Record<NType, { icon: string; color: string; bg: string }> = {
  gift: { icon: 'gift', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  mention: { icon: 'at', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  follow: { icon: 'person-add', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  system: { icon: 'information-circle', color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
  dm: { icon: 'chatbubble', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  room: { icon: 'radio', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
};

/* ═══════════════════════════════════════════════════════════
   BİLDİRİMLER EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | NType>('all');

  const {
    notifications, notificationsLoading, fetchNotifications,
    markNotificationAsRead, clearNotifications, unreadCount,
  } = useStore();

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n: any) => n.type === filter);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Şimdi';
    if (diff < 60) return `${diff} dk`;
    if (diff < 1440) return `${Math.floor(diff / 60)} sa`;
    return `${Math.floor(diff / 1440)} gün`;
  };

  const handlePress = (notif: any) => {
    markNotificationAsRead(notif.id);
    if (notif.roomId) {
      router.push({ pathname: '/room', params: { roomId: notif.roomId } } as any);
    } else if (notif.type === 'dm') {
      router.push('/dm' as any);
    }
  };

  const FILTERS: { id: 'all' | NType; label: string }[] = [
    { id: 'all', label: 'Hepsi' },
    { id: 'gift', label: 'Hediye' },
    { id: 'mention', label: 'Etiket' },
    { id: 'dm', label: 'Mesaj' },
    { id: 'follow', label: 'Takip' },
    { id: 'system', label: 'Sistem' },
  ];

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={st.headerBtn} onPress={clearNotifications}>
            <Ionicons name="checkmark-done" size={18} color="#a78bfa" />
          </TouchableOpacity>
        ) : <View style={{ width: 42 }} />}
      </View>

      {/* FİLTRELER */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10, paddingTop: 4 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.id} activeOpacity={0.8}
            onPress={() => setFilter(f.id)}
            style={[st.filterPill, filter === f.id && st.filterPillActive]}>
            <Text style={[st.filterText, filter === f.id && st.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ÖZET */}
      {unreadCount > 0 && (
        <View style={st.summaryRow}>
          <View style={st.summaryBadge}>
            <Ionicons name="notifications" size={12} color="#a78bfa" />
            <Text style={st.summaryText}>{unreadCount} okunmamış</Text>
          </View>
        </View>
      )}

      {/* İÇERİK */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}>

        {notificationsLoading && !refreshing && (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#a78bfa" />
          </View>
        )}

        {!notificationsLoading && filtered.length === 0 && (
          <View style={st.emptyWrap}>
            <View style={st.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={36} color="rgba(139,92,246,0.3)" />
            </View>
            <Text style={st.emptyTitle}>Bildirim yok</Text>
            <Text style={st.emptySub}>Yeni bildirimler burada görünecek</Text>
          </View>
        )}

        {filtered.map((notif: any, i: number) => {
          const nInfo = N_ICONS[notif.type as NType] || N_ICONS.system;
          const isUnread = !notif.read;
          return (
            <TouchableOpacity key={notif.id || i} activeOpacity={0.85}
              onPress={() => handlePress(notif)}
              style={[st.notifCard, isUnread && st.notifCardUnread]}>
              {/* Tip göstergesi — sol şerit */}
              <View style={[st.notifStripe, { backgroundColor: nInfo.color }]} />

              {/* İkon */}
              <View style={[st.notifIcon, { backgroundColor: nInfo.bg }]}>
                <Ionicons name={nInfo.icon as any} size={18} color={nInfo.color} />
              </View>

              {/* İçerik */}
              <View style={st.notifContent}>
                <Text style={st.notifTitle} numberOfLines={1}>{notif.title || notif.type}</Text>
                <Text style={st.notifBody} numberOfLines={2}>{notif.body || notif.message}</Text>
                <Text style={st.notifTime}>{formatTime(notif.createdAt || notif.timestamp || new Date().toISOString())}</Text>
              </View>

              {/* Okunmamış nokta */}
              {isUnread && <View style={st.unreadDot} />}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 16 }} />
      </ScrollView>

      <BottomNav active="notifications" />
    </AppBackground>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 4, gap: 10,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },

  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  filterPillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 6 },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.12)',
  },
  summaryText: { fontSize: 11, fontWeight: '700', color: '#a78bfa' },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  notifCardUnread: {
    backgroundColor: 'rgba(139,92,246,0.04)',
    borderColor: 'rgba(139,92,246,0.08)',
  },
  notifStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
  notifBody: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  notifTime: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.2)', marginTop: 3 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 4,
  },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptySub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.2)', marginTop: 4 },
});
