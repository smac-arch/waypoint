# Waypoint Driver · 5.3.0

The courier app for **Waypoint Deliver**, a last-mile delivery platform used by
carriers. At each stop a driver scans the parcel, takes a proof-of-delivery (POD)
photo, captures the recipient's signature and completes the stop with Dispatch.

This is a compact React Native + strict TypeScript reference app. All names,
addresses, phone numbers and parcels in fixtures are fabricated, including
“Kerkstraat 12, Sampletown”. EU and US Dispatch URLs use reserved `.invalid`
domains and cannot contact a production tenant.

## Local development

Use Node 20 and npm; no Xcode, Android SDK, simulator or native build is needed.

```sh
nvm use
npm ci
npm test
npm run lint
npm run typecheck
```

`npm run test:coverage` reports coverage; `npm run format` applies Prettier.
Jest substitutes camera/scanner/signature, Keystore/Secure Enclave, sandbox and
NetInfo adapters. Encryption tests still run real AES-256-GCM using Node crypto.
`App.tsx` wires a sample stop; screen tests render it without a device.

## Architecture

| Area                           | Responsibility                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/api/DispatchApiClient.ts` | Region-scoped REST: route assignment, POD upload, completion, structured failure reporting                 |
| `src/models/`                  | Route, stop, recipient (personal data), POD and failure reasons                                            |
| `src/features/stops/`          | Sequential scan → photo → signature → upload → completion; button UI and foreground loading/error feedback |
| `src/platform/`                | Connectivity, redacted logs, native adapter contracts and encrypted photo storage                          |
| `src/config/`                  | EU/US endpoints and `offlineMode: false`                                                                   |
| `__mocks__/`, `__tests__/`     | Deterministic native stand-ins and unit/component coverage                                                 |

All network calls are **synchronous from the workflow's perspective**: each is
awaited before progressing, without blocking the JS thread. Every request checks
connectivity and fails explicitly offline. There is no background delivery or
automatic retry. Foreground retries after a confirmed upload reuse its receipt
within the same process, rather than uploading the proof twice.

POD photos are AES-256-GCM encrypted with fresh nonces and key-bound authenticated
data before sandbox writes. A 256-bit key is obtained through the hardware
keystore adapter, never hardcoded or persisted by JS. Only photos currently use
`SecureStorage`; signatures and pending-capture references remain in memory.
Logs allow only fixed event names and stop IDs, never recipient data, media,
server bodies or raw exceptions.

## Known limitations

- **The app does not work offline.** The accepted, planned offline implementation
  is [ADR-014: offline-first sync](docs/adr/ADR-014-offline-first-sync.md);
  the queue, sync status indicator and retention/purge job are not implemented.
- [INC-2026-031](docs/incidents/INC-2026-031.md) is only partially mitigated.
  Photo bytes survive process loss, but pending references, signatures and upload
  receipts do not. Orphaned photos are not recovered automatically. This is not
  a durable retry or disaster-recovery mechanism.
- MDS-3 retention deadlines and dispatcher alerts are requirements, **not yet
  enforced**. Do not use this fixture app for real recipient data.
- Native adapters are mocked contracts, not shipped iOS/Android integrations.
  Authentication, tenant provisioning, route navigation and live Dispatch
  endpoints are outside this reference setup. A real device build must wire
  `WaypointKeyStore`, `WaypointAppSandbox` and `WaypointCaptureDevice`, camera
  permissions and the native crypto library.
- Signal quality is a coarse NetInfo heuristic, not a latency or throughput
  guarantee. Unknown internet reachability is allowed when a connection exists;
  transport failures still propagate. Live API response schemas need contract
  validation before a production rollout.

See [AGENTS.md](AGENTS.md) for data-handling rules and
[CONTRIBUTING.md](CONTRIBUTING.md) for team workflow.
