import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function DemandeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme(); 

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.primary }]}>Demander une intervention</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choisissez le soin dont vous avez besoin</Text>

        <TouchableOpacity style={[styles.startButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/patient/choix-soins')}>
          <Ionicons name="medkit-outline" size={32} color="#fff" />
          <Text style={styles.startButtonText}>Commencer ma demande</Text>
        </TouchableOpacity>

        <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a1a' : '#f0f9f0' }]}>
          <Ionicons name="information-circle-outline" size={24} color="#5aadbf" />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Un professionnel de santé vous contactera après validation de votre demande.
            En cas d'urgence, appelez le 14.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 40 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12, marginBottom: 30 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10 },
  infoText: { marginLeft: 10, fontSize: 14, flex: 1 },
});