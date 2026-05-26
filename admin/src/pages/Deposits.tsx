import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fns } from '../firebase';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';
import { fmtCurrency, fmtDateTime, providerLabel } from '../lib/format';
import type { Deposit, Package, UserProfile } from '../types';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export default function Deposits({ adminEmail }: { adminEmail: string | null }) {
  const [rows,    setRows]    = useState<Deposit[]>([]);
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>('pending');
  const [search,  setSearch]  = useState('');
  const [selected, setSelected] = useState<Deposit | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [note,    setNote]    = useState('');
  const [acting,  setActing]  = useState(false);

  const [form, setForm] = useState({
    uid: '', amount: '', mobileProvider: 'airtel',
    mobileNumber: '', payerName: '', packageId: '',
  });

  useEffect(() => {
    // Real-time deposits listener
    const unsub = onSnapshot(
      query(collection(db, 'deposits'), orderBy('createdAt', 'desc')),
      snap => {
        setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deposit)));
        setLoading(false);
      }
    );

    // One-time fetches for users + packages (don't need real-time)
    Promise.all([
      getDocs(query(collection(db, 'users'), orderBy('displayName'))),
      getDocs(query(collection(db, 'packages'), orderBy('price'))),
    ]).then(([uSnap, pSnap]) => {
      setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setPackages(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Package)));
    });

    return () => unsub();
  }, []);

  const act = async (action: 'approve' | 'reject') => {
    if (!selected || acting) return;
    setActing(true);
    try {
      await httpsCallable(fns, 'adminApproveDeposit')({
        depositId: selected.id,
        uid: selected.uid,
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

  const createDeposit = async () => {
    if (!form.uid || !form.amount || !form.mobileNumber || !form.payerName) return;
    const user = users.find(u => u.uid === form.uid);
    const pkg  = packages.find(p => p.id === form.packageId);
    if (!user) return;
    setActing(true);
    try {
      await addDoc(collection(db, 'deposits'), {
        uid: form.uid,
        userDisplayName: user.displayName,
        amount: parseFloat(form.amount),
        mobileProvider: form.mobileProvider,
        mobileNumber: form.mobileNumber,
        payerName: form.payerName,
        packageId: pkg?.id ?? null,
        packageName: pkg?.name ?? null,
        packageImageUrl: pkg?.imageUrl ?? null,
        status: 'pending',
        createdAt: serverTimestamp(),
        processedAt: null,
        processedBy: null,
        note: null,
      });
      setShowCreate(false);
      setForm({ uid: '', amount: '', mobileProvider: 'airtel', mobileNumber: '', payerName: '', packageId: '' });
    } catch (e: any) {
      alert(e?.message ?? 'Failed to create deposit');
    } finally {
      setActing(false);
    }
  };

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.userDisplayName.toLowerCase().includes(search.toLowerCase()) &&
        !(r.payerName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = rows.filter(r => r.status === 'pending');
  const selectedPkg = packages.find(p => p.id === form.packageId);

  return (
    <Layout
      adminEmail={adminEmail}
      title="Deposits"
      actions={
        <div className="gap-8">
          {pending.length > 0 && (
            <span className="topbar-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'rgba(34,197,94,0.3)' }}>
              {pending.length} pending
            </span>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            + Add Deposit
          </button>
        </div>
      }
    >
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name or payer…"
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
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Phone</th>
                  <th>Payer Name</th>
                  <th>Investment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No records.</td></tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td className="primary">{d.userDisplayName}</td>
                    <td>
                      {d.packageImageUrl || d.packageName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {d.packageImageUrl ? (
                            <img src={d.packageImageUrl} alt={d.packageName ?? ''} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 20 }}>{packages.find(p => p.id === d.packageId)?.icon ?? '📦'}</span>
                          )}
                          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{d.packageName}</span>
                        </div>
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                          border: '1px solid rgba(139,92,246,0.25)',
                        }}>
                          Top Up
                        </span>
                      )}
                    </td>
                    <td className="amount">{fmtCurrency(d.amount)}</td>
                    <td>{providerLabel(d.mobileProvider)}</td>
                    <td className="mono">{d.mobileNumber}</td>
                    <td>{d.payerName}</td>
                    {/* Investment status */}
                    <td>
                      {d.vaultId ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: 'var(--green-dim)', color: 'var(--green)',
                          border: '1px solid rgba(34,197,94,0.3)',
                        }}>
                          ✓ Active
                        </span>
                      ) : d.packageName && d.status === 'approved' ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: 'rgba(239,68,68,0.1)', color: 'var(--red)',
                          border: '1px solid rgba(239,68,68,0.25)',
                        }}>
                          Not created
                        </span>
                      ) : d.packageName ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pending</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td><Badge status={d.status} /></td>
                    <td>{fmtDateTime(d.createdAt)}</td>
                    <td>
                      {d.status === 'pending' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => { setSelected(d); setNote(''); }}>
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

      {/* Review modal */}
      {selected && (
        <Modal
          title="Review Deposit"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={acting} onClick={() => act('reject')}>
                {acting ? '…' : '✕ Reject'}
              </button>
              <button className="btn btn-success" disabled={acting} onClick={() => act('approve')}>
                {acting ? '…' : '✓ Approve & Credit'}
              </button>
            </>
          }
        >
          {(() => {
            const dpkg = selected as any;
            return dpkg.packageName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', marginBottom: 4 }}>
                {dpkg.packageImageUrl ? (
                  <img src={dpkg.packageImageUrl} alt={dpkg.packageName} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border-gold)' }} />
                ) : (
                  <span style={{ fontSize: 36 }}>{packages.find(p => p.id === dpkg.packageId)?.icon ?? '📦'}</span>
                )}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Package</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)' }}>{dpkg.packageName}</div>
                </div>
              </div>
            ) : null;
          })()}
          <div className="info-row"><span className="info-key">User</span><span className="info-val">{selected.userDisplayName}</span></div>
          <div className="info-row"><span className="info-key">Amount</span><span className="info-val text-gold">{fmtCurrency(selected.amount)}</span></div>
          <div className="info-row"><span className="info-key">Provider</span><span className="info-val">{providerLabel(selected.mobileProvider)}</span></div>
          <div className="info-row"><span className="info-key">Phone</span><span className="info-val mono">{selected.mobileNumber}</span></div>
          <div className="info-row"><span className="info-key">Payer Name</span><span className="info-val">{selected.payerName}</span></div>
          <div className="info-row"><span className="info-key">Submitted</span><span className="info-val">{fmtDateTime(selected.createdAt)}</span></div>
          <hr className="divider" />
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-input" placeholder="Admin note…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <p className="form-hint">
            {selected.packageName
              ? `✓ Approving will credit ${fmtCurrency(selected.amount)} to the wallet and immediately activate the ${selected.packageName} vault. Net wallet change: ${fmtCurrency(selected.amount - (packages.find(p => p.id === selected.packageId)?.price ?? selected.amount))}.`
              : `✓ Approving will credit ${fmtCurrency(selected.amount)} to the user's wallet.`
            }
          </p>
        </Modal>
      )}

      {/* Create deposit modal */}
      {showCreate && (
        <Modal
          title="Add Deposit"
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={acting || !form.uid || !form.amount || !form.mobileNumber || !form.payerName}
                onClick={createDeposit}
              >
                {acting ? 'Creating…' : 'Create Pending Deposit'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">User</label>
            <select className="form-select" value={form.uid} onChange={e => setForm(f => ({ ...f, uid: e.target.value }))}>
              <option value="">Select user…</option>
              {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>)}
            </select>
          </div>

          {/* Package selector */}
          <div className="form-group">
            <label className="form-label">Investment Package (optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, packageId: '' }))}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: `2px solid ${!form.packageId ? 'var(--gold)' : 'var(--border)'}`,
                  background: !form.packageId ? 'var(--gold-dim)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--text-2)',
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 22 }}>—</span>
                <span>None</span>
              </button>
              {packages.filter(p => p.active).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, packageId: p.id, amount: String(p.price) }))}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `2px solid ${form.packageId === p.id ? p.color : 'var(--border)'}`,
                    background: form.packageId === p.id ? `${p.color}18` : 'var(--surface-2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{p.icon}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtCurrency(p.price)}</span>
                </button>
              ))}
            </div>
            {selectedPkg && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Amount pre-filled with package price. You can adjust it below.
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (ZMW)</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select className="form-select" value={form.mobileProvider} onChange={e => setForm(f => ({ ...f, mobileProvider: e.target.value }))}>
                <option value="airtel">Airtel Money</option>
                <option value="mtn">MTN Mobile Money</option>
                <option value="zamtel">Zamtel Kwacha</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="097XXXXXXX" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Payer Account Name</label>
              <input className="form-input" placeholder="Name on sender's account…" value={form.payerName} onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
