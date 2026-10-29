# Changelog

## 5.3.0 - 2026-10-22

- Split Dispatch configuration into EU and US regions.
- Add structured failed-delivery reasons and clearer stop action feedback.
- Expand mocked-native regression coverage; offline mode remains disabled.

## 5.2.1 - Persist POD photos to encrypted storage (INC-2026-031 interim fix)

2026-08-28

- Add AES-256-GCM sandbox storage with a hardware-keystore key boundary.
- Keep pending signatures and photo references in memory; durable queue recovery
  remains tracked by ADR-014.

## 5.2.0 - 2026-08-07

- Require parcel scan verification before collecting delivery evidence.
- Add signature capture to the foreground stop completion flow.

## 5.1.0 - 2026-06-19

- Add coarse connectivity classification for courier actions.
- Restrict operational log metadata to stop IDs under MDS-4.
