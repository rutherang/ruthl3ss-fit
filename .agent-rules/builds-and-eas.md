# EAS & Native Build Guidelines

- Continuous Native Generation (CNG): Never manually edit or create `ios/` or `android/` directories. Configure native behavior exclusively via `app.json` or custom config plugins.
- Native Dependencies: Expo Go only supports bundled native modules. When adding new native libraries, notify that a development build is required (`eas build --profile development` or local `npx expo run:ios|android`).
- EAS Commands: Run EAS CLI commands as `npx eas-cli@latest <command>` (substitute for bare `eas` in docs).
- Reference: https://docs.expo.dev/eas/index.md
