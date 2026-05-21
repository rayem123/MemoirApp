import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type InterventionItem = {
  id: string;
  type_intervention: string;
  date_demande: string;
  statut: string;
  localisation: string;
  priorite: string;
  professionnel_nom?: string;
};

export default function InterventionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    setLoading(true);
    
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('id')
      .eq('utilisateur_id', user?.id)
      .single();

    if (patientError) {
      console.error('Erreur patient:', patientError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('intervention')
      .select(`
        id,
        date_demande,
        localisation,
        priorite,
        statut,
        type_intervention,
        professionnel:professionnel_id (
          utilisateur:utilisateur_id (nom, prenom)
        )
      `)
      .eq('patient_id', patient.id)
      .order('date_demande', { ascending: false });

    if (error) {
      console.error('Erreur chargement interventions:', error);
    } else if (data) {
      const formatted: InterventionItem[] = data.map(i => ({
        id: i.id,
        date_demande: new Date(i.date_demande).toLocaleDateString(),
        localisation: i.localisation,
        priorite: i.priorite,
        statut: i.statut,
        type_intervention: i.type_intervention || 'Non spécifié',
        professionnel_nom: i.professionnel?.utilisateur ? 
          `${i.professionnel.utilisateur.prenom} ${i.professionnel.utilisateur.nom}` : 
          'Non affecté'
      }));
      setInterventions(formatted);
    }
    
    setLoading(false);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'consultation': 'Consultation médicale',
      'soin-plaie': 'Soin de plaie',
      'injection': 'Injection',
      'perfusion': 'Perfusion',
      'prelevement': 'Prélèvement',
      'surveillance': 'Surveillance',
      'reeducation': 'Rééducation'
    };
    return types[type] || type;
  };

  const getStatutInfo = (statut: string) => {
    switch(statut) {
      case 'en_attente': 
        return { label: 'En attente', color: '#ff8800', icon: 'time-outline' };
      case 'affectee': 
        return { label: 'Affectée', color: '#5aadbf', icon: 'person-outline' };
      case 'en_cours': 
        return { label: 'En cours', color: '#844567', icon: 'play-outline' };
      case 'terminee': 
        return { label: 'Terminée', color: '#4CAF50', icon: 'checkmark-done-outline' };
      default: 
        return { label: statut, color: '#999', icon: 'help-outline' };
    }
  };

  const voirResultats = (interventionId: string) => {
    router.push({
      pathname: '/patient/resultats-intervention',
      params: { id: interventionId }
    });
  };

  // Séparer les interventions par statut
  const interventionsEnAttente = interventions.filter(i => i.statut === 'en_attente');
  const interventionsAffectees = interventions.filter(i => i.statut === 'affectee' || i.statut === 'en_cours');
  const interventionsTerminees = interventions.filter(i => i.statut === 'terminee');

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.mainTitle, { color: colors.primary }]}>Mes interventions</Text>

        {interventions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune intervention</Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              Vos interventions apparaîtront ici
            </Text>
          </View>
        ) : (
          <>
            {/* Section En attente */}
            {interventionsEnAttente.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: '#ff8800' }]}>
                  ⏳ En attente ({interventionsEnAttente.length})
                </Text>
                {interventionsEnAttente.map(item => renderInterventionCard(item, false))}
              </>
            )}

            {/* Section Affectées / En cours */}
            {interventionsAffectees.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                  🔄 En cours ({interventionsAffectees.length})
                </Text>
                {interventionsAffectees.map(item => renderInterventionCard(item, false))}
              </>
            )}

            {/* Section Terminées */}
            {interventionsTerminees.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>
                  ✅ Terminées ({interventionsTerminees.length})
                </Text>
                {interventionsTerminees.map(item => renderInterventionCard(item, true))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  function renderInterventionCard(item: InterventionItem, estTerminee: boolean) {
    const statutInfo = getStatutInfo(item.statut);
    const isExpanded = expandedId === item.id;
    
    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={styles.cardLeft}>
            <Ionicons name={statutInfo.icon as any} size={20} color={statutInfo.color} />
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {getTypeLabel(item.type_intervention)}
              </Text>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                {item.date_demande}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statutBadge, { backgroundColor: statutInfo.color }]}>
              <Text style={styles.statutText}>{statutInfo.label}</Text>
            </View>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <Text style={[styles.info, { color: colors.textSecondary }]}>
              📍 {item.localisation}
            </Text>
            <Text style={[styles.info, { color: colors.textSecondary }]}>
              👨‍⚕️ Professionnel: {item.professionnel_nom}
            </Text>
            <Text style={[styles.info, { color: colors.textSecondary }]}>
              ⚡ Priorité: {item.priorite}
            </Text>

            {estTerminee && (
              <TouchableOpacity 
                style={[styles.resultButton, { backgroundColor: colors.primary }]} 
                onPress={() => voirResultats(item.id)}
              >
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.resultButtonText}>📄 Voir les résultats</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 10 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 10 },
  card: { borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardBody: { padding: 15, borderTopWidth: 1 },
  info: { fontSize: 14, marginBottom: 6 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  resultButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginTop: 10, gap: 8 },
  resultButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  emptySubText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});