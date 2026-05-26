import { Timestamp } from 'firebase/firestore';

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
  lastDailyCheckIn: Timestamp | null;
  lastSpinTime: Timestamp | null;
  freeSpinsAvailable: number;
  dailyChestLastOpened: Timestamp | null;
  createdAt: Timestamp;
  mobileMoney?: { provider: string; number: string; accountName?: string };
}

export interface Vault {
  id?: string;
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
}

export interface Tier {
  id: string;
  name: string;
  price: number;
  dailyEarnings: number;
  durationDays: number;
  color: string;
  gradientColors: string[];
  icon: string;
  popular?: boolean;
}

export interface SpinResult {
  id?: string;
  label: string;
  type: 'cash' | 'xp' | 'boost' | 'spin_bonus';
  value: number;
  multiplier?: number;
  duration?: number;
  timestamp?: Timestamp;
}

export interface WheelSegment {
  label: string;
  type: SpinResult['type'];
  value: number;       // free-spin prize (cash) or reward quantity (xp/boost)
  multiplier?: number; // paid-spin cash multiplier; falls back to value if absent
  duration?: number;
  color: string;
  textColor: string;
  weight?: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'daily' | 'weekly' | 'achievement';
  completedAt?: Date | null;
  progress?: number;
  target?: number;
}

export interface Transaction {
  id?: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'referral';
  amount: number;
  description: string;
  timestamp: Timestamp;
}

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  level: number;
  xp: number;
}

export interface Withdrawal {
  id?: string;
  amount: number;
  charge: number;
  netAmount: number;
  mobileProvider: string;
  mobileNumber: string;
  accountName?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  note?: string | null;
}

export interface WithdrawalSettings {
  chargePercent: number;
  chargeFlat: number;
  minAmount: number;
  maxAmount: number;
  dailyLimitCount: number;
  dailyLimitAmount: number;
}
