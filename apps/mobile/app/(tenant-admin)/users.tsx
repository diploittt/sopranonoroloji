import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, ActivityIndicator, Alert, Modal, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tenantAdminService from '../../services/tenant-admin.service';

const ROLE_OPTIONS = [
  { value: 'guest', label: 'Misafir', level: 1 },
  { value: 'member', label: 'Üye', level: 2 },
  { value: 'vip', label: 'VIP', level: 4 },
  { value: 'operator', label: 'Operatör', level: 5 },
  { value: 'moderator', label: 'Moderatör', level: 6 },
  { value: 'admin', label: 'Yönetici', level: 7 },
  { value: 'superadmin', label: 'Süper Admin', level: 9 },
  { value: 'owner', label: 'Sahip', level: 10 },
];

const PERMISSION_GROUPS = [
  {
    title: 'Kişisel',
    minRole: 'guest',
    permissions: [
      { key: 'self.change_name', label: 'İsim Değiştir' },
      { key: 'self.mic_test', label: 'Mikrofon Testi' },
      { key: 'self.stealth', label: 'Görünmezlik' },
      { key: 'self.webcam_1v1', label: 'Bire Bir WebCam' },
      { key: 'self.private_message', label: 'Özel Mesaj' },
    ],
  },
  {
    title: 'Oda Kontrolü',
    minRole: 'member',
    permissions: [
      { key: 'room.clear_chat_local', label: 'Sohbeti Temizle (Yerel)' },
      { key: 'room.freeze_chat_local', label: 'Sohbeti Dondur (Yerel)' },
      { key: 'room.freeze_chat_global', label: 'Sohbeti Dondur (Genel)' },
      { key: 'room.youtube', label: 'YouTube Paylaşımı' },
      { key: 'room.meeting_room', label: 'Toplantı Odası' },
    ],
  },
  {
    title: 'Yumuşak Moderasyon',
    minRole: 'operator',
    permissions: [
      { key: 'mod.mute', label: 'Sustur (Mute)' },
      { key: 'mod.gag', label: 'Yazı Yasağı (Gag)' },
      { key: 'mod.clear_text', label: 'Yazıları Sil' },
      { key: 'mod.kick', label: 'Atma (Kick)' },
      { key: 'mod.cam_block', label: 'Kamerayı Sonlandır' },
      { key: 'mod.give_mic', label: 'Mikrofon Serbest Bırak' },
      { key: 'mod.take_mic', label: 'Mikrofon Al' },
      { key: 'mod.move_to_room', label: 'Odaya Taşı' },
      { key: 'mod.move_to_meeting', label: 'Toplantıya Çek' },
      { key: 'mod.nudge', label: 'Titret (Nudge)' },
    ],
  },
  {
    title: 'Sert Moderasyon',
    minRole: 'moderator',
    permissions: [
      { key: 'mod.ban_permanent', label: 'Süresiz Ban' },
      { key: 'mod.ban_1day', label: '1 Gün Yasakla' },
      { key: 'mod.ban_1week', label: '1 Hafta Yasakla' },
      { key: 'mod.ban_1month', label: '1 Ay Yasakla' },
      { key: 'mod.ban_remove', label: 'Ban Kaldır' },
      { key: 'mod.gag_remove', label: 'Gag Kaldır' },
    ],
  },
  {
    title: 'Sistem Kontrolü',
    minRole: 'admin',
    permissions: [
      { key: 'ctrl.admin_panel', label: 'Yönetim Paneli' },
      { key: 'ctrl.users_global', label: 'Kullanıcı Listesi (Global)' },
      { key: 'ctrl.room_options', label: 'Oda Seçenekleri' },
      { key: 'ctrl.spy_rooms', label: 'Odaları Gözetle' },
      { key: 'ctrl.admin_add_user', label: 'Kullanıcı Ekle/Sil' },
    ],
  },
];

/* ═══ GÜVENLİ CUSTOM SWITCH ═══ */
function CustomSwitch({ value, onValueChange }: { value: boolean; onValueChange: (val: boolean) => void }) {
  const [anim] = useState(new Animated.Value(value ? 1 : 0));
  
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const bgColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.1)', '#8b5cf6'] });
  const transX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: 12, backgroundColor: bgColor as any }} />
      <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: transX }],
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2
      }} />
    </TouchableOpacity>
  );
}

export default function TenantAdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Detay Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await tenantAdminService.getUsers();
      let usersArray = [];
      if (res && Array.isArray(res.users)) usersArray = res.users;
      else if (Array.isArray(res)) usersArray = res;
      setUsers(usersArray);
    } catch (e: any) {
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = (user: any) => {
    setSelectedUser(user);
    setEditName(user.displayName || '');
    setEditRole(user.role || 'member');
    setEditPerms(user.permissions || {});
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaveLoading(true);
    try {
      await tenantAdminService.updateUser(selectedUser.id, {
        displayName: editName,
        role: editRole,
        permissions: editPerms,
      });
      Alert.alert('Başarılı', 'Kullanıcı güncellendi.');
      setSelectedUser(null);
      fetchUsers();
    } catch (e: any) {
      Alert.alert('Hata', 'Güncellenemedi: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kullanıcı Yönetimi</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchUsers}>
          <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
        <TextInput 
          style={s.searchInput}
          placeholder="İsim veya rol ile ara..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.2)" />
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
          {filteredUsers.length === 0 && (
             <Text style={s.emptyTxt}>Kullanıcı bulunamadı</Text>
          )}
          {filteredUsers.map((user) => (
            <TouchableOpacity key={user.id} style={s.userCard} onPress={() => openUserDetail(user)}>
              <View style={s.userAvatar}>
                <Text style={s.userAvatarTxt}>{(user.displayName || '?').charAt(0)}</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{user.displayName}</Text>
                <View style={s.badgeWrap}>
                  <Text style={s.roleBadge}>{ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}</Text>
                  {user.isOnline && <View style={s.onlineDot} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* USER EDIT MODAL */}
      <Modal visible={!!selectedUser} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Text style={s.modalCancel}>İptal</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Üye Düzenle</Text>
            <TouchableOpacity onPress={handleSave} disabled={saveLoading}>
              {saveLoading ? <ActivityIndicator size="small" /> : <Text style={s.modalSave}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.inputGroup}>
              <Text style={s.label}>KULLANICI ADI</Text>
              <TextInput style={s.input} value={editName} onChangeText={setEditName} />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>KULLANICI ROLÜ ({ROLE_OPTIONS.find(r => r.value === editRole)?.label})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                {ROLE_OPTIONS.map(ro => (
                  <TouchableOpacity 
                    key={ro.value}
                    style={[s.roleChip, editRole === ro.value && s.roleChipActive]}
                    onPress={() => setEditRole(ro.value)}
                  >
                    <Text style={[s.roleChipTxt, editRole === ro.value && s.roleChipTxtActive]}>{ro.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[s.label, { marginTop: 24, marginBottom: 8 }]}>DETAYLI YETKİLER</Text>
            {PERMISSION_GROUPS.map((group, i) => (
              <View key={i} style={s.permGroupObj}>
                <Text style={s.permGroupTitle}>{group.title}</Text>
                {group.permissions.map((perm) => (
                  <View key={perm.key} style={s.permRow}>
                    <Text style={s.permLabel}>{perm.label}</Text>
                    <CustomSwitch 
                      value={!!editPerms[perm.key]} 
                      onValueChange={(val) => setEditPerms(prev => ({ ...prev, [perm.key]: val }))} 
                    />
                  </View>
                ))}
              </View>
            ))}
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
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', margin: 16,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#f1f5f9' },
  listContent: { padding: 16, paddingVertical: 0 },
  emptyTxt: { textAlign: 'center', marginTop: 30, color: 'rgba(255,255,255,0.3)' },
  
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center' },
  userAvatarTxt: { fontSize: 16, fontWeight: '800', color: '#a78bfa' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge: { fontSize: 10, fontWeight: '700', color: '#a78bfa', backgroundColor: 'rgba(139,92,246,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },

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
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#f1f5f9'
  },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginRight: 8,
  },
  roleChipActive: { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: '#8b5cf6' },
  roleChipTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  roleChipTxtActive: { color: '#a78bfa', fontWeight: '700' },

  permGroupObj: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  permGroupTitle: { fontSize: 13, fontWeight: '800', color: '#f1f5f9', padding: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  permLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
});
