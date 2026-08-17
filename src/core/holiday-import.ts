/**
 * SARI Système — Public-holiday file import helpers (Section 309.1).
 * Parses CSV/JSON holiday files through a configurable column/field mapping
 * and normalizes rows into publicHolidays records.
 */
import { I18nText } from './leave';

export interface HolidayImportMapping {
  date: string;    // CSV column name or JSON field containing YYYY-MM-DD
  fr: string;      // French label field
  ar: string;      // Arabic label field
  en: string;      // English label field
  isFixed?: string; // optional boolean-ish field ('true'/'1'/'oui'/'yes')
  notes?: string;   // optional notes field
}

export const defaultCsvMapping: HolidayImportMapping = { date: 'date', fr: 'name_fr', ar: 'name_ar', en: 'name_en', isFixed: 'is_fixed', notes: 'notes' };
export const defaultJsonMapping: HolidayImportMapping = { date: 'date', fr: 'name.fr', ar: 'name.ar', en: 'name.en', isFixed: 'isFixed', notes: 'notes' };

export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += char;
    } else if (char === '"') inQuotes = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

/** CSV rows (header + data) → array of objects. */
export function csvToObjects(text: string, delimiter = ','): Record<string, string>[] {
  const rows = parseCsv(text, delimiter);
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((name, index) => { if (name) record[name] = (row[index] ?? '').trim(); });
    return record;
  });
}

const jsonPath = (record: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), record);
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') { try { return JSON.stringify(value); } catch { return ''; } }
  return String(value);
};

export function toBooleanFlag(value: string): boolean {
  return ['true', '1', 'oui', 'yes', 'o', 'y'].includes(String(value).trim().toLowerCase());
}

export interface NormalizedHoliday {
  date: string;
  name: I18nText;
  isFixed: boolean;
  notes: string;
}

/** Maps one parsed object (CSV or JSON) to a normalized holiday row. */
export function normalizeHolidayRow(record: Record<string, unknown>, mapping: HolidayImportMapping): NormalizedHoliday | null {
  const date = String(jsonPath(record, mapping.date) || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const fr = jsonPath(record, mapping.fr).trim();
  const ar = jsonPath(record, mapping.ar).trim();
  const en = jsonPath(record, mapping.en).trim();
  if (!fr && !ar && !en) return null;
  return {
    date,
    name: { fr, ar, en },
    isFixed: mapping.isFixed ? toBooleanFlag(jsonPath(record, mapping.isFixed)) : false,
    notes: mapping.notes ? jsonPath(record, mapping.notes).trim() : '',
  };
}

export interface ParsedHolidayFile {
  format: 'csv' | 'json';
  rows: Record<string, unknown>[];
  normalized: NormalizedHoliday[];
  rejected: number;
}

/**
 * Parses a holiday file (CSV text or JSON object/array) with a configurable mapping.
 * JSON accepts both `[{...}, ...]` arrays and `{ "holidays": [...] }` wrappers.
 */
export function parseHolidayFile(input: string | unknown, mapping: HolidayImportMapping): ParsedHolidayFile {
  let format: 'csv' | 'json' = 'json';
  let rows: Record<string, unknown>[] = [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      rows = Array.isArray(parsed) ? parsed : Array.isArray((parsed as Record<string, unknown>)?.holidays) ? (parsed as { holidays: Record<string, unknown>[] }).holidays : [];
    } else {
      format = 'csv';
      rows = csvToObjects(input);
    }
  } else if (Array.isArray(input)) rows = input;
  else if (input && typeof input === 'object' && Array.isArray((input as { holidays?: unknown[] }).holidays)) rows = (input as { holidays: unknown[] }).holidays as Record<string, unknown>[];

  const normalized = rows.map((row) => normalizeHolidayRow(row, mapping)).filter((row): row is NormalizedHoliday => row !== null);
  return { format, rows, normalized, rejected: rows.length - normalized.length };
}

/** Unique deterministic id for an imported holiday row. */
export function importedHolidayId(date: string, name: I18nText): string {
  const slug = (name.fr || name.en || name.ar || 'holiday').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `ph-imp-${date}-${slug || 'import'}`;
}

export const holidayImport = { parseCsv, csvToObjects, parseHolidayFile, normalizeHolidayRow, defaultCsvMapping, defaultJsonMapping, importedHolidayId, toBooleanFlag };
