# VaultQuest

Investment gaming app — PLAY. EARN. GROW.

Built with Expo (React Native) targeting **Android** and **Web** from a single codebase, with Firebase for auth, Firestore database, and storage.

## Currency

All monetary values are displayed in **K (ZMW — Zambian Kwacha)**.

## Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project named `VaultQuest`
3. Enable **Authentication** → Email/Password sign-in
4. Enable **Firestore Database** (start in test mode, add rules later)
5. Enable **Storage**
6. Copy your web app config and replace the values in `src/firebase/config.ts`

```ts
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App

**Web browser:**
```bash
npm run web
```

**Android (requires Android Studio + emulator or physical device):**
```bash
npm run android
```

**Expo Go (scan QR with phone):**
```bash
npm start
```

## Building for Production

**Android APK/AAB** (requires EAS account):
```bash
npm run build:android
```

**Web static export:**
```bash
npm run build:web
```

## Investment Tiers

| Tier | Investment | Daily Earnings | Duration |
|------|-----------|----------------|----------|
| Bronze | K5 | K0.30/day | 30 days |
| Silver | K20 | K1.58/day | 30 days |
| Gold | K50 | K4.00/day | 30 days |
| Platinum | K100 | K8.04/day | 30 days |

## Features

- **Home** — Dashboard with daily earnings, countdown timer, daily chest, level progress
- **Deposit** — Choose investment tier, invest from wallet balance
- **Lucky Spin** — Daily free spin wheel with XP, cash, and boost prizes
- **Missions** — Daily, weekly, and achievement missions for XP rewards
- **Vaults** — Track active and completed investments
- **Refer & Earn** — Referral code sharing with 3-level commission (10% / 2% / 1%)
- **Leaderboard** — Global player rankings by level and XP
- **Profile** — Account details, stats, settings
