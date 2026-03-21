import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tenantAdminService from '../../services/tenant-admin.service';

export default function TenantAdminLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res: any = await tenantAdminService.getAuditLogs({ limit: 50 });
      setLogs(Array.isArray(res) ? res : res.logs || []);
    } catch (e: any) {
      Alert.alert('Hata', 'Loglar yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (event: string) => {
    if (event.includes('ban')) return 'ban';
    if (event.includes('user')) return 'person';
    if (event.includes('room')) return 'home';
    if (event.includes('word')) return 'text';
    if (event.includes('ip')) return 'globe';
    if (event.includes('kick')) return 'exit';
    return 'flash';
  };

  const getEventColor = (event: string) => {
    if (event.includes('ban') || event.includes('kick')) return '#ef4444';
    if (event.includes('user')) return '#4f46e5';
    if (event.includes('room')) return '#10b981';
    if (event.includes('word')) return '#f59e0b';
    return '#6366f1';
  };

  const getEventTitle = (event: string) => {
    const titles: Record<string, string> = {
      'room:create': 'Oda Oluşturuldu',
      'room:update': 'Oda Güncellendi',
      'room:delete': 'Oda Silindi',
      'user:update': 'Kullanıcı Güncellendi',
      'ban:create': 'Yasaklama Eklendi',
      'ban:remove': 'Yasaklama Kaldırıldı',
      'ipban:create': 'IP Yasaklandı',
      'ipban:remove': 'IP Yasağı Kaldırıldı',
      'word:create': 'Kelime Filtresi Eklendi',
      'word:remove': 'Kelime Filtresi Silindi',
      'settings:update': 'Ayarlar Güncellendi',
    };
    return titles[event] || event;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Sistem Logları</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchLogs}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent}>
          {logs.length === 0 && (
            <Text style={s.emptyTxt}>Henüz hiç log kaydı yok.</Text>
          )}
          {logs.map((log) => (
            <View key={log.id} style={s.card}>
              <View style={[s.iconWrap, { backgroundColor: getEventColor(log.event) + '1A' }]}>
                <Ionicons name={getEventIcon(log.event) as any} size={20} color={getEventColor(log.event)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.eventTxt}>{getEventTitle(log.event)}</Text>
                <Text style={s.adminTxt}>Yönetici: <Text style={{ fontWeight: '700' }}>{log.user?.displayName || 'Sistem'}</Text></Text>
                
                {log.details && (
                   <View style={s.detailsBox}>
                     <Text style={s.detailsTxt} numberOfLines={3}>{JSON.stringify(log.details)}</Text>
                   </View>
                )}
              </View>
              <Text style={s.dateTxt}>{formatDate(log.createdAt)}</Text>
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
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eventTxt: { fontSize: 14, fontWeight: '800', color: '#f1f5f9' },
  adminTxt: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  dateTxt: { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: '600', marginLeft: 8, marginTop: 2 },

  detailsBox: { marginTop: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8 },
  detailsTxt: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
