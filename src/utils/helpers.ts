export const generateReferralCode = (displayName: string): string => {
  const base = displayName.replace(/\s/g, '').toUpperCase().slice(0, 6);
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base}${suffix}`;
};

export const formatCurrency = (amount: number): string => {
  return `K${amount.toFixed(2)}`;
};

export const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export const getTimeAgo = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return days === 1 ? 'Yesterday' : `${days} days ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysRemaining = (endDate: Date): number => {
  const diff = endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};
