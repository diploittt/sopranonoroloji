import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, AVATARS, getAvatarUrl } from '../constants';
import { updateProfile } from '../services/api';
import { clearSession } from '../../App';

export default function ProfileScreen({ navigation, route }: any) {
  const { token, user } = route.params || {};
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATARS[0]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateProfile(token, { username: nickname, avatar: selectedAvatar });
      if (result?.error) Alert.alert('Hata', result.message);
      else { Alert.alert('Başarılı', 'Profil güncellendi'); setEditing(false); }
    } catch (e) { Alert.alert('Hata', 'Profil güncellenemedi'); }
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Oturumu sonlandırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
        await clearSession();
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  };

  const ri = user?.role ? { color: '#5ec8c8', label: user.role } : { color: '#94a3b8', label: 'Misafir' };

  return (
    <View style={st.root}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Profil Kartı */}
        <View style={st.card}>
          <LinearGradient colors={['rgba(94,200,200,0.08)', 'transparent']} style={st.cardShine} />
          <View style={st.avatarArea}>
            <Image source={{ uri: getAvatarUrl(selectedAvatar) }} style={st.avatar} />
            <View style={st.onlineDot} />
          </View>
          <Text style={st.username}>{user?.username || 'Kullanıcı'}</Text>
          <View style={st.roleBadge}>
            <View style={[st.roleDot, { backgroundColor: ri.color }]} />
            <Text style={[st.roleText, { color: ri.color }]}>{ri.label}</Text>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={st.statsRow}>
          {[
            { label: 'Takipçi', value: user?.followerCount || 0, icon: 'people' as const },
            { label: 'Takip', value: user?.followingCount || 0, icon: 'person-add' as const },
            { label: 'Mesaj', value: user?.messageCount || 0, icon: 'chatbubble' as const },
          ].map((s, i) => (
            <TouchableOpacity key={i} style={st.statCard}>
              <Ionicons name={s.icon} size={18} color="#5ec8c8" />
              <Text style={st.statVal}>{s.value}</Text>
              <Text style={st.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Profil Düzenleme */}
        <View style={st.section}>
          <View style={st.sectionHead}>
            <Ionicons name="create-outline" size={16} color="#5ec8c8" />
            <Text style={st.sectionTitle}>Profil Bilgileri</Text>
          </View>

          <View style={st.field}>
            <Text style={st.fieldLabel}>KULLANICI ADI</Text>
            <TextInput style={st.input} value={nickname} onChangeText={setNickname}
              editable={editing} placeholderTextColor="#4a5568" />
          </View>

          <View style={st.field}>
            <Text style={st.fieldLabel}>E-POSTA</Text>
            <TextInput style={st.input} value={email} onChangeText={setEmail}
              editable={editing} placeholderTextColor="#4a5568" keyboardType="email-address" />
          </View>

          {editing && (
            <View>
              <Text style={st.fieldLabel}>AVATAR SEÇ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {AVATARS.map((a, i) => (
                  <TouchableOpacity key={i} onPress={() => setSelectedAvatar(a)}
                    style={[st.avatarOption, selectedAvatar === a && st.avatarSelected]}>
                    <Image source={{ uri: getAvatarUrl(a) }} style={st.avatarThumb} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {editing ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditing(false)}>
                <View style={st.cancelBtn}><Text style={st.cancelText}>İptal</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} onPress={handleSave} disabled={loading}>
                <LinearGradient colors={['#5ec8c8', '#3a9e9e']} style={st.saveBtn}>
                  {loading ? <ActivityIndicator color="#0a0f1d" size="small" /> :
                    <Text style={st.saveText}>Kaydet</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={{ marginTop: 14 }}>
              <LinearGradient colors={['rgba(94,200,200,0.15)', 'rgba(94,200,200,0.05)']} style={st.editBtn}>
                <Ionicons name="create" size={16} color="#5ec8c8" />
                <Text style={st.editText}>Düzenle</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Menü */}
        <View style={st.section}>
          {[
            { icon: 'shield-checkmark' as const, label: 'Gizlilik Ayarları', color: '#7b9fef' },
            { icon: 'notifications-outline' as const, label: 'Bildirim Tercihleri', color: '#fbbf24' },
            { icon: 'help-circle-outline' as const, label: 'Yardım & Destek', color: '#34d399' },
            { icon: 'information-circle-outline' as const, label: 'Hakkında', color: '#94a3b8' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={st.menuItem}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={st.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#4a5568" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Çıkış */}
        <TouchableOpacity onPress={handleLogout} style={{ marginHorizontal: 14, marginTop: 8 }}>
          <View style={st.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={st.logoutText}>Çıkış Yap</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2d3548' },
  scroll: { paddingBottom: 30, paddingTop: 14 },

  card: {
    alignItems: 'center', marginHorizontal: 14, padding: 24, borderRadius: 18,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  avatarArea: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(94,200,200,0.3)' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#10b981', borderWidth: 3, borderColor: '#1e222e',
  },
  username: { fontSize: 20, fontWeight: '800', color: '#e2e8f0' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 14 },
  statCard: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statVal: { fontSize: 18, fontWeight: '900', color: '#e2e8f0', marginTop: 4 },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },

  section: {
    marginHorizontal: 14, marginTop: 14, padding: 16, borderRadius: 16,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#e2e8f0', letterSpacing: 1 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#e2e8f0', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  avatarOption: { marginRight: 8, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  avatarSelected: { borderColor: '#5ec8c8' },
  avatarThumb: { width: 40, height: 40, borderRadius: 20 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(94,200,200,0.2)',
  },
  editText: { fontSize: 13, fontWeight: '700', color: '#5ec8c8' },

  cancelBtn: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

  saveBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  saveText: { fontSize: 13, fontWeight: '800', color: '#0a0f1d' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuLabel: { flex: 1, fontSize: 14, color: '#e2e8f0', fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
