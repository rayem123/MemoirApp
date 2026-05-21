import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

type Stats = {
  totalPatients: number;
  totalProfessionnels: number;
  totalInterventions: number;
  interventionsEnAttente: number;
  interventionsEnCours: number;
  interventionsTerminees: number;
  publicationsCount: number;
  commentairesCount: number;
};

export default function AdminStatistiquesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalProfessionnels: 0,
    totalInterventions: 0,
    interventionsEnAttente: 0,
    interventionsEnCours: 0,
    interventionsTerminees: 0,
    publicationsCount: 0,
    commentairesCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    
    try {
      // Total patients
      const { count: patientsCount } = await supabase
        .from('patient')
        .select('*', { count: 'exact', head: true });

      // Total professionnels
      const { count: prosCount } = await supabase
        .from('professionnel_sante')
        .select('*', { count: 'exact', head: true });

      // Total interventions
      const { count: interventionsCount } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true });

      // Interventions par statut
      const { count: enAttente } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');

      const { count: enCours } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .in('statut', ['affectee', 'en_cours']);

      const { count: terminees } = await supabase
        .from('intervention')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'terminee');

      // Publications
      const { count: publicationsCount } = await supabase
        .from('publication')
        .select('*', { count: 'exact', head: true });

      // Commentaires
      const { count: commentairesCount } = await supabase
        .from('commentaire')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalPatients: patientsCount || 0,
        totalProfessionnels: prosCount || 0,
        totalInterventions: interventionsCount || 0,
        interventionsEnAttente: enAttente || 0,
        interventionsEnCours: enCours || 0,
        interventionsTerminees: terminees || 0,
        publicationsCount: publicationsCount || 0,
        commentairesCount: commentairesCount || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement des statistiques...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Statistiques</Text>
        <TouchableOpacity onPress={loadStats}>
          <Ionicons name="refresh-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Cartes principales */}
      <View style={styles.statsGrid}>
        <StatCard title="Patients" value={stats.totalPatients} icon="people-outline" color="#844567" />
        <StatCard title="Professionnels" value={stats.totalProfessionnels} icon="medkit-outline" color="#5aadbf" />
        <StatCard title="Interventions" value={stats.totalInterventions} icon="document-text-outline" color="#ff8800" />
        <StatCard title="Publications" value={stats.publicationsCount} icon="newspaper-outline" color="#4CAF50" />
      </View>

      {/* Interventions par statut */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>📊 Interventions par statut</Text>
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statusDot, { backgroundColor: '#ff8800' }]} />
          <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>En attente</Text>
          <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsEnAttente}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statusDot, { backgroundColor: '#5aadbf' }]} />
          <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>En cours</Text>
          <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsEnCours}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Terminées</Text>
          <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.interventionsTerminees}</Text>
        </View>
      </View>

      {/* Taux de complétion */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>📈 Taux de complétion</Text>
      <View style={[styles.completionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.completionLabel, { color: colors.text }]}>Interventions terminées</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${stats.totalInterventions > 0 ? (stats.interventionsTerminees / stats.totalInterventions) * 100 : 0}%`,
                backgroundColor: '#4CAF50' 
              }
            ]} 
          />
        </View>
        <Text style={[styles.completionPercent, { color: colors.textSecondary }]}>
          {stats.totalInterventions > 0 ? Math.round((stats.interventionsTerminees / stats.totalInterventions) * 100) : 0}%
        </Text>
      </View>

      {/* Engagement */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>💬 Engagement</Text>
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
          <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Commentaires</Text>
          <Text style={[styles.statItemValue, { color: colors.text }]}>{stats.commentairesCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="heart-outline" size={24} color={colors.primary} />
          <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Moyenne/ pub</Text>
          <Text style={[styles.statItemValue, { color: colors.text }]}>
            {stats.publicationsCount > 0 ? Math.round(stats.commentairesCount / stats.publicationsCount) : 0}
          </Text>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statTitle: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statItem: { alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statItemLabel: { fontSize: 12, marginTop: 4 },
  statItemValue: { fontSize: 20, fontWeight: 'bold' },
  completionCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  completionLabel: { fontSize: 14, marginBottom: 8 },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4 },
  completionPercent: { fontSize: 12, marginTop: 8, textAlign: 'right' },
});