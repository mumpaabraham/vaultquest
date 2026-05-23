import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { Vault, SpinResult, Transaction, UserProfile } from '../types';
import { TIERS } from '../constants/tiers';

// ─── User ────────────────────────────────────────────────────────────────────

export const getUser = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ uid, ...snap.data() } as UserProfile) : null;
};

export const updateWalletBalance = (uid: string, amount: number) =>
  updateDoc(doc(db, 'users', uid), { walletBalance: increment(amount) });

export const addXP = async (uid: string, xp: number) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const newXp = (data.xp || 0) + xp;
  const xpToNext = data.xpToNextLevel || 1000;
  if (newXp >= xpToNext) {
    await updateDoc(userRef, {
      xp: newXp - xpToNext,
      level: increment(1),
      xpToNextLevel: xpToNext,
    });
  } else {
    await updateDoc(userRef, { xp: newXp });
  }
};

// ─── Missions ────────────────────────────────────────────────────────────────

export const completeDailyCheckIn = async (uid: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const lastCheckIn = snap.data().lastDailyCheckIn?.toDate();
  if (lastCheckIn && lastCheckIn >= today) return false;
  await updateDoc(doc(db, 'users', uid), {
    lastDailyCheckIn: serverTimestamp(),
  });
  await addXP(uid, 5);
  return true;
};

// ─── Daily Chest ─────────────────────────────────────────────────────────────

export const openDailyChest = async (uid: string): Promise<number | null> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const last = snap.data().dailyChestLastOpened?.toDate();
  if (last && last >= today) return null;
  const reward = parseFloat((Math.random() * 2 + 0.5).toFixed(2));
  await updateDoc(doc(db, 'users', uid), {
    dailyChestLastOpened: serverTimestamp(),
    walletBalance: increment(reward),
  });
  await logTransaction(uid, 'earning', reward, 'Daily chest reward');
  return reward;
};

// ─── Vaults ──────────────────────────────────────────────────────────────────

export const createVault = async (uid: string, tierId: string): Promise<string> => {
  const tier = TIERS.find((t) => t.id === tierId);
  if (!tier) throw new Error('Invalid tier');

  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('User not found');
  const balance = snap.data().walletBalance || 0;
  if (balance < tier.price) throw new Error('Insufficient balance');

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + tier.durationDays);

  const vaultRef = await addDoc(collection(db, 'users', uid, 'vaults'), {
    tierId,
    tierName: tier.name,
    invested: tier.price,
    dailyEarnings: tier.dailyEarnings,
    durationDays: tier.durationDays,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    status: 'active',
    totalEarned: 0,
    lastPayout: Timestamp.fromDate(startDate),
  });

  await updateDoc(doc(db, 'users', uid), {
    walletBalance: increment(-tier.price),
  });
  await logTransaction(uid, 'deposit', -tier.price, `${tier.name} Vault investment`);

  return vaultRef.id;
};

export const getUserVaults = async (uid: string): Promise<Vault[]> => {
  const q = query(
    collection(db, 'users', uid, 'vaults'),
    orderBy('startDate', 'desc')
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() } as Vault));
};

export const processDailyEarnings = async (uid: string) => {
  const vaults = await getUserVaults(uid);
  const now = new Date();
  let totalEarned = 0;

  for (const vault of vaults) {
    if (vault.status !== 'active') continue;
    const endDate = (vault.endDate as unknown as Timestamp).toDate();
    const lastPayout = (vault.lastPayout as unknown as Timestamp).toDate();
    const daysSincePayout = Math.floor(
      (now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePayout < 1) continue;

    const earning = vault.dailyEarnings * daysSincePayout;
    totalEarned += earning;

    const updates: Record<string, unknown> = {
      totalEarned: increment(earning),
      lastPayout: serverTimestamp(),
    };
    if (now >= endDate) updates.status = 'completed';

    await updateDoc(doc(db, 'users', uid, 'vaults', vault.id!), updates);
  }

  if (totalEarned > 0) {
    await updateDoc(doc(db, 'users', uid), { walletBalance: increment(totalEarned) });
    await logTransaction(uid, 'earning', totalEarned, 'Daily vault earnings');
  }

  return totalEarned;
};

// ─── Lucky Spin ──────────────────────────────────────────────────────────────

export const recordSpin = async (
  uid: string,
  result: SpinResult
): Promise<void> => {
  await addDoc(collection(db, 'users', uid, 'spinHistory'), {
    ...result,
    timestamp: serverTimestamp(),
  });

  if (result.type === 'cash') {
    await updateDoc(doc(db, 'users', uid), {
      walletBalance: increment(result.value),
      lastSpinTime: serverTimestamp(),
      freeSpinsAvailable: increment(-1),
    });
    await logTransaction(uid, 'earning', result.value, 'Lucky spin reward');
  } else if (result.type === 'xp') {
    await addXP(uid, result.value);
    await updateDoc(doc(db, 'users', uid), {
      lastSpinTime: serverTimestamp(),
      freeSpinsAvailable: increment(-1),
    });
  } else {
    await updateDoc(doc(db, 'users', uid), {
      lastSpinTime: serverTimestamp(),
      freeSpinsAvailable: increment(-1),
    });
  }
};

export const getSpinHistory = async (uid: string): Promise<SpinResult[]> => {
  const q = query(
    collection(db, 'users', uid, 'spinHistory'),
    orderBy('timestamp', 'desc'),
    limit(10)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() } as SpinResult));
};

// ─── Referrals ───────────────────────────────────────────────────────────────

export const processReferralBonus = async (
  referrerId: string,
  depositAmount: number,
  level: 1 | 2 | 3
) => {
  const rates: Record<number, number> = { 1: 0.1, 2: 0.02, 3: 0.01 };
  const bonus = depositAmount * rates[level];
  if (bonus <= 0) return;

  await updateDoc(doc(db, 'users', referrerId), {
    walletBalance: increment(bonus),
    totalReferralEarnings: increment(bonus),
  });
  await logTransaction(referrerId, 'referral', bonus, `Level ${level} referral bonus`);
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const getLeaderboard = async (limitCount = 20) => {
  const q = query(
    collection(db, 'users'),
    orderBy('level', 'desc'),
    orderBy('xp', 'desc'),
    limit(limitCount)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d, i) => ({
    rank: i + 1,
    uid: d.id,
    displayName: d.data().displayName,
    level: d.data().level,
    xp: d.data().xp,
  }));
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const logTransaction = (
  uid: string,
  type: Transaction['type'],
  amount: number,
  description: string
) =>
  addDoc(collection(db, 'users', uid, 'transactions'), {
    type,
    amount,
    description,
    timestamp: serverTimestamp(),
  });

export const getTransactions = async (uid: string): Promise<Transaction[]> => {
  const q = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
};
