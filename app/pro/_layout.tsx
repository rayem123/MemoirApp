import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProLayout() {
  const { user, role, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user || (role !== 'medecin' && role !== 'infirmier' && role !== 'aide_soignant')) {
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
          height: 60 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: { 
          backgroundColor: colors.surface,
          shadowColor: colors.border,
          elevation: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      {/* Onglet Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Interventions - LE SEUL UTILE POUR LE PRO */}
      <Tabs.Screen
        name="interventions"
        options={{
          title: 'Interventions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Onglet Profil */}
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="parametres" options={{ title: 'Paramètres', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} /> }} />

      {/* Écrans cachés (non affichés dans la barre de navigation) */}
      <Tabs.Screen name="intervention-details" options={{ href: null, title: 'Détails intervention' }} />
      <Tabs.Screen name="modifier-profil" options={{ href: null, title: 'Modification de profil' }} />
       <Tabs.Screen name="carnet_patient" options={{ href: null, title: 'carnet_patient' }} />
    </Tabs>
  );
}