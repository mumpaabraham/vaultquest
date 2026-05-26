import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, fns, storage } from '../firebase';
import { Layout } from '../components/Layout';
import { Loader } from '../components/Loader';

interface AppVersion {
  id: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  fileSize: number;
  changelog: string;
  isLatest: boolean;
  publishedAt: Timestamp;
  publishedBy: string;
  downloadCount: number;
}

const publishFn = httpsCallable<
  { versionName: string; versionCode: number; downloadUrl: string; fileSize: number; changelog: string },
  { success: boolean }
>(fns, 'adminPublishAppVersion');

function fmtBytes(bytes: number) {
  if (!bytes) return '—';
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function AppVersions({ adminEmail }: { adminEmail: string | null }) {
  const [versions, setVersions]     = useState<AppVersion[]>([]);
  const [loading, setLoading]       = useState(true);

  // form
  const [apkFile,      setApkFile]      = useState<File | null>(null);
  const [versionName,  setVersionName]  = useState('');
  const [versionCode,  setVersionCode]  = useState('');
  const [changelog,    setChangelog]    = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [publishing,   setPublishing]   = useState(false);
  const [published,    setPublished]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'appVersions'), orderBy('publishedAt', 'desc')),
      snap => {
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppVersion)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const handlePublish = async () => {
    if (!apkFile || !versionName.trim() || !versionCode) return;
    setPublishing(true);
    try {
      // Upload APK
      setUploading(true);
      const storageRef = ref(storage, `apk/vaultquest-${versionName.trim()}.apk`);
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, apkFile);
        task.on(
          'state_changed',
          snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
      setUploading(false);

      await publishFn({
        versionName:  versionName.trim(),
        versionCode:  Number(versionCode),
        downloadUrl,
        fileSize:     apkFile.size,
        changelog:    changelog.trim(),
      });

      setPublished(true);
      setTimeout(() => setPublished(false), 3000);
      setApkFile(null);
      setVersionName('');
      setVersionCode('');
      setChangelog('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      alert(e?.message ?? 'Publish failed');
    } finally {
      setPublishing(false);
      setUploading(false);
    }
  };

  const canPublish = !!apkFile && versionName.trim().length > 0 && !!versionCode && !publishing;

  return (
    <Layout adminEmail={adminEmail} title="App Versions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>

        {/* ── Upload Form ── */}
        <div className="card">
          <div className="card-title">Publish New Version</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Upload the APK, fill in the details, and click Publish. All users will be notified automatically.
          </p>

          <div className="form-group">
            <label className="form-label">APK File *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".apk"
              onChange={e => setApkFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13, color: 'var(--text-2)' }}
            />
            {apkFile && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {apkFile.name} · {fmtBytes(apkFile.size)}
              </span>
            )}
            {uploading && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--gold)', transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading {uploadPct}%</span>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Version Name *</label>
              <input className="form-input" placeholder="e.g. 1.2.0" value={versionName} onChange={e => setVersionName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Version Code *</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 3" value={versionCode} onChange={e => setVersionCode(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Changelog</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="What's new in this version…"
              value={changelog}
              onChange={e => setChangelog(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" disabled={!canPublish} onClick={handlePublish}>
              {publishing ? (uploading ? `Uploading ${uploadPct}%…` : 'Publishing…') : '🚀 Publish & Notify Users'}
            </button>
            {published && <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Published!</span>}
          </div>
        </div>

        {/* ── Version History ── */}
        <div className="card">
          <div className="card-title">Version History</div>
          {loading ? <Loader /> : versions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No versions published yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {versions.map(v => (
                <div key={v.id} style={{
                  background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px',
                  borderLeft: `3px solid ${v.isLatest ? 'var(--green)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, color: 'var(--text-1)' }}>v{v.versionName}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({v.versionCode})</span>
                      {v.isLatest && (
                        <span style={{ fontSize: 10, background: 'var(--green)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>LATEST</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>⬇ {v.downloadCount ?? 0}</span>
                      <span>{fmtBytes(v.fileSize)}</span>
                    </div>
                  </div>
                  {v.changelog && (
                    <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '6px 0 4px', whiteSpace: 'pre-wrap' }}>{v.changelog}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v.publishedAt?.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <a href={v.downloadUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>
                      ↓ Download
                    </a>
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
