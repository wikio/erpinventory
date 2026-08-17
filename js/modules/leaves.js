/**
 * SARI Système — Leave & Public Holiday Manager (Sections 300–302).
 * Configurable CRUD for leave types and Algerian public holidays, live alerts
 * and smart date suggestions, working-days/hours configuration, payment-type
 * configuration, employee leave calendar + comparison views, worked-holiday
 * overrides and automatic payslip adjustments (Section 299 integration).
 */
const LeaveModule = {
  state: {
    tab: 'requests', employees: [], types: [], holidays: [], records: [], worked: [],
    payslips: [], salaryHistory: [], attendance: [], paymentTypes: [],
    schedule: null, settings: {}, month: new Date().toISOString().slice(0, 7),
    compareMonth: new Date().toISOString().slice(0, 7), holidayYear: String(new Date().getFullYear()),
    employee: 'all', status: 'all', type: 'all', query: '', editing: null, editingOld: null,
    suggestions: [], alerts: [],
  },
  t(key, fallback) { return i18n.t(key, fallback); },
  canWrite() { return auth.can('leaves', 'edit'); },

  async load() {
    const [employees, types, holidays, records, worked, payslips, salaryHistory, attendance, paymentTypes, settings] = await Promise.all([
      'employees', 'leaveTypes', 'publicHolidays', 'leaveRequests', 'workedHolidays',
      'payslips', 'salaryHistory', 'attendance', 'paymentTypes', 'settings'
    ].map((store) => sariDB.getAll(store)));
    Object.assign(this.state, { employees, types, holidays, records, worked, payslips, salaryHistory, attendance, paymentTypes, settings });
    this.state.schedule = await sariDB.getById('settings', 'work-schedule') || {};
    const merged = { ...window.SariCore.leave.defaultSchedule, ...(this.state.schedule || {}) };
    this.state.schedule = merged;
    this.reconcileAdjustments().catch((error) => console.warn('[Leave] reconcile failed', error));
  },

  employee(id) { return this.state.employees.find((item) => item.id === id); },
  employeeName(id) { const employee = this.employee(id); return employee ? `${employee.firstName} ${employee.lastName}` : id || '—'; },
  type(id) { return this.state.types.find((item) => item.id === id); },
  typeName(id) { const type = this.type(id); return type ? (type.name?.[i18n.currentLang] || type.name?.fr || type.code) : id || '—'; },
  typeColor(id) { return this.type(id)?.color || '#94A3B8'; },
  holiday(date) { return this.state.holidays.find((item) => item.date === date); },

  async render(containerId = 'sari-main-view') {
    const c = document.getElementById(containerId); if (!c) return;
    await this.load();
    const canWrite = this.canWrite();
    const tabs = [
      ['requests', 'calendar-clock', 'leaveRequests'],
      ['calendar', 'calendar-days', 'leaveCalendar'],
      ['comparison', 'users-round', 'leaveComparison'],
      ['types', 'list-todo', 'leaveTypesLabel'],
      ['holidays', 'party-popper', 'publicHolidays'],
      ['configuration', 'settings-2', 'leaveConfiguration'],
    ];
    c.innerHTML = `<div class="space-y-5">
      <section class="sari-tile p-5 sari-grid-pattern flex flex-col md:flex-row justify-between gap-4">
        <div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('hrLeaveBadge', 'Ressources humaines • Congés')}</span>
          <h2 class="text-2xl font-extrabold mt-2 flex items-center gap-2"><i data-lucide="calendar-clock" class="text-sari-blue"></i>${this.t('leaveManager', 'Gestionnaire des congés & jours fériés')}</h2>
          <p class="text-sm text-slate-500">${this.t('leaveManagerDescription', 'Congés, calendrier des jours fériés algériens, couverture d’équipe, suggestions intelligentes et ajustements automatiques de paie.')}</p></div>
        <div class="grid grid-cols-3 gap-2 text-center">${[
          [this.state.records.filter((r) => ['submitted', 'approved', 'taken'].includes(r.status)).length, this.t('activeLeaveRequests', 'Congés actifs')],
          [this.state.holidays.filter((h) => String(h.date).startsWith(this.state.holidayYear)).length, this.t('holidaysThisYear', 'Jours fériés')],
          [this.state.employees.filter((e) => e.status === 'active').length, this.t('trackedEmployees', 'Salariés suivis')],
        ].map(([value, label]) => `<div class="p-3 bg-white/80 dark:bg-slate-800 rounded-xl border"><b class="text-xl text-sari-blue">${value}</b><small class="block">${label}</small></div>`).join('')}</div>
      </section>
      <nav class="sari-tile p-2 flex flex-wrap gap-2">${tabs.map(([tab, icon, key]) => `<button onclick="LeaveModule.setTab('${tab}')" class="sari-btn px-4 py-2 text-xs ${this.state.tab === tab ? 'bg-sari-blue text-white' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}"><i data-lucide="${icon}" class="w-4 h-4"></i>${this.t(key, key)}</button>`).join('')}</nav>
      ${this.tabHtml(canWrite)}
      <div id="leave-modal"></div>
    </div>`;
    window.SariIcons?.hydrate(); app.enhanceSearchInputs();
  },
  setTab(tab) { this.state.tab = tab; this.render(); },

  tabHtml(canWrite) {
    const map = {
      requests: () => this.requestsHtml(canWrite),
      calendar: () => this.calendarHtml(),
      comparison: () => this.comparisonHtml(),
      types: () => this.typesHtml(canWrite),
      holidays: () => this.holidaysHtml(canWrite),
      configuration: () => this.configurationHtml(canWrite),
    };
    return (map[this.state.tab] || map.requests)();
  },

  /* ────────────────────────────── 300.1 Requests list ────────────────────────────── */
  statusLabel(status) {
    const labels = {
      draft: { fr: 'Brouillon', ar: 'مسودة', en: 'Draft' }, submitted: { fr: 'Soumise', ar: 'مقدمة', en: 'Submitted' },
      approved: { fr: 'Approuvée', ar: 'مقبولة', en: 'Approved' }, rejected: { fr: 'Rejetée', ar: 'مرفوضة', en: 'Rejected' },
      cancelled: { fr: 'Annulée', ar: 'ملغاة', en: 'Cancelled' }, taken: { fr: 'Prise', ar: 'مستفادة', en: 'Taken' },
    };
    return labels[status]?.[i18n.currentLang] || labels[status]?.fr || status || '—';
  },
  statusBadge(status) {
    const colors = { draft: 'text-slate-600', submitted: 'text-sari-amber', approved: 'text-green-600', rejected: 'text-red-600', cancelled: 'text-slate-400', taken: 'text-sari-blue' };
    return `<span class="sari-badge ${colors[status] || ''}">${SariUtils.escapeHtml(this.statusLabel(status))}</span>`;
  },
  requestsHtml(canWrite) {
    const rows = window.SariCore.ordering.stableOrder(this.state.records).filter((record) =>
      (this.state.employee === 'all' || record.employeeId === this.state.employee)
      && (this.state.status === 'all' || record.status === this.state.status)
      && (this.state.type === 'all' || record.typeId === this.state.type)
      && SariUtils.matchesAdvancedSearch(record, this.state.query, ['employeeName', 'referenceCode', 'reason', 'department', 'status']));
    return `<div class="space-y-4">
      <section class="sari-tile p-4 grid md:grid-cols-[1fr_200px_180px_180px] gap-2">
        <input class="doc-input" value="${SariUtils.escapeHtml(this.state.query)}" oninput="LeaveModule.state.query=this.value" onkeydown="SariUtils.searchKeyHandler(event,()=>LeaveModule.render())" placeholder="${this.t('searchLeave', 'Rechercher un congé, un salarié, un motif')}">
        <select class="doc-input" onchange="LeaveModule.state.employee=this.value;LeaveModule.render()"><option value="all">${this.t('allEmployees', 'Tous les salariés')}</option>${this.state.employees.map((employee) => `<option value="${employee.id}" ${this.state.employee === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</option>`).join('')}</select>
        <select class="doc-input" onchange="LeaveModule.state.type=this.value;LeaveModule.render()"><option value="all">${this.t('allLeaveTypes', 'Tous les types')}</option>${this.state.types.map((type) => `<option value="${type.id}" ${this.state.type === type.id ? 'selected' : ''}>${SariUtils.escapeHtml(this.typeName(type.id))}</option>`).join('')}</select>
        <select class="doc-input" onchange="LeaveModule.state.status=this.value;LeaveModule.render()"><option value="all">${this.t('allStatuses', 'Tous les statuts')}</option>${['draft', 'submitted', 'approved', 'taken', 'rejected', 'cancelled'].map((status) => `<option value="${status}" ${this.state.status === status ? 'selected' : ''}>${this.statusLabel(status)}</option>`).join('')}</select>
      </section>
      ${canWrite ? `<button onclick="LeaveModule.openEditor()" class="sari-btn px-4 py-2 bg-sari-blue text-white"><i data-lucide="plus"></i>${this.t('newLeaveRequest', 'Nouvelle demande de congé')}</button>` : ''}
      <section class="sari-tile overflow-x-auto"><table class="w-full sari-table"><thead><tr>
        <th>${this.t('orderLabel', 'Ordre')}</th><th>${this.t('reference', 'Référence')}</th><th>${this.t('employee', 'Salarié')}</th><th>${this.t('leaveType', 'Type')}</th><th>${this.t('leavePeriod', 'Période')}</th><th>${this.t('durationDays', 'Jours')}</th><th>${this.t('balanceAfter', 'Solde après')}</th><th>${this.t('payrollImpact', 'Impact paie')}</th><th>${this.t('status', 'Statut')}</th><th>${this.t('actionsHeader', 'Actions')}</th>
      </tr></thead><tbody>${rows.map((record) => {
        const paid = record.isPaid !== false;
        const impact = paid ? `<span class="sari-badge text-slate-500">${this.t('paidNoDeduction', 'Payé — sans retenue')}</span>` : `<span class="sari-badge text-red-600">${this.t('unpaidDeduction', 'Retenue')} ${i18n.formatCurrency(record.deductionAmount || 0)}</span>`;
        return `<tr><td class="text-center font-mono-tech text-sari-blue">${record.order || '—'}</td>
        <td class="font-mono-tech text-sari-blue font-bold">${record.referenceCode || record.id}</td>
        <td><b>${SariUtils.escapeHtml(record.employeeName || this.employeeName(record.employeeId))}</b><small class="block">${SariUtils.escapeHtml(record.department || '')}</small></td>
        <td><span class="sari-badge" style="background:${this.typeColor(record.typeId)}22;color:${this.typeColor(record.typeId)}">${SariUtils.escapeHtml(this.typeName(record.typeId))}</span></td>
        <td class="font-mono-tech text-xs">${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)}</td>
        <td class="font-bold">${record.durationDays ?? window.SariCore.leave.paidWorkingDaysBetween(record.startDate, record.endDate, this.state.schedule, this.state.holidays)}</td>
        <td class="font-mono-tech">${this.balanceAfter(record)}</td><td>${impact}</td><td>${this.statusBadge(record.status)}</td>
        <td><div class="flex flex-wrap gap-1"><button onclick="LeaveModule.viewRequest('${record.id}')" class="doc-action">${this.t('view', 'Voir')}</button><button onclick="DocumentManager.open('leaveRequest','${record.id}','${SariUtils.escapeHtml(record.referenceCode || record.id)}')" class="doc-action">GED</button>${canWrite ? `<button onclick="LeaveModule.openEditor('${record.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="LeaveModule.removeRequest('${record.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</div></td></tr>`;
      }).join('') || `<tr><td colspan="10" class="p-8 text-slate-400">${this.t('noLeaveRequest', 'Aucune demande de congé.')}</td></tr>`}</tbody></table></section>
    </div>`;
  },

  /* ─────────────────────────── 300.1 Payslip auto-adjustment ─────────────────────────── */
  leaveBalanceUsed(employeeId, year) {
    return this.state.records.filter((record) => record.employeeId === employeeId && this.type(record.typeId)?.deductsBalance !== false && ['approved', 'taken'].includes(record.status) && String(record.startDate).startsWith(String(year))).reduce((sum, record) => sum + (Number(record.durationDays) || window.SariCore.leave.paidWorkingDaysBetween(record.startDate, record.endDate, this.state.schedule, this.state.holidays) || 0), 0);
  },
  balanceFor(employeeId, typeId) {
    const type = this.type(typeId); if (!type || type.deductsBalance === false || !Number(type.daysPerYear)) return null;
    const used = this.leaveBalanceUsed(employeeId, new Date().getFullYear());
    return Math.max(0, Number(type.daysPerYear) - used);
  },
  balanceAfter(record) {
    const balance = this.balanceFor(record.employeeId, record.typeId);
    return balance === null ? '—' : `${balance} ${this.t('daysShort', 'j')}`;
  },

  latestSalary(employeeId, period) {
    const date = `${period || new Date().toISOString().slice(0, 7)}-28`;
    return [...this.state.salaryHistory].filter((item) => item.employeeId === employeeId && (!item.date || new Date(item.date) <= new Date(date))).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  },
  payslipFor(employeeId, period) {
    return this.state.payslips.find((record) => record.employeeId === employeeId && record.period === period);
  },
  async ensurePayslip(employeeId, period) {
    let payslip = this.payslipFor(employeeId, period);
    if (!payslip) {
      const employee = this.employee(employeeId) || {};
      const salary = this.latestSalary(employeeId, period);
      const baseSalary = Number(salary?.newAmount ?? employee.salary ?? 0);
      const calc = window.SariCore.payroll.calculatePayslip({ baseSalary });
      const [year, month] = period.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const monthWorkingDays = window.SariCore.leave.paidWorkingDaysBetween(`${period}-01`, `${period}-${String(lastDay).padStart(2, '0')}`, this.state.schedule, this.state.holidays);
      const dailyHours = Number(this.state.schedule?.dailyHours) || 8;
      payslip = {
        id: `payslip-${crypto.randomUUID()}`, employeeId, employeeName: this.employeeName(employeeId),
        employeeReference: employee.referenceCode || employeeId, period, status: 'draft',
        workedDays: monthWorkingDays,
        workedHours: Math.round(monthWorkingDays * dailyHours * 100) / 100, leaveBalance: this.balanceFor(employeeId, 'lt-annual') ?? 0,
        paymentMethod: 'bank_transfer', paymentDate: `${period}-28`, baseSalary,
        seniorityAllowance: 0, performanceBonus: 0, otherBonuses: 0, transportAllowance: 0,
        housingAllowance: 0, mealAllowance: 0, overtimeAmount: 0, otherAllowances: 0,
        advances: 0, loans: 0, otherDeductions: 0, leaveDeductions: 0, workedHolidayAmount: 0,
        leaveAdjustments: [], workedHolidays: [], ...calc,
        notesHtml: `<p>${this.t('payslipCreatedFromLeave', 'Fiche créée automatiquement suite à un congé / jour férié travaillé.')}</p>`,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await sariDB.save('payslips', payslip);
      if (!this.state.payslips.some((item) => item.id === payslip.id)) this.state.payslips.push(payslip);
    }
    return payslip;
  },
  /** Rebuild every leave/holiday derived adjustment on all payslips (idempotent, concurrency-safe). */
  reconcileAdjustments() {
    if (this.reconcilePromise) return this.reconcilePromise;
    this.reconcilePromise = this.doReconcile().finally(() => { this.reconcilePromise = null; });
    return this.reconcilePromise;
  },
  async doReconcile() {
    const engine = window.SariCore.leave;
    if (!engine) return;
    const activeLeaves = this.state.records.filter((record) => ['approved', 'taken'].includes(record.status));
    const activeWorked = this.state.worked.filter((record) => record.status !== 'cancelled');
    const touched = new Set();
    // 1. Strip previously derived data.
    for (const payslip of this.state.payslips) {
      const before = JSON.stringify({ la: payslip.leaveAdjustments, ld: payslip.leaveDeductions, wh: payslip.workedHolidays, wha: payslip.workedHolidayAmount });
      payslip.leaveAdjustments = []; payslip.leaveDeductions = 0; payslip.workedHolidays = []; payslip.workedHolidayAmount = 0;
      if (before !== JSON.stringify({ la: [], ld: 0, wh: [], wha: 0 })) touched.add(payslip.id);
    }
    // 2. Remove derived attendance rows.
    for (const row of this.state.attendance.filter((item) => String(item.id).startsWith('att-leave-') || String(item.id).startsWith('att-holiday-'))) {
      await sariDB.delete('attendance', row.id);
      this.state.attendance = this.state.attendance.filter((item) => item.id !== row.id);
    }
    // 3. Re-apply every active leave.
    const applied = [];
    for (const leave of activeLeaves) {
      const type = this.type(leave.typeId);
      const unpaid = leave.isPaid === false || type?.isPaid === false;
      const byPeriod = engine.leaveDaysByPeriod(leave.startDate, leave.endDate, this.state.schedule, this.state.holidays);
      let deductionTotal = 0;
      for (const [period, days] of Object.entries(byPeriod)) {
        const payslip = await this.ensurePayslip(leave.employeeId, period);
        let amount = 0;
        if (unpaid) {
          const salary = this.latestSalary(leave.employeeId, period);
          const base = Number(salary?.newAmount ?? this.employee(leave.employeeId)?.salary ?? payslip.baseSalary ?? 0);
          amount = engine.leaveDeduction(base, days, this.state.schedule);
          deductionTotal += amount;
        }
        payslip.leaveAdjustments = payslip.leaveAdjustments || [];
        payslip.leaveAdjustments.push({
          leaveId: leave.id, kind: unpaid ? 'unpaid' : 'paid', label: this.typeName(leave.typeId),
          days, amount, period,
        });
        if (unpaid) {
          payslip.leaveDeductions = engine.round2((Number(payslip.leaveDeductions) || 0) + amount);
          payslip.workedDays = Math.max(0, Number(payslip.workedDays || 0) - days);
        }
        touched.add(payslip.id);
      }
      if (unpaid) {
        leave.deductionAmount = engine.round2(deductionTotal);
        leave.adjustedPeriods = Object.keys(byPeriod);
        await sariDB.save('leaveRequests', leave);
      }
      for (const date of engine.rangeDates(leave.startDate, leave.endDate)) {
        if (!engine.isWorkingDay(date, this.state.schedule) || engine.holidayMap(this.state.holidays).has(date)) continue;
        const row = { id: `att-leave-${leave.id}-${date}`, employeeId: leave.employeeId, date, status: 'leave', clockIn: '', clockOut: '', notes: `${this.typeName(leave.typeId)} (${leave.referenceCode || leave.id})` };
        await sariDB.save('attendance', row); if (!this.state.attendance.some((item) => item.id === row.id)) this.state.attendance.push(row);
      }
      applied.push(`${this.employeeName(leave.employeeId)} • ${i18n.formatDate(leave.startDate)} → ${i18n.formatDate(leave.endDate)}`);
    }
    // 4. Re-apply worked holidays (premium earning + present attendance).
    for (const worked of activeWorked) {
      const holiday = this.state.holidays.find((item) => item.id === worked.holidayId) || {};
      const period = engine.monthKey(worked.date || holiday.date);
      const payslip = await this.ensurePayslip(worked.employeeId, period);
      const salary = this.latestSalary(worked.employeeId, period);
      const base = Number(salary?.newAmount ?? this.employee(worked.employeeId)?.salary ?? payslip.baseSalary ?? 0);
      const hours = Number(worked.hours) || Number(this.state.schedule.dailyHours) || 8;
      const amount = engine.workedHolidayPremium(base, hours, this.state.schedule);
      payslip.workedHolidays = payslip.workedHolidays || [];
      payslip.workedHolidays.push({ workedHolidayId: worked.id, holidayId: worked.holidayId, date: worked.date || holiday.date, hours, amount });
      payslip.workedHolidayAmount = engine.round2((Number(payslip.workedHolidayAmount) || 0) + amount);
      payslip.workedDays = Number(payslip.workedDays || 0) + 1;
      touched.add(payslip.id);
      const row = { id: `att-holiday-${worked.id}`, employeeId: worked.employeeId, date: worked.date || holiday.date, status: 'present', clockIn: this.state.schedule.startTime || '08:00', clockOut: this.state.schedule.endTime || '17:00', notes: `${this.t('workedHoliday', 'Jour férié travaillé')} — ${holiday.name?.fr || worked.holidayId}` };
      await sariDB.save('attendance', row); if (!this.state.attendance.some((item) => item.id === row.id)) this.state.attendance.push(row);
    }
    // 5. Recalculate touched payslips.
    for (const payslip of this.state.payslips) {
      if (!touched.has(payslip.id)) continue;
      const calc = window.SariCore.payroll.calculatePayslip({
        baseSalary: payslip.baseSalary, seniorityAllowance: payslip.seniorityAllowance, performanceBonus: payslip.performanceBonus,
        otherBonuses: payslip.otherBonuses, transportAllowance: payslip.transportAllowance, housingAllowance: payslip.housingAllowance,
        mealAllowance: payslip.mealAllowance, overtimeAmount: payslip.overtimeAmount, otherAllowances: payslip.otherAllowances,
        cnasEmployee: payslip.cnasEmployee, cnasEmployer: payslip.cnasEmployer, irgAmount: payslip.irgAmount,
        advances: payslip.advances, loans: payslip.loans, otherDeductions: payslip.otherDeductions,
        leaveDeductions: payslip.leaveDeductions, workedHolidayAmount: payslip.workedHolidayAmount,
      });
      Object.assign(payslip, calc, { updatedAt: new Date().toISOString() });
      await sariDB.save('payslips', payslip);
    }
    if (applied.length) app.showToast(`${this.t('payslipsAdjusted', 'Fiches de paie ajustées')} : ${applied.length} ${this.t('leaveRecordsAdjusted', 'congé(s) recalculé(s).')}`, 'success');
  },

  /* ──────────────────── 300.2 Editor with live alerts & suggestions ──────────────────── */
  async openEditor(id = '', preset = null) {
    const record = id ? await sariDB.getById('leaveRequests', id) : (preset || {});
    this.state.editing = { ...record };
    this.state.editingOld = { ...record };
    this.state.suggestions = []; this.state.alerts = [];
    const modal = document.getElementById('leave-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3">
      <form onsubmit="LeaveModule.saveRequest(event)" class="sari-tile w-full max-w-5xl max-h-[95vh] overflow-y-auto p-6">
        <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${this.t('leaveRequest', 'Demande de congé')}</span>
          <h3 class="text-xl font-extrabold mt-2">${id ? this.t('editLeaveRequest', 'Modifier la demande') : this.t('newLeaveRequest', 'Nouvelle demande de congé')}</h3></div>
          <button type="button" onclick="LeaveModule.closeEditor()"><i data-lucide="x"></i></button></header>
        <div class="grid lg:grid-cols-[1fr_360px] gap-5 mt-4">
          <div class="space-y-4">
            <div class="grid md:grid-cols-2 gap-3">
              <label class="doc-label">${this.t('employee', 'Salarié')} *
                <select id="lv-employee" class="doc-input" required onchange="LeaveModule.refreshValidation()">${this.state.employees.map((employee) => `<option value="${employee.id}" ${this.state.editing.employeeId === employee.id ? 'selected' : ''}>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)} — ${SariUtils.escapeHtml(employee.department || '')}</option>`).join('')}</select></label>
              <label class="doc-label">${this.t('leaveType', 'Type de congé')} *
                <select id="lv-type" class="doc-input" required onchange="LeaveModule.onTypeChange()">${this.state.types.filter((type) => type.isActive !== false).map((type) => `<option value="${type.id}" ${this.state.editing.typeId === type.id ? 'selected' : ''}>${SariUtils.escapeHtml(this.typeName(type.id))}</option>`).join('')}</select></label>
              <label class="doc-label">${this.t('startDate', 'Date début')} *
                <input id="lv-start" type="date" class="doc-input" value="${this.state.editing.startDate || ''}" required onchange="LeaveModule.refreshValidation()"></label>
              <label class="doc-label">${this.t('endDate', 'Date fin')} *
                <input id="lv-end" type="date" class="doc-input" value="${this.state.editing.endDate || ''}" required onchange="LeaveModule.refreshValidation()"></label>
              <label class="doc-label">${this.t('durationDays', 'Jours ouvrés décomptés')}<input id="lv-duration" type="number" min="0" step="0.5" class="doc-input" value="${this.state.editing.durationDays ?? ''}" onchange="LeaveModule.refreshValidation()"></label>
              <label class="doc-label">${this.t('status', 'Statut')}
                <select id="lv-status" class="doc-input" onchange="LeaveModule.refreshValidation()">${['draft', 'submitted', 'approved', 'taken', 'rejected', 'cancelled'].map((status) => `<option value="${status}" ${this.state.editing.status === status ? 'selected' : ''}>${this.statusLabel(status)}</option>`).join('')}</select></label>
              <label class="doc-label flex items-center gap-2 pt-4"><input id="lv-paid" type="checkbox" ${this.state.editing.isPaid !== false ? 'checked' : ''} onchange="LeaveModule.refreshValidation()"> ${this.t('paidLeave', 'Congé payé (aucune retenue de salaire)')}</label>
              <label class="doc-label">${this.t('justification', 'Justificatif / motif')} <textarea id="lv-reason" class="doc-input" rows="2">${SariUtils.escapeHtml(this.state.editing.reason || '')}</textarea></label>
            </div>
            <div id="lv-alerts" class="space-y-2"></div>
          </div>
          <aside class="space-y-3">
            <section class="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800/60"><h4 class="font-extrabold text-sm flex gap-2"><i data-lucide="lightbulb" class="text-sari-amber"></i>${this.t('smartSuggestions', 'Suggestions intelligentes')}</h4>
              <p class="text-[10px] text-slate-500 mt-1">${this.t('suggestionsHelp', 'Dates proposées selon la couverture d’équipe, les congés existants et les jours fériés algériens.')}</p>
              <button type="button" onclick="LeaveModule.buildSuggestions()" class="sari-btn w-full px-3 py-2 mt-3 bg-sari-lime text-slate-900 text-xs">${this.t('generateSuggestions', 'Proposer des dates')}</button>
              <div id="lv-suggestions" class="space-y-2 mt-3"></div></section>
            <section class="p-4 border rounded-xl"><h4 class="font-extrabold text-sm">${this.t('balanceSummary', 'Solde de congés')}</h4><div id="lv-balance" class="text-xs mt-2"></div></section>
          </aside>
        </div>
        <footer class="flex justify-end gap-2 mt-5 pt-4 border-t">
          <button type="button" onclick="LeaveModule.closeEditor()" class="sari-btn px-4 bg-slate-200">${this.t('cancel', 'Annuler')}</button>
          <button type="button" onclick="LeaveModule.buildSuggestions()" class="sari-btn px-4 bg-slate-800 text-white"><i data-lucide="sparkles"></i>${this.t('suggestDates', 'Suggérer')}</button>
          <button class="sari-btn px-5 bg-sari-blue text-white">${this.t('save', 'Enregistrer')}</button>
        </footer>
      </form></div>`;
    window.SariIcons?.hydrate();
    this.onTypeChange();
  },
  closeEditor() { document.getElementById('leave-modal').innerHTML = ''; this.state.editing = null; this.state.editingOld = null; },
  onTypeChange() {
    const typeId = document.getElementById('lv-type')?.value;
    const type = this.type(typeId);
    const paid = document.getElementById('lv-paid');
    if (paid) paid.checked = type?.isPaid !== false;
    this.refreshValidation();
  },
  editorValues() {
    const durationRaw = document.getElementById('lv-duration')?.value;
    const start = document.getElementById('lv-start')?.value || '';
    const end = document.getElementById('lv-end')?.value || '';
    const autoDays = window.SariCore.leave.paidWorkingDaysBetween(start, end, this.state.schedule, this.state.holidays);
    return {
      employeeId: document.getElementById('lv-employee')?.value || '',
      typeId: document.getElementById('lv-type')?.value || '',
      startDate: start, endDate: end,
      durationDays: Number(durationRaw) > 0 ? Number(durationRaw) : autoDays,
      isPaid: document.getElementById('lv-paid')?.checked !== false,
      status: document.getElementById('lv-status')?.value || 'draft',
      reason: document.getElementById('lv-reason')?.value || '',
    };
  },
  refreshValidation() {
    const values = this.editorValues();
    const employeeId = values.employeeId;
    const type = this.type(values.typeId);
    const balance = this.balanceFor(employeeId, values.typeId);
    const engine = window.SariCore.leave;
    this.state.alerts = engine.validateLeave({
      request: { ...values, id: this.state.editing?.id },
      type, leaveBalance: balance,
      others: this.state.records.filter((r) => r.id !== this.state.editing?.id),
      own: this.state.records.filter((r) => r.employeeId === employeeId),
      team: this.state.employees.map((employee) => ({ id: employee.id, department: employee.department || '' })),
      holidays: this.state.holidays, schedule: this.state.schedule,
    });
    this.renderAlerts();
    this.renderBalance(employeeId, values.typeId, balance);
  },
  renderAlerts() {
    const box = document.getElementById('lv-alerts'); if (!box) return;
    const icons = { error: ['circle-x', 'text-red-600', 'border-red-300', 'bg-red-50 dark:bg-red-500/10'], warning: ['triangle-alert', 'text-sari-amber', 'border-sari-amber/40', 'bg-sari-amber/5'], info: ['info', 'text-sari-blue', 'border-sari-blue/30', 'bg-sari-blue/5'] };
    box.innerHTML = this.state.alerts.length ? `<h4 class="font-extrabold text-sm flex gap-2"><i data-lucide="shield-alert" class="text-sari-amber"></i>${this.t('alertsAndChecks', 'Alertes & vérifications')}</h4>` + this.state.alerts.map((alert) => `<div class="p-3 rounded-xl border ${icons[alert.severity][2]} ${icons[alert.severity][3]} flex gap-2"><i data-lucide="${icons[alert.severity][0]}" class="${icons[alert.severity][1]} shrink-0"></i><div><b class="text-xs block">${SariUtils.escapeHtml(alert.title?.[i18n.currentLang] || alert.title?.fr || alert.code)}</b><p class="text-[11px] text-slate-500 mt-0.5">${SariUtils.escapeHtml(alert.message?.[i18n.currentLang] || alert.message?.fr || '')}</p>${alert.dates?.length ? `<p class="text-[10px] font-mono-tech mt-1">${alert.dates.join(' • ')}</p>` : ''}</div></div>`).join('') : `<p class="text-xs text-slate-400">${this.t('noAlert', 'Aucune alerte : la demande est conforme.')}</p>`;
    window.SariIcons?.hydrate();
  },
  renderBalance(employeeId, typeId, balance) {
    const box = document.getElementById('lv-balance'); if (!box) return;
    const type = this.type(typeId);
    if (!type || type.deductsBalance === false || !Number(type.daysPerYear)) {
      box.innerHTML = `<p class="text-slate-500">${this.t('noTrackedBalance', 'Ce type de congé n’est pas décompté d’un solde annuel.')}</p>`;
      return;
    }
    const used = this.leaveBalanceUsed(employeeId, new Date().getFullYear());
    const pct = Math.min(100, Math.round((used / Number(type.daysPerYear)) * 100));
    box.innerHTML = `<div class="flex justify-between"><span>${SariUtils.escapeHtml(this.typeName(typeId))}</span><b class="font-mono-tech">${balance} / ${type.daysPerYear} ${this.t('daysShort', 'j')}</b></div>
      <div class="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden"><div class="h-full ${pct > 85 ? 'bg-red-500' : 'bg-sari-blue'}" style="width:${pct}%"></div></div>
      <p class="text-[10px] text-slate-400 mt-1">${used} ${this.t('daysUsedThisYear', 'jour(s) utilisé(s) en')} ${new Date().getFullYear()}</p>`;
  },
  buildSuggestions() {
    const values = this.editorValues();
    const start = values.startDate || window.SariCore.leave.isoDate(new Date());
    const end = values.endDate || window.SariCore.leave.isoDate(new Date(new Date().getTime() + 90 * 86400000));
    const duration = Math.max(1, values.durationDays || 3);
    this.state.suggestions = window.SariCore.leave.suggestLeaveDates({
      employeeId: values.employeeId, durationDays: duration,
      fromDate: window.SariCore.leave.addDays(start, 1), toDate: end,
      others: this.state.records.filter((r) => r.id !== this.state.editing?.id),
      own: this.state.records.filter((r) => r.employeeId === values.employeeId),
      team: this.state.employees.map((employee) => ({ id: employee.id, department: employee.department || '' })),
      holidays: this.state.holidays, schedule: this.state.schedule,
    });
    this.renderSuggestions();
  },
  renderSuggestions() {
    const box = document.getElementById('lv-suggestions'); if (!box) return;
    box.innerHTML = this.state.suggestions.map((suggestion, index) => `<button type="button" onclick="LeaveModule.applySuggestion(${index})" class="w-full text-left p-3 rounded-xl border hover:border-sari-blue bg-white dark:bg-slate-800">
      <div class="flex justify-between"><b class="text-xs font-mono-tech">${i18n.formatDate(suggestion.startDate)} → ${i18n.formatDate(suggestion.endDate)}</b><span class="sari-badge bg-sari-lime/20 text-sari-lime-dark">★ ${suggestion.score}</span></div>
      <p class="text-[10px] text-slate-500 mt-1">${suggestion.workingDays} ${this.t('workingDaysCount', 'j ouvré(s)')} • ${suggestion.publicHolidays} ${this.t('holidaysIncluded', 'férié(s)')}</p>
      <ul class="text-[10px] text-slate-400 mt-1">${suggestion.reasons.slice(0, 2).map((reason) => `<li>• ${SariUtils.escapeHtml(reason?.[i18n.currentLang] || reason?.fr || '')}</li>`).join('')}</ul>
    </button>`).join('') || `<p class="text-xs text-slate-400">${this.t('noSuggestion', 'Aucune suggestion pour ces critères.')}</p>`;
    window.SariIcons?.hydrate();
  },
  applySuggestion(index) {
    const suggestion = this.state.suggestions[index]; if (!suggestion) return;
    const startInput = document.getElementById('lv-start'); const endInput = document.getElementById('lv-end');
    if (startInput) startInput.value = suggestion.startDate;
    if (endInput) endInput.value = suggestion.endDate;
    const duration = document.getElementById('lv-duration');
    if (duration) duration.value = suggestion.workingDays;
    app.showToast(this.t('suggestionApplied', 'Dates suggérées appliquées : relisez les alertes ci-contre.'), 'info');
    this.refreshValidation();
  },
  async saveRequest(event) {
    event.preventDefault();
    const values = this.editorValues();
    const old = this.state.editingOld || {};
    const record = { ...old, ...values, employeeName: this.employeeName(values.employeeId), department: this.employee(values.employeeId)?.department || '', updatedAt: new Date().toISOString(), createdAt: old.createdAt || new Date().toISOString() };
    if (!old.id) record.id = `lv-${crypto.randomUUID()}`; else record.id = old.id;
    if (!old.id) record.requestedAt = new Date().toISOString();
    if (['approved', 'taken'].includes(record.status) && !old.decidedAt) { record.decidedBy = auth.currentUser?.name || auth.currentUser?.username || 'SARI'; record.decidedAt = new Date().toISOString(); }
    const blocking = this.state.alerts.filter((alert) => alert.severity === 'error' && alert.code === 'balance_exceeded');
    if (blocking.length && record.status !== 'draft') return app.showToast(this.t('fixBlockingAlerts', 'Corrigez les alertes bloquantes (solde dépassé) ou laissez la demande en brouillon.'), 'error');
    await sariDB.save('leaveRequests', record);
    await this.reconcileAdjustments();
    this.closeEditor();
    app.showToast(this.t('leaveSaved', 'Demande de congé enregistrée et fiches de paie synchronisées.'), 'success');
    await this.render();
  },
  async removeRequest(id) {
    if (!await DialogManager.confirm(this.t('deleteLeaveConfirm', 'Supprimer cette demande de congé ? Les ajustements de paie correspondants seront annulés.'))) return;
    await sariDB.delete('leaveRequests', id);
    this.state.records = this.state.records.filter((record) => record.id !== id);
    await this.reconcileAdjustments();
    await this.render();
  },
  async viewRequest(id) {
    const record = await sariDB.getById('leaveRequests', id); if (!record) return;
    const employee = this.employee(record.employeeId) || {};
    const type = this.type(record.typeId) || {};
    const root = document.getElementById('sari-modal-root');
    root.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><article class="w-full max-w-3xl max-h-[92vh] overflow-y-auto sari-tile p-6">
      <header class="flex justify-between border-b pb-3"><div><span class="sari-badge bg-sari-blue/10 text-sari-blue">${record.referenceCode || record.id}</span>
        <h2 class="text-xl font-extrabold mt-2">${SariUtils.escapeHtml(record.employeeName || this.employeeName(record.employeeId))} — ${SariUtils.escapeHtml(this.typeName(record.typeId))}</h2></div>
        <button onclick="app.closeModalRoot()"><i data-lucide="x"></i></button></header>
      <div class="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
        <div><small class="text-slate-400">${this.t('leavePeriod', 'Période')}</small><b class="block font-mono-tech">${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)}</b></div>
        <div><small class="text-slate-400">${this.t('durationDays', 'Jours')}</small><b class="block">${record.durationDays ?? '—'} • ${record.isPaid !== false ? this.t('paidLeaveShort', 'payé') : this.t('unpaidLeaveShort', 'sans solde')}</b></div>
        <div><small class="text-slate-400">${this.t('status', 'Statut')}</small><b class="block">${this.statusLabel(record.status)}</b></div>
        <div><small class="text-slate-400">${this.t('balanceAfter', 'Solde après')}</small><b class="block font-mono-tech">${this.balanceAfter(record)}</b></div>
        <div class="sm:col-span-2"><small class="text-slate-400">${this.t('justification', 'Motif')}</small><p class="mt-1">${SariUtils.escapeHtml(record.reason || '—')}</p></div>
        ${record.deductionAmount ? `<div class="sm:col-span-2 p-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10"><b class="text-red-600 text-xs">${this.t('unpaidDeduction', 'Retenue appliquée')} : ${i18n.formatCurrency(record.deductionAmount)}</b><p class="text-[11px] text-slate-500">${this.t('adjustedPeriods', 'Périodes de paie ajustées')} : ${(record.adjustedPeriods || []).join(', ')}</p></div>` : ''}
        <div class="sm:col-span-2 text-xs text-slate-400">${this.t('requestedAt', 'Demandée le')} ${i18n.formatDate(record.requestedAt)}${record.decidedBy ? ` • ${this.t('processedBy', 'Traitée par')} ${SariUtils.escapeHtml(record.decidedBy)} (${i18n.formatDate(record.decidedAt)})` : ''}</div>
      </div>
      <footer class="flex justify-end gap-2 mt-5 pt-4 border-t">${this.canWrite() ? `<button onclick="app.closeModalRoot();LeaveModule.openEditor('${record.id}')" class="sari-btn px-4 bg-sari-blue text-white">${this.t('edit', 'Modifier')}</button>` : ''}<button onclick="DocumentManager.open('leaveRequest','${record.id}','${record.referenceCode || record.id}')" class="sari-btn px-4 bg-slate-800 text-white">GED</button></footer></article></div>`;
    window.SariIcons?.hydrate();
  },

  /* ──────────────────────────────── 302 Leave calendar ──────────────────────────────── */
  activeLeaveOn(date) {
    return this.state.records.filter((record) => ['approved', 'taken'].includes(record.status) && date >= record.startDate && date <= record.endDate);
  },
  calendarHtml() {
    const [year, month] = this.state.month.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7; // Monday-first grid
    const engine = window.SariCore.leave;
    const today = engine.isoDate(new Date());
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('');
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = this.holiday(date);
      const leaves = this.activeLeaveOn(date);
      const weekend = !engine.isWorkingDay(date, this.state.schedule);
      cells.push({ date, holiday, leaves, weekend });
    }
    return `<div class="space-y-4">
      <section class="sari-tile p-4 flex flex-wrap items-center gap-2">
        <button onclick="LeaveModule.shiftMonth(-1)" class="sari-btn px-3"><i data-lucide="chevron-left"></i></button>
        <input type="month" class="doc-input w-44" value="${this.state.month}" onchange="LeaveModule.state.month=this.value;LeaveModule.render()">
        <button onclick="LeaveModule.shiftMonth(1)" class="sari-btn px-3"><i data-lucide="chevron-right"></i></button>
        <span class="ml-2 text-xs text-slate-500">${this.t('calendarLegend', 'Légende')} :</span>
        <span class="sari-badge text-[9px] bg-red-500/10 text-red-600">${this.t('publicHoliday', 'Jour férié')}</span>
        <span class="sari-badge text-[9px] bg-slate-200 text-slate-500">${this.t('weekend', 'Week-end')}</span>
        ${this.state.types.slice(0, 6).map((type) => `<span class="sari-badge text-[9px]" style="background:${type.color}22;color:${type.color}">${SariUtils.escapeHtml(this.typeName(type.id))}</span>`).join('')}
      </section>
      <section class="sari-tile p-3 overflow-x-auto"><div class="grid grid-cols-7 gap-1 min-w-[760px]">
        ${[1, 2, 3, 4, 5, 6, 0].map((day) => `<div class="text-center text-[10px] font-bold uppercase text-slate-400 py-2">${i18n.t(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][day === 0 ? 6 : day - 1], ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][day === 0 ? 6 : day - 1])}</div>`).join('')}
        ${cells.map((cell) => cell === '' ? '<div class="min-h-24"></div>' : `<div class="min-h-24 rounded-lg border p-1.5 ${cell.holiday ? 'bg-red-500/5 border-red-300' : cell.weekend ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200' : 'bg-white dark:bg-slate-800'}">
          <div class="flex justify-between items-center"><b class="text-xs font-mono-tech ${cell.holiday ? 'text-red-600' : ''}">${Number(cell.date.slice(-2))}</b>
            ${cell.holiday ? `<i data-lucide="party-popper" class="w-3 h-3 text-red-500" title="${SariUtils.escapeHtml(this.holidayName(cell.holiday))}"></i>` : ''}</div>
          ${cell.holiday ? `<p class="text-[8px] text-red-600 truncate mt-0.5">${SariUtils.escapeHtml(this.holidayName(cell.holiday))}</p>` : ''}
          <div class="space-y-0.5 mt-1">${cell.leaves.slice(0, 3).map((leave) => `<div class="text-[8px] rounded px-1 py-0.5 truncate text-white" style="background:${this.typeColor(leave.typeId)}" title="${SariUtils.escapeHtml(leave.employeeName)} — ${SariUtils.escapeHtml(this.typeName(leave.typeId))}">${SariUtils.escapeHtml(this.initials(leave.employeeName))}</div>`).join('')}
          ${cell.leaves.length > 3 ? `<div class="text-[8px] text-slate-500">+${cell.leaves.length - 3}</div>` : ''}
          ${cell.date === today ? '<div class="text-[8px] text-sari-blue font-bold">• Aujourd’hui</div>' : ''}</div></div>`).join('')}
      </div></section>
      <section class="sari-tile p-4"><h4 class="font-extrabold text-sm">${this.t('absentToday', 'Absences du mois')}</h4>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">${this.state.records.filter((record) => ['approved', 'taken'].includes(record.status) && String(record.startDate).startsWith(this.state.month) || (record.startDate <= `${this.state.month}-31` && record.endDate >= `${this.state.month}-01` && ['approved', 'taken'].includes(record.status))).map((record) => `<div class="p-2 rounded-lg border flex gap-2 items-center"><span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${this.typeColor(record.typeId)}"></span><div class="min-w-0"><b class="text-xs truncate block">${SariUtils.escapeHtml(record.employeeName)}</b><small class="font-mono-tech text-[10px]">${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)} • ${SariUtils.escapeHtml(this.typeName(record.typeId))}</small></div></div>`).join('') || `<p class="text-xs text-slate-400">${this.t('noLeaveThisMonth', 'Aucun congé sur ce mois.')}</p>`}</div>
      </section></div>`;
  },
  initials(name = '') { return name.split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase() || '—'; },
  holidayName(holiday) { return holiday?.name?.[i18n.currentLang] || holiday?.name?.fr || holiday?.date || ''; },
  shiftMonth(offset) {
    const [year, month] = this.state.month.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    this.state.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.render();
  },

  /* ─────────────────────────── 302 Comparison & coverage view ─────────────────────────── */
  comparisonHtml() {
    const [year, month] = this.state.compareMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const engine = window.SariCore.leave;
    const employees = window.SariCore.ordering.stableOrder(this.state.employees.filter((employee) => employee.status === 'active'));
    const overlaps = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = this.activeLeaveOn(date).length;
      if (count > 1) overlaps.push({ date, count });
    }
    return `<div class="space-y-4">
      <section class="sari-tile p-4 flex flex-wrap items-center gap-3">
        <input type="month" class="doc-input w-44" value="${this.state.compareMonth}" onchange="LeaveModule.state.compareMonth=this.value;LeaveModule.render()">
        <span class="text-xs text-slate-500">${this.t('comparisonHelp', 'Matrice salariés × jours : repérez les chevauchements et les trous de couverture avant de valider un planning.')}</span>
        ${overlaps.length ? `<span class="sari-badge bg-red-500/10 text-red-600">${overlaps.length} ${this.t('overlapDays', 'jour(s) avec chevauchement')}</span>` : `<span class="sari-badge bg-green-600/10 text-green-700">${this.t('noOverlap', 'Aucun chevauchement')}</span>`}
      </section>
      ${overlaps.length ? `<section class="sari-tile p-4 border-l-4 border-l-red-500"><h4 class="font-extrabold text-sm text-red-600 flex gap-2"><i data-lucide="users-round"></i>${this.t('coverageGaps', 'Risques de couverture')}</h4>
        <div class="flex flex-wrap gap-2 mt-2">${overlaps.map((overlap) => `<button onclick="LeaveModule.openComparisonDay('${overlap.date}')" class="p-2 rounded-lg border border-red-200 text-xs"><b class="font-mono-tech">${i18n.formatDate(overlap.date)}</b> • ${overlap.count} ${this.t('employeesOnLeave', 'salarié(s) en congé')}</button>`).join('')}</div></section>` : ''}
      <section class="sari-tile overflow-x-auto p-3"><table class="w-full text-xs min-w-[900px]">
        <thead><tr><th class="p-2 text-left min-w-44">${this.t('employee', 'Salarié')}</th>
          ${Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => { const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const holiday = this.holiday(date); const weekend = !engine.isWorkingDay(date, this.state.schedule); return `<th class="p-0.5 text-center"><div class="rounded ${holiday ? 'bg-red-500/15 text-red-600' : weekend ? 'bg-slate-200 dark:bg-slate-700 text-slate-400' : ''}">${day}</div></th>`; }).join('')}
        </tr></thead>
        <tbody>${employees.map((employee) => `<tr class="border-t"><td class="p-2"><b>${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</b><small class="block text-slate-400">${SariUtils.escapeHtml(employee.department || '')}</small></td>
          ${Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => { const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const holiday = this.holiday(date); const weekend = !engine.isWorkingDay(date, this.state.schedule); const leaves = this.activeLeaveOn(date).filter((record) => record.employeeId === employee.id); const cell = holiday ? `<td class="p-0.5 bg-red-500/15 text-center" title="${SariUtils.escapeHtml(this.holidayName(holiday))}"><i data-lucide="party-popper" class="w-3 h-3 mx-auto text-red-500"></i></td>` : weekend ? '<td class="p-0.5 bg-slate-100 dark:bg-slate-800/60"></td>' : leaves.length ? `<td class="p-0.5 text-center" title="${leaves.map((record) => this.typeName(record.typeId)).join(', ')}"><span class="inline-block w-4 h-4 rounded" style="background:${this.typeColor(leaves[0].typeId)}"></span></td>` : '<td class="p-0.5 text-center text-slate-300">·</td>'; return cell; }).join('')}
        </tr>`).join('')}</tbody></table></section>
      <section class="sari-tile p-4"><h4 class="font-extrabold text-sm flex gap-2"><i data-lucide="sparkles" class="text-sari-amber"></i>${this.t('planAssistance', 'Assistance au planning')}</h4>
        <p class="text-xs text-slate-500 mt-1">${this.t('planAssistanceHelp', 'Lancez le moteur de suggestions pour proposer à un salarié des dates préservant la couverture de son équipe.')}</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">${employees.map((employee) => `<button onclick="LeaveModule.suggestFor('${employee.id}')" class="p-3 rounded-xl border text-left hover:border-sari-blue"><b class="text-xs">${SariUtils.escapeHtml(`${employee.firstName} ${employee.lastName}`)}</b><small class="block text-[10px] text-slate-400">${SariUtils.escapeHtml(employee.department || '')}</small><span class="text-[10px] text-sari-blue font-bold mt-1 inline-block">${this.t('proposeDates', 'Proposer des dates →')}</span></button>`).join('')}</div></section>
      <div id="leave-modal"></div></div>`;
  },
  async openComparisonDay(date) {
    const leaves = this.activeLeaveOn(date);
    await DialogManager.alert(leaves.map((record) => `${record.employeeName} — ${this.typeName(record.typeId)} (${i18n.formatDate(record.startDate)} → ${i18n.formatDate(record.endDate)})`).join('\n') || this.t('noLeaveThatDay', 'Aucun congé ce jour.'), { title: `${i18n.formatDate(date)} — ${leaves.length} ${this.t('employeesOnLeave', 'salarié(s) en congé')}`, icon: 'users-round' });
  },
  async suggestFor(employeeId) {
    const duration = Number((await DialogManager.form(this.t('suggestForTitle', 'Suggestion de congé'), [{ name: 'duration', label: this.t('durationDays', 'Durée souhaitée (jours)'), type: 'number', value: 5, required: true }, { name: 'from', label: this.t('suggestFrom', 'À partir du'), type: 'date', value: window.SariCore.leave.isoDate(new Date()) }, { name: 'to', label: this.t('suggestTo', 'Jusqu’au'), type: 'date', value: window.SariCore.leave.isoDate(new Date(new Date().getTime() + 120 * 86400000)) }]))?.duration) || 0;
    if (!duration) return;
    const suggestions = window.SariCore.leave.suggestLeaveDates({ employeeId, durationDays: Number(duration), fromDate: window.SariCore.leave.isoDate(new Date()), toDate: window.SariCore.leave.isoDate(new Date(new Date().getTime() + 120 * 86400000)), others: this.state.records, own: this.state.records.filter((record) => record.employeeId === employeeId), team: this.state.employees.map((employee) => ({ id: employee.id, department: employee.department || '' })), holidays: this.state.holidays, schedule: this.state.schedule });
    const rows = suggestions.map((suggestion, index) => `<div class="p-3 rounded-xl border flex justify-between gap-2"><div><b class="text-xs font-mono-tech">${i18n.formatDate(suggestion.startDate)} → ${i18n.formatDate(suggestion.endDate)}</b><p class="text-[10px] text-slate-500">${suggestion.reasons.slice(0, 2).map((reason) => `• ${reason?.[i18n.currentLang] || reason?.fr}`).join('<br>')}</p></div><div class="flex flex-col gap-1"><span class="sari-badge text-[9px]">★ ${suggestion.score}</span><button onclick="LeaveModule.preFillFor('${employeeId}','${suggestion.startDate}','${suggestion.endDate}','${suggestion.workingDays}')" class="doc-action">${this.t('prefill', 'Pré-remplir')}</button></div></div>`).join('') || `<p class="text-xs text-slate-400">${this.t('noSuggestion', 'Aucune suggestion.')}</p>`;
    const modal = document.getElementById('leave-modal');
    modal.innerHTML = `<div class="fixed inset-0 z-[120] sari-modal-backdrop grid place-items-center p-3"><section class="sari-tile w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6"><header class="flex justify-between border-b pb-3"><div><h3 class="text-xl font-extrabold">${this.t('suggestedDatesFor', 'Dates suggérées')} — ${SariUtils.escapeHtml(this.employeeName(employeeId))}</h3></div><button onclick="LeaveModule.closeEditor()"><i data-lucide="x"></i></button></header><div class="space-y-2 mt-4">${rows}</div></section></div>`;
    window.SariIcons?.hydrate();
  },
  async preFillFor(employeeId, startDate, endDate, duration) {
    const modal = document.getElementById('leave-modal');
    if (modal) modal.innerHTML = '';
    await this.openEditor('', { employeeId, startDate, endDate, durationDays: duration, status: 'draft', isPaid: true, typeId: 'lt-annual' });
    const employeeSelect = document.getElementById('lv-employee');
    if (employeeSelect) employeeSelect.value = employeeId;
    this.refreshValidation();
  },

  /* ──────────────────────────────── 300.1 Leave types CRUD ──────────────────────────────── */
  typesHtml(canWrite) {
    return `<section class="sari-tile p-5"><header class="flex justify-between items-center mb-4"><div><h3 class="font-extrabold text-lg">${this.t('leaveTypesLabel', 'Types de congé')}</h3><p class="text-xs text-slate-500">${this.t('leaveTypesHelp', 'Types configurables : quota annuel, congé payé ou non, justificatif, couleur du calendrier.')}</p></div>${canWrite ? `<button onclick="LeaveModule.editType()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs"><i data-lucide="plus"></i>${this.t('newLeaveType', 'Nouveau type')}</button>` : ''}</header>
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">${this.state.types.map((type) => `<article class="p-4 rounded-xl border ${type.isActive === false ? 'opacity-50' : ''}"><div class="flex justify-between items-start"><span class="sari-badge" style="background:${type.color}22;color:${type.color}">${SariUtils.escapeHtml(type.code || type.id)}</span>${type.isActive === false ? `<span class="sari-badge text-slate-400">${this.t('inactive', 'Inactif')}</span>` : ''}</div>
        <h4 class="font-extrabold mt-2">${SariUtils.escapeHtml(this.typeName(type.id))}</h4>
        <div class="grid grid-cols-2 gap-2 mt-3 text-[11px]"><div><small class="text-slate-400 block">${this.t('daysPerYear', 'Jours / an')}</small><b class="font-mono-tech">${type.daysPerYear ?? '—'}</b></div>
        <div><small class="text-slate-400 block">${this.t('remuneration', 'Rémunération')}</small><b>${type.isPaid ? this.t('paidLeaveShort', 'Payé') : this.t('unpaidLeaveShort', 'Sans solde')}</b></div>
        <div><small class="text-slate-400 block">${this.t('deductsBalanceShort', 'Décompte solde')}</small><b>${type.deductsBalance !== false ? this.t('yes', 'Oui') : this.t('no', 'Non')}</b></div>
        <div><small class="text-slate-400 block">${this.t('justification', 'Justificatif')}</small><b>${type.requiresJustification ? this.t('yes', 'Oui') : this.t('no', 'Non')}</b></div></div>
        ${type.isPaid === false ? `<p class="mt-2 text-[10px] text-red-600">${this.t('unpaidTypeNote', 'Déclenche la retenue automatique sur la fiche de paie.')}</p>` : ''}
        ${canWrite ? `<footer class="flex gap-2 mt-3 pt-3 border-t"><button onclick="LeaveModule.editType('${type.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="LeaveModule.toggleType('${type.id}')" class="doc-action">${type.isActive === false ? this.t('activate', 'Activer') : this.t('deactivate', 'Désactiver')}</button><button onclick="LeaveModule.deleteType('${type.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button></footer>` : ''}</article>`).join('')}</div></section>`;
  },
  async editType(id = '') {
    const old = id ? this.state.types.find((type) => type.id === id) : {};
    const values = await DialogManager.form(id ? this.t('editLeaveType', 'Modifier le type de congé') : this.t('newLeaveType', 'Nouveau type de congé'), [
      { name: 'code', label: this.t('code', 'Code'), value: old.code || '', required: true },
      { name: 'fr', label: 'Français', value: old.name?.fr || '', required: true },
      { name: 'ar', label: 'العربية', value: old.name?.ar || '', required: true },
      { name: 'en', label: 'English', value: old.name?.en || '', required: true },
      { name: 'daysPerYear', label: this.t('daysPerYear', 'Quota annuel (jours, 0 = illimité)'), type: 'number', value: old.daysPerYear ?? 30 },
      { name: 'maxDaysPerRequest', label: this.t('maxDaysPerRequest', 'Durée max par demande'), type: 'number', value: old.maxDaysPerRequest ?? 30 },
      { name: 'color', label: this.t('color', 'Couleur'), value: old.color || '#009CC5' },
    ], { message: `${this.t('leaveTypePaidNote', 'Le caractère payé / décompté et le justificatif se règlent en créant le type via la liste :')} — ${this.t('paidLeave', 'congé payé')} / ${this.t('unpaidLeaveShort', 'sans solde')}.` });
    if (!values) return;
    // Remuneration / balance / justification options are captured with a reliable select-based dialog.
    const remuneration = await DialogManager.form(this.t('remuneration', 'Rémunération'), [
      { name: 'isPaid', label: this.t('remuneration', 'Rémunération du congé'), type: 'select', value: old.isPaid === false ? 'no' : 'yes', options: [{ value: 'yes', label: this.t('paidLeaveShort', 'Congé payé') }, { value: 'no', label: this.t('unpaidLeaveShort', 'Congé sans solde (retenue sur paie)') }] },
      { name: 'deductsBalance', label: this.t('deductsBalanceQuestion', 'Décompter du solde annuel ?'), type: 'select', value: old.deductsBalance === false ? 'no' : 'yes', options: [{ value: 'yes', label: this.t('yes', 'Oui — décompter du solde') }, { value: 'no', label: this.t('no', 'Non — hors solde') }] },
      { name: 'justification', label: this.t('requiresJustificationQuestion', 'Justificatif requis ?'), type: 'select', value: old.requiresJustification ? 'yes' : 'no', options: [{ value: 'yes', label: this.t('yes', 'Oui') }, { value: 'no', label: this.t('no', 'Non') }] },
    ]);
    if (!remuneration) return;
    await sariDB.save('leaveTypes', { ...old, id: id || `lt-${crypto.randomUUID()}`, code: values.code, name: { fr: values.fr, ar: values.ar, en: values.en }, daysPerYear: Number(values.daysPerYear) || 0, maxDaysPerRequest: Number(values.maxDaysPerRequest) || 0, color: values.color, isPaid: remuneration.isPaid === 'yes', deductsBalance: remuneration.deductsBalance === 'yes', requiresJustification: remuneration.justification === 'yes', order: old.order ?? this.state.types.length + 1, isActive: old.isActive !== false });
    app.showToast(this.t('leaveTypeSaved', 'Type de congé enregistré.'), 'success');
    await this.render();
  },
  async toggleType(id) { const type = await sariDB.getById('leaveTypes', id); type.isActive = type.isActive === false; await sariDB.save('leaveTypes', type); await this.render(); },
  async deleteType(id) { if (!await DialogManager.confirm(this.t('deleteLeaveTypeConfirm', 'Supprimer ce type de congé ?'))) return; await sariDB.delete('leaveTypes', id); await this.render(); },

  /* ─────────────────────── 301 Holiday calendar & worked-holiday override ─────────────────────── */
  holidaysHtml(canWrite) {
    const holidays = this.state.holidays.filter((holiday) => String(holiday.date).startsWith(this.state.holidayYear)).sort((a, b) => a.date.localeCompare(b.date));
    return `<div class="space-y-4">
      <section class="sari-tile p-4 flex flex-wrap items-center gap-3">
        <input type="number" class="doc-input w-32" min="2020" max="2040" value="${this.state.holidayYear}" onchange="LeaveModule.state.holidayYear=this.value;LeaveModule.render()">
        <span class="text-xs text-slate-500">${this.t('holidayCalendarHelp', 'Calendrier algérien éditable : ajoutez, déplacez ou supprimez les dates, notamment les fêtes religieuses à dates variables.')}</span>
        ${canWrite ? `<button onclick="LeaveModule.editHoliday()" class="sari-btn px-4 py-2 bg-sari-blue text-white text-xs ml-auto"><i data-lucide="plus"></i>${this.t('addHoliday', 'Ajouter un jour férié')}</button><button onclick="LeaveModule.editWorkedHoliday()" class="sari-btn px-4 py-2 bg-sari-lime text-slate-900 text-xs"><i data-lucide="briefcase"></i>${this.t('markWorkedHoliday', 'Marquer « travaillé »')}</button>` : ''}
      </section>
      <section class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">${holidays.map((holiday) => `<article class="p-4 rounded-xl border ${holiday.isFixed ? '' : 'border-dashed border-sari-amber/60'}">
        <div class="flex justify-between items-start"><span class="font-mono-tech text-xs font-bold text-sari-blue">${i18n.formatDate(holiday.date)}</span>
        ${holiday.isFixed ? `<span class="sari-badge text-[9px]">${this.t('fixedDate', 'Date fixe')}</span>` : `<span class="sari-badge text-[9px] bg-sari-amber/15 text-sari-amber">${this.t('variableDate', 'Variable')}</span>`}</div>
        <h4 class="font-extrabold text-sm mt-2">${SariUtils.escapeHtml(this.holidayName(holiday))}</h4>
        ${holiday.notes ? `<p class="text-[10px] text-slate-500 mt-1">${SariUtils.escapeHtml(holiday.notes)}</p>` : ''}
        <div class="flex gap-1 mt-2">${this.state.worked.filter((worked) => worked.holidayId === holiday.id).slice(0, 3).map((worked) => `<span class="sari-badge text-[9px] bg-sari-blue/10 text-sari-blue" title="${this.t('workedBy', 'Travaillé par')} ${SariUtils.escapeHtml(this.employeeName(worked.employeeId))}">${SariUtils.escapeHtml(this.initials(this.employeeName(worked.employeeId)))} ✓</span>`).join('')}</div>
        ${canWrite ? `<footer class="flex gap-2 mt-3 pt-3 border-t"><button onclick="LeaveModule.editHoliday('${holiday.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="LeaveModule.deleteHoliday('${holiday.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button></footer>` : ''}</article>`).join('') || `<p class="text-sm text-slate-400">${this.t('noHoliday', 'Aucun jour férié pour cette année.')}</p>`}</section>
      <section class="sari-tile p-5"><h4 class="font-extrabold text-sm flex gap-2"><i data-lucide="briefcase" class="text-sari-blue"></i>${this.t('workedHolidaysLabel', 'Jours fériés travaillés')}</h4>
        <p class="text-xs text-slate-500 mt-1">${this.t('workedHolidaysHelp', 'Un jour férié marqué « travaillé » est compté en présence et valorisé en majoration sur la fiche de paie (100 % par défaut, taux configurable).')}</p>
        <div class="overflow-x-auto mt-3"><table class="w-full sari-table text-xs"><thead><tr><th>${this.t('employee', 'Salarié')}</th><th>${this.t('holidayDate', 'Jour férié')}</th><th>${this.t('workedHours', 'Heures')}</th><th>${this.t('premiumAmount', 'Majoration')}</th><th>${this.t('payrollImpact', 'Impact paie')}</th><th></th></tr></thead><tbody>
        ${this.state.worked.map((worked) => { const holiday = this.state.holidays.find((item) => item.id === worked.holidayId) || {}; const salary = this.latestSalary(worked.employeeId, window.SariCore.leave.monthKey(worked.date || holiday.date)); const base = Number(salary?.newAmount ?? this.employee(worked.employeeId)?.salary ?? 0); const premium = window.SariCore.leave.workedHolidayPremium(base, Number(worked.hours) || this.state.schedule.dailyHours || 8, this.state.schedule); return `<tr class="border-t"><td class="p-2"><b>${SariUtils.escapeHtml(this.employeeName(worked.employeeId))}</b></td><td>${i18n.formatDate(worked.date || holiday.date)} — ${SariUtils.escapeHtml(this.holidayName(holiday))}</td><td>${worked.hours || this.state.schedule.dailyHours || 8}</td><td class="font-bold text-green-600">${i18n.formatCurrency(premium)}</td><td><span class="sari-badge text-green-600">${this.t('addedToPayslip', 'Ajoutée à la paie')}</span></td><td>${this.canWrite() ? `<button onclick="LeaveModule.deleteWorkedHoliday('${worked.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="6" class="p-6 text-slate-400">${this.t('noWorkedHoliday', 'Aucun jour férié travaillé enregistré.')}</td></tr>`}</tbody></table></div></section>
      <div id="leave-modal"></div></div>`;
  },
  async editHoliday(id = '') {
    const old = id ? this.state.holidays.find((holiday) => holiday.id === id) : {};
    const values = await DialogManager.form(id ? this.t('editHoliday', 'Modifier le jour férié') : this.t('addHoliday', 'Ajouter un jour férié'), [
      { name: 'date', label: this.t('holidayDate', 'Date'), type: 'date', value: old.date || '', required: true },
      { name: 'fr', label: 'Français', value: old.name?.fr || '', required: true },
      { name: 'ar', label: 'العربية', value: old.name?.ar || '', required: true },
      { name: 'en', label: 'English', value: old.name?.en || '', required: true },
      { name: 'isFixed', label: this.t('dateNature', 'Nature de la date'), type: 'select', value: old.isFixed ? 'fixed' : 'variable', options: [{ value: 'fixed', label: this.t('fixedDate', 'Date fixe') }, { value: 'variable', label: this.t('variableDate', 'Variable (fête religieuse…)') }] },
      { name: 'notes', label: this.t('notes', 'Notes'), type: 'textarea', value: old.notes || '' },
    ]);
    if (!values) return;
    await sariDB.save('publicHolidays', { ...old, id: id || `ph-${crypto.randomUUID()}`, date: values.date, name: { fr: values.fr, ar: values.ar, en: values.en }, isFixed: values.isFixed === 'fixed', isWorkable: true, notes: values.notes, order: old.order ?? this.state.holidays.length + 1 });
    await this.reconcileAdjustments();
    app.showToast(this.t('holidaySaved', 'Jour férié enregistré.'), 'success');
    await this.render();
  },
  async deleteHoliday(id) { if (!await DialogManager.confirm(this.t('deleteHolidayConfirm', 'Supprimer ce jour férié ?'))) return; await sariDB.delete('publicHolidays', id); await this.reconcileAdjustments(); await this.render(); },
  async editWorkedHoliday() {
    const holidays = this.state.holidays.sort((a, b) => a.date.localeCompare(b.date));
    const values = await DialogManager.form(this.t('markWorkedHoliday', 'Marquer un jour férié « travaillé »'), [
      { name: 'employeeId', label: this.t('employee', 'Salarié'), type: 'select', required: true, options: this.state.employees.map((employee) => ({ value: employee.id, label: `${employee.firstName} ${employee.lastName} — ${employee.department || ''}` })) },
      { name: 'holidayId', label: this.t('publicHoliday', 'Jour férié'), type: 'select', required: true, options: holidays.map((holiday) => ({ value: holiday.id, label: `${holiday.date} — ${this.holidayName(holiday)}` })) },
      { name: 'hours', label: `${this.t('workedHours', 'Heures travaillées')} (${this.state.schedule.dailyHours || 8}h ${this.t('defaultHours', 'par défaut')})`, type: 'number', value: this.state.schedule.dailyHours || 8 },
      { name: 'notes', label: this.t('notes', 'Notes'), type: 'textarea' },
    ], { message: this.t('workedHolidayHelp', 'La majoration (100 % par défaut) sera ajoutée aux gains de la fiche de paie du mois concerné et la présence sera pointée.') });
    if (!values) return;
    const holiday = this.state.holidays.find((item) => item.id === values.holidayId);
    await sariDB.save('workedHolidays', { id: `wh-${crypto.randomUUID()}`, employeeId: values.employeeId, holidayId: values.holidayId, date: holiday?.date, hours: Number(values.hours) || this.state.schedule.dailyHours || 8, status: 'approved', notes: values.notes, createdAt: new Date().toISOString() });
    await this.reconcileAdjustments();
    app.showToast(this.t('workedHolidaySaved', 'Jour férié travaillé enregistré : présence et fiche de paie mises à jour.'), 'success');
    await this.render();
  },
  async deleteWorkedHoliday(id) { if (!await DialogManager.confirm(this.t('deleteWorkedHolidayConfirm', 'Supprimer cette déclaration de jour férié travaillé ? La majoration sera retirée de la paie.'))) return; await sariDB.delete('workedHolidays', id); await this.reconcileAdjustments(); await this.render(); },

  /* ──────────────────── 300.3 / 300.4 Working schedule & payment types ──────────────────── */
  configurationHtml(canWrite) {
    const schedule = this.state.schedule || window.SariCore.leave.defaultSchedule;
    const dayNames = [[1, 'monday', 'Lun'], [2, 'tuesday', 'Mar'], [3, 'wednesday', 'Mer'], [4, 'thursday', 'Jeu'], [5, 'friday', 'Ven'], [6, 'saturday', 'Sam'], [0, 'sunday', 'Dim']];
    return `<div class="grid lg:grid-cols-2 gap-4">
      <form onsubmit="LeaveModule.saveSchedule(event)" class="sari-tile p-5">
        <header class="border-b pb-3"><h3 class="font-extrabold text-lg flex gap-2"><i data-lucide="clock-3" class="text-sari-blue"></i>${this.t('workingDaysHours', 'Jours & heures de travail')}</h3>
        <p class="text-xs text-slate-500 mt-1">${this.t('workingDaysHelp', 'Base de calcul des congés, présences et fiches de paie (jours ouvrés, durée quotidienne, diviseur de retenue).')}</p></header>
        <div class="mt-4"><b class="text-xs">${this.t('workingDaysOfWeek', 'Jours ouvrés de la semaine')}</b>
          <div class="flex flex-wrap gap-2 mt-2">${dayNames.map(([day, key, label]) => `<label class="flex items-center gap-1 p-2 border rounded-lg text-xs cursor-pointer"><input type="checkbox" name="day-${day}" ${(schedule.workingDays || []).includes(day) ? 'checked' : ''}> ${i18n.t(key, label)}</label>`).join('')}</div></div>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <label class="doc-label">${this.t('dailyHours', 'Heures / jour')}<input name="dailyHours" type="number" step="0.5" min="1" max="16" class="doc-input" value="${schedule.dailyHours || 8}"></label>
          <label class="doc-label">${this.t('weeklyHours', 'Heures / semaine')}<input name="weeklyHours" type="number" step="0.5" min="1" max="80" class="doc-input" value="${schedule.weeklyHours || 40}"></label>
          <label class="doc-label">${this.t('scheduleStart', 'Début de journée')}<input name="startTime" type="time" class="doc-input" value="${schedule.startTime || '08:30'}"></label>
          <label class="doc-label">${this.t('scheduleEnd', 'Fin de journée')}<input name="endTime" type="time" class="doc-input" value="${schedule.endTime || '17:00'}"></label>
          <label class="doc-label">${this.t('paidLeaveDivisor', 'Diviseur mensuel de retenue')}<input name="paidLeaveDivisor" type="number" step="1" min="1" max="31" class="doc-input" value="${schedule.paidLeaveDivisor || 26}"><small class="text-[10px] text-slate-400">${this.t('divisorHelp', '26 = convention 1/26e par jour ; 22 = jours ouvrés moyens.')}</small></label>
          <label class="doc-label">${this.t('holidayPremiumRate', 'Majoration jour férié travaillé (%)')}<input name="holidayPremiumRate" type="number" step="10" min="0" max="300" class="doc-input" value="${Math.round((schedule.holidayPremiumRate ?? 1) * 100)}"></label>
          <label class="doc-label">${this.t('maxTeamAbsenceRatio', 'Seuil d’absence d’équipe (%)')}<input name="maxTeamAbsenceRatio" type="number" step="5" min="5" max="100" class="doc-input" value="${Math.round((schedule.maxTeamAbsenceRatio ?? 0.5) * 100)}"><small class="text-[10px] text-slate-400">${this.t('thresholdHelp', 'Alerte de couverture quand l’équipe dépasse ce taux d’absents.')}</small></label>
        </div>
        ${canWrite ? `<button class="sari-btn px-5 py-2 mt-4 bg-sari-blue text-white">${this.t('saveSchedule', 'Enregistrer la configuration')}</button>` : ''}
      </form>
      <section class="sari-tile p-5"><header class="flex justify-between border-b pb-3"><div><h3 class="font-extrabold text-lg flex gap-2"><i data-lucide="banknote" class="text-sari-lime-dark"></i>${this.t('paymentTypesLabel', 'Types de paiement')}</h3>
        <p class="text-xs text-slate-500 mt-1">${this.t('paymentTypesHelp', 'Journalier, hebdomadaire, mensuel, annuel et Occasionnel / Pigiste avec ses règles de retenue algériennes.')}</p></div>
        ${canWrite ? `<button onclick="LeaveModule.editPaymentType()" class="doc-action">${this.t('addPaymentType', '+ Ajouter')}</button>` : ''}</section>
        <div class="space-y-2 mt-4">${this.state.paymentTypes.map((type) => `<article class="p-3 rounded-xl border ${type.isActive === false ? 'opacity-50' : ''}">
          <div class="flex justify-between gap-2"><div><b>${SariUtils.escapeHtml(type.name?.[i18n.currentLang] || type.name?.fr || type.code)}</b><small class="block font-mono-tech text-sari-blue text-[10px]">${type.cycle}</small></div>
          ${type.isPiecework ? `<span class="sari-badge bg-sari-amber/15 text-sari-amber">${this.t('nonCnas', 'Non CNAS')}</span>` : `<span class="sari-badge text-green-700">CNAS</span>`}</div>
          ${type.isPiecework ? `<div class="mt-2 p-2 rounded-lg bg-sari-amber/5 border border-sari-amber/30 text-[10px]"><b>${this.t('retentionRate', 'Retenue à la source IRG')} : ${Math.round((type.irgWithholdingRate ?? 0.15) * 100)}%</b><p class="text-slate-500 mt-0.5">${SariUtils.escapeHtml(type.legalNotesI18n?.[i18n.currentLang] || type.legalNotesI18n?.fr || '')}</p></div>` : `<p class="text-[10px] text-slate-500 mt-1">${SariUtils.escapeHtml(type.legalNotesI18n?.[i18n.currentLang] || type.legalNotesI18n?.fr || '')}</p>`}
          ${canWrite ? `<footer class="flex gap-2 mt-2"><button onclick="LeaveModule.editPaymentType('${type.id}')" class="doc-action">${this.t('edit', 'Modifier')}</button><button onclick="LeaveModule.deletePaymentType('${type.id}')" class="doc-action text-red-600">${this.t('delete', 'Supprimer')}</button></footer>` : ''}</article>`).join('')}</div></section>
      <div id="leave-modal"></div></div>`;
  },
  async saveSchedule(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const workingDays = [1, 2, 3, 4, 5, 6, 0].filter((day) => form.elements[`day-${day}`]?.checked);
    if (!workingDays.length) return app.showToast(this.t('needOneWorkingDay', 'Sélectionnez au moins un jour ouvré.'), 'error');
    const record = {
      id: 'work-schedule', workingDays, dailyHours: Number(form.elements.dailyHours.value) || 8,
      weeklyHours: Number(form.elements.weeklyHours.value) || 40, startTime: form.elements.startTime.value || '08:30',
      endTime: form.elements.endTime.value || '17:00', paidLeaveDivisor: Number(form.elements.paidLeaveDivisor.value) || 26,
      holidayPremiumRate: (Number(form.elements.holidayPremiumRate.value) || 0) / 100,
      maxTeamAbsenceRatio: (Number(form.elements.maxTeamAbsenceRatio.value) || 50) / 100,
      updatedAt: new Date().toISOString(),
    };
    await sariDB.save('settings', record);
    this.state.schedule = { ...window.SariCore.leave.defaultSchedule, ...record };
    await this.reconcileAdjustments();
    app.showToast(this.t('scheduleSaved', 'Configuration des jours & heures de travail enregistrée.'), 'success');
    await this.render();
  },
  async editPaymentType(id = '') {
    const old = id ? this.state.paymentTypes.find((type) => type.id === id) : {};
    const values = await DialogManager.form(id ? this.t('editPaymentType', 'Modifier le type de paiement') : this.t('addPaymentType', 'Nouveau type de paiement'), [
      { name: 'code', label: this.t('code', 'Code'), value: old.code || '', required: true },
      { name: 'fr', label: 'Français', value: old.name?.fr || '', required: true },
      { name: 'ar', label: 'العربية', value: old.name?.ar || '', required: true },
      { name: 'en', label: 'English', value: old.name?.en || '', required: true },
      { name: 'cycle', label: this.t('cycle', 'Cycle'), type: 'select', value: old.cycle || 'monthly', options: [['daily', this.t('daily', 'Journalier')], ['weekly', this.t('weekly', 'Hebdomadaire')], ['monthly', this.t('monthly', 'Mensuel')], ['annual', this.t('annual', 'Annuel')], ['piecework', this.t('piecework', 'Occasionnel / Pigiste')]].map(([value, label]) => ({ value, label })) },
      { name: 'isPiecework', label: this.t('pieceworkQuestion', 'Travail occasionnel / à la tâche (pigiste, NON CNAS) ?'), type: 'select', value: old.isPiecework ? 'yes' : 'no', options: [{ value: 'no', label: this.t('no', 'Non — contrat salarié classique') }, { value: 'yes', label: this.t('yes', 'Oui — régime occasionnel distinct') }] },
      { name: 'irgRate', label: this.t('retentionRate', 'Retenue à la source IRG (%)'), type: 'number', step: '0.5', value: Math.round((old.irgWithholdingRate ?? 0.15) * 100) },
      { name: 'legalNotes', label: `${this.t('legalNotes', 'Notes légales')} (${i18n.currentLang === 'ar' ? 'ar' : i18n.currentLang === 'en' ? 'en' : 'fr'})`, type: 'textarea', value: old.legalNotesI18n?.[i18n.currentLang] || old.legalNotesI18n?.fr || '' },
    ]);
    if (!values) return;
    const isPiecework = values.isPiecework === 'yes';
    await sariDB.save('paymentTypes', { ...old, id: id || `pt-${crypto.randomUUID()}`, code: values.code, name: { fr: values.fr, ar: values.ar, en: values.en }, cycle: values.cycle, isPiecework, cnasApplicable: !isPiecework, irgApplicable: true, irgWithholdingRate: isPiecework ? Math.max(0, Number(values.irgRate) || 0) / 100 : null, legalNotesI18n: { ...(old.legalNotesI18n || {}), [i18n.currentLang]: values.legalNotes || '' }, order: old.order ?? this.state.paymentTypes.length + 1, isActive: old.isActive !== false });
    app.showToast(this.t('paymentTypeSaved', 'Type de paiement enregistré.'), 'success');
    await this.render();
  },
  async deletePaymentType(id) { if (!await DialogManager.confirm(this.t('deletePaymentTypeConfirm', 'Supprimer ce type de paiement ?'))) return; await sariDB.delete('paymentTypes', id); await this.render(); },
};
window.LeaveModule = LeaveModule;
export {};
