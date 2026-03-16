import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from './src/constants';
import HomeScreen from './src/screens/HomeScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import RoomScreen from './src/screens/RoomScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export type RootStackParamList = {
  Home: undefined;
  Rooms: { token: string; user: any };
  Room: { slug: string; token: string; user: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.cyan,
    background: COLORS.bg,
    card: COLORS.bgPanel,
    text: COLORS.white,
    border: COLORS.border,
  },
};

export default function App() {
  useEffect(() => {
    const hideSplash = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await SplashScreen.hideAsync();
    };
    hideSplash();
  }, []);

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Rooms" component={RoomsScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
