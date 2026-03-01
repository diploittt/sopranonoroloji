import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Line, G } from 'react-native-svg';

/**
 * SopranoChat Brand Logo — pure SVG + styled text for React Native
 * 
 * Usage:
 *   <SopranoChatLogo />                    — default full logo
 *   <SopranoChatLogo variant="icon" />      — just the S icon
 *   <SopranoChatLogo variant="wordmark" />  — just the text
 *   <SopranoChatLogo size="sm" />           — small
 *   <SopranoChatLogo size="lg" />           — large
 */

interface SopranoChatLogoProps {
    variant?: 'full' | 'icon' | 'wordmark';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    style?: any;
}

const SIZES = {
    sm: { icon: 24, font: 16, chat: 14, gap: 4 },
    md: { icon: 32, font: 22, chat: 18, gap: 8 },
    lg: { icon: 48, font: 32, chat: 26, gap: 10 },
    xl: { icon: 64, font: 44, chat: 36, gap: 14 },
};

function SIcon({ size = 32 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
            <Defs>
                <LinearGradient id="scG1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#1e40af" />
                    <Stop offset="50%" stopColor="#3b82f6" />
                    <Stop offset="100%" stopColor="#60a5fa" />
                </LinearGradient>
                <LinearGradient id="scG2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#1e3a8a" />
                    <Stop offset="100%" stopColor="#2563eb" />
                </LinearGradient>
            </Defs>

            {/* Background circle */}
            <Circle cx={32} cy={32} r={30} fill="url(#scG2)" opacity={0.15} />
            <Circle cx={32} cy={32} r={30} stroke="url(#scG1)" strokeWidth={1.5} fill="none" opacity={0.3} />

            {/* Stylized S with microphone integration */}
            <Path
                d="M38.5 17C38.5 17 44 18.5 44 24C44 29.5 36 30 32 31C28 32 22 32.5 22 38C22 43.5 28 46 33 46C36.5 46 40 44.5 42 42"
                stroke="url(#scG1)"
                strokeWidth={4.5}
                strokeLinecap="round"
                fill="none"
            />

            {/* Sound wave arcs */}
            <Path d="M44 28C46.5 30 47.5 33.5 46.5 37" stroke="#60a5fa" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.7} />
            <Path d="M48 26C51.5 29.5 52.5 35 51 40" stroke="#60a5fa" strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.4} />

            {/* Microphone dot + stand */}
            <Circle cx={33} cy={46} r={2.5} fill="#3b82f6" />
            <Line x1={33} y1={48.5} x2={33} y2={52} stroke="#3b82f6" strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M29 52L37 52" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />

            {/* Top accent */}
            <Circle cx={38.5} cy={17} r={2} fill="#60a5fa" opacity={0.8} />
        </Svg>
    );
}

export default function SopranoChatLogo({
    variant = 'full',
    size = 'md',
    style,
}: SopranoChatLogoProps) {
    const s = SIZES[size];

    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: s.gap }, style]}>
            {variant !== 'wordmark' && <SIcon size={s.icon} />}
            {variant !== 'icon' && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[styles.soprano, { fontSize: s.font }]}>Soprano</Text>
                    <Text style={[styles.chat, { fontSize: s.chat }]}>Chat</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    soprano: {
        fontWeight: '800',
        letterSpacing: -0.5,
        color: '#3b82f6',
    },
    chat: {
        fontWeight: '600',
        letterSpacing: -0.3,
        color: 'rgba(148, 163, 184, 0.8)',
    },
});
