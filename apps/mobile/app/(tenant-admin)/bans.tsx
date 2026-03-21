import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tenantAdminService from '../../services/tenant-admin.service';

export default function TenantAdminBans() {
  const router = useRouter();
  const [bans, setBans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBans();
  }, []);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const res: any = await tenantAdminService.getBans({ active: true });
      setBans(Array.isArray(res) ? res : res.bans || []);
    } catch (e: any) {
      Alert.alert('Hata', 'Yasaklar yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBan = (id: string, userName: string) => {
    Alert.alert('Yasağı Kaldır', `"${userName}" kullanıcısının yasağını kaldırmak istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => {
          try {
            await tenantAdminService.removeBan(id);
            fetchBans();
          } catch (e: any) {
            Alert.alert('Hata', 'Yasak kaldırılamadı: ' + e.message);
          }
        }
      }
    ]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Bilinmiyor';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sistem Yasaklamaları</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchBans}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent}>
          {bans.length === 0 && (
            <Text style={s.emptyTxt}>Şu anda aktif bir yasaklama yok.</Text>
          )}
          {bans.map((ban) => (
            <View key={ban.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.iconWrap}>
                  <Ionicons name="ban" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{ban.user?.displayName || 'Kullanıcı Silinmiş'}</Text>
                  <Text style={s.banType}>{ban.type === 'site' ? 'Siteden Yasaklı' : 'Odadan Yasaklı'}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveBan(ban.id, ban.user?.displayName || 'Kullanıcı')} style={s.removeBtn}>
                  <Text style={s.removeBtnTxt}>Kaldır</Text>
                </TouchableOpacity>
              </View>

              <View style={s.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Sebep:</Text>
                  <Text style={s.val}>{ban.reason || 'Sebep belirtilmemiş'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Bitiş:</Text>
                  <Text style={[s.val, { color: '#0f172a', fontWeight: 'bold' }]}>{ban.expiresAt ? formatDate(ban.expiresAt) : 'Kalıcı (Süresiz)'}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  
  listContent: { padding: 16 },
  emptyTxt: { textAlign: 'center', marginTop: 30, color: 'rgba(255,255,255,0.3)' },
  
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)', borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userName: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  banType: { fontSize: 12, fontWeight: '600', color: '#ef4444', marginTop: 2 },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  removeBtnTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  
  detailRow: { flexDirection: 'row', marginTop: 8, gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 4 },
  val: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});
