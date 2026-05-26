import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { WheelSegment } from '../types';


function weightedRandom(segs: WheelSegment[]): number {
  const total = segs.reduce((s, seg) => s + (seg.weight ?? 1), 0);
  let r = Math.random() * total;
  for (let i = 0; i < segs.length; i++) {
    r -= (segs[i].weight ?? 1);
    if (r <= 0) return i;
  }
  return segs.length - 1;
}

interface SpinWheelProps {
  segments: WheelSegment[];
  onSpinComplete: (segment: WheelSegment) => void;
  onSpinStart?: () => void;
  disabled?: boolean;
  buttonLabel?: string;
  betAmount?: number; // >0 = paid mode; show multiplier labels on cash segments
}

const SIZE   = 280;
const RADIUS = SIZE / 2;
const CENTER = RADIUS;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ segments, onSpinComplete, onSpinStart, disabled, buttonLabel, betAmount = 0 }) => {
  const segs = segments;
  const num  = segs.length;

  // Store total accumulated degrees so we never reset the animated value
  const totalDeg   = useRef(0);
  const rotation   = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);
    onSpinStart?.();

    const winIndex = weightedRandom(segs);
    const segDeg   = 360 / num;

    // Pointer is at top (0°). Segment i centre is at (i + 0.5) * segDeg from top.
    // We need the wheel to rotate so that position lands at 0°.
    const segCentre = (winIndex + 0.5) * segDeg;
    const targetFinal = (360 - segCentre % 360 + 360) % 360;
    const currentPos  = totalDeg.current % 360;
    let   delta       = (targetFinal - currentPos + 360) % 360;
    if (delta < segDeg) delta += 360;

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const target = totalDeg.current + extraSpins * 360 + delta;
    totalDeg.current = target;

    Animated.timing(rotation, {
      toValue:         target,
      duration:        4200,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,   // false = works on all platforms including web
    }).start(() => {
      setSpinning(false);
      onSpinComplete(segs[winIndex]);
    });
  };

  // Map degrees to rotation string — use a wide range so extrapolation stays linear
  const rotateStyle = rotation.interpolate({
    inputRange:  [0, 36000],
    outputRange: ['0deg', '36000deg'],
    extrapolate: 'extend',
  });

  const btnLabel = spinning ? '···' : (buttonLabel ?? 'SPIN');

  return (
    <View style={styles.container}>
      <View style={styles.outerRing}>
        {/* Pointer — triangle pointing DOWN into the wheel from above */}
        <View style={styles.pointerWrap}>
          <View style={styles.pointerStem} />
          <View style={styles.pointer} />
        </View>

        {/* Spinning wheel */}
        <Animated.View style={{ transform: [{ rotate: rotateStyle }] }}>
          <Svg width={SIZE} height={SIZE}>
            {segs.map((seg, i) => {
              const segDegLocal = 360 / num;
              const angle       = (2 * Math.PI) / num;
              const startDeg    = i * segDegLocal;
              const endDeg      = startDeg + segDegLocal;
              const r           = RADIUS - 3;
              const p1 = polarToXY(startDeg, 4);
              const p2 = polarToXY(startDeg, r);
              const p3 = polarToXY(endDeg,   r);
              const p4 = polarToXY(endDeg,   4);
              const largeArc = angle > Math.PI ? 1 : 0;
              const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r} ${r} 0 ${largeArc} 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
              const midDeg = startDeg + segDegLocal / 2;
              const tr     = RADIUS * 0.62;
              const tp     = polarToXY(midDeg, tr);
              const mx = seg.multiplier ?? seg.value;
              const displayLabel = (betAmount > 0 && seg.type === 'cash')
                ? `${mx}×`
                : seg.label;
              return (
                <G key={i}>
                  <Path d={path} fill={seg.color} stroke="#1a0a00" strokeWidth={1.5} />
                  <SvgText
                    x={tp.x}
                    y={tp.y}
                    fill={seg.textColor}
                    fontSize={displayLabel.length > 5 ? 9 : 11}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${midDeg}, ${tp.x}, ${tp.y})`}
                  >
                    {displayLabel}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={CENTER} cy={CENTER} r={RADIUS - 3} fill="none" stroke="#f59e0b" strokeWidth={4} />
            <Circle cx={CENTER} cy={CENTER} r={38} fill="#0d1526" stroke="#f59e0b" strokeWidth={3} />
          </Svg>
        </Animated.View>

        {/* Centre SPIN button */}
        <TouchableOpacity
          onPress={spin}
          disabled={spinning || disabled}
          activeOpacity={0.85}
          style={styles.spinBtnWrap}
        >
          <LinearGradient
            colors={disabled ? ['#4b4b4b', '#2a2a2a'] : ['#fbbf24', '#d97706']}
            style={styles.spinBtn}
          >
            <Text style={[styles.spinText, disabled && { color: '#888' }]}>
              {btnLabel}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  outerRing: {
    width: SIZE + 16,
    height: SIZE + 16,
    borderRadius: (SIZE + 16) / 2,
    borderWidth: 3,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080c18',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  // Pointer: stem on top, triangle pointing DOWN below it
  pointerWrap: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    zIndex: 20,
  },
  pointerStem: {
    width: 6,
    height: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 20,
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#f59e0b',
  },

  spinBtnWrap: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#0d1526',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  spinBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinText: {
    color: '#1a0a00',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
