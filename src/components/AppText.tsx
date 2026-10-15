import { Text, TextProps, useColorScheme } from 'react-native';

export function AppText({ style, ...rest }: TextProps) {
  const dark = useColorScheme() === 'dark';
  return <Text {...rest} style={[{ color: dark ? '#fff' : '#000' }, style]} />;
}
