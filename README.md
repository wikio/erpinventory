# SARI Système – Medical Equipment & Consumables Distribution Management System

**SARI Système** is a modern, Apple-style, production-ready, bilingual/trilingual (**Arabic / French / English**), offline-first Progressive Web Application (PWA) and ERP-lite distribution management dashboard designed specifically for **SARI Système**, an enterprise based in **Algeria** specialized in:
- Distribution and sale of medical equipment and medical consumables.
- International import and export of medical products.
- Participation in public and private hospital consultations / tenders (*appels d'offres*) across Algerian wilayas and abroad.

---

## 🌟 Key Apple-Style Visual & System Highlights

1. **Apple-Style Full-Width Layout (100% Large) + Lucide Icons**:
   - Sleek frosted glass (`backdrop-blur-xl`) sidebar navigation menu integrated with **Lucide Icons** (`https://unpkg.com/lucide@latest`).
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
- **`sql/schema.sql`**: Complete database structure (11 tables: `warehouses`, `suppliers`, `products`, `shipments`, `tenders`, `customers`, `orders`, `order_items`, `notifications`, `audit_logs`, `app_settings`), indexes, and foreign keys.
- **`sql/seed_data.sql`**: Separate DML file with sample Algerian medical distribution records (4 Depots, Suppliers in China/Germany/France/Algeria, 8 Medical Products, CHU Mustapha, DSP Blida, etc.).

To initialize in MySQL / PostgreSQL:
```bash
mysql -u root -p sari_erp_prod < sql/schema.sql
mysql -u root -p sari_erp_prod < sql/seed_data.sql
```

---

## 🚀 Quick Start (Node.js Server included)

In the project directory, start the lightweight zero-dependency server:

```bash
npm start
# or directly:
node server.js
```

The application will start listening on `http://0.0.0.0:3000` and can be accessed from any browser or live preview environment.
