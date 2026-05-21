import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProParametresScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const { colors, theme, setTheme, isDark } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [nouvelleDemande, setNouvelleDemande] = useState(true);
  const [rappelRendezVous, setRappelRendezVous] = useState(true);
  const [partagerStats, setPartagerStats] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPhoto();
    }
  }, [user]);

  const loadPhoto = async () => {
    try {
      const { data: userData } = await supabase
        .from('utilisateur')
        .select('photo_url')
        .eq('id', user?.id)
        .single();
      
      if (userData?.photo_url) {
        setPhoto(userData.photo_url);
      }
    } catch (error) {
      console.log('Erreur chargement photo:', error);
    }
  };

  const getRoleLabel = () => {
    switch(role) {
      case 'medecin': return 'Médecin';
      case 'infirmier': return 'Infirmier';
      case 'aide_soignant': return 'Aide-soignant';
      default: return 'Professionnel';
    }
  };

  const getTitle = () => {
    switch(role) {
      case 'medecin': return 'Dr.';
      case 'infirmier': return 'Inf.';
      case 'aide_soignant': return 'AS.';
      default: return '';
    }
  };

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

  const handleClearCache = () => {
    Alert.alert('Cache vidé', 'Le cache de l\'application a été vidé avec succès');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Section Mon compte - SANS LE CERCLE ROUGE */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mon compte</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/pro/modifier-profil')}>
          <View style={styles.menuLeft}>
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Modifier mon profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/pro/interventions')}>
          <View style={styles.menuLeft}>
            <Ionicons name="medkit-outline" size={24} color="#5aadbf" />
            <Text style={[styles.menuText, { color: colors.text }]}>Mes interventions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Notifications */}
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
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Nouvelles demandes</Text>
          </View>
          <Switch
            value={nouvelleDemande}
            onValueChange={setNouvelleDemande}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={nouvelleDemande ? colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Rappel des rendez-vous</Text>
          </View>
          <Switch
            value={rappelRendezVous}
            onValueChange={setRappelRendezVous}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={rappelRendezVous ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Section Apparence - MODE SOMBRE */}
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

      {/* Section Confidentialité */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Confidentialité</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Partager mes statistiques</Text>
          </View>
          <Switch
            value={partagerStats}
            onValueChange={setPartagerStats}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={partagerStats ? colors.primary : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="shield-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Politique de confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Paramètres pro (visible uniquement pour médecin) */}
      {role === 'medecin' && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paramètres professionnels</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>Mes disponibilités</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="location-outline" size={24} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text }]}>Zone d'intervention</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Section Support */}
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
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Guide d'utilisation</Text>
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

        <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
          <View style={styles.menuLeft}>
            <Ionicons name="trash-outline" size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>Vider le cache</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0 - {getRoleLabel()}</Text>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.primary }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
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
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuText: { fontSize: 16 },
  themeLabel: { fontSize: 14 },
  versionContainer: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  versionText: { fontSize: 12 },
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
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});