import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { generateReferralCode } from '../utils/helpers';

export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  referredBy?: string
) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  const referralCode = generateReferralCode(displayName);

  await setDoc(doc(db, 'users', credential.user.uid), {
    displayName,
    email,
    level: 1,
    xp: 0,
    xpToNextLevel: 1000,
    walletBalance: 0,
    referralCode,
    referredBy: referredBy || null,
    totalReferrals: 0,
    totalReferralEarnings: 0,
    lastDailyCheckIn: null,
    lastSpinTime: null,
    freeSpinsAvailable: 1,
    dailyChestLastOpened: null,
    createdAt: serverTimestamp(),
  });

  return credential.user;
};

export const loginUser = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);
