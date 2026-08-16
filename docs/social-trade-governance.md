# Social security, Trade Directorate and Corporate Governance

Sections 293–296 add four lazy-loaded routes: `#cnas`, `#casnos`, `#commerceDirection`, and `#companyMinutes`.

## Persistence

IndexedDB schema version 17 adds normalized domain stores for CNAS/CASNOS declarations and payments, shareholders and ownership history, company registers, social accounts, minutes, trade registers and their history, and trade requests. MySQL installations apply `sql/migrations/007_social_trade_governance.sql`; PostgreSQL and MongoDB continue through the server-side normalized connector.

Business records preserve immutable `numericId` values and use the central editable `order`/reference resequencing policy. Configurable options provide declaration statuses, CASNOS periodicities, Trade Directorate request types, PV types/templates, shareholder types, and register types.

## GED links

The standard `DocumentManager` is used with the following record types: `cnasDeclaration`, `cnasPayment`, `casnosDeclaration`, `casnosPayment`, `shareholder`, `companyRegister`, `socialAccount`, `companyMinute`, `tradeRegister`, and `commerceRequest`. The central GED explorer also exposes virtual entries for these records.

## Editors and history

CNAS declarations contain per-employee contribution rows. CASNOS declarations contain per-shareholder rows, periodicity, related registers, payment history, and time-series summaries. Company minutes use the advanced visual/source/preview HTML editor; pasted Word HTML is sanitized while compatible formatting, tables, lists, and inline styles are retained. Share and trade-register changes create immutable history rows instead of overwriting historical facts.
