# Sections 315–322 — Leave Lifecycle, Dual E-Signature, Work Certificates & Calendar Fix

## 315. Employee portal — leave request lifecycle

- **Pending requests** (draft / submitted / rejected) can be **edited or deleted directly** from the employee portal, and viewed at any time.
- **Approved/taken requests** are locked: instead of edit/delete, the employee uses dedicated actions — **Postpone** (new dates), **Modify** (new dates + changes) or **Cancel** — each requiring a **reason**, recorded as an amendment request (`amendmentType`, `amendmentTargetId`, status `submitted`) that is **routed for HR approval like a new request**. When the HR manager approves the amendment in the Leave Manager, `applyLeaveAmendment()` applies it to the original leave (dates/type) or cancels it, notifies the employee and re-synchronizes the payslip adjustments.

## 316. Icons for leave actions

All lifecycle actions use consistent Lucide icons: view `eye`, edit `pencil`, delete `trash-2`, postpone `calendar-arrow-up`, modify `file-pen-line`, cancel `calendar-x-2` (added to the bundled icon set).

## 317. Contracts — e-signature & signed copy in the GED

As soon as a contract is signed (by the employee in the portal and/or by the company representative), the **signed PDF copy is automatically posted into the GED** (`documents` store, `documentType: employmentContract`), linked to both the **contract** and the **employee** records, with versioning (`ctt-pdf-{contractId}`).

## 318. Contract document — full text, header/footer, pagination & parties

The consultation, signing and PDF views now render the **full contract text** — a complete notarial-style document with:
- a **header** (company logo + fiscal identifiers) and a **footer** (company address + document reference + page counter),
- **page numbering** in the browser print output (CSS `counter(page)/counter(pages)`) and in the generated PDF (`SariUtils.createPDFBlob` now accepts an optional `pageFooter` callback),
- clear identification of the **contract type**, the **company** and the **two parties** (company / employee).

## 319. Contract template — Algerian labour-law compliant + configurable job functions

`src/core/contracts.ts` drafts a contract following **Algerian notarial conventions** and the **labour code (loi 90-11)**: parties, nature of contract, trial period (art. 14), place of work, **functions & tasks**, working hours (art. 27, Sunday–Thursday week), remuneration (CNAS 9%/26% + IRG), paid leave (art. 39: 2.5 days/month), CNAS declaration, **obligations of the employee and of the employer**, discipline (art. 73), termination & notice (art. 56/63), jurisdiction. The « Fonctions et tâches » article is populated from a **configurable CRUD list of tasks/functions per job position** (`jobFunctions` store, managed in Contrats → Fonctions & tâches), and the same list is **reused in the work certificate** (Section 321).

## 320. Dual electronic signature with canvas-drawn signature (saved as PDF)

The contract must be signed by **both parties**. For each signer the system captures: **full name**, **date/time**, **place of signing**, **title/role** (e.g. "Représentant de l’entreprise" / "Salarié(e)") and a **hand-drawn signature** traced on a new **canvas widget** (`js/signature-pad.js`, pointer events for mouse/touch/stylus). Statuses now progress `sent → employee_signed → signed`; the completed document is exported as a **styled PDF with framed signature blocks**.

## 321. Work certificate ("Attestation de travail") manager

- Full **CRUD** manager (Contrats → Attestations) with `SARI-ATT{YY}-{SEQ}` references and a GED module/type.
- **Configurable certificate types** via the option catalog: **with salary**, **without salary**, **with job tasks/functions** (from Section 319).
- The certificate is **electronically signed by the responsible manager** with a **canvas-drawn signature**, and the signed PDF is archived in the GED (employee file).
- **Employee requests** come from the portal (Section 16); generation is **automatic or manual** according to the configurable `work-certificate-config` setting (`autoGenerate`).

## 322. Leave calendar — weekend column ordering fix

`weekColumnOrder()` previously appended weekend days in numeric order, which could break the column sequence (e.g. `[Mon…Fri, Sun, Sat]` for a Monday-first configuration), misaligning day names, dates and color coding. The fixed algorithm returns a **chronological rotation of the week** starting Sunday (when it is a working day) and ending with the longest possible weekend run — so Friday/Saturday always close the grid and every day cell lines up under its column, for any configured weekend.
