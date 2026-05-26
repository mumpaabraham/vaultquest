import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Layout } from '../components/Layout';
import { Loader } from '../components/Loader';
import type { WithdrawalSettings, AppSettings, SpinSegment, PaymentAccounts } from '../types';

const DEFAULT_WITHDRAWAL: WithdrawalSettings = {
  chargePercent: 5, chargeFlat: 1,
  minAmount: 10, maxAmount: 500,
  dailyLimitCount: 3, dailyLimitAmount: 500,
};

const DEFAULT_APP: AppSettings = {
  maintenanceMode: false,
  maintenanceMessage: 'We are performing maintenance. Please check back shortly.',
  referralBonusL1: 10, referralBonusL2: 2, referralBonusL3: 1,
};

const DEFAULT_PAYMENTS: PaymentAccounts = {
  mtn:    { number: '', name: '' },
  airtel: { number: '', name: '' },
  zamtel: { number: '', name: '' },
};

const DEFAULT_SPIN: SpinSegment[] = [
  { label: 'K2.00',   type: 'cash',   value: 2,   multiplier: 2,   weight: 5,  color: '#f59e0b', textColor: '#1a0a00' },
  { label: '30 XP',   type: 'xp',     value: 30,                   weight: 10, color: '#92400e', textColor: '#fde68a' },
  { label: 'K0.50',   type: 'cash',   value: 0.5, multiplier: 0.5, weight: 15, color: '#fbbf24', textColor: '#1a0a00' },
  { label: '2× Boost',type: 'boost',  value: 2,                    weight: 8,  color: '#78350f', textColor: '#fde68a', duration: 60 },
  { label: '50 XP',   type: 'xp',     value: 50,                   weight: 8,  color: '#d97706', textColor: '#1a0a00' },
  { label: 'K0.10',   type: 'cash',   value: 0.1, multiplier: 0.1, weight: 30, color: '#b45309', textColor: '#fde68a' },
  { label: 'K1.00',   type: 'cash',   value: 1,   multiplier: 1,   weight: 15, color: '#fde68a', textColor: '#1a0a00' },
  { label: '10 XP',   type: 'xp',     value: 10,                   weight: 9,  color: '#a16207', textColor: '#fde68a' },
];

type Tab = 'withdrawal' | 'app' | 'spin' | 'payments';

export default function Settings({ adminEmail }: { adminEmail: string | null }) {
  const [tab,      setTab]      = useState<Tab>('withdrawal');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const [wSettings,    setWSettings]    = useState<WithdrawalSettings>(DEFAULT_WITHDRAWAL);
  const [appSettings,  setAppSettings]  = useState<AppSettings>(DEFAULT_APP);
  const [spinSegs,     setSpinSegs]     = useState<SpinSegment[]>(DEFAULT_SPIN);
  const [payAccounts,  setPayAccounts]  = useState<PaymentAccounts>(DEFAULT_PAYMENTS);

  useEffect(() => {
    (async () => {
      const [wSnap, aSnap, sSnap, pSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'withdrawals')),
        getDoc(doc(db, 'settings', 'app')),
        getDoc(doc(db, 'settings', 'spinWheel')),
        getDoc(doc(db, 'settings', 'paymentAccounts')),
      ]);
      if (wSnap.exists()) setWSettings(wSnap.data() as WithdrawalSettings);
      if (aSnap.exists()) setAppSettings(aSnap.data() as AppSettings);
      if (sSnap.exists()) setSpinSegs((sSnap.data() as { segments: SpinSegment[] }).segments ?? DEFAULT_SPIN);
      if (pSnap.exists()) setPayAccounts({ ...DEFAULT_PAYMENTS, ...pSnap.data() } as PaymentAccounts);
      setLoading(false);
    })();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setDoc(doc(db, 'settings', 'withdrawals'), wSettings),
        setDoc(doc(db, 'settings', 'app'), appSettings),
        setDoc(doc(db, 'settings', 'spinWheel'), { segments: spinSegs }),
        setDoc(doc(db, 'settings', 'paymentAccounts'), payAccounts),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      alert(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateSeg = (i: number, key: keyof SpinSegment, val: string | number) => {
    setSpinSegs(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  };

  const addSeg = () => setSpinSegs(prev => [...prev, { label: 'New', type: 'xp', value: 10, weight: 10, color: '#888', textColor: '#fff' }]);
  const setCashMultiplier = (i: number, val: number) =>
    setSpinSegs(prev => prev.map((s, idx) => idx === i ? { ...s, multiplier: val } : s));
  const removeSeg = (i: number) => setSpinSegs(prev => prev.filter((_, idx) => idx !== i));

  const totalWeight = spinSegs.reduce((s, seg) => s + (seg.weight || 0), 0);

  return (
    <Layout
      adminEmail={adminEmail}
      title="Settings"
      actions={
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveAll}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save All Changes'}
        </button>
      }
    >
      {loading ? <Loader /> : (
        <>
          <div className="filter-tabs" style={{ marginBottom: 24, display: 'inline-flex' }}>
            {(['withdrawal','app','spin','payments'] as Tab[]).map(t => (
              <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                {t === 'withdrawal' ? 'Withdrawals' : t === 'app' ? 'App Config' : t === 'spin' ? 'Spin Wheel' : 'Payment Accounts'}
              </button>
            ))}
          </div>

          {/* ── Withdrawal Settings ── */}
          {tab === 'withdrawal' && (
            <div className="card" style={{ maxWidth: 600 }}>
              <div className="card-title">Withdrawal Settings</div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Minimum Amount (K)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={wSettings.minAmount} onChange={e => setWSettings(s => ({ ...s, minAmount: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maximum Amount (K)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={wSettings.maxAmount} onChange={e => setWSettings(s => ({ ...s, maxAmount: +e.target.value }))} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Fee: Flat charge (K)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={wSettings.chargeFlat} onChange={e => setWSettings(s => ({ ...s, chargeFlat: +e.target.value }))} />
                  <span className="form-hint">Fixed fee per withdrawal</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Fee: Percentage (%)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.1" value={wSettings.chargePercent} onChange={e => setWSettings(s => ({ ...s, chargePercent: +e.target.value }))} />
                  <span className="form-hint">Percentage of withdrawal amount</span>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Daily Limit: Count</label>
                  <input className="form-input" type="number" min="1" value={wSettings.dailyLimitCount} onChange={e => setWSettings(s => ({ ...s, dailyLimitCount: +e.target.value }))} />
                  <span className="form-hint">Max withdrawals per day per user</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Daily Limit: Amount (K)</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={wSettings.dailyLimitAmount} onChange={e => setWSettings(s => ({ ...s, dailyLimitAmount: +e.target.value }))} />
                  <span className="form-hint">Max total amount per day per user</span>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--gold-dim)', borderColor: 'var(--border-gold)', marginTop: 4 }}>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Fee Example</div>
                {[10, 50, 100, 200].map(amt => {
                  const fee = wSettings.chargeFlat + (wSettings.chargePercent / 100) * amt;
                  return (
                    <div key={amt} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                      <span style={{ color: 'var(--text-2)' }}>K{amt} withdrawal:</span>
                      <span>fee <span style={{ color: 'var(--red)' }}>K{fee.toFixed(2)}</span> → user receives <span className="text-gold">K{(amt - fee).toFixed(2)}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── App Config ── */}
          {tab === 'app' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
              <div className="card">
                <div className="card-title">Maintenance Mode</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={appSettings.maintenanceMode}
                    onChange={e => setAppSettings(s => ({ ...s, maintenanceMode: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ color: appSettings.maintenanceMode ? 'var(--red)' : 'var(--text-2)', fontWeight: 600 }}>
                    {appSettings.maintenanceMode ? '⚠ Maintenance mode is ON — app is inaccessible to users' : 'Maintenance mode OFF'}
                  </span>
                </label>
                <div className="form-group">
                  <label className="form-label">Maintenance Message</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={appSettings.maintenanceMessage}
                    onChange={e => setAppSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-title">Referral Bonus Rates (%)</div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Level 1 Referral (%)</label>
                    <input className="form-input" type="number" min="0" max="100" step="0.1" value={appSettings.referralBonusL1} onChange={e => setAppSettings(s => ({ ...s, referralBonusL1: +e.target.value }))} />
                    <span className="form-hint">Direct referral</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Level 2 Referral (%)</label>
                    <input className="form-input" type="number" min="0" max="100" step="0.1" value={appSettings.referralBonusL2} onChange={e => setAppSettings(s => ({ ...s, referralBonusL2: +e.target.value }))} />
                    <span className="form-hint">Referred person's referral</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Level 3 Referral (%)</label>
                    <input className="form-input" type="number" min="0" max="100" step="0.1" value={appSettings.referralBonusL3} onChange={e => setAppSettings(s => ({ ...s, referralBonusL3: +e.target.value }))} />
                    <span className="form-hint">3rd tier referral</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Payment Accounts ── */}
          {tab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Configure the mobile money accounts users will send deposits to. Leave empty to hide that provider option.
              </p>

              {([
                { key: 'mtn',    label: 'MTN Mobile Money',  color: '#FFC107', hint: 'Numbers starting with 096, 076, 056' },
                { key: 'airtel', label: 'Airtel Money',      color: '#F44336', hint: 'Numbers starting with 097, 077, 057' },
                { key: 'zamtel', label: 'Zamtel Kwacha',     color: '#4CAF50', hint: 'Numbers starting with 095, 075, 055' },
              ] as const).map(({ key, label, color, hint }) => (
                <div key={key} className="card" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="card-title" style={{ color }}>{label}</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{hint}</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input
                        className="form-input"
                        placeholder="e.g. 0961234567"
                        value={payAccounts[key].number}
                        onChange={e => setPayAccounts(p => ({ ...p, [key]: { ...p[key], number: e.target.value } }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Name</label>
                      <input
                        className="form-input"
                        placeholder="e.g. VaultQuest Ltd"
                        value={payAccounts[key].name}
                        onChange={e => setPayAccounts(p => ({ ...p, [key]: { ...p[key], name: e.target.value } }))}
                      />
                    </div>
                  </div>
                  {payAccounts[key].number && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                      Users will see: send to <strong>{payAccounts[key].number}</strong> · {payAccounts[key].name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Spin Wheel ── */}
          {tab === 'spin' && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Spin Wheel Segments</div>
                <button className="btn btn-ghost btn-sm" onClick={addSeg}>+ Add Segment</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Total weight: <strong style={{ color: 'var(--text-2)' }}>{totalWeight}</strong> — each segment's probability = weight / total
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {spinSegs.map((seg, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 80px 70px 70px 70px 70px 60px 60px auto',
                    gap: 8, alignItems: 'center',
                    background: 'var(--surface2)', padding: '10px 12px', borderRadius: 8,
                    borderLeft: `4px solid ${seg.color}`,
                  }}>
                    <input className="form-input" style={{ padding: '6px 8px', fontSize: 12 }} value={seg.label} onChange={e => updateSeg(i, 'label', e.target.value)} placeholder="Label" />
                    <select className="form-select" style={{ padding: '6px 8px', fontSize: 12 }} value={seg.type} onChange={e => updateSeg(i, 'type', e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="xp">XP</option>
                      <option value="boost">Boost</option>
                      <option value="spin_bonus">Spin+</option>
                    </select>
                    <input
                      className="form-input" type="number" step="0.01"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={seg.value}
                      onChange={e => updateSeg(i, 'value', +e.target.value)}
                      title="Free spin prize amount (cash) or reward quantity (XP/boost)"
                      placeholder="Value"
                    />
                    <input
                      className="form-input" type="number" step="0.01"
                      style={{ padding: '6px 8px', fontSize: 12, opacity: seg.type !== 'cash' ? 0.35 : 1 }}
                      value={seg.type === 'cash' ? (seg.multiplier ?? seg.value) : ''}
                      disabled={seg.type !== 'cash'}
                      onChange={e => setCashMultiplier(i, +e.target.value)}
                      title="Paid-spin multiplier — bet × this = win (cash segments only)"
                      placeholder="×"
                    />
                    <input className="form-input" type="number" style={{ padding: '6px 8px', fontSize: 12 }} value={seg.weight} onChange={e => updateSeg(i, 'weight', +e.target.value)} placeholder="Weight" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                      {totalWeight > 0 ? ((seg.weight / totalWeight) * 100).toFixed(1) : 0}%
                    </span>
                    <input type="color" value={seg.color} onChange={e => updateSeg(i, 'color', e.target.value)} style={{ width: 36, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} title="Segment color" />
                    <input type="color" value={seg.textColor} onChange={e => updateSeg(i, 'textColor', e.target.value)} style={{ width: 36, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} title="Text color" />
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeSeg(i)} title="Remove">✕</button>
                  </div>
                ))}
              </div>

              {spinSegs.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  Columns: Label · Type · <span title="Free spin prize or reward quantity" style={{ borderBottom: '1px dashed var(--text-muted)', cursor: 'help' }}>Free Value</span> · <span title="Paid-spin multiplier: bet × this = win (cash only)" style={{ borderBottom: '1px dashed var(--gold)', color: 'var(--gold)', cursor: 'help' }}>Paid ×</span> · Weight · Probability · Segment Color · Text Color
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
