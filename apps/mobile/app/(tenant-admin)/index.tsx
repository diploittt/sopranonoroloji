import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function TenantAdminDashboard() {
  const router = useRouter();

  const TABS = [
    { id: 'users', label: 'Kullanıcılar', icon: 'people', color: '#8b5cf6', gradient: ['#8b5cf6', '#6366f1'] },
    { id: 'rooms', label: 'Odalar', icon: 'home', color: '#0ea5e9', gradient: ['#0ea5e9', '#06b6d4'] },
    { id: 'bans', label: 'Yasaklamalar', icon: 'ban', color: '#ef4444', gradient: ['#ef4444', '#dc2626'] },
    { id: 'words', label: 'Kelime Filtresi', icon: 'chatbubbles', color: '#10b981', gradient: ['#10b981', '#059669'] },
    { id: 'ip-bans', label: 'IP Yasakları', icon: 'globe', color: '#f97316', gradient: ['#f97316', '#ea580c'] },
    { id: 'logs', label: 'Loglar', icon: 'document-text', color: '#6366f1', gradient: ['#6366f1', '#4f46e5'] },
    { id: 'system', label: 'Ayarlar', icon: 'settings', color: '#64748b', gradient: ['#64748b', '#475569'] },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>Soprano Paneli</Text>
          <Text style={s.headerSubTitle}>Mekan Yönetimi</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.heroBox}>
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={28} color="#a78bfa" />
          </View>
          <Text style={s.heroTitle}>Hoş Geldiniz, Yönetici</Text>
          <Text style={s.heroDesc}>
            Kullanıcı yetkilerini düzenleyebilir, odaları ve genel sistem güvenliğini kontrol edebilirsiniz.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Modüller</Text>
        <View style={s.grid}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.id} style={s.card}
              onPress={() => router.push(`/(tenant-admin)/${tab.id}` as any)}>
              <View style={[s.cardIcon, { backgroundColor: `${tab.color}15` }]}>
                <Ionicons name={tab.icon as any} size={20} color={tab.color} />
              </View>
              <Text style={s.cardLabel}>{tab.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: 16 }} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  headerSubTitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  heroBox: {
    padding: 24, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 30, overflow: 'hidden',
  },
  heroIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 6 },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20, fontWeight: '500' },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingLeft: 4,
  },
  grid: { gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16, borderRadius: 16, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
});
