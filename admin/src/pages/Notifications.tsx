import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, fns, storage } from '../firebase';
import { Layout } from '../components/Layout';
import { Loader } from '../components/Loader';

interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  sentAt: Timestamp;
  sentBy: string;
  recipientCount: number;
}

const broadcastFn = httpsCallable<
  { title: string; body: string; imageUrl?: string; actionLabel?: string; actionRoute?: string },
  { success: boolean; recipientCount: number }
>(fns, 'adminBroadcastNotification');

export default function Notifications({ adminEmail }: { adminEmail: string | null }) {
  const [history, setHistory]         = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoading]  = useState(true);

  // form state
  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [imageUrl,    setImageUrl]    = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [actionLabel, setActionLabel] = useState('');
  const [actionRoute, setActionRoute] = useState('');
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), orderBy('sentAt', 'desc')),
      snap => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as BroadcastRecord)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl('');
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return imageUrl;
    setUploading(true);
    const storageRef = ref(storage, `notifications/${Date.now()}_${imageFile.name}`);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, imageFile);
      task.on(
        'state_changed',
        snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err  => { setUploading(false); reject(err); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploading(false);
          setImageUrl(url);
          resolve(url);
        }
      );
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSent(null);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile && !imageUrl) {
        finalImageUrl = await uploadImage();
      }

      const payload: Parameters<typeof broadcastFn>[0] = { title: title.trim(), body: body.trim() };
      if (finalImageUrl) payload.imageUrl = finalImageUrl;
      if (actionLabel.trim() && actionRoute.trim()) {
        payload.actionLabel = actionLabel.trim();
        payload.actionRoute = actionRoute.trim();
      }

      const result = await broadcastFn(payload);
      setSent(result.data.recipientCount);
      setTitle('');
      setBody('');
      setImageFile(null);
      setImageUrl('');
      setActionLabel('');
      setActionRoute('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      alert(e?.message ?? 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending && !uploading;

  return (
    <Layout adminEmail={adminEmail} title="Notifications">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Compose Form ── */}
        <div className="card">
          <div className="card-title">Broadcast Notification</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Sends a push notification to all registered users.
          </p>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="e.g. New feature available!"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Notification body text…"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={500}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              style={{ fontSize: 13, color: 'var(--text-2)' }}
            />
            {uploading && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--gold)', transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading {uploadPct}%</span>
              </div>
            )}
            {imageFile && !uploading && !imageUrl && (
              <span style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                {imageFile.name} — will upload when sent
              </span>
            )}
            {imageUrl && (
              <img src={imageUrl} alt="preview" style={{ marginTop: 8, maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
            )}
          </div>

          <div className="card" style={{ background: 'var(--surface2)', marginBottom: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Action Button (optional) — tapping the notification opens this route
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Button Label</label>
                <input
                  className="form-input"
                  placeholder="e.g. Claim Now"
                  value={actionLabel}
                  onChange={e => setActionLabel(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">App Route</label>
                <input
                  className="form-input"
                  placeholder="e.g. /(tabs)/vaults"
                  value={actionRoute}
                  onChange={e => setActionRoute(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-primary"
              disabled={!canSend}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : '🔔 Send to All Users'}
            </button>
            {sent !== null && (
              <span style={{ fontSize: 13, color: 'var(--green)' }}>
                ✓ Sent to {sent} push token{sent !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── History ── */}
        <div className="card">
          <div className="card-title">Broadcast History</div>
          {loadingHistory ? (
            <Loader />
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No broadcasts yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(n => (
                <div key={n.id} style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  borderLeft: '3px solid var(--gold)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <strong style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.3 }}>{n.title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {n.sentAt?.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 8px' }}>{n.body}</p>

                  {n.imageUrl && (
                    <img src={n.imageUrl} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                  )}

                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>📤 {n.recipientCount ?? '—'} recipients</span>
                    {n.actionLabel && <span>🔗 {n.actionLabel} → {n.actionRoute}</span>}
                    <span>by {n.sentBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
