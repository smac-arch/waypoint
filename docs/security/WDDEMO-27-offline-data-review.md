# WDDEMO-27: Offline data security and privacy review

**Status:** Preliminary repository review; pilot approval is **not granted**.
**Scope:** Repository evidence for MDS-1 through MDS-5 and lost/stolen devices
containing proof-of-delivery data.

This review is not a substitute for the Mobile Data Storage & Encryption
Standard v2.1 or written Security & Privacy approval. The linked standard and
its detailed MDS-1/MDS-5 controls are not present in this repository. Findings
below are evidence-based follow-ups, not a compliance certification. No Jira
work items or sign-off have been created by this review; those require the
appropriate project access and accountable human owners.

## Current-state assessment

| Standard | Repository evidence | Assessment |
| --- | --- | --- |
| **MDS-1 — Encryption** | `SecureStorage` encrypts stored values using AES-256-GCM and requests its key from the native key-store adapter. The adapter interface describes a hardware-backed 32-byte key. There is no native adapter implementation in this repository, and the planned encrypted SQLite queue is not implemented. | Photo encryption is present in the TypeScript boundary, but key generation, hardware backing, key lifecycle, and at-rest encryption on supported devices have not been independently verified. Do not treat the future queue as encrypted or approved. |
| **MDS-2 — Storage location** | The interim photo path writes through the app-sandbox adapter. Signatures and photo references are held in `pendingCaptures` in process memory. | The observed photo path uses the intended private-storage abstraction. Durable offline persistence for signatures and references is not implemented; no public storage, AsyncStorage, or plaintext-file path should be added. |
| **MDS-3 — Retention** | The ADR requires recipient data purge within one hour of sync, a 24-hour maximum, and dispatcher alerting for unsynced POD older than 24 hours. Agent guidance records that no purge job or age-based alerting implementation exists. | Requirements are documented but not enforced. Unsynced evidence must not be silently deleted. Retention and escalation are pilot blockers for any persistent offline queue. |
| **MDS-4 — Logging** | `Logger.redact()` uses an allowlist that emits only a validated stop ID. Stop completion logs static event names; the UI replaces raw errors with generic messages. | The reviewed TypeScript logging path follows the stop-ID-only rule. Native logging and other production telemetry are outside this repository review and still need verification. |
| **MDS-5 — Remote wipe** | No remote-wipe or queued-data revocation implementation is present in the reviewed repository. | Not demonstrated. Define and test revocation behavior for both reachable devices and devices that remain offline; do not claim remote wipe as a current safeguard. |

`offlineMode` remains disabled. ADR-014 describes a future encrypted-SQLite
queue but explicitly says it is planned, not implemented. This review does not
enable offline mode or implement that queue.

## Lost or stolen device threat model

| Threat / data at risk | Existing mitigation | Gap and required follow-up |
| --- | --- | --- |
| Device is lost while an unsynced photo is stored | The interim photo is encrypted before it is written through the app-sandbox adapter. | Verify native sandbox and key-store behavior on supported OS versions, including locked-device and backup behavior. Define key revocation and remote-wipe outcomes. |
| Device is stolen while a queue contains recipient data, signatures, or photo references | No persistent outbound queue exists; the current capture and signature state is process memory. | Before adding a queue, encrypt every persisted field, minimize identifiers and plaintext lifetime, and test extraction resistance and restart recovery. Signatures and references are a known gap, not an approved persistence path. |
| Device remains offline and cannot receive a wipe request | No remote-wipe mechanism is present. | Specify the limits of remote wipe when the device is unreachable, and require local expiry/key-destruction behavior that does not silently delete unsynced delivery evidence. Validate when the device reconnects. |
| Stolen device is unlocked or app session is active | No app-lock, session-expiry, or re-authentication controls are evidenced by the reviewed files. | Security & Privacy must assess the applicable device-management and app-session controls; document the residual risk and test the agreed controls. |
| Recipient data remains queued or sync repeatedly fails | Retention and dispatcher-alert requirements are stated in ADR-014, but no purge or age-alert implementation exists. | Implement and test the one-hour post-sync purge, 24-hour maximum, and dispatcher alert. Preserve unsynced POD evidence until an explicit, audited resolution. |
| Sensitive values leak through logs or surfaced errors | The reviewed logger allowlists stop IDs, and the screen suppresses raw error text. | Verify native logs and production telemetry also exclude recipient data, images, signatures, and raw native/API errors. |

## Proposed findings to log in the WDDEMO-24 epic

These are work-item drafts; they are **not** Jira tickets until an authorized
person creates them in the epic.

1. **Verify MDS-1 native key management and encryption on supported devices.**
   Obtain and review the platform key-store and sandbox implementations; test
   key creation, non-exportability, rotation/revocation, backup exclusion, and
   encrypted data at rest.
2. **Close MDS-2 gaps before persistent offline capture.** Specify and implement
   encrypted persistence for signatures and photo references, with no public or
   plaintext storage path.
3. **Implement and operationalize MDS-3 retention and escalation.** Enforce
   purge within one hour of sync and no later than 24 hours, while alerting a
   dispatcher for unsynced POD older than 24 hours and retaining evidence until
   explicit resolution.
4. **Verify MDS-4 across native and telemetry boundaries.** Test that logs and
   telemetry contain no recipient data, media, signatures, or raw API/native
   errors.
5. **Define and test MDS-5 remote wipe and offline-device behavior.** Document
   limitations for unreachable devices and verify the agreed local revocation
   behavior without silently deleting unsynced evidence.
6. **Threat-model the production offline queue and gate the pilot.** Review
   device compromise, queue extraction, session access, replay, and regional
   residency controls against the implemented design before enabling
   `offlineMode`.

## Approval gate

**Security & Privacy written sign-off: outstanding.** A named accountable
reviewer must compare the implementation and test evidence against the complete
MDS v2.1 standard, log the findings as work items in the WDDEMO-24 epic, record
resolutions or accepted residual risks, and approve in writing before the
pilot. This repository change does not constitute that approval.
