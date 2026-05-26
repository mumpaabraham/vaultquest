import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Image, ImageBackground, Modal, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { Header } from '../../src/components/Header';
import { LevelProgress } from '../../src/components/LevelProgress';
import { Button } from '../../src/components/ui/Button';
import { useCountdown } from '../../src/hooks/useCountdown';
import { formatCurrency } from '../../src/utils/helpers';
import app from '../../src/firebase/config';

function WebDownloadBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (Platform.OS !== 'web' || dismissed) return null;
  return (
    <View style={webBanner.wrap}>
      <Image source={require('../../assets/android.png')} style={webBanner.icon} resizeMode="contain" />
      <Text style={webBanner.text}>Get the full experience — download the Android app</Text>
      <TouchableOpacity onPress={() => router.push('/download')} style={webBanner.btn} activeOpacity={0.85}>
        <Text style={webBanner.btnText}>Download</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} style={webBanner.close} activeOpacity={0.7}>
        <Ionicons name="close" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const webBanner = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.25)', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  icon: { width: 24, height: 24 },
  text: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  btn:  { backgroundColor: COLORS.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  close: { padding: 4 },
});

const fns = getFunctions(app);

const MS_24H = 24 * 60 * 60 * 1000;

const FEATURE_CARDS = [
  { id: 'missions',    image: require('../../assets/tasks.png'),       title: 'Missions',    sub: 'Complete & Earn', color: '#7c3aed', route: '/(tabs)/missions' },
  { id: 'spin',        image: require('../../assets/spin.png'),        title: 'Lucky Spin',  sub: 'Win Rewards',     color: '#1d4ed8', route: '/(tabs)/spin' },
  { id: 'referral',    image: require('../../assets/referrals.png'),   title: 'Referral',    sub: 'Invite & Earn',   color: '#065f46', route: '/refer' },
  { id: 'leaderboard', image: require('../../assets/leaderboard.png'), title: 'Leaderboard', sub: 'Top Players',     color: '#92400e', route: '/leaderboard' },
];

// ─── Chest Win Modal ──────────────────────────────────────────────────────────

function ChestWinModal({ reward, onCollect }: { reward: number; onCollect: () => void }) {
  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onCollect}>
      <Pressable style={winModal.overlay} onPress={onCollect}>
        <View style={winModal.card} onStartShouldSetResponder={() => true}>
          {/* Full-card background image */}
          <Image
            source={require('../../assets/chestwin.png')}
            style={winModal.cardImage}
            resizeMode="contain"
          />

          {/* Dark gradient over the lower half for text legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={winModal.fadeOverlay}
          />

          <View style={winModal.content}>
            <Text style={winModal.title}>Daily Chest Opened!</Text>
            <Text style={winModal.sub}>You found</Text>
            <Text style={winModal.amount}>{formatCurrency(reward)}</Text>

            <TouchableOpacity onPress={onCollect} activeOpacity={0.85} style={{ width: '100%' }}>
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={winModal.collectBtn}
              >
                <Text style={winModal.collectText}>COLLECT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { profile, vaults, fetchProfile, fetchVaults, processEarnings } = useUserStore();

  const [refreshing,   setRefreshing]   = useState(false);
  const [chestLoading, setChestLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [chestReward,  setChestReward]  = useState<number | null>(null);

  useEffect(() => {
    if (user) fetchVaults(user.uid);
  }, [user]);

  const activeVaults = useMemo(() => vaults.filter(v => v.status === 'active'), [vaults]);

  const totalDailyEarnings = useMemo(
    () => activeVaults.reduce((s, v) => s + v.dailyEarnings, 0),
    [activeVaults]
  );

  const totalInvested = useMemo(
    () => activeVaults.reduce((s, v) => s + v.invested, 0),
    [activeVaults]
  );

  const canClaimEarnings = useMemo(() => {
    if (activeVaults.length === 0) return false;
    return activeVaults.some(v => {
      const lp = (v.lastPayout as unknown as Timestamp).toDate();
      return Date.now() - lp.getTime() >= MS_24H;
    });
  }, [activeVaults]);

  // Epoch ms when the next vault earning becomes claimable (for countdown)
  const nextClaimMs = useMemo(() => {
    if (activeVaults.length === 0) return undefined;
    const times = activeVaults.map(v =>
      (v.lastPayout as unknown as Timestamp).toDate().getTime() + MS_24H
    );
    return Math.min(...times);
  }, [activeVaults]);

  const countdown = useCountdown(nextClaimMs);

  // Chest is available when at least one vault is 24h+ old AND it hasn't been opened in the last 24h
  const chestAvailable = useMemo(() => {
    const hasMaturedVault = activeVaults.some(v => {
      const start = (v.startDate as unknown as Timestamp).toDate();
      return Date.now() - start.getTime() >= MS_24H;
    });
    if (!hasMaturedVault) return false;
    if (!profile?.dailyChestLastOpened) return true;
    const last = (profile.dailyChestLastOpened as unknown as Timestamp).toDate();
    return Date.now() - last.getTime() >= MS_24H;
  }, [profile?.dailyChestLastOpened, activeVaults]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([fetchProfile(user.uid), fetchVaults(user.uid)]);
    setRefreshing(false);
  }, [user]);

  const handleClaimEarnings = async () => {
    if (!user) return;
    if (!canClaimEarnings) {
      Alert.alert(
        activeVaults.length === 0 ? 'No Active Vaults' : 'Already Claimed',
        activeVaults.length === 0
          ? 'Invest in a vault to start earning daily rewards.'
          : 'Come back tomorrow to claim your next earnings!'
      );
      return;
    }
    setClaimLoading(true);
    const earned = await processEarnings(user.uid);
    setClaimLoading(false);
    if (earned > 0) {
      Alert.alert('Earnings Claimed!', `You received ${formatCurrency(earned)} from your active vaults.`);
    } else {
      Alert.alert('Nothing to Claim', 'No earnings are available yet. Check back tomorrow.');
    }
  };

  const handleOpenChest = async () => {
    if (!user || chestLoading) return;

    if (!chestAvailable) {
      Alert.alert('Chest Already Opened', 'Come back tomorrow for another chest!');
      return;
    }

    setChestLoading(true);
    try {
      const fn = httpsCallable<Record<string, never>, { alreadyOpened: boolean; reward: number; noVaults?: boolean }>(
        fns, 'openDailyChest'
      );
      const { data } = await fn({});

      if (data.alreadyOpened) {
        Alert.alert('Chest Already Opened', 'Come back tomorrow for another chest!');
      } else if (data.noVaults || data.reward === 0) {
        Alert.alert(
          'No Active Investments',
          'The daily chest rewards 1% of your active investments. Start investing to unlock it!'
        );
      } else {
        await fetchProfile(user.uid);
        setChestReward(data.reward);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not open chest. Please try again.');
    } finally {
      setChestLoading(false);
    }
  };

  if (!profile) return null;

  const chestHint = totalInvested > 0
    ? `Earn ${formatCurrency(totalInvested * 0.01)}`
    : 'Invest to unlock';

  return (
    <ImageBackground source={require('../../assets/background.png')} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={['rgba(8,12,24,0.72)', 'rgba(8,12,24,0.60)', 'rgba(8,12,24,0.82)']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <WebDownloadBanner />
        <Header
          displayName={profile.displayName}
          level={profile.level}
          walletBalance={profile.walletBalance}
          onAddFunds={() => router.push('/deposit')}
          onNotification={() => router.push('/notifications')}
          variant="transparent"
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
          }
        >
          {/* Logo Banner */}
          <View style={styles.bannerWrapper}>
            <Image source={require('../../assets/logo.png')} style={styles.bannerLogo} resizeMode="contain" />
          </View>

          {/* Daily Earnings + Chest Row */}
          <View style={styles.row}>
            {/* Daily Earnings */}
            <View style={[styles.halfCard, { borderColor: 'rgba(245,158,11,0.6)' }]}>
              <LinearGradient colors={['rgba(30,22,6,0.97)', 'rgba(18,14,4,0.97)']} style={styles.halfInner}>
                <View style={styles.earningsHeader}>
                  <Ionicons name="trending-up" size={16} color={COLORS.green} />
                  <Text style={styles.earningsLabel}>Daily Earnings</Text>
                </View>
                <Text style={styles.earningsValue}>{formatCurrency(totalDailyEarnings)}</Text>
                <Text style={styles.earningsSub}>
                  {activeVaults.length > 0
                    ? `${activeVaults.length} active vault${activeVaults.length > 1 ? 's' : ''}`
                    : 'No active vaults'}
                </Text>
                <View style={styles.countdownRow}>
                  <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.countdown}>{countdown}</Text>
                </View>
                <Button
                  label={claimLoading ? '...' : canClaimEarnings ? 'CLAIM EARNINGS' : 'CLAIMED TODAY'}
                  onPress={handleClaimEarnings}
                  variant="gold"
                  size="sm"
                  fullWidth
                  loading={claimLoading}
                  style={{ marginTop: 'auto', opacity: canClaimEarnings ? 1 : 0.55 }}
                />
              </LinearGradient>
            </View>

            {/* Daily Chest */}
            <View style={[styles.halfCard, { borderColor: chestAvailable ? 'rgba(124,58,237,0.65)' : 'rgba(80,80,80,0.4)' }]}>
              <LinearGradient
                colors={chestAvailable ? ['rgba(22,10,44,0.97)', 'rgba(14,6,28,0.97)'] : ['rgba(20,20,20,0.97)', 'rgba(12,12,12,0.97)']}
                style={styles.halfInner}
              >
                <Text style={styles.chestTitle}>Daily Chest</Text>
                <Image
                  source={chestAvailable
                    ? require('../../assets/chest.png')
                    : require('../../assets/chest.png')
                  }
                  style={[styles.chestImg, !chestAvailable && { opacity: 0.35 }]}
                  resizeMode="contain"
                />
                <Text style={styles.chestHint}>{chestAvailable ? chestHint : 'Opened today'}</Text>
                <Button
                  label={chestLoading ? '...' : chestAvailable ? 'OPEN' : 'TOMORROW'}
                  onPress={handleOpenChest}
                  variant="purple"
                  size="sm"
                  loading={chestLoading}
                  fullWidth
                  style={{ marginTop: 'auto', opacity: chestAvailable ? 1 : 0.45 }}
                />
              </LinearGradient>
            </View>
          </View>

          {/* Level Progress */}
          <LevelProgress level={profile.level} xp={profile.xp} xpToNextLevel={profile.xpToNextLevel} />

          {/* Feature Cards */}
          <View style={styles.grid}>
            {FEATURE_CARDS.map(card => (
              <TouchableOpacity
                key={card.id}
                onPress={() => router.push(card.route as any)}
                activeOpacity={0.85}
                style={[styles.featureCard, { borderColor: card.color + '99' }]}
              >
                <LinearGradient
                  colors={[card.color + 'cc', card.color + '88']}
                  style={styles.featureInner}
                >
                  <Image source={card.image} style={styles.featureIconImg} resizeMode="contain" />
                  <Text style={styles.featureTitle} numberOfLines={1}>{card.title}</Text>
                  <Text style={styles.featureSub}   numberOfLines={1}>{card.sub}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Preload chest win image so it's decoded before the modal opens */}
      <Image source={require('../../assets/chestwin.png')} style={{ width: 0, height: 0, position: 'absolute' }} />

      {/* Chest win modal */}
      {chestReward !== null && (
        <ChestWinModal
          reward={chestReward}
          onCollect={() => setChestReward(null)}
        />
      )}
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:        { flex: 1 },
  safeArea:  { flex: 1 },
  scroll:    { padding: 12, gap: 10, paddingBottom: 16 },

  bannerWrapper: { alignItems: 'center', paddingVertical: 2 },
  bannerLogo:    { width: 200, height: 136 },

  row:      { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  halfInner:{ padding: 14, gap: 4, flex: 1 },

  earningsHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsLabel:  { fontSize: 12, color: COLORS.textSecondary },
  earningsValue:  { fontSize: 26, fontWeight: '900', color: COLORS.green },
  earningsSub:    { fontSize: 11, color: COLORS.textMuted },
  countdownRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  countdown:      { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },

  chestTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  chestImg:   { width: 80, height: 72, alignSelf: 'center', marginVertical: 4 },
  chestHint:  { fontSize: 11, color: COLORS.purple, textAlign: 'center', fontWeight: '700' },

  grid: { flexDirection: 'row', gap: 8 },
  featureCard: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  featureInner:{ padding: 8, alignItems: 'center', gap: 4 },
  featureIconImg:{ width: 26, height: 26 },
  featureTitle:{ fontSize: 11, fontWeight: '800', color: COLORS.textPrimary },
  featureSub:  { fontSize: 9, color: COLORS.textSecondary, textAlign: 'center' },
});

const winModal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', borderRadius: 28, overflow: 'hidden',
    aspectRatio: 1,
    backgroundColor: '#2d0f5e',
    justifyContent: 'flex-end',
  },
  cardImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  fadeOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '55%',
  },
  content: {
    padding: 24, alignItems: 'center', gap: 6,
  },
  title:  { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  sub:    { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  amount: { fontSize: 44, fontWeight: '900', color: COLORS.gold, marginBottom: 12 },
  collectBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  collectText: { color: '#1a0a00', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});
