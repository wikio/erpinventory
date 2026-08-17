# Sections 300–305 — Leave, Contracts, Occasional Workers & Role-Based Dashboard

## 300. Leave & Public Holiday Manager (Algerian context)

- **Configurable CRUD (300.1)** — Leave types (`leaveTypes`) and public holidays (`publicHolidays`) are fully configurable: annual quota, paid/unpaid, balance deduction, justification requirement, colour, per-request maximum. Any **unpaid leave or absence automatically adjusts the employee's payslip** (Section 299): the deductible working days are prorated with the Algerian monthly divisor (1/26th by default, configurable), recorded in `payslip.leaveAdjustments` and recalculated through `calculatePayslip`. Paid leave is tracked on the payslip without a monetary deduction, and attendance rows are created for every deducted day. If no payslip exists for the period, one is created automatically (draft). Deleting or cancelling a request rolls the adjustments back.
- **Alerts & suggestions (300.2)** — The add/edit form evaluates the request live: balance exceeded (blocking), overlapping dates with the employee's own requests, team-coverage conflicts (department absence threshold), public holidays included (not deducted), unpaid-impact notice, and maximum-duration limits. A side panel runs the smart-suggestion engine (Section 302) and can pre-fill recommended dates.
- **Working days & hours (300.3)** — `settings/work-schedule` configures the working days of the week, daily/weekly hours, start/end times, the monthly deduction divisor (26 or 22) and the worked-holiday premium rate. All leave/attendance/payslip calculations read this configuration.
- **Payment types (300.4)** — `paymentTypes` manages **Daily, Weekly, Monthly, Annual** and **Occasional / Piece-Work (« Pigiste »)**. The pigiste type applies the Algerian rules for this engagement, distinct from a salaried contract: **not declared under CNAS**, **IRG withheld at source** (15% default, configurable), contract/invoice justification required, no paid-leave accrual.

## 301. Algerian public holiday calendar & "worked holiday" override

`publicHolidays` ships with the Algerian calendar (fixed national dates + variable religious dates for 2026, flagged "Variable" and editable). Administrators can add, move or delete dates to follow the official announcements. A holiday can be marked **"worked"** for a given employee: attendance is recorded as present and the payslip receives the premium earning (100% increase by default, configurable rate) in `payslip.workedHolidays`.

## 302. Employee leave calendar, comparison & smart suggestions

- **Calendar** — month grid with all employees' planned/taken leave, colour-coded per type, public holidays and weekends highlighted, plus a monthly absence list.
- **Comparison view** — employee × day matrix for a selected month; days with more than one absence are flagged in the coverage-risk panel; per-employee "propose dates" buttons.
- **Suggestions** — `src/core/leave.ts` scores candidate windows against team coverage (department absence per day), existing bookings, the employee's own requests, and public holidays (bridge-day bonus), returning the top 3 windows with human-readable reasons.

## 303. Temporary / freelance worker manager (non-CNAS)

`OccasionalWorkersModule` manages short-term workers paid per task/piece under the pigiste payment type: identity/skill/rate CRUD, missions with rich-text descriptions, live gross → IRG-at-source → net computation, invoice/justification references, payment workflow and GED links. A permanent banner recalls the legal treatment (non-CNAS, IRG withheld at source) and warns before registering a mission.

## 304. Employment contracts & electronic signature workflow

- **304.1 Contracts CRUD** — translated manager for `employmentContracts` (type, dates, position, salary, hours, trial period, rich-text clauses, status workflow *draft → sent → signed → archived*, GED + printable PDF).
- **304.2 Work rules, general terms & e-signature** — `workRules` publishes versioned rules/terms (FR/AR/EN rich HTML). Employees read, accept and sign each document from their portal; signatures store identity, session, timestamp, device and the accepted version. The rules/terms are **visible to every employee**, and an **alert/reminder banner** shows until everything is accepted and signed.
- **304.3 Conflict-of-interest declaration** — checkboxes for the three commitments (ethical conduct, non-disclosure, no conflicts) and an editable rich-text (HTML) field to detail other jobs / external engagements, each question carrying explanatory notes and using the appropriate input type.
- **304.4 Guided onboarding** — a step-by-step wizard (read rules → accept/sign rules → accept/sign terms → sign contract → conflict declaration) with each step flagged completed or pending and an overall progress bar.
- **304.5 Admin-configurable restriction** — Administrators choose which modules are blocked in the employee's personal space until the onboarding is complete (`settings/app-settings.portalAccessPolicy`); enforcement happens in the router (`app.isOnboardingBlocked`) with a lock screen showing the pending steps.

## 305. Role-based dashboard & module visibility

`DashboardModule` now renders **only the blocks permitted by the user's role** (KPI cards, charts, alerts and lists are each gated by their module permission). The page opens with a **personal workspace summary** (own tasks, unread notifications, own leaves, pending approvals, role-relevant KPIs) and a role badge. Sensitive figures (revenue, receivables, stock valuation…) only render for roles holding `sales`, `reports`, `inventory`, `importExport` or `tenders` permissions; navigation enforces the same matrix on every module.

## Data model & wiring

New IndexedDB stores (schema v19): `leaveTypes`, `publicHolidays`, `leaveRequests`, `workedHolidays`, `paymentTypes`, `employmentContracts`, `ruleAcceptances`, `conflictDeclarations`, `workRules`, `occasionalWorkers`, `workerAssignments`, `onboardingStates`. Reference codes `CONG`, `CTT`, `OCC`; GED modules `leaveRequest`, `employmentContract`, `workerAssignment`; MySQL migration `sql/migrations/009_leave_contracts_onboarding.sql`; external connector mappings in `external-db.js`. Pure calculation logic lives in `src/core/leave.ts` (exported as `SariCore.leave`) and is unit-tested in `tests/leave-management.test.ts`.

## 315–322. Leave lifecycle, dual contract signatures and work certificates

Pending employee leave requests remain viewable, editable and deletable from the portal. Approved leave is immutable; postponement, modification and cancellation create a linked `submitted` request (`parentRequestId`, `requestKind`, mandatory `changeReason`) for a fresh approval. Portal actions use Lucide icons and enforce status checks in their handlers.

Employment contracts now render as full Algerian notarial-style documents identifying the company and employee, with standard articles, obligations, reusable position tasks and framed dual signature blocks. `positionFunctions` is CRUD-managed by position and is reused by work certificates. Each party records full name, role, place, timestamp and a canvas-drawn signature. The final dual-signed paginated PDF is automatically stored in GED and linked both to `employmentContract` and `employee`.

`workCertificates` and configurable `certificateTemplates` provide CRUD for salary/no-salary/task variants. Employees can request certificates in the portal; `settings/app-settings.certificateAutoGeneration` selects automatic or manual generation. A manager canvas-signs the final document, which is saved as PDF in GED and linked to the employee.

The leave calendar uses an invariant Sunday-to-Saturday column sequence (`[0,1,2,3,4,5,6]`); configured workdays only change calculations/colouring, so Friday and Saturday remain successive weekend columns.
