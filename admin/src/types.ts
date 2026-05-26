import { Timestamp } from 'firebase/firestore';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  walletBalance: number;
  referralCode: string;
  referredBy: string | null;
  totalReferrals: number;
  totalReferralEarnings: number;
  freeSpinsAvailable: number;
  createdAt: Timestamp;
  mobileMoney?: { provider: string; number: string; accountName?: string };
  suspended?: boolean;
}

export interface Vault {
  id: string;
  uid: string;
  tierId: string;
  tierName: string;
  invested: number;
  dailyEarnings: number;
  durationDays: number;
  startDate: Timestamp;
  endDate: Timestamp;
  lastPayout: Timestamp;
  status: 'active' | 'completed';
  totalEarned: number;
  userDisplayName?: string;
  depositId?: string | null;
  source?: 'deposit' | 'manual';
}

export interface Withdrawal {
  id: string;
  uid: string;
  amount: number;
  charge: number;
  netAmount: number;
  mobileProvider: string;
  mobileNumber: string;
  accountName?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  processedBy?: string | null;
  note?: string | null;
  userDisplayName?: string;
}

export interface Deposit {
  id: string;
  uid: string;
  userDisplayName: string;
  amount: number;
  mobileProvider: string;
  mobileNumber: string;
  payerName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  processedBy?: string | null;
  note?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  packageImageUrl?: string | null;
  vaultId?: string | null;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  dailyEarnings: number;
  durationDays: number;
  color: string;
  icon: string;
  imageUrl?: string;
  popular?: boolean;
  active: boolean;
}

export interface WithdrawalSettings {
  chargePercent: number;
  chargeFlat: number;
  minAmount: number;
  maxAmount: number;
  dailyLimitCount: number;
  dailyLimitAmount: number;
}

export interface AppSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralBonusL1: number;
  referralBonusL2: number;
  referralBonusL3: number;
}

export interface PaymentAccount {
  number: string;
  name: string;
}

export interface PaymentAccounts {
  mtn: PaymentAccount;
  airtel: PaymentAccount;
  zamtel: PaymentAccount;
}

export interface SpinSegment {
  label: string;
  type: 'cash' | 'xp' | 'boost' | 'spin_bonus';
  value: number;       // free-spin prize amount (cash) or reward quantity (xp/boost)
  multiplier?: number; // paid-spin cash multiplier (bet × multiplier = win); defaults to value
  duration?: number;
  weight: number;
  color: string;
  textColor: string;
}
