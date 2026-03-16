import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, Dimensions, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, AVATARS, GENDERS, getAvatarUrl, ROLE_CONFIG } from '../constants';
import { loginGuest, loginMember, fetchCustomers, registerMember } from '../services/api';
import type { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  // Auth state
  const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
  const [guestNick, setGuestNick] = useState('');
  const [guestGender, setGuestGender] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState('');

  // Rooms state
  const [customers, setCustomers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const custData = await fetchCustomers();
      if (Array.isArray(custData)) setCustomers(custData);
    } catch (e) {
      console.log('Customers fetch error:', e);
    }
  };

  const handleGuestLogin = async () => {
    if (!guestNick.trim()) return Alert.alert('Hata', 'Takma ad giriniz');
    if (!guestGender) return Alert.alert('Hata', 'Cinsiyet seçiniz');
    setLoading(true);
    try {
      const avatar = selectedAvatar || AVATARS[0];
      const data = await loginGuest(guestNick.trim(), guestGender, avatar);
      if (data?.token) {
        // İlk odaya git
        const slug = rooms.length > 0 ? rooms[0].slug : 'genel-sohbet';
        navigation.navigate('Room', { slug, token: data.token, user: data.user });
      } else {
        Alert.alert('Hata', data?.message || 'Giriş başarısız');
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bağlantı hatası');
    }
    setLoading(false);
  };

  const handleMemberLogin = async () => {
    if (!memberUsername.trim() || !memberPassword) return Alert.alert('Hata', 'Tüm alanları doldurunuz');
    setLoading(true);
    try {
      const data = await loginMember(memberUsername.trim(), memberPassword);
      if (data?.token) {
        const slug = rooms.length > 0 ? rooms[0].slug : 'genel-sohbet';
        navigation.navigate('Room', { slug, token: data.token, user: data.user });
      } else {
        Alert.alert('Hata', data?.message || 'Giriş başarısız');
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bağlantı hatası');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!regUsername || !regEmail || !regPassword) return Alert.alert('Hata', 'Tüm alanları doldurunuz');
    setLoading(true);
    try {
      const data = await registerMember({ username: regUsername, email: regEmail, password: regPassword, gender: regGender || 'Belirsiz' });
      if (data?.token) {
        Alert.alert('Başarılı', 'Hesap oluşturuldu!');
        setShowRegister(false);
      } else {
        Alert.alert('Hata', data?.message || 'Kayıt başarısız');
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bağlantı hatası');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ═══ HEADER / LOGO ═══ */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoSoprano}>Soprano</Text>
            <Text style={styles.logoChat}>Chat</Text>
          </View>
          <Text style={styles.tagline}>Senin Sesin</Text>
        </View>

        {/* ═══ HESAP PANELİ ═══ */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>👤 HESAP PANELİ</Text>
          </View>

          {/* Sekmeler */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, loginTab === 'guest' && styles.tabActiveGuest]}
              onPress={() => { setLoginTab('guest'); setShowRegister(false); }}
            >
              <Text style={[styles.tabText, loginTab === 'guest' && styles.tabTextActive]}>👤 Misafir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginTab === 'member' && styles.tabActiveMember]}
              onPress={() => { setLoginTab('member'); setShowRegister(false); }}
            >
              <Text style={[styles.tabText, loginTab === 'member' && styles.tabTextActiveMember]}>⭐ Üye Giriş</Text>
            </TouchableOpacity>
          </View>

          {loginTab === 'guest' ? (
            <>
              {/* Takma Ad */}
              <Text style={styles.label}>TAKMA ADINIZ</Text>
              <TextInput
                style={styles.input}
                value={guestNick}
                onChangeText={setGuestNick}
                placeholder="Nickname girin..."
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Cinsiyet */}
              <Text style={styles.label}>CİNSİYET</Text>
              <View style={styles.genderRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.genderBtn, guestGender === g.key && { backgroundColor: `${g.color}30`, borderColor: `${g.color}60` }]}
                    onPress={() => setGuestGender(g.key)}
                  >
                    <Text style={[styles.genderText, guestGender === g.key && { color: g.color }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Avatarlar */}
              {guestGender ? (
                <View style={styles.avatarGrid}>
                  {AVATARS.map(av => (
                    <TouchableOpacity
                      key={av}
                      style={[styles.avatarBtn, selectedAvatar === av && styles.avatarSelected]}
                      onPress={() => setSelectedAvatar(av)}
                    >
                      <Image source={{ uri: getAvatarUrl(av) }} style={styles.avatarImg} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Giriş Butonu */}
              <TouchableOpacity style={styles.btnBlue} onPress={handleGuestLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>→ Misafir Giriş</Text>}
              </TouchableOpacity>
            </>
          ) : !showRegister ? (
            <>
              {/* Üye Giriş */}
              <Text style={styles.label}>KULLANICI ADI VEYA E-POSTA</Text>
              <TextInput
                style={styles.input}
                value={memberUsername}
                onChangeText={setMemberUsername}
                placeholder="Üye adınız veya e-posta"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.label}>ŞİFRE</Text>
              <TextInput
                style={styles.input}
                value={memberPassword}
                onChangeText={setMemberPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
              />

              {/* Avatarlar */}
              <View style={styles.avatarGrid}>
                {AVATARS.map(av => (
                  <TouchableOpacity
                    key={av}
                    style={[styles.avatarBtn, selectedAvatar === av && styles.avatarSelected]}
                    onPress={() => setSelectedAvatar(av)}
                  >
                    <Image source={{ uri: getAvatarUrl(av) }} style={[styles.avatarImg, { width: 36, height: 36 }]} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.btnRed} onPress={handleMemberLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>→ Üye Girişi</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowRegister(true)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Hesabın yok mu? <Text style={{ color: COLORS.red, fontWeight: '700' }}>Üye Ol</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Kayıt Formu */}
              <Text style={[styles.label, { textAlign: 'center', color: COLORS.red, fontSize: 14, marginBottom: 12 }]}>✨ Yeni Üyelik</Text>
              <Text style={styles.label}>KULLANICI ADI</Text>
              <TextInput style={styles.input} value={regUsername} onChangeText={setRegUsername} placeholder="Kullanıcı adınız" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
              <Text style={styles.label}>E-POSTA</Text>
              <TextInput style={styles.input} value={regEmail} onChangeText={setRegEmail} placeholder="ornek@mail.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.label}>ŞİFRE</Text>
              <TextInput style={styles.input} value={regPassword} onChangeText={setRegPassword} placeholder="En az 6 karakter" placeholderTextColor={COLORS.textMuted} secureTextEntry />
              <Text style={styles.label}>CİNSİYET</Text>
              <View style={styles.genderRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.genderBtn, regGender === g.key && { backgroundColor: `${g.color}30`, borderColor: `${g.color}60` }]}
                    onPress={() => setRegGender(g.key)}
                  >
                    <Text style={[styles.genderText, regGender === g.key && { color: g.color }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.btnRed} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>✨ Üye Ol</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRegister(false)} style={styles.linkBtn}>
                <Text style={styles.linkText}>← Giriş ekranına dön</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ═══ MÜŞTERİ PLATFORMLARI ═══ */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>🏢 Müşteri Platformları</Text>
            <Text style={styles.panelSubtitle}>SopranoChat altyapısıyla çalışan sohbet odalarına katılanllar.</Text>
          </View>

          {customers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Platformlar yükleniyor...</Text>
            </View>
          ) : (
            customers.map((cust: any) => (
              <View key={cust.id} style={styles.roomCard}>
                <View style={styles.roomInfo}>
                  {cust.logoUrl ? (
                    <Image source={{ uri: cust.logoUrl }} style={styles.roomLogo} />
                  ) : (
                    <View style={[styles.roomLogo, { backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 20 }}>🏢</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{cust.name}</Text>
                    <Text style={styles.roomDetail}>Oda: {cust.slug || cust.name}</Text>
                    <View style={styles.roomStats}>
                      <Text style={styles.roomStatText}>👥 {cust.onlineUsers || 0}</Text>
                      <Text style={styles.roomStatText}>🚪 {cust.roomCount || 0} oda</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Alert.alert('Giriş Gerekli', 'Önce hesap panelinden giriş yapın')}
                >
                  <Text style={styles.joinBtnText}>KATIL</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ═══ PREMIUM PAKET ═══ */}
        <View style={styles.panel}>
          <Text style={styles.premiumBadge}>⭐ PREMİUM PAKET</Text>
          <Text style={[styles.panelTitle, { fontSize: 16, marginBottom: 6 }]}>Kendi Odanı Kur</Text>
          <Text style={styles.panelSubtitle}>
            Yönetici yetkileri, HD yayın kalitesi ve şifreli giriş koruması ile kendi topluluğunuzu oluşturun.
          </Text>
          <TouchableOpacity style={styles.btnGold}>
            <Text style={styles.btnGoldText}>PAKETLERİ İNCELE</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ MÜŞTERİ HİZMETLERİ ═══ */}
        <View style={styles.panel}>
          <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>💬</Text>
          <Text style={[styles.panelTitle, { textAlign: 'center' }]}>MÜŞTERİ HİZMETLERİ</Text>
          <Text style={[styles.panelSubtitle, { textAlign: 'center' }]}>Sorularınız ve önerileriniz için bize ulaşın.</Text>
          <TouchableOpacity style={[styles.btnBlue, { marginTop: 12 }]}>
            <Text style={styles.btnText}>📞 BİZE ULAŞIN</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 SopranoChat Systems.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: { paddingTop: 60, paddingBottom: 24, alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'baseline' },
  logoSoprano: { fontSize: 32, fontWeight: '900', color: COLORS.white, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  logoChat: { fontSize: 32, fontWeight: '900', color: COLORS.cyan, textShadowColor: COLORS.cyanGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  tagline: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 3, marginTop: 4 },

  // Panel
  panel: {
    marginHorizontal: 16, marginBottom: 16, padding: 16,
    backgroundColor: 'rgba(22, 27, 46, 0.9)',
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  panelHeader: { marginBottom: 14 },
  panelTitle: { fontSize: 12, fontWeight: '900', color: COLORS.white, textTransform: 'uppercase', letterSpacing: 2 },
  panelSubtitle: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 4 },

  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center' },
  tabActiveGuest: { backgroundColor: 'rgba(56,189,248,0.2)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)' },
  tabActiveMember: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabTextActive: { color: '#7dd3fc' },
  tabTextActiveMember: { color: '#fca5a5' },

  // Forms
  label: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, marginLeft: 2, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.white, fontWeight: '500',
  },

  // Gender
  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'transparent',
  },
  genderText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },

  // Avatars
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
    justifyContent: 'center',
  },
  avatarBtn: {
    padding: 3, borderRadius: 25, borderWidth: 2, borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: COLORS.cyan, transform: [{ scale: 1.1 }],
    shadowColor: COLORS.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },

  // Buttons
  btnBlue: {
    backgroundColor: 'rgba(56,189,248,0.2)', paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.4)', marginTop: 16,
    shadowColor: COLORS.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnRed: {
    backgroundColor: 'rgba(239,68,68,0.2)', paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', marginTop: 16,
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnText: { fontSize: 12, fontWeight: '700', color: COLORS.white, letterSpacing: 1 },
  btnGold: {
    backgroundColor: 'rgba(251,191,36,0.15)', paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', marginTop: 12,
  },
  btnGoldText: { fontSize: 11, fontWeight: '800', color: COLORS.gold, letterSpacing: 2 },
  linkBtn: { paddingVertical: 8, alignItems: 'center' },
  linkText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Rooms
  roomCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  roomInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  roomLogo: { width: 42, height: 42, borderRadius: 12, overflow: 'hidden' },
  roomName: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  roomDetail: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  roomStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  roomStatText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  joinBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(56,189,248,0.2)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)',
  },
  joinBtnText: { fontSize: 10, fontWeight: '800', color: COLORS.cyan, letterSpacing: 1.5 },

  // States
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  // Premium
  premiumBadge: { fontSize: 9, fontWeight: '800', color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },

  // Footer
  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
});
