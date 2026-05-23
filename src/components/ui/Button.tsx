import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'gold' | 'purple' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'gold',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const sizeStyles = {
    sm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    md: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    lg: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  };

  const textSizes = {
    sm: 13,
    md: 15,
    lg: 17,
  };

  if (variant === 'gold' || variant === 'purple') {
    const colors =
      variant === 'gold'
        ? ([COLORS.goldLight, COLORS.gold, COLORS.goldDark] as const)
        : ([COLORS.purpleLight, COLORS.purple, COLORS.purpleDark] as const);

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={disabled ? ['#374151', '#374151'] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                { fontSize: textSizes[size] },
                variant === 'gold' && { color: '#1a0a00' },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        sizeStyles[size],
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.gold} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: textSizes[size] },
            variant === 'outline' && { color: COLORS.gold },
            variant === 'ghost' && { color: COLORS.textSecondary },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
