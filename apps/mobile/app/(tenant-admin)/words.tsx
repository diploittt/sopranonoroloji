import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, ActivityIndicator, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tenantAdminService from '../../services/tenant-admin.service';

export default function TenantAdminWords() {
  const router = useRouter();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [badWord, setBadWord] = useState('');
  const [replacement, setReplacement] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const res: any = await tenantAdminService.getWordFilters();
      setWords(Array.isArray(res) ? res : res.filters || []);
    } catch (e: any) {
      Alert.alert('Hata', 'Kelimeler yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!badWord.trim()) {
      Alert.alert('Hata', 'Yasaklı kelime zorunludur.');
      return;
    }
    setSaveLoading(true);
    try {
      await tenantAdminService.createWordFilter({
        badWord: badWord.trim(),
        replacement: replacement.trim() || '***',
      });
      setIsModalOpen(false);
      fetchWords();
    } catch (e: any) {
      Alert.alert('Hata', 'Eklenemedi: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (id: string, word: string) => {
    Alert.alert('Silmeyi Onayla', `"${word}" kelime filtresini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await tenantAdminService.removeWordFilter(id);
            fetchWords();
          } catch (e: any) {
            Alert.alert('Hata', 'Silinemedi: ' + e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kelime Filtresi</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => {
          setBadWord(''); setReplacement(''); setIsModalOpen(true);
        }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent}>
          {words.length === 0 && (
            <Text style={s.emptyTxt}>Henüz hiç kelime filtresi yok.</Text>
          )}
          {words.map((w) => (
            <View key={w.id} style={s.card}>
              <View style={s.iconWrap}>
                <Ionicons name="text" size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.badWord}>{w.badWord}</Text>
                <View style={s.replWrap}>
                  <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.25)" />
                  <Text style={s.replacement}>{w.replacement || '***'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(w.id, w.badWord)} style={s.actionIcon}>
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
            <Text style={s.modalTitle}>Yeni Kelime Ekle</Text>
            <TouchableOpacity onPress={handleSave} disabled={saveLoading}>
              {saveLoading ? <ActivityIndicator size="small" /> : <Text style={s.modalSave}>Kaydet</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.infoBox}>
              <Ionicons name="information-circle" size={20} color="#10b981" />
              <Text style={s.infoTxt}>
                Chat sırasında "Yasaklı Kelime" kullanıldığında otomatik olarak "Sansürlü Kelime" ile değiştirilir. Sansür metni boş bırakılırsa *** kullanılır.
              </Text>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>YASAKLI KELİME</Text>
              <TextInput style={s.input} value={badWord} onChangeText={setBadWord} placeholder="Örn: kufur" autoCapitalize="none" />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>SANSÜRLÜ KELİME (YERİNE GEÇECEK)</Text>
              <TextInput style={s.input} value={replacement} onChangeText={setReplacement} placeholder="Örn: ***" />
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  
  listContent: { padding: 16 },
  emptyTxt: { textAlign: 'center', marginTop: 30, color: 'rgba(255,255,255,0.3)' },
  
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)',
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  badWord: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', textDecorationLine: 'line-through', textDecorationColor: '#ef4444' },
  replWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  replacement: { fontSize: 13, fontWeight: '700', color: '#10b981' },
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
  modalSave: { fontSize: 15, fontWeight: '700', color: '#10b981' },
  modalContent: { padding: 16, paddingBottom: 60 },
  
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(16,185,129,0.08)', padding: 16, borderRadius: 12, marginBottom: 24, gap: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' },
  infoTxt: { flex: 1, fontSize: 13, color: '#10b981', lineHeight: 20 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#f1f5f9'
  },
});
