# SARI Système modernization architecture

## Migration decision

This release is the **compatibility build/persistence phase**, not a UI rebuild. Vite is intentionally used before Next.js because the current 22-prompt application is a client-only, IndexedDB-first SPA with hundreds of inline action bindings and 67 local stores. Moving those screens directly into React Server Components would couple a framework rewrite to the highest-risk data migration and violate the mandated stage order.

Vite is an explicit bridge allowed by Section 212. It now supplies compiled Tailwind, ES-module isolation, hashed assets, minification, Workbox, local fonts/vendors and per-domain chunks. The public `window.*` contracts are retained while screens are moved to React incrementally. **Next.js remains the target shell** once these contracts have typed adapters; it should consume the same `src/core` interfaces and Nest API without rewriting domain behavior.

Likewise, the lightweight server remains in place during the normalized persistence migration. A NestJS cutover before repository contracts and migration reports stabilize would change authentication, HTTP behavior and persistence simultaneously. The next backend phase should move each boundary below into a Nest module without changing its API. This is a sequencing constraint, not a switch to a different target stack.

## Runtime boundaries

- **Web shell** — `index.html`, `src/main.ts`, compiled Tailwind and the compatibility route loader.
- **Critical typed core** — `src/core/db.ts`, `sync.ts`, and `template-engine.ts`; framework-independent and covered by Vitest.
- **Functional domains** — lazy chunks under `js/modules/`: Dashboard, Inventory, Inventory Operations, Sales, Purchases, Suppliers, Customers, Import/Export, Tenders, GED, HR, Tasks, Portal, Taxes, Reporting, Translation and Administration.
- **Offline repository** — IndexedDB remains the immediate-write cache and offline queue. It is not replaced by Workbox.
- **Server repository broker** — `external-db.js` owns pooled MySQL/PostgreSQL/MongoDB clients. Browser code never receives database credentials or opens database protocols.
- **Portable file content** — `file-content.js` reads configuration, templates and translation packs from `SARI_CONTENT_DIR` (default `content/`). Deployments can mount this path outside the release directory.
- **Packaging** — Tauri and Capacitor both consume the same `dist/` output.

## Target NestJS modules

| Target module | Existing boundary | Responsibility |
|---|---|---|
| `AuthModule` | `/api/auth/*` in `server.js` | users, CAPTCHA, lockout, sessions and guards |
| `PersistenceModule` | `external-db.js` | repository tokens, primary pools, replica pools and transactions |
| `MigrationModule` | `/api/db/migrate-batch` | typed migration DTOs and per-run reports |
| `ContentModule` | `file-content.js` | portable config/template/translation import/export |
| `IntegrationModule` | `/api/integration/*` | hashed bearer tokens and configured public endpoints |
| domain modules | lazy UI module names | Invoicing, Inventory, HR, GED, Tenders, Import/Export, Reporting |

Controllers must depend on repository interfaces, never Prisma/mysql2/Mongoose directly. Prisma is the preferred relational implementation after the current SQL schema and bridge IDs are stable. MongoDB remains a separate adapter behind the same interface.

## HTTP and asset policy

- `dist/assets/*-[hash].*`: one-year immutable cache.
- `index.html`, `manifest.json`, `sw.js`: revalidate on every use.
- static text assets: Brotli when accepted, otherwise gzip; all receive ETags.
- Workbox precaches build assets, uses cache-first for static resources, network-first for navigation, and stale-while-revalidate for safe GET API resources.
- authentication, DB configuration, tokens and every mutation are excluded from Workbox runtime API caching.
- no runtime CDN is permitted. Chart.js, the local XLSX reader, jsPDF/html2canvas, Lucide and fonts are bundled from local npm packages. The vulnerable legacy SheetJS npm build was replaced by `read-excel-file`.

## Database invariants

1. Every IndexedDB domain maps through the `STORE_TABLES` allowlist to one normalized table/collection.
2. `numericId` is the stable relational key; `legacy_uid` preserves the offline string ID for relationship resolution.
3. Values are always passed as prepared-statement parameters. Dynamic table/column identifiers come only from server allowlists or database metadata.
4. A migration batch is a transaction; each record has a savepoint so the report can identify failures without losing valid rows.
5. Order and purchase-document lines are persisted in normalized child tables in the same transaction.
6. Reporting reads use `SARI_DB_REPLICA_*` when configured; mutations always use the primary pool.
7. Passwords are read only from environment variables. `.runtime/external-db.json` contains non-secret connection metadata.
