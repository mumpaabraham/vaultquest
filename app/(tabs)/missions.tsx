import React, { useEffect, useReducer, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';
import { MissionItem } from '../../src/components/MissionItem';
import { MISSIONS_BY_TYPE, MissionType } from '../../src/constants/missions';
import { getMissionProgress, claimMission, trackAction, MissionProgress } from '../../src/firebase/missions';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { formatCurrency } from '../../src/utils/helpers';

const TABS: { key: MissionType; label: string }[] = [
  { key: 'daily',       label: 'DAILY'        },
  { key: 'weekly',      label: 'WEEKLY'       },
  { key: 'achievement', label: 'ACHIEVEMENTS' },
];

export default function MissionsScreen() {
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();

  const [activeTab, setActiveTab] = useState<MissionType>('daily');
  const [progressMap, setProgressMap] = useState<Record<string, MissionProgress>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Force re-render after mount so Ionicons fonts are ready
  useEffect(() => { forceUpdate(); }, []);

  const loadProgress = useCallback(async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true);
    const map = await getMissionProgress(user.uid);
    setProgressMap(map);
    if (showRefresh) setRefreshing(false);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProgress();
    // Track login mission each time this screen loads
    if (user) trackAction('login');
  }, [loadProgress]);

  const handleClaim = async (missionId: string) => {
    if (!user || claiming) return;
    setClaiming(missionId);
    try {
      const { rewardXP, rewardCash } = await claimMission(missionId);
      // Refresh progress and profile
      await Promise.all([loadProgress(), fetchProfile(user.uid)]);
      const parts: string[] = [];
      if (rewardXP > 0)   parts.push(`+${rewardXP} XP`);
      if (rewardCash > 0) parts.push(`+${formatCurrency(rewardCash)}`);
      Alert.alert('Reward Claimed!', parts.join('  ') || 'Mission complete!');
    } catch (e: any) {
      const msg = e?.message?.includes('already-exists')
        ? 'Reward already claimed.'
        : e?.message?.includes('failed-precondition')
        ? 'Mission not completed yet.'
        : 'Something went wrong. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setClaiming(null);
    }
  };

  const missions = MISSIONS_BY_TYPE(activeTab);
  const completed = missions.filter(m => progressMap[m.id]?.completed && !progressMap[m.id]?.claimed).length;

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
          <Text style={styles.headerTitle}>MISSIONS</Text>
          {completed > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{completed} to claim</Text>
            </View>
          )}
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.gold} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadProgress(true)}
                tintColor={COLORS.gold}
              />
            }
          >
            {activeTab === 'daily' && (
              <Text style={styles.resetNote}>
                Resets daily at 00:00 Zambian time (CAT)
              </Text>
            )}
            {activeTab === 'weekly' && (
              <Text style={styles.resetNote}>
                Resets every Monday at 00:00 Zambian time (CAT)
              </Text>
            )}

            {missions.map((mission) => (
              <MissionItem
                key={mission.id}
                mission={mission}
                progress={progressMap[mission.id]}
                onClaim={handleClaim}
                claiming={claiming === mission.id}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
  },
  badge: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#1a0a00' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.gold },
  tabText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  tabTextActive: { color: '#1a0a00' },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resetNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    fontStyle: 'italic',
  },
});
