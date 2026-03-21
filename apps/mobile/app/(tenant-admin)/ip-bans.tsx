import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, ActivityIndicator, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tenantAdminService from '../../services/tenant-admin.service';

export default function TenantAdminIpBans() {
  const router = useRouter();
  const [ipBans, setIpBans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [reason, setReason] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchIpBans();
  }, []);

  const fetchIpBans = async () => {
    setLoading(true);
    try {
      const res: any = await tenantAdminService.getIpBans();
      setIpBans(Array.isArray(res) ? res : res.ipBans || []);
    } catch (e: any) {
      Alert.alert('Hata', 'IP Yasakları yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ipAddress.trim()) {
      Alert.alert('Hata', 'IP Adresi zorunludur.');
      return;
    }
    setSaveLoading(true);
    try {
      await tenantAdminService.createIpBan({
        ip: ipAddress.trim(),
        reason: reason.trim() || undefined,
      });
      setIsModalOpen(false);
      fetchIpBans();
    } catch (e: any) {
      Alert.alert('Hata', 'Eklenemedi: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (id: string, ip: string) => {
    Alert.alert('Silmeyi Onayla', `"${ip}" IP yasağını kaldırmak istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: async () => {
          try {
            await tenantAdminService.removeIpBan(id);
            fetchIpBans();
          } catch (e: any) {
            Alert.alert('Hata', 'Kaldırılamadı: ' + e.message);
          }
        }
      }
    ]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>IP Yasakları</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => {
          setIpAddress(''); setReason(''); setIsModalOpen(true);
        }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent}>
          {ipBans.length === 0 && (
            <Text style={s.emptyTxt}>Henüz hiç IP yasağı bulunmuyor.</Text>
          )}
          {ipBans.map((ban) => (
            <View key={ban.id} style={s.card}>
              <View style={s.iconWrap}>
                <Ionicons name="globe" size={20} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ipTxt}>{ban.ip}</Text>
                {ban.reason ? (
                  <Text style={s.reasonTx} numberOfLines={2}>Sebep: {ban.reason}</Text>
                ) : null}
                <Text style={s.dateTxt}>{formatDate(ban.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(ban.id, ban.ip)} style={s.actionIcon}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* MODAL */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={s.modalCancel}>İptal</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Yeni IP Yasağı Ekle</Text>
            <TouchableOpacity onPress={handleSave} disabled={saveLoading}>
              {saveLoading ? <ActivityIndicator size="small" /> : <Text style={s.modalSave}>Kaydet</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.infoBox}>
              <Ionicons name="warning" size={20} color="#f97316" />
              <Text style={s.infoTxt}>
                Bu IP adresi üzerinden bağlanan hiçbir kullanıcı siteye erişemeyecektir. Dinamik IP adresleri nedeniyle masum kullanıcıların da etkilenebileceğini unutmayın.
              </Text>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>IP ADRESİ</Text>
              <TextInput style={s.input} value={ipAddress} onChangeText={setIpAddress} placeholder="Örn: 192.168.1.1" keyboardType="numeric" />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>SEBEP (OPSİYONEL)</Text>
              <TextInput style={s.input} value={reason} onChangeText={setReason} placeholder="Örn: Spam saldırısı" />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  
  listContent: { padding: 16 },
  emptyTxt: { textAlign: 'center', marginTop: 30, color: 'rgba(255,255,255,0.3)' },
  
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.1)',
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  ipTxt: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  reasonTx: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  dateTxt: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4, fontWeight: '500' },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },

  /* MODAL */
  modalContainer: { flex: 1, backgroundColor: '#0a0e27' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  modalCancel: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#f97316' },
  modalContent: { padding: 16, paddingBottom: 60 },
  
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(249,115,22,0.08)', padding: 16, borderRadius: 12, marginBottom: 24, gap: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)' },
  infoTxt: { flex: 1, fontSize: 13, color: '#f97316', lineHeight: 20 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#f1f5f9'
  },
});
