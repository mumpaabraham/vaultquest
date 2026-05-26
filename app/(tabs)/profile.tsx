import React, { useEffect, useReducer } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { logoutUser } from '../../src/firebase/auth';
import { formatCurrency } from '../../src/utils/helpers';
import { getLevelTierName, getLevelTierColor } from '../../src/constants/tiers';
import { LevelProgress } from '../../src/components/LevelProgress';

const MENU_ITEMS = [
  { icon: 'wallet-outline',      label: 'Deposit',   route: '/deposit',    color: '#f59e0b', logout: false },
  { icon: 'cash-outline',        label: 'Withdraw',  route: '/withdraw',   color: '#22c55e', logout: false },
  { icon: 'people-outline',      label: 'Refer',     route: '/refer',      color: '#a78bfa', logout: false },
  { icon: 'bar-chart-outline',   label: 'Ranks',     route: '/leaderboard',color: '#3b82f6', logout: false },
  { icon: 'receipt-outline',     label: 'History',   route: '/history',    color: '#9ca3af', logout: false },
  { icon: 'settings-outline',    label: 'Settings',  route: null,          color: '#94a3b8', logout: false },
  { icon: 'download-outline',    label: 'Download',  route: '/download',   color: '#22d3ee', logout: false },
  { icon: 'log-out-outline',     label: 'Sign Out',  route: null,          color: '#ef4444', logout: true  },
];

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { profile } = useUserStore();
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  useEffect(() => { forceUpdate(); }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!profile) return null;

  const tierName = getLevelTierName(profile.level);
  const tierColor = getLevelTierColor(profile.level);
  const initials = profile.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <LinearGradient colors={['#0d1526', '#111827']} style={styles.profileCard}>
          <View style={[styles.avatar, { borderColor: tierColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={[styles.tier, { color: tierColor }]}>{tierName} Member</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatCurrency(profile.walletBalance)}</Text>
              <Text style={styles.statLabel}>Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>Lv. {profile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.totalReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
          </View>
        </LinearGradient>

        {/* XP Progress */}
        <LevelProgress level={profile.level} xp={profile.xp} xpToNextLevel={profile.xpToNextLevel} />

        {/* Referral Code */}
        <View style={styles.referralCard}>
          <LinearGradient colors={['rgba(124,58,237,0.15)', 'rgba(124,58,237,0.05)']} style={styles.referralInner}>
            <Text style={styles.referralLabel}>Your Referral Code</Text>
            <TouchableOpacity
              style={styles.referralCodeRow}
              onPress={() => router.push('/refer')}
              activeOpacity={0.85}
            >
              <Text style={styles.referralCode}>{profile.referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color={COLORS.gold} />
            </TouchableOpacity>
            <Text style={styles.referralEarned}>
              Total Earned: {formatCurrency(profile.totalReferralEarnings)}
            </Text>
          </LinearGradient>
        </View>

        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuGridItem}
              activeOpacity={0.75}
              onPress={() => {
                if (item.logout) { handleLogout(); return; }
                if (item.route) router.push(item.route as any);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, item.logout && { color: '#ef4444' }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 16, paddingTop: 48, gap: 12, paddingBottom: 24 },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 28 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  tier: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    justifyContent: 'center',
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  referralCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  referralInner: { padding: 16, gap: 8 },
  referralLabel: { fontSize: 12, color: COLORS.textSecondary },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  referralCode: { fontSize: 20, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  referralEarned: { fontSize: 13, color: COLORS.textSecondary },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  menuGridItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '600', textAlign: 'center' },
});
