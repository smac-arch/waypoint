# Agent guidance

## Coding conventions

- Use strict TypeScript, named exports, small feature modules and injected
  platform/API dependencies. Avoid `any`, raw native-module access in features
  and speculative abstractions.
- Format with Prettier (single quotes); ESLint warnings fail CI.
- Preserve the scan → photo → signature → complete sequence. Await every
  network call; errors must reach the caller and UI. Never mask failures with
  successful-looking defaults.
- Mock native boundaries in Jest; do not require a native build for unit tests.
  Run `npm test`, `npm run lint` and `npm run typecheck` before handing off.
- Samples must be obviously fabricated; never add credentials or customer data.

## Mobile Data Storage & Encryption Standard

- **MDS-4:** never write personal data to logs. Use `Logger` and its `redact()`
  allowlist: stop IDs only. Recipient names, addresses, phone numbers, images,
  signatures and raw API/native errors are personal or potentially sensitive.
- **MDS-2:** store proof-of-delivery media only in the app sandbox via
  `SecureStorage`. Never use public camera rolls, external storage, AsyncStorage
  or plaintext files. Photos already follow this rule; volatile signatures and
  references are the documented INC-2026-031 gap, not an approved persistence path.
- **MDS-3:** recipient data must be purged within 1 hour of sync and never later
  than 24 hours; unsynced proof-of-delivery data older than 24 hours must alert
  the dispatcher, never be silently deleted. There is no retention/purge job or
  age-based alerting implementation yet. Do not mistake these requirements for
  implemented guarantees.

## Sync boundary

Sync design follows [ADR-014](docs/adr/ADR-014-offline-first-sync.md): encrypted
SQLite + outbound event queue with idempotency keys and exponential backoff
capped at 5 minutes. Preserve EU/US residency boundaries.

`offlineMode` remains `false`. Do not implement the offline sync queue, sync
status indicator or data-retention/purge job as incidental cleanup. Those belong
in separately scoped follow-up work. Keep the known-risk comment by
`pendingCaptures` until the persistent outbound queue replaces it.
