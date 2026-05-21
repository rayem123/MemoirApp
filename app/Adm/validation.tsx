import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function AdminValidationScreen() {
  const { colors } = useTheme();
  const [professionnels, setProfessionnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEnAttente, setTotalEnAttente] = useState(0);

  const loadProfessionnels = async () => {
    setLoading(true);
    
    try {
      const { data: allData, error: allError } = await supabase
        .from('utilisateur')
        .select('id, nom, prenom, email, role, statut')
        .in('role', ['medecin', 'infirmier', 'aide-soignant']);
      
      if (!allError && allData) {
        const enAttenteAll = allData.filter(p => p.statut === 'en_attente');
        setTotalEnAttente(enAttenteAll.length);
      }
      
      const { data, error } = await supabase
        .from('utilisateur')
        .select('id, nom, prenom, email, telephone, role, statut, photo_url, created_at')
        .in('role', ['medecin', 'infirmier', 'aide-soignant'])
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        setProfessionnels(data || []);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessionnels();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfessionnels();
    setRefreshing(false);
  };

  const handleValider = async (pro: any) => {
    Alert.alert(
      '✅ Validation',
      `Valider le compte de ${pro.prenom} ${pro.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              const { error: updateError } = await supabase
                .from('utilisateur')
                .update({ statut: 'actif' })
                .eq('id', pro.id);

              if (updateError) throw updateError;

              await supabase.from('notification').insert({
                utilisateur_id: pro.id,
                titre: '✅ Compte validé',
                message: `Votre compte ${getRoleLabel(pro.role)} a été validé. Vous pouvez maintenant vous connecter.`,
                type: 'compte_valide',
                est_lue: false,
                created_at: new Date().toISOString(),
              });
              
              Alert.alert('Succès', `Compte de ${pro.prenom} ${pro.nom} validé`);
              loadProfessionnels();
              
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          }
        }
      ]
    );
  };

  const handleRefuser = async (pro: any) => {
    Alert.alert(
      '❌ Refus',
      `Refuser le compte de ${pro.prenom} ${pro.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('utilisateur')
                .update({ statut: 'refuse' })
                .eq('id', pro.id);

              if (error) throw error;

              await supabase.from('notification').insert({
                utilisateur_id: pro.id,
                titre: '❌ Compte refusé',
                message: `Votre compte ${getRoleLabel(pro.role)} a été refusé. Contactez l'administrateur.`,
                type: 'compte_refuse',
                est_lue: false,
                created_at: new Date().toISOString(),
              });
              
              Alert.alert('Succès', `Compte de ${pro.prenom} ${pro.nom} refusé`);
              loadProfessionnels();
              
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
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
      case 'aide-soignant': return 'Aide-soignant';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'medecin': return '#844567';
      case 'infirmier': return '#5aadbf';
      case 'aide-soignant': return '#ff8800';
      default: return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={[styles.title, { color: colors.primary }]}>📋 Validation des comptes</Text>
      
      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>
          📊 {professionnels.length} demande{professionnels.length > 1 ? 's' : ''} en attente
        </Text>
        {totalEnAttente > professionnels.length && (
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            (Total: {totalEnAttente} pro(s) en attente)
          </Text>
        )}
      </View>
      
      {professionnels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune demande en attente</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            Tous les comptes professionnels sont validés
          </Text>
        </View>
      ) : (
        professionnels.map(pro => (
          <View key={pro.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: getRoleColor(pro.role) }]}>
                  <Text style={styles.avatarText}>
                    {pro.prenom?.charAt(0)}{pro.nom?.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.proName, { color: colors.text }]}>{pro.prenom} {pro.nom}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(pro.role) + '20' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(pro.role) }]}>{getRoleLabel(pro.role)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.proInfo, { color: colors.textSecondary }]}>{pro.email}</Text>
              </View>
              {pro.telephone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.proInfo, { color: colors.textSecondary }]}>{pro.telephone}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.proInfo, { color: colors.textSecondary }]}>
                  Inscrit le {formatDate(pro.created_at)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#ff8800" />
                <Text style={[styles.proInfo, { color: '#ff8800', fontWeight: '500' }]}>
                  Statut: en attente de validation
                </Text>
              </View>
            </View>
            
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
      
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  statsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statsTitle: { fontSize: 16, fontWeight: '600' },
  statsSubtitle: { fontSize: 12, marginTop: 4 },
  card: { 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  proName: { fontSize: 18, fontWeight: 'bold' },
  roleBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20, 
    marginTop: 4,
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  infoContainer: { marginBottom: 12, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proInfo: { fontSize: 14, flex: 1 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  validerButton: { backgroundColor: '#4CAF50' },
  refuserButton: { backgroundColor: '#ff4444' },
  buttonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, textAlign: 'center', marginTop: 16 },
  emptySubText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});