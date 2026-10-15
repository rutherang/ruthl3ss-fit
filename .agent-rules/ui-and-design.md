# Sub-Agent: UI, Styling & Native Components

## Objective

Enforce consistent styling and component usage using **NativeWind** and **React Native Paper**.

---

## 1. Styling Rules (NativeWind)

- Use Tailwind utility classes via `className="..."`.
- Use React Native primitives (`View`, `Text`, `Pressable`) decorated with NativeWind classes.
- Ensure all text string variables are wrapped inside a decorated `<Text>` element.

### Example: Correct NativeWind Usage

```tsx
import { View, Text, Pressable } from 'react-native';

export function Card({ title }: { title: string }) {
  return (
    <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
    </View>
  );
}
```

## 2. Component Library Rules (React Native Paper)

When using React Native Paper, use thematic components (Button, Card, TextInput, Modal) instead of raw pressables.

Do NOT mix HTML buttons or web input types.

Example: Correct React Native Paper Usage

```tsx
import { Button, Card } from 'react-native-paper';

export function ActionCard() {
  return (
    <Card>
      <Card.Content>{/* React Native Paper components */}</Card.Content>

      <Card.Actions>
        <Button mode="contained" onPress={() => {}}>
          Save
        </Button>
      </Card.Actions>
    </Card>
  );
}
```
