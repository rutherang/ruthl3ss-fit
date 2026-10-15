# Expo / React Native App

Cross-platform mobile application using Expo and TypeScript.

## Critical Pre-Task Protocol

Before writing any code touching Expo, EAS, or React Native APIs:

1. Read the major SDK version of `expo` in `package.json`.
2. Retrieve the versioned docs index at `https://docs.expo.dev/llms.txt` and follow relevant links. Do not write code from memory.

## Core Execution Rules

- ALWAYS install dependencies using `npx expo install <package>` to guarantee SDK version compatibility.
- ALWAYS run `npx expo lint` and `npx tsc --noEmit` before declaring any task complete.

## Specialized Rules

- [Navigation & Routing](.agent-rules/navigation.md)
- [EAS & Native Builds](.agent-rules/builds-and-eas.md)
- [Quality Commands & Diagnostics](.agent-rules/quality-and-commands.md)
- [State Management & Data](.agent-rules/state-and-data.md)
- [Testing & TDD Workflows](.agent-rules/testing-and-tdd.md)
- [Debugging](.agent-rules/debugging.md)
