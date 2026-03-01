import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    visible, title, message,
    confirmText = 'Evet',
    cancelText = 'İptal',
    confirmColor = '#ef4444',
    onConfirm, onCancel,
}: ConfirmModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={s.overlay}>
                <View style={s.card}>
                    <Text style={s.title}>{title}</Text>
                    <Text style={s.message}>{message}</Text>
                    <View style={s.row}>
                        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
                            <Text style={s.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.confirmBtn, { backgroundColor: confirmColor + '20', borderColor: confirmColor + '40' }]} onPress={onConfirm}>
                            <Text style={[s.confirmText, { color: confirmColor }]}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    card: { width: '80%', backgroundColor: '#0F1626', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20 },
    title: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', marginBottom: 8 },
    message: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20, marginBottom: 16 },
    row: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    cancelText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
    confirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    confirmText: { fontSize: 13, fontWeight: '700' },
});
