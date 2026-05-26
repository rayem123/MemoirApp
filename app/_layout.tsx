import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './lib/notificationService';
import { supabase } from './lib/supabase';

// Configuration du handler de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function RootNavigator() {
  const { colors } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Enregistrer les notifications push (fonctionne en APK)
      if (Platform.OS !== 'web') {
        const token = await registerForPushNotificationsAsync();
        
        if (token) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase
              .from('utilisateur')
              .update({ expo_push_token: token })
              .eq('id', session.user.id);
          }
        }
      }
      setIsReady(true);
    };

    initialize();
  }, []);

  // Écouter les notifications reçues
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {});
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Retour',
        headerBackVisible: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
      }}
    >
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
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}