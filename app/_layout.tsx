import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Petit délai pour éviter le flash
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#844567" />
      </View>
    );
  }

  // ✅ TOUJOURS afficher l'écran d'accueil public d'abord
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="patient" options={{ headerShown: false }} />
      <Stack.Screen name="pro" options={{ headerShown: false }} />
      <Stack.Screen name="Adm" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}