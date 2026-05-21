import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MapView, { Marker } from 'react-native-maps';

const typesSoins = [
  { id: 'consultation', nom: 'Consultation médicale', icon: 'medkit-outline', description: 'Consultation avec un médecin généraliste ou spécialiste' },
  { id: 'soin-plaie', nom: 'Soin de plaie', icon: 'bandage-outline', description: 'Pansement, nettoyage et suivi de plaies' },
  { id: 'injection', nom: 'Injection', icon: 'syringe-outline', description: 'Piqûre, vaccin, rappel' },
  { id: 'perfusion', nom: 'Perfusion', icon: 'water-outline', description: 'Perfusion de médicaments ou de solutés' },
  { id: 'prelevement', nom: 'Prélèvement sanguin', icon: 'flask-outline', description: 'Prise de sang, analyse' },
  { id: 'surveillance', nom: 'Surveillance post-hospitalisation', icon: 'heart-outline', description: 'Suivi après sortie d\'hospitalisation' },
  { id: 'reeducation', nom: 'Rééducation', icon: 'fitness-outline', description: 'Séances de kinésithérapie ou rééducation' },
];

// Position par défaut (Annaba, Algérie)
const DEFAULT_LOCATION = {
  latitude: 36.7519,
  longitude: 7.7739,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function ChoixSoinsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  // États pour la carte
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [mapRegion, setMapRegion] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre position pour vous proposer des professionnels proches.');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre position.');
        setGettingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setSelectedLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      
      // Mettre à jour la région de la carte
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`;
        setAddress(formattedAddress);
        setSelectedAddress(formattedAddress);
      } else {
        setAddress(`${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`);
        setSelectedAddress(`${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`);
      }
      
      setUseCurrentLocation(true);
      Alert.alert('📍 Position trouvée', 'Votre position a été enregistrée avec succès.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Ouvrir la carte interactive
  const openMapSelector = async () => {
    // Si on n'a pas encore de position, essayer d'en obtenir une
    if (!location) {
      setGettingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation);
          setSelectedLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          setMapRegion({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (error) {
        // Garder la position par défaut
      } finally {
        setGettingLocation(false);
      }
    }
    setShowMapModal(true);
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`;
        setSelectedAddress(formattedAddress);
      } else {
        setSelectedAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      setSelectedAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      setLocation({
        ...location,
        coords: {
          ...location?.coords,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
      } as Location.LocationObject);
      setAddress(selectedAddress);
      setUseCurrentLocation(true);
      setShowMapModal(false);
      Alert.alert('Succès', 'Position sélectionnée avec succès.');
    }
  };

  const handleSelectSoin = async (typeSoin: typeof typesSoins[0]) => {
    if (!useCurrentLocation) {
      Alert.alert(
        '📍 Position requise',
        'Pour continuer, veuillez d\'abord partager votre position ou en sélectionner une.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Partager ma position', onPress: () => getCurrentLocation() },
          { text: 'Choisir sur la carte', onPress: () => openMapSelector() }
        ]
      );
      return;
    }

    router.push({
      pathname: '/patient/symptomes',
      params: { 
        typeSoin: typeSoin.id, 
        typeSoinNom: typeSoin.nom,
        latitude: location?.coords.latitude.toString() || '',
        longitude: location?.coords.longitude.toString() || '',
        adresse: address || ''
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.primary }]}>Choisissez le type de soin</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sélectionnez le service dont vous avez besoin</Text>

        {/* Section géolocalisation */}
        <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.locationHeader}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <Text style={[styles.locationTitle, { color: colors.text }]}>📍 Votre position</Text>
          </View>
          
          {useCurrentLocation && address ? (
            <>
              <View style={styles.addressContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
              </View>
              <View style={styles.locationActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { borderColor: colors.border }]} 
                  onPress={getCurrentLocation}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Actualiser</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { borderColor: colors.border }]} 
                  onPress={openMapSelector}
                >
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Changer</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.locationButtonsContainer}>
              <TouchableOpacity 
                style={[styles.locationButton, { backgroundColor: colors.primary }]} 
                onPress={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="location-sharp" size={20} color="#fff" />
                    <Text style={styles.locationButtonText}>Ma position</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.mapButton, { borderColor: colors.primary, borderWidth: 1 }]} 
                onPress={openMapSelector}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} />
                <Text style={[styles.mapButtonText, { color: colors.primary }]}>Choisir sur la carte</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Liste des soins */}
        {typesSoins.map((soin) => (
          <TouchableOpacity
            key={soin.id}
            style={[styles.soinCard, { backgroundColor: colors.surface }]}
            onPress={() => handleSelectSoin(soin)}
          >
            <View style={styles.soinIcon}>
              <Ionicons name={soin.icon as any} size={32} color={colors.primary} />
            </View>
            <View style={styles.soinInfo}>
              <Text style={[styles.soinNom, { color: colors.text }]}>{soin.nom}</Text>
              <Text style={[styles.soinDescription, { color: colors.textSecondary }]}>{soin.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Carte */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Sélectionnez votre position</Text>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <MapView
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  onDragEnd={(e) => {
                    setSelectedLocation(e.nativeEvent.coordinate);
                    handleMapPress(e);
                  }}
                />
              )}
            </MapView>

            {selectedAddress ? (
              <View style={[styles.selectedAddressContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="location-sharp" size={16} color={colors.primary} />
                <Text style={[styles.selectedAddressText, { color: colors.text }]} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              </View>
            ) : null}

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]} 
                onPress={confirmLocation}
              >
                <Text style={styles.modalButtonText}>Confirmer cette position</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10, padding: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', marginTop: 20 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 30 },
  locationCard: { borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  locationTitle: { fontSize: 16, fontWeight: '600' },
  locationButtonsContainer: { gap: 10 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  locationButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
  mapButtonText: { fontSize: 14, fontWeight: '600' },
  addressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 10 },
  addressText: { fontSize: 14, flex: 1 },
  locationActions: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
  actionButtonText: { fontSize: 12, fontWeight: '500' },
  soinCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2 },
  soinIcon: { width: 50, alignItems: 'center' },
  soinInfo: { flex: 1 },
  soinNom: { fontSize: 16, fontWeight: '600' },
  soinDescription: { fontSize: 12, marginTop: 4 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '95%', height: '85%', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  map: { flex: 1 },
  selectedAddressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, margin: 12, borderRadius: 12 },
  selectedAddressText: { fontSize: 12, flex: 1 },
  modalFooter: { padding: 16, borderTopWidth: 1 },
  modalButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});