import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function InterventionDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id, type, patientId, patientNom, patientPrenom, materielNom, materielType, quantiteUtilisee } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [interventionStatus, setInterventionStatus] = useState<string>('en_attente');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultatsExistants, setResultatsExistants] = useState(false);

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (id && type) {
      loadDetails();
      loadInterventionStatus();
    }
  }, [id, type]);

  const loadInterventionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('intervention')
        .select('statut')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setInterventionStatus(data.statut);
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
    }
  };

  const loadDetails = async () => {
    setLoading(true);
    
    try {
      let tableName = getTableName();
      
      if (tableName) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('intervention_id', id)
          .maybeSingle();
        
        if (!error && data) {
          setDetails(data);
          setFormData(data);
          setResultatsExistants(true);
        } else {
          setResultatsExistants(false);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTableName = () => {
    const tables: Record<string, string> = {
      'consultation': 'consultation',
      'soin-plaie': 'soin_plaie',
      'injection': 'injection',
      'perfusion': 'perfusion',
      'prelevement': 'prelevement',
      'surveillance': 'surveillance_post_hospitalisation',
      'reeducation': 'reeducation'
    };
    return tables[type as string] || '';
  };

  const getTypeLabel = () => {
    const types: Record<string, string> = {
      'consultation': 'Consultation médicale',
      'soin-plaie': 'Soin de plaie',
      'injection': 'Injection',
      'perfusion': 'Perfusion',
      'prelevement': 'Prélèvement',
      'surveillance': 'Surveillance post-hospitalisation',
      'reeducation': 'Rééducation'
    };
    return types[type as string] || type as string;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    switch(type) {
      case 'consultation':
        if (!formData.motif && !formData.diagnostic && !formData.compte_rendu && !formData.image_radios) {
          Alert.alert('Champs requis', 'Veuillez saisir au moins un élément (motif, diagnostic, compte rendu ou image radiologique)');
          return false;
        }
        break;
      case 'injection':
        if (!formData.medicament || !formData.dose || !formData.lieu_injection || !formData.reaction) {
          Alert.alert('Champs requis', 'Médicament, dose, lieu d\'injection et réaction sont obligatoires');
          return false;
        }
        break;
      case 'perfusion':
        if (!formData.volume || !formData.produit_perfuse || !formData.debit || !formData.duree) {
          Alert.alert('Champs requis', 'Volume, produit perfusé, débit et durée sont obligatoires');
          return false;
        }
        break;
      case 'prelevement':
        if (!formData.date_analyse) {
          Alert.alert('Champs requis', 'La date d\'analyse est obligatoire');
          return false;
        }
        break;
      case 'reeducation':
        if (!formData.nombre_seances || !formData.duree_seance || !formData.progression) {
          Alert.alert('Champs requis', 'Nombre de séances, durée de séance et progression sont obligatoires');
          return false;
        }
        break;
      case 'soin-plaie':
        if (!formData.taille || !formData.profondeur || !formData.type_pansement) {
          Alert.alert('Champs requis', 'Taille, profondeur et type de pansement sont obligatoires');
          return false;
        }
        break;
    }
    return true;
  };

  const saveResultsAndFinish = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      const tableName = getTableName();
      
      if (!tableName) {
        Alert.alert('Erreur', 'Type d\'intervention non reconnu');
        return;
      }

      // 1. Sauvegarder les résultats
      let result;
      if (details?.id) {
        result = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', details.id);
      } else {
        result = await supabase
          .from(tableName)
          .insert({
            intervention_id: id,
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
        .eq('id', id);

      if (statusError) throw statusError;

      // 3. Rendre le professionnel disponible s'il existe
      const { data: interventionData } = await supabase
        .from('intervention')
        .select('professionnel_id')
        .eq('id', id)
        .single();

      if (interventionData?.professionnel_id) {
        await supabase
          .from('professionnel_sante')
          .update({ disponibilite: 'disponible' })
          .eq('id', interventionData.professionnel_id);
      }

      Alert.alert('Succès', 'Intervention terminée avec succès');
      setShowResultModal(false);
      
      // Recharger les données
      await loadDetails();
      await loadInterventionStatus();
      setResultatsExistants(true);
      
    } catch (error: any) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', error.message || 'Impossible de terminer l\'intervention');
    } finally {
      setSaving(false);
    }
  };

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
          value={formData.reaction || ''}
          onChangeText={(text) => handleInputChange('reaction', text)}
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

  const renderPrelevementForm = () => (
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
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>🩸 Triglycérides</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.triglycerides || ''}
          onChangeText={(text) => handleInputChange('triglycerides', text)}
          placeholder="g/L"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📝 Résultats d'analyse</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.resultats || ''}
          onChangeText={(text) => handleInputChange('resultats', text)}
          placeholder="Description détaillée des résultats..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>📅 Date d'analyse <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={formData.date_analyse || ''}
          onChangeText={(text) => handleInputChange('date_analyse', text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    </>
  );

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

  const renderFormByType = () => {
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

  const renderResultatsExistants = () => {
    if (!details) return (
      <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucun résultat enregistré</Text>
    );

    switch(type) {
      case 'consultation':
        return (
          <View style={styles.resultsContainer}>
            {details.motif && <Text style={[styles.resultText, { color: colors.text }]}>📝 Motif: {details.motif}</Text>}
            {details.diagnostic && <Text style={[styles.resultText, { color: colors.text }]}>🩺 Diagnostic: {details.diagnostic}</Text>}
            {details.compte_rendu && <Text style={[styles.resultText, { color: colors.text }]}>📄 Compte rendu: {details.compte_rendu}</Text>}
            {details.image_radios && <Text style={[styles.resultText, { color: colors.text }]}>🖼️ Image: {details.image_radios}</Text>}
            {!details.motif && !details.diagnostic && !details.compte_rendu && !details.image_radios && (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucun résultat détaillé</Text>
            )}
          </View>
        );
      case 'injection':
        return (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultText, { color: colors.text }]}>💊 Médicament: {details.medicament || 'Non spécifié'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>💊 Dose: {details.dose || 'Non spécifiée'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>📍 Lieu: {details.lieu_injection || 'Non spécifié'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>⚠️ Réaction: {details.reaction || 'Aucune'}</Text>
          </View>
        );
      case 'perfusion':
        return (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultText, { color: colors.text }]}>💧 Volume: {details.volume || 'Non spécifié'} ml</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>💊 Produit: {details.produit_perfuse || 'Non spécifié'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>⚡ Débit: {details.debit || 'Non spécifié'} ml/h</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>⏱️ Durée: {details.duree || 'Non spécifiée'}</Text>
          </View>
        );
      case 'prelevement':
        return (
          <View style={styles.resultsContainer}>
            {details.glycemie && <Text style={[styles.resultText, { color: colors.text }]}>🩸 Glycémie: {details.glycemie} g/L</Text>}
            {details.cholesterol && <Text style={[styles.resultText, { color: colors.text }]}>🩸 Cholestérol: {details.cholesterol} g/L</Text>}
            {details.triglycerides && <Text style={[styles.resultText, { color: colors.text }]}>🩸 Triglycérides: {details.triglycerides} g/L</Text>}
            {details.resultats && <Text style={[styles.resultText, { color: colors.text }]}>📝 Résultats: {details.resultats}</Text>}
            <Text style={[styles.resultText, { color: colors.text }]}>📅 Date: {details.date_analyse || 'Non spécifiée'}</Text>
            {!details.glycemie && !details.cholesterol && !details.triglycerides && !details.resultats && (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Seule la date d'analyse est renseignée</Text>
            )}
          </View>
        );
      case 'reeducation':
        return (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultText, { color: colors.text }]}>📅 Séances: {details.nombre_seances || 'Non spécifié'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>⏱️ Durée: {details.duree_seance || 'Non spécifiée'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>📈 Progression: {details.progression || 'Non spécifiée'}</Text>
          </View>
        );
      case 'soin-plaie':
        return (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultText, { color: colors.text }]}>📏 Taille: {details.taille || 'Non spécifiée'} cm</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>📏 Profondeur: {details.profondeur || 'Non spécifiée'}</Text>
            <Text style={[styles.resultText, { color: colors.text }]}>🩹 Pansement: {details.type_pansement || 'Non spécifié'}</Text>
            {details.details && <Text style={[styles.resultText, { color: colors.text }]}>📝 Détails: {details.details}</Text>}
          </View>
        );
      case 'surveillance':
        return (
          <View style={styles.resultsContainer}>
            {details.date_sortie_hospital && <Text style={[styles.resultText, { color: colors.text }]}>📅 Sortie: {details.date_sortie_hospital}</Text>}
            {details.pathologie && <Text style={[styles.resultText, { color: colors.text }]}>🩺 Pathologie: {details.pathologie}</Text>}
            {details.traitement_en_cours && <Text style={[styles.resultText, { color: colors.text }]}>💊 Traitement: {details.traitement_en_cours}</Text>}
            {details.evolution && <Text style={[styles.resultText, { color: colors.text }]}>📈 Évolution: {details.evolution}</Text>}
            {!details.date_sortie_hospital && !details.pathologie && !details.traitement_en_cours && !details.evolution && (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucun résultat enregistré</Text>
            )}
          </View>
        );
      default:
        return (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucun résultat disponible</Text>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement des détails...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>📋 Détails de l'intervention</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getTypeLabel()}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: interventionStatus === 'terminee' ? '#4CAF50' : '#FF9800' 
        }]}>
          <Text style={styles.statusText}>
            {interventionStatus === 'terminee' ? '✓ Terminée' : interventionStatus === 'en_cours' ? '⏳ En cours' : '📋 En attente'}
          </Text>
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.infoCardTitle, { color: colors.primary }]}>👤 Patient</Text>
        <Text style={[styles.infoCardText, { color: colors.text }]}>{patientPrenom} {patientNom}</Text>
      </View>

      {materielNom && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoCardTitle, { color: colors.primary }]}>📦 Matériel utilisé</Text>
          <Text style={[styles.infoCardText, { color: colors.text }]}>Nom: {materielNom}</Text>
          <Text style={[styles.infoCardText, { color: colors.text }]}>Type: {materielType === 'reutilisable' ? 'Réutilisable' : 'Jetable'}</Text>
          {quantiteUtilisee && parseInt(quantiteUtilisee) > 0 && (
            <Text style={[styles.infoCardText, { color: colors.text }]}>Quantité: {quantiteUtilisee}</Text>
          )}
        </View>
      )}

      {/* Afficher les résultats existants si l'intervention est terminée */}
      {interventionStatus === 'terminee' && (
        <View style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.resultsCardTitle, { color: colors.primary }]}>📋 Résultats de l'intervention</Text>
          {renderResultatsExistants()}
        </View>
      )}

      {/* Bouton pour terminer l'intervention si elle n'est pas encore terminée */}
      {interventionStatus !== 'terminee' && (
        <TouchableOpacity
          style={[styles.finishButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowResultModal(true)}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.finishButtonText}>Terminer l'intervention</Text>
        </TouchableOpacity>
      )}

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
            
            <ScrollView style={styles.modalScroll}>
              {renderFormByType()}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 10 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 5 },
  statusBadge: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  infoCard: { margin: 16, padding: 16, borderRadius: 12 },
  infoCardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  infoCardText: { fontSize: 14, marginBottom: 4 },
  finishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, padding: 16, borderRadius: 12, gap: 10 },
  finishButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  resultsCard: { margin: 16, padding: 16, borderRadius: 12 },
  resultsCardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  resultsContainer: { gap: 8 },
  resultText: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
  noDataText: { textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContent: { margin: 20, borderRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalScroll: { padding: 16, maxHeight: '70%' },
  modalButtons: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#ddd' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { borderWidth: 1 },
  saveButton: {},
  cancelButtonText: { fontWeight: '500' },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  // Form styles
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  required: { color: '#f44336' },
  optionalText: { fontSize: 12, fontStyle: 'italic', marginTop: -8, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
});