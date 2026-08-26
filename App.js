import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BasketProvider, useBasket } from './context/BasketContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { MemoryProvider } from './context/MemoryContext';
import BottomTabBar from './components/BottomTabBar';
import HomeScreen from './screens/HomeScreen';
import OrdersScreen from './screens/OrdersScreen';
import ProfileScreen from './screens/ProfileScreen';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'FamiljenGrotesk-Regular': require('./assets/fonts/FamiljenGrotesk/FamiljenGrotesk-Regular.otf'),
    'FamiljenGrotesk-Medium': require('./assets/fonts/FamiljenGrotesk/FamiljenGrotesk-Medium.otf'),
    'FamiljenGrotesk-SemiBold': require('./assets/fonts/FamiljenGrotesk/FamiljenGrotesk-SemiBold.otf'),
    'FamiljenGrotesk-Bold': require('./assets/fonts/FamiljenGrotesk/FamiljenGrotesk-Bold.otf'),
    'FamiljenGrotesk-Italic': require('./assets/fonts/FamiljenGrotesk/FamiljenGrotesk-Italic.otf'),
    'Rubik-Regular': require('./assets/fonts/Rubik/Rubik-VariableFont_wght.ttf'),
    'Rubik-Italic': require('./assets/fonts/Rubik/Rubik-Italic-VariableFont_wght.ttf'),
    'Fortnite': require('./assets/fonts/Fortnite.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BasketProvider>
              <MemoryProvider>
                <AppShell />
              </MemoryProvider>
            </BasketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState('home');
  const insets = useSafeAreaInsets();
  const { basketProducts } = useBasket();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'orders' && <OrdersScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      <View style={{ paddingBottom: insets.bottom, backgroundColor: theme.tabBar }}>
        <BottomTabBar
          activeTab={activeTab}
          onTabPress={setActiveTab}
          basketCount={basketProducts.length}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
