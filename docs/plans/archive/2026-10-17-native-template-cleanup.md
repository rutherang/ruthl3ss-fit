# Completed Mobile Plan: Native Template and Package Cleanup

## 1. Overview & Requirements

- **Goal:** Remove unused Expo template and web-specific code while retaining the app's Android support and configuration needed for future iOS support.
- **Platform scope:** Android now; preserve iOS configuration and the Expo iOS start script for future support.
- **Behavior:** Preserve native navigation, splash screen, profile photos, BLE, Google integration, and SQLite behavior.

## 2. Cleanup Scope

- Remove unused template components and web-specific components, styles, and configuration. Do not remove iOS configuration or the iOS start script.
- Remove dependencies made unused by that cleanup and dependencies independently reported unused by Knip, while retaining dependencies confirmed to be used in native code.
- Keep dependencies used by native features, including `expo-image`, `expo-image-picker`, `expo-network`, `expo-sqlite`, `buffer`, and `lint-staged`.
- Move `eslint-config-expo` to `devDependencies`; remove the web script and add a combined `check` script.
- Remove unused exports or make module-internal symbols private where their implementation remains in use.
- Investigate Knip's `expo-updates` warning rather than adding or removing a dependency based only on that warning.
- Do not change Android backup behavior in this cleanup; disabling backup can affect device restore and transfer behavior and should be decided separately.
- Do not start an EAS build. Verify Expo configuration locally; a development build is needed if the installed native app predates required native modules.

## 3. Verification

- Run Knip to confirm findings are resolved or documented.
- Run `npx expo lint`, `npx tsc --noEmit`, and `npm test`.
- Run Expo diagnostics when available to validate configuration and dependency compatibility.
