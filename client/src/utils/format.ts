export function fmt(n: number | string, decimals = 2): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return num.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number | string, decimals = 2): string {
  return `${fmt(n, decimals)}%`;
}

export function fmtInt(n: number | string): string {
  return fmt(n, 0);
}

export function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

export function fmtDateTime(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}
