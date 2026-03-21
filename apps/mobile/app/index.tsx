import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useStore } from '../store';
import authService from '../services/auth.service';
import config from '../config';
import AppBackground from '../components/shared/AppBackground';

const { width, height } = Dimensions.get('window');

/* ═══ AVATAR URL'LERİ — web ile senkron ═══ */
const AVATAR_BASE = 'https://sopranochat.com';
const MALE_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/male_${i}.png`);
const FEMALE_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/female_${i}.png`);
const NEUTRAL_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/neutral_${i}.png`);

/* ═══════════════════════════════════════════════════════════
   "Senin Sesin" altı dekorasyon — koyu tema
   ═══════════════════════════════════════════════════════════ */
function SubtitleDecoration() {
  return (
    <View style={styles.waveContainer}>
      <View style={{ width: 30, height: 1, backgroundColor: 'rgba(139,92,246,0.25)', borderRadius: 1 }} />
      <Ionicons name="mic" size={14} color="rgba(139,92,246,0.35)" style={{ marginHorizontal: 8 }} />
      <View style={{ width: 30, height: 1, backgroundColor: 'rgba(139,92,246,0.25)', borderRadius: 1 }} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA LOGIN EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function LoginScreen() {
  const router = useRouter();
  const { loginWithSocket } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loginTab, setLoginTab] = useState<'guest' | 'member'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Register State
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Animasyonlar
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 400);
  }, []);

  /* ═══ REGISTER ═══ */
  const handleRegister = async () => {
    setRegError(null);
    if (!regUsername.trim()) { setRegError('Kullanıcı adı gerekli.'); return; }
    if (!regEmail.trim()) { setRegError('E-posta gerekli.'); return; }
    if (!regPassword || regPassword.length < 6) { setRegError('Şifre en az 6 karakter olmalı.'); return; }
    if (regPassword !== regPasswordConfirm) { setRegError('Şifreler eşleşmiyor.'); return; }
    setRegLoading(true);
    try {
      await authService.register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        gender: regGender,
      });
      setShowRegister(false);
      setEmail(regEmail.trim());
      setLoginTab('member');
      setRegUsername(''); setRegEmail(''); setRegPassword(''); setRegPasswordConfirm('');
      Alert.alert('Başarılı! ✅', 'Üyelik oluşturuldu. Şimdi giriş yapabilirsiniz.');
    } catch (err: any) {
      setRegError(err?.message || 'Kayıt başarısız.');
    } finally {
      setRegLoading(false);
    }
  };

  /* ═══ AVATAR SEÇİCİ ═══ */
  const getAvatarList = (g: string) => {
    if (g === 'male') return MALE_AVATARS;
    if (g === 'female') return FEMALE_AVATARS;
    return NEUTRAL_AVATARS;
  };

  /* ═══ AUTH ═══ */
  const handleLogin = async () => {
    setErrorMsg(null);
    if (loginTab === 'member') {
      if (!email.trim() || !password.trim()) { setErrorMsg('E-posta ve şifre gereklidir.'); return; }
    } else {
      if (!nickname.trim()) { setErrorMsg('Takma ad gereklidir.'); return; }
    }

    setIsSubmitting(true);
    try {
      let result;
      if (loginTab === 'member') {
        result = await authService.login({ email: email.trim(), password: password.trim() });
      } else {
        result = await authService.guestLogin({ username: nickname.trim(), gender });
      }
      loginWithSocket(result.access_token, result.user, config.DEFAULT_TENANT_ID);
      router.replace('/home');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HERO: Logo ── */}
          <Animated.View style={[styles.heroSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          {/* Dekoratif ayırıcı */}
          <SubtitleDecoration />

          {/* ── GİRİŞ KARTI — Koyu glassmorphism ── */}
          <Animated.View style={[styles.loginCard, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
            {/* Sekmeler */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setLoginTab('member')}
                style={[styles.tabBtn, loginTab === 'member' && styles.tabBtnActive]}
              >
                <Ionicons name="person" size={14} color={loginTab === 'member' ? '#a78bfa' : 'rgba(255,255,255,0.3)'} />
                <Text style={[styles.tabBtnText, loginTab === 'member' && styles.tabBtnTextActive]}>Üye Giriş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoginTab('guest')}
                style={[styles.tabBtn, loginTab === 'guest' && styles.tabBtnActive]}
              >
                <Ionicons name="person-outline" size={14} color={loginTab === 'guest' ? '#38bdf8' : 'rgba(255,255,255,0.3)'} />
                <Text style={[styles.tabBtnText, loginTab === 'guest' && styles.tabBtnTextActive]}>Misafir</Text>
              </TouchableOpacity>
            </View>

            {/* Input alanları */}
            {loginTab === 'member' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-POSTA / KULLANICI ADI</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="E-posta veya kullanıcı adı"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ŞİFRE</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifrenizi girin"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Şifremi Unuttum', 'Şifre sıfırlama özelliği yakında eklenecek.', [{ text: 'Tamam' }])}>
                  <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                </TouchableOpacity>

                {errorMsg && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>TAKMA AD</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Takma adınızı girin"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={nickname}
                      onChangeText={setNickname}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CİNSİYET</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity
                      onPress={() => setGender('male')}
                      style={[styles.genderBtn, gender === 'male' && styles.genderBtnActiveMale]}
                    >
                      <Ionicons name="male" size={14} color={gender === 'male' ? '#38bdf8' : 'rgba(255,255,255,0.3)'} />
                      <Text style={[styles.genderBtnText, gender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGender('female')}
                      style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
                    >
                      <Ionicons name="female" size={14} color={gender === 'female' ? '#f472b6' : 'rgba(255,255,255,0.3)'} />
                      <Text style={[styles.genderBtnText, gender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.avatarSelectBtn} onPress={() => setShowAvatarPicker(!showAvatarPicker)}>
                  <Ionicons name="image-outline" size={16} color="#a78bfa" />
                  <Text style={styles.avatarSelectText}>{selectedAvatar ? 'Avatar Değiştir' : 'Avatar Seç'}</Text>
                  {selectedAvatar && <Image source={{ uri: selectedAvatar }} style={{ width: 24, height: 24, borderRadius: 12, marginLeft: 6 }} />}
                </TouchableOpacity>
                {showAvatarPicker && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                    {getAvatarList(gender).map((av, i) => (
                      <TouchableOpacity key={i} onPress={() => { setSelectedAvatar(av); setShowAvatarPicker(false); }}
                        style={{ borderWidth: 2, borderColor: selectedAvatar === av ? '#a78bfa' : 'rgba(255,255,255,0.06)', borderRadius: 28, padding: 2 }}>
                        <Image source={{ uri: av }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {errorMsg && (
                  <View style={[styles.errorBox, { marginTop: 8 }]}>
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}
              </>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, isSubmitting && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={loginTab === 'member' ? ['#8b5cf6','#6366f1'] : ['#0ea5e9','#0284c7']}
                style={styles.ctaGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={loginTab === 'member' ? 'log-in-outline' : 'enter-outline'}
                      size={18} color="#fff" style={{ marginRight: 8 }}
                    />
                    <Text style={styles.ctaText}>
                      {loginTab === 'member' ? 'Üye Girişi' : 'Misafir Giriş'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sosyal giriş */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}
                onPress={() => Linking.openURL(`${config.API_BASE_URL}/auth/google`)}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: 'rgba(24,119,242,0.15)', borderColor: 'rgba(24,119,242,0.2)' }]}
                onPress={() => Linking.openURL(`${config.API_BASE_URL}/auth/facebook`)}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => Linking.openURL(`${config.API_BASE_URL}/auth/twitter`)}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#e2e8f0' }}>𝕏</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Kayıt bağlantısı */}
          <Animated.View style={[styles.registerSection, { opacity: cardFade }]}>
            <Text style={styles.registerText}>Henüz hesabın yok mu?</Text>
            <TouchableOpacity onPress={() => setShowRegister(true)}>
              <Text style={styles.registerLink}>Hemen Kaydol</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ═══ KAYIT MODAL — Koyu Tema ═══ */}
          <Modal visible={showRegister} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
              <View style={styles.registerModal}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 4 }}>✨ Yeni Üyelik</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 16 }}>Bilgilerinizi girerek hesap oluşturun</Text>

                  <Text style={styles.regLabel}>KULLANICI ADI</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="user" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Kullanıcı adınız" placeholderTextColor="rgba(255,255,255,0.25)" value={regUsername} onChangeText={setRegUsername} autoCapitalize="none" />
                  </View>

                  <Text style={styles.regLabel}>E-POSTA</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="mail" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="ornek@mail.com" placeholderTextColor="rgba(255,255,255,0.25)" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" autoCapitalize="none" />
                  </View>

                  <Text style={styles.regLabel}>ŞİFRE</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="lock" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="En az 6 karakter" placeholderTextColor="rgba(255,255,255,0.25)" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
                  </View>

                  <Text style={styles.regLabel}>ŞİFRE TEKRAR</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="lock" size={16} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Şifrenizi tekrarlayın" placeholderTextColor="rgba(255,255,255,0.25)" value={regPasswordConfirm} onChangeText={setRegPasswordConfirm} secureTextEntry />
                  </View>

                  <Text style={styles.regLabel}>CİNSİYET</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity onPress={() => setRegGender('male')} style={[styles.genderBtn, regGender === 'male' && styles.genderBtnActiveMale]}>
                      <Ionicons name="male" size={14} color={regGender === 'male' ? '#38bdf8' : 'rgba(255,255,255,0.3)'} />
                      <Text style={[styles.genderBtnText, regGender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRegGender('female')} style={[styles.genderBtn, regGender === 'female' && styles.genderBtnActiveFemale]}>
                      <Ionicons name="female" size={14} color={regGender === 'female' ? '#f472b6' : 'rgba(255,255,255,0.3)'} />
                      <Text style={[styles.genderBtnText, regGender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                    </TouchableOpacity>
                  </View>

                  {regError && (
                    <View style={[styles.errorBox, { marginTop: 8 }]}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.errorText}>{regError}</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={handleRegister} disabled={regLoading} style={[styles.ctaBtn, { marginTop: 16 }, regLoading && { opacity: 0.6 }]}>
                    <LinearGradient colors={['#ef4444','#dc2626']} style={styles.ctaGradient}>
                      {regLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                        <><Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.ctaText}>Üye Ol</Text></>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowRegister(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#a78bfa', fontWeight: '600' }}>← Giriş ekranına dön</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },

  heroSection: { alignItems: 'center', marginBottom: 4 },
  logo: { width: width * 0.65, height: 60 },

  waveContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 20, marginBottom: 10,
  },

  /* ── GİRİŞ KARTI — Koyu glassmorphism (gölgesiz) ── */
  loginCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  /* ── SEKMELER ── */
  tabRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 4, marginBottom: 14,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 11, gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  tabBtnTextActive: { color: '#e2e8f0', fontWeight: '700' },

  /* ── INPUT ── */
  inputGroup: { marginBottom: 12 },
  inputLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1, marginBottom: 6, marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 10,
    fontSize: 15, color: '#f1f5f9', fontWeight: '500',
  },
  eyeBtn: { padding: 14 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  forgotText: { fontSize: 12, fontWeight: '600', color: '#a78bfa' },

  /* ── CİNSİYET ── */
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  genderBtnActiveMale: { borderColor: 'rgba(56,189,248,0.3)', backgroundColor: 'rgba(56,189,248,0.08)' },
  genderBtnActiveFemale: { borderColor: 'rgba(244,114,182,0.3)', backgroundColor: 'rgba(244,114,182,0.08)' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },

  /* ── AVATAR ── */
  avatarSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    marginTop: 4,
  },
  avatarSelectText: { fontSize: 13, fontWeight: '600', color: '#a78bfa' },

  /* ── CTA ── */
  ctaBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },

  /* ── AYIRICI ── */
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.25)' },

  /* ── SOSYAL ── */
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  /* ── KAYIT ── */
  registerSection: { alignItems: 'center', marginTop: 16, gap: 4 },
  registerText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  registerLink: { fontSize: 16, fontWeight: '700', color: '#a78bfa' },

  /* ── HATA ── */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    marginTop: 8,
  },
  errorText: { fontSize: 12, fontWeight: '500', color: '#ef4444', flex: 1 },

  /* ── KAYIT MODAL ── */
  registerModal: {
    backgroundColor: 'rgba(16,12,42,0.95)',
    borderRadius: 28, padding: 24, maxHeight: height * 0.8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 20,
  },
  regLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
});
