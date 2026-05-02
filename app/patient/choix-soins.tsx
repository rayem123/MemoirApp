import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const typesSoins = [
  { id: 'consultation', nom: 'Consultation médicale', icon: 'medkit-outline', description: 'Consultation avec un médecin généraliste ou spécialiste' },
  { id: 'soin-plaie', nom: 'Soin de plaie', icon: 'bandage-outline', description: 'Pansement, nettoyage et suivi de plaies' },
  { id: 'injection', nom: 'Injection', icon: 'syringe-outline', description: 'Piqûre, vaccin, rappel' },
  { id: 'perfusion', nom: 'Perfusion', icon: 'water-outline', description: 'Perfusion de médicaments ou de solutés' },
  { id: 'prelevement', nom: 'Prélèvement sanguin', icon: 'flask-outline', description: 'Prise de sang, analyse' },
  { id: 'surveillance', nom: 'Surveillance post-hospitalisation', icon: 'heart-outline', description: 'Suivi après sortie d\'hospitalisation' },
  { id: 'reeducation', nom: 'Rééducation', icon: 'fitness-outline', description: 'Séances de kinésithérapie ou rééducation' },
];

export default function ChoixSoinsScreen() {
  const router = useRouter();

  const handleSelectSoin = (typeSoin: typeof typesSoins[0]) => {
    router.push({
      pathname: '/patient/symptomes',
      params: { typeSoin: typeSoin.id, typeSoinNom: typeSoin.nom }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        <Text style={styles.title}>Choisissez le type de soin</Text>
        <Text style={styles.subtitle}>Sélectionnez le service dont vous avez besoin</Text>

        {typesSoins.map((soin) => (
          <TouchableOpacity
            key={soin.id}
            style={styles.soinCard}
            onPress={() => handleSelectSoin(soin)}
          >
            <View style={styles.soinIcon}>
              <Ionicons name={soin.icon as any} size={32} color="#844567" />
            </View>
            <View style={styles.soinInfo}>
              <Text style={styles.soinNom}>{soin.nom}</Text>
              <Text style={styles.soinDescription}>{soin.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#f5f5f5', paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#844567', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  soinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  soinIcon: { width: 50, alignItems: 'center' },
  soinInfo: { flex: 1 },
  soinNom: { fontSize: 16, fontWeight: '600', color: '#333' },
  soinDescription: { fontSize: 12, color: '#666', marginTop: 4 },
});