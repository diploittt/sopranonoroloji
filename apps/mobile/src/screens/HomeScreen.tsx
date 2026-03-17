import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, Dimensions, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, AVATARS, GENDERS, getAvatarUrl } from '../constants';
import { loginGuest, loginMember, fetchCustomers, registerMember, fetchRooms } from '../services/api';
import { saveSession } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const BG = '#2d3548';

export default function HomeScreen({ navigation }: Props) {
  const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
  const [guestNick, setGuestNick] = useState('');
  const [guestGender, setGuestGender] = useState('');
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
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const d = await fetchCustomers(); if (Array.isArray(d)) setCustomers(d); }
    catch (e) { console.log('Customers err:', e); }
    try { const r = await fetchRooms(); if (Array.isArray(r)) setRooms(r); }
    catch (e) { console.log('Rooms err:', e); }
  };

  const handleGuestLogin = async () => {
    if (!guestNick.trim()) return Alert.alert('Hata', 'Takma ad giriniz');
    if (!guestGender) return Alert.alert('Hata', 'Cinsiyet seçiniz');
    setLoading(true);
    try {
      const data = await loginGuest(guestNick.trim(), guestGender, selectedAvatar || AVATARS[0]);
      if (data?.access_token) {
        await saveSession(data.access_token, data.user);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { token: data.access_token, user: data.user } }] });
      } else Alert.alert('Hata', data?.message || 'Giriş başarısız');
    } catch (e: any) { Alert.alert('Hata', e.message || 'Bağlantı hatası'); }
    setLoading(false);
  };

  const handleMemberLogin = async () => {
    if (!memberUsername.trim() || !memberPassword) return Alert.alert('Hata', 'Tüm alanları doldurunuz');
    setLoading(true);
    try {
      const data = await loginMember(memberUsername.trim(), memberPassword);
      if (data?.access_token) {
        await saveSession(data.access_token, data.user);
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { token: data.access_token, user: data.user } }] });
      } else Alert.alert('Hata', data?.message || 'Kullanıcı adı veya şifre hatalı');
    } catch (e: any) { Alert.alert('Hata', e.message || 'Bağlantı hatası'); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regGender)
      return Alert.alert('Hata', 'Tüm alanları doldurunuz');
    setLoading(true);
    try {
      const data = await registerMember(regUsername.trim(), regEmail.trim(), regPassword, regGender);
      if (data?.id || data?.access_token) {
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu! Giriş yapabilirsiniz.');
        setShowRegister(false); setLoginTab('member');
      } else Alert.alert('Hata', data?.message || 'Kayıt başarısız');
    } catch (e: any) { Alert.alert('Hata', e.message || 'Bağlantı hatası'); }
    setLoading(false);
  };

  const FEATURES = [
    { icon: 'mic' as const, color: '#5ec8c8', title: 'Canlı Ses', desc: 'HD kalite' },
    { icon: 'videocam' as const, color: '#a78bfa', title: 'Kamera', desc: 'Görüntülü sohbet' },
    { icon: 'people' as const, color: '#fbbf24', title: 'Topluluk', desc: 'Binlerce kullanıcı' },
    { icon: 'shield-checkmark' as const, color: '#34d399', title: 'Güvenli', desc: 'Şifreli bağlantı' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(94,200,200,0.06)', 'transparent', 'rgba(167,139,250,0.04)']}
        style={StyleSheet.absoluteFill}
      />

      {/* ═══ HEADER — Web navbar stili ═══ */}
      <View style={s.header}>
        <LinearGradient
          colors={['#1e2533', '#252d3e', '#1a2030']}
          style={StyleSheet.absoluteFill}
        />
        {/* Gold alt çizgi */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 }}>
          <LinearGradient colors={['transparent', '#c9a84c', '#e8c97a', '#c9a84c', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.logoBox}>
            <LinearGradient colors={['#06b6d4', '#14b8a6']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="musical-notes" size={18} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={s.logoText}>
              <Text style={{ fontFamily: 'CooperBlack', color: '#ffffff' }}>Soprano</Text>
              <Text style={{ fontFamily: 'CooperBlack', color: '#06b6d4' }}>Chat</Text>
            </Text>
            <Text style={s.logoSub}>Senin Sesin</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ═══ GİRİŞ PANELİ ═══ */}
          <View style={s.panel}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={s.panelShine} />

            {/* Giriş Sekmeleri */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, loginTab === 'guest' && s.tabGuestActive]}
                onPress={() => { setLoginTab('guest'); setShowRegister(false); }}
              >
                <Text style={[s.tabText, loginTab === 'guest' && { color: '#10b981' }]}>🎭 MİSAFİR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, loginTab === 'member' && s.tabMemberActive]}
                onPress={() => { setLoginTab('member'); setShowRegister(false); }}
              >
                <Text style={[s.tabText, loginTab === 'member' && { color: '#ef4444' }]}>🔑 ÜYE</Text>
              </TouchableOpacity>
            </View>

            {loginTab === 'guest' && !showRegister && (
              <>
                <Text style={s.label}>TAKMA AD</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.input} placeholder="Adınızı girin..." placeholderTextColor="#4a5568"
                    value={guestNick} onChangeText={setGuestNick} />
                </View>
                <Text style={s.label}>CİNSİYET</Text>
                <View style={s.genderRow}>
                  {GENDERS.map(g => (
                    <TouchableOpacity key={g.key} style={[s.genderBtn, guestGender === g.key && { backgroundColor: 'rgba(94,200,200,0.15)', borderColor: g.color as string }]}
                      onPress={() => setGuestGender(g.key as string)}>
                      <Text style={[s.genderText, guestGender === g.key && { color: g.color as string }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.label}>AVATAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.avatarScroll}>
                  {AVATARS.map(av => (
                    <TouchableOpacity key={av} style={[s.avatarBtn, selectedAvatar === av && s.avatarSel]}
                      onPress={() => setSelectedAvatar(av)}>
                      <Image source={{ uri: getAvatarUrl(av) }} style={s.avatarImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={handleGuestLogin} disabled={loading}>
                  <LinearGradient colors={['#10b981', '#059669']} style={s.btnGreen}>
                    <Text style={s.btnText}>{loading ? 'Giriş Yapılıyor...' : 'MİSAFİR GİRİŞİ'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {loginTab === 'member' && !showRegister && (
              <>
                <Text style={s.label}>KULLANICI ADI</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.input} placeholder="Kullanıcı adı" placeholderTextColor="#4a5568"
                    value={memberUsername} onChangeText={setMemberUsername} autoCapitalize="none" />
                </View>
                <Text style={s.label}>ŞİFRE</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.input} placeholder="Şifre" placeholderTextColor="#4a5568"
                    value={memberPassword} onChangeText={setMemberPassword} secureTextEntry />
                </View>
                <TouchableOpacity onPress={handleMemberLogin} disabled={loading}>
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={s.btnRed}>
                    <Text style={s.btnText}>{loading ? 'Giriş Yapılıyor...' : 'ÜYE GİRİŞİ'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.linkBtn} onPress={() => setShowRegister(true)}>
                  <Text style={s.linkText}>Hesabın yok mu? Kayıt ol →</Text>
                </TouchableOpacity>
              </>
            )}

            {showRegister && (
              <>
                <Text style={[s.panelTitle, { marginBottom: 14 }]}>ÜYE KAYDOL</Text>
                <Text style={s.label}>KULLANICI ADI</Text>
                <View style={s.inputWrap}><TextInput style={s.input} placeholder="Kullanıcı adı" placeholderTextColor="#4a5568" value={regUsername} onChangeText={setRegUsername} autoCapitalize="none" /></View>
                <Text style={s.label}>E-POSTA</Text>
                <View style={s.inputWrap}><TextInput style={s.input} placeholder="E-posta" placeholderTextColor="#4a5568" value={regEmail} onChangeText={setRegEmail} autoCapitalize="none" keyboardType="email-address" /></View>
                <Text style={s.label}>ŞİFRE</Text>
                <View style={s.inputWrap}><TextInput style={s.input} placeholder="Şifre" placeholderTextColor="#4a5568" value={regPassword} onChangeText={setRegPassword} secureTextEntry /></View>
                <Text style={s.label}>CİNSİYET</Text>
                <View style={s.genderRow}>
                  {GENDERS.map(g => (
                    <TouchableOpacity key={g.key} style={[s.genderBtn, regGender === g.key && { backgroundColor: 'rgba(94,200,200,0.15)', borderColor: g.color as string }]} onPress={() => setRegGender(g.key as string)}>
                      <Text style={[s.genderText, regGender === g.key && { color: g.color as string }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={handleRegister} disabled={loading}>
                  <LinearGradient colors={['#7b9fef', '#5a7fd4']} style={s.btnBlue}>
                    <Text style={s.btnText}>{loading ? 'Kaydediliyor...' : 'KAYIT OL'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.linkBtn} onPress={() => setShowRegister(false)}>
                  <Text style={s.linkText}>← Geri dön</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ═══ ÖZELLİKLER ═══ */}
          <View style={s.panel}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={s.panelShine} />
            <View style={s.panelHead}>
              <Ionicons name="sparkles" size={20} color="#5ec8c8" />
              <Text style={s.panelTitle}>SopranoChat Nedir?</Text>
            </View>
            <Text style={s.panelSub}>Gerçek zamanlı sesli ve görüntülü sohbet platformu. Binlerce kullanıcıyla bağlan.</Text>
            <View style={s.featureGrid}>
              {FEATURES.map((f, i) => (
                <View key={i} style={s.featureCard}>
                  <Ionicons name={f.icon} size={22} color={f.color} />
                  <View>
                    <Text style={[s.featureTitle, { color: f.color }]}>{f.title}</Text>
                    <Text style={s.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ═══ SOHBET ODALARI + KİRACILAR ═══ */}
          <View style={s.panel}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={s.panelShine} />
            <View style={s.panelHead}>
              <Ionicons name="chatbubbles" size={20} color="#5ec8c8" />
              <Text style={s.panelTitle}>Sohbet Odaları</Text>
            </View>
            <Text style={s.panelSub}>Tüm odalara katılabilir, arkadaşlarınla sohbet edebilirsin.</Text>

            {rooms.length === 0 && customers.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#5ec8c8" size="small" />
              </View>
            ) : (
              <>
                {rooms.map((room: any) => (
                  <View key={'r-' + room.id} style={s.custCard}>
                    <View style={s.custInfo}>
                      <View style={[s.custLogo, { backgroundColor: 'rgba(94,200,200,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(94,200,200,0.2)' }]}>
                        <Ionicons name={room.isVipRoom ? 'diamond' : 'chatbubble'} size={18} color={room.isVipRoom ? '#fbbf24' : '#5ec8c8'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.custName}>{room.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                          <Text style={s.custStat}>
                            <Ionicons name="people" size={12} color="#94a3b8" /> {room.participantCount || room._count?.participants || 0} çevrimiçi
                          </Text>
                          {room.isVipRoom && <Text style={[s.custStat, { color: '#fbbf24' }]}>⭐ VIP</Text>}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity>
                      <LinearGradient colors={['#5ec8c8', '#3a9e9e']} style={s.joinBtn}>
                        <Text style={s.joinText}>GİR</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}

                {customers.map((c: any) => (
                  <View key={'c-' + c.id} style={s.custCard}>
                    <View style={s.custInfo}>
                      {c.logoUrl
                        ? <Image source={{ uri: c.logoUrl }} style={s.custLogo} />
                        : <View style={[s.custLogo, { backgroundColor: 'rgba(167,139,250,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }]}>
                            <Ionicons name="business" size={18} color="#a78bfa" />
                          </View>
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={s.custName}>{c.roomName || c.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                          <Text style={s.custStat}>
                            <Ionicons name="people" size={12} color="#94a3b8" /> {c.onlineUsers || 0} çevrimiçi
                          </Text>
                          <Text style={[s.custStat, { color: '#a78bfa' }]}>● Kiracı Odası</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity>
                      <LinearGradient colors={['#a78bfa', '#7c3aed']} style={s.joinBtn}>
                        <Text style={s.joinText}>GİR</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* ═══ PREMİUM PAKET ═══ */}
          <View style={s.panel}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={s.panelShine} />
            <View style={s.premBadge}><Text style={s.premBadgeText}>⭐ PREMİUM PAKET</Text></View>
            <Text style={[s.heroTitle, { fontSize: 16 }]}>Kendi Odanı Kur</Text>
            <Text style={s.panelSub}>Yönetici yetkileri, HD yayın kalitesi ve şifreli giriş koruması.</Text>
            <TouchableOpacity>
              <LinearGradient colors={['rgba(251,191,36,0.15)', 'rgba(251,191,36,0.05)']}
                style={[s.btnOutline, { borderColor: 'rgba(251,191,36,0.3)' }]}>
                <Text style={[s.btnOutlineText, { color: '#fbbf24' }]}>PAKETLERİ İNCELE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ═══ MÜŞTERİ HİZMETLERİ ═══ */}
          <View style={s.panel}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent']} style={s.panelShine} />
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>💬</Text>
            <Text style={[s.panelTitle, { textAlign: 'center', fontSize: 11 }]}>MÜŞTERİ HİZMETLERİ</Text>
            <Text style={[s.panelSub, { textAlign: 'center', marginTop: 4 }]}>Sorularınız için 7/24 destek</Text>
            <TouchableOpacity>
              <LinearGradient colors={['rgba(94,200,200,0.1)', 'transparent']}
                style={[s.btnOutline, { borderColor: 'rgba(94,200,200,0.2)', marginTop: 6 }]}>
                <Text style={[s.btnOutlineText, { color: '#5ec8c8' }]}>DESTEK HAT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>© 2025 SOPRANO CHAT • TÜM HAKLAR SAKLIDIR</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  // ═══ HEADER ═══
  header: {
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    position: 'relative', zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoBox: {
    width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
    shadowColor: '#5ec8c8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  logoText: { fontSize: 22, letterSpacing: 0.5 },
  logoSub: { fontSize: 8, color: 'rgba(6,182,212,0.4)', fontFamily: 'CooperBlack', letterSpacing: 2, textTransform: 'uppercase' },

  scroll: { paddingBottom: 30, paddingTop: 14 },

  // ═══ PANEL — #2d3548 zeminde görünür cam panel ═══
  panel: {
    marginHorizontal: 14, marginBottom: 14, padding: 16, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 8,
  },
  panelShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle: { fontSize: 11, fontWeight: '900', color: '#e2e8f0', letterSpacing: 2, textTransform: 'uppercase' },
  panelSub: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 12, lineHeight: 17 },

  // ═══ TABS ═══
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'transparent',
  },
  tabGuestActive: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  tabMemberActive: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  tabText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5 },

  // ═══ FORMS ═══
  label: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 2, marginBottom: 5, marginTop: 10, marginLeft: 2 },
  inputWrap: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  input: { paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: '#e2e8f0' },
  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'transparent',
  },
  genderText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5 },
  avatarScroll: { marginTop: 4 },
  avatarBtn: { padding: 2, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  avatarSel: {
    borderColor: '#5ec8c8',
    shadowColor: '#5ec8c8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },

  // ═══ BUTTONS ═══
  btnGreen: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnRed: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnBlue: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  btnOutline: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, marginTop: 12 },
  btnOutlineText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkText: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  // ═══ HERO ═══
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#e2e8f0', textAlign: 'center', marginBottom: 8 },
  heroDesc: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 17, fontWeight: '500', marginBottom: 14 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  featureTitle: { fontSize: 11, fontWeight: '700', color: '#5ec8c8' },
  featureDesc: { fontSize: 9, color: '#64748b', fontWeight: '500', marginTop: 1 },

  // ═══ CARDS — web admin statCard birebir ═══
  custCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  custInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  custLogo: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  custName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  custStat: { fontSize: 9, color: '#4a5568', fontWeight: '600' },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  premBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(251,191,36,0.1)', marginBottom: 8 },
  premBadgeText: { fontSize: 9, fontWeight: '800', color: '#fbbf24', letterSpacing: 1.5 },

  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: { fontSize: 9, color: '#334155', fontWeight: '600', letterSpacing: 1.5 },
});
