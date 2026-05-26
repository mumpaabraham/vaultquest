import { useEffect, useRef, useState } from 'react';
import {
  collection, query, orderBy, getDocs, addDoc,
  doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { Loader } from '../components/Loader';
import { fmtCurrency } from '../lib/format';
import type { Package } from '../types';

const EMPTY: Omit<Package, 'id'> = {
  name: '', price: 0, dailyEarnings: 0, durationDays: 30,
  color: '#f59e0b', icon: '💎', imageUrl: undefined, popular: false, active: true,
};

export default function Packages({ adminEmail }: { adminEmail: string | null }) {
  const [pkgs,    setPkgs]    = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [form,    setForm]    = useState<Omit<Package, 'id'>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'packages'), orderBy('price')));
    setPkgs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Package)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    setForm(EMPTY);
    resetImageState();
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (p: Package) => {
    setForm({ name: p.name, price: p.price, dailyEarnings: p.dailyEarnings, durationDays: p.durationDays, color: p.color, icon: p.icon, imageUrl: p.imageUrl, popular: p.popular ?? false, active: p.active });
    resetImageState();
    setEditing(p);
    setCreating(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setForm(f => ({ ...f, imageUrl: undefined }));
    resetImageState();
  };

  const save = async () => {
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;

      if (imageFile) {
        const storageRef = ref(storage, `packages/${Date.now()}_${imageFile.name}`);
        const snap = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snap.ref);

        // delete old image if editing and had one
        if (editing?.imageUrl) {
          try { await deleteObject(ref(storage, editing.imageUrl)); } catch {}
        }
      }

      const data = { ...form, imageUrl: imageUrl ?? null };

      if (editing) {
        await updateDoc(doc(db, 'packages', editing.id), data);
      } else {
        await addDoc(collection(db, 'packages'), { ...data, createdAt: serverTimestamp() });
      }
      await load();
      setEditing(null);
      setCreating(false);
      resetImageState();
    } catch (e: any) {
      alert(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Package) => {
    await updateDoc(doc(db, 'packages', p.id), { active: !p.active });
    setPkgs(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
  };

  const remove = async (p: Package) => {
    if (!confirm(`Delete package "${p.name}"? This cannot be undone.`)) return;
    if (p.imageUrl) {
      try { await deleteObject(ref(storage, p.imageUrl)); } catch {}
    }
    await deleteDoc(doc(db, 'packages', p.id));
    setPkgs(prev => prev.filter(x => x.id !== p.id));
  };

  const roi = (p: typeof form) => p.price > 0
    ? ((p.dailyEarnings * p.durationDays) / p.price * 100).toFixed(1)
    : '0.0';

  const showModal = creating || editing !== null;
  const displayImage = imagePreview ?? form.imageUrl;

  return (
    <Layout
      adminEmail={adminEmail}
      title="Investment Packages"
      actions={
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Package</button>
      }
    >
      {loading ? <Loader /> : (
        <>
          {pkgs.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>No packages yet. Create your first investment package.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {pkgs.map(p => (
              <div key={p.id} className="card" style={{ borderColor: p.active ? `${p.color}40` : undefined, opacity: p.active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: `2px solid ${p.color}40` }}
                      />
                    ) : (
                      <span style={{ fontSize: 36, lineHeight: 1 }}>{p.icon}</span>
                    )}
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: p.color }}>{p.name}</div>
                      {p.popular && <Badge status="info" text="POPULAR" />}
                    </div>
                  </div>
                  <Badge status={p.active ? 'active' : 'completed'} text={p.active ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                <div className="info-row">
                  <span className="info-key">Price</span>
                  <span className="info-val text-gold">{fmtCurrency(p.price)}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Daily Earnings</span>
                  <span className="info-val">{fmtCurrency(p.dailyEarnings)}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Duration</span>
                  <span className="info-val">{p.durationDays} days</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Total ROI</span>
                  <span className="info-val text-green">
                    {fmtCurrency(p.dailyEarnings * p.durationDays)} ({((p.dailyEarnings * p.durationDays / p.price) * 100).toFixed(1)}%)
                  </span>
                </div>

                <div className="gap-8" style={{ marginTop: 14 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                  <button className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(p)}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal
          title={editing ? `Edit: ${editing.name}` : 'New Package'}
          onClose={() => { setEditing(null); setCreating(false); resetImageState(); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setEditing(null); setCreating(false); resetImageState(); }}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !form.name || form.price <= 0} onClick={save}>
                {saving ? 'Saving…' : 'Save Package'}
              </button>
            </>
          }
        >
          {/* Image upload */}
          <div className="form-group">
            <label className="form-label">Package Image</label>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'var(--surface-2)',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {displayImage ? (
                <>
                  <img
                    src={displayImage}
                    alt="Package"
                    style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border-gold)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>
                      {imageFile ? imageFile.name : 'Current image'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Click to replace</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={e => { e.stopPropagation(); removeImage(); }}
                    style={{ flexShrink: 0 }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--surface)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                    {form.icon || '📦'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>Click to upload image</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>PNG, JPG up to 2 MB. Uses emoji icon if not set.</div>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Package Name</label>
              <input className="form-input" placeholder="e.g. GOLD" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Icon (emoji fallback)</label>
              <input className="form-input" placeholder="💎" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price (ZMW)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Earnings (ZMW)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.dailyEarnings || ''} onChange={e => setForm(f => ({ ...f, dailyEarnings: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Duration (days)</label>
              <input className="form-input" type="number" min="1" value={form.durationDays || ''} onChange={e => setForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 30 }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                <input className="form-input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
              <input type="checkbox" checked={form.popular ?? false} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} />
              Mark as Popular
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Active (visible to users)
            </label>
          </div>

          {form.price > 0 && (
            <div className="card" style={{ background: 'var(--gold-dim)', borderColor: 'var(--border-gold)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Preview</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Total payout:</span>
                <span className="text-gold" style={{ fontWeight: 700 }}>{fmtCurrency(form.dailyEarnings * form.durationDays)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                <span>ROI:</span>
                <span className="text-green" style={{ fontWeight: 700 }}>{roi(form)}% over {form.durationDays} days</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
