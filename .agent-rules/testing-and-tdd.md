# Testing & TDD Specialist

## 1. Test Naming Standards (Mandatory)

Write test names that act as clear, human-readable specifications describing **behavior**, **context**, and **expected outcome**.

### 1.1 The Standard Pattern

Use the `[Action/Context] -> [Expected Outcome]` formula:

- **`describe` block:** Name the component, hook, or utility function directly.
- **`it` / `test` block:** Use active, present-tense verbs (`renders`, `displays`, `triggers`, `navigates`, `throws`).

```tsx
// ✅ GOOD: Clear context, action, and expected behavior
describe('LoginForm Component', () => {
  it('displays a validation error when submitting an invalid email', () => {});
  it('disables the submit button while the login request is pending', () => {});
  it('navigates to the home screen upon successful authentication', () => {});
});

describe('useAuthToken Hook', () => {
  it('retrieves stored token from SecureStore on initial render', () => {});
  it('returns null when the token has expired', () => {});
});
1.2 Forbidden Test Naming Antipatterns
❌ Do NOT use vague or lazy names: it('works'), it('renders properly'), it('tests button'), it('should work correctly').

❌ Do NOT use implementation details in test titles: it('sets state count to 1') -> Use: it('increments the displayed count when pressable is tapped').

❌ Do NOT prefix every test with "should": Prefer direct active verbs (renders, calculates, dispatches).

2. Testing Tooling & Setup
Frameworks: jest-expo and @testing-library/react-native (RNTL).

Always use behavioral, user-centric queries (screen.getByRole(), screen.getByText()) before falling back to testID.

3. Selective TDD Strategy
Enforce TDD for: Pure business logic, calculation helpers, custom hooks, Zustand stores, and Zod validation schemas.

Test-After for: Screen layouts, complex visual component hierarchies, animations (react-native-reanimated), and native module configurations.

4. TDD Execution Loop
Write the failing test inside __tests__/<name>.test.tsx following the naming standards above.

Run npx jest __tests__/<name>.test.tsx to confirm failure.

Write minimum functional code in <name>.ts(x) to make the test pass.

Refactor while maintaining green assertions.
```
