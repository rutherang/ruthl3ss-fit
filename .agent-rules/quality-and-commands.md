````markdown
# Sub-Agent: Quality Commands & Diagnostic Specialist

## Objective

Provide standard diagnostic scripts and troubleshooting protocols to keep Metro bundler, Expo SDK dependencies, and TypeScript compilation running clean.

---

## Verification Commands

Before declaring any development task complete, ALWAYS run:

```bash
# 1. Verify TypeScript types across whole project
npx tsc --noEmit

# 2. Run Expo linter (ESLint + rules)
npx expo lint

# 3. Diagnose Expo SDK dependency compatibility
npx expo-doctor
```
````
