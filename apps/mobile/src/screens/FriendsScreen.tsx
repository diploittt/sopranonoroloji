import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Image, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, getAvatarUrl, API_URL } from '../constants';

export default function FriendsScreen({ route }: any) {
  const { token, user } = route.params || {};
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadFriends(); }, []);

  const loadFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setFriends(data);
    } catch (e) { console.log('Friends err:', e); }
    setLoading(false);
  };

  const filtered = friends.filter(f =>
    f.username?.toLowerCase().includes(search.toLowerCase())
  );

  const renderFriend = ({ item }: any) => (
    <View style={st.friendCard}>
      <Image source={{ uri: getAvatarUrl(item.avatar) }} style={st.friendAvatar} />
      <View style={st.friendInfo}>
        <Text style={st.friendName}>{item.username}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={[st.statusDot, { backgroundColor: item.isOnline ? '#10b981' : '#64748b' }]} />
          <Text style={st.friendStatus}>{item.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</Text>
        </View>
      </View>
      <TouchableOpacity style={st.msgBtn}>
        <Ionicons name="chatbubble-outline" size={18} color="#5ec8c8" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={st.root}>
      {/* Arama */}
      <View style={st.searchWrap}>
        <Ionicons name="search" size={16} color="#64748b" />
        <TextInput style={st.searchInput} value={search} onChangeText={setSearch}
          placeholder="Arkadaş ara..." placeholderTextColor="#4a5568" />
      </View>

      {/* Online Sayısı */}
      <View style={st.header}>
        <View style={st.onlineBadge}>
          <View style={st.pulseDot} />
          <Text style={st.onlineText}>ÇEVRİMİÇİ</Text>
        </View>
        <Text style={st.onlineCount}>{friends.filter(f => f.isOnline).length}</Text>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color="#5ec8c8" size="large" />
          <Text style={{ color: '#4a5568', fontSize: 12, marginTop: 10 }}>Yükleniyor...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="people-outline" size={40} color="#334155" />
          <Text style={{ color: '#4a5568', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
            {search ? 'Sonuç bulunamadı' : 'Henüz arkadaşınız yok'}
          </Text>
        </View>
      ) : (
        <FlatList data={filtered} renderItem={renderFriend}
          keyExtractor={(item) => item.id || item.username}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2d3548' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 14, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#e2e8f0' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  onlineText: { fontSize: 10, fontWeight: '800', color: '#10b981', letterSpacing: 1.5 },
  onlineCount: { fontSize: 14, fontWeight: '900', color: '#e2e8f0' },

  friendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(94,200,200,0.2)' },
  friendInfo: { flex: 1, gap: 2 },
  friendName: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  friendStatus: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  msgBtn: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(94,200,200,0.1)', borderWidth: 1, borderColor: 'rgba(94,200,200,0.2)',
  },
});
