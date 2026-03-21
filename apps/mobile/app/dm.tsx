import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform,
  StyleSheet, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import AppBackground from '../components/shared/AppBackground';

/* ═══════════════════════════════════════════════════════════
   DM LİSTESİ — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function DMListScreen() {
  const router = useRouter();
  const { dmConversations, fetchDMConversations, user } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchDMConversations?.(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDMConversations?.();
    setRefreshing(false);
  }, []);

  const conversations = Array.isArray(dmConversations) ? dmConversations : [];

  const formatTime = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Şimdi';
    if (diff < 60) return `${diff} dk`;
    if (diff < 1440) return `${Math.floor(diff / 60)} sa`;
    return `${Math.floor(diff / 1440)} gün`;
  };

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Mesajlar</Text>
        <TouchableOpacity style={st.headerBtn}>
          <Ionicons name="create-outline" size={20} color="#a78bfa" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}>

        {conversations.length === 0 && (
          <View style={st.emptyWrap}>
            <View style={st.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={40} color="rgba(139,92,246,0.3)" />
            </View>
            <Text style={st.emptyTitle}>Henüz mesaj yok</Text>
            <Text style={st.emptySub}>Birine mesaj göndererek başlayın</Text>
          </View>
        )}

        {conversations.map((conv: any, i: number) => {
          const other = conv.participants?.find((p: any) => p.id !== user?.id) || {};
          const unread = conv.unreadCount || 0;
          return (
            <TouchableOpacity key={conv.id || i} activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/dm-chat', params: { conversationId: conv.id, userId: other.id, username: other.username || other.displayName } } as any)}
              style={[st.convItem, unread > 0 && st.convItemUnread]}>
              {other.avatar || other.avatarUrl ? (
                <Image source={{ uri: other.avatar || other.avatarUrl }} style={st.convAvatar} />
              ) : (
                <View style={st.convAvatarPlaceholder}>
                  <Text style={st.convAvatarText}>{(other.username || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={st.convInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={st.convName} numberOfLines={1}>{other.username || other.displayName || 'Kullanıcı'}</Text>
                  <Text style={st.convTime}>{formatTime(conv.lastMessageAt || conv.updatedAt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Text style={st.convLastMsg} numberOfLines={1}>{conv.lastMessage || 'Mesaj yok'}</Text>
                  {unread > 0 && (
                    <View style={st.convBadge}>
                      <Text style={st.convBadgeText}>{unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </AppBackground>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 8, gap: 10,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },

  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 2,
    padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  convItemUnread: {
    backgroundColor: 'rgba(139,92,246,0.04)',
    borderColor: 'rgba(139,92,246,0.08)',
  },
  convAvatar: { width: 48, height: 48, borderRadius: 16 },
  convAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { fontSize: 18, fontWeight: '800', color: '#a78bfa' },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', flex: 1, marginRight: 8 },
  convTime: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.2)' },
  convLastMsg: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.35)', flex: 1 },
  convBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#8b5cf6',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  convBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptySub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.2)', marginTop: 4 },
});
