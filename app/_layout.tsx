import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { COLORS } from '../src/constants/colors';

// Show notifications when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { init, user } = useAuthStore();
  const { fetchProfile, fetchVaults, processEarnings, reset } = useUserStore();

  usePushNotifications();

  // Load fonts from local assets so Metro bundles them reliably on web
  const [fontsLoaded, fontError] = useFonts({
    Ionicons: require('../assets/fonts/Ionicons.ttf'),
    MaterialIcons: require('../assets/fonts/MaterialIcons.ttf'),
  });

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (user) {
      fetchProfile(user.uid);
      fetchVaults(user.uid);
      processEarnings(user.uid);
    } else {
      reset();
    }
  }, [user]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const route = response.notification.request.content.data?.route as string | undefined;
      if (route) router.push(route as any);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor="#080c18" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080c18' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deposit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="withdraw" options={{ presentation: 'modal' }} />
        <Stack.Screen name="refer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="leaderboard" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="download" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
