import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { InterventionService, DemandeIntervention } from '../data/interventions';

export default function InterventionsPatientScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { patientId, patientNom, patientPrenom } = useLocalSearchParams();
  const [interventions, setInterventions] = useState<DemandeIntervention[]>([]);

  useEffect(() => {
    const allInterventions = InterventionService.getToutesInterventions();
    const patientInterventions = allInterventions.filter(i => i.patientId === patientId);
    setInterventions(patientInterventions);
  }, [patientId]);

  const getStatutColor = (statut: string) => {
    switch(statut) {
      case 'en_attente': return '#ff8800';
      case 'affectee': return '#5aadbf';
      case 'acceptee': return '#2196F3';
      case 'en_cours': return '#844567';
      case 'terminee': return '#4CAF50';
      case 'refusee': return '#ff4444';
      default: return '#999';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch(statut) {
      case 'en_attente': return 'En attente';
      case 'affectee': return 'Affectée';
      case 'acceptee': return 'Acceptée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'refusee': return 'Refusée';
      default: return statut;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#844567" />
      </TouchableOpacity>
      
      <Text style={styles.title}>Interventions</Text>
      <Text style={styles.patientName}>{patientPrenom} {patientNom}</Text>

      {interventions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucune intervention pour ce patient</Text>
        </View>
      ) : (
        interventions.map(intervention => (
          <View key={intervention.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{intervention.dateDemande.toLocaleDateString()}</Text>
              <View style={[styles.statutBadge, { backgroundColor: getStatutColor(intervention.statut) }]}>
                <Text style={styles.statutText}>{getStatutLabel(intervention.statut)}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{intervention.typeSoin}</Text>
            <Text style={styles.cardInfo}>📍 {intervention.localisation}</Text>
            <Text style={styles.cardInfo}>⚡ Gravité: {intervention.gravite}</Text>
            <Text style={styles.cardInfo}>💊 Symptômes: {intervention.symptomes.join(', ')}</Text>
            <Text style={styles.cardInfo}>📝 {intervention.description}</Text>
            {intervention.professionnelNom && (
              <Text style={styles.cardInfo}>👨‍⚕️ Professionnel: {intervention.professionnelNom}</Text>
            )}
            {intervention.compteRendu && (
              <View style={styles.renduContainer}>
                <Text style={styles.renduLabel}>Compte rendu:</Text>
                <Text style={styles.renduText}>{intervention.compteRendu}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#844567', textAlign: 'center' },
  patientName: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate: { fontSize: 12, color: '#999' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#844567', marginBottom: 8 },
  cardInfo: { fontSize: 14, color: '#666', marginBottom: 6 },
  renduContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  renduLabel: { fontSize: 12, fontWeight: '600', color: '#844567', marginBottom: 4 },
  renduText: { fontSize: 14, color: '#333' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 12 },
});