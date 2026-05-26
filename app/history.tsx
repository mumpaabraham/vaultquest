import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { COLORS } from '../src/constants/colors';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';
import { PageHeader } from '../src/components/PageHeader';
import { formatCurrency, formatDate, getTimeAgo } from '../src/utils/helpers';
import { Transaction } from '../src/types';

type Filter = 'all' | 'earning' | 'deposit' | 'withdrawal' | 'referral';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',        label: 'All'       },
  { key: 'earning',    label: 'Earnings'  },
  { key: 'deposit',    label: 'Deposits'  },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'referral',   label: 'Referrals' },
];

const TYPE_META: Record<
  Transaction['type'],
  { icon: string; color: string; label: string; sign: '+' | '-' }
> = {
  earning:    { icon: 'trending-up',      color: '#22c55e', label: 'Earning',    sign: '+' },
  deposit:    { icon: 'arrow-down-circle', color: '#f59e0b', label: 'Deposit',    sign: '+' },
  withdrawal: { icon: 'arrow-up-circle',   color: '#ef4444', label: 'Withdrawal', sign: '-' },
  referral:   { icon: 'people',            color: '#a78bfa', label: 'Referral',   sign: '+' },
};

function toDate(ts: Timestamp | undefined): Date {
  if (!ts) return new Date(0);
  return (ts as unknown as Timestamp).toDate();
}

function groupByDate(txns: Transaction[]): { label: string; data: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const d = toDate(tx.timestamp);
    const key = formatDate(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([label, data]) => ({ label, data }));
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const { transactions, fetchTransactions } = useUserStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (!user) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    await fetchTransactions(user.uid);
    if (showRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const groups = groupByDate(filtered);

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <PageHeader title="HISTORY" />

      {/* Filter tabs */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySub}>Your activity will appear here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.gold} />
          }
        >
          {groups.map(group => (
            <View key={group.label}>
              <Text style={styles.dateLabel}>{group.label}</Text>
              <View style={styles.group}>
                {group.data.map((tx, i) => {
                  const meta = TYPE_META[tx.type];
                  const date = toDate(tx.timestamp);
                  return (
                    <View
                      key={tx.id ?? i}
                      style={[
                        styles.row,
                        i < group.data.length - 1 && styles.rowBorder,
                      ]}
                    >
                      {/* Icon */}
                      <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
                        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      </View>

                      {/* Info */}
                      <View style={styles.info}>
                        <Text style={styles.desc} numberOfLines={1}>{tx.description}</Text>
                        <View style={styles.metaRow}>
                          <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
                            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                          <Text style={styles.time}>{getTimeAgo(date)}</Text>
                        </View>
                      </View>

                      {/* Amount */}
                      <Text style={[
                        styles.amount,
                        { color: meta.sign === '+' ? '#22c55e' : '#ef4444' },
                      ]}>
                        {meta.sign}{formatCurrency(Math.abs(tx.amount))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },


  filtersWrap: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterTabActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterLabelActive: { color: '#000' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },

  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  group: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  desc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  time: { fontSize: 11, color: COLORS.textMuted },
  amount: { fontSize: 15, fontWeight: '800' },
});
