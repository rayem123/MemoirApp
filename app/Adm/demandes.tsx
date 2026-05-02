import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

type DemandeWithDetails = {
  id: string;
  date_demande: string;
  motif: string | null;
  statut: string;
  patient: {
    id: string;
    adresse: string | null;
    utilisateur: {
      nom: string;
      prenom: string;
      telephone: string;
    };
  };
};

export default function AdminDemandesScreen() {
  const [demandes, setDemandes] = useState<DemandeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemandes();
  }, []);

  const loadDemandes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('demande_intervention')
      .select(`
        id,
        date_demande,
        motif,
        statut,
        patient:patient_id (
          id,
          adresse,
          utilisateur:utilisateur_id (
            nom,
            prenom,
            telephone
          )
        )
      `)
      .eq('statut', 'en_attente')
      .order('date_demande', { ascending: false });

    if (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } else {
      setDemandes(data || []);
    }
    setLoading(false);
  };

  const getGravite = (motif: string | null): { label: string; color: string } => {
    const m = (motif || '').toLowerCase();
    if (m.includes('urgence') || m.includes('critique') || m.includes('grave')) {
      return { label: 'critique', color: '#ff4444' };
    }
    if (m.includes('douleur') || m.includes('fièvre') || m.includes('infection')) {
      return { label: 'urgente', color: '#ff8800' };
    }
    return { label: 'normale', color: '#5aadbf' };
  };

  const getTypeRequis = (motif: string | null): string => {
    const m = (motif || '').toLowerCase();
    if (m.includes('consultation') || m.includes('médecin') || m.includes('docteur')) return 'medecin';
    if (m.includes('infirmier') || m.includes('pansement') || m.includes('injection') || m.includes('perfusion')) return 'infirmier';
    return 'aide_soignant';
  };

  const handleAffecter = async (demande: DemandeWithDetails) => {
    const typeRequis = getTypeRequis(demande.motif);
    
    // Récupérer les professionnels disponibles du bon type
    const { data: pros, error } = await supabase
      .from('professionnel_sante')
      .select(`
        id,
        utilisateur:utilisateur_id (
          nom,
          prenom
        ),
        type_soignant:type_soignant_id (
          categorie
        )
      `);

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    // Filtrer par type requis
    const disponibles = pros?.filter(p => 
      p.type_soignant?.categorie?.toLowerCase() === typeRequis
    ) || [];

    if (disponibles.length === 0) {
      Alert.alert('Erreur', `Aucun ${typeRequis} disponible`);
      return;
    }

    Alert.alert(
      'Affecter un professionnel',
      `Choisir un ${typeRequis} pour cette intervention:`,
      disponibles.map(p => ({
        text: `${p.utilisateur?.prenom} ${p.utilisateur?.nom}`,
        onPress: async () => {
          const { error: updateError } = await supabase
            .from('demande_intervention')
            .update({ 
              professionnel_id: p.id,
              statut: 'affectee'
            })
            .eq('id', demande.id);

          if (updateError) {
            Alert.alert('Erreur', updateError.message);
          } else {
            Alert.alert('Succès', `Affecté à ${p.utilisateur?.prenom} ${p.utilisateur?.nom}`);
            loadDemandes();
          }
        }
      })).concat([{ text: 'Annuler', style: 'cancel' }])
    );
  };

  const renderCard = (d: DemandeWithDetails) => {
    const gravite = getGravite(d.motif);
    const patient = d.patient;
    const user = patient?.utilisateur;

    return (
      <View key={d.id} style={[styles.card, { borderLeftColor: gravite.color, borderLeftWidth: 4 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.patientNom}>{user?.prenom} {user?.nom}</Text>
          <View style={[styles.graviteBadge, { backgroundColor: gravite.color }]}>
            <Text style={styles.graviteText}>{gravite.label}</Text>
          </View>
        </View>
        <Text style={styles.cardInfo}>📋 {d.motif || 'Motif non spécifié'}</Text>
        <Text style={styles.cardInfo}>📍 {patient?.adresse || 'Adresse non renseignée'}</Text>
        <Text style={styles.cardInfo}>📞 {user?.telephone || 'Téléphone non renseigné'}</Text>
        <Text style={styles.cardInfo}>📅 {new Date(d.date_demande).toLocaleDateString()}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.typeRequis}>Besoin: {getTypeRequis(d.motif)}</Text>
          <TouchableOpacity style={styles.affecterButton} onPress={() => handleAffecter(d)}>
            <Text style={styles.affecterButtonText}>Affecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const demandesCritiques = demandes.filter(d => getGravite(d.motif).label === 'critique');
  const demandesUrgentes = demandes.filter(d => getGravite(d.motif).label === 'urgente');
  const demandesNormales = demandes.filter(d => getGravite(d.motif).label === 'normale');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Gestion des demandes</Text>
      
      {demandesCritiques.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: '#ff4444' }]}>🔴 Critiques ({demandesCritiques.length})</Text>
          {demandesCritiques.map(renderCard)}
        </>
      )}
      
      {demandesUrgentes.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: '#ff8800' }]}>🟠 Urgentes ({demandesUrgentes.length})</Text>
          {demandesUrgentes.map(renderCard)}
        </>
      )}
      
      {demandesNormales.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: '#5aadbf' }]}>🟢 Normales ({demandesNormales.length})</Text>
          {demandesNormales.map(renderCard)}
        </>
      )}
      
      {demandes.length === 0 && (
        <Text style={styles.emptyText}>Aucune demande en attente</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#844567', marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  patientNom: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  graviteBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  graviteText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardInfo: { fontSize: 14, color: '#666', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  typeRequis: { fontSize: 14, color: '#666' },
  affecterButton: { backgroundColor: '#844567', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  affecterButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});