import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type InterventionWithDetails = {
  id: string;
  date_demande: string;
  localisation: string;
  priorite: string;
  statut: string;
  patient: {
    adresse: string | null;
    utilisateur: {
      nom: string;
      prenom: string;
      telephone: string;
    };
  };
  professionnel: {
    utilisateur: {
      nom: string;
      prenom: string;
    };
  } | null;
};

const statutLabels: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: '#ff8800' },
  affectee: { label: 'Affectée', color: '#5aadbf' },
  en_cours: { label: 'En cours', color: '#844567' },
  terminee: { label: 'Terminée', color: '#4CAF50' },
  annulee: { label: 'Annulée', color: '#999' },
};

export default function AdminSuiviScreen() {
  const [interventions, setInterventions] = useState<InterventionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionWithDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [compteRendu, setCompteRendu] = useState('');

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('intervention')
      .select(`
        id,
        date_demande,
        localisation,
        priorite,
        statut,
        patient:patient_id (
          adresse,
          utilisateur:utilisateur_id (
            nom,
            prenom,
            telephone
          )
        ),
        professionnel:professionnel_id (
          utilisateur:utilisateur_id (
            nom,
            prenom
          )
        )
      `)
      .order('date_demande', { ascending: false });

    if (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message);
    } else {
      setInterventions(data || []);
    }
    setLoading(false);
  };

  const handleTerminerIntervention = async (intervention: InterventionWithDetails) => {
    setSelectedIntervention(intervention);
    setModalVisible(true);
  };

  const validerTerminer = async () => {
    if (!selectedIntervention) return;

    const { error } = await supabase
      .from('intervention')
      .update({ 
        statut: 'terminee'
      })
      .eq('id', selectedIntervention.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      // Créer une notification pour le patient
      await supabase
        .from('notification')
        .insert({
          titre: 'Intervention terminée',
          message: `Votre intervention du ${new Date(selectedIntervention.date_demande).toLocaleDateString()} est terminée.`,
          type: 'intervention',
          utilisateur_id: selectedIntervention.patient?.utilisateur?.id,
          data: { intervention_id: selectedIntervention.id, compte_rendu }
        });

      Alert.alert('Succès', 'Intervention terminée');
      setModalVisible(false);
      setCompteRendu('');
      loadInterventions();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Suivi des interventions</Text>
      
      {interventions.map(i => {
        const patient = i.patient;
        const user = patient?.utilisateur;
        const pro = i.professionnel;
        
        return (
          <View key={i.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.patientNom}>{user?.prenom} {user?.nom}</Text>
              <View style={[styles.statutBadge, { backgroundColor: statutLabels[i.statut]?.color || '#999' }]}>
                <Text style={styles.statutText}>{statutLabels[i.statut]?.label || i.statut}</Text>
              </View>
            </View>
            
            <Text style={styles.cardInfo}>📍 {i.localisation}</Text>
            <Text style={styles.cardInfo}>⚡ Priorité: {i.priorite}</Text>
            <Text style={styles.cardInfo}>📞 {user?.telephone || 'Téléphone non renseigné'}</Text>
            
            {pro && (
              <Text style={styles.cardInfo}>👨‍⚕️ Professionnel: {pro.utilisateur?.prenom} {pro.utilisateur?.nom}</Text>
            )}
            
            <Text style={styles.cardInfo}>📅 {new Date(i.date_demande).toLocaleDateString()}</Text>

            {i.statut === 'affectee' || i.statut === 'en_cours' && (
              <TouchableOpacity 
                style={styles.terminerButton}
                onPress={() => handleTerminerIntervention(i)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.terminerButtonText}>Terminer l'intervention</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      
      {interventions.length === 0 && (
        <Text style={styles.emptyText}>Aucune intervention</Text>
      )}

      {/* Modal pour terminer l'intervention */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Terminer l'intervention</Text>
            <Text style={styles.modalSubtitle}>
              Patient: {selectedIntervention?.patient?.utilisateur?.prenom} {selectedIntervention?.patient?.utilisateur?.nom}
            </Text>

            <Text style={styles.inputLabel}>Compte rendu (optionnel)</Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              placeholder="Résumé de l'intervention..."
              value={compteRendu}
              onChangeText={setCompteRendu}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  setCompteRendu('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={validerTerminer}
              >
                <Text style={styles.confirmButtonText}>Terminer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#844567', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  patientNom: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardInfo: { fontSize: 14, color: '#666', marginBottom: 6 },
  terminerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 8, marginTop: 10, gap: 8 },
  terminerButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginBottom: 5, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0f0f0' },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  confirmButton: { backgroundColor: '#4CAF50' },
  confirmButtonText: { color: '#fff', fontWeight: '600' },
});