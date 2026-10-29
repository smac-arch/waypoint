# ADR-014: Offline-first stop synchronization

**Status:** Accepted; implementation planned

**Decision date:** 2026-09-18

**Owners:** Driver Experience / Dispatch Integrations

## Context

Couriers lose connectivity at loading bays and doorsteps. Sequential online
requests currently block stop completion, while process termination loses
pending signatures and photo references. The encrypted-photo interim fix for
[INC-2026-031](../incidents/INC-2026-031.md) is not sufficient recovery.

## Decision

Use **encrypted SQLite** in the private app sandbox for route state and a durable
**outbound event queue**. Store POD media through `SecureStorage`, referencing it
from durable events. Assign stable **idempotency keys** before enqueuing; reuse
them for every retry and require Dispatch to deduplicate effects.

Process a stop's events in dependency order: proof upload before completion.
Retry transient failures with **exponential backoff capped at 5 minutes**;
surface permanent errors for driver/dispatcher intervention. Keep queue traffic
in the assignment's EU or US region. Never silently reroute across regions.

Apply MDS-2 sandbox encryption and MDS-4 stop-ID-only logs. Under MDS-3, purge
recipient data within **1 hour of sync**, never later than **24 hours**.
Unsynced POD data older than **24 hours must alert the dispatcher**, never be
silently deleted. Track recipient data and unsynced POD separately so the
recipient deadline does not destroy delivery evidence.

## Consequences and rollout

This requires schema migrations, crash recovery, API idempotency contracts,
dispatcher escalation and explicit operational ownership. A future sync status
indicator must accurately distinguish queued, uploading, synced and failed.

This ADR accepts the design, not its implementation. Version 5.3.0 remains
online-only (`offlineMode: false`); no outbound queue, sync indicator or
retention/purge job ships in this reference repo.
