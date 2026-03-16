import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, Dimensions, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SHADOWS, AVATARS, GENDERS, getAvatarUrl, ROLE_CONFIG } from '../constants';
import { loginGuest, loginMember, fetchCustomers, registerMember } from '../services/api';
import type { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
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
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const custData = await fetchCustomers();
      if (Array.isArray(custData)) setCustomers(custData);
    } catch (e) { console.log('Customers fetch error:', e); }
  };

  const handleGuestLogin = async () => {
    if (!guestNick.trim()) return Alert.alert('Hata', 'Takma ad giriniz');
    if (!guestGender) return Alert.alert('Hata', 'Cinsiyet seçiniz');
    setLoading(true);
    try {
      const avatar = selectedAvatar || AVATARS[0];
      const data = await loginGuest(guestNick.trim(), guestGender, avatar);
      if (data?.access_token) {
        navigation.navigate('Rooms', { token: data.access_token, user: data.user });
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
      if (data?.access_token) {
        navigation.navigate('Rooms', { token: data.access_token, user: data.user });
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
      if (data?.access_token) {
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
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ═══ HEADER / LOGO ═══ */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Text style={s.logoSoprano}>Soprano</Text>
              <Text style={s.logoChat}>Chat</Text>
            </View>
            <Text style={s.tagline}>Senin Sesin</Text>
          </View>

          {/* ═══ HESAP PANELİ ═══ */}
          <View style={[s.glassPanel, SHADOWS.panel]}>
            {/* Panel kenar ışıması */}
            <View style={s.panelGlow} />

            <View style={s.panelHeaderRow}>
              <Text style={s.panelIcon}>👤</Text>
              <Text style={s.panelTitle}>HESAP PANELİ</Text>
            </View>

            {/* Sekmeler */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, loginTab === 'guest' && s.tabGuest]}
                onPress={() => { setLoginTab('guest'); setShowRegister(false); }}
              >
                <Text style={[s.tabText, loginTab === 'guest' && s.tabTextGuest]}>🟢 MİSAFİR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, loginTab === 'member' && s.tabMember]}
                onPress={() => { setLoginTab('member'); setShowRegister(false); }}
              >
                <Text style={[s.tabText, loginTab === 'member' && s.tabTextMember]}>⭐ ÜYE GİRİŞ</Text>
              </TouchableOpacity>
            </View>

            {loginTab === 'guest' ? (
              <>
                <Text style={s.label}>TAKMA ADINIZ</Text>
                <TextInput style={s.input} value={guestNick} onChangeText={setGuestNick}
                  placeholder="Nickname girin..." placeholderTextColor={COLORS.textMuted} />

                <Text style={s.label}>CİNSİYET</Text>
                <View style={s.genderRow}>
                  {GENDERS.map(g => (
                    <TouchableOpacity key={g.key}
                      style={[s.genderBtn, guestGender === g.key && { backgroundColor: `${g.color}20`, borderColor: `${g.color}50` }]}
                      onPress={() => setGuestGender(g.key)}>
                      <Text style={[s.genderText, guestGender === g.key && { color: g.color }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {guestGender ? (
                  <>
                    <Text style={s.label}>AVATAR</Text>
                    <View style={s.avatarGrid}>
                      {AVATARS.map(av => (
                        <TouchableOpacity key={av}
                          style={[s.avatarBtn, selectedAvatar === av && s.avatarSelected]}
                          onPress={() => setSelectedAvatar(av)}>
                          <Image source={{ uri: getAvatarUrl(av) }} style={s.avatarImg} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}

                <TouchableOpacity style={s.btnEmerald} onPress={handleGuestLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>→ MİSAFİR GİRİŞ</Text>}
                </TouchableOpacity>
              </>
            ) : !showRegister ? (
              <>
                <Text style={s.label}>KULLANICI ADI VEYA E-POSTA</Text>
                <TextInput style={s.input} value={memberUsername} onChangeText={setMemberUsername}
                  placeholder="Üye adınız veya e-posta" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />

                <Text style={s.label}>ŞİFRE</Text>
                <TextInput style={s.input} value={memberPassword} onChangeText={setMemberPassword}
                  placeholder="••••••••" placeholderTextColor={COLORS.textMuted} secureTextEntry />

                <TouchableOpacity style={s.btnRed} onPress={handleMemberLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>→ ÜYE GİRİŞİ</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowRegister(true)} style={s.linkBtn}>
                  <Text style={s.linkText}>Hesabın yok mu? <Text style={{ color: COLORS.red, fontWeight: '700' }}>Üye Ol</Text></Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[s.label, { textAlign: 'center', color: COLORS.red, fontSize: 13, marginBottom: 12 }]}>✨ Yeni Üyelik</Text>
                <Text style={s.label}>KULLANICI ADI</Text>
                <TextInput style={s.input} value={regUsername} onChangeText={setRegUsername}
                  placeholder="Kullanıcı adınız" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
                <Text style={s.label}>E-POSTA</Text>
                <TextInput style={s.input} value={regEmail} onChangeText={setRegEmail}
                  placeholder="ornek@mail.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" />
                <Text style={s.label}>ŞİFRE</Text>
                <TextInput style={s.input} value={regPassword} onChangeText={setRegPassword}
                  placeholder="En az 6 karakter" placeholderTextColor={COLORS.textMuted} secureTextEntry />
                <Text style={s.label}>CİNSİYET</Text>
                <View style={s.genderRow}>
                  {GENDERS.map(g => (
                    <TouchableOpacity key={g.key}
                      style={[s.genderBtn, regGender === g.key && { backgroundColor: `${g.color}20`, borderColor: `${g.color}50` }]}
                      onPress={() => setRegGender(g.key)}>
                      <Text style={[s.genderText, regGender === g.key && { color: g.color }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.btnRed} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>✨ ÜYE OL</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRegister(false)} style={s.linkBtn}>
                  <Text style={s.linkText}>← Giriş ekranına dön</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ═══ MÜŞTERİ PLATFORMLARI ═══ */}
          <View style={[s.glassPanel, SHADOWS.panel]}>
            <View style={s.panelGlow} />
            <View style={s.panelHeaderRow}>
              <Text style={s.panelIcon}>🏢</Text>
              <Text style={s.panelTitle}>Müşteri Platformları</Text>
            </View>
            <Text style={s.panelSubtitle}>SopranoChat altyapısıyla çalışan sohbet odalarına katılanlar.</Text>

            {customers.length === 0 ? (
              <View style={s.emptyState}>
                <ActivityIndicator color={COLORS.cyan} size="small" />
                <Text style={s.emptyText}>Platformlar yükleniyor...</Text>
              </View>
            ) : (
              customers.map((cust: any) => (
                <View key={cust.id} style={s.customerCard}>
                  <View style={s.customerInfo}>
                    {cust.logoUrl ? (
                      <Image source={{ uri: cust.logoUrl }} style={s.customerLogo} />
                    ) : (
                      <View style={[s.customerLogo, { backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 20 }}>🏢</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.customerName}>{cust.name}</Text>
                      <Text style={s.customerDetail}>Oda: {cust.slug || cust.name}</Text>
                      <View style={s.customerStats}>
                        <Text style={s.statText}>👥 {cust.onlineUsers || 0}</Text>
                        <Text style={s.statText}>🚪 {cust.roomCount || 0} oda</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={s.joinBtn}
                    onPress={() => Alert.alert('Giriş Gerekli', 'Önce hesap panelinden giriş yapın')}>
                    <Text style={s.joinBtnText}>KATIL</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* ═══ PREMIUM PAKET ═══ */}
          <View style={[s.glassPanel, SHADOWS.panel]}>
            <View style={s.panelGlow} />
            <Text style={s.premiumBadge}>⭐ PREMİUM PAKET</Text>
            <Text style={[s.panelTitle, { fontSize: 18, marginBottom: 8 }]}>Kendi Odanı Kur</Text>
            <Text style={s.panelSubtitle}>
              Yönetici yetkileri, HD yayın kalitesi ve şifreli giriş koruması ile kendi topluluğunuzu oluşturun.
            </Text>
            <TouchableOpacity style={s.btnGold}>
              <Text style={s.btnGoldText}>PAKETLERİ İNCELE</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ MÜŞTERİ HİZMETLERİ ═══ */}
          <View style={[s.glassPanel, SHADOWS.panel]}>
            <View style={s.panelGlow} />
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>💬</Text>
            <Text style={[s.panelTitle, { textAlign: 'center', fontSize: 13 }]}>MÜŞTERİ HİZMETLERİ</Text>
            <Text style={[s.panelSubtitle, { textAlign: 'center' }]}>Sorularınız ve önerileriniz için bize ulaşın.</Text>
            <TouchableOpacity style={s.btnIndigo}>
              <Text style={s.btnText}>📞 BİZE ULAŞIN</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ FOOTER ═══ */}
          <View style={s.footer}>
            <Text style={s.footerText}>© 2026 SOPRANOCHAT SYSTEMS.</Text>
            <Text style={[s.footerText, { marginTop: 4 }]}>KURALLAR · GİZLİLİK SÖZLEŞMESİ</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },

  // ═══ Header ═══
  header: { paddingTop: 60, paddingBottom: 28, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoSoprano: {
    fontSize: 36, fontWeight: '900', color: COLORS.bg,
    textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  logoChat: {
    fontSize: 36, fontWeight: '900', color: '#fbbf24',
    textShadowColor: 'rgba(251,191,36,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  tagline: { fontSize: 12, color: COLORS.bg, fontWeight: '600', letterSpacing: 3, marginTop: 4, opacity: 0.6 },

  // ═══ Glassmorphic Panel ═══
  glassPanel: {
    marginHorizontal: 16, marginBottom: 18, padding: 18,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  panelGlow: {
    position: 'absolute', top: -1, left: -1, right: -1, height: 2,
    backgroundColor: COLORS.borderGlow,
  },
  panelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  panelIcon: { fontSize: 16 },
  panelTitle: { fontSize: 13, fontWeight: '900', color: COLORS.white, textTransform: 'uppercase', letterSpacing: 2 },
  panelSubtitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 12, lineHeight: 18 },

  // ═══ Tabs ═══
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'transparent',
  },
  tabGuest: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' },
  tabMember: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)' },
  tabText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 },
  tabTextGuest: { color: COLORS.emerald },
  tabTextMember: { color: '#fca5a5' },

  // ═══ Forms ═══
  label: {
    fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase',
    letterSpacing: 2, marginBottom: 6, marginLeft: 2, marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: COLORS.white, fontWeight: '500',
  },

  // ═══ Gender ═══
  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'transparent',
  },
  genderText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },

  // ═══ Avatars ═══
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8,
    justifyContent: 'center', paddingVertical: 4,
  },
  avatarBtn: {
    padding: 3, borderRadius: 28, borderWidth: 2, borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10,
    elevation: 6,
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },

  // ═══ Buttons ═══
  btnEmerald: {
    backgroundColor: COLORS.emerald, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    marginTop: 18,
    shadowColor: COLORS.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 6,
  },
  btnRed: {
    backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    marginTop: 18,
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 6,
  },
  btnIndigo: {
    backgroundColor: COLORS.indigo, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    marginTop: 14,
    shadowColor: COLORS.indigo, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 6,
  },
  btnText: { fontSize: 13, fontWeight: '800', color: COLORS.white, letterSpacing: 1.5 },
  btnGold: {
    backgroundColor: 'rgba(251,191,36,0.15)', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)', marginTop: 14,
  },
  btnGoldText: { fontSize: 12, fontWeight: '800', color: COLORS.gold, letterSpacing: 2 },
  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // ═══ Customers ═══
  customerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  customerLogo: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  customerName: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  customerDetail: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  customerStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  joinBtn: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.red,
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 4,
  },
  joinBtnText: { fontSize: 10, fontWeight: '900', color: COLORS.white, letterSpacing: 1.5 },

  // ═══ States ═══
  emptyState: { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  premiumBadge: { fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 2, marginBottom: 8 },

  // ═══ Footer ═══
  footer: { paddingVertical: 28, alignItems: 'center' },
  footerText: { fontSize: 10, color: 'rgba(7,11,20,0.4)', fontWeight: '700', letterSpacing: 1.5 },
});
