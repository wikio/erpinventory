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

## 323–335. Versioned HR content, scoped access and authenticity

Work rules and terms expose every version with active-version selection and CRUD. Contract and conflict-declaration template managers provide reusable CRUD content; declaration models define ordered steps, typed checkbox/text questions and commitments. Job-position types are filterable by department/status and own their grouped functions.

Leave and payslip managers now enforce record scoping in both rendering and action handlers: non-admin users see only calendar/their leave requests and their own payslips, while configuration, templates and all-employee selectors remain administrator-only. The portal uses section sub-navigation and issued certificates expose consult, print and download actions.

Generated contracts, certificates and payslips carry verification QR marks. Contract PDF generation uses the shared repeating header/footer renderer with reserved header/footer capacity and page/total pagination, preventing content overlap and applying professional HR-document typography.

## Advanced HR document layout, template composition and multi-RC fiscal sources

HR contracts, work certificates and payslips use a shared modern header with dynamic LTR/RTL direction, company logo/fiscal identity and employee identity. PDF safe areas reserve additional space below repeating headers and above footers; generated PDFs retain page/total pagination.

Contract templates now contain an advanced HTML top section, drag/drop ordered articles with title/content, clickable employee/company/contract/position placeholders, and advanced bottom notes. Employee variables resolve both legacy and canonical employee fields (`birthDate`/`dateOfBirth`, `address`/`postalAddress`). Conflict-declaration templates similarly expose drag/drop HTML steps, typed questions (text, checkbox, radio, textarea or HTML) with expected results, and independently editable commitments.

Trade registers carry `registerKind` (`principal`/`annexe`) and `isDefault`, with one principal/default enforced by the application. Company fiscal settings provide RC autocomplete and editable prefilled overrides. Contracts, certificates and payslips store a per-document fiscal source and optional `rcId`.

## Generated/manual legal clauses, fiscal visibility and employee payslips

Contract templates can regenerate the complete legal article baseline and then allow every generated article to be edited and drag/drop reordered with an explicit order indicator. Declaration template steps, questions and commitments use the same ordered drag/drop presentation; question labels receive the flexible width while the component selector remains compact.

Fiscal display is configurable globally and per contract, certificate or payslip. Unless “General configuration” is explicitly selected, HR documents resolve the active default/principal RC automatically. Modern headers always include the configured company logo and address; fiscal identifiers may be hidden without removing the company identity. Payslip designer elements duplicated by the modern repeating header are suppressed.

The employee portal navigation is translated in French, English and Arabic and includes a “My payslips” section restricted to the linked employee, with month and date-range filters plus consultation, print and download actions.

## Styled employee consultations and professional HTML editing

The employee portal now renders a complete, standard styled payslip consultation (KPIs, employee identity, earnings, deductions, work/payment data and leave adjustments) instead of a text alert. Certificates expose a formatted consultation alongside print/download actions, and the Documents section lists other GED files linked to the employee.

The shared rich HTML editor now includes undo/redo, bold/italic/underline/strike-through, heading and font-size selectors, text/highlight colours, bullet and numbered lists, alignment, indentation, links, image upload and 25/50/100% resizing, tables, separators, format clearing, visual/source/preview modes, predefined placeholders and custom configurable attributes.

Repeating document PDF rendering reserves 12 mm after the header and 10 mm before the footer, in addition to increased HTML body padding, preventing clipping in contracts, certificates and payslips.

## Personalized contract/certificate designs and optional pagination

Contract and work-certificate templates now own their visual design: advanced custom header/body/footer HTML, accent colour, font family, fiscal visibility and pagination visibility. Multiple models can be created, edited, duplicated and deleted. Empty custom headers/footers continue to use the modern automatic HR shell.

Generated documents expose `data-show-pagination`; PDF engines honour it for both simple and repeating-header exports. Pagination is drawn in a dedicated white band centred below the document footer (`Page X sur Y`) rather than in the footer’s bottom-right content area, eliminating overlap. It can be hidden per template or overridden per contract/certificate.

## Compact consultation-style payslip and portal modal reuse

The employee portal “Consult” action now lazy-loads the Payslip module, refreshes its domain data and calls the exact standard `PayslipsModule.view` consultation modal, retaining the employee ownership guard. The consultation print template is upgraded in place to a four-part, one-page layout: gradient identity header, four payroll KPIs, employee/gains/deductions panels, four work/payment KPIs and a protected QR area.

Known designer payslip templates are migrated to compact coordinates so Gains/Retenues sit closer to CNAS/Net and leave enough room for QR rendering. Repeated PDF footers now reserve a 26 mm bottom band plus 14 mm footer gap; work-certificate archival uses the same repeating header/footer PDF engine to prevent footer text truncation.

## Framed one-page consultation payslip v4

The consultation-style payslip now uses a white framed header split into company identity (logo, legal name, address/fiscal data) and payroll identity (dark `FICHE DE PAIE` title band, reference, employee and period). Employee information is deliberately smaller; four KPI blocks, three detail panels, four work/payment blocks and the QR/footer are constrained to a 270 mm A4-safe flex layout. Existing consultation templates upgrade in place through `consultationStyleVersion = 4`.

The employee portal consultation button now lazy-loads `PayslipsModule`, refreshes its data through `loadData()` and opens the exact shared standard modal with `PayslipsModule.view(id)`, avoiding missing shared helpers in the portal chunk.

## Payslip employee address, period bounds, notice date and notes

Payslip editing now records a notice/issue date. Both the standard consultation and consultation-style print model include the employee postal address, calculated period bounds (first through last calendar day), and notice date. Rich-text notes render in a compact optional block immediately above the one-page footer. Existing consultation templates upgrade in place through `consultationStyleVersion = 5`.

## Compact IBM PDF typography and editor icon hydration

Consultation payslip PDFs use `IBM Plex Mono`, `IBM Plex Sans Arabic`, monospace throughout. The fixed page-height spacer was removed and the footer now follows the final table/work/note block with a 2 mm gap while remaining inside the A4 limit. Existing templates upgrade through `consultationStyleVersion = 6`.

The local Lucide allowlist now includes every icon used by the professional HTML editor (formatting, alignment, lists, image, table, undo/redo and cleanup). Rich editors also schedule icon hydration after dynamic insertion, complementing the global mutation observer.

## Normalized readable payslip PDF tables

Generated payslip Gains/Retenues tables now use fixed column proportions, vertically centred 6.6 mm rows, consistent 9.5 px labels and enlarged 10.5 px tabular-numeric values. Header/footer rows and print-specific padding are normalized to preserve one-page output while improving readability and numeric alignment.

## Dynamic login and browser icon branding

The uploaded application `siteLogo` is now the single branding source for the authenticated shell, login card logo, browser favicon and Apple touch icon. Branding is mirrored in local storage for immediate login rendering, then refreshed from IndexedDB before session validation. Removing the uploaded logo restores all default SARI marks consistently.

## Free-text company contacts and reusable template attributes

Company telephone numbers are stored as unrestricted multi-line text, allowing several numbers, switchboards and extensions with arbitrary separators. Additional mobile, fax, WhatsApp, website, LinkedIn, Facebook and YouTube coordinates are editable in Company settings and exposed as `{{company.*}}` attributes in general document templates, contract/certificate advanced editors and payslip HTML templates.

## Dynamic company identity on login and ERP header

The configured `companyName` and `companySubtitle` now populate the login brand and the authenticated ERP top header, in addition to sidebar/footer identity. Dynamic header fields are no longer overwritten by static i18n labels on language changes. Saving Company settings reapplies branding immediately and updates the browser document title.

## Authoritative configured legal company name

On workspace startup, portable content now acts only as a fallback: IndexedDB Company settings are merged last so the value saved in “Raison sociale / nom de société” cannot be replaced by the portable default. The configured legal name and subtitle remain authoritative for login, ERP header, sidebar, footer and browser title, and are reapplied immediately on save.

## Standards-compliant URL verification QR codes

The former visual “QR-like” matrix has been replaced by the ISO-compliant `qrcode` encoder with error-correction level M and a preserved four-module quiet zone. QR payloads are normalized absolute URLs, marked as URL type, and link to the configured verification page with document code/hash bindings. Base URLs without placeholders automatically receive the document identity path. HR documents also expose a clickable verification link next to the scannable QR.

## Per-document fonts and canonical vector QR URLs

Contract and work-certificate edit forms now expose font-family selectors. Their initial value resolves from the record, selected template, globally configured HR default, then IBM Plex fallback; changing a contract template reloads its configured font. Company settings provide the global HR default selector.

Document QR images are emitted as crisp, resolution-independent SVG data URLs from the standards QR matrix. Every verification payload has one canonical structure only: `base URL / exact document code / automatically derived code hash`. Template placeholders and caller-provided prefixes/suffixes are stripped from the base, and `DocumentSecurity` uses the same deterministic code-derived hash for verification.

## Per-type font configuration, centralized QR pattern and disk-backed GED

Font defaults are configured in their owning modules rather than General settings: Contracts templates, Work Certificates, and Payslip templates each persist an independent default while records/models may override it. Edit selectors resolve record → model → section default → IBM fallback.

All document security URLs now use the single `barcodeLabelSettings/default.qrPattern` configured under “Étiquette code-barres”. `{code}` and `{hash}` (plus supported optional attributes) are replaced for sales invoices, quotes, delivery/purchase documents, labels, contracts, certificates and payslips; the hash remains automatically derived from the document code.

GED binaries are persisted by the authenticated server under `GED/{documentType}/{id}-{filename}`. IndexedDB and external databases retain metadata (`storagePath`, `diskPath`, MIME, size, links, tags) but clear binary `data` after successful disk writing. Existing IndexedDB binaries migrate after authenticated workspace startup. Offline/server-unavailable operation explicitly retains a temporary IndexedDB fallback; preview/download/delete support both modes.

## Commerce-managed RC selector in Company settings

The Company/Fiscal settings RC field now uses `ManagedAutocomplete` directly against the same `tradeRegisters` IndexedDB store rendered by Direction de Commerce. Users see register number, legal name, Principal/Default badges while the hidden field stores the stable technical ID. Invalid legacy IDs such as `trade-register-main` are no longer displayed as labels; selection falls back to the managed default/principal register. A “Gérer les RC” action opens Direction de Commerce on its Trade Registers tab.

## GED physical filename codes and synchronized renaming

Physical GED filenames use `UNIQUE_CODE-UNIQUE_ID.extension`. The stable suffix is the GED document ID; the code resolves from ERP reference/code, editable GED `fileCode`, or the original basename. IndexedDB/external metadata stores `fileCode`, `fileName`, `storagePath`, `diskPath` and naming version. Editing the code, display filename or document type triggers an authenticated PATCH that renames/moves the physical file and atomically updates metadata. Legacy disk names migrate to naming version 2 at authenticated startup.

## Universal phone/tablet responsiveness and mobile autocomplete search

The ERP shell now enforces viewport containment for all dynamic modules, cards, media, dialogs and print previews. Tablet/phone/compact-phone breakpoints adapt root and heading font sizes, padding, touch target sizes and modal dimensions. Module tabs remain visible in a horizontal touch-scroll strip, and the full sidebar independently scrolls on short screens.

Managed and dialog autocomplete fields expose a mobile-only Search button. It opens a bottom-sheet picker with a dedicated query, filtered touch-sized results, stable code selection and normal input/change event propagation. Desktop keeps native datalist behavior unchanged.

## Immediate cached branding hydration

Company identity (`companyName`, `companySubtitle`, `siteLogo`) is now cached as one branding object whenever settings are applied. The shell applies this cache immediately when the application module loads—before `DOMContentLoaded`, authentication, CAPTCHA and IndexedDB work—then refreshes it from authoritative Company settings. This removes the default-name flash and delayed login title correction.

## Sections 348–349 — adaptive mobile/tablet layer and smart scanner

The shell detects desktop/tablet/mobile form factors. Tablets use a condensed icon rail and compact tables; phones use a role-filtered 4–5 action bottom bar plus the full slide-over menu, card-form tables, full-screen modals and WCAG 44 px coarse-pointer targets. Offline IndexedDB behavior remains unchanged. Android/iOS manifest metadata and in-app splash use the SARI blue/lime/amber palette.

On camera-capable mobile/tablet devices, the contextual full-screen scanner supports QR, EAN-13/EAN-8, Code128 and Code39 through dynamically loaded ZXing. It includes environment camera preference, animated target, torch capability detection, last-result confirmation and manual fallback. Product barcode/SKU/reference matching routes to sales/POS carts, purchase documents, inventory counts or product detail. Verification URLs call the public hash endpoint and combine the result with local ERP document metadata; unknown content receives copy/open actions. Scanner strings are fully translated FR/EN/AR.
