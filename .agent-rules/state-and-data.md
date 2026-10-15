````markdown
# Sub-Agent: Mobile State Management & Data Persistence

## Objective

Govern data flow across the React Native lifecycle, enforcing clear boundaries between Server State, UI State, Fast Caching, and Encrypted Storage.

---

## State Architecture Matrix

| Layer                  | Library                                  | Purpose                                              | Storage Location                             |
| :--------------------- | :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------- |
| **Server State**       | TanStack Query (`@tanstack/react-query`) | API fetching, caching, mutation                      | In-Memory / Optional Async Storage Persister |
| **Global UI State**    | Zustand                                  | Client-side UI state (theme, modals, active filters) | In-Memory                                    |
| **Fast Local Storage** | `react-native-mmkv`                      | Non-sensitive app settings, cached preferences       | High-performance synchronous disk storage    |
| **Secure Storage**     | `expo-secure-store`                      | Auth JWTs, encryption keys, user secrets             | iOS Keychain / Android Keystore              |

---

## Storage & API Implementation Rules

### 1. Secure Token Storage (`expo-secure-store`)

ALWAYS use `expo-secure-store` for sensitive credentials. NEVER use standard local storage or MMKV for access tokens.

```typescript
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_auth_token';

export async function saveAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```
````
