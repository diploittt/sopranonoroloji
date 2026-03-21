import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import api from '../services/api';
import AppBackground from '../components/shared/AppBackground';

const { width } = Dimensions.get('window');

const GRADS: [string, string][] = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#06b6d4'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#059669'],
];

/* ═══════════════════════════════════════════════════════════
   TENANT LOGIN — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function TenantLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tenantId: string; tenantSlug: string; tenantName: string;
    tenantLogo: string; tenantRooms: string; firstRoom: string;
  }>();

  const [screen, setScreen] = useState<'login' | 'rooms'>('login');
  const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tenantId = params.tenantId || '';
  const tenantName = params.tenantName || 'Topluluk';
  const tenantLogo = params.tenantLogo || '';
  const firstRoom = params.firstRoom || '';

  let rooms: any[] = [];
  try { rooms = JSON.parse(params.tenantRooms || '[]'); } catch { rooms = []; }

  const { loginWithSocket, logoutWithSocket, user, token, activeTenantId, activeTenantSlug } = useStore();

  useEffect(() => {
    const isSameTenant = user?.tenantId === tenantId || activeTenantSlug === tenantId || activeTenantId === tenantId;
    if (user && token && isSameTenant) {
      if (firstRoom && rooms.length <= 1) {
        router.replace({ pathname: '/room', params: { roomId: firstRoom } } as any);
      } else {
        setScreen('rooms');
      }
    }
  }, [user, tenantId, token, activeTenantId, activeTenantSlug, firstRoom, rooms.length]);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (loginTab === 'member') {
      if (!email.trim() || !password.trim()) { setErrorMsg('E-posta ve şifre gereklidir.'); return; }
    } else {
      if (!nickname.trim()) { setErrorMsg('Takma ad gereklidir.'); return; }
    }
    setIsSubmitting(true);
    try {
      logoutWithSocket();
      let result: any;
      if (loginTab === 'member') {
        const { data } = await api.post('/auth/login', { username: email.trim(), password: password.trim(), tenantId });
        result = data;
      } else {
        const { data } = await api.post('/auth/guest', { username: nickname.trim(), gender, tenantId });
        result = data;
      }
      loginWithSocket(result.access_token, result.user, tenantId);
      if (rooms.length <= 1 && firstRoom) {
        router.replace({ pathname: '/room', params: { roomId: firstRoom } } as any);
      } else if (rooms.length > 1) {
        setScreen('rooms');
      } else {
        router.replace('/home' as any);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Giriş başarısız.');
    } finally { setIsSubmitting(false); }
  };

  const enterRoom = (room: any) => {
    router.replace({ pathname: '/room', params: { roomId: room.slug || room.id } } as any);
  };

  /* ═══ ODA SEÇİM EKRANI ═══ */
  if (screen === 'rooms') {
    return (
      <AppBackground>
        <View style={s.topBar}>
          <TouchableOpacity style={s.topBtn} onPress={() => {
            if (user?.tenantId === tenantId) router.replace('/home' as any);
            else setScreen('login');
          }}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.topBtn} onPress={() => { logoutWithSocket(); setScreen('login'); }}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.headerCenter}>
            {tenantLogo ? (
              <Image source={{ uri: tenantLogo }} style={s.tenantLogo} />
            ) : (
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.tenantIconWrap}>
                <Ionicons name="globe" size={28} color="#fff" />
              </LinearGradient>
            )}
            <Text style={s.tenantName}>{tenantName}</Text>
            <Text style={s.tenantSub}>Bir oda seçerek sohbete başlayın</Text>
          </View>

          {rooms.map((room: any, i: number) => {
            const grad = GRADS[i % GRADS.length];
            const online = room.onlineUsers || 0;
            return (
              <TouchableOpacity key={room.id || i} activeOpacity={0.88}
                onPress={() => enterRoom(room)} style={s.roomCard}>
                <LinearGradient colors={grad} style={s.roomIcon}>
                  <Ionicons name="chatbubbles" size={16} color="#fff" />
                </LinearGradient>
                <View style={s.roomInfo}>
                  <Text style={s.roomName} numberOfLines={1}>{room.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: online > 0 ? '#22c55e' : 'rgba(255,255,255,0.15)' }} />
                    <Text style={s.roomMeta}>{online > 0 ? `${online} çevrimiçi` : 'Boş'}</Text>
                  </View>
                </View>
                <LinearGradient colors={grad} style={s.roomEnter}>
                  <Ionicons name="enter-outline" size={14} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      </AppBackground>
    );
  }

  /* ═══ LOGIN EKRANI ═══ */
  return (
    <AppBackground>
      <TouchableOpacity style={[s.topBtn, { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10 }]}
        onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.headerCenter}>
            {tenantLogo ? (
              <Image source={{ uri: tenantLogo }} style={s.tenantLogo} />
            ) : (
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.tenantIconWrap}>
                <Ionicons name="globe" size={32} color="#fff" />
              </LinearGradient>
            )}
            <Text style={s.tenantName}>{tenantName}</Text>
            <Text style={s.tenantSub}>Bu topluluğa giriş yapın</Text>
          </View>

          <View style={s.card}>
            {/* Sekmeler */}
            <View style={s.tabBar}>
              {(['guest', 'member'] as const).map(t => {
                const isActive = loginTab === t;
                const label = t === 'guest' ? '👤 Misafir' : '🔑 Üye Girişi';
                return (
                  <TouchableOpacity key={t} onPress={() => { setLoginTab(t); setErrorMsg(null); }}
                    style={[s.tab, isActive && s.tabActive]}>
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {errorMsg && (
              <View style={s.errorBox}>
                <Ionicons name="warning" size={14} color="#ef4444" />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            )}

            {loginTab === 'guest' && (
              <View style={s.form}>
                <Text style={s.label}>TAKMA AD</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={s.input} placeholder="Adınızı girin..." placeholderTextColor="rgba(255,255,255,0.25)"
                    value={nickname} onChangeText={setNickname} autoCapitalize="none" />
                </View>
                <Text style={[s.label, { marginTop: 14 }]}>CİNSİYET</Text>
                <View style={s.genderRow}>
                  <TouchableOpacity style={[s.genderBtn, gender === 'male' && s.genderMale]} onPress={() => setGender('male')}>
                    <Ionicons name="male" size={14} color={gender === 'male' ? '#38bdf8' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[s.genderText, gender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.genderBtn, gender === 'female' && s.genderFemale]} onPress={() => setGender('female')}>
                    <Ionicons name="female" size={14} color={gender === 'female' ? '#f472b6' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[s.genderText, gender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {loginTab === 'member' && (
              <View style={s.form}>
                <Text style={s.label}>KULLANICI ADI / E-POSTA</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={s.input} placeholder="E-posta veya kullanıcı adı" placeholderTextColor="rgba(255,255,255,0.25)"
                    value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                </View>
                <Text style={[s.label, { marginTop: 14 }]}>ŞİFRE</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={s.input} placeholder="Şifreniz" placeholderTextColor="rgba(255,255,255,0.25)"
                    value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={16} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={[s.submitWrap, isSubmitting && { opacity: 0.6 }]}
              onPress={handleLogin} disabled={isSubmitting} activeOpacity={0.85}>
              <LinearGradient
                colors={loginTab === 'guest' ? ['#0ea5e9', '#0284c7'] : ['#6366f1', '#4f46e5']}
                style={s.submitGrad}>
                {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name={loginTab === 'guest' ? 'enter-outline' : 'key-outline'} size={18} color="#fff" />
                    <Text style={s.submitText}>{loginTab === 'guest' ? 'Misafir Olarak Gir' : 'Giriş Yap'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.footerNote}>
              {loginTab === 'guest' ? 'Misafir girişi ile sohbete katılabilirsiniz.' : 'Bu topluluktaki üye hesabınızla giriş yapın.'}
            </Text>
          </View>

          {rooms.length > 0 && (
            <View style={s.roomInfoBox}>
              <Ionicons name="information-circle-outline" size={14} color="#a78bfa" />
              <Text style={s.roomInfoText}>{rooms.length} oda mevcut. Giriş yaptıktan sonra oda seçebilirsiniz.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
  topBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 110 : 90, paddingBottom: 40 },

  headerCenter: { alignItems: 'center', marginBottom: 24 },
  tenantLogo: { width: 80, height: 80, borderRadius: 24, marginBottom: 14, borderWidth: 3, borderColor: 'rgba(139,92,246,0.2)' },
  tenantIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tenantName: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', textAlign: 'center', marginBottom: 4 },
  tenantSub: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  tabBar: { flexDirection: 'row', gap: 4, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  tabTextActive: { color: '#e2e8f0', fontWeight: '700' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1, fontWeight: '500' },

  form: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '500', color: '#f1f5f9' },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  genderMale: { backgroundColor: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.2)' },
  genderFemale: { backgroundColor: 'rgba(244,114,182,0.08)', borderColor: 'rgba(244,114,182,0.2)' },
  genderText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },

  submitWrap: { marginBottom: 12 },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  footerNote: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.25)', textAlign: 'center' },

  roomInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.06)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.1)' },
  roomInfoText: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)', flex: 1, lineHeight: 16 },

  roomCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  roomIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 14, fontWeight: '800', color: '#f1f5f9' },
  roomMeta: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  roomEnter: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
