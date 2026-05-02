import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Types de symptômes prédéfinis selon le type de soin
const symptomesParSoin: Record<string, string[]> = {
  consultation: [
    'Fièvre', 'Toux', 'Maux de tête', 'Douleur thoracique', 'Essoufflement',
    'Nausées', 'Fatigue', 'Douleur abdominale', 'Courbatures', 'Vertiges'
  ],
  'soin-plaie': [
    'Plaie ouverte', 'Plaie infectée', 'Plaie qui saigne', 'Plaie post-opératoire',
    'Escarre', 'Brûlure', 'Cicatrice qui s\'ouvre'
  ],
  injection: [
    'Besoin de vaccin', 'Rappel vaccinal', 'Traitement injectable', 'Allergie connue', 'Douleur au point d\'injection'
  ],
  perfusion: [
    'Déshydratation', 'Traitement IV', 'Fatigue extrême', 'Malabsorption', 'Nausées persistantes'
  ],
  prelevement: [
    'Prise de sang de routine', 'Contrôle glycémie', 'Bilan lipidique', 'Dosage hormonal', 'Fatigue inhabituelle'
  ],
  surveillance: [
    'Suivi post-opératoire', 'Surveillance tension', 'Surveillance cicatrisation',
    'Prévention complications', 'Fièvre post-opératoire'
  ],
  reeducation: [
    'Rééducation post-opératoire', 'Rééducation neurologique', 'Perte de mobilité',
    'Douleur articulaire', 'Rééducation respiratoire', 'Difficulté à marcher'
  ],
};

const niveauxIntensite = ['faible', 'modérée', 'forte', 'très forte'];

export default function SymptomesScreen() {
  const router = useRouter();
  const { typeSoin, typeSoinNom } = useLocalSearchParams<{ typeSoin: string; typeSoinNom: string }>();
  const [description, setDescription] = useState('');
  const [symptomesData, setSymptomesData] = useState<Record<string, { intensite: string; duree: string }>>({});

  const symptomesList = symptomesParSoin[typeSoin] || symptomesParSoin.consultation;

  const ajouterSymptome = (symptome: string) => {
    setSymptomesData({
      ...symptomesData,
      [symptome]: { intensite: 'modérée', duree: '' }
    });
  };

  const supprimerSymptome = (symptome: string) => {
    const newData = { ...symptomesData };
    delete newData[symptome];
    setSymptomesData(newData);
  };

  const isSymptomeSelected = (symptome: string) => {
    return symptomesData.hasOwnProperty(symptome);
  };

  const updateIntensite = (symptome: string, intensite: string) => {
    setSymptomesData({
      ...symptomesData,
      [symptome]: { ...symptomesData[symptome], intensite }
    });
  };

  const updateDuree = (symptome: string, duree: string) => {
    setSymptomesData({
      ...symptomesData,
      [symptome]: { ...symptomesData[symptome], duree }
    });
  };

  const handleSubmit = () => {
    const symptomesSelectionnes = Object.keys(symptomesData);
    
    if (symptomesSelectionnes.length === 0 && !description) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un symptôme');
      return;
    }

    const symptomesJSON = JSON.stringify(symptomesData);
    
    router.push({
      pathname: '/patient/recap-demande',
      params: {
        typeSoin,
        typeSoinNom,
        symptomes: symptomesJSON,
        description,
      }
    });
  };

  const renderSymptomeItem = (symptome: string) => {
    const isSelected = isSymptomeSelected(symptome);
    
    if (!isSelected) {
      return (
        <TouchableOpacity
          key={symptome}
          style={styles.symptomeCard}
          onPress={() => ajouterSymptome(symptome)}
        >
          <View style={styles.symptomeHeader}>
            <Ionicons name="add-circle-outline" size={24} color="#844567" />
            <Text style={styles.symptomeNom}>{symptome}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View key={symptome} style={styles.symptomeCardSelected}>
        <View style={styles.symptomeHeader}>
          <Text style={styles.symptomeNomSelected}>{symptome}</Text>
          <TouchableOpacity onPress={() => supprimerSymptome(symptome)}>
            <Ionicons name="close-circle" size={22} color="#ff4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sousLabel}>Intensité :</Text>
        <View style={styles.intensiteContainer}>
          {niveauxIntensite.map((niveau) => (
            <TouchableOpacity
              key={niveau}
              style={[
                styles.intensiteButton,
                symptomesData[symptome].intensite === niveau && styles.intensiteButtonActive
              ]}
              onPress={() => updateIntensite(symptome, niveau)}
            >
              <Text style={[
                styles.intensiteText,
                symptomesData[symptome].intensite === niveau && styles.intensiteTextActive
              ]}>{niveau}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sousLabel}>Durée :</Text>
        <TextInput
          style={styles.dureeInput}
          placeholder="Ex: 2 jours, 1 semaine..."
          value={symptomesData[symptome].duree}
          onChangeText={(text) => updateDuree(symptome, text)}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Description des symptômes</Text>
        <Text style={styles.subtitle}>Soin demandé : {typeSoinNom}</Text>

        <Text style={styles.label}>Ajoutez vos symptômes :</Text>
        <View style={styles.symptomesList}>
          {symptomesList.map((symptome) => renderSymptomeItem(symptome))}
        </View>

        <Text style={styles.label}>Description complémentaire :</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Décrivez précisément votre situation, localisation, évolution..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, padding: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#844567', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 15 },
  sousLabel: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 5, marginTop: 8 },
  symptomesList: { flexDirection: 'column', gap: 12 },
  symptomeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  symptomeCardSelected: {
    backgroundColor: '#f0e6f0',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#844567',
    marginBottom: 12,
  },
  symptomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  symptomeNom: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  symptomeNomSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#844567',
  },
  intensiteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  intensiteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  intensiteButtonActive: {
    backgroundColor: '#5aadbf',
    borderColor: '#5aadbf',
  },
  intensiteText: {
    fontSize: 12,
    color: '#333',
  },
  intensiteTextActive: {
    color: '#fff',
  },
  dureeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginTop: 5,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#844567',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});