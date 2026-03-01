import { registerGlobals } from '@livekit/react-native';
import { useEffect, useState, useRef } from 'react';
import { Slot, Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { COLORS } from '@/constants';

// LiveKit WebRTC globals — must be called before any LiveKit usage
registerGlobals();

/** Camera lens O — web'deki SVG kamera lensi ile aynı tasarım */
function CameraLensO({ size = 28 }: { size?: number }) {
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
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: r, borderWidth: 2, borderColor: '#ff3344', shadowColor: '#ff3344', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }} />
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
            {/* Mic head */}
            <View style={{
                width: 14, height: 20, borderRadius: 7,
                backgroundColor: '#222', borderWidth: 1.5, borderColor: '#7b9fef',
                shadowColor: '#7b9fef', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6,
                overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
            }}>
                {/* Dot grid */}
                {[0, 1, 2, 3, 4].map(row => (
                    <View key={row} style={{ flexDirection: 'row', gap: 2 }}>
                        {[0, 1, 2].map(col => (
                            <View key={col} style={{ width: 1.5, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                        ))}
                    </View>
                ))}
            </View>
            {/* Mic arc */}
            <View style={{
                width: 18, height: 3, marginTop: -1,
                backgroundColor: '#7b9fef', borderRadius: 2,
            }} />
            {/* Mic stand */}
            <View style={{
                width: 2.5, height: 14,
                backgroundColor: '#444', borderRadius: 2,
                borderWidth: 0.5, borderColor: 'rgba(123,159,239,0.5)',
                shadowColor: '#7b9fef', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 3,
            }} />
        </View>
    );
}

/** Animated wave bar with staggered fade in/out */
function WaveBar({ height, color, delay }: { height: number; color: 'red' | 'blue'; delay: number }) {
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
        <Animated.View style={{
            width: 3, height, borderRadius: 10, opacity: fadeAnim,
            backgroundColor: isRed ? '#ff3344' : '#7b9fef',
            shadowColor: isRed ? '#ff3344' : '#7b9fef',
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4,
        }} />
    );
}

function SplashScreen() {
    return (
        <View style={splashStyles.container}>
            {/* Logo wordmark */}
            <View style={splashStyles.logoWrap}>
                {/* Sound wave bars - left (fade in/out staggered) */}
                <View style={splashStyles.waveContainer}>
                    {[10, 18, 28, 20, 12].map((h, i) => (
                        <WaveBar key={`l${i}`} height={h} color="red" delay={i * 150} />
                    ))}
                </View>

                {/* Wordmark Text */}
                <View style={splashStyles.wordmarkWrap}>
                    <Text style={splashStyles.wordmarkSoprano}>
                        <Text style={splashStyles.wordmarkS}>S</Text>
                        <Text style={splashStyles.wordmarkOpran}>opran</Text>
                    </Text>
                    <CameraLensO size={28} />
                    <Text style={splashStyles.wordmarkSoprano}>
                        <Text style={splashStyles.wordmarkC}>C</Text>
                        <Text style={splashStyles.wordmarkHa}>ha</Text>
                    </Text>
                    <MicrophoneT />
                </View>

                {/* Sound wave bars - right (fade in/out staggered) */}
                <View style={splashStyles.waveContainer}>
                    {[8, 16, 28, 22, 14].map((h, i) => (
                        <WaveBar key={`r${i}`} height={h} color="blue" delay={i * 150} />
                    ))}
                </View>
            </View>

            <Text style={splashStyles.slogan}>SENİN SESİN</Text>

            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 32 }} />
        </View>
    );
}

function AuthGate() {
    const { user, isLoading, setUser, setLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const rootNavState = useRootNavigationState();
    const [hasNavigated, setHasNavigated] = useState(false);

    // Restore session on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await SecureStore.getItemAsync('soprano_session');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    api.setToken(parsed.token);
                    connectSocket(parsed.token);
                    setUser(parsed);
                } else {
                    setLoading(false);
                }
            } catch {
                setLoading(false);
            }
        })();
    }, []);

    // Route guard — navigasyon hazır olduktan sonra çalışır
    useEffect(() => {
        if (isLoading) return;
        if (!rootNavState?.key) return;

        const inAuth = segments[0] === 'auth';
        const inTabs = segments[0] === '(tabs)';
        const inRoom = segments[0] === 'room';
        const inAdmin = segments[0] === 'admin';
        const isIndex = segments.length === 0 || (segments.length === 1 && segments[0] === undefined);

        // Use setTimeout to give the Stack navigator time to fully mount
        const timer = setTimeout(() => {
            if (!user && !inAuth) {
                router.replace('/auth/login');
            } else if (user && !inTabs && !inRoom && !inAuth && !inAdmin) {
                // Only redirect to tabs from the initial index screen
                router.replace('/(tabs)/rooms');
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [user, isLoading, segments, rootNavState?.key]);

    return null;
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="room/[slug]" />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
            </Stack>
            <AuthGate />
        </SafeAreaProvider>
    );
}

const splashStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#070B14',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    waveBar: {
        width: 3,
        borderRadius: 10,
    },
    waveBarRed: {
        backgroundColor: '#ff3344',
        shadowColor: '#ff3344',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    waveBarBlue: {
        backgroundColor: '#7b9fef',
        shadowColor: '#7b9fef',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    wordmarkWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordmarkSoprano: {
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    wordmarkS: {
        fontSize: 42,
        color: '#ff3344',
        textShadowColor: 'rgba(255,51,68,0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    wordmarkOpran: {
        fontSize: 28,
        color: '#ff6655',
    },
    wordmarkO: {
        fontSize: 28,
        color: '#ff4455',
    },
    wordmarkC: {
        fontSize: 42,
        color: '#7b9fef',
        textShadowColor: 'rgba(123,159,239,0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    wordmarkHa: {
        fontSize: 28,
        color: '#a3bfff',
    },
    wordmarkT: {
        fontSize: 28,
        color: '#a3bfff',
    },
    slogan: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 4,
        color: '#7b9fef',
        marginTop: 6,
        textShadowColor: 'rgba(123,159,239,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
});
