import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { WheelSegment } from '../types';

const SEGMENTS: WheelSegment[] = [
  { label: 'XP 50', type: 'xp', value: 50, color: '#6d28d9', textColor: '#fff' },
  { label: 'K0.50', type: 'cash', value: 0.5, color: '#d97706', textColor: '#1a0a00' },
  { label: 'K2', type: 'cash', value: 2, color: '#1e3a5f', textColor: '#fff' },
  { label: '2x Boost', type: 'boost', value: 2, duration: 60, color: '#1d4ed8', textColor: '#fff' },
  { label: 'XP 30', type: 'xp', value: 30, color: '#7c3aed', textColor: '#fff' },
  { label: 'XP 10', type: 'xp', value: 10, color: '#4c1d95', textColor: '#fff' },
  { label: '5x 30m', type: 'spin_bonus', value: 5, duration: 30, color: '#065f46', textColor: '#fff' },
  { label: 'K0.10', type: 'cash', value: 0.1, color: '#374151', textColor: '#fff' },
];

export { SEGMENTS as WHEEL_SEGMENTS };

interface SpinWheelProps {
  onSpinComplete: (segment: WheelSegment) => void;
  disabled?: boolean;
}

const SIZE = 280;
const RADIUS = SIZE / 2;
const CENTER = RADIUS;
const NUM = SEGMENTS.length;
const ANGLE = (2 * Math.PI) / NUM;

function polarToXY(angle: number, r: number) {
  return {
    x: CENTER + r * Math.cos(angle - Math.PI / 2),
    y: CENTER + r * Math.sin(angle - Math.PI / 2),
  };
}

function segmentPath(index: number) {
  const start = index * ANGLE;
  const end = start + ANGLE;
  const r = RADIUS - 4;
  const p1 = polarToXY(start, 2);
  const p2 = polarToXY(start, r);
  const p3 = polarToXY(end, r);
  const p4 = polarToXY(end, 2);
  const largeArc = ANGLE > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r} ${r} 0 ${largeArc} 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ onSpinComplete, disabled }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const currentDeg = useRef(0);

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);

    const winIndex = Math.floor(Math.random() * NUM);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + (winIndex / NUM) * 360;
    const totalDeg = currentDeg.current + targetAngle;

    rotation.setValue(currentDeg.current);

    Animated.timing(rotation, {
      toValue: totalDeg,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentDeg.current = totalDeg % 360;
      setSpinning(false);
      onSpinComplete(SEGMENTS[winIndex]);
    });
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Pointer */}
      <View style={styles.pointer} />

      {/* Wheel */}
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={SIZE} height={SIZE}>
          <G>
            {SEGMENTS.map((seg, i) => {
              const mid = i * ANGLE + ANGLE / 2;
              const tr = RADIUS * 0.62;
              const tx = CENTER + tr * Math.cos(mid - Math.PI / 2);
              const ty = CENTER + tr * Math.sin(mid - Math.PI / 2);
              const deg = ((mid - Math.PI / 2) * 180) / Math.PI + 90;

              return (
                <G key={i}>
                  <Path d={segmentPath(i)} fill={seg.color} stroke="#080c18" strokeWidth={2} />
                  <SvgText
                    x={tx}
                    y={ty}
                    fill={seg.textColor}
                    fontSize={seg.label.length > 5 ? 9 : 11}
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(${deg}, ${tx}, ${ty})`}
                  >
                    {seg.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </Animated.View>

      {/* Center SPIN button */}
      <TouchableOpacity
        onPress={spin}
        disabled={spinning || disabled}
        activeOpacity={0.85}
        style={styles.spinBtn}
      >
        <Text style={styles.spinText}>SPIN</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pointer: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.gold,
    zIndex: 10,
  },
  spinBtn: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#080c18',
    shadowColor: COLORS.gold,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  spinText: {
    color: '#1a0a00',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
});
