# Authentication, activation and SMTP

Runtime identities are stored in `.runtime/auth-vault.json` with scrypt salts/hashes and file mode `0600`. The initial hash-only identities come from `secure/auth-bootstrap.json`. Both `.runtime/` and `secure/` are explicitly denied by the Node and Vite HTTP servers; neither is available through content APIs, exports or the UI.

The Administrator account is not considered a demo account. It cannot be deleted, and globally disabling demos only affects role-specific sample identities.

Password-reset requests remain pending until an Administrator approves them. Activation/reset tokens are random 256-bit values; only SHA-256 token hashes are stored. Raw links are displayed once for copy/QR/email delivery and expire after 24 hours.

SMTP metadata is stored in `.runtime/smtp.json`; its password is never persisted there. Supply it in the UI for the current server process or use `SARI_SMTP_PASSWORD` for durable deployments.

## Account email templates and delivery history

SMTP configuration is a standalone Administrator page reached from **Settings → SMTP Configuration** (`#smtp`). It is intentionally not rendered by the User Accounts module. Its password follows the existing server-memory-only rule (`SARI_SMTP_PASSWORD` or the current Node process memory).

Administrator APIs for localized HTML templates:

- `GET|POST /api/admin/email-templates`
- `GET|PUT|DELETE /api/admin/email-templates/:id`
- `POST /api/admin/users/:id/send-email`
- `GET /api/admin/users/:id/email-history`

Templates contain `fr`, `ar`, and `en` values for their name, subject, and sanitized HTML body. Supported placeholders are `{qr_password_link}`, `{qr_activation_link}`, `{name}`, `{email}`, and `{message}`. Reset and activation links are issued by `AuthVault`; only token hashes are persisted. QR images and raw links are generated at send time and are not written to delivery history. The history stores delivery metadata and sent/failed status, not message bodies or raw action tokens.

### Embedded QR images and email typography

QR placeholders are generated as real PNG base64 data URIs. The SMTP transport defaults to `inline_attachment`: Nodemailer converts those data URIs into MIME `Content-ID` inline attachments, keeping the image inside the message while avoiding the poor data-URI support of clients such as Gmail and Outlook. Administrators can explicitly retain raw `data_uri` mode from **Settings → SMTP Configuration**. Neither mode requires a public QR endpoint or remote image URL.

Arabic messages use the configurable Arabic font and French/Latin messages use the configurable French font. The bundled IBM Plex Sans Arabic and Plus Jakarta Sans WOFF2 files are loaded from `public/assets/fonts`, embedded as base64 `@font-face` data, and accompanied by email-safe system-font fallbacks.
