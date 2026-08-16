# Authentication, activation and SMTP

Runtime identities are stored in `.runtime/auth-vault.json` with scrypt salts/hashes and file mode `0600`. The initial hash-only identities come from `secure/auth-bootstrap.json`. Both `.runtime/` and `secure/` are explicitly denied by the Node and Vite HTTP servers; neither is available through content APIs, exports or the UI.

The Administrator account is not considered a demo account. It cannot be deleted, and globally disabling demos only affects role-specific sample identities.

Password-reset requests remain pending until an Administrator approves them. Activation/reset tokens are random 256-bit values; only SHA-256 token hashes are stored. Raw links are displayed once for copy/QR/email delivery and expire after 24 hours.

SMTP metadata is stored in `.runtime/smtp.json`; its password is never persisted there. Supply it in the UI for the current server process or use `SARI_SMTP_PASSWORD` for durable deployments.
