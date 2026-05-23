import { Tier } from '../types';

export const TIERS: Tier[] = [
  {
    id: 'bronze',
    name: 'BRONZE',
    price: 5,
    dailyEarnings: 0.30,
    durationDays: 30,
    color: '#cd7f32',
    gradientColors: ['#a0522d', '#cd7f32'],
    icon: '🥉',
  },
  {
    id: 'silver',
    name: 'SILVER',
    price: 20,
    dailyEarnings: 1.58,
    durationDays: 30,
    color: '#9ca3af',
    gradientColors: ['#6b7280', '#9ca3af'],
    icon: '🥈',
    popular: true,
  },
  {
    id: 'gold',
    name: 'GOLD',
    price: 50,
    dailyEarnings: 4.00,
    durationDays: 30,
    color: '#f59e0b',
    gradientColors: ['#d97706', '#f59e0b'],
    icon: '🥇',
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    price: 100,
    dailyEarnings: 8.04,
    durationDays: 30,
    color: '#e5e7eb',
    gradientColors: ['#9ca3af', '#e5e7eb'],
    icon: '💎',
  },
];

export const LEVEL_TIER_MAP: Record<number, string> = {
  1: 'bronze',
  2: 'bronze',
  3: 'silver',
  4: 'silver',
  5: 'gold',
  6: 'gold',
  7: 'gold',
  8: 'platinum',
  9: 'platinum',
  10: 'platinum',
};

export const getLevelTierName = (level: number): string => {
  if (level <= 2) return 'BRONZE';
  if (level <= 4) return 'SILVER';
  if (level <= 7) return 'GOLD';
  return 'PLATINUM';
};

export const getLevelTierColor = (level: number): string => {
  if (level <= 2) return '#cd7f32';
  if (level <= 4) return '#9ca3af';
  if (level <= 7) return '#f59e0b';
  return '#e5e7eb';
};
