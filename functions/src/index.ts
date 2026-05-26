import { setGlobalOptions } from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 10, region: 'us-central1' });

// ─── Push notification helpers ────────────────────────────────────────────────

async function sendExpoPush(tokens: string[], payload: {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!tokens.length) return;
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map(to => ({
      to,
      title:     payload.title,
      body:      payload.body,
      sound:     'default',
      channelId: 'default',
      ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      data:      payload.data ?? {},
    }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body:    JSON.stringify(batch),
      });
    } catch (e) {
      console.error('[push] expo send error:', e);
    }
  }
}

async function sendToUser(uid: string, payload: {
  title: string; body: string; imageUrl?: string; data?: Record<string, string>;
}): Promise<void> {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return;
  const tokens: string[] = snap.data()!.expoPushTokens ?? [];
  if (!tokens.length) return;
  await sendExpoPush(tokens, payload);
}

// ─── Mission definitions (single source of truth) ────────────────────────────

const MISSIONS: Record<string, {
  title: string;
  type: 'daily' | 'weekly' | 'achievement';
  action: string;
  target?: number;
  rewardXP: number;
  rewardCash: number;
  levelRequired?: number;
}> = {
  daily_login:       { title: 'Daily Login',       type: 'daily',       action: 'login',      rewardXP: 10,  rewardCash: 0     },
  daily_checkin:     { title: 'Daily Check-In',    type: 'daily',       action: 'check_in',   rewardXP: 15,  rewardCash: 0     },
  daily_chest:       { title: 'Open Daily Chest',  type: 'daily',       action: 'open_chest', rewardXP: 20,  rewardCash: 0     },
  daily_spin:        { title: 'Lucky Spin',        type: 'daily',       action: 'spin',       rewardXP: 15,  rewardCash: 0     },
  weekly_spin_5:     { title: 'Spin 5 Times',      type: 'weekly',      action: 'spin',       target: 5, rewardXP: 75,  rewardCash: 0     },
  weekly_referral_3: { title: 'Refer 3 Friends',   type: 'weekly',      action: 'refer',      target: 3, rewardXP: 200, rewardCash: 0     },
  weekly_invest:     { title: 'Make Investment',   type: 'weekly',      action: 'invest',     rewardXP: 100, rewardCash: 0     },
  first_deposit:     { title: 'First Deposit',     type: 'achievement', action: 'deposit',    rewardXP: 50,  rewardCash: 2.00  },
  first_vault:       { title: 'Open a Vault',      type: 'achievement', action: 'invest',     rewardXP: 100, rewardCash: 0     },
  first_referral:    { title: 'First Referral',    type: 'achievement', action: 'refer',      rewardXP: 75,  rewardCash: 5.00  },
  reach_level_5:     { title: 'Rising Star',       type: 'achievement', action: 'level_up',   rewardXP: 0,   rewardCash: 5.00,  levelRequired: 5  },
  reach_level_10:    { title: 'Veteran Player',    type: 'achievement', action: 'level_up',   rewardXP: 0,   rewardCash: 15.00, levelRequired: 10 },
};

// ─── Referral commission rates ────────────────────────────────────────────────

const REFERRAL_RATES: Record<number, number> = { 1: 0.10, 2: 0.05, 3: 0.03 };

// ─── Shared helper: advance mission progress for a user ──────────────────────

async function progressMissions(uid: string, action: string, level?: number): Promise<string[]> {
  const matching = Object.entries(MISSIONS).filter(([, m]) => m.action === action);
  const updated: string[] = [];

  for (const [missionId, mission] of matching) {
    if (mission.levelRequired && (!level || level < mission.levelRequired)) continue;

    const ref = db.collection('users').doc(uid)
      .collection('missionProgress').doc(missionId);

    const snap = await ref.get();
    const cur = snap.exists
      ? (snap.data() as { completed: boolean; claimed: boolean; progress: number })
      : { completed: false, claimed: false, progress: 0 };

    if (mission.type === 'achievement' && cur.completed) continue;
    if (cur.completed) continue;

    const newProgress = (cur.progress || 0) + 1;
    const target      = mission.target ?? 1;
    const isComplete  = newProgress >= target;

    await ref.set({
      missionId,
      progress: newProgress,
      completed: isComplete,
      claimed: cur.claimed,
      completedAt: isComplete ? FieldValue.serverTimestamp() : null,
    }, { merge: true });

    if (isComplete) updated.push(missionId);
  }

  return updated;
}

// ─── Shared helper: walk up to 3 referral levels and pay commissions ─────────
//  uid          — the user who just deposited
//  depositAmount — gross deposit amount

async function processReferralChain(uid: string, depositAmount: number): Promise<void> {
  let currentUid = uid;

  for (let level = 1; level <= 3; level++) {
    const userSnap = await db.collection('users').doc(currentUid).get();
    if (!userSnap.exists) break;

    const referredByCode: string | null = userSnap.data()!.referredBy ?? null;
    if (!referredByCode) break;

    // Look up referrer by their referral code
    const referrerQuery = await db.collection('users')
      .where('referralCode', '==', referredByCode)
      .limit(1)
      .get();

    if (referrerQuery.empty) break;

    const referrerDoc = referrerQuery.docs[0];
    const referrerId  = referrerDoc.id;
    const bonus       = parseFloat((depositAmount * REFERRAL_RATES[level]).toFixed(2));

    if (bonus > 0) {
      const referrerRef = db.collection('users').doc(referrerId);

      await referrerRef.update({
        walletBalance:          FieldValue.increment(bonus),
        totalReferralEarnings:  FieldValue.increment(bonus),
      });

      await referrerRef.collection('transactions').add({
        type:        'referral',
        amount:      bonus,
        description: `Level ${level} referral commission (${REFERRAL_RATES[level] * 100}%)`,
        timestamp:   FieldValue.serverTimestamp(),
      });

      // Advance referral-related missions for the referrer
      await progressMissions(referrerId, 'refer');

      // Notify referrer of bonus
      try {
        await sendToUser(referrerId, {
          title: 'Referral Bonus!',
          body:  `You earned K${Math.floor(bonus)} level-${level} referral commission.`,
          data:  { route: '/(tabs)' },
        });
      } catch (e) { console.error('[push] referral bonus error:', e); }
    }

    currentUid = referrerId;
  }
}

// ─── Scheduled: reset daily missions at 00:00 CAT = 22:00 UTC ────────────────

async function resetMissionsByType(type: 'daily' | 'weekly') {
  const ids = Object.entries(MISSIONS)
    .filter(([, m]) => m.type === type)
    .map(([id]) => id);

  const usersSnap = await db.collection('users').get();
  let batch = db.batch();
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    for (const missionId of ids) {
      const ref = db.collection('users').doc(userDoc.id)
        .collection('missionProgress').doc(missionId);
      batch.set(ref, {
        missionId,
        completed: false,
        claimed: false,
        progress: 0,
        resetAt: FieldValue.serverTimestamp(),
      });
      count++;
      if (count >= 490) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
  }
  if (count > 0) await batch.commit();
  return usersSnap.size;
}

export const resetDailyMissions = onSchedule(
  { schedule: '0 22 * * *', timeZone: 'UTC' },
  async () => {
    const n = await resetMissionsByType('daily');
    console.log(`[daily reset] reset for ${n} users`);
  }
);

export const resetWeeklyMissions = onSchedule(
  { schedule: '0 22 * * 0', timeZone: 'UTC' },
  async () => {
    const n = await resetMissionsByType('weekly');
    console.log(`[weekly reset] reset for ${n} users`);
  }
);

// ─── Firestore trigger: new user registered with a referral code ─────────────
// Increments the referrer's totalReferrals counter.

export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const data = event.data?.data();
  const uid  = event.params.userId;

  // Welcome notification
  try {
    await sendToUser(uid, {
      title: 'Welcome to VaultQuest!',
      body:  'Your account is ready. Start investing to earn daily returns.',
      data:  { route: '/(tabs)' },
    });
  } catch (e) { console.error('[push] welcome error:', e); }

  if (!data?.referredBy) return;

  const referrerQuery = await db.collection('users')
    .where('referralCode', '==', data.referredBy)
    .limit(1)
    .get();

  if (referrerQuery.empty) return;

  const referrerId = referrerQuery.docs[0].id;
  await db.collection('users').doc(referrerId).update({
    totalReferrals: FieldValue.increment(1),
  });

  // Notify referrer of the new sign-up
  try {
    await sendToUser(referrerId, {
      title: 'New Referral!',
      body:  `${data.displayName ?? 'Someone'} joined VaultQuest using your referral code.`,
      data:  { route: '/refer' },
    });
  } catch (e) { console.error('[push] referral join error:', e); }

  console.log(`[referral] ${referrerId} gained a new referral from user ${uid}`);
});

// ─── Callable: track a mission action ────────────────────────────────────────

export const trackMissionAction = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { action, level } = request.data as { action: string; level?: number };
  const uid = request.auth.uid;
  const updated = await progressMissions(uid, action, level);

  return { success: true, updated };
});

// ─── Admin helper ─────────────────────────────────────────────────────────────

async function requireAdmin(auth: { uid: string } | undefined) {
  if (!auth) throw new HttpsError('unauthenticated', 'Login required');
  const snap = await db.collection('admins').doc(auth.uid).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'Admin access required');
}

// ─── Admin: approve or reject a withdrawal ────────────────────────────────────

export const adminApproveWithdrawal = onCall(async (request) => {
  await requireAdmin(request.auth);

  const { uid, withdrawalId, action, note } =
    request.data as { uid: string; withdrawalId: string; action: 'approve' | 'reject'; note?: string };

  const wRef    = db.collection('users').doc(uid).collection('withdrawals').doc(withdrawalId);
  const userRef = db.collection('users').doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const wDoc = await tx.get(wRef);
    if (!wDoc.exists || wDoc.data()!.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Withdrawal is not pending');
    }
    const amount: number = wDoc.data()!.amount;

    tx.update(wRef, {
      status:      action === 'approve' ? 'approved' : 'rejected',
      processedAt: FieldValue.serverTimestamp(),
      processedBy: request.auth!.uid,
      note:        note ?? null,
    });

    if (action === 'reject') {
      tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
      const txRef = userRef.collection('transactions').doc();
      tx.set(txRef, {
        type:        'deposit',
        amount,
        description: 'Withdrawal refunded — rejected by admin',
        timestamp:   FieldValue.serverTimestamp(),
      });
    }

    return { success: true, amount };
  });

  // Notify user of withdrawal outcome (after transaction commits)
  try {
    const { amount } = result as { success: boolean; amount: number };
    if (action === 'approve') {
      await sendToUser(uid, {
        title: 'Withdrawal Processed ✓',
        body:  `Your withdrawal of K${Math.floor(amount)} has been sent to your mobile money account.`,
        data:  { route: '/history' },
      });
    } else {
      const reason = note ? ` Reason: ${note}` : '';
      await sendToUser(uid, {
        title: 'Withdrawal Rejected',
        body:  `Your withdrawal of K${Math.floor(amount)} was not processed.${reason} The amount has been refunded to your wallet.`,
        data:  { route: '/withdraw' },
      });
    }
  } catch (e) { console.error('[push] withdrawal notify error:', e); }

  return result;
});

// ─── Admin: approve or reject a deposit ──────────────────────────────────────
// On approval: credits wallet + auto-creates the linked vault (if any) +
// processes the full referral commission chain.

export const adminApproveDeposit = onCall(async (request) => {
  await requireAdmin(request.auth);

  const { depositId, uid, action, note } =
    request.data as { depositId: string; uid: string; action: 'approve' | 'reject'; note?: string };

  const dRef    = db.collection('deposits').doc(depositId);
  const userRef = db.collection('users').doc(uid);

  let approvedAmount  = 0;
  let investedPkgName: string | null = null;
  let createdVaultId:  string | null = null;

  await db.runTransaction(async (tx) => {
    const [dDoc, userDoc] = await Promise.all([tx.get(dRef), tx.get(userRef)]);

    if (!dDoc.exists || dDoc.data()!.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Deposit is not pending');
    }
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const dData          = dDoc.data()!;
    const amount: number = dData.amount;
    const packageId: string | null = dData.packageId ?? null;
    approvedAmount = amount;

    const currentBalance: number   = userDoc.data()!.walletBalance || 0;
    const userDisplayName: string  = userDoc.data()!.displayName   ?? '';

    // Load the linked package (if any) inside the transaction
    let pkg: {
      id: string; name: string; price: number;
      dailyEarnings: number; durationDays: number;
    } | null = null;

    if (packageId) {
      const pkgDoc = await tx.get(db.collection('packages').doc(packageId));
      if (pkgDoc.exists) {
        const pd = pkgDoc.data()!;
        pkg = {
          id: pkgDoc.id, name: pd.name, price: pd.price,
          dailyEarnings: pd.dailyEarnings, durationDays: pd.durationDays,
        };
      }
    }

    // Decide whether the vault can be auto-created.
    // Balance after crediting the deposit must cover the package price.
    const canActivate = !!(pkg && (currentBalance + amount) >= pkg.price);

    // Prepare a pre-allocated vault ref so we can embed its ID in the deposit update
    const vaultRef = canActivate ? userRef.collection('vaults').doc() : null;
    if (vaultRef) createdVaultId = vaultRef.id;

    // ── Single deposit document update ────────────────────────────────────────
    tx.update(dRef, {
      status:      action === 'approve' ? 'approved' : 'rejected',
      processedAt: FieldValue.serverTimestamp(),
      processedBy: request.auth!.uid,
      note:        note ?? null,
      ...(action === 'approve' && vaultRef ? { vaultId: vaultRef.id } : {}),
    });

    if (action === 'approve') {
      // Net wallet delta: deposit amount in, package price out (if activating)
      const walletDelta = canActivate ? amount - pkg!.price : amount;
      tx.update(userRef, { walletBalance: FieldValue.increment(walletDelta) });

      // Log deposit credit transaction
      tx.set(userRef.collection('transactions').doc(), {
        type:        'deposit',
        amount,
        description: 'Mobile money deposit approved',
        timestamp:   FieldValue.serverTimestamp(),
      });

      if (canActivate && vaultRef && pkg) {
        investedPkgName = pkg.name;

        const now     = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + pkg.durationDays);

        // Create the vault
        tx.set(vaultRef, {
          tierId:          pkg.id,
          tierName:        pkg.name,
          invested:        pkg.price,
          dailyEarnings:   pkg.dailyEarnings,
          durationDays:    pkg.durationDays,
          startDate:       now,
          endDate,
          status:          'active',
          totalEarned:     0,
          lastPayout:      now,
          depositId,
          source:          'deposit',
          userDisplayName,
        });

        // Log investment deduction transaction
        tx.set(userRef.collection('transactions').doc(), {
          type:        'deposit',
          amount:      -pkg.price,
          description: `${pkg.name} vault activated`,
          timestamp:   FieldValue.serverTimestamp(),
        });
      }
    }
  });

  // Post-transaction: referral chain + mission progress
  if (action === 'approve' && approvedAmount > 0) {
    try {
      await processReferralChain(uid, approvedAmount);
      await progressMissions(uid, 'deposit');
      if (investedPkgName) await progressMissions(uid, 'invest');
    } catch (err) {
      console.error('[referral] chain processing error:', err);
    }
  }

  // Notify user of deposit outcome
  try {
    if (action === 'approve') {
      const notifBody = investedPkgName
        ? `Your K${Math.floor(approvedAmount)} deposit was approved and your ${investedPkgName} vault is now active.`
        : `Your K${Math.floor(approvedAmount)} deposit was approved and credited to your wallet.`;
      await sendToUser(uid, { title: 'Deposit Approved ✓', body: notifBody, data: { route: '/(tabs)' } });
    } else {
      const reason = typeof (request.data as { note?: string }).note === 'string' && (request.data as { note?: string }).note
        ? ` Reason: ${(request.data as { note?: string }).note}`
        : '';
      await sendToUser(uid, {
        title: 'Deposit Rejected',
        body:  `Your deposit was not approved.${reason}`,
        data:  { route: '/deposit' },
      });
    }
  } catch (e) { console.error('[push] deposit notify error:', e); }

  return { success: true, vaultId: createdVaultId };
});

// ─── Admin: manually adjust a user's balance ─────────────────────────────────

export const adminAdjustBalance = onCall(async (request) => {
  await requireAdmin(request.auth);

  const { uid, amount, note } =
    request.data as { uid: string; amount: number; note?: string };

  if (!uid || amount === undefined || amount === 0) {
    throw new HttpsError('invalid-argument', 'uid and non-zero amount required');
  }

  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const balance: number = userDoc.data()!.walletBalance || 0;
    if (amount < 0 && balance + amount < 0) {
      throw new HttpsError('failed-precondition', 'Deduction would result in negative balance');
    }

    tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
    const txRef = userRef.collection('transactions').doc();
    tx.set(txRef, {
      type:        amount > 0 ? 'deposit' : 'withdrawal',
      amount:      Math.abs(amount),
      description: note ?? 'Admin balance adjustment',
      timestamp:   FieldValue.serverTimestamp(),
    });

    return { success: true, newBalance: balance + amount };
  });
});

// ─── Callable: request a withdrawal ──────────────────────────────────────────

export const requestWithdrawal = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { amount, mobileProvider, mobileNumber, accountName, saveMobile } =
    request.data as { amount: number; mobileProvider: string; mobileNumber: string; accountName?: string; saveMobile?: boolean };

  const uid = request.auth.uid;

  if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount');
  if (!mobileProvider || !mobileNumber?.trim()) {
    throw new HttpsError('invalid-argument', 'Mobile money details required');
  }

  // Load admin settings (fall back to safe defaults if not configured)
  const settingsSnap = await db.collection('settings').doc('withdrawals').get();
  const s = settingsSnap.exists
    ? (settingsSnap.data() as {
        chargePercent: number; chargeFlat: number;
        minAmount: number; maxAmount: number;
        dailyLimitCount: number; dailyLimitAmount: number;
      })
    : { chargePercent: 5, chargeFlat: 1, minAmount: 10, maxAmount: 500, dailyLimitCount: 3, dailyLimitAmount: 500 };

  if (amount < s.minAmount) throw new HttpsError('invalid-argument', `Minimum withdrawal is K${s.minAmount.toFixed(2)}`);
  if (amount > s.maxAmount) throw new HttpsError('invalid-argument', `Maximum withdrawal is K${s.maxAmount.toFixed(2)}`);

  // Start-of-day in CAT (UTC+2) expressed as a UTC Date for Firestore query
  const catOffsetMs   = 2 * 60 * 60 * 1000;
  const nowCAT        = new Date(Date.now() + catOffsetMs);
  nowCAT.setHours(0, 0, 0, 0);
  const startOfDayUTC = new Date(nowCAT.getTime() - catOffsetMs);

  const todaySnap = await db.collection('users').doc(uid)
    .collection('withdrawals')
    .where('createdAt', '>=', startOfDayUTC)
    .get();

  if (todaySnap.size >= s.dailyLimitCount) {
    throw new HttpsError('resource-exhausted', `Daily withdrawal limit of ${s.dailyLimitCount} reached`);
  }
  const todayTotal = todaySnap.docs.reduce((sum, d) => sum + ((d.data().amount as number) || 0), 0);
  if (todayTotal + amount > s.dailyLimitAmount) {
    throw new HttpsError('resource-exhausted', `Daily amount limit of K${s.dailyLimitAmount.toFixed(2)} would be exceeded`);
  }

  const charge    = parseFloat((s.chargeFlat + (s.chargePercent / 100) * amount).toFixed(2));
  const netAmount = parseFloat((amount - charge).toFixed(2));

  const userRef        = db.collection('users').doc(uid);
  const withdrawalsRef = userRef.collection('withdrawals');

  return db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const balance: number = userDoc.data()!.walletBalance || 0;
    if (balance < amount) {
      throw new HttpsError('failed-precondition', `Insufficient balance. Available: K${balance.toFixed(2)}`);
    }

    tx.update(userRef, { walletBalance: FieldValue.increment(-amount) });

    if (saveMobile) {
      const mobileMoney: Record<string, string> = { provider: mobileProvider, number: mobileNumber.trim() };
      if (accountName?.trim()) mobileMoney.accountName = accountName.trim();
      tx.update(userRef, { mobileMoney });
    }

    const userDisplayName: string = userDoc.data()!.displayName ?? '';
    const newRef = withdrawalsRef.doc();
    tx.set(newRef, {
      uid,
      userDisplayName,
      amount,
      charge,
      netAmount,
      mobileProvider,
      mobileNumber:  mobileNumber.trim(),
      accountName:   accountName?.trim() || null,
      status:        'pending',
      createdAt:     FieldValue.serverTimestamp(),
      processedAt:   null,
      note:          null,
    });

    return { success: true, withdrawalId: newRef.id, charge, netAmount };
  });
});

// ─── Callable: buy a vault directly from wallet balance ──────────────────────

export const buyVaultWithBalance = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { packageId } = request.data as { packageId: string };
  const uid = request.auth.uid;

  const pkgSnap = await db.collection('packages').doc(packageId).get();
  if (!pkgSnap.exists) throw new HttpsError('not-found', 'Package not found');

  const pkgData = pkgSnap.data()!;
  if (!pkgData.active) throw new HttpsError('failed-precondition', 'Package not available');

  const userRef  = db.collection('users').doc(uid);
  const vaultRef = userRef.collection('vaults').doc();

  await db.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    const balance: number = userDoc.data()!.walletBalance || 0;
    if (balance < pkgData.price) {
      throw new HttpsError(
        'failed-precondition',
        `Insufficient balance. Need K${pkgData.price.toFixed(2)}, available K${balance.toFixed(2)}`
      );
    }

    const now     = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + pkgData.durationDays);

    tx.update(userRef, { walletBalance: FieldValue.increment(-pkgData.price) });

    tx.set(vaultRef, {
      tierId:        pkgSnap.id,
      tierName:      pkgData.name,
      invested:      pkgData.price,
      dailyEarnings: pkgData.dailyEarnings,
      durationDays:  pkgData.durationDays,
      startDate:     now,
      endDate,
      status:        'active',
      totalEarned:   0,
      lastPayout:    now,
      source:        'balance',
    });

    tx.set(userRef.collection('transactions').doc(), {
      type:        'deposit',
      amount:      -pkgData.price,
      description: `${pkgData.name} vault — purchased from balance`,
      timestamp:   FieldValue.serverTimestamp(),
    });
  });

  try { await progressMissions(uid, 'invest'); } catch (err) {
    console.error('[buyVaultWithBalance] mission error:', err);
  }

  return { success: true, vaultId: vaultRef.id };
});

// ─── Callable: open daily chest ──────────────────────────────────────────────
// Pays 1 % of the user's total active-vault invested amount, once per CAT day.

export const openDailyChest = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const uid     = request.auth.uid;
  const userRef = db.collection('users').doc(uid);

  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'User not found');

  const userData   = userSnap.data()!;
  const lastOpened = userData.dailyChestLastOpened
    ? (userData.dailyChestLastOpened as FirebaseFirestore.Timestamp).toDate()
    : null;

  const MS_24H = 24 * 60 * 60 * 1000;

  // Chest is once per 24-hour rolling window
  if (lastOpened && Date.now() - lastOpened.getTime() < MS_24H) {
    return { alreadyOpened: true, reward: 0 };
  }

  // Sum invested and check vault maturity across all active vaults
  const vaultsSnap    = await userRef.collection('vaults').where('status', '==', 'active').get();
  const totalInvested = vaultsSnap.docs.reduce(
    (s, d) => s + (((d.data().invested) as number) || 0), 0
  );

  if (totalInvested === 0) {
    return { alreadyOpened: false, reward: 0, noVaults: true };
  }

  // On first open, require at least one vault to be 24h old
  if (!lastOpened) {
    const hasMaturedVault = vaultsSnap.docs.some(d => {
      const startDate = d.data().startDate as FirebaseFirestore.Timestamp | null;
      return startDate && Date.now() - startDate.toDate().getTime() >= MS_24H;
    });
    if (!hasMaturedVault) {
      return { alreadyOpened: false, reward: 0, noVaults: true };
    }
  }

  const reward = parseFloat((totalInvested * 0.01).toFixed(2));

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(userRef);
    if (!fresh.exists) throw new HttpsError('not-found', 'User not found');

    tx.update(userRef, {
      dailyChestLastOpened: FieldValue.serverTimestamp(),
      walletBalance:        FieldValue.increment(reward),
    });

    tx.set(userRef.collection('transactions').doc(), {
      type:        'earning',
      amount:      reward,
      description: 'Daily chest reward',
      timestamp:   FieldValue.serverTimestamp(),
    });
  });

  try { await progressMissions(uid, 'open_chest'); } catch (err) {
    console.error('[openDailyChest] mission error:', err);
  }

  return { alreadyOpened: false, reward };
});

// ─── Callable: claim a mission reward ────────────────────────────────────────

export const claimMissionReward = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { missionId } = request.data as { missionId: string };
  const uid = request.auth.uid;

  const mission = MISSIONS[missionId];
  if (!mission) throw new HttpsError('not-found', 'Mission not found');

  const progressRef = db.collection('users').doc(uid)
    .collection('missionProgress').doc(missionId);
  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async (tx) => {
    const [progressDoc, userDoc] = await Promise.all([tx.get(progressRef), tx.get(userRef)]);

    if (!progressDoc.exists || !progressDoc.data()!.completed) {
      throw new HttpsError('failed-precondition', 'Mission not completed yet');
    }
    if (progressDoc.data()!.claimed) {
      throw new HttpsError('already-exists', 'Reward already claimed');
    }
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

    tx.update(progressRef, { claimed: true, claimedAt: FieldValue.serverTimestamp() });

    const userData = userDoc.data()!;
    const updates: Record<string, unknown> = {};

    if (mission.rewardXP > 0) {
      const newXP    = (userData.xp || 0) + mission.rewardXP;
      const xpToNext = userData.xpToNextLevel || 1000;
      if (newXP >= xpToNext) {
        updates.xp    = newXP - xpToNext;
        updates.level = FieldValue.increment(1);
      } else {
        updates.xp = newXP;
      }
    }
    if (mission.rewardCash > 0) {
      updates.walletBalance = FieldValue.increment(mission.rewardCash);
    }
    if (Object.keys(updates).length) tx.update(userRef, updates);

    return { success: true, rewardXP: mission.rewardXP, rewardCash: mission.rewardCash };
  });
});

// ─── Callable: admin broadcast notification ───────────────────────────────────

export const adminBroadcastNotification = onCall(async (request) => {
  await requireAdmin(request.auth);

  const { title, body, imageUrl, actionLabel, actionRoute } = request.data as {
    title: string; body: string;
    imageUrl?: string; actionLabel?: string; actionRoute?: string;
  };

  if (!title?.trim() || !body?.trim()) {
    throw new HttpsError('invalid-argument', 'title and body are required');
  }

  // Collect all push tokens across all users
  const usersSnap = await db.collection('users').get();
  const allTokens: string[] = [];
  for (const userDoc of usersSnap.docs) {
    const tokens: string[] = userDoc.data().expoPushTokens ?? [];
    allTokens.push(...tokens);
  }

  const data: Record<string, string> = {};
  if (actionRoute) data.route = actionRoute;
  if (actionLabel) data.actionLabel = actionLabel;

  await sendExpoPush(allTokens, { title, body, imageUrl, data });

  // Store broadcast record
  await db.collection('notifications').add({
    title,
    body,
    imageUrl:    imageUrl    ?? null,
    actionLabel: actionLabel ?? null,
    actionRoute: actionRoute ?? null,
    sentAt:      FieldValue.serverTimestamp(),
    sentBy:      request.auth!.uid,
    type:        'broadcast',
    recipientCount: allTokens.length,
  });

  return { success: true, recipientCount: allTokens.length };
});

// ─── Callable: publish new app version ───────────────────────────────────────

export const adminPublishAppVersion = onCall(async (request) => {
  await requireAdmin(request.auth);

  const { versionName, versionCode, downloadUrl, fileSize, changelog } = request.data as {
    versionName: string; versionCode: number;
    downloadUrl: string; fileSize: number; changelog: string;
  };

  if (!versionName?.trim() || !downloadUrl?.trim()) {
    throw new HttpsError('invalid-argument', 'versionName and downloadUrl are required');
  }

  // Mark all previous versions as not latest
  const prev = await db.collection('appVersions').where('isLatest', '==', true).get();
  const batch = db.batch();
  prev.docs.forEach(d => batch.update(d.ref, { isLatest: false }));
  await batch.commit();

  // Create new version record
  await db.collection('appVersions').add({
    versionName,
    versionCode,
    downloadUrl,
    fileSize:    fileSize ?? 0,
    changelog:   changelog ?? '',
    isLatest:    true,
    publishedAt: FieldValue.serverTimestamp(),
    publishedBy: request.auth!.uid,
    downloadCount: 0,
  });

  // Notify all users
  const usersSnap = await db.collection('users').get();
  const allTokens: string[] = [];
  for (const u of usersSnap.docs) allTokens.push(...(u.data().expoPushTokens ?? []));
  await sendExpoPush(allTokens, {
    title: `VaultQuest ${versionName} is here!`,
    body:  changelog?.trim() ? changelog.trim() : 'A new version of VaultQuest is available. Update now!',
    data:  { route: '/download' },
  });

  return { success: true };
});

// ─── Scheduled: daily earnings reminder ──────────────────────────────────────
// Runs at 08:00 CAT (06:00 UTC) every day

export const sendEarningsReminders = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'UTC' },
  async () => {
    const cutoff    = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const vaultsSnap = await db.collectionGroup('vaults')
      .where('status', '==', 'active')
      .get();

    // Group overdue vaults by user
    const userIds = new Set<string>();
    for (const d of vaultsSnap.docs) {
      const lp = d.data().lastPayout?.toDate() as Date | undefined;
      if (lp && lp <= cutoff) userIds.add(d.ref.parent.parent!.id);
    }

    let sent = 0;
    for (const uid of userIds) {
      try {
        await sendToUser(uid, {
          title: 'Earnings Ready to Claim!',
          body:  'Your daily vault earnings are ready. Open VaultQuest to claim them now.',
          data:  { route: '/(tabs)' },
        });
        sent++;
      } catch (e) {
        console.error(`[push] earnings reminder error for ${uid}:`, e);
      }
    }

    console.log(`[earnings reminder] sent to ${sent} users`);
  }
);
