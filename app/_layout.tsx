import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  const { init, user } = useAuthStore();
  const { fetchProfile, fetchVaults, processEarnings, reset } = useUserStore();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile(user.uid);
      fetchVaults(user.uid);
      processEarnings(user.uid);
    } else {
      reset();
    }
  }, [user]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor="#080c18" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080c18' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deposit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="refer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="leaderboard" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
