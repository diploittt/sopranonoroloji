import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, ActivityIndicator, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../../store';
import tenantAdminService from '../../services/tenant-admin.service';

export default function TenantAdminRooms() {
  const router = useRouter();
  const { user } = useStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [maxParts, setMaxParts] = useState('20');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res: any = await tenantAdminService.getRooms();
      setRooms(Array.isArray(res) ? res : res.rooms || []);
    } catch (e: any) {
      Alert.alert('Hata', 'Odalar yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedRoomId(null);
    setName('');
    setSlug('');
    setPassword('');
    setMaxParts('20');
    setAnnouncement('');
    setIsModalOpen(true);
  };

  const openEditModal = (room: any) => {
    setIsEditing(true);
    setSelectedRoomId(room.id);
    setName(room.name || '');
    setSlug(room.slug || '');
    setPassword(room.password || '');
    setMaxParts(room.maxParticipants ? String(room.maxParticipants) : '20');
    setAnnouncement(room.announcement || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Oda adı zorunludur.');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        name,
        slug: slug.trim() || undefined,
        password: password || undefined,
        maxParticipants: parseInt(maxParts) || 20,
        announcement: announcement || undefined,
      };

      if (isEditing && selectedRoomId) {
        await tenantAdminService.updateRoom(selectedRoomId, payload);
        Alert.alert('Başarılı', 'Oda güncellendi.');
      } else {
        await tenantAdminService.createRoom(payload);
        Alert.alert('Başarılı', 'Yeni oda oluşturuldu.');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (e: any) {
      Alert.alert('Hata', 'İşlem başarısız: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = (id: string, roomName: string) => {
    Alert.alert('Silmeyi Onayla', `"${roomName}" odasını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await tenantAdminService.deleteRoom(id);
            fetchRooms();
          } catch (e: any) {
            Alert.alert('Hata', 'Silinemedi: ' + e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        {user?.role === 'godmaster' && (
          <TouchableOpacity style={s.addBtn} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {rooms.length === 0 && (
            <Text style={s.emptyTxt}>Henüz hiç oda yok.</Text>
          )}
          {rooms.map((room) => (
            <View key={room.id} style={s.roomCard}>
              <View style={s.roomHeader}>
                <View style={s.roomIcon}>
                  <Ionicons name="home" size={20} color="#4f46e5" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roomName}>{room.name}</Text>
                  <Text style={s.roomSlug}>/{room.slug}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(room.id, room.name)} style={s.actionIcon}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditModal(room)} style={[s.actionIcon, { marginLeft: 8 }]}>
                  <Ionicons name="create-outline" size={18} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              
              <View style={s.roomMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.35)" />
                  <Text style={s.metaTxt}>Max: {room.maxParticipants || 0}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.35)" />
                  <Text style={s.metaTxt}>{room.password ? 'Şifreli' : 'Açık'}</Text>
                </View>
              </View>

              {room.announcement && (
                <View style={s.announceBox}>
                  <Ionicons name="megaphone" size={14} color="#f59e0b" />
                  <Text style={s.announceTxt} numberOfLines={2}>{room.announcement}</Text>
                </View>
              )}
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
            <Text style={s.modalTitle}>{isEditing ? 'Odayı Düzenle' : 'Yeni Oda Ekle'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saveLoading}>
              {saveLoading ? <ActivityIndicator size="small" /> : <Text style={s.modalSave}>Kaydet</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.inputGroup}>
              <Text style={s.label}>ODA ADI</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Örn: Genel Sohbet" />
            </View>

            <View style={s.row}>
              {user?.role === 'godmaster' && (
                <>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.label}>MAKSİMUM KİŞİ</Text>
                    <TextInput style={s.input} value={maxParts} onChangeText={setMaxParts} keyboardType="numeric" />
                  </View>
                  <View style={{ width: 16 }} />
                </>
              )}
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>ODA ŞİFRESİ</Text>
                <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Opsiyonel" secureTextEntry />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>SABİT DUYURU MESAJI</Text>
              <TextInput 
                style={[s.input, { height: 80, textAlignVertical: 'top' }]} 
                value={announcement} 
                onChangeText={setAnnouncement} 
                placeholder="Odaya giren herkese gösterilecek mesaj..."
                multiline
              />
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5cf6', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  
  listContent: { padding: 16 },
  emptyTxt: { textAlign: 'center', marginTop: 30, color: 'rgba(255,255,255,0.3)' },
  
  roomCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  roomHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roomIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  roomName: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  roomSlug: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  
  roomMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },

  announceBox: { marginTop: 12, padding: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  announceTxt: { flex: 1, fontSize: 12, color: '#f59e0b', lineHeight: 18 },

  /* MODAL */
  modalContainer: { flex: 1, backgroundColor: '#0a0e27' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  modalCancel: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#a78bfa' },
  modalContent: { padding: 16, paddingBottom: 60 },
  
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#f1f5f9'
  },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, fontStyle: 'italic' },
});
