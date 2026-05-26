import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/colors';

interface AppVersion {
  id: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  fileSize: number;
  changelog: string;
  isLatest: boolean;
}

function fmtBytes(bytes: number) {
  if (!bytes) return '';
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function Download() {
  const { user } = useAuthStore();
  const [version, setVersion]       = useState<AppVersion | null>(null);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(
        query(collection(db, 'appVersions'), where('isLatest', '==', true))
      );
      if (!snap.empty) setVersion({ id: snap.docs[0].id, ...snap.docs[0].data() } as AppVersion);
      setLoading(false);
    })();
  }, []);

  const handleDownload = async () => {
    if (!version) return;
    setDownloading(true);
    try {
      await Linking.openURL(version.downloadUrl);
      if (user) {
        await addDoc(collection(db, 'downloads'), {
          uid:          user.uid,
          versionId:    version.id,
          versionName:  version.versionName,
          platform:     Platform.OS,
          downloadedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Download error', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Download App</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : !version ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No version available yet</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.appCard}>
            <Image source={require('../assets/logo.png')} style={styles.appIcon} resizeMode="contain" />
            <Text style={styles.appName}>VaultQuest</Text>
            <Text style={styles.appVersion}>Version {version.versionName}</Text>
            {!!version.fileSize && (
              <Text style={styles.fileSize}>{fmtBytes(version.fileSize)} · Android APK</Text>
            )}
          </View>

          {!!version.changelog && (
            <View style={styles.changelogCard}>
              <Text style={styles.changelogTitle}>What's New</Text>
              <Text style={styles.changelogText}>{version.changelog}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.gold} />
            <Text style={styles.infoText}>
              Enable "Install from unknown sources" in your Android settings before installing.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.downloadBtn}
            activeOpacity={0.85}
            onPress={handleDownload}
            disabled={downloading}
          >
            <Image source={require('../assets/android.png')} style={styles.androidIcon} resizeMode="contain" />
            <Text style={styles.downloadBtnText}>
              {downloading ? 'Opening…' : 'Download for Android'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  title:           { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:       { color: COLORS.textMuted, fontSize: 15 },
  content:         { flex: 1, padding: 20, gap: 16 },
  appCard:         { backgroundColor: '#0d1526', borderRadius: 20, padding: 28, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  appIcon:         { width: 80, height: 80, borderRadius: 20, marginBottom: 6 },
  appName:         { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  appVersion:      { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  fileSize:        { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  changelogCard:   { backgroundColor: '#0d1526', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  changelogTitle:  { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  changelogText:   { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  infoCard:        { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'flex-start' },
  infoText:        { flex: 1, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  downloadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.gold, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  androidIcon:     { width: 26, height: 26 },
  downloadBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});
