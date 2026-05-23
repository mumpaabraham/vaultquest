import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { MissionItem } from '../../src/components/MissionItem';
import { DAILY_MISSIONS, WEEKLY_MISSIONS, ACHIEVEMENT_MISSIONS } from '../../src/constants/missions';
import { addXP } from '../../src/firebase/database';
import { useAuthStore } from '../../src/store/authStore';
import { useUserStore } from '../../src/store/userStore';
import { Mission } from '../../src/types';

type Tab = 'DAILY' | 'WEEKLY' | 'ACHIEVEMENTS';

export default function MissionsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('DAILY');
  const { user } = useAuthStore();
  const { fetchProfile } = useUserStore();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleClaim = async (missionId: string) => {
    if (!user || completed.has(missionId)) return;
    const all = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS, ...ACHIEVEMENT_MISSIONS];
    const mission = all.find((m) => m.id === missionId);
    if (!mission) return;

    await addXP(user.uid, mission.xpReward);
    await fetchProfile(user.uid);
    setCompleted((prev) => new Set(prev).add(missionId));
    Alert.alert('Mission Complete! 🎉', `You earned +${mission.xpReward} XP!`);
  };

  const lists: Record<Tab, Omit<Mission, 'completedAt'>[]> = {
    DAILY: DAILY_MISSIONS,
    WEEKLY: WEEKLY_MISSIONS,
    ACHIEVEMENTS: ACHIEVEMENT_MISSIONS,
  };

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      {/* Header */}
      <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
        <Text style={styles.headerTitle}>MISSIONS</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {(['DAILY', 'WEEKLY', 'ACHIEVEMENTS'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mission list */}
        <View style={styles.list}>
          {lists[activeTab].map((mission) => (
            <MissionItem
              key={mission.id}
              mission={{ ...mission, completedAt: completed.has(mission.id) ? new Date() : null }}
              onClaim={handleClaim}
            />
          ))}
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
    textAlign: 'center',
  },
  scroll: { padding: 16, paddingBottom: 32 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.gold,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#1a0a00',
  },
  list: { gap: 0 },
});
