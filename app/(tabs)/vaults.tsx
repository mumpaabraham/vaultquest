import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Modal,
  TouchableOpacity, RefreshControl, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { VaultCard } from '../../src/components/VaultCard';
import { PageHeader } from '../../src/components/PageHeader';
import { Vault } from '../../src/types';
import { formatCurrency, formatDate, daysRemaining } from '../../src/utils/helpers';
import { TIERS } from '../../src/constants/tiers';
import { Badge } from '../../src/components/ui/Badge';

// ─── Vault Detail Modal ───────────────────────────────────────────────────────

function VaultDetailModal({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const tier       = TIERS.find(t => t.id === vault.tierId);
  const tierColor  = tier?.color ?? COLORS.gold;
  const tierGrad   = (tier?.gradientColors ?? [COLORS.gold, COLORS.goldDark]) as [string, string];
  const isActive   = vault.status === 'active';

  const startDate = vault.startDate instanceof Timestamp
    ? vault.startDate.toDate()
    : new Date(vault.startDate as unknown as string);

  const endDate = vault.endDate instanceof Timestamp
    ? vault.endDate.toDate()
    : new Date(vault.endDate as unknown as string);

  const lastPayout = vault.lastPayout instanceof Timestamp
    ? vault.lastPayout.toDate()
    : new Date(vault.lastPayout as unknown as string);

  const remaining      = daysRemaining(endDate);
  const elapsed        = vault.durationDays - remaining;
  const progressPct    = Math.min(100, Math.round((elapsed / vault.durationDays) * 100));
  const totalReturn    = vault.dailyEarnings * vault.durationDays;
  const roi            = ((totalReturn / vault.invested) * 100).toFixed(1);

  const rows: { label: string; value: string; valueColor?: string }[] = [
    { label: 'Invested',          value: formatCurrency(vault.invested) },
    { label: 'Daily Earnings',    value: formatCurrency(vault.dailyEarnings), valueColor: COLORS.green },
    { label: 'Total Earned',      value: formatCurrency(vault.totalEarned),   valueColor: COLORS.green },
    { label: 'Projected Return',  value: formatCurrency(totalReturn),          valueColor: COLORS.gold  },
    { label: 'ROI',               value: `${roi}%`,                            valueColor: COLORS.gold  },
    { label: 'Duration',          value: `${vault.durationDays} days`          },
    ...(isActive ? [
      { label: 'Days Elapsed',    value: `${elapsed} / ${vault.durationDays}` },
      { label: 'Days Remaining',  value: `${remaining} days`,                  valueColor: remaining <= 3 ? COLORS.red : undefined },
    ] : []),
    { label: 'Start Date',        value: formatDate(startDate) },
    { label: 'End Date',          value: formatDate(endDate) },
    { label: 'Last Payout',       value: formatDate(lastPayout) },
  ];

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={modal.overlay} onPress={onClose} />

      <View style={modal.sheet}>
        {/* Drag handle */}
        <View style={modal.handle} />

        {/* Header */}
        <View style={modal.header}>
          <LinearGradient colors={tierGrad} style={modal.iconCircle}>
            <Text style={modal.iconText}>{tier?.icon ?? '🏆'}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[modal.vaultName, { color: tierColor }]}>{vault.tierName} Vault</Text>
            {isActive
              ? <Badge label="Active"    bgColor="#166534" color={COLORS.green} />
              : <Badge label="Completed" bgColor="#374151" color={COLORS.textSecondary} />
            }
          </View>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Progress bar (active only) */}
        {isActive && (
          <View style={modal.progressSection}>
            <View style={modal.progressLabelRow}>
              <Text style={modal.progressLabel}>Progress</Text>
              <Text style={[modal.progressLabel, { color: tierColor, fontWeight: '700' }]}>
                {progressPct}%
              </Text>
            </View>
            <View style={modal.progressBg}>
              <LinearGradient
                colors={tierGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[modal.progressFill, { width: `${progressPct}%` as any }]}
              />
            </View>
          </View>
        )}

        {/* Stats */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {rows.map((row, i) => (
            <View key={row.label} style={[modal.row, i < rows.length - 1 && modal.rowBorder]}>
              <Text style={modal.rowLabel}>{row.label}</Text>
              <Text style={[modal.rowValue, row.valueColor ? { color: row.valueColor } : {}]}>
                {row.value}
              </Text>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* CTA */}
        {!isActive && (
          <TouchableOpacity
            onPress={() => { onClose(); router.push('/deposit'); }}
            activeOpacity={0.85}
            style={modal.ctaWrap}
          >
            <LinearGradient colors={[COLORS.purple, COLORS.purpleDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={modal.cta}>
              <Text style={modal.ctaText}>INVEST AGAIN</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VaultsScreen() {
  const { user } = useAuthStore();
  const { vaults, profile, fetchVaults, fetchProfile, processEarnings } = useUserStore();
  const [refreshing,    setRefreshing]    = React.useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);

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
      setSelectedVault(vault);
    } else {
      router.push('/deposit');
    }
  };

  const activeVaults    = vaults.filter(v => v.status === 'active');
  const completedVaults = vaults.filter(v => v.status === 'completed');

  const totalInvested      = activeVaults.reduce((s, v) => s + v.invested,      0);
  const totalDailyEarnings = activeVaults.reduce((s, v) => s + v.dailyEarnings, 0);

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <PageHeader title="MY INVESTMENTS" noBack />

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
        <TouchableOpacity onPress={() => router.push('/deposit')} activeOpacity={0.85} style={styles.newBtn}>
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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
            {activeVaults.map(vault => (
              <VaultCard key={vault.id} vault={vault} onAction={handleVaultAction} />
            ))}
          </>
        )}

        {/* Completed Vaults */}
        {completedVaults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedVaults.map(vault => (
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

      {/* Detail modal */}
      {selectedVault && (
        <VaultDetailModal vault={selectedVault} onClose={() => setSelectedVault(null)} />
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.borderGold },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center', gap: 4, flex: 1 },
  summaryLabel:{ fontSize: 11, color: COLORS.textSecondary },
  summaryValue:{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  divider:     { width: 1, height: 40, backgroundColor: COLORS.border },

  newBtn:      { borderRadius: 14, overflow: 'hidden' },
  newBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  newBtnText:  { color: '#1a0a00', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: -4 },

  empty:      { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});

const modal = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#0d1526',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  vaultName: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  progressSection: { marginBottom: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel:    { fontSize: 12, color: COLORS.textSecondary },
  progressBg:       { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 4 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowLabel:  { fontSize: 13, color: COLORS.textSecondary },
  rowValue:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },

  ctaWrap: { paddingVertical: 16, paddingBottom: 32 },
  cta:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
