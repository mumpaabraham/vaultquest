import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '../src/components/PageHeader';
import { Timestamp } from 'firebase/firestore';
import { COLORS } from '../src/constants/colors';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { formatCurrency, getTimeAgo } from '../src/utils/helpers';
import { getWithdrawalSettings, submitWithdrawal, getWithdrawals } from '../src/firebase/withdrawals';
import { WithdrawalSettings, Withdrawal } from '../src/types';

const PROVIDERS = [
  { id: 'airtel',  label: 'Airtel Money',      color: '#e8192c', logo: require('../assets/airtel.png') },
  { id: 'mtn',     label: 'MTN Mobile Money',   color: '#ffc300', logo: require('../assets/mtn.png')   },
  { id: 'zamtel',  label: 'Zamtel Kwacha',      color: '#009b3a', logo: require('../assets/zamtel.png') },
];

export default function WithdrawScreen() {
  const { user }    = useAuthStore();
  const { profile, fetchProfile } = useUserStore();

  const [settings,  setSettings]  = useState<WithdrawalSettings | null>(null);
  const [history,   setHistory]   = useState<Withdrawal[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [provider,     setProvider]    = useState('');
  const [phone,        setPhone]       = useState('');
  const [accountName,  setAccountName] = useState('');
  const [amount,       setAmount]      = useState('');
  const [saveMobile,   setSaveMobile]  = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [s, h] = await Promise.all([
      getWithdrawalSettings(),
      getWithdrawals(user.uid),
    ]);
    setSettings(s);
    setHistory(h);
    setLoadingInit(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Pre-fill saved mobile money whenever profile loads (only if user hasn't typed anything yet)
  useEffect(() => {
    if (!profile?.mobileMoney) return;
    if (!provider) setProvider(profile.mobileMoney.provider);
    if (!phone)    setPhone(profile.mobileMoney.number);
    if (!accountName && profile.mobileMoney.accountName) setAccountName(profile.mobileMoney.accountName);
  }, [profile?.mobileMoney]);

  const parsedAmount = parseFloat(amount) || 0;
  const charge = settings
    ? parseFloat((settings.chargeFlat + (settings.chargePercent / 100) * parsedAmount).toFixed(2))
    : 0;
  const netAmount = parseFloat((parsedAmount - charge).toFixed(2));
  const balance   = profile?.walletBalance ?? 0;

  const canSubmit =
    !submitting &&
    provider !== '' &&
    phone.trim().length >= 9 &&
    parsedAmount > 0 &&
    settings !== null &&
    parsedAmount >= settings.minAmount &&
    parsedAmount <= settings.maxAmount &&
    parsedAmount <= balance;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await submitWithdrawal({
        amount: parsedAmount,
        mobileProvider: provider,
        mobileNumber: phone.trim(),
        accountName: accountName.trim() || undefined,
        saveMobile,
      });
      await Promise.all([fetchProfile(user.uid), load()]);
      Alert.alert(
        'Request Submitted',
        `Your withdrawal of ${formatCurrency(parsedAmount)} has been submitted.\n\nYou will receive ${formatCurrency(res.netAmount)} after a charge of ${formatCurrency(res.charge)}.\n\nProcessing usually takes 1-24 hours.`,
        [{ text: 'OK' }],
      );
      setAmount('');
    } catch (e: any) {
      const msg =
        e?.message?.includes('Insufficient') ? e.message :
        e?.message?.includes('limit') ? e.message :
        e?.message?.includes('Minimum') ? e.message :
        e?.message?.includes('Maximum') ? e.message :
        'Something went wrong. Please try again.';
      Alert.alert('Withdrawal Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: Withdrawal['status']) =>
    s === 'approved' ? '#22c55e' : s === 'rejected' ? COLORS.red : COLORS.gold;

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <PageHeader title="WITHDRAW" />

          {loadingInit ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.gold} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Balance */}
              <LinearGradient colors={['#0d1526', '#111827']} style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
              </LinearGradient>

              {/* Limits info */}
              {settings && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>WITHDRAWAL INFO</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoValue}>{formatCurrency(settings.minAmount)}</Text>
                      <Text style={styles.infoKey}>Min</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoValue}>{formatCurrency(settings.maxAmount)}</Text>
                      <Text style={styles.infoKey}>Max</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoValue}>{settings.dailyLimitCount}×</Text>
                      <Text style={styles.infoKey}>Daily limit</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoValue}>{settings.chargePercent}% + {formatCurrency(settings.chargeFlat)}</Text>
                      <Text style={styles.infoKey}>Fee</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Mobile money provider */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MOBILE MONEY PROVIDER</Text>
                <View style={styles.providerRow}>
                  {PROVIDERS.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setProvider(p.id)}
                      activeOpacity={0.8}
                      style={[
                        styles.providerBtn,
                        { borderColor: p.color + '55', backgroundColor: p.color + '18' },
                        provider === p.id && { borderColor: p.color, backgroundColor: p.color + '35' },
                      ]}
                    >
                      <Image source={p.logo} style={styles.providerLogo} resizeMode="contain" />
                      {provider === p.id && (
                        <View style={[styles.providerCheck, { backgroundColor: p.color }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Phone number */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 0977123456"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>

              {/* Account name (optional) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT NAME <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Name on the account if different from yours"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="words"
                />
              </View>

              {/* Save mobile checkbox */}
              <TouchableOpacity
                onPress={() => setSaveMobile(v => !v)}
                activeOpacity={0.8}
                style={styles.saveRow}
              >
                <View style={[styles.checkbox, saveMobile && styles.checkboxOn]}>
                  {saveMobile && <Ionicons name="checkmark" size={12} color="#1a0a00" />}
                </View>
                <Text style={styles.saveLabel}>Save this number for future withdrawals</Text>
              </TouchableOpacity>

              {/* Amount */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AMOUNT (ZMW)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={settings ? `${formatCurrency(settings.minAmount)} – ${formatCurrency(settings.maxAmount)}` : 'K0.00'}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                {/* Quick amounts */}
                <View style={styles.quickRow}>
                  {[20, 50, 100, 200].map(v => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setAmount(String(v))}
                      style={[styles.quickBtn, parsedAmount === v && styles.quickBtnActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.quickBtnText, parsedAmount === v && styles.quickBtnTextActive]}>
                        K{v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Charge breakdown */}
              {parsedAmount > 0 && (
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Withdrawal amount</Text>
                    <Text style={styles.breakdownVal}>{formatCurrency(parsedAmount)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownKey}>Processing fee</Text>
                    <Text style={[styles.breakdownVal, { color: COLORS.red }]}>−{formatCurrency(charge)}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                    <Text style={styles.breakdownTotalKey}>You receive</Text>
                    <Text style={styles.breakdownTotalVal}>{formatCurrency(netAmount > 0 ? netAmount : 0)}</Text>
                  </View>
                </View>
              )}

              {/* Validation hints */}
              {parsedAmount > 0 && settings && (
                <>
                  {parsedAmount < settings.minAmount && (
                    <Text style={styles.hint}>Minimum withdrawal is {formatCurrency(settings.minAmount)}</Text>
                  )}
                  {parsedAmount > settings.maxAmount && (
                    <Text style={styles.hint}>Maximum withdrawal is {formatCurrency(settings.maxAmount)}</Text>
                  )}
                  {parsedAmount > balance && (
                    <Text style={styles.hint}>Amount exceeds your balance</Text>
                  )}
                </>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                activeOpacity={0.85}
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDim]}
              >
                <LinearGradient
                  colors={canSubmit ? ['#fbbf24', '#d97706'] : ['#3a3a3a', '#2a2a2a']}
                  style={styles.submitBtnInner}
                >
                  {submitting ? (
                    <ActivityIndicator color="#1a0a00" />
                  ) : (
                    <Text style={[styles.submitText, !canSubmit && { color: '#666' }]}>
                      SUBMIT WITHDRAWAL
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Recent withdrawals */}
              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.historyTitle}>Recent Withdrawals</Text>
                  {history.map((item, i) => {
                    const ts   = item.createdAt as unknown as Timestamp;
                    const date = ts ? ts.toDate() : new Date();
                    const provLabel = PROVIDERS.find(p => p.id === item.mobileProvider)?.label ?? item.mobileProvider;
                    return (
                      <View key={item.id ?? i} style={styles.historyItem}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyAmount}>{formatCurrency(item.amount)}</Text>
                          <Text style={styles.historyMeta}>{provLabel} · {item.mobileNumber}</Text>
                          <Text style={styles.historyTime}>{getTimeAgo(date)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { borderColor: statusColor(item.status) + '60', backgroundColor: statusColor(item.status) + '18' }]}>
                          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  balanceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    gap: 4,
  },
  balanceLabel: { fontSize: 13, color: COLORS.textSecondary },
  balanceValue: { fontSize: 30, fontWeight: '900', color: COLORS.gold },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  infoTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  infoGrid:  { flexDirection: 'row', justifyContent: 'space-between' },
  infoItem:  { alignItems: 'center', gap: 2 },
  infoValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  infoKey:   { fontSize: 11, color: COLORS.textMuted },

  section:      { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },

  providerRow: { flexDirection: 'row', gap: 8 },
  providerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    position: 'relative',
  },
  providerLogo: { width: 52, height: 52, borderRadius: 26 },
  providerCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn:  { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  saveLabel:   { fontSize: 13, color: COLORS.textSecondary },

  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  quickBtnActive:    { borderColor: COLORS.gold, backgroundColor: 'rgba(245,158,11,0.12)' },
  quickBtnText:      { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  quickBtnTextActive:{ color: COLORS.gold },

  breakdownCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  breakdownRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownKey:      { fontSize: 14, color: COLORS.textSecondary },
  breakdownVal:      { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  breakdownTotal:    { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  breakdownTotalKey: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  breakdownTotalVal: { fontSize: 18, fontWeight: '900', color: COLORS.gold },

  hint: { fontSize: 13, color: COLORS.red, textAlign: 'center' },

  submitBtn:      { borderRadius: 14, overflow: 'hidden' },
  submitBtnDim:   { opacity: 0.6 },
  submitBtnInner: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  submitText:     { fontSize: 16, fontWeight: '900', color: '#1a0a00', letterSpacing: 1 },

  historySection: { gap: 10 },
  historyTitle:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft:   { gap: 3 },
  historyAmount: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  historyMeta:   { fontSize: 12, color: COLORS.textSecondary },
  historyTime:   { fontSize: 11, color: COLORS.textMuted },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});
