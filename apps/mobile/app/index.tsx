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
// LinearGradient kaldırıldı — Fabric Android'de crash ediyor
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../store';
import authService from '../services/auth.service';
import config from '../config';

const { width, height } = Dimensions.get('window');

/* ═══ AVATAR URL'LERİ — web ile senkron ═══ */
const AVATAR_BASE = 'https://sopranochat.com';
const MALE_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/male_${i}.png`);
const FEMALE_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/female_${i}.png`);
const NEUTRAL_AVATARS = [1,2,3,4].map(i => `${AVATAR_BASE}/avatars/neutral_${i}.png`);

/* ═══════════════════════════════════════════════════════════
   ARKA PLAN PARTİKÜLLER
   ═══════════════════════════════════════════════════════════ */

function FloatingLights() {
  const lights = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(Math.random() * 0.15),
      y: new Animated.Value(0),
      size: 3 + Math.random() * 5,
      x: Math.random() * width,
      baseY: Math.random() * height * 0.5 + 100,
    }))
  ).current;

  useEffect(() => {
    lights.forEach((l) => {
      const anim = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(l.opacity, { toValue: 0.05 + Math.random() * 0.2, duration: 3000 + Math.random() * 3000, useNativeDriver: true }),
            Animated.timing(l.y, { toValue: -20 + Math.random() * 40, duration: 4000 + Math.random() * 3000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(l.opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
            Animated.timing(l.y, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ]),
        ]).start(anim);
      };
      anim();
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {lights.map((l, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: l.size, height: l.size, borderRadius: l.size / 2,
            backgroundColor: i % 3 === 0 ? '#5eead4' : i % 3 === 1 ? '#a78bfa' : '#7dd3c8',
            left: l.x, top: l.baseY,
            opacity: l.opacity,
            transform: [{ translateY: l.y }],
          }}
        />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   SES DALGASI EFEKTİ
   ═══════════════════════════════════════════════════════════ */

function AudioWaveDecoration() {
  const bars = useRef(
    Array.from({ length: 20 }, () => ({
      height: new Animated.Value(4 + Math.random() * 12),
      baseH: 4 + Math.random() * 12,
    }))
  ).current;

  useEffect(() => {
    bars.forEach((b) => {
      const anim = () => {
        const newH = 3 + Math.random() * 16;
        Animated.timing(b.height, {
          toValue: newH, duration: 400 + Math.random() * 600,
          useNativeDriver: false,
        }).start(anim);
      };
      setTimeout(anim, Math.random() * 1000);
    });
  }, []);

  return (
    <View style={styles.waveContainer}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 2.5, borderRadius: 2,
            marginHorizontal: 1.5,
            backgroundColor: `rgba(94,234,212,${0.15 + (i % 4) * 0.05})`,
            height: b.height,
          }}
        />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA LOGIN EKRANI
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

  // ── Register State ──
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Animasyonlar
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animasyonu
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    // Kart animasyonu (gecikmeyle)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 400);
  }, []);

  /* ═══ REGISTER HANDLER ═══ */
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
      setRegSuccess(true);
      setShowRegister(false);
      // Kayıt sonrası bilgileri üye giriş formuna aktar
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

  /* ═══ AUTH HANDLER ═══ */
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
      let result;
      if (loginTab === 'member') {
        result = await authService.login({
          email: email.trim(),
          password: password.trim(),
        });
      } else {
        result = await authService.guestLogin({
          username: nickname.trim(),
          gender,
        });
      }

      // Store + socket bağlantısı
      loginWithSocket(
        result.access_token,
        result.user,
        config.DEFAULT_TENANT_ID,
      );

      // Home'a yönlendir
      router.replace('/home');
    } catch (err: any) {
      const msg = err?.message || 'Giriş başarısız. Lütfen tekrar deneyin.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Arka plan — premium gradient */}
      <LinearGradient colors={['#eee8f5','#d0cce0','#b8b3d1']} style={StyleSheet.absoluteFill as any} />

      {/* Işık efektleri — mockup tonları */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />
      <View style={styles.orbCenterBlue} />
      <FloatingLights />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HERO: Logo + Slogan ── */}
          <Animated.View style={[styles.heroSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          {/* Ses dalgası kaldırıldı */}

          {/* ── GİRİŞ KARTI ── */}
          <Animated.View style={[styles.loginCard, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
            {/* Sekmeler */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setLoginTab('member')}
                style={[styles.tabBtn, loginTab === 'member' && styles.tabBtnActive]}
              >
                <Ionicons name="person" size={14} color={loginTab === 'member' ? '#4f46e5' : '#94a3b8'} />
                <Text style={[styles.tabBtnText, loginTab === 'member' && styles.tabBtnTextActive]}>Üye Giriş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoginTab('guest')}
                style={[styles.tabBtn, loginTab === 'guest' && styles.tabBtnActive]}
              >
                <Ionicons name="person-outline" size={14} color={loginTab === 'guest' ? '#0ea5e9' : '#94a3b8'} />
                <Text style={[styles.tabBtnText, loginTab === 'guest' && styles.tabBtnTextActive]}>Misafir</Text>
              </TouchableOpacity>
            </View>

            {/* Input alanları */}
            {loginTab === 'member' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-POSTA / KULLANICI ADI</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="E-posta veya kullanıcı adı"
                      placeholderTextColor="#94a3b8"
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
                    <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifrenizi girin"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Feather name={showPassword ? 'eye' : 'eye-off'} size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Şifremi Unuttum', 'Şifre sıfırlama özelliği yakında eklenecek. Lütfen destek ekibiyle iletişime geçin.', [{ text: 'Tamam' }])}>
                  <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                </TouchableOpacity>

                {/* Hata mesajı */}
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
                    <Feather name="user" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Takma adınızı girin"
                      placeholderTextColor="#94a3b8"
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
                      <Ionicons name="male" size={14} color={gender === 'male' ? '#38bdf8' : '#94a3b8'} />
                      <Text style={[styles.genderBtnText, gender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGender('female')}
                      style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
                    >
                      <Ionicons name="female" size={14} color={gender === 'female' ? '#f472b6' : '#94a3b8'} />
                      <Text style={[styles.genderBtnText, gender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.avatarSelectBtn} onPress={() => setShowAvatarPicker(!showAvatarPicker)}>
                  <Ionicons name="image-outline" size={16} color="#7c3aed" />
                  <Text style={styles.avatarSelectText}>{selectedAvatar ? 'Avatar Değiştir' : 'Avatar Seç'}</Text>
                  {selectedAvatar && <Image source={{ uri: selectedAvatar }} style={{ width: 24, height: 24, borderRadius: 12, marginLeft: 6 }} />}
                </TouchableOpacity>
                {showAvatarPicker && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                    {getAvatarList(gender).map((av, i) => (
                      <TouchableOpacity key={i} onPress={() => { setSelectedAvatar(av); setShowAvatarPicker(false); }}
                        style={{ borderWidth: 2, borderColor: selectedAvatar === av ? '#7c3aed' : 'rgba(0,0,0,0.08)', borderRadius: 28, padding: 2 }}>
                        <Image source={{ uri: av }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* CTA Butonu */}
            <TouchableOpacity
              style={[styles.ctaBtn, isSubmitting && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={loginTab === 'member' ? ['#6366f1','#4f46e5'] : ['#0ea5e9','#0284c7']}
                style={styles.ctaGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={loginTab === 'member' ? 'log-in-outline' : 'enter-outline'}
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
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
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1877F2' }]}
                onPress={() => Linking.openURL(`${config.API_BASE_URL}/auth/facebook`)}>
                <Ionicons name="logo-facebook" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]}
                onPress={() => Linking.openURL(`${config.API_BASE_URL}/auth/twitter`)}>
                <Ionicons name="logo-twitter" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Kayıt alanı */}
          <Animated.View style={[styles.registerSection, { opacity: cardFade }]}>
            <Text style={styles.registerText}>Henüz hesabın yok mu?</Text>
            <TouchableOpacity onPress={() => setShowRegister(true)}>
              <Text style={styles.registerLink}>Hemen Kaydol</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ═══ KAYIT MODAL ═══ */}
          <Modal visible={showRegister} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 28, padding: 24, maxHeight: height * 0.8,
                borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.9)',
                shadowColor: '#6366f1', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 20 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 4 }}>✨ Yeni Üyelik</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 16 }}>Bilgilerinizi girerek hesap oluşturun</Text>

                  {/* Kullanıcı Adı */}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>KULLANICI ADI</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="user" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Kullanıcı adınız" placeholderTextColor="#94a3b8" value={regUsername} onChangeText={setRegUsername} autoCapitalize="none" />
                  </View>

                  {/* E-posta */}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>E-POSTA</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="mail" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="ornek@mail.com" placeholderTextColor="#94a3b8" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" autoCapitalize="none" />
                  </View>

                  {/* Şifre */}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ŞİFRE</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="En az 6 karakter" placeholderTextColor="#94a3b8" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
                  </View>

                  {/* Şifre Tekrar */}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ŞİFRE TEKRAR</Text>
                  <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                    <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Şifrenizi tekrarlayın" placeholderTextColor="#94a3b8" value={regPasswordConfirm} onChangeText={setRegPasswordConfirm} secureTextEntry />
                  </View>

                  {/* Cinsiyet */}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>CİNSİYET</Text>
                  <View style={styles.genderRow}>
                    <TouchableOpacity onPress={() => setRegGender('male')} style={[styles.genderBtn, regGender === 'male' && styles.genderBtnActiveMale]}>
                      <Ionicons name="male" size={14} color={regGender === 'male' ? '#38bdf8' : '#94a3b8'} />
                      <Text style={[styles.genderBtnText, regGender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRegGender('female')} style={[styles.genderBtn, regGender === 'female' && styles.genderBtnActiveFemale]}>
                      <Ionicons name="female" size={14} color={regGender === 'female' ? '#f472b6' : '#94a3b8'} />
                      <Text style={[styles.genderBtnText, regGender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Hata */}
                  {regError && (
                    <View style={[styles.errorBox, { marginTop: 8 }]}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.errorText}>{regError}</Text>
                    </View>
                  )}

                  {/* Kayıt Ol Butonu */}
                  <TouchableOpacity onPress={handleRegister} disabled={regLoading} style={[styles.ctaBtn, { marginTop: 16 }, regLoading && { opacity: 0.6 }]}>
                    <LinearGradient colors={['#ef4444','#dc2626']} style={styles.ctaGradient}>
                      {regLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                        <><Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.ctaText}>Üye Ol</Text></>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Geri dön */}
                  <TouchableOpacity onPress={() => setShowRegister(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '600' }}>← Giriş ekranına dön</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER
   ═══════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee8f5' },

  /* ── IŞIK ORBS — Çok katmanlı ── */
  orbTopRight: {
    position: 'absolute', top: -80, right: -90,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(94,234,212,0.25)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 40, left: -120,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(167,139,250,0.2)',
  },
  orbCenterBlue: {
    position: 'absolute', top: '25%' as any, right: -50,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(129,140,248,0.18)',
  },

  /* ── SCROLL ── */
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    minHeight: height,
    justifyContent: 'center',
  },

  /* ── HERO ── */
  heroSection: { alignItems: 'center', marginBottom: 8 },
  logo: { width: width * 0.75, height: 70 },
  slogan: {
    fontSize: 14, fontWeight: '500', color: '#64748b',
    marginTop: 4, letterSpacing: 2,
  },

  /* ── SES DALGASI ── */
  waveContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 28, marginBottom: 20,
  },

  /* ── GİRİŞ KARTI — Premium Glass ── */
  loginCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },

  /* ── SEKMELER ── */
  tabRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(241,245,249,0.8)',
    borderRadius: 14, padding: 4, marginBottom: 20,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 11, gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabBtnTextActive: { color: '#1e293b', fontWeight: '700' },

  /* ── INPUT ALANLARI ── */
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1, marginBottom: 6, marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(241,245,249,0.85)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(226,232,240,0.5)',
    shadowColor: 'rgba(0,0,0,0.04)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 10,
    fontSize: 15, color: '#0f172a', fontWeight: '500',
  },
  eyeBtn: { padding: 14 },

  /* ── ŞİFREMİ UNUTTUM ── */
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  forgotText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },

  /* ── CİNSİYET ── */
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6,
    backgroundColor: 'rgba(241,245,249,0.9)',
    borderWidth: 1, borderColor: 'rgba(226,232,240,0.5)',
  },
  genderBtnActiveMale: { borderColor: 'rgba(56,189,248,0.4)', backgroundColor: 'rgba(56,189,248,0.06)' },
  genderBtnActiveFemale: { borderColor: 'rgba(244,114,182,0.4)', backgroundColor: 'rgba(244,114,182,0.06)' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  /* ── AVATAR ── */
  avatarSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.06)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
    marginTop: 4,
  },
  avatarSelectText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },

  /* ── CTA BUTONU — Premium Glow ── */
  ctaBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 18 },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 12,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },

  /* ── AYIRICI ── */
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.2)' },
  dividerText: { fontSize: 12, fontWeight: '500', color: '#94a3b8' },

  /* ── SOSYAL ── */
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(226,232,240,0.4)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },

  /* ── KAYIT ── */
  registerSection: {
    alignItems: 'center', marginTop: 24, gap: 4,
  },
  registerText: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  registerLink: { fontSize: 16, fontWeight: '700', color: '#6366f1' },

  /* ── HATA KUTUSU ── */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
    marginTop: 8,
  },
  errorText: { fontSize: 12, fontWeight: '500', color: '#ef4444', flex: 1 },
});
