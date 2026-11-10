import { useEffect } from "react";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/AuthContext";

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const isRider = user?.role === "rider";

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8F3EB" },
      }}>
      {/* Signed-in: shared landing. home.tsx renders the correct dashboard
          for the user's role (customer vs rider). */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="home" />
        <Stack.Screen name="chat" />
      </Stack.Protected>

      {/* Signed-in: customer-only screens */}
      <Stack.Protected guard={isAuthenticated && !isRider}>
        <Stack.Screen name="book-ride" />
        <Stack.Screen name="ride-tracking" />
        <Stack.Screen name="my-rides" />
      </Stack.Protected>

      {/* Signed-in: rider-only screens */}
      <Stack.Protected guard={isAuthenticated && isRider}>
        <Stack.Screen name="rider-earnings" />
      </Stack.Protected>

      {/* Signed-out area */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="rider-login" />
        <Stack.Screen name="rider-signup" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
