import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { MissionDef } from '../constants/missions';
import { MissionProgress } from '../firebase/missions';
import { formatCurrency } from '../utils/helpers';

interface MissionItemProps {
  mission: MissionDef;
  progress?: MissionProgress;
  onClaim: (missionId: string) => void;
  claiming: boolean;
}

export const MissionItem: React.FC<MissionItemProps> = ({ mission, progress, onClaim, claiming }) => {
  const completed = progress?.completed ?? false;
  const claimed   = progress?.claimed   ?? false;
  const current   = progress?.progress  ?? 0;
  const target    = mission.target ?? 1;
  const hasBar    = !!mission.target && mission.target > 1;
  const pct       = Math.min(current / target, 1);

  const statusColor = claimed ? COLORS.textMuted : completed ? COLORS.green : COLORS.gold;

  return (
    <View style={[styles.card, claimed && styles.cardClaimed]}>
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: statusColor + '22' }]}>
        <Ionicons
          name={claimed ? 'checkmark-circle' : (mission.icon as any)}
          size={22}
          color={claimed ? COLORS.green : statusColor}
        />
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Text style={[styles.title, claimed && styles.dimText]}>{mission.title}</Text>
        <Text style={styles.desc}>{mission.description}</Text>

        {hasBar && (
          <View style={styles.barRow}>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${(pct * 100).toFixed(0)}%` as any }]} />
            </View>
            <Text style={styles.barLabel}>{current}/{target}</Text>
          </View>
        )}

        {/* Rewards */}
        <View style={styles.rewardRow}>
          {mission.rewardXP > 0 && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{mission.rewardXP} XP</Text>
            </View>
          )}
          {mission.rewardCash > 0 && (
            <View style={[styles.rewardBadge, styles.rewardCash]}>
              <Text style={[styles.rewardText, { color: COLORS.green }]}>+{formatCurrency(mission.rewardCash)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action */}
      <View style={styles.action}>
        {claimed ? (
          <View style={styles.claimedBadge}>
            <Ionicons name="checkmark" size={14} color={COLORS.green} />
          </View>
        ) : completed ? (
          <TouchableOpacity
            onPress={() => onClaim(mission.id)}
            disabled={claiming}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[COLORS.gold, COLORS.goldDark]} style={styles.claimBtn}>
              {claiming ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.claimText}>CLAIM</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={14} color={COLORS.textMuted} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 10,
  },
  cardClaimed: { opacity: 0.55 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  dimText: { color: COLORS.textSecondary },
  desc: { fontSize: 12, color: COLORS.textSecondary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  barBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 2 },
  barLabel: { fontSize: 11, color: COLORS.textSecondary },
  rewardRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  rewardBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  rewardCash: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  rewardText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },
  action: { alignItems: 'center' },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  claimText: { fontSize: 12, fontWeight: '800', color: '#1a0a00' },
  claimedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
