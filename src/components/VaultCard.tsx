import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Timestamp } from 'firebase/firestore';
import { COLORS } from '../constants/colors';
import { Vault } from '../types';
import { formatCurrency, formatDate, daysRemaining } from '../utils/helpers';
import { TIERS } from '../constants/tiers';
import { Badge } from './ui/Badge';

interface VaultCardProps {
  vault: Vault;
  onAction: (vault: Vault) => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({ vault, onAction }) => {
  const tier = TIERS.find((t) => t.id === vault.tierId);
  const tierColor = tier?.color ?? COLORS.gold;
  const tierGrad = (tier?.gradientColors ?? [COLORS.gold, COLORS.goldDark]) as [string, string];
  const isActive = vault.status === 'active';

  const endDate =
    vault.endDate instanceof Timestamp
      ? vault.endDate.toDate()
      : new Date(vault.endDate as unknown as string);

  const remaining = daysRemaining(endDate);

  return (
    <View style={[styles.wrapper, { borderColor: tierColor + '55' }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={tierGrad} style={styles.iconCircle}>
              <Text style={styles.iconText}>{tier?.icon ?? '🏆'}</Text>
            </LinearGradient>
            <View>
              <Text style={[styles.vaultName, { color: tierColor }]}>
                {vault.tierName} Vault
              </Text>
              {isActive ? (
                <Badge label="Active" bgColor="#166534" color={COLORS.green} />
              ) : (
                <Badge label="Completed" bgColor="#374151" color={COLORS.textSecondary} />
              )}
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Invested</Text>
            <Text style={styles.statValue}>{formatCurrency(vault.invested)}</Text>
          </View>

          {isActive ? (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Daily Earnings</Text>
              <Text style={[styles.statValue, { color: COLORS.green }]}>
                {formatCurrency(vault.dailyEarnings)}
              </Text>
            </View>
          ) : (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={[styles.statValue, { color: COLORS.green }]}>
                {formatCurrency(vault.totalEarned)}
              </Text>
            </View>
          )}

          {isActive ? (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{vault.durationDays} Days</Text>
            </View>
          ) : (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Completed On</Text>
              <Text style={styles.statValue}>{formatDate(endDate)}</Text>
            </View>
          )}

          {isActive && (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remaining} Days</Text>
            </View>
          )}
        </View>

        {/* Progress bar (active only) */}
        {isActive && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={tierGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(
                      ((vault.durationDays - remaining) / vault.durationDays) * 100
                    )}%` as any,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Action button */}
        <TouchableOpacity onPress={() => onAction(vault)} activeOpacity={0.85} style={styles.btn}>
          <LinearGradient
            colors={isActive ? tierGrad : [COLORS.purple, COLORS.purpleDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnInner}
          >
            <Text style={[styles.btnText, isActive && { color: '#1a0a00' }]}>
              {isActive ? 'VIEW DETAILS' : 'INVEST AGAIN'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradient: {
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  vaultName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flex: 1,
    minWidth: '40%',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressWrap: {
    marginTop: 4,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  btn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  btnInner: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
