import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ActivityIndicator, Image, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './src/constants';
import HomeScreen from './src/screens/HomeScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import RoomScreen from './src/screens/RoomScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

export type RootStackParamList = {
  Home: undefined;
  MainTabs: { token: string; user: any };
  Room: { slug: string; token: string; user: any };
  // Keep old Rooms route for backward compat
  Rooms: { token: string; user: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const BG = '#2d3548';

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.cyan,
    background: BG,
    card: COLORS.bgPanel,
    text: COLORS.white,
    border: COLORS.border,
  },
};

// Session helpers
export const saveSession = async (token: string, user: any) => {
  try {
    await AsyncStorage.setItem('session', JSON.stringify({ token, user }));
  } catch (e) { console.log('Save session err:', e); }
};

export const clearSession = async () => {
  try { await AsyncStorage.removeItem('session'); }
  catch (e) { console.log('Clear session err:', e); }
};

export const getSession = async () => {
  try {
    const data = await AsyncStorage.getItem('session');
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
};

// Loading Ekranı — Premium pulsating design
function LoadingScreen() {
  const pulse1 = React.useRef(new Animated.Value(0.8)).current;
  const pulse2 = React.useRef(new Animated.Value(0.6)).current;
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Fade in
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // Pulsating rings
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0.8, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(pulse2, { toValue: 1.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 0.6, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#2d3548', justifyContent: 'center', alignItems: 'center', opacity: fade }}>
      {/* Gradient background glow */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['transparent', 'rgba(16,185,129,0.04)', 'transparent']}
          style={{ flex: 1 }}
        />
      </View>

      {/* Pulsating rings */}
      <Animated.View style={{
        position: 'absolute',
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
        transform: [{ scale: pulse2 }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.35)',
        transform: [{ scale: pulse1 }],
      }} />

      {/* Center — green circle + spinner */}
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#10b981',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 24, elevation: 12,
      }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>

      {/* Text */}
      <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 28, fontWeight: '600', letterSpacing: 1 }}>Bağlanıyor...</Text>
      <Text style={{ color: '#334155', fontSize: 9, marginTop: 6, letterSpacing: 2, fontWeight: '700' }}>SopranoChat</Text>
    </Animated.View>
  );
}

// Bottom Tab Navigator
function MainTabs({ route }: any) {
  const { token, user } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2d3548',
          borderTopWidth: 1,
          borderTopColor: 'rgba(94,200,200,0.12)',
          height: 80,
          paddingBottom: 28,
          paddingTop: 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: '#5ec8c8',
        tabBarInactiveTintColor: '#4a5568',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
        tabBarLabel: ({ focused, color }) => {
          const labels: Record<string, string> = {
            'Odalar': 'Odalar',
            'Arkadaşlar': 'Arkadaşlar',
            'Bildirimler': 'Bildirimler',
            'Ben': 'Ben',
          };
          const name = tabRoute.name;
          return (
            <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 0.8, marginBottom: 2 }}>
              {labels[name] || name}
            </Text>
          );
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: any;
          if (tabRoute.name === 'Odalar') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (tabRoute.name === 'Arkadaşlar') iconName = focused ? 'people' : 'people-outline';
          else if (tabRoute.name === 'Bildirimler') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (tabRoute.name === 'Ben') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}

    >
      <Tab.Screen name="Odalar" component={RoomsScreen} initialParams={{ token, user }} />
      <Tab.Screen name="Arkadaşlar" component={FriendsScreen} initialParams={{ token, user }} />
      <Tab.Screen name="Bildirimler" component={NotificationsScreen} initialParams={{ token, user }} />
      <Tab.Screen name="Ben" component={ProfileScreen} initialParams={{ token, user }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Home' | 'MainTabs'>('Home');
  const [initialParams, setInitialParams] = useState<any>(undefined);

  useEffect(() => {
    const init = async () => {
      // 5 saniye timeout — askıda kalmaz
      const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000));
      const work = async () => {
        try {
          await Font.loadAsync({
            'Fraunces-Black': require('./assets/fonts/Fraunces_900Black.ttf'),
            'BreeSerif': require('./assets/fonts/BreeSerif_400Regular.ttf'),
            'PlusJakartaSans-ExtraBold': require('./assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
            'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans_700Bold.ttf'),
            'CooperBlack': require('./assets/fonts/CooperBlack.ttf'),
          });
        } catch (e) { console.warn('Font load error:', e); }

        try {
          const session = await getSession();
          if (session?.token && session?.user) {
            setInitialRoute('MainTabs');
            setInitialParams({ token: session.token, user: session.user });
          }
        } catch (e) { /* ignore */ }
      };
      await Promise.race([work(), timeout]);
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: BG },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} initialParams={initialParams} />
        {/* Keep Rooms for backward compatibility with navigation.navigate('Rooms') */}
        <Stack.Screen name="Rooms" component={MainTabs} initialParams={initialParams} />
        <Stack.Screen name="Room" component={RoomScreen}
          options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
