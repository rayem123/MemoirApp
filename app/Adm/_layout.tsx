import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function AdminTabs() {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { colors } = useTheme();

  // ✅ Rediriger vers la page de connexion si non admin
  if (!user || role !== 'admin') {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          paddingBottom: insets.bottom + 5,
          height: 55 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="demandes" options={{ title: 'Demandes', tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="validation" options={{ title: 'Validation', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="gestion-materiel" options={{ title: 'Matériel', tabBarIcon: ({ color }) => <Ionicons name="construct-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="parametres" options={{ title: 'Paramètres', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> }} />
      
      {/* Pages cachées */}
      <Tabs.Screen name="modifier-profil" options={{ href: null }} />
      <Tabs.Screen name="statistiques" options={{ href: null }} />
    </Tabs>
  );
}

export default function AdminLayout() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AdminTabs />;
}