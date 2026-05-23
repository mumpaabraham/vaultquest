import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { formatCurrency } from '../utils/helpers';

interface HeaderProps {
  displayName: string;
  level: number;
  walletBalance: number;
  avatarUrl?: string;
  onNotification?: () => void;
  onAddFunds?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayName,
  level,
  walletBalance,
  avatarUrl,
  onNotification,
  onAddFunds,
}) => {
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <LinearGradient colors={['#0d1526', '#080c18']} style={styles.container}>
      {/* Avatar + Name */}
      <TouchableOpacity style={styles.userRow} activeOpacity={0.8}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.level}>Level {level}</Text>
        </View>
      </TouchableOpacity>

      {/* Wallet + Notif */}
      <View style={styles.right}>
        <TouchableOpacity onPress={onAddFunds} activeOpacity={0.85} style={styles.wallet}>
          <LinearGradient colors={['#1e2a3a', '#111827']} style={styles.walletGrad}>
            <Ionicons name="logo-bitcoin" size={16} color={COLORS.gold} />
            <Text style={styles.balance}>{formatCurrency(walletBalance)}</Text>
            <View style={styles.addBtn}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNotification} style={styles.notifBtn} activeOpacity={0.85}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  level: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wallet: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  walletGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balance: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  addBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
