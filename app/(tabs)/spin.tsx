import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { COLORS } from '../../src/constants/colors';
import { SpinWheel } from '../../src/components/SpinWheel';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { recordSpin } from '../../src/firebase/database';
import { WheelSegment, SpinResult } from '../../src/types';
import { getTimeAgo, formatCurrency } from '../../src/utils/helpers';

const BET_ROW1 = [1, 2, 5, 10] as const;
const BET_ROW2 = [20, 50, 100, 200, 500] as const;
const BET_OPTIONS = [...BET_ROW1, ...BET_ROW2] as const;
type BetOption = typeof BET_OPTIONS[number];

// Returns true if the user has NOT used their free spin today (Zambian time CAT = UTC+2)
function canSpinToday(lastSpinTime: Timestamp | null): boolean {
  if (!lastSpinTime) return true;
  const toCAT = (d: Date) => new Date(d.getTime() + 2 * 60 * 60 * 1000);
  return toCAT(new Date()).toDateString() !== toCAT(lastSpinTime.toDate()).toDateString();
}

export default function SpinScreen() {
  const { user }    = useAuthStore();
  const { profile, spinHistory, fetchProfile, fetchSpinHistory, patchProfile } = useUserStore();

  const [segments,      setSegments]      = useState<WheelSegment[] | null>(null);
  const [segmentsError, setSegmentsError] = useState(false);
  const [selectedBet,   setSelectedBet]   = useState<'free' | BetOption>('free');
  const [result,        setResult]        = useState<WheelSegment | null>(null);
  const [showModal,     setShowModal]     = useState(false);

  useEffect(() => {
    if (user) fetchSpinHistory(user.uid);
    getDoc(doc(db, 'settings', 'spinWheel'))
      .then(snap => {
        const data = snap.exists() ? (snap.data() as { segments?: WheelSegment[] }) : null;
        if (data?.segments && data.segments.length > 0) {
          setSegments(data.segments);
        } else {
          setSegmentsError(true);
        }
      })
      .catch(() => setSegmentsError(true));
  }, [user]);

  const freeSpinAvailable = useMemo(
    () => canSpinToday(profile?.lastSpinTime ?? null),
    [profile?.lastSpinTime]
  );

  const balance = profile?.walletBalance ?? 0;

  // Automatically switch away from 'free' if free spin used up
  useEffect(() => {
    if (!freeSpinAvailable && selectedBet === 'free') {
      setSelectedBet(1);
    }
  }, [freeSpinAvailable]);

  const isSpinnable = segments !== null && (
    selectedBet === 'free' ? freeSpinAvailable : balance >= selectedBet
  );

  const buttonLabel = selectedBet === 'free' ? 'FREE' : `K${selectedBet}`;

  const handleSpinStart = () => {
    if (!user || !profile) return;
    const bet = selectedBet === 'free' ? 0 : (selectedBet as number);
    setDoc(doc(db, 'liveSpins', user.uid), {
      uid:         user.uid,
      displayName: profile.displayName,
      betAmount:   bet,
      status:      'spinning',
      updatedAt:   Timestamp.now(),
    }).catch(() => {});
  };

  const handleSpinComplete = (segment: WheelSegment) => {
    if (!user || !profile) return;

    const bet = selectedBet === 'free' ? 0 : (selectedBet as number);
    const mx  = segment.multiplier ?? segment.value;

    // Compute deltas locally — same formula as recordSpin in database.ts
    const cashWin    = segment.type === 'cash'
      ? parseFloat((bet === 0 ? segment.value : bet * mx).toFixed(2))
      : 0;
    const walletDelta = parseFloat((cashWin - (bet === 0 ? 0 : bet)).toFixed(2));

    // 1. Show result modal immediately — zero wait
    setResult(segment);
    setShowModal(true);

    // Write result to liveSpins (admin visibility); auto-delete after 2 min
    setDoc(doc(db, 'liveSpins', user.uid), {
      uid:         user.uid,
      displayName: profile.displayName,
      betAmount:   bet,
      status:      'completed',
      label:       segment.label,
      type:        segment.type,
      cashWin,
      walletDelta,
      updatedAt:   Timestamp.now(),
    }).catch(() => {});
    setTimeout(() => deleteDoc(doc(db, 'liveSpins', user.uid)).catch(() => {}), 2 * 60 * 1000);

    // 2. Optimistic local state patch — UI reflects outcome instantly
    const patch: Partial<typeof profile> = {};
    if (walletDelta !== 0)        patch.walletBalance = parseFloat(((profile.walletBalance ?? 0) + walletDelta).toFixed(2));
    if (segment.type === 'xp')    patch.xp            = (profile.xp ?? 0) + segment.value;
    if (bet === 0)                patch.lastSpinTime  = Timestamp.now();
    patchProfile(patch);

    // 3. Background Firestore sync — no blocking await
    recordSpin(user.uid, segment as SpinResult, bet)
      .then(() => Promise.all([fetchProfile(user.uid), fetchSpinHistory(user.uid)]))
      .catch(() => {
        // Roll back optimistic patch on failure
        patchProfile({
          walletBalance: profile.walletBalance,
          xp:            profile.xp,
          lastSpinTime:  profile.lastSpinTime,
        });
      });
  };

  const getResultText = (seg: WheelSegment) => {
    if (seg.type === 'cash') {
      const bet = selectedBet === 'free' ? 0 : (selectedBet as number);
      const mx  = seg.multiplier ?? seg.value;
      const win = bet === 0 ? seg.value : parseFloat((bet * mx).toFixed(2));
      const net = bet === 0 ? win : parseFloat((win - bet).toFixed(2));
      return bet === 0
        ? `You won ${formatCurrency(win)}!`
        : net >= 0
          ? `You won ${formatCurrency(win)}! (+${formatCurrency(net)} profit)`
          : `You won ${formatCurrency(win)} (${formatCurrency(net)} net)`;
    }
    if (seg.type === 'xp')         return `You earned ${seg.value} XP!`;
    if (seg.type === 'boost')      return `You got a ${seg.value}× Boost for ${seg.duration} min!`;
    if (seg.type === 'spin_bonus') return `You got ${seg.value} extra spins!`;
    return `You got ${seg.label}!`;
  };

  const resultColor = result
    ? result.type === 'cash' ? COLORS.gold
      : result.type === 'xp' ? COLORS.purple
      : COLORS.blue
    : COLORS.gold;

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
          <Text style={styles.headerTitle}>LUCKY SPIN</Text>
          <View style={[styles.freeBadge, !freeSpinAvailable && styles.freeBadgeDim]}>
            <Ionicons
              name="gift-outline"
              size={14}
              color={freeSpinAvailable ? COLORS.gold : COLORS.textMuted}
            />
            <Text style={[styles.freeBadgeText, !freeSpinAvailable && { color: COLORS.textMuted }]}>
              {freeSpinAvailable ? '1 free spin today' : 'Free spin used'}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Wheel — only rendered once admin config is loaded */}
          {segmentsError ? (
            <View style={styles.wheelPlaceholder}>
              <Ionicons name="alert-circle-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.wheelPlaceholderText}>Wheel config unavailable</Text>
              <Text style={styles.wheelPlaceholderSub}>Admin must configure spin segments</Text>
            </View>
          ) : segments === null ? (
            <View style={styles.wheelPlaceholder}>
              <ActivityIndicator color={COLORS.gold} size="large" />
              <Text style={styles.wheelPlaceholderText}>Loading wheel…</Text>
            </View>
          ) : (
            <SpinWheel
              segments={segments}
              onSpinStart={handleSpinStart}
              onSpinComplete={handleSpinComplete}
              disabled={!isSpinnable}
              buttonLabel={buttonLabel}
              betAmount={selectedBet === 'free' ? 0 : selectedBet}
            />
          )}

          {/* Bet selector */}
          <View style={styles.betSection}>
            <Text style={styles.betLabel}>SELECT SPIN MODE</Text>

            {/* Row 1: FREE + K1 K2 K5 K10 */}
            <View style={styles.betRow}>
              <TouchableOpacity
                onPress={() => freeSpinAvailable && setSelectedBet('free')}
                activeOpacity={freeSpinAvailable ? 0.8 : 1}
                style={[
                  styles.betBtn,
                  selectedBet === 'free' && styles.betBtnActive,
                  !freeSpinAvailable && styles.betBtnDisabled,
                ]}
              >
                <Text style={[
                  styles.betBtnText,
                  selectedBet === 'free' && styles.betBtnTextActive,
                  !freeSpinAvailable && styles.betBtnTextDisabled,
                ]}>
                  FREE
                </Text>
                {freeSpinAvailable && <View style={styles.freeDot} />}
              </TouchableOpacity>
              {BET_ROW1.map(amount => {
                const affordable = balance >= amount;
                const active = selectedBet === amount;
                return (
                  <TouchableOpacity
                    key={amount}
                    onPress={() => affordable && setSelectedBet(amount)}
                    activeOpacity={affordable ? 0.8 : 1}
                    style={[styles.betBtn, active && styles.betBtnActive, !affordable && styles.betBtnDisabled]}
                  >
                    <Text style={[styles.betBtnText, active && styles.betBtnTextActive, !affordable && styles.betBtnTextDisabled]}>
                      K{amount}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Row 2: K20 K50 K100 K200 K500 */}
            <View style={styles.betRow}>
              {BET_ROW2.map(amount => {
                const affordable = balance >= amount;
                const active = selectedBet === amount;
                return (
                  <TouchableOpacity
                    key={amount}
                    onPress={() => affordable && setSelectedBet(amount)}
                    activeOpacity={affordable ? 0.8 : 1}
                    style={[styles.betBtn, active && styles.betBtnActive, !affordable && styles.betBtnDisabled]}
                  >
                    <Text style={[styles.betBtnText, active && styles.betBtnTextActive, !affordable && styles.betBtnTextDisabled]}>
                      K{amount}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Balance display */}
            <View style={styles.balanceRow}>
              <Ionicons name="wallet-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.balanceText}>Balance: {formatCurrency(balance)}</Text>
            </View>

            {/* Selected mode info */}
            {selectedBet === 'free' ? (
              <View style={styles.infoCard}>
                <Ionicons name="gift-outline" size={15} color={COLORS.gold} />
                <Text style={styles.infoText}>
                  Free spin — win the wheel amount directly (cash prizes paid straight to your balance)
                </Text>
              </View>
            ) : segments && (
              <View style={styles.multiplierCard}>
                <View style={styles.multiplierHeader}>
                  <Ionicons name="trending-up" size={14} color={COLORS.green} />
                  <Text style={styles.multiplierTitle}>
                    Potential wins for K{selectedBet} bet
                  </Text>
                </View>
                <View style={styles.multiplierGrid}>
                  {segments
                    .filter(s => s.type === 'cash')
                    .sort((a, b) => (b.multiplier ?? b.value) - (a.multiplier ?? a.value))
                    .map((seg, i) => {
                      const mx  = seg.multiplier ?? seg.value;
                      const win = parseFloat((selectedBet * mx).toFixed(2));
                      const net = parseFloat((win - selectedBet).toFixed(2));
                      const isProfit = net >= 0;
                      return (
                        <View key={i} style={styles.multiplierRow}>
                          <View style={[styles.multiplierDot, { backgroundColor: seg.color }]} />
                          <Text style={styles.multiplierX}>{mx}×</Text>
                          <Text style={styles.multiplierWin}>K{win.toFixed(2)}</Text>
                          <Text style={[styles.multiplierNet, { color: isProfit ? COLORS.green : '#ef4444' }]}>
                            {isProfit ? `+K${net.toFixed(2)}` : `-K${Math.abs(net).toFixed(2)}`}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}
          </View>

          {/* Rewards legend — driven by live admin config */}
          {segments && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>POSSIBLE REWARDS</Text>
              <View style={styles.legendGrid}>
                {segments.map((seg, i) => {
                  const isPaid = selectedBet !== 'free';
                  const typeLabel =
                    seg.type === 'cash' ? 'Cash'
                    : seg.type === 'xp' ? 'XP'
                    : seg.type === 'boost' ? 'Boost' : 'Bonus';
                  const mx = seg.multiplier ?? seg.value;
                  const valueLabel = (isPaid && seg.type === 'cash')
                    ? `${mx}× (K${(selectedBet * mx).toFixed(2)})`
                    : seg.label;
                  return (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendLabel}>{valueLabel}</Text>
                        <Text style={styles.legendSub}>{typeLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Spin History */}
          {spinHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent Spins</Text>
              {spinHistory.map((item, i) => {
                const ts   = item.timestamp as unknown as Timestamp;
                const date = ts ? ts.toDate() : new Date();
                const dotColor =
                  item.type === 'cash' ? COLORS.gold
                  : item.type === 'xp' ? COLORS.purple
                  : COLORS.blue;
                return (
                  <View key={item.id ?? i} style={styles.historyItem}>
                    <View style={[styles.historyDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.historyLabel}>
                      Won <Text style={{ color: COLORS.gold, fontWeight: '700' }}>{item.label}</Text>
                    </Text>
                    <Text style={styles.historyTime}>{getTimeAgo(date)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Result Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setShowModal(false)}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#1a2236', '#0d1526']} style={styles.modalInner}>
              <View style={[styles.modalGlow, { backgroundColor: resultColor + '22', borderColor: resultColor + '66' }]}>
                <Text style={styles.modalEmoji}>🎉</Text>
              </View>
              <Text style={styles.modalTitle}>Congratulations!</Text>
              {result && (
                <Text style={[styles.modalResult, { color: resultColor }]}>
                  {getResultText(result)}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                activeOpacity={0.85}
                style={styles.modalBtn}
              >
                <LinearGradient colors={['#fbbf24', '#d97706']} style={styles.modalBtnInner}>
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
  bg:   { flex: 1 },
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  freeBadgeDim:     { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: COLORS.border },
  freeBadgeText:    { fontSize: 12, color: COLORS.gold, fontWeight: '700' },

  scroll: { padding: 16, alignItems: 'center', gap: 16, paddingBottom: 40 },

  // ── Bet selector ────────────────────────────────────────────────────────────
  betSection: { width: '100%', gap: 10 },
  betLabel:   { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  betRow:     { flexDirection: 'row', gap: 8 },
  betBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  betBtnActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  betBtnDisabled: {
    opacity: 0.35,
  },
  betBtnText:         { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  betBtnTextActive:   { color: COLORS.gold },
  betBtnTextDisabled: { color: COLORS.textMuted },
  freeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    position: 'absolute',
    top: 6,
    right: 6,
  },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: { fontSize: 13, color: COLORS.textSecondary },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  // ── Multiplier card ─────────────────────────────────────────────────────────
  multiplierCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  multiplierHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  multiplierTitle:  { fontSize: 12, color: COLORS.green, fontWeight: '700' },
  multiplierGrid:   { gap: 6 },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiplierDot: { width: 8, height: 8, borderRadius: 4 },
  multiplierX:   { width: 36, fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  multiplierWin: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.gold },
  multiplierNet: { fontSize: 12, fontWeight: '700' },

  // ── Wheel placeholder ───────────────────────────────────────────────────────
  wheelPlaceholder: {
    width: 296,
    height: 296,
    borderRadius: 148,
    borderWidth: 3,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  wheelPlaceholderText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  wheelPlaceholderSub:  { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Legend ──────────────────────────────────────────────────────────────────
  legendCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  legendTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  legendGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' },
  legendDot:   { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700' },
  legendSub:   { fontSize: 10, color: COLORS.textSecondary },

  // ── History ─────────────────────────────────────────────────────────────────
  historySection: { width: '100%', gap: 8 },
  historyTitle:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
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
  historyDot:   { width: 10, height: 10, borderRadius: 5 },
  historyLabel: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  historyTime:  { fontSize: 12, color: COLORS.textSecondary },

  // ── Result modal ─────────────────────────────────────────────────────────────
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard:    { width: '100%', borderRadius: 24, overflow: 'hidden' },
  modalInner:   { padding: 32, alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderGold },
  modalGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },
  modalEmoji:    { fontSize: 44 },
  modalTitle:    { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  modalResult:   { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  modalBtn:      { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  modalBtnInner: { paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  modalBtnText:  { color: '#1a0a00', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
});
