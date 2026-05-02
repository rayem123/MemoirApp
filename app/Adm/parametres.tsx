import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function AdminParametresScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [autoAffectation, setAutoAffectation] = useState(false);
  const [modeSombre, setModeSombre] = useState(false);
  const [exportAuto, setExportAuto] = useState(true);

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profil Admin */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Administration</Text>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="person-circle-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Mon profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Adm/validation')}>
          <View style={styles.menuLeft}>
            <Ionicons name="people-outline" size={24} color="#5aadbf" />
            <Text style={styles.menuText}>Gestion des comptes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Adm/suivi')}>
          <View style={styles.menuLeft}>
            <Ionicons name="stats-chart-outline" size={24} color="#5aadbf" />
            <Text style={styles.menuText}>Statistiques</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Paramètres système */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres système</Text>
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Notifications admin</Text>
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
            <Ionicons name="flash-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Affectation automatique</Text>
          </View>
          <Switch
            value={autoAffectation}
            onValueChange={setAutoAffectation}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={autoAffectation ? '#844567' : '#f4f3f4'}
          />
        </View>
        <View style={styles.switchItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="download-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Export automatique des données</Text>
          </View>
          <Switch
            value={exportAuto}
            onValueChange={setExportAuto}
            trackColor={{ false: '#ddd', true: '#5aadbf' }}
            thumbColor={exportAuto ? '#844567' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Apparence */}
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

      {/* Gestion des données */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestion des données</Text>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="cloud-upload-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Sauvegarde manuelle</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="refresh-outline" size={24} color="#844567" />
            <Text style={styles.menuText}>Restaurer les données</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Support */}
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
            <Text style={styles.menuText}>Documentation technique</Text>
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
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0 - Administrateur</Text>
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