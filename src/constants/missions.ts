import { Mission } from '../types';

export const DAILY_MISSIONS: Omit<Mission, 'completedAt'>[] = [
  {
    id: 'daily_checkin',
    title: 'Daily Check-in',
    description: 'Open the app and check in today',
    xpReward: 5,
    type: 'daily',
  },
  {
    id: 'spin_wheel',
    title: 'Spin the Wheel',
    description: 'Spin the lucky wheel',
    xpReward: 10,
    type: 'daily',
  },
  {
    id: 'complete_2_quests',
    title: 'Complete 2 Quests',
    description: 'Complete any 2 missions',
    xpReward: 20,
    type: 'daily',
    progress: 0,
    target: 2,
  },
  {
    id: 'invite_friend',
    title: 'Invite 1 Friend',
    description: 'Invite a friend to join',
    xpReward: 25,
    type: 'daily',
  },
  {
    id: 'play_20_minutes',
    title: 'Play for 20 Minutes',
    description: 'Stay in the game for 20 min.',
    xpReward: 15,
    type: 'daily',
  },
];

export const WEEKLY_MISSIONS: Omit<Mission, 'completedAt'>[] = [
  {
    id: 'weekly_invest',
    title: 'Make an Investment',
    description: 'Invest in any vault this week',
    xpReward: 100,
    type: 'weekly',
  },
  {
    id: 'weekly_referral',
    title: 'Refer 3 Friends',
    description: 'Get 3 friends to sign up',
    xpReward: 200,
    type: 'weekly',
    progress: 0,
    target: 3,
  },
  {
    id: 'weekly_spin_5',
    title: 'Spin 5 Times',
    description: 'Use the lucky spin 5 times',
    xpReward: 75,
    type: 'weekly',
    progress: 0,
    target: 5,
  },
];

export const ACHIEVEMENT_MISSIONS: Omit<Mission, 'completedAt'>[] = [
  {
    id: 'first_deposit',
    title: 'First Deposit',
    description: 'Make your very first investment',
    xpReward: 500,
    type: 'achievement',
  },
  {
    id: 'gold_level',
    title: 'Reach Gold Level',
    description: 'Level up to the Gold tier',
    xpReward: 1000,
    type: 'achievement',
  },
  {
    id: 'referral_king',
    title: 'Referral King',
    description: 'Refer 10 friends total',
    xpReward: 2000,
    type: 'achievement',
    progress: 0,
    target: 10,
  },
];
