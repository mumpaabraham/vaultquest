import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Animated,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../src/firebase/config';
import { COLORS } from '../src/constants/colors';

function NotifImage({ uri }: { uri: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.cardImage}>
      <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]} />
      <Animated.Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="cover"
        onLoad={onLoad}
        progressiveRenderingEnabled
      />
    </View>
  );
}

interface AppNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  sentAt: Timestamp;
}

export default function Notifications() {
  const [items, setItems]     = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), orderBy('sentAt', 'desc')),
      snap => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.empty}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imageUrl && <NotifImage uri={item.imageUrl} />}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody2}>{item.body}</Text>
                {item.sentAt && (
                  <Text style={styles.cardDate}>
                    {item.sentAt.toDate().toLocaleDateString(undefined, {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </Text>
                )}
                {item.actionLabel && item.actionRoute && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.8}
                    onPress={() => router.push(item.actionRoute as any)}
                  >
                    <Text style={styles.actionBtnText}>{item.actionLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title:      { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty:      { color: COLORS.textMuted, fontSize: 15 },
  list:       { padding: 16, gap: 12 },
  card:       { backgroundColor: '#0d1526', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardImage:       { width: '100%', height: 160 },
  imagePlaceholder: { backgroundColor: '#1a2236' },
  cardBody:   { padding: 14, gap: 6 },
  cardTitle:  { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  cardBody2:  { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  cardDate:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  actionBtn:  { marginTop: 8, backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  actionBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
