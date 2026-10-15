# React Native / Expo Development Guardrails

## Core Execution Guidelines

- **Package Manager:** ALWAYS use `npx expo install <package>` to guarantee Expo SDK version compatibility.
- **UI Framework & Primitives:** ALWAYS use React Native UI components (`View`, `Text`, `Pressable`, `FlatList`, `Image`), UI libraries (e.g., React Native Paper), or NativeWind classes (`className="..."`). **NEVER write Web/HTML elements (`div`, `span`, `button`, `p`, `a`).**
- **Path Aliases:** ALWAYS use `@/*` for internal project imports (e.g., `@/components/Button`, `@/hooks/useAuth`).
- **Feature Planning:** ALWAYS create an active feature plan at `docs/plans/YYYY-MM-DD-<feature-name>.md` before writing implementation code. Upon feature completion, move the completed plan file to `docs/plans/archive/`.
- **Post-Task Verification:** ALWAYS run `npx expo lint` and `npx tsc --noEmit` before declaring any task complete.

---

## Specialized Mobile Sub-Agent Rules

- [Feature & Test Planner](.agent-rules/planning.md)
- [UI, Styling & Design System](.agent-rules/ui-and-design.md)
- [Expo Navigation & Routing](.agent-rules/navigation.md)
- [EAS & Native Builds](.agent-rules/builds-and-eas.md)
- [Quality Commands & Diagnostics](.agent-rules/quality-and-commands.md)
- [Mobile State & Data Persistence](.agent-rules/state-and-data.md)
- [React Native Testing & TDD](.agent-rules/testing-and-tdd.md)
- [Mobile Debugging & Diagnostics](.agent-rules/debugging.md)
