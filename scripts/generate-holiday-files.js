#!/usr/bin/env node
'use strict';
/**
 * Generates the ready-to-import Algerian public-holiday files (2011 → 2031)
 * into content/holidays/{year}.json — the designated server-side folder read
 * by the auto-fetch endpoint (Section 309.2) and importable as JSON files
 * through the configurable mapping (Section 309.1/309.4).
 *
 * The Hijri arithmetic below mirrors src/core/hijri.ts (tabular Islamic
 * calendar); generated dates may differ by ±1 day from official moon-sighting
 * announcements and must be reviewed/adjusted in the application.
 */
const fs = require('fs');
const path = require('path');

const pad2 = (value) => String(value).padStart(2, '0');
const gregorianJdn = (y, m, d) => {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
};
const jdnToGregorian = (jdn) => {
  const a = jdn + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1, month = m + 3 - 12 * Math.floor(m / 10);
  return { year: 100 * b + d - 4800 + Math.floor(m / 10), month, day };
};
const hijriToGregorian = (y, m, d) => jdnToGregorian(d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948438);
const gregorianToHijri = (y, m, d) => {
  const rd = gregorianJdn(y, m, d) - 1721425, date = rd - 227014 + 1;
  const yearStart = (h) => 354 * (h - 1) + Math.floor((3 + 11 * h) / 30) + 1;
  const hijriYear = Math.floor((30 * date + 10646) / 10631);
  const prior = Math.max(0, date - yearStart(hijriYear));
  const hijriMonth = Math.max(1, Math.min(12, Math.ceil(prior / 29.5)));
  const hijriDay = Math.max(1, Math.min(30, prior - Math.ceil(29.5 * (hijriMonth - 1)) + 1));
  return { year: hijriYear, month: hijriMonth, day: hijriDay };
};
const iso = (d) => `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;

const RELIGIOUS = [
  { baseKey: 'awal_muharram', m: 1, d: 1, fr: 'Awal Moharram (Nouvel an hégirien)', ar: 'أول محرم (رأس السنة الهجرية)', en: 'Awal Muharram (Islamic New Year)' },
  { baseKey: 'ashura', m: 1, d: 10, fr: 'Achoura', ar: 'عاشوراء', en: 'Ashura' },
  { baseKey: 'mawlid', m: 3, d: 12, fr: 'Mawlid Ennabaoui', ar: 'المولد النبوي الشريف', en: 'Mawlid Ennabaoui' },
  { baseKey: 'eid_fitr_1', m: 10, d: 1, days: 2, suffix: '_2', fr: 'Aïd el-Fitr (1er jour)', ar: 'عيد الفطر (اليوم الأول)', en: 'Eid al-Fitr (1st day)' },
  { baseKey: 'eid_adha_1', m: 12, d: 10, days: 2, suffix: '_2', fr: 'Aïd el-Adha (1er jour)', ar: 'عيد الأضحى (اليوم الأول)', en: 'Eid al-Adha (1st day)' },
];
const FIXED = [
  { baseKey: 'new_year', fr: 'Jour de l’an', ar: 'رأس السنة الميلادية', en: 'New Year’s Day', md: [1, 1] },
  { baseKey: 'yennayer', fr: 'Yennayer (Nouvel an amazigh)', ar: 'يناير (رأس السنة الأمازيغية)', en: 'Yennayer (Amazigh New Year)', md: [1, 12] },
  { baseKey: 'labour_day', fr: 'Fête du Travail', ar: 'عيد العمال', en: 'Labour Day', md: [5, 1] },
  { baseKey: 'independence_day', fr: 'Fête de l’Indépendance', ar: 'عيد الاستقلال', en: 'Independence Day', md: [7, 5] },
  { baseKey: 'revolution_day', fr: 'Fête de la Révolution (1er novembre)', ar: 'عيد الثورة (1 نوفمبر)', en: 'Revolution Day (November 1st)', md: [11, 1] },
];

function holidaysForYear(year) {
  const entries = [];
  for (const fixed of FIXED) entries.push({ date: `${year}-${pad2(fixed.md[0])}-${pad2(fixed.md[1])}`, name: { fr: fixed.fr, ar: fixed.ar, en: fixed.en }, isFixed: true, source: 'auto', baseKey: fixed.baseKey, notes: '' });
  const midHijri = gregorianToHijri(year, 6, 15).year;
  for (const hijriYear of [midHijri - 1, midHijri, midHijri + 1]) {
    for (const def of RELIGIOUS) {
      const days = def.days || 1;
      for (let extra = 0; extra < days; extra++) {
        const greg = hijriToGregorian(hijriYear, def.m, def.d + extra);
        if (greg.year !== year) continue;
        const baseKey = extra === 0 ? def.baseKey : `${def.baseKey.replace(/_1$/, '')}${def.suffix || `_${extra + 1}`}`;
        const name = extra === 0 ? { fr: def.fr, ar: def.ar, en: def.en } : {
          fr: def.fr.replace('(1er jour)', `(${extra + 1}e jour)`), ar: def.ar.replace('(اليوم الأول)', `(اليوم ${extra === 1 ? 'الثاني' : extra + 1})`), en: def.en.replace('(1st day)', `(${extra + 1}${extra === 1 ? 'nd' : 'th'} day)`),
        };
        entries.push({ date: iso(greg), name, isFixed: false, source: 'auto', baseKey, hijri: { year: hijriYear, month: def.m, day: def.d + extra }, notes: 'Fête religieuse : date indicative (calcul tabulaire), à confirmer selon l’annonce officielle.' });
      }
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function generateHolidayYears(fromYear = 2011, toYear = 2031) {
  const years = {};
  for (let year = fromYear; year <= toYear; year++) years[String(year)] = holidaysForYear(year);
  return years;
}

if (require.main === module) {
  const target = path.resolve(__dirname, '..', 'content', 'holidays');
  fs.mkdirSync(target, { recursive: true });
  const years = generateHolidayYears();
  for (const [year, entries] of Object.entries(years)) {
    fs.writeFileSync(path.join(target, `${year}.json`), `${JSON.stringify(entries, null, 2)}\n`);
  }
  console.log(`[Holidays] Generated ${Object.keys(years).length} files (${Object.keys(years)[0]} → ${Object.keys(years).pop()}) in content/holidays`);
}

module.exports = { generateHolidayYears, holidaysForYear };
