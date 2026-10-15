# Testing & TDD Specialist

## Testing Tooling & Setup

- Frameworks: `jest-expo` and `@testing-library/react-native` (RNTL).
- Always use behavioral, user-centric queries (`screen.getByRole()`, `screen.getByText()`) before falling back to `testID`.

## Selective TDD Strategy

- **Enforce TDD for:** Pure business logic, calculation helpers, custom hooks, Zustand stores, and Zod validation schemas.
- **Test-After for:** Screen layouts, complex visual component hierarchies, animations (`react-native-reanimated`), and native module configurations.

## TDD Execution Loop

1. Write the failing test inside `__tests__/<name>.test.tsx`.
2. Run `npx jest __tests__/<name>.test.tsx` to confirm failure.
3. Write minimum functional code in `<name>.ts(x)` to make the test pass.
4. Refactor while maintaining green assertions.
