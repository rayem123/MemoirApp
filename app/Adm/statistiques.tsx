import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

type Stats = {
  totalPatients: number;
  totalProfessionnels: number;
  totalInterventions: number;
  interventionsEnAttente: number;
  interventionsEnCours: number;
  interventionsTerminees: number;
  publicationsCount: number;
  commentairesCount: number;
};

type Patient = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_inscription: string;
};

type Professionnel = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  disponibilite: string;
  telephone: string;
};

export default function AdminStatistiquesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalProfessionnels: 0,
    totalInterventions: 0,
    interventionsEnAttente: 0,
    interventionsEnCours: 0,
    interventionsTerminees: 0,
    publicationsCount: 0,
    commentairesCount: 0,
  });

  // États pour les modals
  const [showPatientsModal, setShowPatientsModal] = useState(false);
  const [showProsModal, setShowProsModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionnels, setProfessionnels] = useState<Professionnel[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    
    try {
      // Total patients
      const { count: patientsCount } = await supabase
        .from('patient')
        .select('*', { count: 'exact', head: true });

      // Total professionnels
      const { count: prosCount } = await supabase
        .from('professionnel_sante')
        .select('*', { count: 'exact', head: true });

      // Total interventions
      const { count: interventionsCount } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true });

      // Interventions par statut
      const { count: enAttente } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');

      const { count: enCours } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .in('statut', ['affectee', 'en_cours']);

      const { count: terminees } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'terminee');

      // Publications
      const { count: publicationsCount } = await supabase
        .from('publication')
        .select('*', { count: 'exact', head: true });

      // Commentaires
      const { count: commentairesCount } = await supabase
        .from('commentaire')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalPatients: patientsCount || 0,
        totalProfessionnels: prosCount || 0,
        totalInterventions: interventionsCount || 0,
        interventionsEnAttente: enAttente || 0,
        interventionsEnCours: enCours || 0,
        interventionsTerminees: terminees || 0,
        publicationsCount: publicationsCount || 0,
        commentairesCount: commentairesCount || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger la liste des patients
  const loadPatients = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('patient')
        .select(`
          id,
          utilisateur:utilisateur_id (nom, prenom, email, telephone)
        `);

      if (error) throw error;
      
      const formattedPatients: Patient[] = (data || []).map((p: any) => ({
        id: p.id,
        nom: p.utilisateur?.nom || 'Inconnu',
        prenom: p.utilisateur?.prenom || 'Inconnu',
        email: p.utilisateur?.email || 'Non renseigné',
        telephone: p.utilisateur?.telephone || 'Non renseigné',
        date_inscription: new Date().toLocaleDateString(),
      }));
      
      setPatients(formattedPatients);
    } catch (error) {
      console.error('Erreur chargement patients:', error);
    } finally {
      setLoadingList(false);
    }
  };

  // Charger la liste des professionnels
  const loadProfessionnels = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('professionnel_sante')
        .select(`
          id,
          disponibilite,
          utilisateur:utilisateur_id (nom, prenom, email, telephone, role)
        `);

      if (error) throw error;
      
      const formattedPros: Professionnel[] = (data || []).map((p: any) => ({
        id: p.id,
        nom: p.utilisateur?.nom || 'Inconnu',
        prenom: p.utilisateur?.prenom || 'Inconnu',
        email: p.utilisateur?.email || 'Non renseigné',
        telephone: p.utilisateur?.telephone || 'Non renseigné',
        role: p.utilisateur?.role || 'Professionnel',
        disponibilite: p.disponibilite || 'indisponible',
      }));
      
      setProfessionnels(formattedPros);
    } catch (error) {
      console.error('Erreur chargement professionnels:', error);
    } finally {
      setLoadingList(false);
    }
  };

  // Ouvrir modal patients
  const openPatientsModal = async () => {
    setShowPatientsModal(true);
    await loadPatients();
  };

  // Ouvrir modal professionnels
  const openProsModal = async () => {
    setShowProsModal(true);
    await loadProfessionnels();
  };

  // Filtrer les listes par recherche
  const filteredPatients = patients.filter(p => 
    `${p.prenom} ${p.nom}`.toLowerCase().includes(searchText.toLowerCase()) ||
    p.email.toLowerCase().includes(searchText.toLowerCase()) ||
    p.telephone.includes(searchText)
  );

  const filteredPros = professionnels.filter(p => 
    `${p.prenom} ${p.nom}`.toLowerCase().includes(searchText.toLowerCase()) ||
    p.email.toLowerCase().includes(searchText.toLowerCase()) ||
    p.role.toLowerCase().includes(searchText.toLowerCase())
  );

  const StatCard = ({ title, value, icon, color, onPress }: { title: string; value: number; icon: string; color: string; onPress?: () => void }) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.cardArrow} />
      )}
    </TouchableOpacity>
  );

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <View style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.listItemAvatar}>
        <Text style={[styles.listItemAvatarText, { color: colors.primary }]}>
          {item.prenom?.charAt(0)}{item.nom?.charAt(0)}
        </Text>
      </View>
      <View style={styles.listItemInfo}>
        <Text style={[styles.listItemName, { color: colors.text }]}>{item.prenom} {item.nom}</Text>
        <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>{item.email}</Text>
        <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>📞 {item.telephone}</Text>
      </View>
    </View>
  );

  const renderProItem = ({ item }: { item: Professionnel }) => (
    <View style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.listItemAvatar, { backgroundColor: item.disponibilite === 'disponible' ? '#4CAF5020' : '#ff444420' }]}>
        <Text style={[styles.listItemAvatarText, { color: item.disponibilite === 'disponible' ? '#4CAF50' : '#ff4444' }]}>
          {item.prenom?.charAt(0)}{item.nom?.charAt(0)}
        </Text>
      </View>
      <View style={styles.listItemInfo}>
        <Text style={[styles.listItemName, { color: colors.text }]}>{item.prenom} {item.nom}</Text>
        <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>{item.role}</Text>
        <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>📞 {item.telephone}</Text>
      </View>
      <View style={[styles.dispoBadge, { backgroundColor: item.disponibilite === 'disponible' ? '#4CAF50' : '#ff4444' }]}>
        <Text style={styles.dispoBadgeText}>{item.disponibilite === 'disponible' ? 'Dispo' : 'Indispo'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement des statistiques...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>Statistiques</Text>
          <TouchableOpacity onPress={loadStats}>
            <Ionicons name="refresh-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Cartes principales - cliquables */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Patients" 
            value={stats.totalPatients} 
            icon="people-outline" 
            color="#844567" 
            onPress={openPatientsModal}
          />
          <StatCard 
            title="Professionnels" 
            value={stats.totalProfessionnels} 
            icon="medkit-outline" 
            color="#5aadbf" 
            onPress={openProsModal}
          />
          <StatCard 
            title="Interventions" 
            value={stats.totalInterventions} 
            icon="document-text-outline" 
            color="#ff8800" 
          />
          <StatCard 
            title="Publications" 
            value={stats.publicationsCount} 
            icon="newspaper-outline" 
            color="#4CAF50" 
          />
        </View>

        {/* Interventions par statut */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📊 Interventions par statut</Text>
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <View style={[styles.statusDot, { backgroundColor: '#ff8800' }]} />
            <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>En attente</Text>
            <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsEnAttente}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statusDot, { backgroundColor: '#5aadbf' }]} />
            <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>En cours</Text>
            <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsEnCours}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Terminées</Text>
            <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsTerminees}</Text>
          </View>
        </View>

        {/* Taux de complétion */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📈 Taux de complétion</Text>
        <View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.completionLabel, { color: colors.text }]}>Interventions terminées</Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${stats.totalInterventions > 0 ? (stats.interventionsTerminees / stats.totalInterventions) * 100 : 0}%`,
                  backgroundColor: '#4CAF50' 
                }
              ]} 
            />
          </View>
          <Text style={[styles.completionPercent, { color: colors.textSecondary }]}>
            {stats.totalInterventions > 0 ? Math.round((stats.interventionsTerminees / stats.totalInterventions) * 100) : 0}%
          </Text>
        </View>

        {/* Engagement */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>💬 Engagement</Text>
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
            <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Commentaires</Text>
            <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.commentairesCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Moyenne/ pub</Text>
            <Text style={[styles.statItemValue, { color: colors.text }]}>
              {stats.publicationsCount > 0 ? Math.round(stats.commentairesCount / stats.publicationsCount) : 0}
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal Liste des Patients */}
      <Modal
        visible={showPatientsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>👥 Liste des patients</Text>
              <TouchableOpacity onPress={() => setShowPatientsModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche */}
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Rechercher un patient..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText !== '' && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loadingList ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoader} />
            ) : filteredPatients.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun patient trouvé</Text>
              </View>
            ) : (
              <FlatList
                data={filteredPatients}
                keyExtractor={(item) => item.id}
                renderItem={renderPatientItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}

            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]} 
              onPress={() => setShowPatientsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Liste des Professionnels */}
      <Modal
        visible={showProsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>👨‍⚕️ Liste des professionnels</Text>
              <TouchableOpacity onPress={() => setShowProsModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche */}
            <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Rechercher un professionnel..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText !== '' && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loadingList ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoader} />
            ) : filteredPros.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="medkit-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun professionnel trouvé</Text>
              </View>
            ) : (
              <FlatList
                data={filteredPros}
                keyExtractor={(item) => item.id}
                renderItem={renderProItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}

            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]} 
              onPress={() => setShowProsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  cardArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statTitle: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statItemLabel: { fontSize: 12, marginTop: 4 },
  statItemValue: { fontSize: 20, fontWeight: 'bold' },
  completionCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  completionLabel: { fontSize: 14, marginBottom: 8 },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4 },
  completionPercent: { fontSize: 12, marginTop: 8, textAlign: 'right' },
  
  // Styles pour les modals
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  modalLoader: {
    padding: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  listItemAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#84456720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemDetail: {
    fontSize: 12,
  },
  dispoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dispoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  modalCloseButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});