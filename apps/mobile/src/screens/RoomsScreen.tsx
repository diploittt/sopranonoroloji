import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SHADOWS, ROLE_CONFIG } from '../constants';
import { fetchRooms } from '../services/api';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Rooms'>;

export default function RoomsScreen({ navigation, route }: Props) {
  const { token, user } = route.params;
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try {
      const data = await fetchRooms(token);
      if (Array.isArray(data)) setRooms(data);
    } catch (e) { console.log('Rooms fetch error:', e); }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const enterRoom = (room: any) => {
    navigation.navigate('Room', { slug: room.slug, token, user });
  };

  const roleConfig = ROLE_CONFIG[user?.role || 'guest'] || ROLE_CONFIG.guest;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={StyleSheet.absoluteFill} />

      {/* Üst Bar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>← Çıkış</Text>
          </TouchableOpacity>
        </View>
        <View style={s.topBarCenter}>
          <Text style={s.topBarLogo}>Soprano</Text>
          <Text style={s.topBarLogoAccent}>Chat</Text>
        </View>
        <View style={s.topBarRight}>
          <View style={s.userBadge}>
            <Text style={[s.userBadgeText, { color: roleConfig.color }]}>
              {roleConfig.icon} {user?.displayName || user?.username || 'Kullanıcı'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
      >
        {/* Başlık */}
        <View style={s.headerSection}>
          <Text style={s.sectionTitle}>🚪 ODALAR</Text>
          <Text style={s.sectionSubtitle}>Bir oda seçin ve sohbete katılın</Text>
        </View>

        {loading ? (
          <View style={s.loadingState}>
            <ActivityIndicator color={COLORS.cyan} size="large" />
            <Text style={s.loadingText}>Odalar yükleniyor...</Text>
          </View>
        ) : rooms.length === 0 ? (
          <View style={[s.glassPanel, SHADOWS.panel]}>
            <Text style={s.emptyText}>Aktif oda bulunamadı</Text>
            <TouchableOpacity style={s.defaultRoomBtn} onPress={() => enterRoom({ slug: 'genel-sohbet' })}>
              <Text style={s.defaultRoomBtnText}>🚪 Genel Sohbet'e Gir</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rooms.map((room: any, index: number) => {
            const isVip = room.isVipRoom;
            const isLocked = room.isLocked;
            const buttonColor = room.buttonColor || COLORS.indigo;
            const participantCount = room.participantCount || room._count?.participants || 0;

            return (
              <TouchableOpacity key={room.id || index} style={[s.roomCard, SHADOWS.card]} onPress={() => enterRoom(room)}>
                <View style={s.roomCardGlow} />

                <View style={s.roomHeader}>
                  <View style={s.roomNameRow}>
                    <Text style={s.roomName}>{room.name}</Text>
                    {isVip && <View style={s.vipBadge}><Text style={s.vipBadgeText}>💎 VIP</Text></View>}
                    {isLocked && <Text style={s.lockIcon}>🔒</Text>}
                  </View>
                  <Text style={s.roomSlug}>{room.slug}</Text>
                </View>

                <View style={s.roomFooter}>
                  <View style={s.roomStats}>
                    <View style={s.onlineDot} />
                    <Text style={s.roomStatText}>{participantCount} çevrimiçi</Text>
                  </View>
                  <View style={[s.enterBtn, { backgroundColor: buttonColor }]}>
                    <Text style={s.enterBtnText}>GİR →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Her zaman varsayılan oda */}
        {rooms.length > 0 && !rooms.find(r => r.slug === 'genel-sohbet') && (
          <TouchableOpacity style={[s.roomCard, SHADOWS.card, { borderColor: COLORS.borderCyan }]} onPress={() => enterRoom({ slug: 'genel-sohbet', name: 'Genel Sohbet' })}>
            <View style={[s.roomCardGlow, { backgroundColor: COLORS.cyanGlow }]} />
            <View style={s.roomHeader}>
              <Text style={s.roomName}>💬 Genel Sohbet</Text>
              <Text style={s.roomSlug}>genel-sohbet</Text>
            </View>
            <View style={s.roomFooter}>
              <View style={s.roomStats}>
                <View style={s.onlineDot} />
                <Text style={s.roomStatText}>Varsayılan oda</Text>
              </View>
              <View style={[s.enterBtn, { backgroundColor: COLORS.cyan }]}>
                <Text style={s.enterBtnText}>GİR →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scrollContent: { paddingBottom: 40, paddingTop: 8 },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(7, 11, 20, 0.92)', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  topBarLeft: { width: 70 },
  topBarCenter: { flexDirection: 'row', alignItems: 'baseline' },
  topBarRight: { width: 70, alignItems: 'flex-end' },
  topBarLogo: { fontSize: 18, fontWeight: '900', color: COLORS.white },
  topBarLogoAccent: { fontSize: 18, fontWeight: '900', color: '#fbbf24' },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  userBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  userBadgeText: { fontSize: 10, fontWeight: '700' },

  // Sections
  headerSection: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: COLORS.bg, letterSpacing: 2, opacity: 0.7 },
  sectionSubtitle: { fontSize: 12, color: COLORS.bg, opacity: 0.5, marginTop: 4, fontWeight: '500' },

  // Glass Panel
  glassPanel: {
    marginHorizontal: 16, marginBottom: 14, padding: 20,
    backgroundColor: COLORS.bgPanel, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },

  // Room Card
  roomCard: {
    marginHorizontal: 16, marginBottom: 14, padding: 18,
    backgroundColor: COLORS.bgPanel, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  roomCardGlow: {
    position: 'absolute', top: -1, left: -1, right: -1, height: 2,
    backgroundColor: COLORS.borderGlow,
  },
  roomHeader: { marginBottom: 14 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomName: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  roomSlug: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 3 },
  vipBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(251,191,36,0.15)' },
  vipBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.gold },
  lockIcon: { fontSize: 14 },

  roomFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  roomStatText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  enterBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  enterBtnText: { fontSize: 11, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5 },

  // States
  loadingState: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.bg, fontWeight: '500', opacity: 0.5 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center', marginBottom: 16 },
  defaultRoomBtn: {
    backgroundColor: COLORS.cyan, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    shadowColor: COLORS.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  defaultRoomBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
});
