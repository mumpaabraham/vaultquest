export type MissionType = 'daily' | 'weekly' | 'achievement';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: MissionType;
  rewardXP: number;
  rewardCash: number;
  target?: number;
}

export const MISSIONS_CONFIG: Record<string, MissionDef> = {
  daily_login: {
    id: 'daily_login',
    title: 'Daily Login',
    description: 'Open the app today',
    icon: 'log-in-outline',
    type: 'daily',
    rewardXP: 10,
    rewardCash: 0,
  },
  daily_checkin: {
    id: 'daily_checkin',
    title: 'Daily Check-In',
    description: 'Claim your daily reward',
    icon: 'calendar-outline',
    type: 'daily',
    rewardXP: 15,
    rewardCash: 0,
  },
  daily_chest: {
    id: 'daily_chest',
    title: 'Open Daily Chest',
    description: 'Open your free daily chest',
    icon: 'gift-outline',
    type: 'daily',
    rewardXP: 20,
    rewardCash: 0,
  },
  daily_spin: {
    id: 'daily_spin',
    title: 'Lucky Spin',
    description: 'Spin the lucky wheel once',
    icon: 'radio-button-on-outline',
    type: 'daily',
    rewardXP: 15,
    rewardCash: 0,
  },
  weekly_spin_5: {
    id: 'weekly_spin_5',
    title: 'Spin 5 Times',
    description: 'Use the lucky spin 5 times this week',
    icon: 'refresh-circle-outline',
    type: 'weekly',
    rewardXP: 75,
    rewardCash: 0,
    target: 5,
  },
  weekly_referral_3: {
    id: 'weekly_referral_3',
    title: 'Refer 3 Friends',
    description: 'Get 3 friends to join this week',
    icon: 'people-circle-outline',
    type: 'weekly',
    rewardXP: 200,
    rewardCash: 0,
    target: 3,
  },
  weekly_invest: {
    id: 'weekly_invest',
    title: 'Make Investment',
    description: 'Invest in any vault this week',
    icon: 'trending-up-outline',
    type: 'weekly',
    rewardXP: 100,
    rewardCash: 0,
  },
  first_deposit: {
    id: 'first_deposit',
    title: 'First Deposit',
    description: 'Make your very first deposit',
    icon: 'wallet-outline',
    type: 'achievement',
    rewardXP: 50,
    rewardCash: 2.00,
  },
  first_vault: {
    id: 'first_vault',
    title: 'Open a Vault',
    description: 'Invest in your first vault',
    icon: 'cube-outline',
    type: 'achievement',
    rewardXP: 100,
    rewardCash: 0,
  },
  first_referral: {
    id: 'first_referral',
    title: 'First Referral',
    description: 'Refer your first friend',
    icon: 'person-add-outline',
    type: 'achievement',
    rewardXP: 75,
    rewardCash: 5.00,
  },
  reach_level_5: {
    id: 'reach_level_5',
    title: 'Rising Star',
    description: 'Reach Level 5',
    icon: 'star-outline',
    type: 'achievement',
    rewardXP: 0,
    rewardCash: 5.00,
  },
  reach_level_10: {
    id: 'reach_level_10',
    title: 'Veteran Player',
    description: 'Reach Level 10',
    icon: 'trophy-outline',
    type: 'achievement',
    rewardXP: 0,
    rewardCash: 15.00,
  },
};

export const MISSIONS_BY_TYPE = (type: MissionType): MissionDef[] =>
  Object.values(MISSIONS_CONFIG).filter((m) => m.type === type);
