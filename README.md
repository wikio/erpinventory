# SARI Système – Medical Equipment & Consumables Distribution Management System

**SARI Système** is a modern, Apple-style, production-ready, bilingual/trilingual (**Arabic / French / English**), offline-first Progressive Web Application (PWA) and ERP-lite distribution management dashboard designed specifically for **SARI Système**, an enterprise based in **Algeria** specialized in:
- Distribution and sale of medical equipment and medical consumables.
- International import and export of medical products.
- Participation in public and private hospital consultations / tenders (*appels d'offres*) across Algerian wilayas and abroad.

---

## 🌟 Key Apple-Style Visual & System Highlights

1. **Apple-Style Full-Width Layout (100% Large) + Lucide Icons**:
   - Sleek frosted glass (`backdrop-blur-xl`) sidebar navigation with **locally bundled Lucide icons** (no runtime CDN).
   - Unconstrained full-width (`100%`) viewport content area so tables, KPI cards, and Chart.js analytics stretch across large screens.
2. **4 Native Themes (Apple Style)**:
   - *Sari Classic (Default)*: Official palette (`#009CC5`, `#C6DA34`, `#EBB51A`, `#FFFFFF`).
   - *Sari Clinical*: Cool/sober teal (`#0D9488`, `#14B8A6`, `#99F6E4`) optimized for dense screens (inventory, reports, BPU).
   - *Sari Sunset*: Warm amber/orange (`#EA580C`, `#F59E0B`, `#FEF3C7`) tailored for commercial modules (tenders, sales).
   - *Sari Midnight*: True native dark mode (`#030712` dark bg, `#0F172A` slate cards, `#38BDF8` blue accent) for warehouse night shifts.
3. **Trilingual Language & Direction Support**:
   - **French (`fr` - LTR)**: Official medical distribution & tender terminology in Algeria.
   - **Arabic (`ar` - RTL)**: Complete Right-to-Left RTL layout flip with Arabic script translation.
   - **English (`en` - LTR)**: Full international import/export standard English support.
4. **Database Agnostic Architecture (`DBAdapter`)**:
   - Seamlessly switch between the default embedded **IndexedDB** (`indexeddb` offline-first PWA), **MySQL 8.0** (`mysql`), **PostgreSQL 15+** (`postgresql`), and **MongoDB 6.0** (`mongodb`).
   - Includes standalone SQL files for relational database deployment:
     - `sql/schema.sql` (Structure DDL only)
     - `sql/seed_data.sql` (Example Algerian medical dataset DML separately)
5. **Global Configuration & Fiscality**:
   - Configure company contact details, address, phone, email, website, and Algerian fiscal identifiers (**NIF**, **RC**, **AI**, **NIS**, **Bank RIB**, 19% TVA tax rate) directly from **Paramètres &rarr; Entreprise & Fiscalité**.
6. **Translation Management Module (`js/modules/translations.js`)**:
   - View, search, and edit French, Arabic, and English strings in real time.
   - Add new custom translation keys and export/import `.json` language packs.
7. **Data Tools & Backups**:
   - Table-by-table CSV download or **Export All Stores to CSV** simultaneously.
   - Full system `.json` snapshot backups and restore.

---

## 🆕 Operations, GED, HR & Collaboration

- **Interactive tender checklists:** IndexedDB-backed checklist lines with inline status, deadlines, notes, attachments, progress indicators, and independent template instances.
- **Central GED:** reusable offline document records linked through generic `recordType` + `recordId` associations; upload, preview, version replacement, metadata, expiry, unlink/delete, and multi-record linking.
- **Enhanced commercial documents:** invoices, quotes, purchase orders and BL with DZD/EUR/USD, French/Arabic amounts in words, line/global discounts, delivery fees, per-rate VAT breakdown, configurable QR data, price-free BLs, notes, and visual templates.
- **Human Resources:** employee profiles, employee documents, missions, vacancies and candidate Kanban pipeline.
- **Tasks & supervision:** personal/team Kanban with configurable stages, priorities, linked ERP records and Day/Week/Month/Year planning scopes.
- **Granular permissions:** database-backed role permission matrix for view/create/edit/delete plus optional employee-level overrides.

IndexedDB schema version 16 now includes 67 offline stores. It adds centrally managed VAT rates, ERP-wide configurable reference masks and sequence counters, employee career records, conversations, and messages; all are included in JSON backups.

Additional administration tools include responsive/collapsible navigation, separate site and financial-document logos, a dependency-free rich text editor, an employee self-service portal, internal messaging, and a visual drag/resize document-template designer with live merge-field previews.

Version 16 adds configurable barcode/QR product labels, translated sales/purchase/partner/HR workflows, instant coupon feedback and linked manual discounts, dedicated print-only windows, larger PDF bottom margins, and a complete recruitment workflow with JOB references, advanced job HTML, sortable objectives/prerequisites and candidate CRUD. Numeric IDs, SARI references, DB-backed translations/coupons, SQL dumps and optional encrypted external database connectors remain included. It retains complete module-level FR/AR/EN coverage, translated rich-editor/barcode UI, GED previews/downloads, all-store data tools, quick profiles, inline translation, configurable metadata, 250 countries, reports, templates, fixed PDFs, workflows and the public API.

## 🗄️ Optional External Database Backend

The browser never connects to a database protocol directly. MySQL is the primary production target; PostgreSQL and MongoDB remain repository adapters. IndexedDB always remains the immediate-write offline cache and synchronization queue.

External persistence now uses long-lived connection pools, prepared statements and one normalized table per entity. Migration batches are transactional, idempotent upserts keyed by `numericId`, preserve offline IDs in `legacy_uid`, and report failures per record. Sales and purchase lines are written to normalized child tables in the same transaction. Reporting queries use an optional read-replica pool.

Database passwords are **never written to `.runtime/`**. Set `SARI_DB_PASSWORD` in the server environment; optional connection metadata entered under **Settings → Database** contains no secret. Initialize/upgrade MySQL with:

```bash
SARI_DB_HOST=localhost SARI_DB_NAME=sari_erp_prod \
SARI_DB_USER=sari_admin SARI_DB_PASSWORD='...' npm run db:migrate
```

Replica variables use the `SARI_DB_REPLICA_` prefix (`HOST`, `PORT`, `NAME`, `USER`, `PASSWORD`).

## 🏥 Core Functional Modules

- **Dashboard Home**: Interactive KPI summary cards, Low-Stock / Near-Expiry alerts, 5 Chart.js analytics charts, Active Tenders & Deadlines, Import Shipments in Transit, and Audit Log timeline.
- **Inventory Module**: Full CRUD for diagnostic equipment, medical consumables, ICU furniture, and PPE. Includes **Lot/Batch Traceability Lookup Modal** and **Canvas Barcode & QR Code Printable Label Generator**.
- **Suppliers Management**: Algerian distributors and international manufacturers (China, Germany, France). Includes **Local vs. Import Sourcing Comparison Calculator** to compare DZD local buying vs. EUR/USD landed import costs.
- **Import / Export Management**: Track maritime/air shipments (Order Placed &rarr; In Transit &rarr; Customs Clearance at Port d'Alger &rarr; Received). Includes **Customs Documentation Checklist (D10)** and multi-currency **Landed Cost Calculator**.
- **Tenders & Consultations (Appels d'Offres)**: Track public/private consultations (CHU Mustapha Pacha, DSP Wilayas, EHS). Includes an interactive **Bid Preparation Workspace (Pricing Worksheet)** linking catalog inventory items to tender line items, calculating profit margins and unit bid prices.
- **Sales & Distribution (POS + B2B Orders)**: Quick POS checkout & B2B order builder with barcode scanner simulator, Algerian 19% TVA tax calculation, and printable **Facture / Bon de Livraison (BL)** template.
- **Customer Management**: Public hospitals, private clinics, pharmacies, and wilaya health directorates with NIF/RC fiscal numbers and credit limits.
- **Reporting Module**: Multi-tab analytics for Inventory valuation, Sales by Wilaya, Import Landed Costs, Tender Pipeline, and Profit estimates with CSV and PDF export.

---

## 🗄️ SQL Schema & Seed Data Files (`/sql`)

For deployments using external relational databases (MySQL / PostgreSQL / MariaDB), SARI Système provides cleanly separated DDL and DML files in `/sql`:
- **`sql/schema.sql`**: Complete database structure (including `users`, core ERP entities, `vat_rates`, `document_codes`, `sequence_counters`, `conversations`, and `messages`), indexes, and foreign keys.
- **`sql/seed_data.sql`**: Separate DML file with sample Algerian medical distribution records (4 Depots, Suppliers in China/Germany/France/Algeria, 8 Medical Products, CHU Mustapha, DSP Blida, etc.).

To initialize in MySQL / PostgreSQL:
```bash
mysql -u root -p sari_erp_prod < sql/schema.sql
mysql -u root -p sari_erp_prod < sql/seed_data.sql
```

---

## 🔐 Secure connection, CAPTCHA & user roles

The ERP is protected by a server-side login gate with a single-use arithmetic CAPTCHA. Passwords use salted **scrypt** hashes, sessions use `HttpOnly`/`SameSite` cookies, and repeated failures trigger a temporary lockout. A user's role is assigned by the server and can no longer be changed from the browser.

Demo accounts use the password **`Sari@2026`**:

| Username | Role |
|---|---|
| `admin` | Administrator (full access) |
| `stock` | Inventory manager |
| `import` | Import/export manager |
| `tenders` | Tenders manager |
| `sales` | Sales employee |
| `viewer` | Read-only observer |

These accounts are for demonstration. Replace the built-in repository in `server.js` with your production user database and rotate all credentials before deployment.

## 🚀 Build and run

```bash
npm install
npm run dev       # Vite on :3000 + API server on :3001
npm test
npm run typecheck
npm run test:e2e  # Playwright desktop + mobile responsive checks
npm start         # production build, then the API/static server on :3000
```

The production build compiles Tailwind, self-hosts/subsets fonts, emits hashed core and lazy domain chunks, and generates the Workbox service worker. The server adds ETags, immutable caching for hashed assets, revalidation for the app shell, and Brotli/gzip compression.

Portable settings, templates and translations can be mounted with `SARI_CONTENT_DIR`; see [`docs/portable-content.md`](docs/portable-content.md). Architecture decisions and target Next.js/NestJS boundaries are documented in [`docs/architecture.md`](docs/architecture.md), and Tauri/Capacitor commands in [`docs/packaging.md`](docs/packaging.md).
