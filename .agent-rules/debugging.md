# Diagnostic Protocol

When fixing a bug or build failure:

1. Run `npx expo-doctor` to rule out dependency version conflicts.
2. Check `package.json` against Expo SDK compatibility using `npx expo install --fix`.
3. Clear Metro bundler cache if unexpected web/native bundling errors occur: `npx expo start --clear`.
4. Run `npx tsc --noEmit` to locate typing regressions before modifying code.
