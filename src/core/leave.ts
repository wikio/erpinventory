/**
 * SARI Système — Leave, public-holiday, onboarding and occasional-worker engine.
 * Pure calculation helpers shared by the Leave Manager (Section 300–302),
 * the Contracts/Onboarding workflow (Section 304) and the Temporary/Freelance
 * worker manager (Section 303). Everything here stays side-effect free so it
 * can be unit-tested and reused from IndexedDB modules and payslip adjustment.
 */

export interface I18nText { fr?: string; ar?: string; en?: string }

export interface LeaveType {
  id: string; code?: string; name?: I18nText; daysPerYear?: number;
  isPaid?: boolean; deductsBalance?: boolean; requiresJustification?: boolean;
  maxDaysPerRequest?: number; color?: string; isActive?: boolean;
}

export interface PublicHoliday {
  id: string; date: string; name?: I18nText; isFixed?: boolean;
  isWorkable?: boolean; notes?: string;
}

export interface WorkSchedule {
  workingDays?: number[];            // JS getDay(): 0 Sunday … 6 Saturday
  dailyHours?: number;               // contractual daily working hours
  weeklyHours?: number;
  startTime?: string; endTime?: string;
  paidLeaveDivisor?: number;         // monthly divisor for 1-day deductions (default 26)
  holidayPremiumRate?: number;       // worked-holiday premium (default 1.0 = +100%)
  maxTeamAbsenceRatio?: number;      // default 0.5: warn when >50% of a team is away
}

export interface LeaveRequestLike {
  id?: string; employeeId: string; typeId?: string;
  startDate: string; endDate: string; durationDays?: number;
  isPaid?: boolean; status?: string;
}

export interface ValidationAlert {
  severity: 'error' | 'warning' | 'info';
  code: string;
  title: I18nText;
  message: I18nText;
  dates?: string[];
}

export interface Suggestion {
  startDate: string; endDate: string;
  durationDays: number; workingDays: number; publicHolidays: number;
  score: number;
  reasons: I18nText[];
}

export interface RuleAcceptance { id?: string; employeeId: string; kind: 'rules' | 'terms' | 'contract' | 'rules_read'; targetId?: string; version?: number; acceptedAt?: string; signature?: { name?: string; signedAt?: string; userId?: string; device?: string } }

export interface ConflictDeclaration { id?: string; employeeId: string; ethicsCommitment?: boolean; confidentiality?: boolean; noConflicts?: boolean; hasExternalEngagements?: boolean; externalEngagementsHtml?: string; declaredAt?: string }

export interface OnboardingStep { key: string; done: boolean; at?: string }

export interface OnboardingResult {
  steps: OnboardingStep[]; done: boolean; completedAt?: string;
  pending: string[]; // step keys still missing
  rulesVersion: number; termsVersion: number;
}

const pad = (value: number): string => String(value).padStart(2, '0');

export function parseIso(dateString: string): Date {
  const [y, m, d] = String(dateString || '').split('-').map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(dateString: string, days: number): string {
  const date = parseIso(dateString);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function rangeDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = parseIso(start);
  const finish = parseIso(end);
  if (isNaN(cursor.getTime()) || isNaN(finish.getTime()) || finish < cursor) return dates;
  while (cursor <= finish) { dates.push(isoDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
}

export function monthKey(dateString: string): string {
  return String(dateString || '').slice(0, 7);
}

export function monthlyPeriods(start: string, end: string): string[] {
  const keys: string[] = [];
  const cursor = parseIso(start);
  const finish = parseIso(end);
  if (isNaN(cursor.getTime()) || isNaN(finish.getTime()) || finish < cursor) return keys;
  while (monthKey(isoDate(cursor)) <= monthKey(isoDate(finish))) {
    const key = monthKey(isoDate(cursor));
    if (!keys.includes(key)) keys.push(key);
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return keys;
}

export const defaultSchedule: WorkSchedule = {
  workingDays: [1, 2, 3, 4, 5], dailyHours: 8, weeklyHours: 40,
  startTime: '08:30', endTime: '17:00', paidLeaveDivisor: 26,
  holidayPremiumRate: 1.0, maxTeamAbsenceRatio: 0.5,
};

export function isWorkingDay(dateString: string, schedule: WorkSchedule = defaultSchedule): boolean {
  const days = schedule.workingDays?.length ? schedule.workingDays : [1, 2, 3, 4, 5];
  return days.includes(parseIso(dateString).getDay());
}

export function holidayMap(holidays: PublicHoliday[] = []): Map<string, PublicHoliday> {
  const map = new Map<string, PublicHoliday>();
  for (const holiday of holidays) if (holiday?.date) map.set(holiday.date, holiday);
  return map;
}

export function isPublicHoliday(dateString: string, holidays: PublicHoliday[] = []): PublicHoliday | null {
  return holidayMap(holidays).get(dateString) || null;
}

/** Working days inside an inclusive date range (weekends excluded). */
export function workingDaysBetween(start: string, end: string, schedule: WorkSchedule = defaultSchedule): number {
  return rangeDates(start, end).filter((date) => isWorkingDay(date, schedule)).length;
}

/** Working days minus public holidays falling on a working day (what actually gets deducted). */
export function paidWorkingDaysBetween(start: string, end: string, schedule: WorkSchedule = defaultSchedule, holidays: PublicHoliday[] = []): number {
  const map = holidayMap(holidays);
  return rangeDates(start, end).filter((date) => isWorkingDay(date, schedule) && !map.has(date)).length;
}

/** Split a leave range per payroll month → deductible working days per period. */
export function leaveDaysByPeriod(start: string, end: string, schedule: WorkSchedule = defaultSchedule, holidays: PublicHoliday[] = []): Record<string, number> {
  const map = holidayMap(holidays);
  const result: Record<string, number> = {};
  for (const date of rangeDates(start, end)) {
    if (!isWorkingDay(date, schedule) || map.has(date)) continue;
    const key = monthKey(date);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

export function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Algerian unpaid-absence rule: a monthly salary is prorated by the monthly
 * divisor (26 by default — the legal convention used for the 1-day indemnity)
 * and multiplied by the number of non-recovered working days.
 */
export function leaveDeduction(baseSalary: number, days: number, schedule: WorkSchedule = defaultSchedule): number {
  const divisor = Number(schedule.paidLeaveDivisor) > 0 ? Number(schedule.paidLeaveDivisor) : 26;
  return round2((Math.max(0, Number(baseSalary) || 0) / divisor) * Math.max(0, Number(days) || 0));
}

/** Extra pay for a worked public holiday (Algerian labour code: 100% increase). */
export function workedHolidayPremium(baseSalary: number, hours: number, schedule: WorkSchedule = defaultSchedule): number {
  const divisor = Number(schedule.paidLeaveDivisor) > 0 ? Number(schedule.paidLeaveDivisor) : 26;
  const dailyHours = Number(schedule.dailyHours) > 0 ? Number(schedule.dailyHours) : 8;
  const rate = schedule.holidayPremiumRate === undefined ? 1 : Math.max(0, Number(schedule.holidayPremiumRate));
  const hourly = (Math.max(0, Number(baseSalary) || 0) / divisor) / dailyHours;
  return round2(hourly * Math.max(0, Number(hours) || 0) * rate);
}

/** Statuses that block other requests on the same dates. */
const ACTIVE_STATUSES = ['approved', 'taken', 'validated', 'submitted'];

export interface ValidationContext {
  request: LeaveRequestLike;
  type?: LeaveType;
  leaveBalance?: number;            // employee remaining balance (may be null when not tracked)
  others?: LeaveRequestLike[];      // other employees' requests (for coverage)
  own?: LeaveRequestLike[];         // the employee's other requests (for overlaps)
  team?: { id: string; department: string }[]; // employee + team roster
  holidays?: PublicHoliday[];
  schedule?: WorkSchedule;
}

export function validateLeave(context: ValidationContext): ValidationAlert[] {
  const { request, type, leaveBalance, others = [], own = [], team = [], holidays = [], schedule = defaultSchedule } = context;
  const alerts: ValidationAlert[] = [];
  const start = parseIso(request.startDate);
  const end = parseIso(request.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    alerts.push({ severity: 'error', code: 'invalid_dates', title: { fr: 'Dates invalides', ar: 'تواريخ غير صالحة', en: 'Invalid dates' }, message: { fr: 'Veuillez saisir une date de début et une date de fin valides.', ar: 'يرجى إدخال تاريخ بداية وتاريخ نهاية صالحين.', en: 'Please enter a valid start and end date.' } });
    return alerts;
  }
  if (end < start) {
    alerts.push({ severity: 'error', code: 'end_before_start', title: { fr: 'Période incohérente', ar: 'فترة غير متسقة', en: 'Inconsistent period' }, message: { fr: 'La date de fin précède la date de début.', ar: 'تاريخ النهاية يسبق تاريخ البداية.', en: 'The end date is before the start date.' } });
    return alerts;
  }
  const range = rangeDates(request.startDate, request.endDate);
  const scheduleDays = workingDaysBetween(request.startDate, request.endDate, schedule);
  const holidayDates = range.filter((date) => holidayMap(holidays).has(date));
  const deductible = paidWorkingDaysBetween(request.startDate, request.endDate, schedule, holidays);
  const requestedDays = Number(request.durationDays) > 0 ? Number(request.durationDays) : deductible;

  if (holidayDates.length) {
    alerts.push({ severity: 'info', code: 'holidays_in_range', dates: holidayDates, title: { fr: 'Jours fériés inclus', ar: 'أيام العطل متضمنة', en: 'Public holidays included' }, message: { fr: `${holidayDates.length} jour(s) férié(s) algérien(s) inclus : ${holidayDates.join(', ')}. Ces jours ne seront pas décomptés du solde.`, ar: `يتضمن الطلب ${holidayDates.length} يوم عطلة رسمية جزائرية: ${holidayDates.join('، ')}. لن تُخصم هذه الأيام من الرصيد.`, en: `${holidayDates.length} Algerian public holiday(s) included: ${holidayDates.join(', ')}. These days will not be deducted from the balance.` } });
  }
  if (holidayDates.length && scheduleDays === 0) {
    alerts.push({ severity: 'info', code: 'holidays_only', title: { fr: 'Uniquement des jours fériés', ar: 'أيام عطل رسمية فقط', en: 'Public holidays only' }, message: { fr: 'La période sélectionnée ne contient que des jours fériés ou des week-ends : aucun congé ne sera décompté.', ar: 'الفترة المحددة تحتوي فقط على أيام عطل رسمية أو عطل نهاية الأسبوع: لن يُخصم أي يوم إجازة.', en: 'The selected period only contains public holidays or weekends: no leave day will be deducted.' } });
  }

  const overlappingOwn = own.filter((item) => item.id !== request.id && ACTIVE_STATUSES.includes(item.status || '') && rangeDates(item.startDate, item.endDate).some((date) => range.includes(date)));
  if (overlappingOwn.length) {
    alerts.push({ severity: 'warning', code: 'overlap_self', title: { fr: 'Chevauchement de congés', ar: 'تداخل في الإجازات', en: 'Overlapping leave' }, message: { fr: `Cette période chevauche ${overlappingOwn.length} autre(s) demande(s) du salarié (${overlappingOwn.map((item) => `${item.startDate} → ${item.endDate}`).join(' ; ')}).`, ar: `تتداخل هذه الفترة مع ${overlappingOwn.length} طلب(ات) أخرى للموظف (${overlappingOwn.map((item) => `${item.startDate} ← ${item.endDate}`).join(' ؛ ')})`, en: `This period overlaps ${overlappingOwn.length} other request(s) from the employee (${overlappingOwn.map((item) => `${item.startDate} → ${item.endDate}`).join('; ')}).` } });
  }

  if (type?.maxDaysPerRequest && requestedDays > Number(type.maxDaysPerRequest)) {
    alerts.push({ severity: 'warning', code: 'max_days_exceeded', title: { fr: 'Durée maximale dépassée', ar: 'تجاوز المدة القصوى', en: 'Maximum duration exceeded' }, message: { fr: `Ce type de congé est limité à ${type.maxDaysPerRequest} jour(s) par demande.`, ar: `هذا النوع من الإجازة محدود بـ ${type.maxDaysPerRequest} يوم في الطلب الواحد.`, en: `This leave type is limited to ${type.maxDaysPerRequest} day(s) per request.` } });
  }

  if (leaveBalance !== undefined && leaveBalance !== null && type?.deductsBalance !== false && requestedDays > Number(leaveBalance)) {
    const affordable = Math.max(0, Math.floor(Number(leaveBalance)));
    alerts.push({ severity: 'error', code: 'balance_exceeded', title: { fr: 'Solde de congés dépassé', ar: 'تجاوز رصيد الإجازات', en: 'Leave balance exceeded' }, message: { fr: `La demande porte sur ${requestedDays} jour(s) mais le solde restant est de ${leaveBalance} jour(s). Réduisez la période ou choisissez un congé sans solde.`, ar: `يغطي الطلب ${requestedDays} يوم لكن الرصيد المتبقي هو ${leaveBalance} يوم. قلّص المدة أو اختر إجازة بدون رصيد.`, en: `The request covers ${requestedDays} day(s) but the remaining balance is ${leaveBalance} day(s). Shorten the period or pick an unpaid leave.` }, dates: affordable > 0 ? [request.startDate, addDays(request.startDate, affordable - 1)] : [] });
  }

  // Team coverage: how many department colleagues are already away on each day.
  const department = team.find((member) => member.id === request.employeeId)?.department || '';
  const departmentSize = Math.max(1, team.filter((member) => member.department === department).length);
  const limit = Math.max(1, Math.ceil(departmentSize * (schedule.maxTeamAbsenceRatio ?? 0.5)));
  const busyDays: string[] = [];
  for (const date of range) {
    if (!isWorkingDay(date, schedule) || holidayMap(holidays).has(date)) continue;
    const away = others.filter((item) => item.employeeId !== request.employeeId && ACTIVE_STATUSES.includes(item.status || '') && date >= item.startDate && date <= item.endDate).length;
    const teamAway = others.filter((item) => item.employeeId !== request.employeeId && ACTIVE_STATUSES.includes(item.status || '') && team.find((member) => member.id === item.employeeId)?.department === department && date >= item.startDate && date <= item.endDate).length;
    if (away > 0) busyDays.push(date);
    if (teamAway >= limit) {
      alerts.push({ severity: 'warning', code: 'team_coverage', dates: [date], title: { fr: 'Couverture d’équipe insuffisante', ar: 'تغطية الفريق غير كافية', en: 'Insufficient team coverage' }, message: { fr: `Le ${date}, ${teamAway} collaborateur(s) du département « ${department || '—'} » sont déjà en congé (seuil ${limit}). Envisagez une date alternative.`, ar: `في ${date}، يوجد ${teamAway} زميل من قسم « ${department || '—'} » في إجازة (الحد ${limit}). يُنصح بتاريخ بديل.`, en: `On ${date}, ${teamAway} colleague(s) from the “${department || '—'}” department are already away (limit ${limit}). Consider an alternative date.` } });
      break;
    }
  }
  if (busyDays.length && !alerts.some((alert) => alert.code === 'team_coverage')) {
    alerts.push({ severity: 'info', code: 'some_overlaps', dates: busyDays, title: { fr: 'Congés croisés', ar: 'إجازات متقاطعة', en: 'Crossed leaves' }, message: { fr: `${busyDays.length} jour(s) coïncident avec le congé d’autres collaborateurs : ${busyDays.slice(0, 5).join(', ')}${busyDays.length > 5 ? '…' : ''}.`, ar: `يتزامن ${busyDays.length} يوم مع إجازات زملاء آخرين: ${busyDays.slice(0, 5).join('، ')}${busyDays.length > 5 ? '…' : ''}`, en: `${busyDays.length} day(s) coincide with other employees’ leave: ${busyDays.slice(0, 5).join(', ')}${busyDays.length > 5 ? '…' : ''}.` } });
  }

  if (type && type.isPaid === false) {
    alerts.push({ severity: 'info', code: 'unpaid_adjustment', title: { fr: 'Ajustement de paie automatique', ar: 'تسوية الراتب تلقائيًا', en: 'Automatic payroll adjustment' }, message: { fr: `Ce congé sans solde déduira ${deductible} jour(s) ouvrable(s) de la fiche de paie (${monthlyPeriods(request.startDate, request.endDate).join(', ')}).`, ar: `ستُخصم هذه الإجازة غير المدفوعة ${deductible} يوم عمل من قسيمة الراتب (${monthlyPeriods(request.startDate, request.endDate).join('، ')})`, en: `This unpaid leave will deduct ${deductible} working day(s) from the payslip (${monthlyPeriods(request.startDate, request.endDate).join(', ')}).` } });
  }
  return alerts;
}

export interface SuggestionContext {
  employeeId: string;
  durationDays: number;
  fromDate: string;
  toDate: string;
  others?: LeaveRequestLike[];
  own?: LeaveRequestLike[];
  team?: { id: string; department: string }[];
  holidays?: PublicHoliday[];
  schedule?: WorkSchedule;
  maxResults?: number;
}

/** Proposes suitable leave windows based on team coverage, bookings and holidays. */
export function suggestLeaveDates(context: SuggestionContext): Suggestion[] {
  const { employeeId, durationDays, fromDate, toDate, others = [], own = [], team = [], holidays = [], schedule = defaultSchedule, maxResults = 3 } = context;
  const candidates: Suggestion[] = [];
  const map = holidayMap(holidays);
  const department = team.find((member) => member.id === employeeId)?.department || '';
  const departmentSize = Math.max(1, team.filter((member) => member.department === department).length);
  const ownRanges = own.filter((item) => ACTIVE_STATUSES.includes(item.status || '')).map((item) => rangeDates(item.startDate, item.endDate));
  const occupiedByOthers = (date: string): number => others.filter((item) => item.employeeId !== employeeId && ACTIVE_STATUSES.includes(item.status || '') && date >= item.startDate && date <= item.endDate).length;

  const start = parseIso(fromDate);
  const finish = parseIso(toDate);
  const horizon = Math.min(365 * 2, Math.max(7, Math.round((finish.getTime() - start.getTime()) / 86400000)));
  for (let offset = 0; offset <= horizon - durationDays + 1; offset++) {
    const candidateStart = addDays(fromDate, offset);
    const candidateEnd = addDays(candidateStart, durationDays - 1);
    if (candidateEnd > toDate) break;
    const range = rangeDates(candidateStart, candidateEnd);
    const conflicts = ownRanges.some((ownRange) => ownRange.some((date) => range.includes(date)));
    if (conflicts) continue;
    const working = range.filter((date) => isWorkingDay(date, schedule)).length;
    if (!working) continue;
    const holidayCount = range.filter((date) => map.has(date)).length;
    const holidayNames = range.filter((date) => map.has(date)).map((date) => map.get(date)!.name?.fr || date);
    let worstAbsence = 0;
    let conflictDays = 0;
    for (const date of range) {
      const away = occupiedByOthers(date);
      if (away > 0) conflictDays++;
      worstAbsence = Math.max(worstAbsence, away);
    }
    // Adjacent-holiday bridge bonus: range touching a holiday on either side.
    const bridge = (map.has(addDays(candidateStart, -1)) || map.has(addDays(candidateEnd, 1))) ? 1 : 0;
    const score = Math.max(0, 10 - worstAbsence * 3 - Math.min(conflictDays, 3) * 0.5 + bridge * 1.5 - holidayCount * 0.2);
    const reasons: I18nText[] = [];
    if (worstAbsence === 0 && conflictDays === 0) reasons.push({ fr: 'Couverture d’équipe optimale : aucun autre congé sur ces dates.', ar: 'تغطية مثالية للفريق: لا توجد إجازات أخرى في هذه التواريخ.', en: 'Optimal team coverage: no other leave on these dates.' });
    if (bridge) reasons.push({ fr: 'Effet « pont » : la période touche un jour férié algérien.', ar: 'أثر « الجسر »: الفترة تلامس عطلة رسمية جزائرية.', en: 'Bridge effect: the window touches an Algerian public holiday.' });
    if (holidayCount) reasons.push({ fr: `Inclut ${holidayCount} jour(s) férié(s) : ${holidayNames.join(', ')} (non décomptés).`, ar: `يتضمن ${holidayCount} يوم عطلة رسمية: ${holidayNames.join('، ')} (غير مخصومة).`, en: `Includes ${holidayCount} public holiday(s): ${holidayNames.join(', ')} (not deducted).` });
    if (departmentSize > 1) reasons.push({ fr: `Département « ${department} » : ${departmentSize} collaborateur(s), marge de couverture préservée.`, ar: `قسم « ${department} »: ${departmentSize} موظف، مع الحفاظ على هامش التغطية.`, en: `Department “${department}”: ${departmentSize} employee(s), coverage margin preserved.` });
    candidates.push({ startDate: candidateStart, endDate: candidateEnd, durationDays, workingDays: working - holidayCount, publicHolidays: holidayCount, score: round2(score), reasons });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, Math.max(1, maxResults));
}

/** How much of the balance a request would consume (deductible working days). */
export function consumedBalance(request: LeaveRequestLike, schedule: WorkSchedule = defaultSchedule, holidays: PublicHoliday[] = []): number {
  return paidWorkingDaysBetween(request.startDate, request.endDate, schedule, holidays);
}

/**
 * Algerian "pigiste / travail occasionnel" rules: no CNAS registration, IRG
 * withheld at source on the gross amount (retention rate configurable on the
 * payment type, default 15% for occasional non-salaried services), net paid
 * after withholding.
 */
export interface PieceworkPaymentType {
  irgWithholdingRate?: number;
  cnasApplicable?: boolean;
  name?: I18nText;
}

export function pieceworkCalculation(amount: number, paymentType: PieceworkPaymentType = {}): { gross: number; irgRate: number; irgAmount: number; cnasAmount: number; net: number } {
  const gross = Math.max(0, Number(amount) || 0);
  const irgRate = paymentType.irgWithholdingRate === undefined ? 0.15 : Math.max(0, Number(paymentType.irgWithholdingRate) || 0);
  const irgAmount = round2(gross * irgRate);
  const cnasAmount = paymentType.cnasApplicable ? 0 : 0;
  return { gross, irgRate, irgAmount, cnasAmount, net: round2(gross - irgAmount) };
}

const stepKeys = ['rules_read', 'rules_accepted', 'terms_accepted', 'contract_signed', 'conflict_declared'] as const;

export interface OnboardingContext {
  employeeId: string;
  acceptances?: RuleAcceptance[];
  contracts?: { id?: string; employeeId?: string; status?: string; signedAt?: string }[];
  declarations?: ConflictDeclaration[];
  rulesVersion?: number;
  termsVersion?: number;
}

/** Computes the guided onboarding completion (Section 304.4). */
export function computeOnboarding(context: OnboardingContext): OnboardingResult {
  const { employeeId, acceptances = [], contracts = [], declarations = [], rulesVersion = 1, termsVersion = 1 } = context;
  const find = (kind: RuleAcceptance['kind']) => acceptances.find((item) => item.employeeId === employeeId && item.kind === kind && (kind === 'rules' ? (Number(item.version) || 0) >= (Number(rulesVersion) || 1) : kind === 'terms' ? (Number(item.version) || 0) >= (Number(termsVersion) || 1) : true));
  const read = acceptances.find((item) => item.employeeId === employeeId && item.kind === 'rules_read');
  const rulesAccepted = find('rules');
  const termsAccepted = find('terms');
  const contract = contracts.find((item) => item.employeeId === employeeId && item.status === 'signed');
  const declaration = declarations.find((item) => item.employeeId === employeeId);
  const steps: OnboardingStep[] = [
    { key: 'rules_read', done: Boolean(read), at: read?.acceptedAt },
    { key: 'rules_accepted', done: Boolean(rulesAccepted), at: rulesAccepted?.acceptedAt },
    { key: 'terms_accepted', done: Boolean(termsAccepted), at: termsAccepted?.acceptedAt },
    { key: 'contract_signed', done: Boolean(contract), at: contract?.signedAt },
    { key: 'conflict_declared', done: Boolean(declaration), at: declaration?.declaredAt },
  ];
  const pending = steps.filter((step) => !step.done).map((step) => step.key);
  const completedAt = steps.every((step) => step.done) ? steps.map((step) => step.at).filter(Boolean).sort().pop() : undefined;
  return { steps, done: pending.length === 0, completedAt, pending, rulesVersion, termsVersion };
}

export const leaveEngine = {
  parseIso, isoDate, addDays, rangeDates, monthKey, monthlyPeriods,
  isWorkingDay, holidayMap, isPublicHoliday,
  workingDaysBetween, paidWorkingDaysBetween, leaveDaysByPeriod,
  round2, leaveDeduction, workedHolidayPremium,
  validateLeave, suggestLeaveDates, consumedBalance,
  pieceworkCalculation, computeOnboarding, defaultSchedule, stepKeys,
};
