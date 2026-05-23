import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { Mission } from '../types';

interface MissionItemProps {
  mission: Mission;
  onClaim?: (missionId: string) => void;
}

export const MissionItem: React.FC<MissionItemProps> = ({ mission, onClaim }) => {
  const isComplete = !!mission.completedAt;
  const hasProgress = mission.progress !== undefined && mission.target !== undefined;

  return (
    <View style={[styles.wrapper, isComplete && styles.wrapperDone]}>
      {/* Left icon */}
      <View style={[styles.iconWrap, isComplete && styles.iconWrapDone]}>
        <Ionicons
          name={isComplete ? 'checkmark' : 'star-outline'}
          size={18}
          color={isComplete ? '#fff' : COLORS.gold}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, isComplete && styles.titleDone]}>{mission.title}</Text>
        <Text style={styles.desc}>{mission.description}</Text>
        {hasProgress && !isComplete && (
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((mission.progress! / mission.target!) * 100).toFixed(0)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {mission.progress}/{mission.target}
            </Text>
          </View>
        )}
      </View>

      {/* XP badge */}
      <View style={styles.right}>
        <Text style={styles.xp}>+XP {mission.xpReward}</Text>
        {!isComplete && onClaim && (
          <TouchableOpacity
            onPress={() => onClaim(mission.id)}
            style={styles.claimBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.claimText}>CLAIM</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
    marginBottom: 10,
  },
  wrapperDone: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDone: {
    backgroundColor: COLORS.green,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  desc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  xp: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
  },
  claimBtn: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  },
  claimText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },
});
