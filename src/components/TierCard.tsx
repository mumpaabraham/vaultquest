import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { Tier } from '../types';
import { formatCurrency } from '../utils/helpers';
import { Badge } from './ui/Badge';

interface TierCardProps {
  tier: Tier;
  isSelected?: boolean;
  onSelect: (tierId: string) => void;
}

export const TierCard: React.FC<TierCardProps> = ({ tier, isSelected, onSelect }) => {
  const borderColor = isSelected ? tier.color : COLORS.border;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(tier.id)}
      style={[styles.wrapper, { borderColor }]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
        style={styles.gradient}
      >
        <View style={styles.row}>
          {/* Icon + name */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={tier.gradientColors as [string, string]}
              style={styles.iconGrad}
            >
              <Text style={styles.iconText}>{tier.icon}</Text>
            </LinearGradient>
            <View>
              <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              <Text style={styles.price}>{formatCurrency(tier.price)}</Text>
            </View>
          </View>

          {/* Earnings */}
          <View style={styles.right}>
            {tier.popular && (
              <Badge label="MOST POPULAR" bgColor={COLORS.gold} color="#1a0a00" style={styles.badge} />
            )}
            <View>
              <Text style={styles.earningsLabel}>Daily Earnings</Text>
              <Text style={[styles.earningsValue, { color: COLORS.green }]}>
                {formatCurrency(tier.dailyEarnings)}
              </Text>
            </View>
          </View>
        </View>

        {/* Choose button */}
        <TouchableOpacity
          onPress={() => onSelect(tier.id)}
          activeOpacity={0.85}
          style={[styles.chooseBtn, isSelected && { backgroundColor: tier.color }]}
        >
          <LinearGradient
            colors={isSelected ? (tier.gradientColors as [string, string]) : ['#1e2a3a', '#1e2a3a']}
            style={styles.chooseBtnInner}
          >
            <Text style={[styles.chooseBtnText, isSelected && { color: '#1a0a00' }]}>
              CHOOSE
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradient: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconGrad: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  chooseBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  chooseBtnInner: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  chooseBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1.5,
  },
});
