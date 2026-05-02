import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProParametresScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [nouvelleDemande, setNouvelleDemande] = useState(true);
  const [rappelRendezVous, setRappelRendezVous] = useState(true);
  const [modeSombre, setModeSombre] = useState(false);
  const [partagerStats, setPartagerStats] = useState(true);

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
    <ScrollView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Informations professionnelles */}
      <View style={styles.profilCard}>
        <View style={[styles.avatar, { backgroundColor: role === 'medecin' ? '#844567' : role === 'infirmier' ? '#5aadbf' : '#ff8800' }]}>
          <Text style={styles.avatarText}>{getTitle()}</Text>
        </View>
        <View style={styles.profilInfo}>
          <Text style={styles.profilName}>{getTitle()} {user?.prenom} {user?.nom}</Text>
          <Text style={styles.profilRole}>{getRoleLabel()}</Text>
          <Text style={styles.profilSpecialite}>{user?.specialite || 'Généraliste'}</Text>
        </View>
      </View>

      {/* Section Compte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte professionnel</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/pro/profil')}>
          <View style={styles.menuLeft}>
            <Ionicons name="person-circle-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Mon profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/pro/interventions')}>
          <View style={styles.menuLeft}>
            <Ionicons name="medkit-outline" size={24} color="#5aadbf" />
            <Text style={styles.menuText}>Mes interventions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/pro/carnet')}>
          <View style={styles.menuLeft}>
            <Ionicons name="heart-outline" size={24} color="#5aadbf" />
            <Text style={styles.menuText}>Mon carnet de santé pro</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Section Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Notifications push</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={notifications ? '#844567' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="add-circle-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Nouvelles demandes</Text>
          </View>
          <Switch
            value={nouvelleDemande}
            onValueChange={setNouvelleDemande}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={nouvelleDemande ? '#844567' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="calendar-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Rappel des rendez-vous</Text>
          </View>
          <Switch
            value={rappelRendezVous}
            onValueChange={setRappelRendezVous}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={rappelRendezVous ? '#844567' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Section Apparence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apparence</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="moon-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Mode sombre</Text>
          </View>
          <Switch
            value={modeSombre}
            onValueChange={setModeSombre}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={modeSombre ? '#844567' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Section Confidentialité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confidentialité</Text>
        
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="stats-chart-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Partager mes statistiques</Text>
          </View>
          <Switch
            value={partagerStats}
            onValueChange={setPartagerStats}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={partagerStats ? '#844567' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="shield-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Politique de confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Section Paramètres pro */}
      {role === 'medecin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres professionnels</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="time-outline" size={24} color="#844567" />
              <Text style={styles.menuText}>Mes disponibilités</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="location-outline" size={24} color="#844567" />
              <Text style={styles.menuText}>Zone d'intervention</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="cash-outline" size={24} color="#844567" />
              <Text style={styles.menuText}>Tarifs des consultations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Section Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="chatbubbles-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Centre d'aide</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="document-text-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Guide d'utilisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="information-circle-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>À propos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
          <View style={styles.menuLeft}>
            <Ionicons name="trash-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Vider le cache</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0 - {getRoleLabel()}</Text>
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#844567',
  },
  profilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profilInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profilName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  profilRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profilSpecialite: {
    fontSize: 12,
    color: '#5aadbf',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
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
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#844567',
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
});