# Mobile Plan: Treadmill Testing

## 1. Overview & Mobile Requirements

- **Goal:** Add repeatable automated coverage for treadmill packet parsing, workout calculations, BLE scan behavior, and the home-screen scan flow.
- **Platform Scope:** Both iOS and Android for app behavior; real BLE checks should initially target the Android 16 phone and treadmill already used by the project.
- **Permissions/Native Features:** Bluetooth Low Energy through `react-native-ble-plx`; Android Bluetooth scan/connect permissions and platform Bluetooth state. Automated tests will mock BLE and permissions. Hardware checks remain manual.
- **Out of Scope:** Changing treadmill scanning behavior, adding features, or resolving unrelated existing lint errors as part of test setup.

## 2. React Native Architecture

- **Expo Router Path:** `src/app/index.tsx` (home screen).
- **BLE Layer:** `src/ble/treadmill.ts` owns packet parsing, scan filtering, and treadmill interactions; `src/ble/permissions.ts` owns Android permission requests; `src/ble/manager.ts` exposes the BLE manager.
- **Workout Utilities:** `src/lib/steps.ts` and `src/lib/workoutRecorder.ts`.
- **State:** Screen-local React state and a workout recorder ref. No server state or app-wide store is involved in the planned tests.
- **Persistent Storage / Runtime Validation:** None in the testing scope.
- **Test Tooling:** Jest with the Expo `jest-expo` preset and React Native Testing Library. Confirm package compatibility with the installed Expo SDK when implementing setup.
- **Test Location:** `__tests__/` at the repository root, following the project testing guide.

## 3. Mobile Testing Strategy

### A. TDD Targets (Logic and BLE Behavior)

Write behavior-focused tests first, confirm they fail, then implement only the changes needed to pass.

- [ ] **Treadmill packet parser:** `parseTreadmillData` in `src/ble/treadmill.ts`
  - [ ] `it('parses speed in kilometers per hour when speed is present')`
  - [ ] `it('parses optional distance, incline, energy, heart rate, and timing fields')`
  - [ ] `it('parses power when the force and power flag is present')`
  - [ ] `it('skips fields marked absent by the packet flags')`
  - [ ] `it('reports malformed or truncated packets clearly')`
  - Assert byte order, units, flag handling, and expected error behavior.
- [ ] **Step estimation:** `src/lib/steps.ts`
  - [ ] `it('estimates steps from supported treadmill speeds and profile height')`
  - [ ] `it('clamps speeds below and above the supported range')`
- [ ] **Workout recorder:** `src/lib/workoutRecorder.ts`
  - [ ] `it('summarizes duration, distance, speed, calories, and estimated steps from samples')`
  - [ ] `it('starts a new sample run when the treadmill elapsed-time counter resets')`
  - [ ] `it('groups stable-speed samples into workout segments')`
  - Assert boundary behavior, rounding, and empty/minimal sample handling.
- [ ] **BLE scan behavior:** `Treadmill.scan` in `src/ble/treadmill.ts`
  - [ ] `it('requests permissions and checks adapter state before starting a scan')`
  - [ ] `it('reports permission and BLE scan errors through the diagnostic callback')`
  - [ ] `it('reports discovered devices and whether their names match the treadmill filter')`
  - [ ] `it('passes matching devices to the caller only once per device')`
  - [ ] `it('stops scanning after the scan timeout')`
  - Mock permissions and the BLE manager; use fake timers for timeout coverage. Avoid requiring a phone or treadmill for these tests.

### B. Test-After Targets (Screen and Native Integration)

Use React Native Testing Library with user-visible queries such as `getByRole` and `getByText`.

- [ ] **Home screen scan flow:** `src/app/index.tsx`
  - [ ] `it('starts a treadmill scan when the user presses the scan button')`
  - [ ] `it('displays a discovered treadmill so the user can select it')`
  - [ ] `it('displays scan and permission errors in the diagnostic log')`
- [ ] **Manual device checklist**
  - [ ] On Android 16, grant Nearby devices permission, enable Bluetooth, and scan while the treadmill is advertising.
  - [ ] Confirm a matching treadmill is listed, connect, and verify treadmill data updates.
  - [ ] If iOS is supported for live treadmill use, repeat the basic permission, scan, and connect check on a real iOS device.

## 4. Test Setup and CI

1. [ ] Add SDK-compatible `jest-expo`, Jest types if needed, and `@testing-library/react-native` dependencies; configure the Expo preset and a `test` script.
2. [ ] Add the focused unit and mocked BLE tests under `__tests__/`.
3. [ ] Add the screen tests after the lower-level contracts and mocks are stable.
4. [ ] Run the tests, `npx tsc --noEmit`, and `npx expo lint`; distinguish any pre-existing lint failures from failures introduced by test changes.
5. [ ] Add CI to run tests and TypeScript checking on pull requests. Treat physical-device BLE validation as a separate manual check.

## 5. Implementation Sequence

1. [ ] Review this plan and confirm the testing scope.
2. [ ] Configure Jest/Expo and React Native Testing Library.
3. [ ] Add parser, step-estimation, and workout-recorder tests using TDD.
4. [ ] Add mocked BLE scan tests using fake timers.
5. [ ] Add home-screen behavior tests using React Native Testing Library.
6. [ ] Run the Android device checklist and wire automated checks into CI.
