import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '../src/components/PageHeader';
import * as Clipboard from 'expo-clipboard';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, getDocs, query, where, orderBy,
  getDoc, doc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../src/firebase/config';
import app from '../src/firebase/config';
import { COLORS } from '../src/constants/colors';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { formatCurrency } from '../src/utils/helpers';

const fns = getFunctions(app);

// ─── Types ───────────────────────────────────────────────────────────────────

type Pkg = {
  id: string; name: string; price: number; dailyEarnings: number;
  durationDays: number; color: string; icon: string; imageUrl?: string; popular?: boolean;
};

type Provider = 'mtn' | 'airtel' | 'zamtel';
type PaymentAcc = { number: string; name: string };
type PaymentAccounts = { mtn?: PaymentAcc; airtel?: PaymentAcc; zamtel?: PaymentAcc };

const PROVIDER: Record<Provider, { label: string; color: string; logo: any }> = {
  mtn:    { label: 'MTN Mobile Money', color: '#FFC107', logo: require('../assets/mtn.png')    },
  airtel: { label: 'Airtel Money',     color: '#F44336', logo: require('../assets/airtel.png') },
  zamtel: { label: 'Zamtel Kwacha',    color: '#4CAF50', logo: require('../assets/zamtel.png') },
};

const TOPUP_PRESETS = [10, 20, 50, 100, 200, 500];

function detectProvider(phone: string): Provider | null {
  const n = phone.replace(/\D/g, '');
  if (/^(096|076|056)/.test(n)) return 'mtn';
  if (/^(097|077|057)/.test(n)) return 'airtel';
  if (/^(095|075|055)/.test(n)) return 'zamtel';
  return null;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DepositScreen() {
  const { user } = useAuthStore();
  const { profile, fetchProfile, fetchVaults } = useUserStore();

  const [packages,    setPackages]    = useState<Pkg[]>([]);
  const [payAccounts, setPayAccounts] = useState<PaymentAccounts>({});
  const [loadingData, setLoadingData] = useState(true);

  // Flow state
  const [mode,        setMode]        = useState<'invest' | 'topup' | null>(null);
  const [step,        setStep]        = useState<1 | 2>(1);
  const [selected,    setSelected]    = useState<Pkg | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [phone,       setPhone]       = useState('');
  const [payerName,   setPayerName]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [buying,      setBuying]      = useState(false);
  const [done,        setDone]        = useState(false);

  // Computed
  const depositAmount  = mode === 'topup' ? (parseFloat(topupAmount) || 0) : (selected?.price ?? 0);
  const provider       = detectProvider(phone);
  const payAcc         = provider ? payAccounts[provider] : undefined;
  const phoneClean     = phone.replace(/\D/g, '');
  const phoneValid     = phoneClean.length === 10;
  const topupValid     = depositAmount >= 1;
  const canSubmit      = phoneValid && !!provider && !!payAcc?.number && payerName.trim().length > 1;
  const canBuyBalance  = !!selected && (profile?.walletBalance ?? 0) >= selected.price;

  useEffect(() => {
    (async () => {
      const [pkgSnap, paySnap] = await Promise.all([
        getDocs(query(collection(db, 'packages'), where('active', '==', true), orderBy('price'))),
        getDoc(doc(db, 'settings', 'paymentAccounts')),
      ]);
      setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pkg)));
      if (paySnap.exists()) setPayAccounts(paySnap.data() as PaymentAccounts);
      setLoadingData(false);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!user || !profile || !provider || !payAcc) return;
    if (mode === 'invest' && !selected) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'deposits'), {
        uid:             user.uid,
        userDisplayName: profile.displayName,
        amount:          depositAmount,
        mobileProvider:  provider,
        mobileNumber:    phoneClean,
        payerName:       payerName.trim(),
        packageId:       mode === 'invest' ? selected!.id   : null,
        packageName:     mode === 'invest' ? selected!.name : null,
        packageImageUrl: mode === 'invest' ? (selected!.imageUrl ?? null) : null,
        depositType:     mode === 'topup' ? 'topup' : 'investment',
        status:          'pending',
        createdAt:       serverTimestamp(),
        processedAt:     null,
        processedBy:     null,
        note:            null,
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyWithBalance = async () => {
    if (!user || !selected) return;
    setBuying(true);
    try {
      const fn = httpsCallable<{ packageId: string }, { success: boolean; vaultId: string }>(
        fns, 'buyVaultWithBalance'
      );
      await fn({ packageId: selected.id });
      if (user) await Promise.all([fetchProfile(user.uid), fetchVaults(user.uid)]);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Purchase failed. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  const copyNumber = async (num: string) => {
    await Clipboard.setStringAsync(num);
    Alert.alert('Copied!', `${num} copied to clipboard.`);
  };

  const resetFlow = () => {
    setMode(null); setStep(1); setSelected(null);
    setTopupAmount(''); setPhone(''); setPayerName('');
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <LinearGradient colors={['#080c18', '#0f1729']} style={styles.centered}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </LinearGradient>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (done) {
    const isBuy = mode === 'invest' && !submitting;
    return (
      <LinearGradient colors={['#080c18', '#0f1729']} style={styles.centered}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.green} />
        </View>
        <Text style={styles.successTitle}>
          {buying || (mode === 'invest' && !canSubmit) ? 'Investment Active!' : 'Submitted!'}
        </Text>
        <Text style={styles.successSub}>
          {mode === 'topup'
            ? `Your ${formatCurrency(depositAmount)} top-up is under review.\n\nOnce approved, your wallet will be credited automatically.`
            : mode === 'invest' && !phone
              ? `Your ${formatCurrency(selected?.price ?? 0)} investment in the ${selected?.name} package is now active and earning daily returns.`
              : `Your ${formatCurrency(depositAmount)} deposit for the ${selected?.name} package is under review.\n\nOnce approved, your vault will be activated automatically.`
          }
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} activeOpacity={0.85} style={{ width: '100%' }}>
          <LinearGradient colors={[COLORS.gold, COLORS.goldDark]} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>BACK TO HOME</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ── Mode picker ─────────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
        <PageHeader title="DEPOSIT" />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {profile && (
            <View style={styles.balanceCard}>
              <LinearGradient colors={['rgba(245,158,11,0.1)', 'transparent']} style={styles.balanceInner}>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                <Text style={styles.balanceValue}>{formatCurrency(profile.walletBalance)}</Text>
              </LinearGradient>
            </View>
          )}

          <Text style={styles.sectionTitle}>What would you like to do?</Text>

          {/* Invest card */}
          <TouchableOpacity onPress={() => setMode('invest')} activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)']}
              style={styles.modeCard}
            >
              <View style={[styles.modeIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Ionicons name="trending-up" size={28} color={COLORS.gold} />
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeCardTitle}>Get Investment</Text>
                <Text style={styles.modeCardSub}>Choose a package and earn daily returns</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gold} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Top up card */}
          <TouchableOpacity onPress={() => setMode('topup')} activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)']}
              style={[styles.modeCard, { borderColor: 'rgba(139,92,246,0.25)' }]}
            >
              <View style={[styles.modeIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <Ionicons name="wallet-outline" size={28} color={COLORS.purple} />
              </View>
              <View style={styles.modeText}>
                <Text style={[styles.modeCardTitle, { color: COLORS.purple }]}>Top Up Balance</Text>
                <Text style={styles.modeCardSub}>Add funds to your wallet for later use</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.purple} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Buy with balance — only if user has a balance */}
          {(profile?.walletBalance ?? 0) > 0 && (
            <TouchableOpacity onPress={() => { setMode('invest'); }} activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(34,197,94,0.10)', 'rgba(34,197,94,0.03)']}
                style={[styles.modeCard, { borderColor: 'rgba(34,197,94,0.2)' }]}
              >
                <View style={[styles.modeIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                  <Ionicons name="flash" size={28} color={COLORS.green} />
                </View>
                <View style={styles.modeText}>
                  <Text style={[styles.modeCardTitle, { color: COLORS.green }]}>Invest from Balance</Text>
                  <Text style={styles.modeCardSub}>
                    Use your {formatCurrency(profile!.walletBalance)} balance to activate a package instantly
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.green} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── Top Up: Step 1 — amount selection ───────────────────────────────────────
  if (mode === 'topup' && step === 1) {
    return (
      <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
        <PageHeader title="TOP UP BALANCE" onBack={resetFlow} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Select Amount</Text>
          <Text style={styles.sectionSub}>Choose a preset or enter a custom amount</Text>

          {/* Preset grid */}
          <View style={styles.presetGrid}>
            {TOPUP_PRESETS.map(amt => {
              const active = topupAmount === String(amt);
              return (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setTopupAmount(String(amt))}
                  activeOpacity={0.85}
                  style={[styles.presetBtn, active && styles.presetBtnActive]}
                >
                  <Text style={[styles.presetBtnText, active && styles.presetBtnTextActive]}>
                    K{amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Custom amount (K)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 75.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={topupAmount}
                onChangeText={setTopupAmount}
              />
              {topupValid && (
                <Text style={styles.amountPreview}>{formatCurrency(depositAmount)}</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.stickyWrap}>
          <TouchableOpacity disabled={!topupValid} activeOpacity={0.85} onPress={() => setStep(2)}>
            <LinearGradient
              colors={topupValid ? ['#8b5cf6', '#6d28d9'] : ['#374151', '#374151']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Text style={styles.continueBtnText}>
                {topupValid ? `CONTINUE · ${formatCurrency(depositAmount)}` : 'ENTER AMOUNT'}
              </Text>
              {topupValid && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Invest: Step 1 — package selection ──────────────────────────────────────
  if (step === 1) {
    return (
      <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
        <PageHeader title="GET INVESTMENT" onBack={resetFlow} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {profile && (
            <View style={styles.balanceCard}>
              <LinearGradient colors={['rgba(245,158,11,0.1)', 'transparent']} style={styles.balanceInner}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>{formatCurrency(profile.walletBalance)}</Text>
              </LinearGradient>
            </View>
          )}

          <Text style={styles.sectionTitle}>Select Investment Package</Text>
          <Text style={styles.sectionSub}>Choose a package to continue with payment</Text>

          {packages.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No packages available right now.</Text>
            </View>
          )}

          {packages.map(pkg => {
            const isSel = selected?.id === pkg.id;
            return (
              <TouchableOpacity key={pkg.id} activeOpacity={0.85} onPress={() => setSelected(pkg)}>
                <View style={[styles.pkgCard, isSel && { borderColor: pkg.color, borderWidth: 2 }]}>
                  {isSel && (
                    <View style={[styles.checkBadge, { backgroundColor: pkg.color }]}>
                      <Ionicons name="checkmark" size={11} color="#000" />
                    </View>
                  )}
                  <LinearGradient colors={[pkg.color + '15', pkg.color + '04']} style={styles.pkgInner}>
                    <View style={styles.pkgTop}>
                      <View style={[styles.pkgIconWrap, { borderColor: pkg.color + '50' }]}>
                        {pkg.imageUrl ? (
                          <Image source={{ uri: pkg.imageUrl }} style={styles.pkgImg} resizeMode="cover" />
                        ) : (
                          <Text style={styles.pkgEmoji}>{pkg.icon}</Text>
                        )}
                      </View>
                      <View style={styles.pkgMeta}>
                        <View style={styles.pkgNameRow}>
                          <Text style={[styles.pkgName, { color: pkg.color }]}>{pkg.name}</Text>
                          {pkg.popular && (
                            <View style={[styles.popularBadge, { backgroundColor: pkg.color + '22', borderColor: pkg.color + '66' }]}>
                              <Text style={[styles.popularText, { color: pkg.color }]}>POPULAR</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pkgPrice}>{formatCurrency(pkg.price)}</Text>
                      </View>
                    </View>

                    <View style={styles.pkgStats}>
                      <View style={styles.pkgStat}>
                        <Text style={styles.pkgStatLabel}>Daily</Text>
                        <Text style={[styles.pkgStatVal, { color: COLORS.green }]}>{formatCurrency(pkg.dailyEarnings)}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.pkgStat}>
                        <Text style={styles.pkgStatLabel}>Duration</Text>
                        <Text style={styles.pkgStatVal}>{pkg.durationDays} days</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.pkgStat}>
                        <Text style={styles.pkgStatLabel}>Total Return</Text>
                        <Text style={[styles.pkgStatVal, { color: COLORS.green }]}>
                          {formatCurrency(pkg.dailyEarnings * pkg.durationDays)}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Sticky footer — two options when package is selected */}
        <View style={styles.stickyWrap}>
          {selected && canBuyBalance ? (
            <View style={{ gap: 8 }}>
              {/* Buy with balance — primary if affordable */}
              <TouchableOpacity
                disabled={buying}
                activeOpacity={0.85}
                onPress={handleBuyWithBalance}
              >
                <LinearGradient
                  colors={[COLORS.green + 'dd', '#15803d']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.continueBtn}
                >
                  {buying
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={[styles.continueBtnText, { color: '#fff' }]}>
                          BUY NOW · {formatCurrency(selected.price)} from Balance
                        </Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
              {/* Mobile money — secondary option */}
              <TouchableOpacity activeOpacity={0.85} onPress={() => setStep(2)}>
                <View style={styles.altBtn}>
                  <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.altBtnText}>Pay via Mobile Money instead</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity disabled={!selected} activeOpacity={0.85} onPress={() => setStep(2)}>
              <LinearGradient
                colors={selected ? [selected.color, selected.color + 'cc'] : ['#374151', '#374151']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>
                  {selected ? `CONTINUE · ${formatCurrency(selected.price)}` : 'SELECT A PACKAGE'}
                </Text>
                {selected && <Ionicons name="arrow-forward" size={18} color="#000" style={{ marginLeft: 8 }} />}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ── Step 2: Payment ───────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <PageHeader
        title={mode === 'topup' ? 'TOP UP PAYMENT' : 'PAYMENT'}
        onBack={() => setStep(1)}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Summary card */}
        {mode === 'topup' ? (
          <LinearGradient
            colors={['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)']}
            style={[styles.summaryCard, { borderColor: 'rgba(139,92,246,0.3)' }]}
          >
            <View style={styles.summaryInner}>
              <View style={styles.summaryLeft}>
                <View style={[styles.modeIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <Ionicons name="wallet-outline" size={24} color={COLORS.purple} />
                </View>
                <View>
                  <Text style={[styles.pkgName, { color: COLORS.purple }]}>Wallet Top Up</Text>
                  <Text style={styles.sectionSub}>Balance credit on approval</Text>
                </View>
              </View>
              <Text style={[styles.summaryPrice, { color: COLORS.purple }]}>
                {formatCurrency(depositAmount)}
              </Text>
            </View>
          </LinearGradient>
        ) : selected && (
          <View style={[styles.summaryCard, { borderColor: selected.color + '44' }]}>
            <LinearGradient colors={[selected.color + '18', selected.color + '06']} style={styles.summaryInner}>
              <View style={styles.summaryLeft}>
                {selected.imageUrl ? (
                  <Image source={{ uri: selected.imageUrl }} style={styles.summaryImg} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 32 }}>{selected.icon}</Text>
                )}
                <View>
                  <Text style={[styles.pkgName, { color: selected.color }]}>{selected.name}</Text>
                  <Text style={styles.sectionSub}>
                    {formatCurrency(selected.dailyEarnings)}/day · {selected.durationDays} days
                  </Text>
                </View>
              </View>
              <Text style={[styles.summaryPrice, { color: selected.color }]}>
                {formatCurrency(selected.price)}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Phone input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your payment phone number</Text>
          <View style={[
            styles.inputRow,
            phone.length > 0 && provider && { borderColor: PROVIDER[provider].color + '88' },
          ]}>
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={provider ? PROVIDER[provider].color : COLORS.textMuted}
            />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 0971234567"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={12}
              value={phone}
              onChangeText={setPhone}
            />
            {provider && (
              <Image
                source={PROVIDER[provider].logo}
                style={styles.providerPillLogo}
                resizeMode="contain"
              />
            )}
          </View>
          {phoneClean.length >= 3 && !provider && (
            <Text style={styles.inputHint}>
              MTN: 096/076/056 · Airtel: 097/077/057 · Zamtel: 095/075/055
            </Text>
          )}
        </View>

        {/* Payment instructions */}
        {provider && (
          payAcc && payAcc.number ? (
            <View style={[styles.payCard, { borderColor: PROVIDER[provider].color + '44' }]}>
              <LinearGradient
                colors={[PROVIDER[provider].color + '14', PROVIDER[provider].color + '05']}
                style={styles.payCardInner}
              >
                <Text style={[styles.payTitle, { color: PROVIDER[provider].color }]}>
                  Send {formatCurrency(depositAmount)} to:
                </Text>
                <View style={styles.payRow}>
                  <View style={{ flex: 1 }}>
                    <Image source={PROVIDER[provider].logo} style={styles.payProviderLogo} resizeMode="contain" />
                    <Text style={styles.payNumber}>{payAcc.number}</Text>
                    <Text style={styles.payName}>{payAcc.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyNumber(payAcc.number)}
                    style={[styles.copyBtn, { borderColor: PROVIDER[provider].color + '66' }]}
                  >
                    <Ionicons name="copy-outline" size={14} color={PROVIDER[provider].color} />
                    <Text style={[styles.copyBtnText, { color: PROVIDER[provider].color }]}>COPY</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.payNote}>
                  After sending, enter the transaction reference below to confirm your deposit.
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.noAccountCard}>
              <Ionicons name="warning-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.noAccountText}>
                No {PROVIDER[provider].label} account configured. Please contact support.
              </Text>
            </View>
          )
        )}

        {/* Payer name input */}
        {provider && payAcc && payAcc.number && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name on the account you used</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. John Banda"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                value={payerName}
                onChangeText={setPayerName}
              />
            </View>
          </View>
        )}

        <TouchableOpacity disabled={!canSubmit || submitting} activeOpacity={0.85} onPress={handleSubmit}>
          <LinearGradient
            colors={canSubmit && !submitting ? [COLORS.gold, COLORS.goldDark] : ['#374151', '#374151']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            {submitting
              ? <ActivityIndicator color="#1a0a00" />
              : <Text style={styles.submitBtnText}>SUBMIT DEPOSIT REQUEST</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your deposit will be reviewed and credited to your wallet once confirmed by our team.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:      { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  balanceCard:  { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGold },
  balanceInner: { padding: 16, alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 12, color: COLORS.textSecondary },
  balanceValue: { fontSize: 28, fontWeight: '900', color: COLORS.gold },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sectionSub:   { fontSize: 12, color: COLORS.textSecondary },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  // Mode picker
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  modeIcon:      { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeText:      { flex: 1 },
  modeCardTitle: { fontSize: 16, fontWeight: '900', color: COLORS.gold, marginBottom: 3 },
  modeCardSub:   { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  // Top-up presets
  presetGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: {
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  presetBtnActive:     { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.15)' },
  presetBtnText:       { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary },
  presetBtnTextActive: { color: '#c4b5fd' },
  amountPreview:       { fontSize: 13, fontWeight: '700', color: COLORS.gold },

  // Package card
  pkgCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  checkBadge: {
    position: 'absolute', top: 10, right: 10, zIndex: 1,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  pkgInner:   { padding: 16, gap: 14 },
  pkgTop:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pkgIconWrap: {
    width: 60, height: 60, borderRadius: 14,
    borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pkgImg:   { width: 60, height: 60 },
  pkgEmoji: { fontSize: 30 },
  pkgMeta:  { flex: 1, gap: 4 },
  pkgNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pkgName:    { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  pkgPrice:   { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  popularBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1,
  },
  popularText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  pkgStats:    { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10 },
  pkgStat:     { flex: 1, alignItems: 'center', gap: 3 },
  pkgStatLabel:{ fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  pkgStatVal:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 2 },

  // Sticky footer
  stickyWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: 'rgba(8,12,24,0.95)',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  continueBtn:     { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  altBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: COLORS.border,
  },
  altBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // Step 2
  summaryCard:  { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  summaryInner: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryImg:   { width: 48, height: 48, borderRadius: 10 },
  summaryPrice: { fontSize: 20, fontWeight: '900' },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  textInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  providerPillLogo: { width: 32, height: 32, borderRadius: 16 },
  inputHint: { fontSize: 11, color: COLORS.textMuted },

  payCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  payCardInner: { padding: 16, gap: 12 },
  payTitle:    { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  payRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payProviderLogo: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  payNumber:   { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 2 },
  payName:     { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  copyBtnText: { fontSize: 11, fontWeight: '800' },
  payNote:     { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  noAccountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  noAccountText: { flex: 1, fontSize: 13, color: COLORS.textMuted },

  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  submitBtnText: { color: '#1a0a00', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  disclaimer: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },

  // Success
  successIcon:  { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.green + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  successSub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
});
