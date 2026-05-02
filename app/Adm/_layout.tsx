import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function AdminTabs() {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();

  // ✅ Rediriger vers la page de connexion si non admin
  if (!user || role !== 'admin') {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#844567',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: insets.bottom + 5,
          height: 55 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
        headerStyle: { backgroundColor: '#844567' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="demandes" options={{ title: 'Demandes', tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="validation" options={{ title: 'Validation', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="suivi" options={{ title: 'Suivi', tabBarIcon: ({ color }) => <Ionicons name="time-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="parametres" options={{ title: 'Paramètres', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> }} />
    </Tabs>
  );
}

export default function AdminLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#844567" />
      </View>
    );
  }

  return <AdminTabs />;
}