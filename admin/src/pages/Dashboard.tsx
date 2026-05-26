import { useEffect, useState } from 'react';
import {
  collection, collectionGroup, query, where, orderBy,
  limit, getDocs, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Loader } from '../components/Loader';
import { fmtCurrency, fmtDateTime, providerLabel } from '../lib/format';
import type { Withdrawal, Deposit, UserProfile } from '../types';

interface Stats {
  totalUsers: number;
  activeVaults: number;
  totalInvested: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmt: number;
  pendingDeposits: number;
  pendingDepositAmt: number;
}

export default function Dashboard({ adminEmail }: { adminEmail: string | null }) {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [recentW,  setRecentW]  = useState<Withdrawal[]>([]);
  const [recentD,  setRecentD]  = useState<Deposit[]>([]);
  const [recentU,  setRecentU]  = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const [userCount, vaultCount] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collectionGroup(db, 'vaults'), where('status', '==', 'active'))),
      ]);

      const [pendingWSnap, pendingDSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, 'withdrawals'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'deposits'), where('status', '==', 'pending'))),
      ]);

      const pendingWAmt = pendingWSnap.docs.reduce((s, d) => s + (d.data().amount as number || 0), 0);
      const pendingDAmt = pendingDSnap.docs.reduce((s, d) => s + (d.data().amount as number || 0), 0);

      const activeVaultsSnap = await getDocs(
        query(collectionGroup(db, 'vaults'), where('status', '==', 'active'))
      );
      const totalInvested = activeVaultsSnap.docs.reduce((s, d) => s + (d.data().invested as number || 0), 0);

      setStats({
        totalUsers:          userCount.data().count,
        activeVaults:        vaultCount.data().count,
        totalInvested,
        pendingWithdrawals:  pendingWSnap.size,
        pendingWithdrawalAmt: pendingWAmt,
        pendingDeposits:     pendingDSnap.size,
        pendingDepositAmt:   pendingDAmt,
      });

      const [wSnap, dSnap, uSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5))),
      ]);

      setRecentW(wSnap.docs.map(d => ({ id: d.id, uid: d.ref.parent.parent!.id, ...d.data() } as Withdrawal)));
      setRecentD(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Deposit)));
      setRecentU(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    })();
  }, []);

  return (
    <Layout adminEmail={adminEmail} title="Dashboard">
      {loading ? <Loader /> : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{stats!.totalUsers.toLocaleString()}</div>
            </div>
            <div className="stat-card" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
              <div className="stat-icon">📈</div>
              <div className="stat-label">Total Invested</div>
              <div className="stat-value text-gold">{fmtCurrency(stats!.totalInvested)}</div>
              <div className="stat-sub">{stats!.activeVaults} active vaults</div>
            </div>
            <div className="stat-card" style={{ borderColor: stats!.pendingWithdrawals > 0 ? 'rgba(239,68,68,0.25)' : undefined }}>
              <div className="stat-icon">↑</div>
              <div className="stat-label">Pending Withdrawals</div>
              <div className="stat-value" style={{ color: stats!.pendingWithdrawals > 0 ? 'var(--red)' : 'var(--text)' }}>
                {stats!.pendingWithdrawals}
              </div>
              <div className="stat-sub">{fmtCurrency(stats!.pendingWithdrawalAmt)} total</div>
            </div>
            <div className="stat-card" style={{ borderColor: stats!.pendingDeposits > 0 ? 'rgba(34,197,94,0.25)' : undefined }}>
              <div className="stat-icon">↓</div>
              <div className="stat-label">Pending Deposits</div>
              <div className="stat-value" style={{ color: stats!.pendingDeposits > 0 ? 'var(--green)' : 'var(--text)' }}>
                {stats!.pendingDeposits}
              </div>
              <div className="stat-sub">{fmtCurrency(stats!.pendingDepositAmt)} total</div>
            </div>
          </div>

          <div className="section-grid">
            {/* Recent Withdrawals */}
            <div className="card">
              <div className="card-title">Recent Withdrawals</div>
              {recentW.length === 0 ? (
                <p className="text-muted">No withdrawals yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentW.map(w => (
                        <tr key={w.id}>
                          <td className="amount">{fmtCurrency(w.amount)}</td>
                          <td>{providerLabel(w.mobileProvider)}</td>
                          <td><Badge status={w.status} /></td>
                          <td>{fmtDateTime(w.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Deposits */}
            <div className="card">
              <div className="card-title">Recent Deposits</div>
              {recentD.length === 0 ? (
                <p className="text-muted">No deposits yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentD.map(d => (
                        <tr key={d.id}>
                          <td className="primary">{d.userDisplayName}</td>
                          <td className="amount">{fmtCurrency(d.amount)}</td>
                          <td><Badge status={d.status} /></td>
                          <td>{fmtDateTime(d.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="card">
            <div className="card-title">Recently Joined</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Level</th>
                    <th>Balance</th>
                    <th>Referrals</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentU.map(u => (
                    <tr key={u.uid}>
                      <td>
                        <div className="gap-12">
                          <div className="avatar">{u.displayName.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div className="primary" style={{ color: 'var(--text)', fontWeight: 600 }}>{u.displayName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>Lv. {u.level}</td>
                      <td className="amount">{fmtCurrency(u.walletBalance)}</td>
                      <td>{u.totalReferrals}</td>
                      <td>{fmtDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
