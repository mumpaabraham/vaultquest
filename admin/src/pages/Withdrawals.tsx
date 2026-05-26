import { useEffect, useState } from 'react';
import { collectionGroup, query, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fns } from '../firebase';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';
import { fmtCurrency, fmtDateTime, providerLabel } from '../lib/format';
import type { Withdrawal } from '../types';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export default function Withdrawals({ adminEmail }: { adminEmail: string | null }) {
  const [rows,    setRows]    = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>('pending');
  const [search,  setSearch]  = useState('');
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [note,    setNote]    = useState('');
  const [acting,  setActing]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collectionGroup(db, 'withdrawals'), orderBy('createdAt', 'desc')),
      snap => {
        setRows(snap.docs.map(d => ({
          id: d.id,
          uid: d.ref.parent.parent!.id,
          ...d.data(),
        } as Withdrawal)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const act = async (action: 'approve' | 'reject') => {
    if (!selected || acting) return;
    setActing(true);
    try {
      await httpsCallable(fns, 'adminApproveWithdrawal')({
        uid: selected.uid,
        withdrawalId: selected.id,
        action,
        note: note || null,
      });
      setSelected(null);
    } catch (e: any) {
      alert(e?.message ?? 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.mobileNumber.includes(search) && !(r.userDisplayName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = rows.filter(r => r.status === 'pending');

  return (
    <Layout
      adminEmail={adminEmail}
      title="Withdrawals"
      actions={
        pending.length > 0
          ? <span className="topbar-badge" style={{ background: 'var(--red-dim)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>
              {pending.length} pending
            </span>
          : undefined
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by phone or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {(['pending','approved','rejected','all'] as Filter[]).map(f => (
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
                  <th>Amount</th>
                  <th>Fee</th>
                  <th>Net Payout</th>
                  <th>Provider</th>
                  <th>Phone</th>
                  <th>Account Name</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No records.</td></tr>
                )}
                {filtered.map(w => (
                  <tr key={w.id}>
                    <td className="primary">{w.userDisplayName ?? w.uid.slice(0, 8)}</td>
                    <td className="amount">{fmtCurrency(w.amount)}</td>
                    <td style={{ color: 'var(--red)' }}>{fmtCurrency(w.charge)}</td>
                    <td className="amount">{fmtCurrency(w.netAmount)}</td>
                    <td>{providerLabel(w.mobileProvider)}</td>
                    <td className="mono">{w.mobileNumber}</td>
                    <td>{w.accountName ?? '—'}</td>
                    <td><Badge status={w.status} /></td>
                    <td>{fmtDateTime(w.createdAt)}</td>
                    <td>
                      {w.status === 'pending' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => { setSelected(w); setNote(''); }}>
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal
          title="Review Withdrawal"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={acting} onClick={() => act('reject')}>
                {acting ? '…' : '✕ Reject'}
              </button>
              <button className="btn btn-success" disabled={acting} onClick={() => act('approve')}>
                {acting ? '…' : '✓ Approve'}
              </button>
            </>
          }
        >
          <div className="info-row"><span className="info-key">User</span><span className="info-val">{selected.userDisplayName ?? selected.uid}</span></div>
          <div className="info-row"><span className="info-key">Amount</span><span className="info-val text-gold">{fmtCurrency(selected.amount)}</span></div>
          <div className="info-row"><span className="info-key">Fee</span><span className="info-val text-red">{fmtCurrency(selected.charge)}</span></div>
          <div className="info-row"><span className="info-key">Net payout</span><span className="info-val text-gold">{fmtCurrency(selected.netAmount)}</span></div>
          <div className="info-row"><span className="info-key">Provider</span><span className="info-val">{providerLabel(selected.mobileProvider)}</span></div>
          <div className="info-row"><span className="info-key">Phone</span><span className="info-val mono">{selected.mobileNumber}</span></div>
          {selected.accountName && (
            <div className="info-row"><span className="info-key">Account Name</span><span className="info-val">{selected.accountName}</span></div>
          )}
          <div className="info-row"><span className="info-key">Requested</span><span className="info-val">{fmtDateTime(selected.createdAt)}</span></div>
          <hr className="divider" />
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-input" placeholder="e.g. Payment sent via Airtel ref: 123456" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <p className="form-hint">
            ⚠ Approving marks this withdrawal as paid. Rejecting will refund the amount back to the user's wallet.
          </p>
        </Modal>
      )}
    </Layout>
  );
}
