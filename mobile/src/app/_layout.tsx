import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts, Teko_600SemiBold, Teko_700Bold } from '@expo-google-fonts/teko';
import { Archivo_400Regular, Archivo_500Medium, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* la splash ya estaba oculta */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // El taller trabaja con señal irregular: se reintenta poco y se prefiere
      // mostrar lo último conocido antes que una pantalla en blanco.
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  },
});

function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {
        /* sin splash que ocultar */
      });
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.red },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 24 },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Pedido' }} />
      </Stack.Protected>

      <Stack.Protected guard={status !== 'signedIn'}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Teko_600SemiBold,
    Teko_700Bold,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
