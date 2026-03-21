import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import api from '../services/api';
import config from '../config';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   TENANT LOGIN EKRANI
   Web'deki /t/[tenant] sayfasının mobil karşılığı.
   Topluluk kartına tıklayınca açılır.
   ═══════════════════════════════════════════════════════════ */

export default function TenantLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    firstRoom: string;
  }>();

  const { loginWithSocket } = useStore();

  const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tenantId = params.tenantId || '';
  const tenantSlug = params.tenantSlug || '';
  const tenantName = params.tenantName || 'Topluluk';
  const firstRoom = params.firstRoom || '';

  /* ═══ GİRİŞ HANDLER ═══ */
  const handleLogin = async () => {
    setErrorMsg(null);

    if (loginTab === 'member') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('E-posta ve şifre gereklidir.');
        return;
      }
    } else {
      if (!nickname.trim()) {
        setErrorMsg('Takma ad gereklidir.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let result: any;
      if (loginTab === 'member') {
        const { data } = await api.post('/auth/login', {
          username: email.trim(),
          password: password.trim(),
          tenantId,
        });
        result = data;
      } else {
        const { data } = await api.post('/auth/guest', {
          username: nickname.trim(),
          gender,
          tenantId,
        });
        result = data;
      }

      // Store + socket bağlantısı (tenant ID ile)
      loginWithSocket(
        result.access_token,
        result.user,
        tenantId,
      );

      // Odaya yönlendir
      if (firstRoom) {
        router.replace({ pathname: '/room', params: { roomId: firstRoom } } as any);
      } else {
        router.replace('/home' as any);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Giriş başarısız.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1a1033', '#0f172a', '#0c1322']} style={StyleSheet.absoluteFill as any} />

      {/* Geri butonu */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#94a3b8" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tenant başlığı */}
          <View style={s.header}>
            <View style={s.tenantIconWrap}>
              <Ionicons name="globe" size={32} color="#5eead4" />
            </View>
            <Text style={s.tenantName}>{tenantName}</Text>
            <Text style={s.tenantSub}>Bu topluluğa giriş yapın</Text>
          </View>

          {/* ── Sekmeler — Misafir / Üye ── */}
          <View style={s.tabBar}>
            {(['guest', 'member'] as const).map(t => {
              const isActive = loginTab === t;
              const label = t === 'guest' ? '👤 Misafir' : '🔑 Üye Girişi';
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setLoginTab(t); setErrorMsg(null); }}
                  style={[s.tab, isActive && s.tabActive]}
                >
                  <Text style={[s.tabText, isActive && s.tabTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Hata mesajı ── */}
          {errorMsg && (
            <View style={s.errorBox}>
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ═══ MİSAFİR GİRİŞİ ═══ */}
          {loginTab === 'guest' && (
            <View style={s.form}>
              <Text style={s.label}>Takma Adınız</Text>
              <TextInput
                style={s.input}
                placeholder="Adınızı girin..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                returnKeyType="done"
              />

              <Text style={[s.label, { marginTop: 16 }]}>Cinsiyet</Text>
              <View style={s.genderRow}>
                <TouchableOpacity
                  style={[s.genderBtn, gender === 'male' && s.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Ionicons name="male" size={18} color={gender === 'male' ? '#38bdf8' : '#64748b'} />
                  <Text style={[s.genderText, gender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.genderBtn, gender === 'female' && s.genderBtnActivePink]}
                  onPress={() => setGender('female')}
                >
                  <Ionicons name="female" size={18} color={gender === 'female' ? '#f472b6' : '#64748b'} />
                  <Text style={[s.genderText, gender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ═══ ÜYE GİRİŞİ ═══ */}
          {loginTab === 'member' && (
            <View style={s.form}>
              <Text style={s.label}>Kullanıcı Adı / E-posta</Text>
              <TextInput
                style={s.input}
                placeholder="E-posta veya kullanıcı adı"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[s.label, { marginTop: 16 }]}>Şifre</Text>
              <View style={s.passwordWrap}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Şifreniz"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={s.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ═══ GİRİŞ BUTONU ═══ */}
          <TouchableOpacity
            style={[s.submitBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={loginTab === 'guest' ? ['#06b6d4', '#0891b2'] : ['#6366f1', '#4f46e5']}
              style={s.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={loginTab === 'guest' ? 'enter-outline' : 'key-outline'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.submitText}>
                    {loginTab === 'guest' ? 'Misafir Olarak Gir' : 'Giriş Yap'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={s.footerNote}>
            {loginTab === 'guest'
              ? 'Misafir girişi ile sohbete katılabilirsiniz.'
              : 'Bu topluluktaki üye hesabınızla giriş yapın.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══ STILLER ═══ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  backBtn: {
    position: 'absolute', top: 50, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1, paddingHorizontal: 24,
    paddingTop: 100, paddingBottom: 40,
  },

  /* Header */
  header: { alignItems: 'center', marginBottom: 32 },
  tenantIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(94,234,212,0.1)',
    borderWidth: 2, borderColor: 'rgba(94,234,212,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  tenantName: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 4,
  },
  tenantSub: {
    fontSize: 13, color: '#64748b', textAlign: 'center',
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row', gap: 8, marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: 'rgba(99,102,241,0.3)',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13, fontWeight: '600', color: '#64748b',
  },
  tabTextActive: { color: '#a5b4fc' },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1, borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText: { color: '#fca5a5', fontSize: 12, flex: 1 },

  /* Form */
  form: { marginBottom: 24 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#fff', fontSize: 15,
    marginBottom: 4,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: 14,
  },

  /* Gender */
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  genderBtnActive: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.3)',
  },
  genderBtnActivePink: {
    backgroundColor: 'rgba(244,114,182,0.1)',
    borderColor: 'rgba(244,114,182,0.3)',
  },
  genderText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  /* Submit */
  submitBtn: { marginBottom: 16 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 14,
  },
  submitText: {
    fontSize: 15, fontWeight: '700', color: '#fff',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  /* Footer */
  footerNote: {
    fontSize: 11, color: '#475569', textAlign: 'center',
    lineHeight: 16,
  },
});
