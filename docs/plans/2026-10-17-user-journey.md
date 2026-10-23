# Mobile Plan: User Journey and Feature Roadmap

## 1. Overview

- **Goal:** A person signs in with Google, creates profiles for everyone who uses the equipment, sees and pairs their devices, works out on the treadmill, weighs in on the scale, and reviews stats and body metrics per profile.
- **Platform scope:** Android. Web and iOS stay out of scope.
- **Data principle:** User data lives in the user's own Google Drive (a `Ruthl3ssFit` folder holding one spreadsheet). The app keeps a local SQLite copy so it works offline and loads fast. No app backend stores user data.
- **Relationship to other plans:** Continues after `2026-10-16-architecture-refactor.md` and keeps its dependency rules.
- **Out of scope:** Workout plans downloaded from Supabase (section 10), visual redesign, new hardware types.
- **E2E automation:** Deferred. Do not add Maestro or Appium as part of these phases. Use focused automated tests and manual Android journey checks for now; revisit E2E after the core flows stabilize.

## 2. Assumptions

- One Google account owns the data and can have **many profiles** (family members). Each profile has its own age, height, and other biometrics. Every workout, weigh-in, and stat belongs to exactly one profile.
- **Profiles come first.** After a successful sign-in, an account with no profile goes straight to a required "Create your first profile" step, with the name prefilled from the Google account and editable. There is no skip.
- **Nothing is saved without an active profile.** Saving a workout or weigh-in is blocked with a prompt to pick or create a profile. Stats is reachable only with an active profile.
- Devices belong to the account. The scale cannot tell who stands on it, so the profile is chosen before weighing.
- A missing or invalid active profile is a defensive recovery state, not a normal post-onboarding destination. The app routes to profile setup or selection and must not save profile-owned data until one is active.

## 3. User journey

```text
Install -> Welcome -> Sign in with Google
  -> first time?  yes -> Create first profile
                  no  -> restore profiles and history from the Sheet -> select a valid active profile
  -> Tabs: Workout | Weigh-in | Stats | Profiles (device setup is optional, when available)
     Workout:  pick profile -> connect treadmill -> start -> speed changes -> stop -> summary -> saved
     Weigh-in: pick profile -> step on scale -> final reading -> saved -> body metrics
     Stats:    pick profile -> choose range -> summary, charts, workout and weigh-in lists
     Profiles: profiles, devices, account
```

### Step 1: First launch and sign-in

- **Goal:** One tap into the app, with a clear statement of where data goes.
- **Screen:** Welcome (what the app does, "Your data stays in your own Google Drive", Sign in with Google).
- **Flow:** Tap sign in, choose a Google account, approve Drive access for files this app creates. The app finds or creates the `Ruthl3ssFit` folder and sheet, then continues.
- **Returning user:** Silent sign-in goes to the last tab after restoring the account-scoped local cache. If the cache is empty, restore profiles and history from the Sheet before opening profile-owned screens.
- **Edge cases:**
  - Sign-in cancelled: stay on Welcome.
  - No internet on first launch: explain that the first sign-in needs internet.
  - Drive or Sheets failure: show the error with a retry.
  - Signed in but cache empty: restore from the Sheet with progress.
  - Account switch: isolate the local cache and pending writes by account; never flush one account's queued writes under another account.
  - No profiles: require first-profile creation. Profiles exist: restore the last active profile if it still exists and is not deleted; otherwise prompt for an active profile.

### Step 2: Create a profile

- **Screens:** Create first profile (shown when none exist), Profiles list, Profile form.
- **Fields:** Name, sex, birth date, height, and an optional photo (a generated avatar is the default). Optional biometrics are goal weight, waist, activity level, and a step-length adjustment.
- **Flow:** Save to the device, sync to the Profiles tab (queued if offline). The first profile becomes active. A profile bar on Workout, Weigh-in, and Stats shows the active profile and switches it, and switching resets any live reading.
- **Many profiles:** the list marks the active one. Switching resets any live reading. Delete is soft, and the last remaining profile cannot be deleted.
- **Edge cases:**
  - Field validation messages.
  - Photo upload fails: details stay saved, with retry or continue without the photo.
  - Editing never loses the photo.
  - Delete is a soft delete (hidden, history kept).
  - A profile missing height or birth date is prompted before body metrics.

### Step 3: See and manage devices

- **Goal:** Know what is paired and its status. Add a device once, then use it in one tap.
- **Screens (Phase 8):** Devices (inside the Profiles tab, also reachable from empty states on Workout and Weigh-in), Add treadmill, Add scale. Device setup is not required during onboarding; it can be offered after onboarding when the feature is implemented.
- **Device card:** Name, type, model and firmware (read from the device), status (connected, nearby, not seen), last used, and actions (rename, forget, reconnect).
- **Add treadmill:** Bluetooth permission explanation, scan for names starting with `FS-`, pick, connection test (read device info), name it, save.
- **Add scale:** "Step on the scale to wake it", list broadcasting devices whose data changes with weight, pick, save its address. This replaces the hard-coded scale id.
- **Edge cases:**
  - Permission denied or blocked (link to Settings).
  - Bluetooth off.
  - Device not found (tips: close other apps, the treadmill allows one connection at a time).
  - Two scales (choose a default).

### Step 4: Work out

- **Goal:** Run a session and have it recorded without fiddling.
- **Flow:** Confirm the profile, tap "Connect to <saved treadmill>", and watch live speed, distance, time, incline, calories, and estimated steps. Start, stop, and adjust speed by 0.5 within the treadmill's range and a safety cap. Stopping (app, console, or safety key) shows a summary with per-speed segments (avg km/h, pace, distance, steps est.), saved under the profile.
- **Offline:** The summary shows "saved on this device, will sync" and updates when synced.
- **Edge cases:**
  - Connection drops mid-workout (what was recorded is saved).
  - Started from the console (recorded if the app was already connected).
  - No profile (prompt, since the step estimate needs height).
  - Screen stays awake.

### Step 5: Weigh in and body metrics

- **Screens:** Weigh-in (live reading), Body metrics detail.
- **Flow:** Confirm the profile, step on, see "Measuring...", then "Final reading". In Phase 9, the weigh-in is saved with an immutable snapshot of the profile inputs and calculated metrics, then the metrics are shown.
- **Body metrics shown:** BMI and level, fat % and level, fat and lean mass, water, muscle, bone, protein, standard weight and obesity degree, BMR, and change since the previous weigh-in. Levels are low, normal, high, or obese, shown with text and color. A banner says these are estimates.
- **Rule:** Only a reading that was watched settling is saved. The scale re-broadcasts its last result, which is ignored.
- **Edge cases:**
  - Profile switch resets the live reading.
  - Incomplete profile.
  - Scale not paired (go to Devices).
  - Weigh-in saved to the wrong profile (reassign from history).

### Step 6: Stats

- **Screens:** Stats (profile plus range of 7 days, 30 days, 90 days, or all), Workout detail, Weigh-in history.
- **Summary cards:** Workouts, total time, distance, calories, steps (est.), average speed, best pace.
- **Charts:** Weekly distance, weight over time, BMI over time.
- **Lists:** Workouts (date, duration, distance, average speed) open a detail view with segments. Weigh-ins show deltas.
- **Behavior (Phase 10):** Data comes from the local cache, so it loads instantly. Pull to refresh syncs from the Sheet. Each section has an empty state.

### Step 7: Account and data

- **Screen:** Account section in the Profiles tab.
- **Contents:** Signed-in email, sync status (queued writes, last sync, retry), "Open my sheet in Drive", sign out, and a privacy note (data stays in your Drive, and deleting the folder deletes it).

## 4. Navigation

- Tabs: Workout, Weigh-in, Stats, Profiles.
- Signed-out users see only Welcome (protected routes).
- A profile bar (avatar, name, switch) is pinned at the top of Workout, Weigh-in, and Stats.
- Devices and Account are stack screens inside the Profiles tab.

## 5. Data

- **Sheet tabs:** Profiles, Devices (new), Workouts, Workout segments, Weigh-ins (new). Columns are snake_case. Feature repositories own their headers, and the Sheets integration adds missing tabs and columns.
- **Local SQLite:** profiles, devices, workouts, segments, weigh_ins, and the existing outbox. Writes go to SQLite at save time, and the Sheet is the synced copy. The cache is restored from the Sheet when empty, and refreshed on pull. All writes are idempotent upserts by id.
- **Shared types:** Move `WorkoutSummary`, `Segment`, `WeighIn`, and `Device` to `src/types`, because stats consumes them.
- **Boundaries:** `workout`, `scale`, `stats`, and `devices` must not import each other's internals. Stats reads history through repository read functions. Extend the lint zones to cover this.

New and changed schemas:

- **Devices:** id, type (treadmill or scale), name, ble_id, model, firmware, added_at, last_used_at, deleted_at.
- **Weigh-ins:** id, profile_id, device_id, measured_at, weight_kg, calculated metric values, the profile inputs used to calculate them, and formula_version. Define the exact columns in Phase 9, including every displayed value (protein, standard weight, and obesity degree as well as BMI, fat, water, muscle, bone, and BMR). Editing a profile later must not silently change a historical weigh-in's displayed metrics.
- **Workouts:** real `profile_id` (not `default`) and a new `device_id`.
- **Profiles:** add `deleted_at`.
- **Profiles columns:** id, name, sex, birth_date, height_cm, goal_weight_kg, waist_cm, activity_level, step_length_adjust, photo_file_id, created_at, deleted_at. Existing `default` workout rows become "Unassigned" with an assign action.

## 6. Where the app stands

| Step                      | Done                                                                          | Missing                                                                                |
| ------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Sign-in                   | Google sign-in, silent restore, shared account provider                       | Welcome screen, protected routes, restore from Sheet                                   |
| Profiles                  | Form, validation, local cache, queued sync, photo upload, active-profile hook | State shared across screens, photo display, delete, restore, dark-mode fixes           |
| Devices                   | Nothing                                                                       | Whole feature. The scale id is fixed in code and the treadmill is rescanned every time |
| Workout                   | Connect, record, segments, steps estimate, save and queue                     | Profile link (rows say `default`), saved-device connect, history and detail            |
| Weigh-in and body metrics | Live reading, BMI, fat, BMR display                                           | Saving, history, dedicated screen, level labels, deltas, reset on profile switch       |
| Stats                     | Nothing                                                                       | Whole feature                                                                          |
| Account                   | Sign in and out bar                                                           | Sync status, open sheet, privacy note                                                  |

## 7. Phases and implementation plans

Keep this journey document as the product roadmap and progress checklist. Check off implementation tasks and exit criteria as they are completed. Implement one phase at a time; create a separate detailed implementation plan only when a phase begins and needs one.

### Phase 5: Account bootstrap and required first profile

- **Goal:** Establish account-scoped app entry and ensure every profile-owned screen has a valid active profile.
- **Prerequisites:** Architecture refactor complete; Google sign-in and profile persistence available.
- **Scope:**
  - [ ] Add the Welcome screen, signed-in route protection, and sign-out routing.
  - [ ] On sign-in, load the matching account's local state; if it is empty, restore the Sheet with visible progress and errors/retry.
  - [ ] Create the Drive folder and Sheet only when needed. Keep local data and queued writes isolated by Google account.
  - [ ] Add `ActiveProfileProvider`; require creation of the first profile with the Google name prefilled, with no skip.
  - [ ] Restore the last active profile only if it still exists and is not soft-deleted; otherwise route to profile selection/setup.
  - [ ] Keep device setup out of onboarding; offer it only as a later optional action.
- **Exit criteria:**
  - [ ] Signed-out users cannot enter protected tabs.
  - [ ] First sign-in with an empty account creates a profile before entering profile-owned screens.
  - [ ] Returning sign-in restores the correct account and active profile.
  - [ ] Account switching cannot display or upload another account's cached or queued data.

### Phase 6: Multiple profiles and account management

- **Goal:** Let an account manage family profiles and its sync/account settings.
- **Prerequisites:** Phase 5 account-scoped loading and active-profile foundation.
- **Scope:**
  - [ ] Add profile list, create/edit, photo display, and soft delete.
  - [ ] Prevent deletion of the last active profile; choose a valid active profile after deletion.
  - [ ] Add the shared active-profile bar to Workout, Weigh-in, and Stats; switching profile resets live measurements.
  - [ ] Add the Account section: signed-in email, sync queue/last-sync status, retry, open Sheet, sign out, and privacy note.
  - [ ] Validate required profile fields and show a prompt when fields needed for metrics are missing.
- **Exit criteria:**
  - [ ] Multiple profiles remain isolated in the UI and can be switched without losing saved data.
  - [ ] Soft-deleted profiles are hidden from selection while their historical records remain available.
  - [ ] Account changes and queued writes remain scoped to the signed-in account.

### Phase 7: Profile-linked workouts and offline history

- **Goal:** Save and restore workout history under real profiles with reliable offline sync.
- **Prerequisites:** Phase 5 active-profile state; Phase 6 profile switching and lifecycle.
- **Scope:**
  - [ ] Replace `default` workout ownership with a real profile id; leave legacy rows Unassigned and provide an explicit assignment action.
  - [ ] Add local workout/segment history and restore it from the Sheet when the account cache is empty.
  - [ ] Add account-safe, idempotent sync triggers and make outbox flushing single-flight.
  - [ ] Block saving if no valid active profile exists; provide a recovery route to select or create one.
- **Exit criteria:**
  - [ ] New workouts always reference a real profile.
  - [ ] Legacy rows remain intact and can be assigned without guessing an owner.
  - [ ] Offline workout saves appear locally immediately and sync once after reconnecting.
  - [ ] Restoring history does not duplicate existing records.

### Phase 8: Device management and saved connections

- **Goal:** Pair treadmill and scale devices once and reuse them.
- **Prerequisites:** Phase 5 account-scoped persistence; profile flows may offer navigation to Devices but devices belong to the account.
- **Scope:**
  - [ ] Add shared `Device` type and `devicesRepo` (SQLite plus Sheet).
  - [ ] Add device list/cards and status, rename, forget, reconnect, and default-scale selection.
  - [ ] Implement treadmill discovery, connection test, and save; implement scale discovery by changing measurements rather than a hard-coded id.
  - [ ] Handle Bluetooth permissions, disabled Bluetooth, unavailable devices, and duplicate/default scales.
  - [ ] Connect to the saved treadmill in one tap and persist device association/last-used state where appropriate.
- **Exit criteria:**
  - [ ] Saved devices survive app restart and restore for the same account.
  - [ ] Workout and weigh-in flows direct users to device setup when needed.
  - [ ] No fixed scale address is required for pairing or use.

### Phase 9: Weigh-ins and body metrics

- **Goal:** Persist settled scale readings per profile and show honest, reproducible body metrics.
- **Prerequisites:** Phase 5 active-profile state; Phase 6 profile management; Phase 8 scale pairing; Phase 7 account-safe sync.
- **Scope:**
  - [ ] Define the full Weigh-ins schema, including every displayed metric, immutable profile-input snapshot, device id, timestamp, and `formula_version`.
  - [ ] Implement and test pure metric calculations and level boundaries; document which values are estimates and which inputs are required.
  - [ ] Add `scaleRepo`, local persistence, Sheet sync/restore, and a Weigh-in history.
  - [ ] Save only a reading observed settling during the current weighing session; ignore the scale's stale rebroadcast.
  - [ ] Add the Weigh-in and Body Metrics screens, incomplete-profile prompts, level labels, deltas, and estimates banner.
  - [ ] Reset live readings when the active profile changes; support correcting an incorrectly assigned historical weigh-in.
- **Exit criteria:**
  - [ ] A settled reading is saved once under the selected profile, including the calculation snapshot.
  - [ ] Editing profile data does not change historical metric results.
  - [ ] Offline readings remain visible locally and sync exactly once after reconnecting.
  - [ ] Stale scale broadcasts are not saved as new weigh-ins.

### Phase 10: Stats and workout history details

- **Goal:** Present useful per-profile trends from locally cached history.
- **Prerequisites:** Phases 6, 7, and 9; Phase 8 device metadata if used in workout detail.
- **Scope:**
  - [ ] Move shared workout/history contracts to `src/types` only where multiple features consume them.
  - [ ] Implement and test pure range filtering, aggregation, weekly buckets, and bests.
  - [ ] Add Stats range selection, summary cards, charts, workout/weigh-in lists, and empty states.
  - [ ] Add workout detail with per-speed segments and weigh-in deltas; use local data for immediate display and pull-to-refresh for sync.
  - [ ] Extend import-boundary checks so Stats reads history through repositories rather than sibling feature internals.
- **Exit criteria:**
  - [ ] Profile and date-range changes consistently filter all cards, charts, and lists.
  - [ ] Calculations have focused tests for empty, boundary-date, and multi-profile cases.
  - [ ] Stats is available only with a valid active profile.

### Phase 11: Release hardening

- **Goal:** Make the completed journeys maintainable and ready for release.
- **Prerequisites:** Phases 5–10 complete.
- **Scope:**
  - [ ] Add CI checks, configure EAS environment values for build profiles, and write project setup/build documentation.
  - [ ] Complete accessibility, dark-mode, permission-denied, and error/retry reviews.
  - [ ] Update Android smoke-test instructions and produce fresh development builds for native changes.
  - [ ] Continue manual Android journey checks; E2E automation remains deferred unless separately approved after these flows stabilize.
- **Exit criteria:**
  - [ ] CI covers type checking, lint, and automated tests.
  - [ ] Release configuration and environment values are documented and verified.
  - [ ] Manual journey checks pass on a fresh Android build.

## 8. Testing and acceptance criteria

At each phase gate, as in the refactor plan:

1. [ ] Run the focused test suites for affected logic.
2. [ ] Run `npm test`, `npx tsc --noEmit`, and `npx expo lint` before each phase commit.
3. [ ] Run Prettier checks for edited files.
4. [ ] Check import boundaries and route resolution.
5. [ ] Verify Expo configuration and dependency compatibility when native config or dependencies change.
6. [ ] Use `git mv` for moves, with one commit per phase when practical.

Journey acceptance (manual, Android; no E2E automation in this roadmap):

- [ ] **J1 First run:** Fresh install, sign in, forced to create the first profile with the name prefilled, then land with it active.
- [ ] **J2 Devices (after Phase 8):** Pair the treadmill and the scale, force-stop the app, reopen, and reconnect the treadmill in one tap.
- [ ] **J3 Workout (after Phases 7 and 10):** Run three speed levels. The summary shows three segments. The Workouts row has the profile id, and Stats shows the session.
- [ ] **J4 Offline:** In airplane mode, complete a workout and a weigh-in. Both appear locally, and after reconnecting, each appears in the Sheet exactly once.
- [ ] **J5 Two profiles:** Weigh two profiles. Stats and body metrics show separate histories, and switching profile resets the live reading.
- [ ] **J6 Reinstall:** Uninstall, reinstall, and sign in. Profiles, workouts, and weigh-ins are restored from the Sheet.
- [ ] **J7 Accounts:** Sign out and sign in as another account. No data or queued write from the first account is visible or uploaded under the second account, and the second account gets its own folder and Sheet.
- [ ] **J8 Recovery guard:** If persisted state has no valid active profile despite onboarding, saving a workout or weigh-in is blocked and Stats routes to profile selection/setup.
- [ ] **J9 Profile-specific metrics:** Three profiles with different ages and heights each show metrics based on their own saved profile-input snapshots.

The plan is complete when:

- [ ] Every journey step works manually on Android, and J1 to J9 pass.
- [ ] Workouts and weigh-ins are always linked to a real profile.
- [ ] Stats and body metrics are computed by tested pure functions.
- [ ] Automated unit/integration tests, lint, type checking, and formatting pass, and import boundaries hold. E2E automation is not a completion requirement.

## 9. Open decisions

- [ ] **Existing `default` rows:** Confirm migration behavior. Recommended: leave them unassigned with an assign action.
- [ ] **Devices per account or per profile:** Confirm ownership. Recommended: per account, remembering the last profile used.
- [ ] **Units:** Confirm metric-only behavior for now.
- [ ] **Charts:** Choose `react-native-svg` (adds a native module and needs a new dev build) or simple bars built from plain views.
- [ ] **Visceral fat and body age:** Confirm they remain out of scope because they cannot be estimated honestly without impedance.
- **E2E tooling:** Deferred. Do not install Maestro or Appium until the core journeys are stable and the project explicitly chooses to add E2E coverage.

## 10. Later

- Treadmill workout plans (JSON with name, description, and steps of minutes and speed), downloaded from a Supabase table with public read and no sign-in. A plan runs by setting the speed at each step and records as a normal workout.
- Offline-first conflict handling beyond upserts, a paired-device picker per profile, and web or iOS support.
