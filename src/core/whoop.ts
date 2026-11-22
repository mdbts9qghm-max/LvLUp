/**
 * WHOOP-CSV-Import (tolerant).
 * Der offizielle Datenexport (App → Profil → Daten exportieren) enthält u. a.
 * `physiological_cycles.csv` mit Spalten wie
 *   "Cycle start time", "Recovery score %", "Resting heart rate (bpm)",
 *   "Heart rate variability (ms)", "Wake onset", "Asleep duration (min)" …
 * sowie `sleeps.csv`. Spaltennamen werden unscharf erkannt (Groß-/Kleinschreibung,
 * Einheiten, Reihenfolge egal), Trennzeichen , oder ; und Dezimalkomma werden akzeptiert.
 */
import { isValidISO, type ISODate } from './dates';

export interface RecoveryEntry {
  date: ISODate;
  recoveryPct?: number;
  sleepMin?: number;
  hrv?: number;
  rhr?: number;
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  const sep = semi > comma ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQ) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

function findCol(headers: string[], patterns: RegExp[], exclude: RegExp[] = []): number {
  const hs = headers.map(norm);
  for (const p of patterns) {
    const i = hs.findIndex((h) => p.test(h) && !exclude.some((e) => e.test(h)));
    if (i >= 0) return i;
  }
  return -1;
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const t = v.trim().replace(/%$/, '').replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Datum aus "2024-05-01 07:13:45", "2024-05-01T07:13:45Z", "01.05.2024", "05/01/2024". */
export function parseDate(v: string | undefined): ISODate | undefined {
  if (!v) return undefined;
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return isValidISO(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
  m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return isValidISO(iso) ? iso : undefined;
  }
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const iso = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return isValidISO(iso) ? iso : undefined;
  }
  return undefined;
}

export interface WhoopParseResult {
  entries: RecoveryEntry[];
  recognized: string[]; // erkannte Felder
  skipped: number;
}

export function parseWhoopCsv(text: string): WhoopParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { entries: [], recognized: [], skipped: 0 };
  const h = rows[0];
  // Datum: Aufwachzeit gehört zum Tag der Recovery; sonst Zyklusstart; sonst irgendein "date"
  const cWake = findCol(h, [/^wake onset/, /wake/]);
  const cStart = findCol(h, [/^cycle start/, /^date$/, /^datum/, /date/, /start/]);
  const cRec = findCol(h, [/recovery score/, /^recovery/, /erholung/]);
  const cSleep = findCol(h, [/asleep duration/, /sleep duration/, /schlafdauer/, /total sleep/], [/need|debt|in bed/]);
  const cHrv = findCol(h, [/heart rate variability/, /\bhrv\b/]);
  const cRhr = findCol(h, [/resting heart rate/, /\brhr\b/, /ruhepuls/]);
  const recognized: string[] = [];
  if (cWake >= 0 || cStart >= 0) recognized.push('Datum');
  if (cRec >= 0) recognized.push('Recovery');
  if (cSleep >= 0) recognized.push('Schlaf');
  if (cHrv >= 0) recognized.push('HRV');
  if (cRhr >= 0) recognized.push('Ruhepuls');

  const byDate = new Map<ISODate, RecoveryEntry>();
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const date = parseDate(cWake >= 0 ? r[cWake] : undefined) ?? parseDate(cStart >= 0 ? r[cStart] : undefined);
    if (!date) {
      skipped++;
      continue;
    }
    const e: RecoveryEntry = {
      date,
      recoveryPct: cRec >= 0 ? num(r[cRec]) : undefined,
      sleepMin: cSleep >= 0 ? num(r[cSleep]) : undefined,
      hrv: cHrv >= 0 ? num(r[cHrv]) : undefined,
      rhr: cRhr >= 0 ? num(r[cRhr]) : undefined,
    };
    if (e.sleepMin !== undefined && e.sleepMin > 0 && e.sleepMin < 24) e.sleepMin = e.sleepMin * 60; // Stunden statt Minuten
    if (e.recoveryPct === undefined && e.sleepMin === undefined && e.hrv === undefined && e.rhr === undefined) {
      skipped++;
      continue;
    }
    const prev = byDate.get(date);
    byDate.set(date, { ...prev, ...Object.fromEntries(Object.entries(e).filter(([, v]) => v !== undefined)) } as RecoveryEntry);
  }
  const entries = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { entries, recognized, skipped };
}
