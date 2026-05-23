import React, { useState } from 'react';
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
import { COLORS } from '../src/constants/colors';
import { TIERS } from '../src/constants/tiers';
import { TierCard } from '../src/components/TierCard';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { createVault } from '../src/firebase/database';
import { formatCurrency } from '../src/utils/helpers';

export default function DepositScreen() {
  const { user } = useAuthStore();
  const { profile, fetchProfile, fetchVaults } = useUserStore();
  const [selected, setSelected] = useState<string>('gold');
  const [loading, setLoading] = useState(false);

  const selectedTier = TIERS.find((t) => t.id === selected)!;

  const handleInvest = async () => {
    if (!user || !profile) return;
    if (profile.walletBalance < selectedTier.price) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${formatCurrency(selectedTier.price)} to invest in the ${selectedTier.name} vault.\n\nYour balance: ${formatCurrency(profile.walletBalance)}`
      );
      return;
    }
    Alert.alert(
      'Confirm Investment',
      `Invest ${formatCurrency(selectedTier.price)} in the ${selectedTier.name} Vault?\n\nDaily earnings: ${formatCurrency(selectedTier.dailyEarnings)}\nDuration: ${selectedTier.durationDays} days`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'INVEST',
          onPress: async () => {
            setLoading(true);
            try {
              await createVault(user.uid, selected);
              await fetchProfile(user.uid);
              await fetchVaults(user.uid);
              Alert.alert('Investment Successful! 🎉', `Your ${selectedTier.name} Vault is now active and earning ${formatCurrency(selectedTier.dailyEarnings)}/day!`);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Investment failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      {/* Header */}
      <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DEPOSIT</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance */}
        {profile && (
          <View style={styles.balanceCard}>
            <LinearGradient colors={['rgba(245,158,11,0.1)', 'transparent']} style={styles.balanceInner}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{formatCurrency(profile.walletBalance)}</Text>
            </LinearGradient>
          </View>
        )}

        <Text style={styles.sectionTitle}>Choose Your Vault</Text>
        <Text style={styles.sectionSub}>Select a tier and start earning daily rewards</Text>

        {TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isSelected={selected === tier.id}
            onSelect={setSelected}
          />
        ))}

        {/* Summary */}
        <View style={styles.summary}>
          <LinearGradient
            colors={[selectedTier.color + '22', selectedTier.color + '08']}
            style={styles.summaryInner}
          >
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Vault</Text>
              <Text style={[styles.summaryVal, { color: selectedTier.color }]}>
                {selectedTier.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Investment Amount</Text>
              <Text style={styles.summaryVal}>{formatCurrency(selectedTier.price)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Daily Earnings</Text>
              <Text style={[styles.summaryVal, { color: COLORS.green }]}>
                {formatCurrency(selectedTier.dailyEarnings)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryVal}>{selectedTier.durationDays} Days</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Return</Text>
              <Text style={[styles.totalVal, { color: COLORS.green }]}>
                {formatCurrency(selectedTier.dailyEarnings * selectedTier.durationDays)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Invest button */}
        <TouchableOpacity onPress={handleInvest} disabled={loading} activeOpacity={0.85}>
          <LinearGradient
            colors={loading ? ['#374151', '#374151'] : [selectedTier.color, selectedTier.gradientColors[0]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.investBtn}
          >
            <Text style={styles.investBtnText}>
              {loading ? 'PROCESSING...' : `INVEST ${formatCurrency(selectedTier.price)}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  balanceCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGold },
  balanceInner: { padding: 16, alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 12, color: COLORS.textSecondary },
  balanceValue: { fontSize: 28, fontWeight: '900', color: COLORS.gold },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sectionSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: -8 },
  summary: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  summaryInner: { padding: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryVal: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  totalVal: { fontSize: 18, fontWeight: '900' },
  investBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  investBtnText: { color: '#1a0a00', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
});
