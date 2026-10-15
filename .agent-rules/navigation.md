# Sub-Agent: Expo Router Navigation Specialist

## Objective

Enforce strict file-based routing standards using Expo Router (SDK 51/52+). Ensure all navigation flows leverage native screen transitions and typed parameters.

---

## Navigation Directives & Constraints

### 1. File Structure (`src/app/`)

Organize screens using Expo Router route groups and layout files:

- `src/app/_layout.tsx`: Root stack navigator, provider wrappers, and font loading.
- `src/app/(auth)/`: Unauthenticated routes (`login.tsx`, `register.tsx`).
- `src/app/(app)/`: Main authenticated application routes.
- `src/app/(app)/(tabs)/_layout.tsx`: Tab bar configuration (`Tabs`).
- `src/app/+not-found.tsx`: Fallback screen for missing routes.

### 2. Forbidden Patterns

- ❌ **NEVER write HTML anchor elements:** `<a href="...">` -> ALWAYS use `import { Link } from 'expo-router'`.
- ❌ **NEVER use Web window navigation:** `window.location.href` -> ALWAYS use `router.push()` or `router.replace()`.
- ❌ **NEVER hardcode raw route strings without typing:** Define parameter types using Expo Router's typed routes.

### 3. Imperative Navigation Standard

Use the `useRouter` hook for event-driven navigation:

```tsx
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function ProfileButton() {
  const router = useRouter();

  const handlePress = () => {
    // Standard stack push
    router.push('/(app)/profile');

    // Replacing history for auth flows
    // router.replace('/(auth)/login');
  };

  return (
    <Pressable onPress="{handlePress}" pressed style="{({"> [{ opacity: pressed ? 0.7 : 1 }]}>
      <Text>View Profile</Text>
    </Pressable>
  );
}
```
