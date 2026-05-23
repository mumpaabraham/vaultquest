import { create } from 'zustand';
import { UserProfile, Vault, SpinResult, Transaction } from '../types';
import {
  getUser,
  getUserVaults,
  getSpinHistory,
  getTransactions,
  processDailyEarnings,
} from '../firebase/database';

interface UserState {
  profile: UserProfile | null;
  vaults: Vault[];
  spinHistory: SpinResult[];
  transactions: Transaction[];
  loading: boolean;
  fetchProfile: (uid: string) => Promise<void>;
  fetchVaults: (uid: string) => Promise<void>;
  fetchSpinHistory: (uid: string) => Promise<void>;
  fetchTransactions: (uid: string) => Promise<void>;
  processEarnings: (uid: string) => Promise<void>;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  vaults: [],
  spinHistory: [],
  transactions: [],
  loading: false,

  fetchProfile: async (uid) => {
    set({ loading: true });
    const profile = await getUser(uid);
    set({ profile, loading: false });
  },

  fetchVaults: async (uid) => {
    const vaults = await getUserVaults(uid);
    set({ vaults });
  },

  fetchSpinHistory: async (uid) => {
    const spinHistory = await getSpinHistory(uid);
    set({ spinHistory });
  },

  fetchTransactions: async (uid) => {
    const transactions = await getTransactions(uid);
    set({ transactions });
  },

  processEarnings: async (uid) => {
    await processDailyEarnings(uid);
    const profile = await getUser(uid);
    set({ profile });
  },

  reset: () =>
    set({ profile: null, vaults: [], spinHistory: [], transactions: [], loading: false }),
}));
