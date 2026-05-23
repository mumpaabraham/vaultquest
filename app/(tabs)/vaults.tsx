import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { VaultCard } from '../../src/components/VaultCard';
import { Vault } from '../../src/types';
import { formatCurrency } from '../../src/utils/helpers';

export default function VaultsScreen() {
  const { user } = useAuthStore();
  const { vaults, profile, fetchVaults, fetchProfile, processEarnings } = useUserStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchVaults(user.uid);
    await processEarnings(user.uid);
    await fetchProfile(user.uid);
    setRefreshing(false);
  };

  const handleVaultAction = (vault: Vault) => {
    if (vault.status === 'active') {
      Alert.alert(
        `${vault.tierName} Vault Details`,
        `Invested: ${formatCurrency(vault.invested)}\nDaily Earnings: ${formatCurrency(vault.dailyEarnings)}\nTotal Earned so far: ${formatCurrency(vault.totalEarned)}\nDuration: ${vault.durationDays} days`
      );
    } else {
      router.push('/deposit');
    }
  };

  const activeVaults = vaults.filter((v) => v.status === 'active');
  const completedVaults = vaults.filter((v) => v.status === 'completed');

  const totalInvested = activeVaults.reduce((s, v) => s + v.invested, 0);
  const totalDailyEarnings = activeVaults.reduce((s, v) => s + v.dailyEarnings, 0);

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      {/* Header */}
      <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
        <Text style={styles.headerTitle}>MY INVESTMENTS</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
      >
        {/* Summary card */}
        {activeVaults.length > 0 && (
          <LinearGradient
            colors={['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)']}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>Total Invested</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalInvested)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>Daily Earnings</Text>
                <Text style={[styles.summaryValue, { color: COLORS.green }]}>
                  {formatCurrency(totalDailyEarnings)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryLabel}>Active Vaults</Text>
                <Text style={styles.summaryValue}>{activeVaults.length}</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* New Investment button */}
        <TouchableOpacity
          onPress={() => router.push('/deposit')}
          activeOpacity={0.85}
          style={styles.newBtn}
        >
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newBtnInner}
          >
            <Ionicons name="add-circle-outline" size={20} color="#1a0a00" />
            <Text style={styles.newBtnText}>NEW INVESTMENT</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Active Vaults */}
        {activeVaults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Vaults</Text>
            {activeVaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} onAction={handleVaultAction} />
            ))}
          </>
        )}

        {/* Completed Vaults */}
        {completedVaults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedVaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault} onAction={handleVaultAction} />
            ))}
          </>
        )}

        {/* Empty state */}
        {vaults.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏦</Text>
            <Text style={styles.emptyTitle}>No Investments Yet</Text>
            <Text style={styles.emptySub}>Start earning by making your first deposit</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
    textAlign: 'center',
  },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryStat: { alignItems: 'center', gap: 4, flex: 1 },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  divider: { width: 1, height: 40, backgroundColor: COLORS.border },
  newBtn: { borderRadius: 14, overflow: 'hidden' },
  newBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  newBtnText: { color: '#1a0a00', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: -4,
  },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
