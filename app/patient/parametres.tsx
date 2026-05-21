import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function PatientParametresScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, setTheme, isDark, colors } = useTheme();
  
  const [notifications, setNotifications] = useState(true);
  const [rappelMedicament, setRappelMedicament] = useState(false);
  const [partagerDonnees, setPartagerDonnees] = useState(true);

  const getThemeLabel = () => {
    if (theme === 'light') return 'Clair';
    if (theme === 'dark') return 'Sombre';
    return 'Système';
  };

  const handleThemeChange = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: () => signOut() }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => Alert.alert('Compte supprimé', 'Votre compte a été supprimé') }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Compte */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Compte</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/patient/modifier-profil')}>
          <View style={styles.menuLeft}>
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Modifier mon profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/patient/carnet')}>
          <View style={styles.menuLeft}>
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Carnet de santé</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Notifications push</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={notifications ? colors.primary : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="medkit-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Rappel de médicaments</Text>
          </View>
          <Switch
            value={rappelMedicament}
            onValueChange={setRappelMedicament}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={rappelMedicament ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Apparence - MODE SOMBRE */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Apparence</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleThemeChange}>
          <View style={styles.menuLeft}>
            <Ionicons name={isDark ? "moon" : "sunny-outline"} size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Mode sombre</Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={[styles.themeLabel, { color: colors.textSecondary }]}>{getThemeLabel()}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Confidentialité */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Confidentialité</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="shield-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Partager mes données médicales</Text>
          </View>
          <Switch
            value={partagerDonnees}
            onValueChange={setPartagerDonnees}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={partagerDonnees ? colors.primary : '#f4f3f4'}
          />
        </View>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Politique de confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="code-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Conditions d'utilisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Centre d'aide</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>À propos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.primary }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      {/* Supprimer le compte */}
      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.surface, borderColor: '#ff4444' }]} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={22} color="#ff4444" />
        <Text style={styles.deleteText}>Supprimer mon compte</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuText: {
    fontSize: 16,
  },
  themeLabel: {
    fontSize: 14,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  deleteText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '500',
  },
});