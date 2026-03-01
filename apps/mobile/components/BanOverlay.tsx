import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

interface BanOverlayProps {
    reason?: string;
    bannedBy?: string;
    expiresAt?: string;
}

export default function BanOverlay({ reason, bannedBy, expiresAt }: BanOverlayProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.icon}>⛔</Text>
                <Text style={styles.title}>Yasaklandınız</Text>
                <Text style={styles.subtitle}>Bu odaya erişiminiz engellendi</Text>

                {reason && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Sebep</Text>
                        <Text style={styles.infoValue}>{reason}</Text>
                    </View>
                )}
                {bannedBy && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Yasaklayan</Text>
                        <Text style={styles.infoValue}>{bannedBy}</Text>
                    </View>
                )}
                {expiresAt && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bitiş</Text>
                        <Text style={styles.infoValue}>
                            {new Date(expiresAt).toLocaleString('tr-TR')}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.replace('/(tabs)/rooms')}
                >
                    <Text style={styles.backBtnText}>← Odalar Listesine Dön</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15,22,38,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    card: {
        width: '80%',
        backgroundColor: '#0F1626',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        padding: 24,
        alignItems: 'center',
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        color: '#ef4444',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    subtitle: {
        color: '#6b7280',
        fontSize: 13,
        marginBottom: 16,
    },
    infoRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    infoLabel: {
        color: '#6b7280',
        fontSize: 12,
        fontWeight: '600',
    },
    infoValue: {
        color: '#e5e7eb',
        fontSize: 12,
    },
    backBtn: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(123,159,239,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.3)',
    },
    backBtnText: {
        color: '#7b9fef',
        fontSize: 13,
        fontWeight: '700',
    },
});
