import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function RecapDemandeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const typeSoin = params.typeSoin || '';
  const typeSoinNom = params.typeSoinNom || '';
  const description = params.description ? decodeURIComponent(params.description) : '';
  const latitude = params.latitude ? parseFloat(params.latitude as string) : null;
  const longitude = params.longitude ? parseFloat(params.longitude as string) : null;
  const adressePartagee = params.adresse ? decodeURIComponent(params.adresse as string) : '';
  
  let itemsWithDetails = {};
  if (params.selectedItems) {
    try {
      const decoded = decodeURIComponent(params.selectedItems);
      itemsWithDetails = JSON.parse(decoded);
    } catch (e) {
      console.log('Erreur parsing:', e);
    }
  }

  const itemsList = Object.keys(itemsWithDetails);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const { data: patient, error: patientError } = await supabase
        .from('patient')
        .select('id, adresse')
        .eq('utilisateur_id', user?.id)
        .single();
      if (patientError) throw patientError;

      // Préparer la localisation (priorité à la géolocalisation partagée)
      const localisationFinale = adressePartagee || patient.adresse || 'Adresse non renseignée';

      const { data: intervention, error: interventionError } = await supabase
        .from('intervention')
        .insert({
          patient_id: patient.id,
          date_demande: new Date().toISOString(),
          localisation: localisationFinale,
          latitude: latitude,
          longitude: longitude,
          priorite: 'normale',
          statut: 'en_attente',
          type_intervention: typeSoin,
        })
        .select()
        .single();
      if (interventionError) throw interventionError;

      switch(typeSoin) {
        case 'consultation':
          for (const [item, details] of Object.entries(itemsWithDetails)) {
            let typeId = null;
            const { data: existing } = await supabase
              .from('type_symptome')
              .select('id')
              .eq('nom', item)
              .maybeSingle();
              
            if (existing) {
              typeId = existing.id;
            } else {
              const { data: newType } = await supabase
                .from('type_symptome')
                .insert({ nom: item })
                .select()
                .single();
              if (newType) typeId = newType.id;
            }
            
            if (typeId) {
              const { data: symptome } = await supabase
                .from('symptome')
                .insert({
                  type_symptome_id: typeId,
                  patient_id: patient.id,
                  intensite: details.intensite || null,
                  duree: details.duree || null,
                  description: description || null,
                })
                .select()
                .single();
                
              if (symptome) {
                await supabase
                  .from('consultation')
                  .insert({ intervention_id: intervention.id, symptome_id: symptome.id });
              }
            }
          }
          break;
          
        case 'prelevement':
          await supabase
            .from('prelevement')
            .insert({ intervention_id: intervention.id, type_prelevement: itemsList.join(', '), details: description });
          break;
          
        case 'injection':
          await supabase
            .from('injection')
            .insert({ intervention_id: intervention.id, type_injection: itemsList.join(', '), details: description });
          break;
          
        case 'perfusion':
          await supabase
            .from('perfusion')
            .insert({ intervention_id: intervention.id, type_perfusion: itemsList.join(', '), details: description });
          break;
          
        case 'soin-plaie':
          await supabase
            .from('soin_plaie')
            .insert({ intervention_id: intervention.id, etat_plaie: itemsList.join(', '), details: description });
          break;
          
        case 'surveillance':
          await supabase
            .from('surveillance_post_hospitalisation')
            .insert({ intervention_id: intervention.id, elements_surveiller: itemsList.join(', '), details: description });
          break;
          
        case 'reeducation':
          await supabase
            .from('reeducation')
            .insert({ intervention_id: intervention.id, type_reeducation: itemsList.join(', '), details: description });
          break;
      }

      Alert.alert(
        '✅ Demande envoyée !',
        `📋 ${typeSoinNom}\n📍 Localisation: ${localisationFinale}\n\n✅ Votre demande a été enregistrée.`,
        [{ text: 'OK', onPress: () => router.replace('/patient') }]
      );

    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.primary }]}>Récapitulatif</Text>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>Type d'intervention</Text>
        <Text style={[styles.cardText, { color: colors.text }]}>{typeSoinNom}</Text>
      </View>

      {/* Affichage de la localisation */}
      {(adressePartagee || latitude) && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>📍 Localisation</Text>
          <Text style={[styles.cardText, { color: colors.text }]}>
            {adressePartagee || 'Position partagée'}
          </Text>
          {latitude && longitude && (
            <Text style={[styles.coordText, { color: colors.textSecondary }]}>
              📌 {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
          )}
        </View>
      )}

      {itemsList.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            {typeSoin === 'consultation' ? 'Symptômes' : 'Éléments sélectionnés'}
          </Text>
          {itemsList.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text style={[styles.itemName, { color: colors.text }]}>• {item}</Text>
              {typeSoin === 'consultation' && itemsWithDetails[item] && (
                <View style={styles.itemDetails}>
                  {itemsWithDetails[item].intensite && (
                    <Text style={[styles.itemDetailText, { color: colors.textSecondary }]}>
                      Intensité: {itemsWithDetails[item].intensite}
                    </Text>
                  )}
                  {itemsWithDetails[item].duree && (
                    <Text style={[styles.itemDetailText, { color: colors.textSecondary }]}>
                      Durée: {itemsWithDetails[item].duree}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {description ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Description</Text>
          <Text style={[styles.cardText, { color: colors.text }]}>{description}</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? '#999' : '#5aadbf' }]} 
        onPress={handleConfirm} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Envoi en cours...' : 'Confirmer la demande'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardText: { fontSize: 14 },
  coordText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  itemContainer: { marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  itemDetails: { flexDirection: 'row', gap: 12, marginLeft: 12 },
  itemDetailText: { fontSize: 12 },
  button: { paddingVertical: 14, borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});