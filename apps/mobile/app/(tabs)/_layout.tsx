import { Tabs, useRootNavigationState } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants';

export default function TabsLayout() {
    // Guard: don't render <Tabs> until the root navigation is ready.
    // This prevents TabRouter.getRehydratedState from accessing stale on undefined.
    const navState = useRootNavigationState();

    if (!navState?.key) {
        return (
            <View style={{ flex: 1, backgroundColor: '#070B14', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <Tabs
            initialRouteName="rooms"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.bgSecondary,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            {/* index route — hidden, just redirects to rooms */}
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="rooms"
                options={{
                    title: 'Odalar',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="🏠" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="👤" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Ayarlar',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon emoji="⚙️" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 28,
            borderRadius: 8,
            backgroundColor: focused ? COLORS.primary + '18' : 'transparent',
        }}>
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </View>
    );
}
