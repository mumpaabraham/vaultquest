# VaultQuest Admin Dashboard

Standalone React + Vite web app for managing the VaultQuest platform.

## Setup

```bash
cd admin
npm install
npm run dev        # runs on http://localhost:3001
npm run build      # production build → admin/dist/
```

## First-time admin setup

1. Create a Firebase Auth account for the admin user (email/password).
2. In Firestore, create the document:
   ```
   Collection: admins
   Document ID: <admin user's Firebase UID>
   Fields: { email: "admin@example.com", createdAt: <timestamp> }
   ```
3. The admin user can now sign into the dashboard.

## Seed default settings

In Firestore console, create these documents if they don't exist:

**`settings/withdrawals`**
```json
{
  "chargePercent": 5,
  "chargeFlat": 1.00,
  "minAmount": 10,
  "maxAmount": 500,
  "dailyLimitCount": 3,
  "dailyLimitAmount": 500
}
```

**`settings/app`**
```json
{
  "maintenanceMode": false,
  "maintenanceMessage": "We are performing maintenance. Please check back shortly.",
  "referralBonusL1": 10,
  "referralBonusL2": 2,
  "referralBonusL3": 1
}
```

## Deploy functions

After adding the new admin functions:
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

## Firestore indexes required

For collectionGroup queries on `withdrawals` and `vaults`, you may need to
create composite indexes. Firebase will show a link in the console error when
an index is needed — click it to create automatically.

Required indexes:
- Collection group: `withdrawals` — field: `createdAt` DESC
- Collection group: `vaults` — fields: `status` ASC, `startDate` DESC

## Pages

| Page | Description |
|------|-------------|
| Dashboard | Stats overview: users, invested, pending actions |
| Users | All users, search, balance adjust, vault view |
| Deposits | Pending/approved/rejected deposit requests |
| Withdrawals | Pending/approved/rejected withdrawal requests |
| Packages | Create & manage investment packages |
| Investments | All user vaults with progress tracking |
| Settings | Withdrawal fees, app config, spin wheel segments |
