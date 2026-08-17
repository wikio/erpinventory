/**
 * SARI Système — Tabular Islamic (Hijri) calendar helpers and the Algerian
 * religious public-holiday calculator (Section 309.4).
 *
 * Uses the standard arithmetic (tabular Fatimid) calendar: deterministic and
 * reversible, which makes it suitable as the DEFAULT automatic source for the
 * shifting religious holidays. The officially announced dates may differ by
 * ±1 day (moon sighting), which is why every entry — including auto-calculated
 * ones — stays manually editable in the Leave & Holiday Manager.
 */

export interface HijriDate { year: number; month: number; day: number }

/** Julian Day Number for a Gregorian date (integer arithmetic). */
export function gregorianJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/** Arithmetic tabular Islamic: Hijri date → Julian Day Number. */
export function hijriJdn(hijri: HijriDate): number {
  const { year, month, day } = hijri;
  // Fixed (R.D.) epoch of 1 Muharram 1 AH is 227014; JDN = R.D. + 1721425.
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948438;
}

export function hijriToGregorian(year: number, month: number, day: number): { year: number; month: number; day: number } {
  return jdnToGregorian(hijriJdn({ year, month, day }));
}

export function gregorianToHijri(year: number, month: number, day: number): HijriDate {
  const rd = gregorianJdn(year, month, day) - 1721425;
  const date = rd - 227014 + 1; // 1-based days since 1 Muharram 1 AH
  const yearStart = (hijriYear: number): number => 354 * (hijriYear - 1) + Math.floor((3 + 11 * hijriYear) / 30) + 1;
  const hijriYear = Math.floor((30 * date + 10646) / 10631);
  const prior = Math.max(0, date - yearStart(hijriYear));
  const hijriMonth = Math.max(1, Math.min(12, Math.ceil(prior / 29.5)));
  const hijriDay = Math.max(1, Math.min(30, prior - Math.ceil(29.5 * (hijriMonth - 1)) + 1));
  return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

export interface ReligiousHolidayDef {
  baseKey: string;
  hijriMonth: number;
  hijriDay: number;
  durationDays?: number; // consecutive public days (e.g. Eid al-Fitr × 2)
  suffix?: string;       // added to the baseKey for extra days
  name: { fr: string; ar: string; en: string };
}

/** The shifting religious holidays tracked by the Algerian calendar. */
export const religiousHolidayDefs: ReligiousHolidayDef[] = [
  { baseKey: 'awal_muharram', hijriMonth: 1, hijriDay: 1, name: { fr: 'Awal Moharram (Nouvel an hégirien)', ar: 'أول محرم (رأس السنة الهجرية)', en: 'Awal Muharram (Islamic New Year)' } },
  { baseKey: 'ashura', hijriMonth: 1, hijriDay: 10, name: { fr: 'Achoura', ar: 'عاشوراء', en: 'Ashura' } },
  { baseKey: 'mawlid', hijriMonth: 3, hijriDay: 12, name: { fr: 'Mawlid Ennabaoui', ar: 'المولد النبوي الشريف', en: 'Mawlid Ennabaoui' } },
  { baseKey: 'eid_fitr_1', hijriMonth: 10, hijriDay: 1, durationDays: 2, suffix: '_2', name: { fr: 'Aïd el-Fitr (1er jour)', ar: 'عيد الفطر (اليوم الأول)', en: 'Eid al-Fitr (1st day)' } },
  { baseKey: 'eid_adha_1', hijriMonth: 12, hijriDay: 10, durationDays: 2, suffix: '_2', name: { fr: 'Aïd el-Adha (1er jour)', ar: 'عيد الأضحى (اليوم الأول)', en: 'Eid al-Adha (1st day)' } },
];

export interface ComputedHoliday {
  baseKey: string;
  date: string; // YYYY-MM-DD
  name: { fr: string; ar: string; en: string };
  isFixed?: boolean;
  hijri?: HijriDate;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');
export const toIso = (date: { year: number; month: number; day: number }): string =>
  `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;

/** Computes the religious holidays falling inside a given Gregorian year. */
export function religiousHolidaysForYear(gregorianYear: number): ComputedHoliday[] {
  const year = Number(gregorianYear);
  const midHijri = gregorianToHijri(year, 6, 15).year;
  const candidates: ComputedHoliday[] = [];
  const seen = new Set<string>();
  for (const hijriYear of [midHijri - 1, midHijri, midHijri + 1]) {
    for (const def of religiousHolidayDefs) {
      const days = Math.max(1, Number(def.durationDays) || 1);
      for (let extra = 0; extra < days; extra++) {
        const greg = hijriToGregorian(hijriYear, def.hijriMonth, def.hijriDay + extra);
        if (greg.year !== year) continue;
        const baseKey = extra === 0 ? def.baseKey : `${def.baseKey.replace(/_1$/, '')}${def.suffix || `_${extra + 1}`}`;
        const name = extra === 0 ? def.name : {
          fr: `${def.name.fr.replace('(1er jour)', `(${extra + 1}e jour)`)}`,
          ar: `${def.name.ar.replace('(اليوم الأول)', `(اليوم ${extra === 1 ? 'الثاني' : extra + 1})`)}`,
          en: `${def.name.en.replace('(1st day)', `(${extra + 1}${extra === 1 ? 'nd' : 'th'} day)`)}`,
        };
        const date = toIso(greg);
        if (!seen.has(baseKey)) {
          seen.add(baseKey);
          candidates.push({ baseKey, date, name, isFixed: false, hijri: { year: hijriYear, month: def.hijriMonth, day: def.hijriDay + extra } });
        }
      }
    }
  }
  return candidates.sort((a, b) => a.date.localeCompare(b.date));
}

/** Fixed national Algerian holidays (identical every year). */
export function fixedAlgerianHolidays(gregorianYear: number): ComputedHoliday[] {
  const year = String(gregorianYear);
  return [
    { baseKey: 'new_year', date: `${year}-01-01`, name: { fr: 'Jour de l’an', ar: 'رأس السنة الميلادية', en: 'New Year’s Day' }, isFixed: true },
    { baseKey: 'yennayer', date: `${year}-01-12`, name: { fr: 'Yennayer (Nouvel an amazigh)', ar: 'يناير (رأس السنة الأمازيغية)', en: 'Yennayer (Amazigh New Year)' }, isFixed: true },
    { baseKey: 'labour_day', date: `${year}-05-01`, name: { fr: 'Fête du Travail', ar: 'عيد العمال', en: 'Labour Day' }, isFixed: true },
    { baseKey: 'independence_day', date: `${year}-07-05`, name: { fr: 'Fête de l’Indépendance', ar: 'عيد الاستقلال', en: 'Independence Day' }, isFixed: true },
    { baseKey: 'revolution_day', date: `${year}-11-01`, name: { fr: 'Fête de la Révolution (1er novembre)', ar: 'عيد الثورة (1 نوفمبر)', en: 'Revolution Day (November 1st)' }, isFixed: true },
  ];
}

/** Complete Algerian calendar (fixed + computed religious) for a Gregorian year. */
export function algerianHolidaysForYear(gregorianYear: number): ComputedHoliday[] {
  return [...fixedAlgerianHolidays(gregorianYear), ...religiousHolidaysForYear(gregorianYear)].sort((a, b) => a.date.localeCompare(b.date));
}

export const hijriEngine = { gregorianJdn, jdnToGregorian, hijriJdn, hijriToGregorian, gregorianToHijri, toIso, religiousHolidayDefs, religiousHolidaysForYear, fixedAlgerianHolidays, algerianHolidaysForYear };
