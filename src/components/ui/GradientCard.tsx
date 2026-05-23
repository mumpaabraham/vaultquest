import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: readonly [string, string, ...string[]];
  borderColor?: string;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  style,
  gradientColors = ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'],
  borderColor = COLORS.border,
}) => (
  <View style={[styles.wrapper, { borderColor }, style]}>
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      {children}
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
  },
});
