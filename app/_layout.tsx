import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { initializeAppData } from '@/services/appInit';
import { useThemeColors } from '@/hooks/useThemeColors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeAppData();
      } catch (e) {
        console.warn('[init] database init failed', e);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) {
          setReady(true);
          SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-provider loading screen: plain View, because ThemedView requires
  // ThemeProvider context which is only mounted after init completes.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#FAF4E8' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp failed={failed} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp({ failed }: { failed: boolean }) {
  const { colors, dark } = useThemeColors();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="year-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-event" options={{ presentation: 'modal' }} />
      </Stack>
      {failed ? <FailedState /> : null}
    </>
  );
}

function FailedState() {
  return (
    <ThemedView
      variant="background"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      <ThemedText variant="h4" weight="bold" color="error">
        Failed to initialize
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginTop: 8 }}>
        Please restart the app.
      </ThemedText>
    </ThemedView>
  );
}
