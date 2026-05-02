import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProLayout() {
  const { user, role, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#844567" />
      </View>
    );
  }

  if (!user || (role !== 'medecin' && role !== 'infirmier' && role !== 'aide_soignant')) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#844567',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { 
          backgroundColor: '#fff',
          paddingBottom: insets.bottom + 5,  // ✅ Espace dynamique selon le téléphone
          height: 60 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
        headerStyle: { backgroundColor: '#844567' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="interventions"
        options={{
          title: 'Interventions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="carnet"
        options={{
          title: 'Carnet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="add-post" options={{ href: null, title: 'Ajouter une publication' }} />
      <Tabs.Screen name="patient-dossier" options={{ href: null, title: 'Dossier patient' }} />
      <Tabs.Screen name="carnet-patient" options={{ href: null, title: 'Carnet patient' }} />
      <Tabs.Screen name="interventions-patient" options={{ href: null, title: 'Interventions patient' }} />
    </Tabs>
  );
}