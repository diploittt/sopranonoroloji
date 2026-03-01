import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

/**
 * Root index — serves as the initial loading screen.
 * AuthGate in _layout.tsx handles routing to the correct screen.
 */
export default function Index() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#070B14',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
