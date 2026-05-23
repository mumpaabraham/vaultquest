import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import { getLeaderboard } from '../src/firebase/database';
import { LeaderboardEntry } from '../src/types';
import { getLevelTierColor, getLevelTierName } from '../src/constants/tiers';
import { useAuthStore } from '../src/store/authStore';

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32'];
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(50)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      {/* Header */}
      <LinearGradient colors={['#0d1526', '#080c18']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>LEADERBOARD</Text>
          <Text style={styles.headerSub}>Top Players</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <View style={styles.podium}>
              {/* 2nd place */}
              <View style={styles.podiumItem}>
                <Text style={styles.podiumEmoji}>{RANK_EMOJIS[1]}</Text>
                <View style={[styles.podiumAvatar, { borderColor: RANK_COLORS[1] }]}>
                  <Text style={styles.podiumAvatarText}>
                    {entries[1].displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entries[1].displayName}</Text>
                <Text style={[styles.podiumLevel, { color: getLevelTierColor(entries[1].level) }]}>
                  Lv. {entries[1].level}
                </Text>
                <View style={[styles.podiumBase, { backgroundColor: RANK_COLORS[1] + '40', height: 60 }]} />
              </View>

              {/* 1st place */}
              <View style={[styles.podiumItem, { marginBottom: 20 }]}>
                <Text style={styles.podiumEmoji}>{RANK_EMOJIS[0]}</Text>
                <View style={[styles.podiumAvatar, { borderColor: RANK_COLORS[0], width: 60, height: 60, borderRadius: 30 }]}>
                  <Text style={[styles.podiumAvatarText, { fontSize: 22 }]}>
                    {entries[0].displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entries[0].displayName}</Text>
                <Text style={[styles.podiumLevel, { color: getLevelTierColor(entries[0].level) }]}>
                  Lv. {entries[0].level}
                </Text>
                <View style={[styles.podiumBase, { backgroundColor: RANK_COLORS[0] + '40', height: 80 }]} />
              </View>

              {/* 3rd place */}
              <View style={styles.podiumItem}>
                <Text style={styles.podiumEmoji}>{RANK_EMOJIS[2]}</Text>
                <View style={[styles.podiumAvatar, { borderColor: RANK_COLORS[2] }]}>
                  <Text style={styles.podiumAvatarText}>
                    {entries[2].displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entries[2].displayName}</Text>
                <Text style={[styles.podiumLevel, { color: getLevelTierColor(entries[2].level) }]}>
                  Lv. {entries[2].level}
                </Text>
                <View style={[styles.podiumBase, { backgroundColor: RANK_COLORS[2] + '40', height: 44 }]} />
              </View>
            </View>
          )}

          {/* Full list */}
          <View style={styles.listCard}>
            {entries.map((entry, i) => {
              const isMe = entry.uid === user?.uid;
              const tierColor = getLevelTierColor(entry.level);
              return (
                <View
                  key={entry.uid}
                  style={[
                    styles.listItem,
                    i < entries.length - 1 && styles.listBorder,
                    isMe && styles.listItemMe,
                  ]}
                >
                  <Text style={[styles.rank, i < 3 && { color: RANK_COLORS[i] }]}>
                    {i < 3 ? RANK_EMOJIS[i] : `#${entry.rank}`}
                  </Text>
                  <View style={[styles.listAvatar, { borderColor: tierColor }]}>
                    <Text style={styles.listAvatarText}>
                      {entry.displayName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listName}>
                      {entry.displayName}
                      {isMe && <Text style={{ color: COLORS.gold }}> (You)</Text>}
                    </Text>
                    <Text style={[styles.listTier, { color: tierColor }]}>
                      {getLevelTierName(entry.level)} · Lv. {entry.level}
                    </Text>
                  </View>
                  <Text style={styles.listXp}>{entry.xp} XP</Text>
                </View>
              );
            })}

            {entries.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No players yet. Be the first!</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  headerSub: { fontSize: 12, color: COLORS.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  podiumItem: { alignItems: 'center', flex: 1, gap: 4 },
  podiumEmoji: { fontSize: 28 },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  podiumAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  podiumName: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center' },
  podiumLevel: { fontSize: 11, fontWeight: '700' },
  podiumBase: { width: '100%', borderRadius: 8, marginTop: 4 },
  listCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listItemMe: { backgroundColor: 'rgba(245,158,11,0.06)' },
  rank: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, width: 32, textAlign: 'center' },
  listAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  listAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  listContent: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  listTier: { fontSize: 12, fontWeight: '600' },
  listXp: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
