# Sub-Agent: UI & React Native Paper Specialist

## Objective

Enforce consistent, accessible, cross-platform UI development using **React Native Paper (Material Design 3)** and React Native primitives.

---

## 1. Provider & Root Setup

All screens and components using React Native Paper **MUST** be wrapped in `PaperProvider` at the root layout boundary (`src/app/_layout.tsx`).

```tsx
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Slot } from 'expo-router';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Slot />
    </PaperProvider>
  );
}
```

## 2. Component Usage Guidelines

### A. Typography (Text)

Use React Native Paper's `<Text>` component instead of raw React Native `<Text>` whenever rendering themed typography, as it automatically applies MD3 font variants (`variant="titleMedium"`, `variant="bodyLarge"`, etc.).

```tsx
import { Text } from 'react-native-paper';

// ✅ Preferred for MD3 theme consistency
<Text variant="titleMedium">Account Settings</Text>;
```

### B. Actions & Buttons

Use Paper's `<Button>` component for user actions, specifying `mode` explicitly (`contained`, `outlined`, `text`, or `elevated`).

```tsx
import { Button } from 'react-native-paper';

// ✅ Standard Paper Button
<Button loading={isLoading} mode="contained" onPress={handleSave}>
  Save Profile
</Button>;
```

### C. Form Inputs (TextInput)

**ALWAYS** use Paper's `<TextInput>` for forms. Specify `mode="outlined"` or `mode="flat"` explicitly.

```tsx
import { useState } from 'react';
import { TextInput } from 'react-native-paper';

export function NameInput() {
  const [text, setText] = useState('');

  return <TextInput label="Full Name" mode="outlined" onChangeText={setText} value={text} />;
}
```

### D. Cards & Surface Container Layouts

Structure feature UI containers using `<Card>` or `<Surface>` primitives.

```tsx
import { Card, Text, Button } from 'react-native-paper';

export function ProfileSummaryCard({ name }: { name: string }) {
  return (
    <Card mode="elevated">
      <Card.Content>
        <Text variant="titleLarge">{name}</Text>
        <Text variant="bodyMedium">Active User Session</Text>
      </Card.Content>
      <Card.Actions>
        <Button mode="text">Edit</Button>
      </Card.Actions>
    </Card>
  );
}
```

## 3. Strict Safety Guardrails

- ❌ **NEVER** import web forms or HTML inputs (`<input>`, `<button>`, `<form>`).
- ❌ **NEVER** use `TouchableOpacity` when Paper provides `<TouchableRipple>` or `<Button>`.
- ❌ **NEVER** leave raw string primitives outside `<Text>` (e.g., `{status && status}`). Wrap them in `<Text>` or convert them to strict booleans.
