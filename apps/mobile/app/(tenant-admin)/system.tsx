import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TenantAdminSettings() {
  const router = useRouter();

  const ITEMS = [
    { icon: 'color-palette', label: 'Tema Ayarları', color: '#8b5cf6' },
    { icon: 'shield', label: 'Güvenlik', color: '#ef4444' },
    { icon: 'notifications', label: 'Bildirim Ayarları', color: '#f59e0b' },
    { icon: 'analytics', label: 'İstatistikler', color: '#0ea5e9' },
    { icon: 'server', label: 'Sunucu Durumu', color: '#10b981' },
    { icon: 'construct', label: 'Bakım Modu', color: '#64748b' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sistem Ayarları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={s.card} activeOpacity={0.85}>
            <View style={[s.iconWrap, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={s.cardLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" />
          </TouchableOpacity>
        ))}

        <View style={s.comingSoon}>
          <Ionicons name="construct-outline" size={28} color="rgba(139,92,246,0.3)" />
          <Text style={s.comingText}>Daha fazla ayar yakında eklenecek</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  comingSoon: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  comingText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.2)' },
});
