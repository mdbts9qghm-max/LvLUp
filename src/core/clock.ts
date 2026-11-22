import { isValidISO, todayISO, type ISODate } from './dates';

/** Heute. Zum Testen kann man ?heute=2027-02-10 an die URL hängen. */
export function today(): ISODate {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('heute');
    if (p && isValidISO(p)) return p;
  }
  return todayISO();
}
