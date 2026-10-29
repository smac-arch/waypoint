# Contributing

Driver Experience owns stop capture and UI; Dispatch Integrations owns REST
contracts and region routing. Coordinate changes to the boundary before merging.

Branch names use `feature/WD-<number>-short-description`, for example
`feature/WD-218-route-assignment`. Use conventional commits:
`feat(stops): ...`, `fix(storage): ...`, `docs: ...` or `test(network): ...`.

Every PR must reference its Jira key (`WD-<number>`) and complete the PR template.
Include a short verification description and identify the MDS standards affected.
Never put personal data in PR examples, screenshots, logs or test fixtures.

```sh
npm ci
npm test
npm run lint
npm run typecheck
```

Add targeted tests for behavior changes, including failures. Native modules must
remain mocked in Jest. Keep the lockfile committed, use Node 20 and review
[AGENTS.md](AGENTS.md) and [ADR-014](docs/adr/ADR-014-offline-first-sync.md) before
changing data handling or synchronization.
