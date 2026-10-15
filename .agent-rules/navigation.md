# Navigation & Routing Rules

- Framework: Expo Router (file-based routing in `src/app/`).
- Structure: Every file in `src/app/` represents a route. `_layout.tsx` files define layout navigators.
- Isolation: Keep all non-route logic (components, hooks, models, utilities) OUTSIDE `src/app/`.
- Imports: Always import `Link`, `router`, and `useLocalSearchParams` directly from `expo-router`.
- Reference: https://docs.expo.dev/router/introduction.md
