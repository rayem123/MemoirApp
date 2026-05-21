import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createNotification, getAdminId } from '../lib/notificationService';

type InterventionItem = {
  id: string;
  date_demande: string;
  type_intervention: string;
  localisation: string;
  priorite: string;
  statut: string;
  patient_nom: string;
  patient_prenom: string;
  patient_id: string;
  patient_adresse: string;
  patient_telephone: string;
  id_machine?: string;
  quantite_utilisee?: number;
  materiel_nom?: string;
  materiel_type?: string;
};

export default function ProInterventionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proId, setProId] = useState<string | null>(null);
  
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [existingDetails, setExistingDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadProData();
      }
    }, [user])
  );

  const loadProData = async () => {
    setLoading(true);
    
    try {
      const { data: proData, error: proError } = await supabase
        .from('professionnel_sante')
        .select('id')
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (proError || !proData) {
        setInterventions([]);
        setLoading(false);
        return;
      }

      setProId(proData.id);
      await loadInterventions(proData.id);
    } catch (error) {
      setLoading(false);
    }
  };

  const loadInterventions = async (professionnelId: string) => {
    try {
      const { data, error } = await supabase
        .from('intervention')
        .select(`
          id,
          date_demande,
          type_intervention,
          localisation,
          priorite,
          statut,
          id_machine,
          quantite_utilisee,
          patient:patient_id (
            id,
            adresse,
            utilisateur:utilisateur_id (
              nom,
              prenom,
              telephone
            )
          )
        `)
        .eq('professionnel_id', professionnelId)
        .order('date_demande', { ascending: false });

      if (error) {
        setInterventions([]);
        return;
      }

      if (data && data.length > 0) {
        const formatted = await Promise.all(data.map(async (i: any) => {
          let materielNom = '';
          let materielType = '';
          
          if (i.id_machine) {
            const { data: materiel } = await supabase
              .from('materiel_medical')
              .select('nom_m')
              .eq('id', i.id_machine)
              .maybeSingle();
            if (materiel) {
              materielNom = materiel.nom_m;
              materielType = 'reutilisable';
            }
          }
          
          return {
            id: i.id,
            date_demande: new Date(i.date_demande).toLocaleDateString(),
            type_intervention: i.type_intervention || 'Non spécifié',
            localisation: i.localisation,
            priorite: i.priorite,
            statut: i.statut,
            patient_id: i.patient?.id || '',
            patient_nom: i.patient?.utilisateur?.nom || 'Inconnu',
            patient_prenom: i.patient?.utilisateur?.prenom || 'Inconnu',
            patient_adresse: i.patient?.adresse || 'Non renseignée',
            patient_telephone: i.patient?.utilisateur?.telephone || 'Non renseigné',
            id_machine: i.id_machine,
            quantite_utilisee: i.quantite_utilisee,
            materiel_nom: materielNom,
            materiel_type: materielType
          };
        }));
        setInterventions(formatted);
      } else {
        setInterventions([]);
      }
    } catch (error) {
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (proId) {
      await loadInterventions(proId);
    } else {
      await loadProData();
    }
    setRefreshing(false);
  };

  const getTableName = (type: string) => {
    const tables: Record<string, string> = {
      'consultation': 'consultation',
      'soin-plaie': 'soin_plaie',
      'injection': 'injection',
      'perfusion': 'perfusion',
      'prelevement': 'prelevement',
      'surveillance': 'surveillance_post_hospitalisation',
      'reeducation': 'reeducation'
    };
    return tables[type] || '';
  };

  const loadExistingDetails = async (interventionId: string, type: string) => {
    const tableName = getTableName(type);
    if (!tableName) return null;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('intervention_id', interventionId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
    return null;
  };

  const openTerminerModal = async (intervention: InterventionItem) => {
    setSelectedIntervention(intervention);
    
    const existing = await loadExistingDetails(intervention.id, intervention.type_intervention);
    setExistingDetails(existing);
    
    if (existing) {
      setFormData(existing);
    } else {
      setFormData({});
    }
    
    setShowResultModal(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = (type: string, data: any) => {
    switch(type) {
      case 'consultation':
        if (!data.motif && !data.diagnostic && !data.compte_rendu && !data.image_radios) {
          Alert.alert('Champs requis', 'Veuillez saisir au moins un élément (motif, diagnostic, compte rendu ou image radiologique)');
          return false;
        }
        break;
      case 'injection':
        if (!data.medicament || !data.dose || !data.lieu_injection || !data.reaction_observee) {
          Alert.alert('Champs requis', 'Médicament, dose, lieu d\'injection et réaction sont obligatoires');
          return false;
        }
        break;
      case 'perfusion':
        if (!data.volume || !data.produit_perfuse || !data.debit || !data.duree) {
          Alert.alert('Champs requis', 'Volume, produit perfusé, débit et durée sont obligatoires');
          return false;
        }
        break;
      case 'prelevement':
        if (!data.date_analyse) {
          Alert.alert('Champs requis', 'La date d\'analyse est obligatoire');
          return false;
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data.date_analyse)) {
          Alert.alert('Format invalide', 'La date doit être au format AAAA-MM-JJ (ex: 2024-01-15)');
          return false;
        }
        break;
      case 'reeducation':
        if (!data.nombre_seances || !data.duree_seance || !data.progression) {
          Alert.alert('Champs requis', 'Nombre de séances, durée de séance et progression sont obligatoires');
          return false;
        }
        break;
      case 'soin-plaie':
        if (!data.taille || !data.profondeur || !data.type_pansement) {
          Alert.alert('Champs requis', 'Taille, profondeur et type de pansement sont obligatoires');
          return false;
        }
        break;
      case 'surveillance':
        break;
    }
    return true;
  };

  const saveResultsAndFinish = async () => {
    if (!selectedIntervention) return;
    
    if (!validateForm(selectedIntervention.type_intervention, formData)) return;
    
    setSaving(true);
    
    try {
      const tableName = getTableName(selectedIntervention.type_intervention);
      
      if (!tableName) {
        Alert.alert('Erreur', 'Type d\'intervention non reconnu');
        return;
      }

      // 1. Sauvegarder les résultats
      let result;
      if (existingDetails?.id) {
        result = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', existingDetails.id);
      } else {
        result = await supabase
          .from(tableName)
          .insert({
            intervention_id: selectedIntervention.id,
            ...formData
          });
      }

      const { error: resultError } = result;
      if (resultError) throw resultError;

      // 2. Mettre à jour le statut de l'intervention
      const { error: statusError } = await supabase
        .from('intervention')
        .update({ 
          statut: 'terminee',
          date_fin: new Date().toISOString()
        })
        .eq('id', selectedIntervention.id);

      if (statusError) {
        const { error: statusError2 } = await supabase
          .from('intervention')
          .update({ statut: 'terminee' })
          .eq('id', selectedIntervention.id);
        if (statusError2) throw statusError2;
      }

      // 3. Rendre le professionnel disponible
      if (proId) {
        await supabase
          .from('professionnel_sante')
          .update({ disponibilite: 'disponible' })
          .eq('id', proId);
      }

      // 4. NOTIFICATIONS
      const adminId = await getAdminId();
      
      // Notification à l'admin
      if (adminId) {
        await createNotification(
          adminId,
          '✅ Intervention terminée',
          `L'intervention pour ${selectedIntervention.patient_prenom} ${selectedIntervention.patient_nom} (${getTypeLabel(selectedIntervention.type_intervention)}) est terminée.`,
          'intervention_terminee',
          { intervention_id: selectedIntervention.id }
        );
      }
      
      // Notification au patient
      await createNotification(
        selectedIntervention.patient_id,
        '✅ Intervention terminée',
        `Votre intervention est terminée. Vous pouvez consulter les résultats dans l'application.`,
        'intervention_terminee_patient',
        { intervention_id: selectedIntervention.id }
      );

      Alert.alert('Succès', 'Intervention terminée avec succès');
      setShowResultModal(false);
      setSelectedIntervention(null);
      setFormData({});
      setExistingDetails(null);
      
      onRefresh();
      
    } catch (error: any) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message || 'Impossible de terminer l\'intervention');
    } finally {
      setSaving(false);
    }
  };

  const handleAccepter = async (id: string, intervention: InterventionItem) => {
    const { error } = await supabase
      .from('intervention')
      .update({ statut: 'en_cours' })
      .eq('id', id);
    
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      // NOTIFICATIONS
      const adminId = await getAdminId();
      
      // Notification à l'admin
      if (adminId) {
        await createNotification(
          adminId,
          '✅ Intervention acceptée',
          `${intervention.patient_prenom} ${intervention.patient_nom} a accepté l'intervention.`,
          'intervention_acceptee',
          { intervention_id: id }
        );
      }
      
      // Notification au patient
      await createNotification(
        intervention.patient_id,
        '✅ Intervention acceptée',
        `Votre intervention a été acceptée par ${intervention.patient_prenom} ${intervention.patient_nom}.`,
        'intervention_acceptee_patient',
        { intervention_id: id }
      );
      
      Alert.alert('✅ Succès', 'Intervention acceptée');
      onRefresh();
    }
  };

  const handleRefuser = async (id: string, intervention: InterventionItem) => {
    Alert.alert(
      'Refus',
      'Êtes-vous sûr de vouloir refuser cette intervention ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            const { error } = await supabase
              .from('intervention')
              .update({ statut: 'refusee' })
              .eq('id', id);
            
            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              // NOTIFICATIONS
              const adminId = await getAdminId();
              
              // Notification à l'admin
              if (adminId) {
                await createNotification(
                  adminId,
                  '❌ Intervention refusée',
                  `${intervention.patient_prenom} ${intervention.patient_nom} a refusé l'intervention.`,
                  'intervention_refusee',
                  { intervention_id: id }
                );
              }
              
              // Notification au patient
              await createNotification(
                intervention.patient_id,
                '❌ Intervention refusée',
                `Votre intervention a été refusée. Nous cherchons un autre professionnel.`,
                'intervention_refusee_patient',
                { intervention_id: id }
              );
              
              Alert.alert('Succès', 'Intervention refusée');
              onRefresh();
            }
          }
        }
      ]
    );
  };

  const voirCarnetPatient = (patientId: string, nom: string, prenom: string) => {
    router.push({
      pathname: '/pro/carnet_patient',
      params: { 
        patientId: patientId, 
        patientNom: nom, 
        patientPrenom: prenom 
      }
    });
  };

  const voirDetailsIntervention = (intervention: InterventionItem) => {
    router.push({
      pathname: '/pro/intervention-details',
      params: { 
        id: intervention.id, 
        type: intervention.type_intervention,
        patientId: intervention.patient_id,
        patientNom: intervention.patient_nom,
        patientPrenom: intervention.patient_prenom,
        materielNom: intervention.materiel_nom || '',
        materielType: intervention.materiel_type || '',
        quantiteUtilisee: intervention.quantite_utilisee?.toString() || '0'
      }
    });
  };

  // RENDER FORMULAIRES PAR TYPE
  const renderConsultationForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📝 Motif de consultation</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.motif || ''}
          onChangeText={(text) => handleInputChange('motif', text)}
          placeholder="Motif de la consultation"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>🩺 Diagnostic</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.diagnostic || ''}
          onChangeText={(text) => handleInputChange('diagnostic', text)}
          placeholder="Diagnostic établi"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📄 Compte rendu</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.compte_rendu || ''}
          onChangeText={(text) => handleInputChange('compte_rendu', text)}
          placeholder="Détails de la consultation"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>🖼️ Image radiologique (URL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.image_radios || ''}
          onChangeText={(text) => handleInputChange('image_radios', text)}
          placeholder="Lien de l'image radiologique"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <Text style={[styles.optionalText, { color: colors.textSecondary }]}>* Au moins un champ est requis</Text>
    </>
  );

  const renderInjectionForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>💊 Médicament <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.medicament || ''}
          onChangeText={(text) => handleInputChange('medicament', text)}
          placeholder="Nom du médicament"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>💊 Dose <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.dose || ''}
          onChangeText={(text) => handleInputChange('dose', text)}
          placeholder="Ex: 500mg"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📍 Lieu d'injection <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.lieu_injection || ''}
          onChangeText={(text) => handleInputChange('lieu_injection', text)}
          placeholder="Ex: Bras droit, fesse, cuisse..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>⚠️ Réaction observée <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.reaction_observee || ''}
          onChangeText={(text) => handleInputChange('reaction_observee', text)}
          placeholder="Réactions allergiques, effets secondaires..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  const renderPerfusionForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>💧 Volume (ml) <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.volume || ''}
          onChangeText={(text) => handleInputChange('volume', text)}
          placeholder="Ex: 500"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>💊 Produit perfusé <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.produit_perfuse || ''}
          onChangeText={(text) => handleInputChange('produit_perfuse', text)}
          placeholder="Nom du produit/médicament"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>⚡ Débit (ml/h) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.debit || ''}
            onChangeText={(text) => handleInputChange('debit', text)}
            placeholder="Ex: 125"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>⏱️ Durée <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.duree || ''}
            onChangeText={(text) => handleInputChange('duree', text)}
            placeholder="Ex: 2 heures"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </>
  );

  const renderPrelevementForm = () => {
    const formatDate = (text: string) => {
      const cleaned = text.replace(/\D/g, '');
      if (cleaned.length <= 4) {
        return cleaned;
      } else if (cleaned.length <= 6) {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}`;
      } else {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
      }
    };

    const handleDateChange = (text: string) => {
      const formatted = formatDate(text);
      handleInputChange('date_analyse', formatted);
    };

    return (
      <>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>🩸 Glycémie</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.glycemie || ''}
              onChangeText={(text) => handleInputChange('glycemie', text)}
              placeholder="g/L"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>🩸 Cholestérol</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.cholesterol || ''}
              onChangeText={(text) => handleInputChange('cholesterol', text)}
              placeholder="g/L"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>🩸 Triglycérides</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.triglycerides || ''}
              onChangeText={(text) => handleInputChange('triglycerides', text)}
              placeholder="g/L"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: colors.text }]}>📅 Date d'analyse <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={formData.date_analyse || ''}
              onChangeText={handleDateChange}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>📝 Résultats d'analyse</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.resultats || ''}
            onChangeText={(text) => handleInputChange('resultats', text)}
            placeholder="Description détaillée des résultats d'analyse..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>
        <Text style={[styles.optionalText, { color: colors.textSecondary }]}>
          * Format de date: AAAA-MM-JJ (ex: 2024-01-15)
        </Text>
      </>
    );
  };

  const renderReeducationForm = () => (
    <>
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>📅 Nombre de séances <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.nombre_seances || ''}
            onChangeText={(text) => handleInputChange('nombre_seances', text)}
            placeholder="Ex: 10"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>⏱️ Durée par séance <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.duree_seance || ''}
            onChangeText={(text) => handleInputChange('duree_seance', text)}
            placeholder="Ex: 45 min"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📈 Progression <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.progression || ''}
          onChangeText={(text) => handleInputChange('progression', text)}
          placeholder="Évolution du patient, objectifs atteints..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  const renderSoinPlaieForm = () => (
    <>
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>📏 Taille (cm) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.taille || ''}
            onChangeText={(text) => handleInputChange('taille', text)}
            placeholder="Ex: 5"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, { color: colors.text }]}>📏 Profondeur <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={formData.profondeur || ''}
            onChangeText={(text) => handleInputChange('profondeur', text)}
            placeholder="Ex: superficielle, profonde..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>🩹 Type de pansement <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.type_pansement || ''}
          onChangeText={(text) => handleInputChange('type_pansement', text)}
          placeholder="Ex: simple, compressif, hydrogel..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📝 Détails du soin</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.details || ''}
          onChangeText={(text) => handleInputChange('details', text)}
          placeholder="Observations, recommandations..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  const renderSurveillanceForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📅 Date de sortie d'hospitalisation</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.date_sortie_hospital || ''}
          onChangeText={(text) => handleInputChange('date_sortie_hospital', text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>🩺 Pathologie</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.pathologie || ''}
          onChangeText={(text) => handleInputChange('pathologie', text)}
          placeholder="Pathologie principale"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>💊 Traitement en cours</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.traitement_en_cours || ''}
          onChangeText={(text) => handleInputChange('traitement_en_cours', text)}
          placeholder="Médicaments et traitements actuels"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📈 Évolution</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.evolution || ''}
          onChangeText={(text) => handleInputChange('evolution', text)}
          placeholder="Évolution de l'état de santé"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>
    </>
  );

  const renderFormByType = (type: string) => {
    switch(type) {
      case 'consultation': return renderConsultationForm();
      case 'injection': return renderInjectionForm();
      case 'perfusion': return renderPerfusionForm();
      case 'prelevement': return renderPrelevementForm();
      case 'reeducation': return renderReeducationForm();
      case 'soin-plaie': return renderSoinPlaieForm();
      case 'surveillance': return renderSurveillanceForm();
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'consultation': 'Consultation médicale',
      'soin-plaie': 'Soin de plaie',
      'injection': 'Injection',
      'perfusion': 'Perfusion',
      'prelevement': 'Prélèvement',
      'surveillance': 'Surveillance post-hospitalisation',
      'reeducation': 'Rééducation'
    };
    return types[type] || type;
  };

  const getStatutInfo = (statut: string) => {
    switch(statut) {
      case 'affectee': return { label: 'À traiter', color: '#ff8800', icon: 'time-outline' };
      case 'en_cours': return { label: 'En cours', color: '#5aadbf', icon: 'play-outline' };
      case 'terminee': return { label: 'Terminée', color: '#4CAF50', icon: 'checkmark-done-outline' };
      case 'refusee': return { label: 'Refusée', color: '#ff4444', icon: 'close-circle-outline' };
      default: return { label: statut, color: '#999', icon: 'help-outline' };
    }
  };

  const getMaterielIcon = (type: string) => {
    return type === 'reutilisable' ? '🔄' : '🗑️';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 12 }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Text style={[styles.title, { color: colors.primary }]}>Mes interventions</Text>
        
        {interventions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune intervention</Text>
          </View>
        ) : (
          interventions.map(item => {
            const statutInfo = getStatutInfo(item.statut);
            const isExpanded = expandedId === item.id;
            const estTerminee = item.statut === 'terminee';
            
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                <TouchableOpacity 
                  style={styles.cardHeader} 
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={styles.cardLeft}>
                    <Ionicons name={statutInfo.icon as any} size={20} color={statutInfo.color} />
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {getTypeLabel(item.type_intervention)}
                      </Text>
                      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                        {item.date_demande}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.statutBadge, { backgroundColor: statutInfo.color }]}>
                      <Text style={styles.statutText}>{statutInfo.label}</Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                    <Text style={[styles.info, { color: colors.textSecondary }]}>
                      👤 Patient: {item.patient_prenom} {item.patient_nom}
                    </Text>
                    <Text style={[styles.info, { color: colors.textSecondary }]}>
                      📍 Adresse: {item.localisation}
                    </Text>
                    <Text style={[styles.info, { color: colors.textSecondary }]}>
                      📞 Tél: {item.patient_telephone}
                    </Text>
                    <Text style={[styles.info, { color: colors.textSecondary }]}>
                      ⚡ Priorité: {item.priorite}
                    </Text>
                    
                    {item.materiel_nom && (
                      <View style={[styles.materielContainer, { borderColor: colors.border }]}>
                        <Text style={[styles.materielLabel, { color: colors.primary }]}>📦 Matériel associé :</Text>
                        <View style={styles.materielRow}>
                          <Text style={[styles.materielNom, { color: colors.text }]}>{item.materiel_nom}</Text>
                          <Text style={[styles.materielType, { color: item.materiel_type === 'reutilisable' ? '#4CAF50' : '#ff8800' }]}>
                            {getMaterielIcon(item.materiel_type || '')} {item.materiel_type === 'reutilisable' ? 'Réutilisable' : 'Jetable'}
                          </Text>
                        </View>
                        {item.quantite_utilisee && item.quantite_utilisee > 0 && (
                          <Text style={[styles.materielQuantite, { color: colors.textSecondary }]}>
                            Quantité utilisée: {item.quantite_utilisee}
                          </Text>
                        )}
                      </View>
                    )}
                    
                    <View style={styles.buttonContainer}>
                      {item.statut === 'affectee' && (
                        <>
                          <TouchableOpacity 
                            style={[styles.button, styles.accepter]} 
                            onPress={() => handleAccepter(item.id, item)}
                          >
                            <Ionicons name="checkmark-outline" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Accepter</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.button, styles.refuser]} 
                            onPress={() => handleRefuser(item.id, item)}
                          >
                            <Ionicons name="close-outline" size={18} color="#fff" />
                            <Text style={styles.buttonText}>Refuser</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {item.statut === 'en_cours' && (
                        <TouchableOpacity 
                          style={[styles.button, styles.terminer]} 
                          onPress={() => openTerminerModal(item)}
                        >
                          <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Terminer l'intervention</Text>
                        </TouchableOpacity>
                      )}
                      {estTerminee && (
                        <TouchableOpacity 
                          style={[styles.button, styles.detailsButton]} 
                          onPress={() => voirDetailsIntervention(item)}
                        >
                          <Ionicons name="document-text-outline" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Voir les détails</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {item.statut !== 'terminee' && (
                      <TouchableOpacity 
                        style={[styles.carnetButton, { backgroundColor: '#5aadbf', marginTop: 10 }]} 
                        onPress={() => voirCarnetPatient(item.patient_id, item.patient_nom, item.patient_prenom)}
                      >
                        <Ionicons name="heart-outline" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Carnet de santé du patient</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal de saisie des résultats */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                Saisir les résultats
              </Text>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {selectedIntervention && getTypeLabel(selectedIntervention.type_intervention)}
            </Text>
            
            <ScrollView style={styles.modalScroll}>
              {selectedIntervention && renderFormByType(selectedIntervention.type_intervention)}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowResultModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveResultsAndFinish}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Terminer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
  card: { borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardBody: { padding: 15, borderTopWidth: 1 },
  info: { fontSize: 14, marginBottom: 6 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', marginTop: 12, gap: 10 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  accepter: { backgroundColor: '#4CAF50' },
  refuser: { backgroundColor: '#ff4444' },
  terminer: { backgroundColor: '#844567' },
  detailsButton: { backgroundColor: '#5aadbf' },
  buttonText: { color: '#fff', fontWeight: '600' },
  carnetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  materielContainer: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, gap: 6 },
  materielLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  materielRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  materielNom: { fontSize: 14, fontWeight: '500', flex: 1 },
  materielType: { fontSize: 12, marginLeft: 8 },
  materielQuantite: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { margin: 20, borderRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 8 },
  modalScroll: { padding: 16, maxHeight: '70%' },
  modalButtons: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { borderWidth: 1 },
  saveButton: {},
  cancelButtonText: { fontWeight: '500' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  required: { color: '#f44336' },
  optionalText: { fontSize: 12, fontStyle: 'italic', marginTop: -8, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
});