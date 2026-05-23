import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { getLevelTierColor, getLevelTierName } from '../constants/tiers';

interface LevelProgressProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({ level, xp, xpToNextLevel }) => {
  const tierName = getLevelTierName(level);
  const tierColor = getLevelTierColor(level);
  const progress = Math.min(xp / xpToNextLevel, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tierBadge}>
          <Text style={[styles.tierText, { color: tierColor }]}>Current Level</Text>
          <Text style={[styles.tierName, { color: tierColor }]}>{tierName}</Text>
        </View>
        <View style={styles.levelRow}>
          <Text style={styles.levelLabel}>Lv: {level}</Text>
          <Text style={styles.xpText}>
            {xp} / {xpToNextLevel} XP
          </Text>
          <Text style={styles.nextLabel}>Lv: {level + 1}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <LinearGradient
          colors={[tierColor + 'cc', tierColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${(progress * 100).toFixed(0)}%` as any }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    gap: 2,
  },
  tierText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  xpText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  nextLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
