import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform,
  StyleSheet, Image, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import AppBackground from '../components/shared/AppBackground';
import BottomNav from '../components/shared/BottomNav';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   PROFİL EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logoutWithSocket } = useStore();

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Oturumunuz kapatılacak. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { logoutWithSocket(); router.replace('/'); } },
    ]);
  };

  const STATS = [
    { label: 'Oda', value: user?.roomCount || 0, icon: 'radio', color: '#8b5cf6' },
    { label: 'Saat', value: user?.totalHours || 0, icon: 'time', color: '#0ea5e9' },
    { label: 'Hediye', value: user?.giftCount || 0, icon: 'gift', color: '#f59e0b' },
    { label: 'Puan', value: user?.points || 0, icon: 'star', color: '#10b981' },
  ];

  const MENU_ITEMS = [
    { id: 'dm', icon: 'chatbubbles', label: 'Özel Mesajlar', color: '#ec4899', route: '/dm' },
    { id: 'settings', icon: 'settings', label: 'Ayarlar', color: '#a78bfa', route: '/settings' },
    { id: 'wallet', icon: 'wallet', label: 'Bakiye & Puan', color: '#f59e0b', info: `${user?.balance || 0} ₺` },
    { id: 'admin', icon: 'shield-checkmark', label: 'Yönetici Paneli', color: '#6366f1', route: '/(tenant-admin)' },
  ];

  const avatarUrl = user?.avatar || user?.avatarUrl;
  const displayName = user?.displayName || user?.username || 'Kullanıcı';
  const role = user?.role || 'Üye';

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Profil</Text>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.push('/settings' as any)}>
          <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══ PROFİL KARTI ═══ */}
        <View style={st.profileCard}>
          <View style={st.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={st.avatar} />
            ) : (
              <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.avatar}>
                <Text style={st.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={st.onlineDot} />
          </View>

          <Text style={st.name}>{displayName}</Text>
          <View style={st.roleBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#a78bfa" />
            <Text style={st.roleText}>{role}</Text>
          </View>

          {user?.email && (
            <Text style={st.email}>{user.email}</Text>
          )}

          {/* İSTATİSTİKLER */}
          <View style={st.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={st.statItem}>
                <View style={[st.statIcon, { backgroundColor: `${s.color}15` }]}>
                  <Ionicons name={s.icon as any} size={14} color={s.color} />
                </View>
                <Text style={st.statValue}>{s.value}</Text>
                <Text style={st.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ BAKİYE KARTI ═══ */}
        <TouchableOpacity activeOpacity={0.9} style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.walletCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={st.walletDecoCircle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={st.walletIcon}>
                <Ionicons name="wallet" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.walletLabel}>Bakiye</Text>
                <Text style={st.walletValue}>{user?.balance || 0} ₺</Text>
              </View>
              <View style={st.walletPointsWrap}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={st.walletPoints}>{user?.points || 0} puan</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ═══ MENÜ ═══ */}
        <View style={st.menuSection}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.id} activeOpacity={0.85}
              onPress={() => {
                if (item.route) router.push(item.route as any);
              }}
              style={st.menuItem}>
              <View style={[st.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={st.menuLabel}>{item.label}</Text>
              {item.info ? (
                <Text style={st.menuInfo}>{item.info}</Text>
              ) : (
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ ÇIKIŞ ═══ */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleLogout} style={st.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={st.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      <BottomNav active="profile" />
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

  scroll: { paddingBottom: 16 },

  /* Profil Kartı */
  profileCard: {
    alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(139,92,246,0.3)',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 3, borderColor: '#0a0e27',
  },
  name: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  roleText: { fontSize: 11, fontWeight: '700', color: '#a78bfa' },
  email: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.3)', marginTop: 6 },

  /* Stats */
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', marginTop: 20,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },

  /* Wallet */
  walletCard: { borderRadius: 20, padding: 18, overflow: 'hidden' },
  walletDecoCircle: {
    position: 'absolute', top: -20, right: -20,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  walletIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  walletLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  walletValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },
  walletPointsWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  walletPoints: { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* Menu */
  menuSection: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  menuInfo: { fontSize: 12, fontWeight: '700', color: '#a78bfa' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 16,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
