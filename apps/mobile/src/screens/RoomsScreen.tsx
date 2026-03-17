import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, ROLE_CONFIG, getAvatarUrl } from '../constants';
import { fetchRooms } from '../services/api';
import { clearSession } from '../../App';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

export default function RoomsScreen({ navigation, route }: Props) {
  const { token, user } = route.params;
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadRooms(); }, []);
  const loadRooms = async () => {
    try { const d = await fetchRooms(token); if (Array.isArray(d)) setRooms(d); }
    catch (e) { console.log('Rooms err:', e); }
    setLoading(false);
  };
  const onRefresh = async () => { setRefreshing(true); await loadRooms(); setRefreshing(false); };
  const enterRoom = (room: any) => navigation.navigate('Room', { slug: room.slug, token, user });
  const ri = ROLE_CONFIG[user?.role || 'guest'] || ROLE_CONFIG.guest;

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Oturumu sonlandırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
        await clearSession();
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d3548' }}>
      <StatusBar style="light" />

      {/* ═══ METALLIC HEADER ═══ */}
      <LinearGradient colors={['#5a6070', '#3d4250', '#1e222e', '#282c3a', '#3a3f50']}
        locations={[0, 0.15, 0.5, 0.75, 1]} style={s.header}>
        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
          style={s.headerShine} />

        <View style={s.logoArea}>
          <Image source={require('../../assets/icon.png')} style={s.logoIcon} />
          <View>
            <Text style={s.logoS}>Soprano<Text style={s.logoC}>Chat</Text></Text>
            <Text style={{ fontSize: 8, color: '#64748b', letterSpacing: 1 }}>Senin Sesin</Text>
          </View>
        </View>

        {/* User avatar + dropdown */}
        <TouchableOpacity style={s.profileBtn} onPress={handleLogout}>
          <Image source={{ uri: getAvatarUrl(user?.avatar || '') }} style={s.profileAvatar} />
          <View style={s.profileOnline} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5ec8c8" />}>

        <View style={s.sectionHead}>
          <Ionicons name="home" size={16} color="#5ec8c8" />
          <Text style={s.sectionTitle}>ODALAR</Text>
          <Text style={s.sectionSub}>Bir oda seçin ve sohbete katılın</Text>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#5ec8c8" size="large" />
            <Text style={{ fontSize: 12, color: '#4a5568' }}>Odalar yükleniyor...</Text>
          </View>
        ) : rooms.length === 0 ? (
          <View style={s.panel}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#334155" style={{ textAlign: 'center', marginBottom: 8 }} />
            <Text style={{ fontSize: 12, color: '#4a5568', textAlign: 'center', marginBottom: 14 }}>Aktif oda bulunamadı</Text>
            <TouchableOpacity onPress={() => enterRoom({ slug: 'genel-sohbet' })}>
              <LinearGradient colors={['#5ec8c8', '#3a9e9e']} style={s.enterBtn}>
                <Ionicons name="enter-outline" size={16} color="#0a0f1d" />
                <Text style={s.enterBtnText}>Genel Sohbet'e Gir</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          rooms.map((room: any, i: number) => {
            const p = room.participantCount || room._count?.participants || 0;
            return (
              <TouchableOpacity key={room.id || i} onPress={() => enterRoom(room)} activeOpacity={0.7}>
                <View style={s.roomCard}>
                  <LinearGradient colors={['rgba(94,200,200,0.06)', 'transparent']} style={s.roomCardShine} />
                  <View style={s.roomInfo}>
                    <View style={s.roomNameRow}>
                      <Ionicons name="chatbubbles" size={16} color="#5ec8c8" />
                      <Text style={s.roomName}>{room.name}</Text>
                      {room.isVipRoom && (
                        <View style={s.vipBadge}>
                          <Ionicons name="diamond" size={10} color="#fbbf24" />
                          <Text style={s.vipText}>VIP</Text>
                        </View>
                      )}
                      {room.isLocked && <Ionicons name="lock-closed" size={12} color="#f59e0b" />}
                    </View>
                    <View style={s.roomStats}>
                      <View style={s.onlineDot} />
                      <Text style={s.roomStatText}>{p} çevrimiçi</Text>
                    </View>
                  </View>
                  <LinearGradient colors={['#5ec8c8', '#3a9e9e']} style={s.goBtn}>
                    <Text style={s.goBtnText}>GİR</Text>
                    <Ionicons name="arrow-forward" size={14} color="#0a0f1d" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {rooms.length > 0 && !rooms.find(r => r.slug === 'genel-sohbet') && (
          <TouchableOpacity onPress={() => enterRoom({ slug: 'genel-sohbet', name: 'Genel Sohbet' })} activeOpacity={0.7}>
            <View style={[s.roomCard, { borderColor: 'rgba(94,200,200,0.2)' }]}>
              <View style={s.roomInfo}>
                <View style={s.roomNameRow}>
                  <Ionicons name="chatbubble" size={16} color="#5ec8c8" />
                  <Text style={s.roomName}>Genel Sohbet</Text>
                </View>
                <View style={s.roomStats}>
                  <View style={s.onlineDot} />
                  <Text style={s.roomStatText}>Varsayılan oda</Text>
                </View>
              </View>
              <LinearGradient colors={['#5ec8c8', '#3a9e9e']} style={s.goBtn}>
                <Text style={s.goBtnText}>GİR</Text>
                <Ionicons name="arrow-forward" size={14} color="#0a0f1d" />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 40, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.5)', borderTopWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  headerShine: {
    position: 'absolute', top: 0, left: '10%', right: '10%', height: '35%',
    borderBottomLeftRadius: 999, borderBottomRightRadius: 999,
  },

  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, borderRadius: 8 },
  logoS: {
    fontSize: 18, fontFamily: 'Fraunces-Black', color: '#dde4ee',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4,
  },
  logoC: {
    fontSize: 18, fontFamily: 'Fraunces-Black', color: '#5ec8c8',
  },

  profileBtn: { position: 'relative' },
  profileAvatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: 'rgba(94,200,200,0.3)',
  },
  profileOnline: {
    position: 'absolute', bottom: 0, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10b981', borderWidth: 2, borderColor: '#1e222e',
  },

  scroll: { paddingBottom: 30, paddingTop: 14 },
  sectionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 18, marginBottom: 12, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#e2e8f0', letterSpacing: 2 },
  sectionSub: { width: '100%', fontSize: 11, color: '#4a5568', fontWeight: '500', marginTop: -2 },

  panel: {
    marginHorizontal: 14, padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  roomCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginBottom: 10, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  roomCardShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  roomInfo: { flex: 1, gap: 4 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomName: { fontSize: 15, fontWeight: '800', color: '#e2e8f0' },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  vipText: { fontSize: 8, fontWeight: '700', color: '#fbbf24' },
  roomStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  roomStatText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  goBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    shadowColor: '#5ec8c8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  goBtnText: { fontSize: 10, fontWeight: '900', color: '#0a0f1d', letterSpacing: 1.5 },
  enterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  enterBtnText: { fontSize: 12, fontWeight: '800', color: '#0a0f1d', letterSpacing: 1 },
});
