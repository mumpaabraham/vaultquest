import React from 'react';
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
  { icon: 'wallet-outline', label: 'Deposit Funds', route: '/deposit' },
  { icon: 'people-outline', label: 'Refer & Earn', route: '/refer' },
  { icon: 'bar-chart-outline', label: 'Leaderboard', route: '/leaderboard' },
  { icon: 'receipt-outline', label: 'Transaction History', route: null },
  { icon: 'settings-outline', label: 'Settings', route: null },
  { icon: 'help-circle-outline', label: 'Help & Support', route: null },
];

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { profile } = useUserStore();

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

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              activeOpacity={0.75}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.gold} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 16, paddingTop: 56, gap: 16, paddingBottom: 32 },
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
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red + '50',
    backgroundColor: COLORS.red + '10',
  },
  logoutText: { fontSize: 15, color: COLORS.red, fontWeight: '700' },
});
