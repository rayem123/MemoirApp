import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function ResultatsInterventionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [resultats, setResultats] = useState<any>(null);
  const [typeIntervention, setTypeIntervention] = useState('');

  useEffect(() => {
    if (id) {
      loadResultats();
    }
  }, [id]);

  const loadResultats = async () => {
    setLoading(true);
    
    // Récupérer le type d'intervention
    const { data: intervention } = await supabase
      .from('intervention')
      .select('type_intervention')
      .eq('id', id)
      .single();

    if (intervention) {
      setTypeIntervention(intervention.type_intervention);
      
      let resultatData = null;
      
      switch(intervention.type_intervention) {
        case 'consultation':
          const { data: consult } = await supabase
            .from('consultation')
            .select(`
              diagnostic,
              compte_rendu,
              symptome:symptome_id (
                intensite,
                duree,
                description,
                type_symptome:type_symptome_id (nom)
              )
            `)
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = consult;
          break;
        case 'prelevement':
          const { data: prelev } = await supabase
            .from('prelevement')
            .select('type_prelevement, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = prelev;
          break;
        case 'injection':
          const { data: inj } = await supabase
            .from('injection')
            .select('type_injection, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = inj;
          break;
        case 'perfusion':
          const { data: perf } = await supabase
            .from('perfusion')
            .select('type_perfusion, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = perf;
          break;
        case 'soin-plaie':
          const { data: plaie } = await supabase
            .from('soin_plaie')
            .select('etat_plaie, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = plaie;
          break;
        case 'surveillance':
          const { data: surv } = await supabase
            .from('surveillance_post_hospitalisation')
            .select('elements_surveiller, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = surv;
          break;
        case 'reeducation':
          const { data: reed } = await supabase
            .from('reeducation')
            .select('type_reeducation, details')
            .eq('intervention_id', id)
            .maybeSingle();
          resultatData = reed;
          break;
      }
      
      setResultats(resultatData);
    }
    
    setLoading(false);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'consultation': 'Consultation médicale',
      'soin-plaie': 'Soin de plaie',
      'injection': 'Injection',
      'perfusion': 'Perfusion',
      'prelevement': 'Prélèvement',
      'surveillance': 'Surveillance',
      'reeducation': 'Rééducation'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.primary }]}>📋 Résultats</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getTypeLabel(typeIntervention)}</Text>

      {!resultats ? (
        <View style={styles.noDataContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucun résultat disponible</Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {typeIntervention === 'consultation' && (
            <>
              {resultats.symptome && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>🩺 Symptômes</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>
                    {resultats.symptome.type_symptome?.nom}
                  </Text>
                  {resultats.symptome.intensite && (
                    <Text style={[styles.resultTextSmall, { color: colors.textSecondary }]}>
                      Intensité: {resultats.symptome.intensite}
                    </Text>
                  )}
                  {resultats.symptome.duree && (
                    <Text style={[styles.resultTextSmall, { color: colors.textSecondary }]}>
                      Durée: {resultats.symptome.duree}
                    </Text>
                  )}
                  {resultats.symptome.description && (
                    <Text style={[styles.resultTextSmall, { color: colors.textSecondary }]}>
                      Description: {resultats.symptome.description}
                    </Text>
                  )}
                </View>
              )}
              {resultats.diagnostic && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>🩺 Diagnostic</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.diagnostic}</Text>
                </View>
              )}
              {resultats.compte_rendu && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📄 Compte rendu</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.compte_rendu}</Text>
                </View>
              )}
            </>
          )}

          {typeIntervention === 'prelevement' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>🩸 Type de prélèvement</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.type_prelevement || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}

          {typeIntervention === 'injection' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>💉 Type d'injection</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.type_injection || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}

          {typeIntervention === 'soin-plaie' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>🩹 État de la plaie</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.etat_plaie || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}

          {typeIntervention === 'perfusion' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>💧 Type de perfusion</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.type_perfusion || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}

          {typeIntervention === 'surveillance' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>👁️ Éléments surveillés</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.elements_surveiller || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}

          {typeIntervention === 'reeducation' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>🏋️ Type de rééducation</Text>
              <Text style={[styles.resultText, { color: colors.text }]}>{resultats.type_reeducation || 'Non spécifié'}</Text>
              {resultats.details && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>📝 Détails</Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>{resultats.details}</Text>
                </>
              )}
            </>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  card: { borderRadius: 12, padding: 20, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  resultText: { fontSize: 14, marginBottom: 4 },
  resultTextSmall: { fontSize: 12, marginBottom: 2 },
  noDataContainer: { alignItems: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  backToCarnetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20, marginBottom: 30, gap: 8 },
  backToCarnetText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});