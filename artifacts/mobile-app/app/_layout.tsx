import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { QuizProvider } from '@/contexts/QuizContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthProvider as AccountAuthProvider } from '@/lib/auth';

// Set API base URL so Expo bundles reach the shared API server.
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
// Attach the stored session token as a bearer header on every API request.
setAuthTokenGetter(() => SecureStore.getItemAsync('auth_session_token'));

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
});

function RootLayoutNav() {
  const { playerName, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!playerName) {
        router.replace('/login');
      } else {
        // If the user is on the login screen and already has a name, go home
        router.replace('/');
      }
    }
  }, [isLoading, playerName]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="quiz" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="result" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AccountAuthProvider>
            <AuthProvider>
              <QuizProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </QuizProvider>
            </AuthProvider>
          </AccountAuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
