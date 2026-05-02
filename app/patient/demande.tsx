import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DemandeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Demander une intervention</Text>
        <Text style={styles.subtitle}>Choisissez le soin dont vous avez besoin</Text>

        <TouchableOpacity style={styles.startButton} onPress={() => router.push('/patient/choix-soins')}>
          <Ionicons name="medkit-outline" size={32} color="#fff" />
          <Text style={styles.startButtonText}>Commencer ma demande</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#5aadbf" />
          <Text style={styles.infoText}>
            Un professionnel de santé vous contactera après validation de votre demande.
            En cas d'urgence, appelez le 14.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#844567' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40 },
  startButton: { backgroundColor: '#844567', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12, marginBottom: 30 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9f0', padding: 15, borderRadius: 10 },
  infoText: { marginLeft: 10, fontSize: 14, color: '#666', flex: 1 },
});