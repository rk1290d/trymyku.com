// Small date/price helpers for the public profile page.

export function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return 'last month';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function money(n: number | string | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v) || v <= 0) return null;
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

export function initials(full: string): string {
  const parts = full.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M';
}

export function ratingStars(rating: number): string {
  const r = Math.round(rating);
  return '★★★★★'.slice(0, Math.max(0, Math.min(5, r))).padEnd(5, '☆');
}

const WORK_TYPE_LABELS: Record<string, string> = {
  mobile: 'Mobile, comes to you',
  shop: 'Has their own shop',
  both: 'Mobile or drop-off',
};

export function workTypeLabel(wt: string | null | undefined): string | null {
  if (!wt) return null;
  return WORK_TYPE_LABELS[wt] ?? null;
}
