import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/colors';
import { SpinWheel } from '../../src/components/SpinWheel';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { recordSpin } from '../../src/firebase/database';
import { WheelSegment, SpinResult } from '../../src/types';
import { getTimeAgo, formatCurrency } from '../../src/utils/helpers';
import { Timestamp } from 'firebase/firestore';

export default function SpinScreen() {
  const { user } = useAuthStore();
  const { profile, spinHistory, fetchProfile, fetchSpinHistory } = useUserStore();
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (user) fetchSpinHistory(user.uid);
  }, [user]);

  const handleSpinComplete = async (segment: WheelSegment) => {
    if (!user) return;
    const spinResult: SpinResult = {
      label: segment.label,
      type: segment.type,
      value: segment.value,
      duration: segment.duration,
    };
    await recordSpin(user.uid, spinResult);
    await fetchProfile(user.uid);
    await fetchSpinHistory(user.uid);
    setResult(segment);
    setShowModal(true);
  };

  const freeSpins = profile?.freeSpinsAvailable ?? 0;

  const getResultText = (seg: WheelSegment) => {
    if (seg.type === 'cash') return `You won ${formatCurrency(seg.value)}!`;
    if (seg.type === 'xp') return `You earned XP ${seg.value}!`;
    if (seg.type === 'boost') return `You got a ${seg.value}x Boost for ${seg.duration}min!`;
    if (seg.type === 'spin_bonus') return `You got ${seg.value}x extra spins for ${seg.duration}min!`;
    return `You got ${seg.label}!`;
  };

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      {/* Header */}
      <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
        <Text style={styles.headerTitle}>LUCKY SPIN</Text>
        <View style={styles.spinCountBadge}>
          <Ionicons name="refresh-circle" size={16} color={COLORS.gold} />
          <Text style={styles.spinCountText}>{freeSpins} free spin{freeSpins !== 1 ? 's' : ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Wheel */}
        <View style={styles.wheelWrap}>
          <SpinWheel
            onSpinComplete={handleSpinComplete}
            disabled={freeSpins <= 0}
          />
        </View>

        {/* Free spin label */}
        <Text style={styles.freeLabel}>
          {freeSpins > 0
            ? `You have ${freeSpins} free spin${freeSpins !== 1 ? 's' : ''} today`
            : 'No free spins remaining today'}
        </Text>

        {/* Get More Spins button */}
        <TouchableOpacity activeOpacity={0.85} style={styles.moreBtn}>
          <LinearGradient
            colors={[COLORS.purple, COLORS.purpleDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.moreBtnInner}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.moreBtnText}>GET MORE SPINS</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Spin History */}
        {spinHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Spin History</Text>
            <View style={styles.historyList}>
              {spinHistory.map((item, i) => {
                const ts = item.timestamp as unknown as Timestamp;
                const date = ts ? ts.toDate() : new Date();
                return (
                  <View key={item.id ?? i} style={styles.historyItem}>
                    <View style={[styles.historyDot, { backgroundColor: item.type === 'cash' ? COLORS.gold : item.type === 'xp' ? COLORS.purple : COLORS.blue }]} />
                    <Text style={styles.historyLabel}>
                      You won <Text style={{ color: COLORS.gold, fontWeight: '700' }}>{item.label}</Text>
                    </Text>
                    <Text style={styles.historyTime}>{getTimeAgo(date)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setShowModal(false)}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#1a2236', '#0d1526']} style={styles.modalInner}>
              <Text style={styles.modalEmoji}>🎉</Text>
              <Text style={styles.modalTitle}>Congratulations!</Text>
              {result && <Text style={styles.modalResult}>{getResultText(result)}</Text>}
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalBtn}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[COLORS.gold, COLORS.goldDark]} style={styles.modalBtnInner}>
                  <Text style={styles.modalBtnText}>AWESOME!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  spinCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  spinCountText: { fontSize: 13, color: COLORS.gold, fontWeight: '700' },
  scroll: { padding: 24, alignItems: 'center', gap: 20, paddingBottom: 40 },
  wheelWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeLabel: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  moreBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  moreBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  moreBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  historySection: { width: '100%', gap: 12 },
  historyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  historyList: { gap: 10 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyLabel: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  historyTime: { fontSize: 12, color: COLORS.textSecondary },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  modalInner: { padding: 32, alignItems: 'center', gap: 12, borderRadius: 20 },
  modalEmoji: { fontSize: 56 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  modalResult: { fontSize: 16, color: COLORS.gold, fontWeight: '700', textAlign: 'center' },
  modalBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  modalBtnInner: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  modalBtnText: { color: '#1a0a00', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});
