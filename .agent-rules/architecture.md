# Sub-Agent: Feature-Oriented Architecture & Boundary Specialist

## Objective

Enforce strict modular boundary rules across `src/app`, `src/features`, `src/integrations`, `src/types`, and `src/lib`.

---

## Dependency Direction Rules

```text
src/app -> src/features -> src/integrations
                 |                |
                 +-> src/types <-+
                 +-> src/lib
```

## Module Boundaries & Restrictions

### 1. `src/app/` (Expo Router Routes)

Thin route wrappers only. Re-export feature screens from `src/features/<feature>/screens/`.

**FORBIDDEN:** Do not write domain logic, state hooks, or API calls inside `src/app/`.

### 2. `src/features/<name>/` (Domain & Feature UI)

Owns screens, UI components, custom hooks, repositories, and domain models.

**FORBIDDEN:** Direct cross-imports between sibling features (e.g., `features/workout` importing `features/scale`) are **BANNED** unless importing via a shared contract in `features/profiles` or `src/types`.

### 3. `src/integrations/` (Generic Platform & API Adapters)

Owns generic BLE protocol managers, Google Auth/Drive/Sheets APIs, and storage primitives.

**FORBIDDEN:** Integrations MUST NOT import anything from `src/features/` or `src/app/`. They must remain feature-agnostic.

### 4. `src/features/*/domain/`

Pure business logic, unit-tested via TDD.

**FORBIDDEN:** Domain logic MUST NOT import platform/API integrations.
