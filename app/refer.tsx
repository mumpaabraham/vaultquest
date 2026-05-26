import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { PageHeader } from '../src/components/PageHeader';
import { COLORS } from '../src/constants/colors';
import { useUserStore } from '../src/store/userStore';
import { formatCurrency } from '../src/utils/helpers';

const LEVELS = [
  { level: 1, pct: '10%', label: 'On every deposit', color: COLORS.gold },
  { level: 2, pct: '5%',  label: 'On every deposit', color: COLORS.blue },
  { level: 3, pct: '3%',  label: 'On every deposit', color: COLORS.green },
];

export default function ReferScreen() {
  const { profile } = useUserStore();

  if (!profile) return null;

  const referralLink = `https://vaultquest.me/ref/${profile.referralCode}`;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(profile.referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard.');
    } catch {
      Alert.alert('Code', profile.referralCode);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join VaultQuest and start earning! Use my referral code ${profile.referralCode} to get started.\n${referralLink}`,
        url: referralLink,
        title: 'Join VaultQuest',
      });
    } catch (e) {}
  };

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <PageHeader title="REFER & EARN" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introCard}>
          <LinearGradient colors={['rgba(124,58,237,0.15)', 'rgba(124,58,237,0.05)']} style={styles.introInner}>
            <Text style={styles.introEmoji}>🤝</Text>
            <Text style={styles.introTitle}>Invite friends and earn more!</Text>
            <Text style={styles.introSub}>
              Earn commissions on every deposit your referrals make — up to 3 levels deep.
            </Text>
          </LinearGradient>
        </View>

        {/* Referral code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{profile.referralCode}</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.gold, COLORS.goldDark]} style={styles.copyBtnInner}>
                <Ionicons name="copy-outline" size={16} color="#1a0a00" />
                <Text style={styles.copyBtnText}>COPY</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Link */}
          <Text style={styles.linkLabel}>Share your link</Text>
          <View style={styles.linkRow}>
            <Ionicons name="link-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.link} numberOfLines={1}>{referralLink}</Text>
          </View>

          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={styles.shareBtn}>
            <LinearGradient colors={[COLORS.purple, COLORS.purpleDark]} style={styles.shareBtnInner}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.shareBtnText}>SHARE REFERRAL LINK</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Commission levels */}
        <Text style={styles.sectionTitle}>Your Commission Levels</Text>
        <View style={styles.levelsRow}>
          {LEVELS.map((l) => (
            <View key={l.level} style={[styles.levelCard, { borderColor: l.color + '55' }]}>
              <LinearGradient
                colors={[l.color + '22', l.color + '0a']}
                style={styles.levelCardInner}
              >
                <Text style={[styles.levelNum, { color: l.color }]}>Level {l.level}</Text>
                <Text style={[styles.levelPct, { color: l.color }]}>{l.pct}</Text>
                <Text style={styles.levelLabel}>{l.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.stat}>
            <Ionicons name="people" size={24} color={COLORS.blue} />
            <Text style={styles.statValue}>{profile.totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.04)']} style={styles.stat}>
            <Ionicons name="cash" size={24} color={COLORS.green} />
            <Text style={[styles.statValue, { color: COLORS.green }]}>
              {formatCurrency(profile.totalReferralEarnings)}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  introCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  introInner: { padding: 20, alignItems: 'center', gap: 8 },
  introEmoji: { fontSize: 40 },
  introTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  introSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  codeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  codeLabel: { fontSize: 13, color: COLORS.textSecondary },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
  },
  code: { fontSize: 24, fontWeight: '900', color: COLORS.gold, letterSpacing: 4 },
  copyBtn: { borderRadius: 8, overflow: 'hidden' },
  copyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: 12 },
  linkLabel: { fontSize: 12, color: COLORS.textSecondary },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
  },
  link: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  shareBtn: { borderRadius: 12, overflow: 'hidden' },
  shareBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  levelsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  levelCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  levelCardInner: {
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  levelNum: { fontSize: 11, fontWeight: '800' },
  levelPct: { fontSize: 24, fontWeight: '900' },
  levelLabel: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
});
