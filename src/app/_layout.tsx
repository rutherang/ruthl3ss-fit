import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { brand } from '@/constants/brand';
import { AccountProvider } from '@/features/account/AccountProvider';
import { useAccount } from '@/features/account/useAccount';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { email, ready } = useAccount();

  // Wait for the silent sign-in before choosing a screen, so a returning
  // user never sees the sign-in screen flash.
  if (!ready) return <View style={{ flex: 1, backgroundColor: brand.ground }} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={email !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={email === null}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={dark ? MD3DarkTheme : MD3LightTheme}>
        <AccountProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </AccountProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
