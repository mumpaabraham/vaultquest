import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './config';
import app from './config';

const fns = getFunctions(app);

export interface MissionProgress {
  missionId: string;
  completed: boolean;
  claimed: boolean;
  progress: number;
  completedAt?: any;
  claimedAt?: any;
  resetAt?: any;
}

// Fetch all mission progress records for a user
export const getMissionProgress = async (uid: string): Promise<Record<string, MissionProgress>> => {
  const snaps = await getDocs(collection(db, 'users', uid, 'missionProgress'));
  const result: Record<string, MissionProgress> = {};
  snaps.docs.forEach((d) => {
    result[d.id] = d.data() as MissionProgress;
  });
  return result;
};

// Tell the server that an action was performed (login, spin, etc.)
export const trackAction = async (action: string, level?: number): Promise<string[]> => {
  try {
    const fn = httpsCallable<{ action: string; level?: number }, { success: boolean; updated: string[] }>(
      fns, 'trackMissionAction'
    );
    const res = await fn({ action, level });
    return res.data.updated;
  } catch (e) {
    console.error('trackAction error:', e);
    return [];
  }
};

// Claim the reward for a completed mission; returns the reward amounts
export const claimMission = async (
  missionId: string
): Promise<{ rewardXP: number; rewardCash: number }> => {
  const fn = httpsCallable<{ missionId: string }, { success: boolean; rewardXP: number; rewardCash: number }>(
    fns, 'claimMissionReward'
  );
  const res = await fn({ missionId });
  return { rewardXP: res.data.rewardXP, rewardCash: res.data.rewardCash };
};
