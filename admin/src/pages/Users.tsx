import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, getDocs, doc, updateDoc,
  collectionGroup, where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fns } from '../firebase';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';
import { fmtCurrency, fmtDate, fmtDateTime } from '../lib/format';
import type { UserProfile, Vault } from '../types';

interface UserWithVaults extends UserProfile {
  activeVaults: number;
}

export default function Users({ adminEmail }: { adminEmail: string | null }) {
  const [users,   setUsers]   = useState<UserWithVaults[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [adjustAmt, setAdjustAmt] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));

    const vaultCounts: Record<string, number> = {};
    const vSnap = await getDocs(query(collectionGroup(db, 'vaults'), where('status', '==', 'active')));
    vSnap.docs.forEach(d => {
      const uid = d.ref.parent.parent!.id;
      vaultCounts[uid] = (vaultCounts[uid] || 0) + 1;
    });

    setUsers(snap.docs.map(d => ({
      uid: d.id,
      activeVaults: vaultCounts[d.id] || 0,
      ...d.data(),
    } as UserWithVaults)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (u: UserProfile) => {
    setSelected(u);
    setAdjustAmt('');
    setAdjustNote('');
    const vSnap = await getDocs(
      query(collection(db, 'users', u.uid, 'vaults'), orderBy('startDate', 'desc'))
    );
    setUserVaults(vSnap.docs.map(d => ({ id: d.id, uid: u.uid, ...d.data() } as Vault)));
  };

  const handleAdjust = async () => {
    if (!selected || !adjustAmt) return;
    const amt = parseFloat(adjustAmt);
    if (isNaN(amt)) return;
    setAdjusting(true);
    try {
      await httpsCallable(fns, 'adminAdjustBalance')({
        uid: selected.uid,
        amount: amt,
        note: adjustNote || 'Admin balance adjustment',
      });
      await load();
      const updated = users.find(u => u.uid === selected.uid);
      if (updated) setSelected({ ...updated, walletBalance: updated.walletBalance + amt });
      setAdjustAmt('');
      setAdjustNote('');
    } catch (e: any) {
      alert(e?.message ?? 'Failed to adjust balance');
    } finally {
      setAdjusting(false);
    }
  };

  const toggleSuspend = async (u: UserProfile) => {
    if (!confirm(`${u.suspended ? 'Activate' : 'Suspend'} ${u.displayName}?`)) return;
    await updateDoc(doc(db, 'users', u.uid), { suspended: !u.suspended });
    setUsers(prev => prev.map(p => p.uid === u.uid ? { ...p, suspended: !p.suspended } : p));
    if (selected?.uid === u.uid) setSelected(s => s && { ...s, suspended: !s.suspended });
  };

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      adminEmail={adminEmail}
      title="Users"
      actions={<span className="topbar-badge">{users.length} total</span>}
    >
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Level</th>
                  <th>Balance</th>
                  <th>Active Vaults</th>
                  <th>Referrals</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.uid} style={{ cursor: 'pointer' }} onClick={() => openDetail(u)}>
                    <td>
                      <div className="gap-12">
                        <div className="avatar">{u.displayName.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ color: 'var(--text)', fontWeight: 600 }}>{u.displayName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>Lv. {u.level}</td>
                    <td className="amount">{fmtCurrency(u.walletBalance)}</td>
                    <td>{u.activeVaults}</td>
                    <td>{u.totalReferrals}</td>
                    <td>
                      {u.suspended
                        ? <Badge status="rejected" text="SUSPENDED" />
                        : <Badge status="active"   text="ACTIVE" />}
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className={`btn btn-sm ${u.suspended ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => toggleSuspend(u)}
                      >
                        {u.suspended ? 'Activate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User detail modal */}
      {selected && (
        <Modal title="User Details" onClose={() => setSelected(null)} size="lg">
          <div className="section-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                  {selected.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.displayName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selected.email}</div>
                </div>
              </div>
              <div className="info-row">
                <span className="info-key">UID</span>
                <span className="info-val mono" style={{ fontSize: 11 }}>{selected.uid}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Level</span>
                <span className="info-val">Lv. {selected.level} ({selected.xp} XP)</span>
              </div>
              <div className="info-row">
                <span className="info-key">Balance</span>
                <span className="info-val text-gold">{fmtCurrency(selected.walletBalance)}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Referral Code</span>
                <span className="info-val">{selected.referralCode}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Referrals</span>
                <span className="info-val">{selected.totalReferrals} (earned {fmtCurrency(selected.totalReferralEarnings)})</span>
              </div>
              {selected.mobileMoney && (
                <div className="info-row">
                  <span className="info-key">Mobile Money</span>
                  <span className="info-val">{selected.mobileMoney.provider} · {selected.mobileMoney.number}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-key">Joined</span>
                <span className="info-val">{fmtDateTime(selected.createdAt)}</span>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Adjust Balance</div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Amount (positive = add, negative = deduct)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 50.00 or -20.00"
                  value={adjustAmt}
                  onChange={e => setAdjustAmt(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Note</label>
                <input
                  className="form-input"
                  placeholder="Reason for adjustment"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={!adjustAmt || adjusting}
                onClick={handleAdjust}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {adjusting ? 'Adjusting…' : 'Apply Adjustment'}
              </button>
            </div>
          </div>

          {/* Vaults */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Vaults ({userVaults.length})</div>
            {userVaults.length === 0 ? (
              <p className="text-muted">No vaults.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Package</th><th>Invested</th><th>Daily</th><th>Earned</th><th>End Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {userVaults.map(v => (
                      <tr key={v.id}>
                        <td className="primary">{v.tierName}</td>
                        <td className="amount">{fmtCurrency(v.invested)}</td>
                        <td>{fmtCurrency(v.dailyEarnings)}</td>
                        <td className="amount">{fmtCurrency(v.totalEarned)}</td>
                        <td>{fmtDate(v.endDate)}</td>
                        <td><Badge status={v.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Layout>
  );
}
