import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AccountProvider } from '@/features/account/AccountProvider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <PaperProvider theme={dark ? MD3DarkTheme : MD3LightTheme}>
        <AccountProvider>
          <AnimatedSplashOverlay />
          <AppTabs />
        </AccountProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
