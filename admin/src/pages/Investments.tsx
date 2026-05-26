import { useEffect, useState } from 'react';
import { collectionGroup, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Loader } from '../components/Loader';
import { fmtCurrency, fmtDate } from '../lib/format';
import type { Vault } from '../types';

type Filter = 'active' | 'completed' | 'all';

interface VaultRow extends Vault {
  daysLeft: number;
  progressPct: number;
}

export default function Investments({ adminEmail }: { adminEmail: string | null }) {
  const [rows,    setRows]    = useState<VaultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>('active');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    (async () => {
      const snap = await getDocs(
        query(collectionGroup(db, 'vaults'), orderBy('startDate', 'desc'))
      );
      const now = Date.now();
      setRows(snap.docs.map(d => {
        const data  = d.data();
        const uid   = d.ref.parent.parent!.id;
        const end   = data.endDate?.toDate?.()?.getTime()   ?? now;
        const start = data.startDate?.toDate?.()?.getTime() ?? now;
        const daysLeft    = Math.max(0, Math.ceil((end - now) / 86400000));
        const totalDays   = data.durationDays ?? 1;
        const elapsed     = Math.min(totalDays, Math.floor((now - start) / 86400000));
        const progressPct = Math.round((elapsed / totalDays) * 100);
        return { id: d.id, uid, daysLeft, progressPct, ...data } as VaultRow;
      }));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    const q = search.toLowerCase();
    if (q && !r.tierName.toLowerCase().includes(q) &&
        !r.uid.includes(q) &&
        !(r.userDisplayName ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  const activeRows  = rows.filter(r => r.status === 'active');
  const totalInvested = activeRows.reduce((s, r) => s + r.invested, 0);
  const totalEarned   = rows.reduce((s, r) => s + r.totalEarned, 0);
  const totalActive   = activeRows.length;

  return (
    <Layout
      adminEmail={adminEmail}
      title="Investments"
      actions={
        <div className="gap-8">
          <span className="topbar-badge">{totalActive} active</span>
          <span className="topbar-badge">{fmtCurrency(totalInvested)} invested</span>
          <span className="topbar-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'rgba(34,197,94,0.3)' }}>
            {fmtCurrency(totalEarned)} earned out
          </span>
        </div>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by user, package or UID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {(['active', 'completed', 'all'] as Filter[]).map(f => (
            <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Package</th>
                  <th>Source</th>
                  <th>Invested</th>
                  <th>Daily</th>
                  <th>Total Earned</th>
                  <th>Progress</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No records.
                    </td>
                  </tr>
                )}
                {filtered.map(v => (
                  <tr key={v.id}>
                    {/* User */}
                    <td>
                      {v.userDisplayName ? (
                        <div>
                          <div className="primary">{v.userDisplayName}</div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {v.uid.slice(0, 12)}…
                          </div>
                        </div>
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {v.uid.slice(0, 14)}…
                        </span>
                      )}
                    </td>

                    {/* Package */}
                    <td className="primary">{v.tierName}</td>

                    {/* Source */}
                    <td>
                      {v.source === 'deposit' ? (
                        <div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                            background: 'rgba(59,130,246,0.12)', color: 'var(--blue)',
                            border: '1px solid rgba(59,130,246,0.25)',
                          }}>
                            Via Deposit
                          </span>
                          {v.depositId && (
                            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                              {v.depositId.slice(0, 10)}…
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                          border: '1px solid rgba(124,58,237,0.25)',
                        }}>
                          Manual
                        </span>
                      )}
                    </td>

                    {/* Amounts */}
                    <td className="amount">{fmtCurrency(v.invested)}</td>
                    <td>{fmtCurrency(v.dailyEarnings)}</td>
                    <td className="amount">{fmtCurrency(v.totalEarned)}</td>

                    {/* Progress */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                          <div style={{
                            width: `${v.progressPct}%`, height: '100%', borderRadius: 3,
                            background: v.status === 'active' ? 'var(--gold)' : 'var(--green)',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 30, textAlign: 'right' }}>
                          {v.progressPct}%
                        </span>
                      </div>
                      {v.status === 'active' && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {v.daysLeft}d left
                        </div>
                      )}
                    </td>

                    <td>{fmtDate(v.endDate)}</td>
                    <td><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
