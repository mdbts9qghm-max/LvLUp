/**
 * Datums-Hilfen. Alle Daten sind lokale Kalendertage im Format YYYY-MM-DD.
 * Gerechnet wird intern in UTC, damit Sommer-/Winterzeit keine Tage verschiebt.
 */
export type ISODate = string;

const DAY_MS = 86_400_000;

export function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromUTC(ms: number): ISODate {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS);
}

/** Anzahl Tage von a nach b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidISO(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return fromUTC(toUTC(d)) === d;
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function weekday(d: ISODate): string {
  return WEEKDAYS[new Date(toUTC(d)).getUTCDay()];
}

/** z. B. "Mo 23. Nov" */
export function formatShort(d: ISODate): string {
  const dt = new Date(toUTC(d));
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()}. ${MONTHS[dt.getUTCMonth()]}`;
}

/** z. B. "23.11.2026" */
export function formatDE(d: ISODate): string {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
