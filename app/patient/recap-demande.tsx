import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function RecapDemandeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { typeSoin, typeSoinNom, symptomes, description } = params;
  const [loading, setLoading] = useState(false);

  let symptomesList = [];
  try {
    if (symptomes) {
      const symptomesData = JSON.parse(symptomes as string);
      if (typeof symptomesData === 'object' && !Array.isArray(symptomesData)) {
        symptomesList = Object.keys(symptomesData).map(nom => ({
          nom,
          intensite: symptomesData[nom].intensite,
          duree: symptomesData[nom].duree
        }));
      }
    }
  } catch (e) {
    console.log('Erreur parse symptomes:', e);
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1. Récupérer le patient_id
      const { data: patientData, error: patientError } = await supabase
        .from('patient')
        .select('id')
        .eq('utilisateur_id', user?.id)
        .single();

      if (patientError) throw patientError;

      // 2. Créer la demande d'intervention
      const { data: demande, error: demandeError } = await supabase
        .from('demande_intervention')
        .insert({
          patient_id: patientData.id,
          motif: `${typeSoinNom} - ${symptomesList.map(s => s.nom).join(', ')}`,
          statut: 'en_attente',
          date_demande: new Date().toISOString()
        })
        .select()
        .single();

      if (demandeError) throw demandeError;

      Alert.alert(
        'Demande envoyée', 
        'Votre demande d\'intervention a été transmise. Un professionnel vous contactera dans les plus brefs délais.',
        [{ text: 'OK', onPress: () => router.replace('/patient') }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Récapitulatif de votre demande</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Type d'intervention</Text>
          <Text style={styles.cardText}>{typeSoinNom}</Text>
        </View>

        {symptomesList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Symptômes</Text>
            {symptomesList.map((s, index) => (
              <View key={index} style={styles.symptomeDetail}>
                <Text style={styles.symptomeNom}>{s.nom}</Text>
                <View style={styles.symptomeInfos}>
                  {s.intensite && <Text style={styles.infoTag}>Intensité: {s.intensite}</Text>}
                  {s.duree && <Text style={styles.infoTag}>Durée: {s.duree}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description détaillée</Text>
            <Text style={styles.cardText}>{description}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={loading}>
          <Text style={styles.confirmButtonText}>
            {loading ? 'Envoi en cours...' : 'Confirmer la demande'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#f5f5f5', paddingVertical: 20 },
  container: { flex: 1, padding: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#844567', marginTop: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#844567', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#333' },
  symptomeDetail: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  symptomeNom: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6 },
  symptomeInfos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoTag: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, fontSize: 12, color: '#844567' },
  confirmButton: { backgroundColor: '#5aadbf', paddingVertical: 14, borderRadius: 8, marginTop: 20 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});