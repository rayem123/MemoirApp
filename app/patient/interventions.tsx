import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type DemandeItem = {
  id: string;
  motif: string;
  date_demande: string;
  statut: string;
  professionnel_nom?: string;
};

export default function InterventionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<DemandeItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = async () => {
    setLoading(true);
    
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('id')
      .eq('utilisateur_id', user?.id)
      .single();

    if (patientError) {
      setLoading(false);
      return;
    }

    const { data: demandesData, error } = await supabase
      .from('demande_intervention')
      .select(`
        id,
        motif,
        date_demande,
        statut,
        professionnel:professionnel_id (
          utilisateur:utilisateur_id (
            nom,
            prenom
          )
        )
      `)
      .eq('patient_id', patient.id)
      .order('date_demande', { ascending: false });

    if (!error && demandesData) {
      const formatted: DemandeItem[] = demandesData.map(d => ({
        id: d.id,
        motif: d.motif || 'Intervention',
        date_demande: new Date(d.date_demande).toLocaleDateString(),
        statut: d.statut,
        professionnel_nom: d.professionnel?.utilisateur ? 
          `${d.professionnel.utilisateur.prenom} ${d.professionnel.utilisateur.nom}` : 
          'Non assigné'
      }));
      setDemandes(formatted);
    }
    
    setLoading(false);
  };

  const getStatutInfo = (statut: string) => {
    switch(statut) {
      case 'en_attente': return { label: 'En attente', color: '#ff8800', icon: 'time-outline' };
      case 'affectee': return { label: 'Affectée', color: '#5aadbf', icon: 'person-outline' };
      case 'acceptee': return { label: 'Acceptée', color: '#2196F3', icon: 'checkmark-circle-outline' };
      case 'refusee': return { label: 'Refusée', color: '#ff4444', icon: 'close-circle-outline' };
      case 'en_cours': return { label: 'En cours', color: '#844567', icon: 'play-outline' };
      case 'terminee': return { label: 'Terminée', color: '#4CAF50', icon: 'checkmark-done-outline' };
      default: return { label: statut, color: '#999', icon: 'help-outline' };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#844567" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes demandes</Text>

        {demandes.length === 0 ? (
          <Text style={styles.emptyText}>Aucune demande</Text>
        ) : (
          demandes.map((item) => {
            const statutInfo = getStatutInfo(item.statut);
            return (
              <View key={item.id} style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <View style={styles.cardLeft}>
                    <Ionicons name={statutInfo.icon as any} size={20} color={statutInfo.color} />
                    <View>
                      <Text style={styles.cardTitle}>{item.motif.substring(0, 40)}</Text>
                      <Text style={styles.cardDate}>{item.date_demande}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.statutBadge, { backgroundColor: statutInfo.color }]}>
                      <Text style={styles.statutText}>{statutInfo.label}</Text>
                    </View>
                    <Ionicons name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={20} color="#844567" />
                  </View>
                </TouchableOpacity>

                {expandedId === item.id && (
                  <View style={styles.cardBody}>
                    <View style={styles.row}>
                      <Ionicons name="person-outline" size={16} color="#666" />
                      <Text style={styles.rowText}>Professionnel: {item.professionnel_nom}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#f5f5f5', paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#844567' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardDate: { fontSize: 12, color: '#666', marginTop: 2 },
  cardBody: { padding: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowText: { marginLeft: 8, fontSize: 14, color: '#333' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});