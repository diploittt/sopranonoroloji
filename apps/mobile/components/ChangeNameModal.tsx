import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { getSocket } from '@/services/socket';

interface ChangeNameModalProps {
    visible: boolean;
    onClose: () => void;
    currentName: string;
}

export default function ChangeNameModal({ visible, onClose, currentName }: ChangeNameModalProps) {
    const [name, setName] = useState(currentName);
    const [error, setError] = useState('');

    const handleSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) { setError('İsim boş olamaz'); return; }
        if (trimmed.length < 2) { setError('İsim en az 2 karakter olmalı'); return; }
        if (trimmed.length > 24) { setError('İsim en fazla 24 karakter olabilir'); return; }

        const socket = getSocket();
        if (socket) {
            socket.emit('status:change-name', { displayName: trimmed });
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
                <View style={s.container} onStartShouldSetResponder={() => true}>
                    <Text style={s.title}>✏️ İsim Değiştir</Text>
                    <Text style={s.subtitle}>Yeni görünen isminizi girin</Text>

                    <TextInput
                        style={s.input}
                        value={name}
                        onChangeText={(t) => { setName(t); setError(''); }}
                        placeholder="Görünen isim..."
                        placeholderTextColor="#4b5563"
                        maxLength={24}
                        autoFocus
                    />

                    {error ? <Text style={s.error}>{error}</Text> : null}

                    <Text style={s.counter}>{name.length}/24</Text>

                    <View style={s.btnRow}>
                        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                            <Text style={s.cancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
                            <Text style={s.submitText}>Değiştir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    container: { width: '85%', backgroundColor: '#0F1626', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)', padding: 20 },
    title: { color: '#e5e7eb', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    subtitle: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    input: { height: 44, backgroundColor: '#10121b', borderRadius: 12, paddingHorizontal: 16, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    error: { color: '#ef4444', fontSize: 11, marginTop: 4, paddingLeft: 2 },
    counter: { color: '#4b5563', fontSize: 10, textAlign: 'right', marginTop: 4 },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cancelText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
    submitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(123,159,239,0.15)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(123,159,239,0.3)' },
    submitText: { color: '#7b9fef', fontSize: 13, fontWeight: '700' },
});
