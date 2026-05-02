import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { InterventionService, DemandeIntervention } from '../data/interventions';

export default function ProInterventionsScreen() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<DemandeIntervention[]>([]);
  const [selected, setSelected] = useState<DemandeIntervention | null>(null);
  const [compteRendu, setCompteRendu] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { 
    const load = () => { 
      if (user?.id) {
        const interventionsPro = InterventionService.getInterventionsParProfessionnel(user.id);
        console.log('Interventions chargées:', interventionsPro.length);
        setInterventions(interventionsPro);
      }
    }; 
    load(); 
    const unsub = InterventionService.subscribe(load); 
    return () => unsub(); 
  }, [user]);

  const handleTerminer = () => {
    if (!compteRendu.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter un compte rendu');
      return;
    }
    if (selected) {
      InterventionService.terminerIntervention(selected.id, compteRendu);
      setModalVisible(false);
      setCompteRendu('');
      Alert.alert('Succès', 'Intervention terminée avec succès');
    }
  };

  // Filtrer les interventions en cours (non terminées)
  const interventionsEnCours = interventions.filter(i => i.statut !== 'terminee');
  const interventionsTerminees = interventions.filter(i => i.statut === 'terminee');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mes interventions</Text>
      
      {/* Interventions en cours */}
      {interventionsEnCours.length === 0 ? (
        <Text style={styles.emptyText}>Aucune intervention en cours</Text>
      ) : (
        interventionsEnCours.map(i => (
          <View key={i.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.patientNom}>{i.patientPrenom} {i.patientNom}</Text>
              <View style={[styles.statutBadge, { 
                backgroundColor: i.statut === 'affectee' ? '#5aadbf' : 
                                i.statut === 'acceptee' ? '#2196F3' : 
                                i.statut === 'en_cours' ? '#844567' : '#ff4444' 
              }]}>
                <Text style={styles.statutText}>{i.statut === 'affectee' ? 'Affectée' : 
                                                   i.statut === 'acceptee' ? 'Acceptée' : 
                                                   i.statut === 'en_cours' ? 'En cours' : 'Refusée'}</Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>📋 {i.typeSoin}</Text>
            <Text style={styles.cardInfo}>📍 {i.patientAdresse}</Text>
            <Text style={styles.cardInfo}>📞 {i.patientTelephone}</Text>
            <Text style={styles.cardInfo}>⚡ Gravité: {i.gravite}</Text>
            
            <View style={styles.buttonContainer}>
              {i.statut === 'affectee' && (
                <>
                  <TouchableOpacity style={[styles.button, styles.accepter]} onPress={() => InterventionService.accepterIntervention(i.id)}>
                    <Text style={styles.buttonText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.refuser]} onPress={() => InterventionService.refuserIntervention(i.id)}>
                    <Text style={styles.buttonText}>Refuser</Text>
                  </TouchableOpacity>
                </>
              )}
              {i.statut === 'acceptee' && (
                <TouchableOpacity style={[styles.button, styles.demarrer]} onPress={() => InterventionService.demarrerIntervention(i.id)}>
                  <Text style={styles.buttonText}>Démarrer</Text>
                </TouchableOpacity>
              )}
              {i.statut === 'en_cours' && (
                <TouchableOpacity style={[styles.button, styles.terminer]} onPress={() => { 
                  setSelected(i); 
                  setModalVisible(true); 
                }}>
                  <Text style={styles.buttonText}>Terminer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      {/* Interventions terminées (historique) */}
      {interventionsTerminees.length > 0 && (
        <>
          <Text style={styles.historyTitle}>Historique</Text>
          {interventionsTerminees.map(i => (
            <View key={i.id} style={[styles.card, styles.historyCard]}>
              <Text style={styles.patientNom}>{i.patientPrenom} {i.patientNom}</Text>
              <Text style={styles.cardInfo}>📋 {i.typeSoin}</Text>
              <Text style={styles.cardInfo}>📅 Réalisée le: {i.dateRealisation?.toLocaleDateString()}</Text>
              {i.compteRendu && <Text style={styles.cardInfo}>📝 {i.compteRendu}</Text>}
            </View>
          ))}
        </>
      )}

      {/* Modal pour compte rendu */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Compte rendu de l'intervention</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Rédigez votre compte rendu..." 
              value={compteRendu} 
              onChangeText={setCompteRendu} 
              multiline 
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelModal]} onPress={() => {
                setModalVisible(false);
                setCompteRendu('');
              }}>
                <Text style={styles.cancelModalText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmModal]} onPress={handleTerminer}>
                <Text style={styles.confirmModalText}>Valider</Text>
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#844567', marginBottom: 20, textAlign: 'center' },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  historyCard: { backgroundColor: '#f9f9f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  patientNom: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardInfo: { fontSize: 14, color: '#666', marginBottom: 6 },
  buttonContainer: { flexDirection: 'row', marginTop: 12, gap: 10 },
  button: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  accepter: { backgroundColor: '#4CAF50' },
  refuser: { backgroundColor: '#ff4444' },
  demarrer: { backgroundColor: '#5aadbf' },
  terminer: { backgroundColor: '#844567' },
  buttonText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginBottom: 15 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 100, fontSize: 16, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cancelModal: { backgroundColor: '#f0f0f0' },
  cancelModalText: { color: '#666', fontWeight: '600' },
  confirmModal: { backgroundColor: '#844567' },
  confirmModalText: { color: '#fff', fontWeight: '600' },
});