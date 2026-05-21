import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const elementsParSoin = {
  consultation: {
    title: 'Symptômes',
    items: ['Fièvre', 'Toux', 'Maux de tête', 'Douleur thoracique', 'Essoufflement', 'Nausées', 'Fatigue', 'Douleur abdominale', 'Courbatures', 'Vertiges'],
    showIntensite: true,
    showDuree: true,
  },
  'soin-plaie': {
    title: 'État de la plaie',
    items: ['Plaie ouverte', 'Plaie infectée', 'Plaie qui saigne', 'Plaie post-op', 'Escarre', 'Brûlure', 'Cicatrice ouverte', 'Œdème', 'Rougeur', 'Suppuration'],
    showIntensite: false,
    showDuree: false,
  },
  injection: {
    title: 'Type d\'injection',
    items: ['Vaccin COVID-19', 'Vaccin Grippe', 'Vaccin Hépatite B', 'Vaccin Tétanos', 'Vitamine B12', 'Vitamine D', 'Vitamine C', 'Insuline', 'Antibiotique', 'Anti-douleur'],
    showIntensite: false,
    showDuree: false,
  },
  perfusion: {
    title: 'Type de perfusion',
    items: ['Perfusion réhydratation', 'Perfusion antibiotiques', 'Perfusion chimiothérapie', 'Perfusion douleur', 'Perfusion nutriments', 'Perfusion sang'],
    showIntensite: false,
    showDuree: false,
  },
  prelevement: {
    title: 'Type de prélèvement',
    items: ['Prise de sang', 'Glycémie', 'Bilan lipidique', 'Bilan hépatique', 'Dosage hormonal', 'Prélèvement urinaire', 'Prélèvement nasal', 'Test COVID'],
    showIntensite: false,
    showDuree: false,
  },
  surveillance: {
    title: 'Éléments à surveiller',
    items: ['Tension artérielle', 'Température', 'Cicatrice post-op', 'Respiration', 'Rythme cardiaque', 'Glycémie', 'Douleur', 'Œdème'],
    showIntensite: false,
    showDuree: false,
  },
  reeducation: {
    title: 'Type de rééducation',
    items: ['Post-opératoire', 'Neurologique', 'Respiratoire', 'Cardiaque', 'Orthopédique', 'Périnéale'],
    showIntensite: false,
    showDuree: false,
  }
};

const niveauxIntensite = ['faible', 'modérée', 'forte', 'très forte'];

export default function SymptomesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const { typeSoin, typeSoinNom, latitude, longitude, adresse } = params;
  
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [intensiteData, setIntensiteData] = useState({});
  const [dureeData, setDureeData] = useState({});

  // Stocker la géolocalisation pour l'envoyer plus tard
  const [geoData, setGeoData] = useState({
    latitude: latitude || null,
    longitude: longitude || null,
    adresse: adresse || null
  });

  const config = elementsParSoin[typeSoin] || elementsParSoin.consultation;
  const itemsList = config.items;
  const title = config.title;
  const showIntensite = config.showIntensite;
  const showDuree = config.showDuree;

  useEffect(() => {
    setDescription('');
    setSelectedItems([]);
    setIntensiteData({});
    setDureeData({});
  }, [typeSoin]);

  useFocusEffect(
    useCallback(() => {
      setDescription('');
      setSelectedItems([]);
      setIntensiteData({});
      setDureeData({});
    }, [])
  );

  const toggleItem = (item) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
      const newIntensite = { ...intensiteData };
      const newDuree = { ...dureeData };
      delete newIntensite[item];
      delete newDuree[item];
      setIntensiteData(newIntensite);
      setDureeData(newDuree);
    } else {
      setSelectedItems([...selectedItems, item]);
      setIntensiteData({ ...intensiteData, [item]: 'modérée' });
      setDureeData({ ...dureeData, [item]: '' });
    }
  };

  const updateIntensite = (item, intensite) => {
    setIntensiteData({ ...intensiteData, [item]: intensite });
  };

  const updateDuree = (item, duree) => {
    setDureeData({ ...dureeData, [item]: duree });
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0 && !description) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un élément');
      return;
    }

    // Construire l'objet avec les données complètes
    const itemsWithDetails = {};
    selectedItems.forEach(item => {
      itemsWithDetails[item] = {
        intensite: showIntensite ? intensiteData[item] || '' : '',
        duree: showDuree ? dureeData[item] || '' : ''
      };
    });

    const itemsString = JSON.stringify(itemsWithDetails);
    const itemsEncoded = encodeURIComponent(itemsString);
    const descEncoded = encodeURIComponent(description);
    const adresseEncoded = encodeURIComponent(geoData.adresse || '');
    const latitudeValue = geoData.latitude || '';
    const longitudeValue = geoData.longitude || '';

    // Transmettre la géolocalisation à l'écran suivant
    router.push(`/patient/recap-demande?typeSoin=${typeSoin}&typeSoinNom=${typeSoinNom}&selectedItems=${itemsEncoded}&description=${descEncoded}&latitude=${latitudeValue}&longitude=${longitudeValue}&adresse=${adresseEncoded}`);
  };

  const renderItemWithDetails = (item) => {
    const isSelected = selectedItems.includes(item);
    
    if (!isSelected) {
      return (
        <TouchableOpacity
          key={item}
          style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => toggleItem(item)}
        >
          <View style={styles.itemRow}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View key={item} style={[styles.itemCardSelected, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTextSelected, { color: colors.primary }]}>{item}</Text>
          <TouchableOpacity onPress={() => toggleItem(item)}>
            <Ionicons name="close-circle" size={22} color="#ff4444" />
          </TouchableOpacity>
        </View>

        {showIntensite && (
          <>
            <Text style={[styles.sousLabel, { color: colors.textSecondary }]}>Intensité :</Text>
            <View style={styles.intensiteContainer}>
              {niveauxIntensite.map((niveau) => (
                <TouchableOpacity
                  key={niveau}
                  style={[
                    styles.intensiteButton,
                    { borderColor: colors.border },
                    intensiteData[item] === niveau && styles.intensiteButtonActive
                  ]}
                  onPress={() => updateIntensite(item, niveau)}
                >
                  <Text style={[
                    styles.intensiteText,
                    { color: colors.text },
                    intensiteData[item] === niveau && styles.intensiteTextActive
                  ]}>{niveau}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {showDuree && (
          <>
            <Text style={[styles.sousLabel, { color: colors.textSecondary }]}>Durée :</Text>
            <TextInput
              style={[styles.dureeInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Ex: 2 jours, 1 semaine..."
              placeholderTextColor={colors.textSecondary}
              value={dureeData[item]}
              onChangeText={(text) => updateDuree(item, text)}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Soin : {typeSoinNom}</Text>

      {/* Affichage de la localisation si disponible */}
      {geoData.adresse && (
        <View style={[styles.locationBadge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.primary }]} numberOfLines={1}>
            {geoData.adresse}
          </Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Sélectionnez :</Text>
      
      {itemsList.map((item) => renderItemWithDetails(item))}

      <Text style={[styles.label, { color: colors.text }]}>Description :</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
        placeholder="Description complémentaire..."
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Continuer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  backButton: { marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 15 },
  sousLabel: { fontSize: 14, fontWeight: '500', marginBottom: 5, marginTop: 8 },
  itemCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  itemCardSelected: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemText: { fontSize: 16, fontWeight: '500' },
  itemTextSelected: { fontSize: 16, fontWeight: '600' },
  intensiteContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  intensiteButton: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  intensiteButtonActive: { backgroundColor: '#5aadbf', borderColor: '#5aadbf' },
  intensiteText: { fontSize: 12 },
  intensiteTextActive: { color: '#fff' },
  dureeInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginTop: 5, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, minHeight: 80 },
  button: { paddingVertical: 14, borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
  locationText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
});