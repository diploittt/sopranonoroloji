import { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
    Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SIZES, API_BASE_URL } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { connectSocket } from '@/services/socket';

type FormMode = 'buttons' | 'guest' | 'login' | 'register';

/** Camera lens O — web'deki SVG kamera lensi */
function CameraLensO({ size = 24 }: { size?: number }) {
    const pulseRef = useRef(new Animated.Value(1.5)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseRef, { toValue: 3, duration: 1000, useNativeDriver: false }),
                Animated.timing(pulseRef, { toValue: 1.5, duration: 1000, useNativeDriver: false }),
            ])
        ).start();
    }, []);
    const r = size / 2;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginLeft: -3, marginRight: -1, transform: [{ translateY: 2 }] }}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: r, borderWidth: 2, borderColor: '#ff3344' }} />
            <View style={{ position: 'absolute', width: size * 0.78, height: size * 0.78, borderRadius: r * 0.78, backgroundColor: '#120808', borderWidth: 1, borderColor: '#ff3344aa' }} />
            <View style={{ position: 'absolute', width: size * 0.58, height: size * 0.58, borderRadius: r * 0.58, backgroundColor: '#0e0505', borderWidth: 1.2, borderColor: '#ff334488' }} />
            <View style={{ position: 'absolute', width: size * 0.38, height: size * 0.38, borderRadius: r * 0.38, backgroundColor: '#0a0303', borderWidth: 0.8, borderColor: '#ff334466' }} />
            <View style={{ position: 'absolute', width: size * 0.18, height: size * 0.18, borderRadius: r * 0.18, backgroundColor: '#1f0808' }} />
            <View style={{ position: 'absolute', width: size * 0.16, height: size * 0.16, borderRadius: r * 0.16, backgroundColor: 'rgba(255,220,220,0.15)', top: size * 0.22, left: size * 0.25 }} />
            <View style={{ position: 'absolute', width: size * 0.08, height: size * 0.08, borderRadius: r * 0.08, backgroundColor: 'rgba(255,255,255,0.35)', top: size * 0.28, left: size * 0.32 }} />
            <Animated.View style={{ position: 'absolute', width: pulseRef, height: pulseRef, borderRadius: 4, backgroundColor: '#7b9fef', opacity: 0.8 }} />
        </View>
    );
}

/** Microphone T — web'deki mikrofon harfi */
function MicrophoneT() {
    return (
        <View style={{ alignItems: 'center', marginLeft: 0, transform: [{ translateY: -1 }] }}>
            <View style={{ width: 12, height: 17, borderRadius: 6, backgroundColor: '#222', borderWidth: 1.5, borderColor: '#7b9fef', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: '#7b9fef', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 4 }}>
                {[0, 1, 2, 3].map(r => (<View key={r} style={{ flexDirection: 'row', gap: 1.5 }}>{[0, 1, 2].map(c => (<View key={c} style={{ width: 1.2, height: 1.2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />))}</View>))}
            </View>
            <View style={{ width: 15, height: 2.5, marginTop: -0.5, backgroundColor: '#7b9fef', borderRadius: 2 }} />
            <View style={{ width: 2, height: 12, backgroundColor: '#444', borderRadius: 2, borderWidth: 0.5, borderColor: 'rgba(123,159,239,0.5)' }} />
        </View>
    );
}

/** Animated wave bar with staggered fade in/out */
function WaveBarLogin({ height, color, delay }: { height: number; color: 'red' | 'blue'; delay: number }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.delay(200),
            ])
        ).start();
    }, []);
    const isRed = color === 'red';
    return (
        <Animated.View style={{ width: 3, height, borderRadius: 10, opacity: fadeAnim, backgroundColor: isRed ? '#ff3344' : '#7b9fef' }} />
    );
}

export default function LoginScreen() {
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const [mode, setMode] = useState<FormMode>('buttons');

    // Guest state
    const [guestNick, setGuestNick] = useState('');
    const [guestGender, setGuestGender] = useState('Belirsiz');
    const [guestError, setGuestError] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);

    // Member login state
    const [memberUsername, setMemberUsername] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberError, setMemberError] = useState('');
    const [memberLoading, setMemberLoading] = useState(false);

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regGender, setRegGender] = useState('Belirsiz');
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    const saveSession = async (token: string, userData: any) => {
        const session = { ...userData, token };
        await SecureStore.setItemAsync('soprano_session', JSON.stringify(session));
        api.setToken(token);
        connectSocket(token);
        setUser(session);
        router.replace('/(tabs)/rooms');
    };

    const handleGuestLogin = async () => {
        const trimmed = guestNick.trim();
        if (!trimmed || trimmed.length < 2) {
            setGuestError('Takma ad en az 2 karakter olmalı.');
            return;
        }
        setGuestError('');
        setGuestLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmed, gender: guestGender }),
            });
            const data = await res.json();
            if (data.error) {
                setGuestError(data.error);
                return;
            }
            await saveSession(data.access_token, {
                userId: data.user.sub,
                username: data.user.username,
                displayName: data.user.username,
                avatar: data.user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(trimmed)}`,
                role: 'guest',
                gender: data.user.gender || guestGender,
            });
        } catch {
            setGuestError('Bağlantı hatası. Sunucuya erişilemiyor.');
        } finally {
            setGuestLoading(false);
        }
    };

    const handleMemberLogin = async () => {
        if (!memberUsername.trim() || !memberPassword) {
            setMemberError('Kullanıcı adı ve şifre gerekli.');
            return;
        }
        setMemberError('');
        setMemberLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: memberUsername.trim(), password: memberPassword, tenantId: 'system' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMemberError(data.message === 'Invalid credentials' ? 'Geçersiz kullanıcı adı veya şifre.' : (data.message || 'Giriş başarısız.'));
                return;
            }
            if (data.access_token) {
                await saveSession(data.access_token, {
                    userId: data.user?.sub,
                    username: data.user?.displayName || memberUsername.trim(),
                    displayName: data.user?.displayName || memberUsername.trim(),
                    avatar: data.user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(memberUsername.trim())}`,
                    role: data.user?.role || 'member',
                });
            }
        } catch {
            setMemberError('Bağlantı hatası.');
        } finally {
            setMemberLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!regEmail.trim() || !regUsername.trim() || !regPassword) {
            setRegError('Tüm alanları doldurunuz.');
            return;
        }
        if (regPassword.length < 4) {
            setRegError('Şifre en az 4 karakter.');
            return;
        }
        setRegError('');
        setRegLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regEmail.trim(), username: regUsername.trim(), password: regPassword, gender: regGender }),
            });
            const data = await res.json();
            if (!res.ok) {
                setRegError(data.message || 'Kayıt başarısız.');
                return;
            }
            if (data.access_token) {
                await saveSession(data.access_token, {
                    userId: data.user?.sub,
                    username: data.user?.displayName || regUsername.trim(),
                    displayName: data.user?.displayName || regUsername.trim(),
                    avatar: data.user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(regUsername.trim())}`,
                    role: 'member',
                });
            }
        } catch {
            setRegError('Bağlantı hatası.');
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ═══ Logo Section ═══ */}
                    <View style={s.logoSection}>
                        <View style={s.logoRow}>
                            <View style={s.waveRow}>
                                {[10, 18, 28, 20, 12].map((h, i) => (
                                    <WaveBarLogin key={`l${i}`} height={h} color="red" delay={i * 150} />
                                ))}
                            </View>
                            <Text style={s.wordmark}>
                                <Text style={s.wmS}>S</Text>
                                <Text style={s.wmOpran}>opran</Text>
                            </Text>
                            <CameraLensO size={24} />
                            <Text style={s.wordmark}>
                                <Text style={s.wmC}>C</Text>
                                <Text style={s.wmHa}>ha</Text>
                            </Text>
                            <MicrophoneT />
                            <View style={s.waveRow}>
                                {[8, 16, 28, 22, 14].map((h, i) => (
                                    <WaveBarLogin key={`r${i}`} height={h} color="blue" delay={i * 150} />
                                ))}
                            </View>
                        </View>
                        <Text style={s.slogan}>SENİN SESİN</Text>
                    </View>

                    {/* ═══ Hero Text ═══ */}
                    <View style={s.heroSection}>
                        <Text style={s.heroTitle}>
                            Sesin Buluştuğu{'\n'}
                            <Text style={s.heroGradient}>Dijital Sahne.</Text>
                        </Text>
                        <Text style={s.heroSub}>
                            Sıradan sohbet odalarını geride bırakın.{'\n'}Kameranızı açın, sahneye çıkın.
                        </Text>
                    </View>

                    {/* ═══ Form Area ═══ */}
                    {mode === 'buttons' && (
                        <View style={s.buttonsWrap}>
                            {/* Misafir Giriş butonu */}
                            <TouchableOpacity
                                style={s.btnGuest}
                                onPress={() => setMode('guest')}
                                activeOpacity={0.8}
                            >
                                <View style={s.btnIcon}>
                                    <Text style={s.btnIconText}>👤</Text>
                                </View>
                                <Text style={s.btnGuestText}>Misafir Girişi</Text>
                            </TouchableOpacity>

                            {/* Üye Giriş butonu */}
                            <TouchableOpacity
                                style={s.btnMember}
                                onPress={() => setMode('login')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.btnIcon, { backgroundColor: 'rgba(123,159,239,0.15)' }]}>
                                    <Text style={s.btnIconText}>🔐</Text>
                                </View>
                                <Text style={s.btnMemberText}>Üye Girişi</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ Misafir Formu ═══ */}
                    {mode === 'guest' && (
                        <View style={s.formCard}>
                            <View style={s.formHeader}>
                                <Text style={s.formTitle}>👤 Misafir Katılımı</Text>
                                <TouchableOpacity onPress={() => setMode('buttons')} style={s.closeBtn}>
                                    <Text style={s.closeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>✏️</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Görünecek İsminiz"
                                    placeholderTextColor="#4a5568"
                                    value={guestNick}
                                    onChangeText={setGuestNick}
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Gender buttons — web ile aynı */}
                            <View style={s.genderRow}>
                                <TouchableOpacity
                                    style={[s.genderBtn, guestGender === 'Erkek' && s.genderBtnActiveBlue]}
                                    onPress={() => setGuestGender('Erkek')}
                                >
                                    <Text style={s.genderIcon}>♂</Text>
                                    <Text style={[s.genderText, guestGender === 'Erkek' && s.genderTextActive]}>Erkek</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.genderBtn, guestGender === 'Kadın' && s.genderBtnActivePink]}
                                    onPress={() => setGuestGender('Kadın')}
                                >
                                    <Text style={s.genderIcon}>♀</Text>
                                    <Text style={[s.genderText, guestGender === 'Kadın' && s.genderTextActive]}>Kadın</Text>
                                </TouchableOpacity>
                            </View>

                            {guestError ? <Text style={s.errorText}>{guestError}</Text> : null}

                            <TouchableOpacity
                                style={s.submitBtn}
                                onPress={handleGuestLogin}
                                disabled={guestLoading}
                                activeOpacity={0.8}
                            >
                                {guestLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={s.submitText}>Odaya Katıl →</Text>
                                )}
                            </TouchableOpacity>

                            {/* Switch links */}
                            <View style={s.switchRow}>
                                <View style={s.dividerLine} />
                                <Text style={s.switchOr}>veya</Text>
                                <View style={s.dividerLine} />
                            </View>
                            <TouchableOpacity onPress={() => setMode('login')}>
                                <Text style={s.switchLink}>Üye Girişi yap →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ Üye Giriş Formu ═══ */}
                    {mode === 'login' && (
                        <View style={s.formCard}>
                            <View style={s.formHeader}>
                                <Text style={s.formTitle}>🔐 Üye Girişi</Text>
                                <TouchableOpacity onPress={() => setMode('buttons')} style={s.closeBtn}>
                                    <Text style={s.closeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>👤</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Kullanıcı Adı"
                                    placeholderTextColor="#4a5568"
                                    value={memberUsername}
                                    onChangeText={setMemberUsername}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>🔒</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Şifre"
                                    placeholderTextColor="#4a5568"
                                    value={memberPassword}
                                    onChangeText={setMemberPassword}
                                    secureTextEntry
                                />
                            </View>

                            {memberError ? <Text style={s.errorText}>{memberError}</Text> : null}

                            <TouchableOpacity
                                style={s.submitBtn}
                                onPress={handleMemberLogin}
                                disabled={memberLoading}
                                activeOpacity={0.8}
                            >
                                {memberLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={s.submitText}>Giriş Yap →</Text>
                                )}
                            </TouchableOpacity>

                            <View style={s.switchRow}>
                                <View style={s.dividerLine} />
                                <Text style={s.switchOr}>veya</Text>
                                <View style={s.dividerLine} />
                            </View>
                            <View style={s.switchLinks}>
                                <TouchableOpacity onPress={() => setMode('guest')}>
                                    <Text style={s.switchLink}>Misafir Giriş →</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setMode('register')}>
                                    <Text style={s.switchLink}>Hesap Oluştur →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ═══ Kayıt Formu ═══ */}
                    {mode === 'register' && (
                        <View style={s.formCard}>
                            <View style={s.formHeader}>
                                <Text style={s.formTitle}>✨ Hesap Oluştur</Text>
                                <TouchableOpacity onPress={() => setMode('buttons')} style={s.closeBtn}>
                                    <Text style={s.closeBtnText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>✉️</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="E-posta"
                                    placeholderTextColor="#4a5568"
                                    value={regEmail}
                                    onChangeText={setRegEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>👤</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Kullanıcı Adı"
                                    placeholderTextColor="#4a5568"
                                    value={regUsername}
                                    onChangeText={setRegUsername}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={s.inputWrap}>
                                <Text style={s.inputIcon}>🔒</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Şifre (min 4 karakter)"
                                    placeholderTextColor="#4a5568"
                                    value={regPassword}
                                    onChangeText={setRegPassword}
                                    secureTextEntry
                                />
                            </View>

                            <View style={s.genderRow}>
                                <TouchableOpacity
                                    style={[s.genderBtn, regGender === 'Erkek' && s.genderBtnActiveBlue]}
                                    onPress={() => setRegGender('Erkek')}
                                >
                                    <Text style={s.genderIcon}>♂</Text>
                                    <Text style={[s.genderText, regGender === 'Erkek' && s.genderTextActive]}>Erkek</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.genderBtn, regGender === 'Kadın' && s.genderBtnActivePink]}
                                    onPress={() => setRegGender('Kadın')}
                                >
                                    <Text style={s.genderIcon}>♀</Text>
                                    <Text style={[s.genderText, regGender === 'Kadın' && s.genderTextActive]}>Kadın</Text>
                                </TouchableOpacity>
                            </View>

                            {regError ? <Text style={s.errorText}>{regError}</Text> : null}

                            <TouchableOpacity
                                style={s.submitBtn}
                                onPress={handleRegister}
                                disabled={regLoading}
                                activeOpacity={0.8}
                            >
                                {regLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={s.submitText}>Kayıt Ol →</Text>
                                )}
                            </TouchableOpacity>

                            <View style={s.switchRow}>
                                <View style={s.dividerLine} />
                                <Text style={s.switchOr}>veya</Text>
                                <View style={s.dividerLine} />
                            </View>
                            <TouchableOpacity onPress={() => setMode('login')}>
                                <Text style={s.switchLink}>Zaten üyeyim, Giriş Yap →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#070B14',
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },

    // ─── Logo ───
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    waveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    waveBar: {
        width: 3,
        borderRadius: 10,
    },
    waveRed: {
        backgroundColor: '#ff3344',
    },
    waveBlue: {
        backgroundColor: '#7b9fef',
    },
    wordmark: {
        fontWeight: '800',
    },
    wmS: { fontSize: 42, color: '#ff3344' },
    wmOpran: { fontSize: 28, color: '#ff6655' },
    wmO: { fontSize: 28, color: '#ff4455' },
    wmC: { fontSize: 42, color: '#7b9fef' },
    wmHa: { fontSize: 28, color: '#a3bfff' },
    wmT: { fontSize: 28, color: '#a3bfff' },
    slogan: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 4,
        color: '#7b9fef',
        marginTop: 4,
    },

    // ─── Hero ───
    heroSection: {
        alignItems: 'center',
        marginBottom: 36,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 36,
    },
    heroGradient: {
        color: '#7b9fef',
    },
    heroSub: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },

    // ─── Buttons ───
    buttonsWrap: {
        flexDirection: 'row',
        gap: 12,
    },
    btnGuest: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.7)',
        borderWidth: 2,
        borderColor: 'rgba(6,182,212,0.3)',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 8,
    },
    btnMember: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.7)',
        borderWidth: 2,
        borderColor: 'rgba(123,159,239,0.3)',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 8,
    },
    btnIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(6,182,212,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnIconText: {
        fontSize: 16,
    },
    btnGuestText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#67e8f9',
    },
    btnMemberText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#a3bfff',
    },

    // ─── Form Card ───
    formCard: {
        backgroundColor: 'rgba(15,23,42,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(6,182,212,0.3)',
        borderRadius: 20,
        padding: 20,
        gap: 12,
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(30,41,59,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#94a3b8',
        fontSize: 14,
    },

    // ─── Input ───
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30,41,59,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(71,85,105,0.5)',
        borderRadius: 12,
        paddingLeft: 14,
    },
    inputIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 14,
        fontSize: 14,
        fontWeight: '500',
        color: '#e2e8f0',
    },

    // ─── Gender ───
    genderRow: {
        flexDirection: 'row',
        gap: 10,
    },
    genderBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(71,85,105,0.5)',
        borderRadius: 12,
    },
    genderBtnActiveBlue: {
        borderColor: 'rgba(59,130,246,0.5)',
        backgroundColor: 'rgba(59,130,246,0.12)',
    },
    genderBtnActivePink: {
        borderColor: 'rgba(244,114,182,0.5)',
        backgroundColor: 'rgba(244,114,182,0.12)',
    },
    genderIcon: {
        fontSize: 16,
        color: '#94a3b8',
    },
    genderText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94a3b8',
    },
    genderTextActive: {
        color: '#e2e8f0',
    },

    // ─── Submit ───
    submitBtn: {
        backgroundColor: '#06b6d4',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    submitText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    // ─── Error ───
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '500',
    },

    // ─── Switch Links ───
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(71,85,105,0.4)',
    },
    switchOr: {
        fontSize: 10,
        fontWeight: '500',
        color: '#64748b',
    },
    switchLinks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    switchLink: {
        fontSize: 13,
        fontWeight: '600',
        color: '#67e8f9',
        textAlign: 'center',
    },
});
