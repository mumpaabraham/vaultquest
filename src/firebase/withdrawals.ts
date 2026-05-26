import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { app } from './config';
import { Withdrawal, WithdrawalSettings } from '../types';

const fns = getFunctions(app);
const db  = getFirestore(app);

const DEFAULT_SETTINGS: WithdrawalSettings = {
  chargePercent: 5,
  chargeFlat: 1,
  minAmount: 10,
  maxAmount: 500,
  dailyLimitCount: 3,
  dailyLimitAmount: 500,
};

export async function getWithdrawalSettings(): Promise<WithdrawalSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'withdrawals'));
    return snap.exists() ? (snap.data() as WithdrawalSettings) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function submitWithdrawal(params: {
  amount: number;
  mobileProvider: string;
  mobileNumber: string;
  accountName?: string;
  saveMobile?: boolean;
}): Promise<{ withdrawalId: string; charge: number; netAmount: number }> {
  const fn = httpsCallable(fns, 'requestWithdrawal');
  const result = await fn(params);
  return result.data as { withdrawalId: string; charge: number; netAmount: number };
}

export async function getWithdrawals(uid: string): Promise<Withdrawal[]> {
  const q = query(
    collection(db, 'users', uid, 'withdrawals'),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
}
