import { useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Onboarding from '@/components/gosugbo/onboarding';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <AnimatedSplashOverlay />

        {showOnboarding ? (
          <Onboarding
            onGetStarted={() => setShowOnboarding(false)}
            onLogin={() =>
              Alert.alert(
                'Log in',
                'Connect this button to your login screen next.'
              )
            }
          />
        ) : (
          <AppTabs />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}