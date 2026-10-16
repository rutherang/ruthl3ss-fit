# Mobile Plan: Feature-Oriented Architecture Refactor

## 1. Overview

- **Goal:** Refactor the current Expo Router app into feature-owned screens and domain logic, generic platform/API integrations, and explicit shared contracts without changing behavior.
- **Platform scope:** Android for now. Keep shared code compatible with React Native conventions, but web support is out of scope until native-only integrations have web stubs or alternatives.
- **Out of scope:** Implementing the full profile CRUD/avatar workflow during the behavior-preserving refactor phases, visual redesign, replacing the UI library, changing BLE behavior, or changing Google auth behavior beyond making account state shared. Profile workflows are the planned follow-on feature in Phase 4.
- **Approach:** Move and isolate existing behavior first. Build the profile feature and connect profile-dependent behavior after the architecture and persistence boundaries have been reviewed.

## 2. Architecture and dependency rules

Dependency direction:

```text
src/app -> src/features -> src/integrations
                  |                |
                  +-> src/types <-+
                  +-> src/lib
```

- `src/app/` contains Expo Router route entry points and layouts only. Routes may re-export feature screens; they must not own feature logic.
- `src/features/<name>/` owns screens, feature UI, hooks, domain rules, and repositories that map feature data to integration contracts.
- `src/integrations/` owns generic BLE, Google Drive, Google Sheets, and authentication APIs. Integrations must not import feature modules.
- `src/types/` contains deliberately shared contracts only. Move `TreadmillData`, `ScaleReading`, and `Profile` here when introducing the boundaries that need them. Keep `WorkoutSummary` feature-owned unless another feature or integration genuinely consumes it; the generic Sheets integration must not require it.
- `src/lib/` contains small, feature-neutral pure helpers, initially `format.ts` for `fmtTime` and `fmtPace`. Workout-specific step estimation stays with workout domain logic.
- Shared `src/components/`, `src/hooks/`, and `src/constants/` contain only code that is truly feature-neutral or used by multiple features. Do not pre-create empty feature folders.

Proposed target shape (create directories only as their first files move):

```text
src/
  app/
    _layout.tsx
    index.tsx
    scale.tsx
  features/
    account/
      AccountProvider.tsx
      useAccount.ts
      components/AccountBar.tsx
    profiles/
      screens/
      components/
      hooks/
      data/profilesRepo.ts
      domain/
    workout/
      screens/WorkoutScreen.tsx
      hooks/useWorkoutSession.ts
      domain/workoutRecorder.ts
      domain/steps.ts
      data/workoutRepo.ts
    scale/
      screens/ScaleScreen.tsx
      domain/bodyMetrics.ts
      data/scaleRepo.ts
  integrations/
    ble/
      manager.ts
      permissions.ts
      coordinator.ts
      treadmill.ts
      scale.ts
    google/
      auth.ts
      drive.ts
      sheets.ts
    storage/
      profiles.ts
      workoutQueue.ts
  types/
  lib/format.ts
  components/
  constants/
  hooks/
```

`components/`, `hooks/`, and `domain/` directories in this sketch are illustrative; add them only when moving a real file.

### Integration contracts

- BLE integration owns device protocol parsing, permissions, scanning, connection, and hardware lifecycle. `parseTreadmillData` and `parseScale` remain alongside the BLE protocol code; their return types are shared contracts where consumed across the boundary.
- Workout domain owns `WorkoutRecorder`, step estimation, and workout summary calculations. It consumes treadmill data contracts, not BLE modules.
- Google Sheets integration owns spreadsheet/folder discovery and generic operations such as `ensureSpreadsheet()` and `appendRows(tab, rows)`. It does not know about workouts, profiles, or workout column mappings.
- The Sheets integration exposes `ensureTab(tab, headers)`: create a missing tab and append any missing header columns. Each feature repository owns and supplies the headers for its tabs; existing sheets can gain new tabs or columns without a manual migration.
- `features/workout/data/workoutRepo.ts` maps a workout and its segments into rows and calls the generic Sheets integration. Preserve current row order, tab names, date formatting, rounding, and retry/idempotency behavior. Feature-owned schemas include profile columns such as `photo_file_id`; Sheets only applies the headers it receives.
- Profile, scale, and workout repositories own feature-specific persistence mapping. `integrations/storage/` provides account-scoped local profile caches, active profile selection, and queued writes; it does not own feature rules or sheet schemas.
- Keep photo selection/upload behind a dedicated integration boundary; do not couple profile domain rules to Drive API request details.

### Dependency enforcement

- Add `import/no-restricted-paths` zones to the existing flat ESLint config to enforce these boundaries:
  - Reject imports made by `src/integrations/` of `src/features/`. Features may use integrations; integrations must remain generic.
  - Reject imports made by `src/features/*/domain/` of `src/integrations/`. Domain logic may depend on shared contracts and pure helpers, not platform/API code.
  - Reject imports made by `src/features/` or `src/integrations/` of `src/app/`.
  - Reject imports between `src/features/workout/` and `src/features/scale/` in either direction. Both may depend on `src/features/profiles/` through a stable profile contract.
- `eslint-plugin-import` is currently available transitively through `eslint-config-expo`; verify the rule is active under the flat config and add a focused violating-import fixture or equivalent check before relying on it.
- If wildcard targets are not supported as expected, list concrete feature directories or use a repository-supported alternative. Keep `src/types`, `src/lib`, and the allowed profiles dependency available as appropriate; do not create broad exceptions that permit integration-to-feature or domain-to-integration imports.

## 3. Feature scope

### Account

- Add one app-level account provider so silent sign-in, busy/error state, sign-in, and sign-out are shared instead of independently initialized by every hook caller.
- Add an `AccountBar` for the common signed-in status and actions.
- Keep Google auth and token handling inside the Google integration. Account state must not depend on individual screens mounting.
- Test provider initialization, successful/failed sign-in, sign-out, and state consistency across multiple consumers. Preserve the existing sheet-cache reset behavior on account changes.

### Profiles

- Add profile list and form screens, a profile picker, avatar/photo selection and upload, a `useActiveProfile` hook, and `profilesRepo.ts`.
- Define the profile model and validation at the feature boundary. Workout and scale consume profile data through the profile feature contract, not through Google Sheets or BLE modules.
- Use local-first persistence: cache profiles and the active profile id on the phone, keyed by Google account; treat the Sheets profile tab as the synced copy and queue writes while offline. Account changes must not leak another account's active profile or queued writes.
- Keep photo file ids/metadata in the profile record. Photo selection uses a platform media integration and upload uses Google Drive; define explicit behavior for offline selection and failed uploads.
- Keep photo selection/upload behind a dedicated integration boundary; do not couple profile domain rules to Drive API request details.
- Treat profile workflows as the next user-facing feature, built after the structural boundaries exist.

### Workout and scale

- Extract workout scan/connect/record/save lifecycle into `useWorkoutSession.ts`; keep `WorkoutScreen.tsx` focused on rendering and user events.
- Extract scale listener lifecycle and presentation into a scale feature screen/hook while keeping packet parsing in BLE integration.
- Add a BLE coordinator in `integrations/ble/` so treadmill and scale cannot start or stop overlapping scans through the shared manager. Feature hooks use the coordinator rather than calling `stopDeviceScan()` directly.
- Keep the `Treadmill` instance stable (module-level or `useRef`-owned); never construct it on every render because connection state belongs to that instance.
- Replace temporary hard-coded height usage with the active-profile contract only after the profiles feature defines missing-profile behavior.
- Move `fmtTime` and `fmtPace` into `src/lib/format.ts` only if they remain generic display formatters; preserve existing output.
- Keep the scale's fixed BLE id unchanged during this behavior-preserving refactor, but record replacing it with a paired device saved per user as technical debt.
- Move `ageFromBirthDate` into `features/profiles/domain/`; it is profile logic, not scale logic.

## 4. Migration sequence and checkpoints

### Phase 0: Baseline and boundary checks

- [x] Record current test, lint, and type-check results; preserve existing user changes and avoid combining unrelated cleanup. Baseline: 26 tests pass; TypeScript passes; lint has 0 errors and 13 inline-style warnings.
- [x] Add Jest alias mapping now, before moving imports:
      `^@/(.*)$` -> `<rootDir>/src/$1`.
- [x] Verify `renderHook` is available from the installed `@testing-library/react-native` for testing `useWorkoutSession` without a screen; no dependency change was needed.
- [x] Add and verify import-boundary lint rules. `eslint-import-resolver-typescript` is declared directly and configured for `tsconfig.json`. Five temporary violations were all reported with the expected messages, including both relative and `@/` alias imports; permitted feature-to-integration imports remain allowed. Fixtures were removed.
- [x] Confirm default route re-exports compile with the current Expo Router/TypeScript setup using a temporary route probe; recheck route discovery when the actual feature routes move. Web platform resolution is not a Phase 0 requirement.

### Phase 1: Shared contracts and pure helpers

- [x] Introduce only the cross-boundary types needed for moves (`TreadmillData`, `ScaleReading`, `Profile`); keep feature-local types local.
- [x] Move `fmtTime` and `fmtPace` to `src/lib/format.ts`, updating imports and tests.
- [x] Move workout recorder and step estimation into `features/workout/domain/`; move focused tests beside the domain modules and preserve their assertions.
- [x] Move the existing `bodyMetrics.ts` into `features/scale/domain/` and add tests for metric classifications/calculations.
- [x] Move `ageFromBirthDate` into `features/profiles/domain/` and test birthday boundary cases.
- [x] Move workout row mapping and `WorkoutSummary` use out of the Google Sheets integration into `features/workout/data/workoutRepo.ts`; leave generic row append and keyed retry operations in Sheets as a prerequisite for Phase 2.

Phase 1 verification: 34 tests pass across 8 suites, TypeScript passes, and lint has 0 errors with the same 13 inline-style warnings as the baseline. Prettier check passes for the affected source files.

### Phase 2: Integrations and repositories

- [x] Move BLE manager, permissions, treadmill protocol, and scale protocol modules under `integrations/ble/`; update imports and focused BLE tests.
- [x] Split Google Drive folder/file operations from Sheets operations: Drive owns folder/file lookup and parent changes; Sheets owns spreadsheet creation and row operations.
- [x] Make Sheets generic: ensure the spreadsheet/folder, expose `ensureTab(tab, headers)` to create missing tabs and append missing header columns, and remove the remaining feature-owned tab schemas from the integration. Generic `appendRecords` aligns feature-owned records to the sheet's actual header order.
- [x] Add `features/workout/data/workoutRepo.ts`; preserve workout/segment row schema, partial retry behavior, and duplicate protection. Extend tests to cover mapping and retries at the correct layer.
- [x] Keep sheet headers and row mappings in the workout repository; add feature-owned schemas/repositories when their data workflows are implemented.
- [x] Add a SQLite-backed account-scoped outbox and offline write queue; test account isolation and retry behavior. Check workout/segment IDs in Sheets before upload so a process restart cannot duplicate rows.
- [x] Add a BLE scan coordinator and tests proving treadmill and scale scans are mutually exclusive and stale screen cleanup cannot stop another screen's scan.

Phase 2 verification: BLE and Google Drive/Sheets integrations are separated; Sheets creates tabs and appends missing headers lazily, then aligns records to the persisted header order. Workout writes are persisted in an account-scoped SQLite outbox, retried on app activation/network restoration, and checked against remote IDs before append. The BLE coordinator serializes scans and provides lease-scoped cleanup. All 55 tests pass across 14 suites, TypeScript passes, Prettier passes, and lint has 0 errors with the baseline 13 inline-style warnings.

### Phase 3: Shared account state and screen extraction

- [x] Add the account provider at the application layout boundary and adapt all consumers to the single shared state.
- [x] Extract `useWorkoutSession.ts` and `WorkoutScreen.tsx`; test its logic independently of screen rendering.
- [x] Extract the scale screen/hook and keep the route as a thin default re-export.
- [x] Convert `src/app/index.tsx` and `src/app/scale.tsx` to route re-exports after their destinations are stable.
- [x] Replace the Explore tab with a Profiles tab in `app-tabs.tsx`; remove `explore.tsx` after checking for links/deep-link references. No Explore deep links are in scope.

Phase 3 verification: All 78 tests pass across 17 suites, TypeScript passes, formatting passes for the Phase 3 files, and lint has 0 errors with 1 remaining inline-style warning in the existing web tab component. Review fixes preserve scan-lease cleanup and queued-save status/retry behavior.

### Phase 4: Profile feature and profile-dependent behavior

- [ ] Implement profile list/form, picker, avatar/photo upload, repository, and active-profile hook using the account-scoped local cache and queued Sheets sync.
- [ ] Integrate workout and scale with active height, age, and sex; define and test no-profile, account-switch, offline, queued-write, and failed-photo-upload behavior.
- [ ] Add profile repository, hook, and screen tests plus a manual Android permission/photo-upload smoke test.

## 5. Testing and acceptance criteria

After each coherent move:

1. Run the focused test suites for affected logic.
2. Run `npm test`, `npx tsc --noEmit`, and `npx expo lint` at each phase gate and before each phase commit.
3. Run Prettier checks for moved/edited files.
4. Check import boundaries and route resolution.
5. Use `git mv` for file moves to preserve history. Make one commit per phase when practical; phases 3 and 4 may use the normal commit routine or be combined when that keeps the work smaller. Keep verification and commits lightweight.

The refactor is complete when:

- All routes remain discoverable by Expo Router and `src/app/` has no feature logic. The Profiles tab replaces Explore.
- The import graph follows app -> features -> integrations, with shared `types`/`lib` imports allowed; no integration imports a feature, no domain imports an integration, neither features nor integrations import app routes, and workout/scale remain independent.
- BLE parsing and hardware behavior are unchanged and existing BLE tests pass.
- BLE coordinator prevents overlapping treadmill/scale scans; the fixed scale id remains documented technical debt.
- Sheets integration is feature-agnostic; feature repositories own headers and row mapping, missing tabs/columns are added safely, and existing saved rows remain compatible.
- Account state is shared across screens.
- Profiles and active profile are cached per Google account; offline writes are queued and retried without duplicate workout rows.
- Profile-dependent calculations use the active profile rather than hard-coded dimensions, with explicitly tested fallback behavior.
- Existing automated tests pass; lint, type checking, and formatting checks pass.
- Android smoke checks cover sign-in, mutually exclusive BLE scan/connect, workout recording/save, scale reading, and profile selection/photo upload as those phases land. Web builds are not an acceptance criterion for this iteration.

## 6. Technical debt tracked by this refactor

- The scale BLE integration currently filters on one fixed device id. Preserve it during the behavior-preserving refactor; replace it later with a paired device saved per user.

## 7. Review gate

Review this plan before implementation begins. Local-first, account-keyed profile caching and queued sync are the planned defaults; the Explore tab will be replaced by Profiles. Keep the plan active during implementation and move it to `docs/plans/archive/` when the refactor is complete.
