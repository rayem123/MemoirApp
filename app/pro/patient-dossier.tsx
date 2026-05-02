import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Modal, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { MedicalDataService, DossierMedical, Consultation, Prescription, Analyse, Observation } from '../data/medicalData';
import * as ImagePicker from 'expo-image-picker';

export default function PatientDossierScreen() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { patientId, patientNom, patientPrenom } = useLocalSearchParams();
  const [dossier, setDossier] = useState<DossierMedical | null>(null);
  const [activeTab, setActiveTab] = useState('consultations');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  
  // États pour les formulaires
  const [motif, setMotif] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [compteRendu, setCompteRendu] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [medicaments, setMedicaments] = useState('');
  const [posologie, setPosologie] = useState('');
  const [duree, setDuree] = useState('');
  const [typeAnalyse, setTypeAnalyse] = useState('');
  const [resultatsAnalyse, setResultatsAnalyse] = useState('');
  const [observation, setObservation] = useState('');

  const isMedecin = role === 'medecin';
  const isInfirmier = role === 'infirmier';
  const isAideSoignant = role === 'aide_soignant';

  useEffect(() => {
    const load = () => {
      const d = MedicalDataService.getDossierMedical(patientId as string);
      if (d) {
        d.patientNom = patientNom as string;
        d.patientPrenom = patientPrenom as string;
        setDossier(d);
      }
    };
    load();
    const unsub = MedicalDataService.subscribe(load);
    return () => unsub();
  }, [patientId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleAjouterConsultation = () => {
    if (!motif || !diagnostic || !compteRendu) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    MedicalDataService.ajouterConsultation(patientId as string, {
      date: new Date(),
      medecinId: user?.id || '',
      medecinNom: `${user?.prenom} ${user?.nom}`,
      motif,
      diagnostic,
      compteRendu,
      images,
    });
    Alert.alert('Succès', 'Consultation ajoutée');
    setModalVisible(false);
    setMotif('');
    setDiagnostic('');
    setCompteRendu('');
    setImages([]);
  };

  const handleAjouterPrescription = () => {
    if (!medicaments || !posologie || !duree) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    MedicalDataService.ajouterPrescription(patientId as string, {
      date: new Date(),
      medecinId: user?.id || '',
      medecinNom: `${user?.prenom} ${user?.nom}`,
      medicaments: medicaments.split(',').map(m => m.trim()),
      posologie,
      duree,
    });
    Alert.alert('Succès', 'Prescription ajoutée');
    setModalVisible(false);
    setMedicaments('');
    setPosologie('');
    setDuree('');
  };

  const handleAjouterAnalyse = () => {
    if (!typeAnalyse || !resultatsAnalyse) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    MedicalDataService.ajouterAnalyse(patientId as string, {
      date: new Date(),
      medecinId: user?.id || '',
      medecinNom: `${user?.prenom} ${user?.nom}`,
      type: typeAnalyse,
      resultats: resultatsAnalyse,
    });
    Alert.alert('Succès', 'Analyse ajoutée');
    setModalVisible(false);
    setTypeAnalyse('');
    setResultatsAnalyse('');
  };

  const handleAjouterObservation = () => {
    if (!observation) {
      Alert.alert('Erreur', 'Veuillez écrire une observation');
      return;
    }
    MedicalDataService.ajouterObservation(patientId as string, {
      date: new Date(),
      professionnelId: user?.id || '',
      professionnelNom: `${user?.prenom} ${user?.nom}`,
      professionnelRole: role === 'medecin' ? 'Médecin' : role === 'infirmier' ? 'Infirmier' : 'Aide-soignant',
      contenu: observation,
    });
    Alert.alert('Succès', 'Observation ajoutée');
    setModalVisible(false);
    setObservation('');
  };

  const openModal = (type: string) => {
    setModalType(type);
    setModalVisible(true);
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'consultation':
        return (
          <>
            <Text style={styles.modalTitle}>Ajouter une consultation</Text>
            <TextInput style={styles.modalInput} placeholder="Motif" value={motif} onChangeText={setMotif} />
            <TextInput style={styles.modalInput} placeholder="Diagnostic" value={diagnostic} onChangeText={setDiagnostic} />
            <TextInput style={[styles.modalInput, { minHeight: 80 }]} placeholder="Compte rendu" value={compteRendu} onChangeText={setCompteRendu} multiline />
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}><Ionicons name="image-outline" size={20} color="#844567" /><Text style={styles.imageButtonText}>Ajouter une image</Text></TouchableOpacity>
            {images.length > 0 && <Text style={styles.imageCount}>{images.length} image(s) sélectionnée(s)</Text>}
            <TouchableOpacity style={styles.modalButton} onPress={handleAjouterConsultation}><Text style={styles.modalButtonText}>Ajouter</Text></TouchableOpacity>
          </>
        );
      case 'prescription':
        return (
          <>
            <Text style={styles.modalTitle}>Ajouter une prescription</Text>
            <TextInput style={styles.modalInput} placeholder="Médicaments (séparés par des virgules)" value={medicaments} onChangeText={setMedicaments} />
            <TextInput style={styles.modalInput} placeholder="Posologie (ex: 2x par jour)" value={posologie} onChangeText={setPosologie} />
            <TextInput style={styles.modalInput} placeholder="Durée (ex: 7 jours)" value={duree} onChangeText={setDuree} />
            <TouchableOpacity style={styles.modalButton} onPress={handleAjouterPrescription}><Text style={styles.modalButtonText}>Ajouter</Text></TouchableOpacity>
          </>
        );
      case 'analyse':
        return (
          <>
            <Text style={styles.modalTitle}>Ajouter une analyse</Text>
            <TextInput style={styles.modalInput} placeholder="Type d'analyse" value={typeAnalyse} onChangeText={setTypeAnalyse} />
            <TextInput style={[styles.modalInput, { minHeight: 80 }]} placeholder="Résultats" value={resultatsAnalyse} onChangeText={setResultatsAnalyse} multiline />
            <TouchableOpacity style={styles.modalButton} onPress={handleAjouterAnalyse}><Text style={styles.modalButtonText}>Ajouter</Text></TouchableOpacity>
          </>
        );
      case 'observation':
        return (
          <>
            <Text style={styles.modalTitle}>Ajouter une observation</Text>
            <TextInput style={[styles.modalInput, { minHeight: 100 }]} placeholder="Observation médicale..." value={observation} onChangeText={setObservation} multiline />
            <TouchableOpacity style={styles.modalButton} onPress={handleAjouterObservation}><Text style={styles.modalButtonText}>Ajouter</Text></TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#844567" />
      </TouchableOpacity>
      <Text style={styles.title}>Dossier médical</Text>
      <Text style={styles.patientName}>{patientPrenom} {patientNom}</Text>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {['consultations', 'prescriptions', 'analyses', 'observations'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'consultations' ? 'Consultations' : tab === 'prescriptions' ? 'Prescriptions' : tab === 'analyses' ? 'Analyses' : 'Observations'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Boutons d'ajout selon le rôle */}
      <View style={styles.addButtonsContainer}>
        {isMedecin && <TouchableOpacity style={styles.addButton} onPress={() => openModal('consultation')}><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.addButtonText}>Consultation</Text></TouchableOpacity>}
        {isMedecin && <TouchableOpacity style={styles.addButton} onPress={() => openModal('prescription')}><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.addButtonText}>Prescription</Text></TouchableOpacity>}
        {(isMedecin || isInfirmier) && <TouchableOpacity style={styles.addButton} onPress={() => openModal('analyse')}><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.addButtonText}>Analyse</Text></TouchableOpacity>}
        {(isMedecin || isInfirmier || isAideSoignant) && <TouchableOpacity style={styles.addButton} onPress={() => openModal('observation')}><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.addButtonText}>Observation</Text></TouchableOpacity>}
      </View>

      {/* Contenu des onglets */}
      {activeTab === 'consultations' && dossier?.consultations.map(consult => (
        <View key={consult.id} style={styles.card}>
          <Text style={styles.cardDate}>{consult.date.toLocaleDateString()}</Text>
          <Text style={styles.cardTitle}>Dr. {consult.medecinNom}</Text>
          <Text style={styles.cardText}>Motif: {consult.motif}</Text>
          <Text style={styles.cardText}>Diagnostic: {consult.diagnostic}</Text>
          <Text style={styles.cardText}>Compte rendu: {consult.compteRendu}</Text>
          {consult.images.length > 0 && <Text style={styles.cardText}>📷 {consult.images.length} image(s)</Text>}
        </View>
      ))}

      {activeTab === 'prescriptions' && dossier?.prescriptions.map(pres => (
        <View key={pres.id} style={styles.card}>
          <Text style={styles.cardDate}>{pres.date.toLocaleDateString()}</Text>
          <Text style={styles.cardTitle}>Dr. {pres.medecinNom}</Text>
          <Text style={styles.cardText}>Médicaments: {pres.medicaments.join(', ')}</Text>
          <Text style={styles.cardText}>Posologie: {pres.posologie}</Text>
          <Text style={styles.cardText}>Durée: {pres.duree}</Text>
        </View>
      ))}

      {activeTab === 'analyses' && dossier?.analyses.map(analyse => (
        <View key={analyse.id} style={styles.card}>
          <Text style={styles.cardDate}>{analyse.date.toLocaleDateString()}</Text>
          <Text style={styles.cardTitle}>Dr. {analyse.medecinNom}</Text>
          <Text style={styles.cardText}>Type: {analyse.type}</Text>
          <Text style={styles.cardText}>Résultats: {analyse.resultats}</Text>
        </View>
      ))}

      {activeTab === 'observations' && dossier?.observations.map(obs => (
        <View key={obs.id} style={styles.card}>
          <Text style={styles.cardDate}>{obs.date.toLocaleDateString()}</Text>
          <Text style={styles.cardTitle}>{obs.professionnelRole} {obs.professionnelNom}</Text>
          <Text style={styles.cardText}>{obs.contenu}</Text>
        </View>
      ))}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {renderModalContent()}
            <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}><Text style={styles.closeModalText}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#844567', textAlign: 'center' },
  patientName: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#844567' },
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#844567', fontWeight: '600' },
  addButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#844567', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  addButtonText: { color: '#fff', fontSize: 12, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardDate: { fontSize: 12, color: '#999', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#844567', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#333', marginBottom: 4 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginBottom: 15, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  imageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#844567', borderRadius: 8, padding: 10, marginBottom: 12 },
  imageButtonText: { marginLeft: 8, color: '#844567' },
  imageCount: { fontSize: 12, color: '#666', marginBottom: 12, textAlign: 'center' },
  modalButton: { backgroundColor: '#844567', paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  closeModal: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  closeModalText: { color: '#999', fontSize: 14 },
});