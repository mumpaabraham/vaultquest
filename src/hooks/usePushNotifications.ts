import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthStore } from '../store/authStore';

const EXPO_PROJECT_ID = 'fa51d2a5-7499-4d1a-b1c5-33a5af3fcf06';

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    void registerToken(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    // Set up listener for notifications received in foreground
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    return () => subscription.remove();
  }, []);
}

async function registerToken(uid: string) {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'VaultQuest',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f59e0b',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });

    if (token.data) {
      await updateDoc(doc(db, 'users', uid), {
        expoPushTokens: arrayUnion(token.data),
      });
      console.log('Push token registered:', token.data);
    }
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}
