import { useEffect, useState, useCallback } from 'react';
import {
  collection, collectionGroup, onSnapshot, getDocs, getDoc,
  doc, query, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Layout } from '../components/Layout';

interface PastSpin {
  id: string;
  uid: string;
  displayName: string;
  label: string;
  type: string;
  value: number;
  betAmount: number;
  actualWin: number;
  timestamp: Timestamp;
}

interface LiveSpin {
  uid: string;
  displayName: string;
  betAmount: number;
  status: 'spinning' | 'completed';
  label?: string;
  type?: string;
  cashWin?: number;
  walletDelta?: number;
  updatedAt: Timestamp;
}

const STALE_MS  = 10 * 60 * 1000; // hide after 10 min
const TYPE_COLOR: Record<string, string> = {
  cash: 'var(--gold)', xp: '#a78bfa', boost: '#38bdf8', spin_bonus: '#34d399',
};

function timeAgo(ts: Timestamp): string {
  const sec = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (sec < 10)  return 'just now';
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 120) return '1m ago';
  return `${Math.floor(sec / 60)}m ago`;
}

function fmtK(n: number): string {
  return `K${Math.abs(n).toFixed(2)}`;
}

export default function LiveSpins({ adminEmail }: { adminEmail: string | null }) {
  const [spins,       setSpins]       = useState<Record<string, LiveSpin>>({});
  const [_tick,       setTick]        = useState(0);
  const [pastSpins,   setPastSpins]   = useState<PastSpin[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [search,      setSearch]      = useState('');

  const loadHistory = useCallback(async () => {
    setPastLoading(true);
    try {
      const q    = query(collectionGroup(db, 'spinHistory'), orderBy('timestamp', 'desc'), limit(300));
      const snap = await getDocs(q);

      const uids = [...new Set(snap.docs.map(d => d.ref.parent.parent!.id))];
      const userMap: Record<string, string> = {};
      await Promise.all(uids.map(async uid => {
        const us = await getDoc(doc(db, 'users', uid));
        userMap[uid] = us.exists() ? (us.data().displayName ?? uid) : uid;
      }));

      setPastSpins(snap.docs.map(d => {
        const uid = d.ref.parent.parent!.id;
        const data = d.data();
        return {
          id:          d.id,
          uid,
          displayName: userMap[uid] ?? uid,
          label:       data.label       ?? '—',
          type:        data.type        ?? '—',
          value:       data.value       ?? 0,
          betAmount:   data.betAmount   ?? 0,
          actualWin:   data.actualWin   ?? 0,
          timestamp:   data.timestamp   as Timestamp,
        };
      }));
    } finally {
      setPastLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'liveSpins'), snap => {
      const data: Record<string, LiveSpin> = {};
      snap.docs.forEach(d => { data[d.id] = d.data() as LiveSpin; });
      setSpins(data);
    });
    return () => unsub();
  }, []);

  // Tick every 5 s so "X ago" labels + stale filtering stays fresh
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const entries = Object.values(spins)
    .filter(s => now - s.updatedAt.toDate().getTime() < STALE_MS)
    .sort((a, b) => b.updatedAt.toDate().getTime() - a.updatedAt.toDate().getTime());

  const live    = entries.filter(e => e.status === 'spinning');
  const recent  = entries.filter(e => e.status === 'completed');

  const totalBets = entries.reduce((s, e) => s + e.betAmount, 0);
  const totalWins = recent.reduce((s, e) => s + (e.cashWin ?? 0), 0);
  const houseNet  = totalBets - totalWins;

  return (
    <Layout adminEmail={adminEmail} title="Live Spins">

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          {
            label: 'Live Now',
            value: live.length,
            color: live.length > 0 ? 'var(--green)' : 'var(--text-muted)',
            pulse: live.length > 0,
          },
          { label: 'Recent (10 min)', value: recent.length, color: 'var(--text-2)'  },
          { label: 'Total Bets',      value: `K${totalBets.toFixed(2)}`, color: 'var(--gold)' },
          { label: 'House Net',       value: `${houseNet >= 0 ? '+' : ''}K${houseNet.toFixed(2)}`,
            color: houseNet >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {s.pulse && (
                <span style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: 'var(--green)',
                  boxShadow: '0 0 0 3px rgba(34,197,94,0.25)',
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
              )}
              <span style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live spinners ─────────────────────────────────────────────── */}
      {live.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(34,197,94,0.3)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              backgroundColor: 'var(--green)', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(34,197,94,0.25)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }} />
            <strong style={{ color: 'var(--green)', fontSize: 14 }}>Spinning right now — {live.length} user{live.length !== 1 ? 's' : ''}</strong>
          </div>
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Bet</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {live.map(s => (
                  <tr key={s.uid}>
                    <td className="primary">{s.displayName}</td>
                    <td>
                      {s.betAmount > 0
                        ? <span style={{ color: 'var(--gold)', fontWeight: 700 }}>K{s.betAmount.toFixed(2)}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Free</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{timeAgo(s.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent completed ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <strong style={{ fontSize: 14 }}>Recent Spin Results (last 10 min)</strong>
          {recent.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>No recent activity</span>
          )}
        </div>
        {recent.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Segment</th>
                  <th>Type</th>
                  <th>Bet</th>
                  <th>Win</th>
                  <th>Net</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(s => {
                  const net       = s.walletDelta ?? 0;
                  const isProfit  = net >= 0;
                  const isFree    = s.betAmount === 0;
                  return (
                    <tr key={s.uid + s.updatedAt.toMillis()}>
                      <td className="primary">{s.displayName}</td>
                      <td>
                        <span style={{
                          color: TYPE_COLOR[s.type ?? 'cash'] ?? 'var(--text-2)',
                          fontWeight: 700,
                        }}>
                          {s.label ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {s.type ?? '—'}
                      </td>
                      <td>
                        {isFree
                          ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Free</span>
                          : <span style={{ color: 'var(--gold)' }}>{fmtK(s.betAmount)}</span>
                        }
                      </td>
                      <td>
                        {s.cashWin != null && s.cashWin > 0
                          ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtK(s.cashWin)}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td>
                        {isFree
                          ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          : <span style={{
                              fontWeight: 700,
                              color: isProfit ? 'var(--green)' : 'var(--red)',
                            }}>
                              {isProfit ? '+' : ''}{net.toFixed(2)}
                            </span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{timeAgo(s.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Full spin history ─────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, marginTop: 28 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14, flex: 1 }}>Spin History (last 300)</strong>
          <input
            type="text"
            placeholder="Search by user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: 6, padding: '5px 10px', fontSize: 13, width: 180,
            }}
          />
          <button
            className="btn"
            onClick={loadHistory}
            disabled={pastLoading}
            style={{ padding: '5px 14px', fontSize: 12 }}
          >
            {pastLoading ? '…' : 'Refresh'}
          </button>
        </div>

        {pastLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Segment</th>
                  <th>Type</th>
                  <th>Bet</th>
                  <th>Win</th>
                  <th>Net</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {pastSpins
                  .filter(s => !search || s.displayName.toLowerCase().includes(search.toLowerCase()))
                  .map(s => {
                    const isFree   = s.betAmount === 0;
                    const net      = parseFloat((s.actualWin - (isFree ? 0 : s.betAmount)).toFixed(2));
                    const isProfit = net >= 0;
                    return (
                      <tr key={s.uid + s.id}>
                        <td className="primary">{s.displayName}</td>
                        <td>
                          <span style={{ color: TYPE_COLOR[s.type] ?? 'var(--text-2)', fontWeight: 700 }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s.type}</td>
                        <td>
                          {isFree
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Free</span>
                            : <span style={{ color: 'var(--gold)' }}>{fmtK(s.betAmount)}</span>
                          }
                        </td>
                        <td>
                          {s.actualWin > 0
                            ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtK(s.actualWin)}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          }
                        </td>
                        <td>
                          {isFree
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            : <span style={{ fontWeight: 700, color: isProfit ? 'var(--green)' : 'var(--red)' }}>
                                {isProfit ? '+' : ''}{net.toFixed(2)}
                              </span>
                          }
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {s.timestamp ? timeAgo(s.timestamp) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {pastSpins.filter(s => !search || s.displayName.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No results</div>
            )}
          </div>
        )}
      </div>

      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 6px rgba(34,197,94,0.08); }
        }
      `}</style>
    </Layout>
  );
}
