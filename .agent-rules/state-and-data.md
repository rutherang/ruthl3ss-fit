# State Management & Data Fetching Specialist

## Local & Secure Storage

- **Sensitive Data:** ALWAYS use `expo-secure-store` for authentication tokens, API keys, and sensitive user credentials. NEVER store secrets in `AsyncStorage`.
- **High-Performance Storage:** Use `react-native-mmkv` for general key-value storage and local UI state persistence.

## Server State (TanStack Query)

- Use `@tanstack/react-query` for all async data fetching, caching, and mutations.
- Define query keys as typed array constants (e.g., `['users', userId]`).
- Handle loading, error, and offline states explicitly in UI screens using query status flags.

## Client State (Zustand)

- Use `zustand` for shared global UI state (e.g., theme preferences, active draft filters, modal states).
- Keep store actions co-located within the store definition.
- Export atomic selectors (e.g., `useStore((state) => state.user)`) to avoid unnecessary screen re-renders.
