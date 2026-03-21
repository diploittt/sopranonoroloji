import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform,
  StyleSheet, Alert, Switch, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import AppBackground from '../components/shared/AppBackground';

/* ═══════════════════════════════════════════════════════════
   AYARLAR EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function SettingsScreen() {
  const router = useRouter();
  const { user, logoutWithSocket } = useStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dmEnabled, setDmEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Oturumunuz kapatılacak.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: () => { logoutWithSocket(); router.replace('/'); } },
    ]);
  };

  const SECTIONS = [
    {
      title: 'Hesap',
      items: [
        { icon: 'person', label: 'Profil Düzenle', color: '#8b5cf6', action: () => Alert.alert('Profil Düzenle', 'Yakında') },
        { icon: 'key', label: 'Şifre Değiştir', color: '#0ea5e9', action: () => Alert.alert('Şifre Değiştir', 'Yakında') },
        { icon: 'mail', label: 'E-posta', color: '#10b981', info: user?.email || 'Belirsiz' },
      ],
    },
    {
      title: 'Bildirimler',
      items: [
        { icon: 'notifications', label: 'Push Bildirimleri', color: '#f59e0b', toggle: true, value: pushEnabled, onChange: setPushEnabled },
        { icon: 'volume-high', label: 'Bildirim Sesleri', color: '#ec4899', toggle: true, value: soundEnabled, onChange: setSoundEnabled },
        { icon: 'chatbubble', label: 'DM Bildirimleri', color: '#6366f1', toggle: true, value: dmEnabled, onChange: setDmEnabled },
      ],
    },
    {
      title: 'Gizlilik',
      items: [
        { icon: 'eye-off', label: 'Çevrimiçi Durumu Gizle', color: '#64748b', toggle: true, value: false, onChange: () => {} },
        { icon: 'shield', label: 'Engellenen Kullanıcılar', color: '#ef4444', action: () => Alert.alert('Engellenenler', 'Yakında') },
      ],
    },
    {
      title: 'Hakkında',
      items: [
        { icon: 'information-circle', label: 'Uygulama Sürümü', color: '#a78bfa', info: 'v2.0.0' },
        { icon: 'document-text', label: 'Gizlilik Politikası', color: '#64748b', action: () => {} },
        { icon: 'document', label: 'Kullanım Koşulları', color: '#64748b', action: () => {} },
      ],
    },
  ];

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Ayarlar</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => (
          <View key={section.title} style={st.section}>
            <Text style={st.sectionTitle}>{section.title}</Text>
            <View style={st.sectionCard}>
              {section.items.map((item: any, i: number) => (
                <TouchableOpacity key={i} activeOpacity={item.toggle ? 1 : 0.85}
                  onPress={item.action} disabled={item.toggle}
                  style={[st.menuItem, i < section.items.length - 1 && st.menuItemBorder]}>
                  <View style={[st.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={st.menuLabel}>{item.label}</Text>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onChange}
                      trackColor={{ false: 'rgba(255,255,255,0.06)', true: 'rgba(139,92,246,0.3)' }}
                      thumbColor={item.value ? '#8b5cf6' : 'rgba(255,255,255,0.3)'}
                    />
                  ) : item.info ? (
                    <Text style={st.menuInfo}>{item.info}</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ÇIKIŞ */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleLogout} style={st.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={st.logoutText}>Oturumu Kapat</Text>
        </TouchableOpacity>
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

  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  menuIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  menuInfo: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 24,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
