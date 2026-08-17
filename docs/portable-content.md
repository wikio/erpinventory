# Portable configuration, templates and translations

Set `SARI_CONTENT_DIR=/mounted/sari-content` to keep editable files entirely outside the application release. Without it, the versioned examples under `content/` are used.

## Layout

```text
content/
  config/site.json
  templates/*.json
  templates/*.html
  translations/fr.json
  translations/ar.json
  translations/en.json
  holidays/2011.json … 2031.json   (Algerian public-holiday files, Sections 309.2/309.4)
```

Names are restricted to safe single-file names and supported extensions. Writes are size-limited, JSON-validated and atomically renamed.

## Authenticated API

- `GET /api/content/{config|templates|translations|holidays}` — list files.
- `GET /api/content/{kind}/{name}` — read a parsed JSON value, raw CSV or HTML (holiday files return `format: json|csv`).
- `PUT /api/content/{kind}/{name}` with `{ "content": ... }` — administrator-only import/update.
- `POST /api/content/reload` — administrator-only snapshot/reload without deployment restart.

The repository reads from disk on every request, so an external editor can update files without a redeploy. `site.json` is merged into shell branding after authentication. Translation JSON is the portable bulk-edit format; the IndexedDB/relational `translation_texts` repository remains the live runtime source. Template JSON/HTML can be imported into `documentTemplates`, while preserving the existing designer and HTML modes.
