import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { InterventionService } from '../data/interventions';

interface PatientInfo {
  id: string;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  derniereIntervention: Date;
  statut: string;
}

export default function ProHomeScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [mesPatients, setMesPatients] = useState<PatientInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('mesPatients'); // 'mesPatients' ou 'tousPatients'

  // Liste fictive de tous les patients (pour admin ou recherche)
  const tousPatients: PatientInfo[] = [
    { id: 'p1', nom: 'Selougha', prenom: 'Ryem', adresse: 'Sidi Ammar', telephone: '0561420444', derniereIntervention: new Date(), statut: 'terminee' },
    { id: 'p2', nom: 'Benali', prenom: 'Karim', adresse: 'El Bouni', telephone: '0555123456', derniereIntervention: new Date(), statut: 'en_cours' },
    { id: 'p3', nom: 'Lamine', prenom: 'Sarah', adresse: 'Annaba Centre', telephone: '0555987654', derniereIntervention: new Date(), statut: 'acceptee' },
    { id: 'p4', nom: 'Mansouri', prenom: 'Ahmed', adresse: 'Bouchette', telephone: '0555123789', derniereIntervention: new Date(), statut: 'terminee' },
  ];

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = () => {
    if (user?.id) {
      // Récupérer les patients qui ont accepté les interventions de ce professionnel
      const patients = InterventionService.getPatientsByProfessionnel(user.id);
      setMesPatients(patients);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
  };

  const getFilteredPatients = () => {
    const source = activeTab === 'mesPatients' ? mesPatients : tousPatients;
    if (!search) return source;
    return source.filter(p => 
      p.nom.toLowerCase().includes(search.toLowerCase()) || 
      p.prenom.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getStatutLabel = (statut: string) => {
    switch(statut) {
      case 'acceptee': return { label: 'En attente', color: '#ff8800' };
      case 'en_cours': return { label: 'En cours', color: '#5aadbf' };
      case 'terminee': return { label: 'Terminé', color: '#4CAF50' };
      default: return { label: 'Accepté', color: '#844567' };
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

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#844567']} />}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Bonjour,</Text>
        <Text style={styles.name}>Dr. {user?.prenom} {user?.nom}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel()}</Text>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{mesPatients.length}</Text>
          <Text style={styles.statLabel}>Mes patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{
            InterventionService.getInterventionsParProfessionnel(user?.id || '').filter(i => i.statut === 'en_cours').length
          }</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{
            InterventionService.getInterventionsParProfessionnel(user?.id || '').filter(i => i.statut === 'terminee').length
          }</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Rechercher un patient..." 
          value={search} 
          onChangeText={handleSearch} 
        />
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'mesPatients' && styles.tabActive]} 
          onPress={() => setActiveTab('mesPatients')}
        >
          <Text style={[styles.tabText, activeTab === 'mesPatients' && styles.tabTextActive]}>
            Mes patients ({mesPatients.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tousPatients' && styles.tabActive]} 
          onPress={() => setActiveTab('tousPatients')}
        >
          <Text style={[styles.tabText, activeTab === 'tousPatients' && styles.tabTextActive]}>
            Tous les patients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des patients */}
      <Text style={styles.sectionTitle}>
        {activeTab === 'mesPatients' ? 'Mes patients' : 'Annuaire des patients'}
      </Text>
      
      {getFilteredPatients().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {activeTab === 'mesPatients' 
              ? 'Aucun patient pour le moment. Les patients qui acceptent vos interventions apparaîtront ici.' 
              : 'Aucun patient trouvé'}
          </Text>
        </View>
      ) : (
        getFilteredPatients().map(patient => {
          const statutInfo = getStatutLabel(patient.statut);
          return (
            <View key={patient.id} style={styles.patientCard}>
              <View style={styles.patientInfo}>
                <View style={styles.patientHeader}>
                  <Text style={styles.patientName}>{patient.prenom} {patient.nom}</Text>
                  {activeTab === 'mesPatients' && (
                    <View style={[styles.statutBadge, { backgroundColor: statutInfo.color }]}>
                      <Text style={styles.statutBadgeText}>{statutInfo.label}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.patientDetails}>📍 {patient.adresse}</Text>
                <Text style={styles.patientDetails}>📞 {patient.telephone}</Text>
              </View>
              <View style={styles.patientActions}>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => router.push({ 
                    pathname: '/pro/patient-dossier', 
                    params: { patientId: patient.id, patientNom: patient.nom, patientPrenom: patient.prenom } 
                  })}
                >
                  <Ionicons name="folder-outline" size={22} color="#844567" />
                  <Text style={styles.actionBtnText}>Dossier</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => router.push({ 
                    pathname: '/pro/carnet-patient', 
                    params: { patientId: patient.id, patientNom: patient.nom, patientPrenom: patient.prenom } 
                  })}
                >
                  <Ionicons name="heart-outline" size={22} color="#5aadbf" />
                  <Text style={styles.actionBtnText}>Carnet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => router.push({ 
                    pathname: '/pro/interventions-patient', 
                    params: { patientId: patient.id, patientNom: patient.nom, patientPrenom: patient.prenom } 
                  })}
                >
                  <Ionicons name="medkit-outline" size={22} color="#ff8800" />
                  <Text style={styles.actionBtnText}>Soins</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: { marginBottom: 20 },
  welcome: { fontSize: 16, color: '#666' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#844567' },
  roleBadge: { backgroundColor: '#5aadbf', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, elevation: 2 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#844567' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, marginBottom: 20, elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, marginLeft: 8 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#844567' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#844567', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginBottom: 12 },
  patientCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  patientInfo: { flex: 1 },
  patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  patientDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  patientActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  actionBtn: { alignItems: 'center' },
  actionBtnText: { fontSize: 11, color: '#666', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 12, fontSize: 14 },
  logoutButton: { backgroundColor: '#844567', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});