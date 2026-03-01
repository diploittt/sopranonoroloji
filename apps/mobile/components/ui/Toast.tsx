import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

// ═══ Context for global toast ═══
interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });
export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, string> = {
    success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️',
};
const COLORS: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.15)', error: 'rgba(239,68,68,0.15)',
    info: 'rgba(123,159,239,0.15)', warning: 'rgba(245,158,11,0.15)',
};
const BORDER_COLORS: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.3)', error: 'rgba(239,68,68,0.3)',
    info: 'rgba(123,159,239,0.3)', warning: 'rgba(245,158,11,0.3)',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
            ]).start(onDismiss);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[s.toast, { opacity, transform: [{ translateY }], backgroundColor: COLORS[toast.type], borderColor: BORDER_COLORS[toast.type] }]}>
            <Text style={{ fontSize: 16 }}>{ICONS[toast.type]}</Text>
            <Text style={s.toastText} numberOfLines={2}>{toast.message}</Text>
            <TouchableOpacity onPress={onDismiss}>
                <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    let counter = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = String(++counter.current);
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <View style={s.container} pointerEvents="box-none">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

const s = StyleSheet.create({
    container: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 9999, gap: 6 },
    toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    toastText: { flex: 1, color: '#e5e7eb', fontSize: 13, fontWeight: '500' },
    closeText: { color: '#6b7280', fontSize: 14 },
});
