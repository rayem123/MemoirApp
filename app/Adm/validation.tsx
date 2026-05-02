import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function AdminValidationScreen() {
  const [professionnels, setProfessionnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfessionnels = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('utilisateur')
      .select('id, nom, prenom, email, telephone, role, statut')
      .in('role', ['medecin', 'infirmier', 'aide_soignant'])
      .eq('statut', 'en_attente');

    if (error) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', error.message);
    } else {
      setProfessionnels(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfessionnels();
  }, []);

  const handleValider = async (pro: any) => {
    Alert.alert(
      'Validation',
      `Valider le compte de ${pro.prenom} ${pro.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            // ✅ Mise à jour SANS updated_at
            const { error } = await supabase
              .from('utilisateur')
              .update({ statut: 'actif' })
              .eq('id', pro.id);

            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              Alert.alert('Succès', `Compte de ${pro.prenom} ${pro.nom} validé`);
              loadProfessionnels();
            }
          }
        }
      ]
    );
  };

  const handleRefuser = async (pro: any) => {
    Alert.alert(
      'Refus',
      `Refuser le compte de ${pro.prenom} ${pro.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          onPress: async () => {
            const { error } = await supabase
              .from('utilisateur')
              .update({ statut: 'refuse' })
              .eq('id', pro.id);

            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              Alert.alert('Succès', `Compte de ${pro.prenom} ${pro.nom} refusé`);
              loadProfessionnels();
            }
          }
        }
      ]
    );
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'medecin': return 'Médecin';
      case 'infirmier': return 'Infirmier';
      case 'aide_soignant': return 'Aide-soignant';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'medecin': return '#844567';
      case 'infirmier': return '#5aadbf';
      default: return '#ff8800';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#844567" />
        <Text style={{ marginTop: 10 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Validation des comptes professionnels</Text>
      
      {professionnels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucune demande en attente</Text>
        </View>
      ) : (
        professionnels.map(pro => (
          <View key={pro.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.proName}>{pro.prenom} {pro.nom}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(pro.role) }]}>
                <Text style={styles.roleText}>{getRoleLabel(pro.role)}</Text>
              </View>
            </View>
            
            <Text style={styles.proInfo}>📧 {pro.email}</Text>
            {pro.telephone && <Text style={styles.proInfo}>📞 {pro.telephone}</Text>}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.validerButton]} onPress={() => handleValider(pro)}>
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Valider</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.button, styles.refuserButton]} onPress={() => handleRefuser(pro)}>
                <Ionicons name="close-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 16 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#844567', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  proName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  roleBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 20 
  },
  roleText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  proInfo: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 6 
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 12, 
    gap: 10 
  },
  button: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 8, 
    gap: 6 
  },
  validerButton: { 
    backgroundColor: '#4CAF50' 
  },
  refuserButton: { 
    backgroundColor: '#ff4444' 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#999', 
    marginTop: 12 
  },
});