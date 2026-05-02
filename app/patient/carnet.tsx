import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const screenWidth = Dimensions.get('window').width - 40;

type Mesure = {
  date: string;
  tension?: number;
  poids?: number;
  glycemie?: number;
};

export default function CarnetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  
  const [newTension, setNewTension] = useState('');
  const [newPoids, setNewPoids] = useState('');
  const [newGlycemie, setNewGlycemie] = useState('');

  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    setLoading(true);
    
    // Récupérer les données du patient
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('*')
      .eq('utilisateur_id', user?.id)
      .single();

    if (patientError) {
      console.error('Erreur patient:', patientError);
      setLoading(false);
      return;
    }

    setPatientData(patient);
    
    // Construire les mesures à partir des champs de la table patient
    const extractedMesures: Mesure[] = [];
    
    if (patient.tension) {
      extractedMesures.push({
        date: patient.date_mesure || new Date().toLocaleDateString(),
        tension: parseFloat(patient.tension)
      });
    }
    
    if (patient.poids) {
      extractedMesures.push({
        date: patient.date_mesure || new Date().toLocaleDateString(),
        poids: parseFloat(patient.poids)
      });
    }
    
    if (patient.diabete) {
      extractedMesures.push({
        date: patient.date_mesure || new Date().toLocaleDateString(),
        glycemie: parseFloat(patient.diabete)
      });
    }
    
    setMesures(extractedMesures);
    setLoading(false);
  };

  const addMeasure = async () => {
    if (!newTension && !newPoids && !newGlycemie) {
      Alert.alert('Erreur', 'Veuillez saisir au moins une mesure');
      return;
    }

    const updates: any = {
      date_mesure: new Date().toLocaleDateString()
    };
    
    if (newTension) updates.tension = newTension;
    if (newPoids) updates.poids = newPoids;
    if (newGlycemie) updates.diabete = newGlycemie;

    const { error } = await supabase
      .from('patient')
      .update(updates)
      .eq('utilisateur_id', user?.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Mesure ajoutée');
      setNewTension('');
      setNewPoids('');
      setNewGlycemie('');
      loadPatientData();
    }
  };

  const chartData = {
    labels: ['Mesure actuelle'],
    datasets: [
      {
        data: [mesures[0]?.tension || 0],
        color: (opacity = 1) => `rgba(132, 69, 103, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: [mesures[0]?.poids || 0],
        color: (opacity = 1) => `rgba(90, 173, 191, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: [mesures[0]?.glycemie || 0],
        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Tension (mmHg)', 'Poids (kg)', 'Glycémie (g/L)'],
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
        <Text style={styles.title}>Carnet de santé</Text>

        {mesures.length > 0 ? (
          <>
            <Text style={styles.chartLabel}>Dernières mesures</Text>
            <LineChart
              data={chartData}
              width={screenWidth}
              height={250}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </>
        ) : (
          <Text style={styles.emptyText}>Aucune mesure enregistrée</Text>
        )}

        <Text style={styles.subtitle}>Ajouter une nouvelle mesure</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Tension (mmHg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 12.5"
            value={newTension}
            onChangeText={setNewTension}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Poids (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 72"
            value={newPoids}
            onChangeText={setNewPoids}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Glycémie (g/L)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1.2"
            value={newGlycemie}
            onChangeText={setNewGlycemie}
            keyboardType="numeric"
          />
        </View>
        
        <TouchableOpacity style={styles.addButton} onPress={addMeasure}>
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#844567', marginTop: 10 },
  chartLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 20 },
  chart: { marginVertical: 8, borderRadius: 16 },
  subtitle: { fontSize: 18, fontWeight: '600', color: '#844567', marginTop: 30, marginBottom: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  inputLabel: { width: 120, fontSize: 16, color: '#333' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16 },
  addButton: { backgroundColor: '#844567', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});