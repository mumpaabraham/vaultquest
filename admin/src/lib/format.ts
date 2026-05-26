import { Timestamp } from 'firebase/firestore';

export function fmtCurrency(amount: number): string {
  return `K${Math.floor(amount)}`;
}

export function fmtDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('en-ZM', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('en-ZM', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - ts.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function providerLabel(id: string): string {
  const map: Record<string, string> = {
    airtel: 'Airtel Money',
    mtn: 'MTN MoMo',
    zamtel: 'Zamtel Kwacha',
  };
  return map[id] ?? id;
}
