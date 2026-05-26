import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, FlatList, TextInput, RefreshControl, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { createNotification, getAdminId, notifyStockAlerte } from '../lib/notificationService';

type InterventionItem = {
  id: string;
  date_demande: string;
  localisation: string;
  priorite: string;
  statut: string;
  type_intervention: string;
  patient: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    adresse: string;
    maladies_chronique?: string;
    groupe_sangine?: string;
    age?: string;
    poids?: string;
    tension?: string;
    diabete?: string;
  };
  professionnel_nom?: string;
  professionnel_id?: string;
};

type Symptome = {
  id: string;
  nom: string;
  intensite: string;
  duree: string;
  description: string;
  urgence?: {
    label: string;
    color: string;
    priorite: string;
  };
};

type Professionnel = {
  id: string;
  utilisateur_id: string;
  nom: string;
  prenom: string;
  role: string;
  disponibilite: string;
  intervention_en_cours?: string;
};

type Materiel = {
  id: string;
  nom_m: string;
  quantite: number;
  type_materiel: string;
  disponible: string;
};

export default function AdminDemandesScreen() {
  const { colors } = useTheme();
  
  const [interventions, setInterventions] = useState<InterventionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [symptomes, setSymptomes] = useState<{ [key: string]: Symptome[] }>({});
  const [loadingSymptomes, setLoadingSymptomes] = useState<{ [key: string]: boolean }>({});
  const [detailsSupplementaires, setDetailsSupplementaires] = useState<{ [key: string]: any }>({});
  const [loadingDetails, setLoadingDetails] = useState<{ [key: string]: boolean }>({});
  
  const [showProModal, setShowProModal] = useState(false);
  const [showMaterielModal, setShowMaterielModal] = useState(false);
  const [showQuantiteModal, setShowQuantiteModal] = useState(false);
  const [showLibererProModal, setShowLibererProModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(null);
  const [selectedPro, setSelectedPro] = useState<Professionnel | null>(null);
  const [selectedMateriel, setSelectedMateriel] = useState<Materiel | null>(null);
  const [professionnels, setProfessionnels] = useState<Professionnel[]>([]);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [quantiteUtilisee, setQuantiteUtilisee] = useState('');
  const [loadingPros, setLoadingPros] = useState(false);
  const [loadingMateriel, setLoadingMateriel] = useState(false);
  const [orientingInProgress, setOrientingInProgress] = useState(false);
  const [liberatingInProgress, setLiberatingInProgress] = useState(false);
  const [activeSection, setActiveSection] = useState<'encours' | 'terminees'>('encours');
  const [proToLiberate, setProToLiberate] = useState<Professionnel | null>(null);

  // Fonction pour ouvrir Google Maps
  const openInGoogleMaps = async (localisation: string) => {
    try {
      const encodedAddress = encodeURIComponent(localisation);
      const url = Platform.select({
        ios: `maps://maps.apple.com/?q=${encodedAddress}`,
        android: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
      }) || `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Erreur ouverture carte:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la carte');
    }
  };

  useEffect(() => {
    loadInterventions();
    checkMaterialStock();
  }, []);

  const checkMaterialStock = async () => {
    const { data: materiels } = await supabase
      .from('materiel_medical')
      .select('id, nom_m, quantite');

    if (materiels) {
      for (const materiel of materiels) {
        await notifyStockAlerte(materiel.id, materiel.nom_m, materiel.quantite);
      }
    }
  };

  const loadInterventions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('intervention')
      .select(`
        id,
        date_demande,
        localisation,
        priorite,
        statut,
        type_intervention,
        patient:patient_id (
          id,
          adresse,
          maladies_chronique,
          groupe_sangine,
          age,
          poids,
          tension,
          diabete,
          utilisateur:utilisateur_id (nom, prenom, telephone)
        ),
        professionnel:professionnel_id (
          id,
          utilisateur:utilisateur_id (nom, prenom)
        )
      `)
      .order('date_demande', { ascending: false });

    if (error) {
      console.error('Erreur:', error);
      setInterventions([]);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setInterventions([]);
      setLoading(false);
      return;
    }

    let formatted = data.map((i: any) => ({
      id: i.id,
      date_demande: i.date_demande ? new Date(i.date_demande).toLocaleDateString() : 'Date inconnue',
      localisation: i.localisation || 'Non renseignée',
      priorite: i.priorite || 'normale',
      statut: i.statut || 'en_attente',
      type_intervention: i.type_intervention || 'Non spécifié',
      patient: {
        id: i.patient?.id || '',
        nom: i.patient?.utilisateur?.nom || 'Inconnu',
        prenom: i.patient?.utilisateur?.prenom || 'Inconnu',
        telephone: i.patient?.utilisateur?.telephone || 'Non renseigné',
        adresse: i.patient?.adresse || 'Non renseignée',
        maladies_chronique: i.patient?.maladies_chronique || null,
        groupe_sangine: i.patient?.groupe_sangine || null,
        age: i.patient?.age || null,
        poids: i.patient?.poids || null,
        tension: i.patient?.tension || null,
        diabete: i.patient?.diabete || null,
      },
      professionnel_id: i.professionnel?.id,
      professionnel_nom: i.professionnel?.utilisateur ? 
        `${i.professionnel.utilisateur.prenom} ${i.professionnel.utilisateur.nom}` : 
        'Non affecté'
    }));
    
    setInterventions(formatted);
    
    await loadAllSymptomes(formatted);
    
    setLoading(false);
  };

  const loadAllSymptomes = async (interventionsList: InterventionItem[]) => {
    const consultations = interventionsList.filter(i => i.type_intervention === 'consultation' && i.statut !== 'terminee');
    
    for (const intervention of consultations) {
      const { data, error } = await supabase
        .from('consultation')
        .select(`
          symptome:symptome_id (
            id,
            intensite,
            duree,
            description,
            type_symptome:type_symptome_id (nom)
          )
        `)
        .eq('intervention_id', intervention.id);

      if (!error && data && data.length > 0) {
        const symptomeData = data[0]?.symptome;
        if (symptomeData) {
          const intensite = symptomeData.intensite || '';
          const urgenceInfo = getUrgenceFromIntensite(intensite);
          
          const formatted = {
            id: symptomeData.id,
            nom: symptomeData.type_symptome?.nom || 'Symptôme',
            intensite: intensite,
            duree: symptomeData.duree || '',
            description: symptomeData.description || '',
            urgence: urgenceInfo
          };
          setSymptomes(prev => ({ ...prev, [intervention.id]: [formatted] }));
        }
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInterventions();
    await checkMaterialStock();
    setRefreshing(false);
  }, []);

  const getUrgenceFromIntensite = (intensite: string): { label: string; color: string; priorite: string } => {
    switch(intensite?.toLowerCase()) {
      case 'très forte':
      case 'tres forte':
        return { label: '🔴 URGENTISSIME', color: '#ff0000', priorite: 'urgentissime' };
      case 'forte':
        return { label: '🔴 URGENT', color: '#ff4444', priorite: 'urgente' };
      case 'modérée':
      case 'moderee':
        return { label: '🟠 Priorité haute', color: '#ff8800', priorite: 'haute' };
      case 'faible':
        return { label: '🟢 Priorité normale', color: '#4CAF50', priorite: 'normale' };
      default:
        return { label: '🟢 Priorité normale', color: '#4CAF50', priorite: 'normale' };
    }
  };

  const loadSymptomes = async (interventionId: string) => {
    if (symptomes[interventionId]) return;
    
    setLoadingSymptomes(prev => ({ ...prev, [interventionId]: true }));
    
    const { data, error } = await supabase
      .from('consultation')
      .select(`
        symptome:symptome_id (
          id,
          intensite,
          duree,
          description,
          type_symptome:type_symptome_id (nom)
        )
      `)
      .eq('intervention_id', interventionId);

    if (!error && data && data.length > 0) {
      const symptomeData = data[0]?.symptome;
      if (symptomeData) {
        const intensite = symptomeData.intensite || '';
        const urgenceInfo = getUrgenceFromIntensite(intensite);
        
        const formatted = {
          id: symptomeData.id,
          nom: symptomeData.type_symptome?.nom || 'Symptôme',
          intensite: intensite,
          duree: symptomeData.duree || '',
          description: symptomeData.description || '',
          urgence: urgenceInfo
        };
        setSymptomes(prev => ({ ...prev, [interventionId]: [formatted] }));
      }
    }
    
    setLoadingSymptomes(prev => ({ ...prev, [interventionId]: false }));
  };

  const loadDetailsSupplementaires = async (interventionId: string, typeSoin: string) => {
    if (detailsSupplementaires[interventionId]) return;
    
    setLoadingDetails(prev => ({ ...prev, [interventionId]: true }));
    
    let tableName = '';
    let fieldName = '';
    let displayName = '';
    
    switch(typeSoin) {
      case 'prelevement':
        tableName = 'prelevement';
        fieldName = 'type_prelevement';
        displayName = 'Type de prélèvement';
        break;
      case 'injection':
        tableName = 'injection';
        fieldName = 'type_injection';
        displayName = "Type d'injection";
        break;
      case 'perfusion':
        tableName = 'perfusion';
        fieldName = 'type_perfusion';
        displayName = 'Type de perfusion';
        break;
      case 'soin-plaie':
        tableName = 'soin_plaie';
        fieldName = 'type_plaie';
        displayName = 'Type de plaie';
        break;
      case 'surveillance':
        tableName = 'surveillance_post_hospitalisation';
        fieldName = 'elements_surveiller';
        displayName = 'Éléments à surveiller';
        break;
      case 'reeducation':
        tableName = 'reeducation';
        fieldName = 'type_reeducation';
        displayName = 'Type de rééducation';
        break;
      default:
        setLoadingDetails(prev => ({ ...prev, [interventionId]: false }));
        return;
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('intervention_id', interventionId)
      .maybeSingle();

    if (!error && data) {
      setDetailsSupplementaires(prev => ({ ...prev, [interventionId]: { 
        type: typeSoin, 
        donnees: data, 
        fieldName,
        displayName,
        valeur: data[fieldName] || 'Non spécifié',
        details: data.details || null
      } }));
    }
    
    setLoadingDetails(prev => ({ ...prev, [interventionId]: false }));
  };

  const handleExpand = async (intervention: InterventionItem) => {
    if (expandedId === intervention.id) {
      setExpandedId(null);
    } else {
      setExpandedId(intervention.id);
      if (intervention.type_intervention === 'consultation') {
        await loadSymptomes(intervention.id);
      } else {
        await loadDetailsSupplementaires(intervention.id, intervention.type_intervention);
      }
    }
  };

  const loadProfessionnels = async () => {
    setLoadingPros(true);
    
    try {
      const { data: pros, error: prosError } = await supabase
        .from('professionnel_sante')
        .select(`
          id,
          disponibilite,
          utilisateur:utilisateur_id (id, nom, prenom, role)
        `);

      if (prosError) throw prosError;

      const { data: interventionsEnCours } = await supabase
        .from('intervention')
        .select('professionnel_id, id, statut')
        .in('statut', ['affectee', 'en_cours']);

      const proInterventionMap = new Map();
      if (interventionsEnCours) {
        interventionsEnCours.forEach(inter => {
          if (inter.professionnel_id) {
            proInterventionMap.set(inter.professionnel_id, inter.id);
          }
        });
      }

      const result: Professionnel[] = (pros || []).map(pro => {
        const aInterventionEnCours = proInterventionMap.has(pro.id);
        let disponibilite = pro.disponibilite;
        
        if (aInterventionEnCours && disponibilite === 'disponible') {
          disponibilite = 'indisponible';
          supabase
            .from('professionnel_sante')
            .update({ disponibilite: 'indisponible' })
            .eq('id', pro.id)
            .then();
        }
        
        return {
          id: pro.id,
          utilisateur_id: pro.utilisateur?.id || '',
          nom: pro.utilisateur?.nom || 'Inconnu',
          prenom: pro.utilisateur?.prenom || 'Inconnu',
          role: pro.utilisateur?.role || 'professionnel',
          disponibilite: disponibilite || 'disponible',
          intervention_en_cours: proInterventionMap.get(pro.id)
        };
      });
      
      setProfessionnels(result);
    } catch (error) {
      console.error('Erreur chargement pros:', error);
      setProfessionnels([]);
    } finally {
      setLoadingPros(false);
    }
  };

  const loadTousMateriels = async () => {
    setLoadingMateriel(true);
    try {
      const { data, error } = await supabase
        .from('materiel_medical')
        .select('id, nom_m, quantite, type_materiel, disponible')
        .order('type_materiel', { ascending: true });
      
      if (error) throw error;
      setMateriels(data || []);
    } catch (error) {
      setMateriels([]);
    } finally {
      setLoadingMateriel(false);
    }
  };

  const orienterAvecMateriel = async (machineId?: string, quantite: number = 1) => {
    if (!selectedIntervention || !selectedPro) return false;

    setOrientingInProgress(true);

    try {
      const updateData: any = {
        professionnel_id: selectedPro.id,
        statut: 'affectee',
        quantite_utilisee: quantite
      };
      
      if (machineId) {
        updateData.id_machine = machineId;
      }
      
      const { error } = await supabase
        .from('intervention')
        .update(updateData)
        .eq('id', selectedIntervention.id);

      if (error) {
        Alert.alert('❌ Erreur', error.message);
        return false;
      }
      
      if (machineId) {
        const { data: materiel } = await supabase
          .from('materiel_medical')
          .select('quantite, nom_m')
          .eq('id', machineId)
          .single();
        
        if (materiel) {
          const nouvelleQuantite = materiel.quantite - quantite;
          await supabase
            .from('materiel_medical')
            .update({ quantite: nouvelleQuantite })
            .eq('id', machineId);
          
          await notifyStockAlerte(machineId, materiel.nom_m, nouvelleQuantite);
        }
      }
      
      await supabase
        .from('professionnel_sante')
        .update({ disponibilite: 'indisponible' })
        .eq('id', selectedPro.id);
      
      setProfessionnels(prev => prev.map(p => 
        p.id === selectedPro.id ? { ...p, disponibilite: 'indisponible', intervention_en_cours: selectedIntervention.id } : p
      ));

      const symptomesList = symptomes[selectedIntervention.id] || [];
      const patient = selectedIntervention.patient;
      
      let messagePro = `🆕 NOUVELLE INTERVENTION\n\n`;
      messagePro += `👤 Patient: ${patient.prenom} ${patient.nom}\n`;
      messagePro += `📍 Adresse: ${selectedIntervention.localisation}\n`;
      messagePro += `📞 Tél: ${patient.telephone}\n`;
      messagePro += `📋 Type: ${getTypeLabel(selectedIntervention.type_intervention)}\n`;
      
      if (selectedIntervention.type_intervention === 'consultation' && symptomesList[0]?.urgence) {
        messagePro += `⚡ ${symptomesList[0].urgence.label}\n`;
      }
      
      await createNotification(
        selectedPro.utilisateur_id,
        '🆕 Nouvelle intervention',
        messagePro,
        'intervention_orientee',
        { intervention_id: selectedIntervention.id }
      );
      
      await createNotification(
        patient.id,
        '✅ Intervention orientée',
        `Votre demande a été orientée vers ${selectedPro.prenom} ${selectedPro.nom}.`,
        'orientation_patient',
        { intervention_id: selectedIntervention.id }
      );
      
      const adminId = await getAdminId();
      if (adminId) {
        await createNotification(
          adminId,
          '📋 Intervention orientée',
          `L'intervention pour ${patient.prenom} ${patient.nom} a été orientée vers ${selectedPro.prenom} ${selectedPro.nom}.`,
          'intervention_orientee_admin',
          { intervention_id: selectedIntervention.id }
        );
      }
      
      Alert.alert('✅ Succès', 'Intervention orientée avec succès');
      return true;
    } catch (error) {
      console.error('Erreur orientation:', error);
      return false;
    } finally {
      setOrientingInProgress(false);
    }
  };

  const handleProSelect = (pro: Professionnel) => {
    setShowProModal(false);
    
    if (pro.disponibilite !== 'disponible') {
      setProToLiberate(pro);
      setShowLibererProModal(true);
      return;
    }

    proceedWithOrientation(pro);
  };

  const proceedWithOrientation = (pro: Professionnel) => {
    setSelectedPro(pro);
    loadTousMateriels();
    setShowMaterielModal(true);
  };

  const handleLibererEtOrienter = async () => {
    if (!proToLiberate) return;
    
    setShowLibererProModal(false);
    
    if (proToLiberate.intervention_en_cours) {
      await supabase
        .from('intervention')
        .update({ statut: 'terminee' })
        .eq('id', proToLiberate.intervention_en_cours);
    }
    
    await supabase
      .from('professionnel_sante')
      .update({ disponibilite: 'disponible' })
      .eq('id', proToLiberate.id);
    
    await loadProfessionnels();
    const updatedPro = { ...proToLiberate, disponibilite: 'disponible' };
    proceedWithOrientation(updatedPro);
    
    setProToLiberate(null);
  };

  const handleMaterielSelect = (materiel: Materiel) => {
    if (materiel.quantite <= 0) {
      Alert.alert('❌ Non disponible', `Stock insuffisant: ${materiel.quantite}`);
      return;
    }
    setShowMaterielModal(false);
    setSelectedMateriel(materiel);
    setQuantiteUtilisee('1');
    setShowQuantiteModal(true);
  };

  const handleConfirmerQuantite = async () => {
    const quantite = parseFloat(quantiteUtilisee);
    if (isNaN(quantite) || quantite <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }
    
    if (selectedMateriel && quantite > selectedMateriel.quantite) {
      Alert.alert('Erreur', `Stock insuffisant. Disponible: ${selectedMateriel.quantite}`);
      return;
    }

    setShowQuantiteModal(false);
    const success = await orienterAvecMateriel(selectedMateriel?.id, quantite);
    
    if (success) {
      loadInterventions();
      setExpandedId(null);
    }
    
    setSelectedPro(null);
    setSelectedIntervention(null);
    setSelectedMateriel(null);
    setQuantiteUtilisee('');
  };

  const handleOrienterSansMateriel = async () => {
    setShowMaterielModal(false);
    const success = await orienterAvecMateriel();
    
    if (success) {
      loadInterventions();
      setExpandedId(null);
    }
    
    setSelectedPro(null);
    setSelectedIntervention(null);
    setSelectedMateriel(null);
  };

  // Fonction pour réorienter une intervention refusée
  const handleReorienter = async (intervention: InterventionItem) => {
    // Réinitialiser le professionnel et le statut
    const { error } = await supabase
      .from('intervention')
      .update({ 
        professionnel_id: null,
        statut: 'en_attente'
      })
      .eq('id', intervention.id);
    
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    
    // Ouvrir le modal pour choisir un nouveau professionnel
    setSelectedIntervention(intervention);
    setShowProModal(true);
    await loadProfessionnels();
  };

  const openProModal = async (intervention: InterventionItem) => {
    setSelectedIntervention(intervention);
    setShowProModal(true);
    await loadProfessionnels();
  };

  const getPrioriteLabel = (intervention: InterventionItem) => {
    if (intervention.type_intervention !== 'consultation') return null;
    
    const interventionSymptomes = symptomes[intervention.id] || [];
    const symptomeIntensite = interventionSymptomes[0]?.intensite;
    
    if (symptomeIntensite) {
      return getUrgenceFromIntensite(symptomeIntensite);
    }
    
    switch(intervention.priorite) {
      case 'urgentissime': return { label: '🔴 URGENTISSIME', color: '#ff0000' };
      case 'urgente': return { label: '🔴 URGENT', color: '#ff4444' };
      case 'haute': return { label: '🟠 Haute priorité', color: '#ff8800' };
      default: return { label: '🟢 Priorité normale', color: '#4CAF50' };
    }
  };

  const getStatutLabel = (statut: string) => {
    switch(statut) {
      case 'en_attente': return { label: 'En attente', color: '#ff8800' };
      case 'affectee': return { label: 'Affectée', color: '#5aadbf' };
      case 'terminee': return { label: 'Terminée', color: '#4CAF50' };
      case 'refusee': return { label: 'Refusée', color: '#ff4444' };
      default: return { label: statut, color: '#999' };
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'consultation': 'Consultation',
      'soin-plaie': 'Soin de plaie',
      'injection': 'Injection',
      'perfusion': 'Perfusion',
      'prelevement': 'Prélèvement',
      'surveillance': 'Surveillance post-hospitalisation',
      'reeducation': 'Rééducation'
    };
    return types[type] || type;
  };

  const renderInterventionCard = (item: InterventionItem, isTerminee: boolean = false) => {
    const prioriteInfo = getPrioriteLabel(item);
    const statutInfo = getStatutLabel(item.statut);
    const isLoading = loadingSymptomes[item.id] || loadingDetails[item.id];
    const interventionSymptomes = symptomes[item.id] || [];
    const detailsData = detailsSupplementaires[item.id];
    const isExpanded = expandedId === item.id;
    const isConsultation = item.type_intervention === 'consultation';
    const aDesMaladies = item.patient.maladies_chronique && item.patient.maladies_chronique !== '[]' && item.patient.maladies_chronique !== 'null';
    const estRefusee = item.statut === 'refusee';
    
    return (
      <View key={item.id} style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => handleExpand(item)}>
          <View style={styles.cardLeft}>
            <View style={styles.patientInfo}>
              <Text style={[styles.patientNom, { color: colors.text }]}>{item.patient.prenom} {item.patient.nom}</Text>
              <Text style={[styles.patientTel, { color: colors.textSecondary }]}>📞 {item.patient.telephone}</Text>
              <Text style={[styles.cardType, { color: colors.primary }]}>{getTypeLabel(item.type_intervention)}</Text>
              {isConsultation && interventionSymptomes[0]?.intensite && (
                <Text style={[styles.intensiteText, { color: prioriteInfo?.color || colors.textSecondary }]}>
                  💪 Intensité: {interventionSymptomes[0].intensite}
                </Text>
              )}
              {aDesMaladies && !isTerminee && (
                <Text style={[styles.maladiesText, { color: '#ff8800' }]}>🏥 Maladies chroniques</Text>
              )}
            </View>
            {prioriteInfo && !isTerminee && !estRefusee && (
              <View style={[styles.prioriteBadge, { backgroundColor: prioriteInfo.color + '20' }]}>
                <Text style={[styles.prioriteText, { color: prioriteInfo.color }]}>{prioriteInfo.label}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardRight}>
            {!isTerminee && (
              <View style={[styles.statutBadge, { backgroundColor: statutInfo.color }]}>
                <Text style={styles.statutText}>{statutInfo.label}</Text>
              </View>
            )}
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            {/* Localisation cliquable */}
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={() => openInGoogleMaps(item.localisation)}
            >
              <Ionicons name="location-sharp" size={16} color={colors.primary} />
              <Text style={[styles.info, styles.locationText, { color: colors.primary }]}>📍 {item.localisation}</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
            
            <Text style={[styles.info, { color: colors.textSecondary }]}>📅 {item.date_demande}</Text>
            
            {isConsultation && prioriteInfo && !isTerminee && !estRefusee && (
              <View style={[styles.urgenceBanner, { backgroundColor: prioriteInfo.color + '15', borderLeftColor: prioriteInfo.color }]}>
                <Text style={[styles.urgenceBannerText, { color: prioriteInfo.color }]}>
                  ⚡ {prioriteInfo.label} ⚡
                </Text>
                {interventionSymptomes[0]?.intensite && (
                  <Text style={[styles.urgenceDetail, { color: prioriteInfo.color }]}>
                    Basé sur l'intensité: {interventionSymptomes[0].intensite}
                  </Text>
                )}
              </View>
            )}
            
            {(item.patient.age || item.patient.groupe_sangine) && (
              <View style={[styles.patientInfoContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.patientInfoTitle, { color: colors.primary }]}>🏥 Infos patient</Text>
                {item.patient.age && <Text style={[styles.patientInfoText, { color: colors.text }]}>Âge: {item.patient.age} ans</Text>}
                {item.patient.poids && <Text style={[styles.patientInfoText, { color: colors.text }]}>Poids: {item.patient.poids} kg</Text>}
                {item.patient.tension && <Text style={[styles.patientInfoText, { color: colors.text }]}>Tension: {item.patient.tension}</Text>}
                {item.patient.diabete && <Text style={[styles.patientInfoText, { color: '#ff8800' }]}>Diabète: {item.patient.diabete}</Text>}
                {item.patient.groupe_sangine && <Text style={[styles.patientInfoText, { color: colors.text }]}>Groupe sanguin: {item.patient.groupe_sangine}</Text>}
                {aDesMaladies && (
                  <Text style={[styles.patientInfoText, { color: '#ff8800' }]}>
                    Maladies chroniques: {item.patient.maladies_chronique}
                  </Text>
                )}
              </View>
            )}

            {item.professionnel_nom && item.professionnel_nom !== 'Non affecté' && !estRefusee && (
              <Text style={[styles.info, { color: colors.textSecondary }]}>👨‍⚕️ Professionnel: {item.professionnel_nom}</Text>
            )}

            {estRefusee && (
              <View style={[styles.refuseBanner, { backgroundColor: '#ff444415' }]}>
                <Ionicons name="close-circle" size={20} color="#ff4444" />
                <Text style={[styles.refuseBannerText, { color: '#ff4444' }]}>
                  Cette intervention a été refusée par le professionnel
                </Text>
              </View>
            )}

            <View style={styles.detailsSection}>
              <Text style={[styles.detailsTitle, { color: colors.primary }]}>📋 Détails de la demande :</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isConsultation ? (
                interventionSymptomes.length > 0 ? (
                  interventionSymptomes.map((s, idx) => (
                    <View key={idx} style={[styles.detailItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailNom, { color: colors.text }]}>• {s.nom}</Text>
                      <View style={styles.detailInfos}>
                        {s.intensite && (
                          <View style={[styles.intensiteBadge, { backgroundColor: s.urgence?.color + '20' }]}>
                            <Text style={[styles.intensiteBadgeText, { color: s.urgence?.color }]}>
                              Intensité: {s.intensite}
                            </Text>
                          </View>
                        )}
                        {s.duree && <Text style={[styles.detailText, { color: colors.textSecondary }]}>Durée: {s.duree}</Text>}
                      </View>
                      {s.description && <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>📝 {s.description}</Text>}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noDetailsText, { color: colors.textSecondary }]}>Aucun symptôme enregistré</Text>
                )
              ) : detailsData ? (
                <View style={[styles.detailItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.detailNom, { color: colors.text }]}>• {detailsData.displayName}: {detailsData.valeur}</Text>
                  {detailsData.details && (
                    <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>📝 {detailsData.details}</Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.noDetailsText, { color: colors.textSecondary }]}>Aucun détail enregistré</Text>
              )}
            </View>

            {/* Boutons d'action */}
            {!isTerminee && item.statut === 'en_attente' && (
              <TouchableOpacity style={[styles.orienterButton, { backgroundColor: colors.primary }]} onPress={() => openProModal(item)}>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.orienterButtonText}>Orienter un professionnel</Text>
              </TouchableOpacity>
            )}

            {!isTerminee && item.statut === 'refusee' && (
              <TouchableOpacity style={[styles.reorienterButton, { backgroundColor: '#ff8800' }]} onPress={() => handleReorienter(item)}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.orienterButtonText}>Réorienter (autre professionnel)</Text>
              </TouchableOpacity>
            )}

            {!isTerminee && (item.statut === 'affectee') && (
              <View style={[styles.infoMessage, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.infoMessageText, { color: colors.textSecondary }]}>
                  Intervention orientée - En attente de prise en charge
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderProfessionnelItem = ({ item }: { item: Professionnel }) => {
    const isDisponible = item.disponibilite === 'disponible';
    return (
      <TouchableOpacity style={[styles.proItem, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => handleProSelect(item)}>
        <View style={styles.proItemLeft}>
          <View style={[styles.proAvatar, { backgroundColor: isDisponible ? '#4CAF50' : '#ff4444' }]}>
            <Text style={styles.proAvatarText}>{item.prenom?.charAt(0)}{item.nom?.charAt(0)}</Text>
          </View>
          <View>
            <Text style={[styles.proName, { color: colors.text }]}>{item.prenom} {item.nom}</Text>
            <Text style={[styles.proRole, { color: colors.textSecondary }]}>{item.role}</Text>
            {!isDisponible && item.intervention_en_cours && (
              <Text style={[styles.proStatusTextSmall, { color: '#ff8800' }]}>En intervention</Text>
            )}
          </View>
        </View>
        <View style={[styles.proStatus, { backgroundColor: isDisponible ? '#4CAF50' : '#ff4444' }]}>
          <Text style={styles.proStatusText}>{isDisponible ? 'Disponible' : 'Indisponible'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMaterielItem = ({ item }: { item: Materiel }) => {
    const isReutilisable = item.type_materiel === 'reutilisable';
    let statutTexte = '', statutCouleur = '';
    if (item.quantite === 0) { statutTexte = 'Rupture'; statutCouleur = '#ff4444'; }
    else if (item.quantite <= 3) { statutTexte = 'Stock faible'; statutCouleur = '#ff8800'; }
    else { statutTexte = 'Disponible'; statutCouleur = '#4CAF50'; }
    
    return (
      <TouchableOpacity style={[styles.proItem, { borderColor: colors.border, backgroundColor: colors.surface, opacity: item.quantite === 0 ? 0.6 : 1 }]} onPress={() => handleMaterielSelect(item)}>
        <View style={styles.proItemLeft}>
          <View style={[styles.proAvatar, { backgroundColor: statutCouleur + '20' }]}>
            <Text style={styles.proAvatarText}>{isReutilisable ? '🔄' : '🗑️'}</Text>
          </View>
          <View>
            <Text style={[styles.proName, { color: colors.text }]}>{item.nom_m}</Text>
            <Text style={[styles.proRole, { color: colors.textSecondary }]}>Stock: {item.quantite}</Text>
          </View>
        </View>
        <View style={[styles.proStatus, { backgroundColor: statutCouleur }]}>
          <Text style={styles.proStatusText}>{statutTexte}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  const interventionsEncours = interventions.filter(i => i.statut !== 'terminee');
  const interventionsTerminees = interventions.filter(i => i.statut === 'terminee');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.mainTitle, { color: colors.primary }]}>📋 Gestion des interventions</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeSection === 'encours' && styles.tabActive]} onPress={() => setActiveSection('encours')}>
          <Text style={[styles.tabText, activeSection === 'encours' && { color: colors.primary, fontWeight: 'bold' }]}>📋 En cours ({interventionsEncours.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeSection === 'terminees' && styles.tabActive]} onPress={() => setActiveSection('terminees')}>
          <Text style={[styles.tabText, activeSection === 'terminees' && { color: colors.primary, fontWeight: 'bold' }]}>✅ Terminées ({interventionsTerminees.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {activeSection === 'encours' ? (
          interventionsEncours.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune intervention en cours</Text>
            </View>
          ) : (
            interventionsEncours.map(i => renderInterventionCard(i, false))
          )
        ) : (
          interventionsTerminees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune intervention terminée</Text>
            </View>
          ) : (
            interventionsTerminees.map(i => renderInterventionCard(i, true))
          )
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal professionnels */}
      <Modal visible={showProModal} transparent animationType="slide" onRequestClose={() => setShowProModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Choisir un professionnel</Text>
            {loadingPros ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : professionnels.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center', padding: 20 }]}>
                Aucun professionnel disponible
              </Text>
            ) : (
              <FlatList 
                data={professionnels} 
                keyExtractor={(item) => item.id} 
                renderItem={renderProfessionnelItem} 
                style={{ maxHeight: 400 }}
              />
            )}
            <TouchableOpacity style={[styles.modalCancelButton, { borderColor: colors.border }]} onPress={() => setShowProModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal libérer professionnel */}
      <Modal visible={showLibererProModal} transparent animationType="fade" onRequestClose={() => setShowLibererProModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, width: '85%' }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={40} color="#ff8800" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.primary, textAlign: 'center' }]}>Professionnel indisponible</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text, textAlign: 'center', marginVertical: 10 }]}>
              {proToLiberate?.prenom} {proToLiberate?.nom} est actuellement en intervention.
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              Voulez-vous terminer son intervention en cours pour lui assigner celle-ci ?
            </Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowLibererProModal(false)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleLibererEtOrienter} disabled={liberatingInProgress}>
                {liberatingInProgress ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Terminer & orienter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal matériel */}
      <Modal visible={showMaterielModal} transparent animationType="slide" onRequestClose={() => setShowMaterielModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Choisir un matériel</Text>
            {loadingMateriel ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : materiels.length === 0 ? (
              <TouchableOpacity style={[styles.proItem, { justifyContent: 'center' }]} onPress={handleOrienterSansMateriel}>
                <Text style={[styles.proName, { color: colors.text, textAlign: 'center' }]}>Continuer sans matériel</Text>
              </TouchableOpacity>
            ) : (
              <>
                <FlatList 
                  data={materiels} 
                  keyExtractor={(item) => item.id} 
                  renderItem={renderMaterielItem} 
                  style={{ maxHeight: 400 }}
                />
                <TouchableOpacity style={[styles.modalSkipButton, { marginTop: 10 }]} onPress={handleOrienterSansMateriel}>
                  <Text style={[styles.modalSkipText, { color: colors.primary }]}>Continuer sans matériel</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.modalCancelButton, { borderColor: colors.border }]} onPress={() => setShowMaterielModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal quantité */}
      <Modal visible={showQuantiteModal} transparent animationType="fade" onRequestClose={() => setShowQuantiteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, width: '85%' }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Quantité à utiliser</Text>
            <Text style={[styles.modalLabel, { color: colors.text }]}>Stock disponible: {selectedMateriel?.quantite}</Text>
            <TextInput 
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, textAlign: 'center', fontSize: 18 }]} 
              placeholder="Quantité" 
              placeholderTextColor={colors.textSecondary}
              value={quantiteUtilisee} 
              onChangeText={setQuantiteUtilisee} 
              keyboardType="numeric" 
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowQuantiteModal(false)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmerQuantite}>
                <Text style={styles.modalConfirmBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', marginBottom: 16, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#844567' },
  tabText: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, flexWrap: 'wrap', gap: 8 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  patientInfo: { flex: 1 },
  patientNom: { fontSize: 16, fontWeight: 'bold' },
  patientTel: { fontSize: 12, marginTop: 2 },
  cardType: { fontSize: 12, marginTop: 2 },
  intensiteText: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  maladiesText: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  prioriteBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  prioriteText: { fontSize: 12, fontWeight: '600' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statutText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardBody: { paddingTop: 12, borderTopWidth: 1, marginTop: 8, gap: 6, borderTopColor: '#eee' },
  info: { fontSize: 13 },
  locationContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6,
    paddingVertical: 4,
    gap: 6
  },
  locationText: { 
    flex: 1,
    textDecorationLine: 'underline',
    marginBottom: 0
  },
  urgenceBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, marginVertical: 8, borderRadius: 8, borderLeftWidth: 4 },
  urgenceBannerText: { fontSize: 14, fontWeight: 'bold' },
  urgenceDetail: { fontSize: 11, fontStyle: 'italic' },
  detailsSection: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  detailsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  detailItem: { borderRadius: 8, padding: 8, marginBottom: 6 },
  detailNom: { fontSize: 13, fontWeight: '500' },
  detailInfos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  detailText: { fontSize: 11 },
  detailDesc: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  intensiteBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  intensiteBadgeText: { fontSize: 11, fontWeight: '600' },
  noDetailsText: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  orienterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginTop: 10, gap: 8 },
  reorienterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginTop: 10, gap: 8 },
  orienterButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoMessage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginTop: 10, gap: 8 },
  infoMessageText: { fontSize: 12 },
  refuseBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginVertical: 8, gap: 8 },
  refuseBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%', backgroundColor: '#fff' },
  modalHeader: { alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '500', marginBottom: 5, marginTop: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10, borderColor: '#ddd' },
  modalCancelButton: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 16, borderColor: '#ddd' },
  modalCancelText: { fontSize: 15, fontWeight: '500' },
  modalSkipButton: { alignItems: 'center', padding: 12, marginTop: 8 },
  modalSkipText: { fontSize: 14, fontWeight: '500' },
  modalButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  modalCancelBtnText: { fontSize: 15, fontWeight: '500' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  proItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, borderColor: '#ddd' },
  proItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  proAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  proAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  proName: { fontSize: 15, fontWeight: '500' },
  proRole: { fontSize: 12, marginTop: 2 },
  proStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  proStatusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  proStatusTextSmall: { fontSize: 10, marginTop: 2 },
  patientInfoContainer: { marginTop: 8, padding: 10, borderRadius: 8 },
  patientInfoTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  patientInfoText: { fontSize: 12, marginBottom: 3 },
});