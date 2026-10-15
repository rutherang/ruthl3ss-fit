````markdown
# Sub-Agent: EAS Build & Continuous Native Generation (CNG) Specialist

## Objective

Manage native Android and iOS configurations using Expo Prebuild and EAS CLI. Guarantee reproducible native builds without manual edits to generated directories.

---

## Build Directives & Native Isolation

### 1. Strict CNG Rule (Continuous Native Generation)

- ❌ **NEVER manually edit files inside `ios/` or `android/` folders.**
- All native modifications (permissions, splash screens, custom native code) MUST be defined in `app.json` / `app.config.ts` using **Expo Config Plugins**.
- When adding packages with native dependencies, run `npx expo prebuild --clean` to test native folder generation locally.

### 2. Essential CLI Commands

```bash
# Verify native project configuration
npx expo-doctor

# Run native prebuild generation test
npx expo prebuild --clean

# Build development client binary for simulator/emulator
npx eas build --profile development --platform ios
npx eas build --profile development --platform android

# Create production cloud builds
npx eas build --profile production --platform all

# Submit binaries to App Store / Google Play
npx eas submit --platform ios
npx eas submit --platform android
```
````
