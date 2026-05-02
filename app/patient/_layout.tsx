import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function PatientTabs() {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();

  // ✅ Rediriger vers la page de connexion si non patient
  if (!user || role !== 'patient') {
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
      <Tabs.Screen name="demande" options={{ title: 'Demander', tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="interventions" options={{ title: 'Mes interventions', tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="parametres" options={{ title: 'Paramètres', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> }} />
      
      {/* Pages cachées */}
      <Tabs.Screen name="carnet" options={{ href: null }} />
      <Tabs.Screen name="choix-soins" options={{ href: null }} />
      <Tabs.Screen name="symptomes" options={{ href: null }} />
      <Tabs.Screen name="recap-demande" options={{ href: null }} />
    </Tabs>
  );
}

export default function PatientLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#844567" />
      </View>
    );
  }

  return <PatientTabs />;
}