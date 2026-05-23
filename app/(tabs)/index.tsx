import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { Header } from '../../src/components/Header';
import { LevelProgress } from '../../src/components/LevelProgress';
import { Button } from '../../src/components/ui/Button';
import { useCountdown } from '../../src/hooks/useCountdown';
import { completeDailyCheckIn, openDailyChest } from '../../src/firebase/database';
import { formatCurrency } from '../../src/utils/helpers';

const FEATURE_CARDS = [
  { id: 'missions', icon: 'trophy-outline', title: 'Missions', sub: 'Complete & Earn', color: '#7c3aed', route: '/(tabs)/missions' },
  { id: 'spin', icon: 'refresh-circle-outline', title: 'Lucky Spin', sub: 'Win Rewards', color: '#1d4ed8', route: '/(tabs)/spin' },
  { id: 'referral', icon: 'people-outline', title: 'Referral', sub: 'Invite & Earn', color: '#065f46', route: '/refer' },
  { id: 'leaderboard', icon: 'bar-chart-outline', title: 'Leaderboard', sub: 'Top Players', color: '#92400e', route: '/leaderboard' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { profile, fetchProfile, fetchVaults, processEarnings } = useUserStore();
  const countdown = useCountdown();
  const [refreshing, setRefreshing] = React.useState(false);
  const [chestLoading, setChestLoading] = React.useState(false);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchProfile(user.uid);
    await fetchVaults(user.uid);
    await processEarnings(user.uid);
    setRefreshing(false);
  }, [user]);

  const handleClaimReward = async () => {
    if (!user) return;
    const success = await completeDailyCheckIn(user.uid);
    if (success) {
      await fetchProfile(user.uid);
      Alert.alert('Reward Claimed!', 'You earned +5 XP for daily check-in!');
    } else {
      Alert.alert('Already Claimed', 'Come back tomorrow for your next reward.');
    }
  };

  const handleOpenChest = async () => {
    if (!user || chestLoading) return;
    setChestLoading(true);
    const reward = await openDailyChest(user.uid);
    setChestLoading(false);
    if (reward !== null) {
      await fetchProfile(user.uid);
      Alert.alert('Daily Chest Opened! 🎁', `You found ${formatCurrency(reward)}!`);
    } else {
      Alert.alert('Chest Already Opened', 'Come back tomorrow for another chest!');
    }
  };

  if (!profile) return null;

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <Header
        displayName={profile.displayName}
        level={profile.level}
        walletBalance={profile.walletBalance}
        onAddFunds={() => router.push('/deposit')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
      >
        {/* Logo Banner */}
        <LinearGradient
          colors={['#0d1a35', '#151f3a', '#0d1a35']}
          style={styles.banner}
        >
          <Text style={styles.bannerEmoji}>⚡</Text>
          <Text style={styles.bannerTitle}>VAULT QUEST</Text>
          <Text style={styles.bannerSub}>PLAY. EARN. GROW.</Text>
        </LinearGradient>

        {/* Daily Earnings + Chest Row */}
        <View style={styles.row}>
          {/* Daily Earnings */}
          <View style={[styles.halfCard, { borderColor: COLORS.borderGold }]}>
            <LinearGradient colors={['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.05)']} style={styles.halfInner}>
              <View style={styles.earningsHeader}>
                <Ionicons name="trending-up" size={16} color={COLORS.green} />
                <Text style={styles.earningsLabel}>Daily Earnings</Text>
              </View>
              <Text style={styles.earningsValue}>{formatCurrency(4.00)}</Text>
              <Text style={styles.earningsSub}>Based on your level</Text>
              <View style={styles.countdownRow}>
                <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.countdown}>{countdown}</Text>
              </View>
              <Button
                label="CLAIM REWARD"
                onPress={handleClaimReward}
                variant="gold"
                size="sm"
                fullWidth
                style={{ marginTop: 8 }}
              />
            </LinearGradient>
          </View>

          {/* Daily Chest */}
          <View style={[styles.halfCard, { borderColor: COLORS.border }]}>
            <LinearGradient colors={['rgba(124,58,237,0.12)', 'rgba(124,58,237,0.05)']} style={styles.halfInner}>
              <Text style={styles.chestTitle}>Daily Chest</Text>
              <Text style={styles.chestEmoji}>🎁</Text>
              <Button
                label={chestLoading ? '...' : 'OPEN'}
                onPress={handleOpenChest}
                variant="purple"
                size="sm"
                loading={chestLoading}
                fullWidth
                style={{ marginTop: 8 }}
              />
            </LinearGradient>
          </View>
        </View>

        {/* Level Progress */}
        <LevelProgress level={profile.level} xp={profile.xp} xpToNextLevel={profile.xpToNextLevel} />

        {/* Feature Cards */}
        <View style={styles.grid}>
          {FEATURE_CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.85}
              style={styles.featureCard}
            >
              <LinearGradient
                colors={[card.color + '40', card.color + '10']}
                style={styles.featureInner}
              >
                <View style={[styles.featureIcon, { backgroundColor: card.color + '30' }]}>
                  <Ionicons name={card.icon as any} size={26} color="#fff" />
                </View>
                <Text style={styles.featureTitle}>{card.title}</Text>
                <Text style={styles.featureSub}>{card.sub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  banner: {
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  bannerEmoji: { fontSize: 48, marginBottom: 6 },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 4,
    textShadowColor: COLORS.gold,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  bannerSub: { fontSize: 13, color: COLORS.textSecondary, letterSpacing: 4, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  halfCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  halfInner: { padding: 14, gap: 4, flex: 1 },
  earningsHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsLabel: { fontSize: 12, color: COLORS.textSecondary },
  earningsValue: { fontSize: 26, fontWeight: '900', color: COLORS.green },
  earningsSub: { fontSize: 11, color: COLORS.textMuted },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  countdown: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  chestTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  chestEmoji: { fontSize: 52, textAlign: 'center', marginVertical: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureInner: { padding: 16, alignItems: 'center', gap: 8 },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  featureSub: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});
