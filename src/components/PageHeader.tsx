import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../constants/colors';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  noBack?: boolean;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, onBack, noBack, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#0d1526', '#080c18']}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      {noBack ? (
        <View style={styles.side} />
      ) : (
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}

      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.side}>{right ?? null}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  center: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  side: { width: 40, alignItems: 'flex-end' },
});
