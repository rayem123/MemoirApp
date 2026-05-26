import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const typesSoins = [
  { id: 'consultation', nom: 'Consultation médicale', icon: 'medkit-outline', description: 'Consultation avec un médecin généraliste ou spécialiste' },
  { id: 'soin-plaie', nom: 'Soin de plaie', icon: 'bandage-outline', description: 'Pansement, nettoyage et suivi de plaies' },
  { id: 'injection', nom: 'Injection', icon: 'syringe-outline', description: 'Piqûre, vaccin, rappel' },
  { id: 'perfusion', nom: 'Perfusion', icon: 'water-outline', description: 'Perfusion de médicaments ou de solutés' },
  { id: 'prelevement', nom: 'Prélèvement sanguin', icon: 'flask-outline', description: 'Prise de sang, analyse' },
  { id: 'surveillance', nom: 'Surveillance post-hospitalisation', icon: 'heart-outline', description: 'Suivi après sortie d\'hospitalisation' },
  { id: 'reeducation', nom: 'Rééducation', icon: 'fitness-outline', description: 'Séances de kinésithérapie ou rééducation' },
];

// Position par défaut (Annaba, Algérie) - utilisée uniquement pour initialiser la carte
const DEFAULT_LOCATION = {
  latitude: 36.7519,
  longitude: 7.7739,
};

export default function ChoixSoinsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  
  // États pour la carte
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLat, setSelectedLat] = useState(DEFAULT_LOCATION.latitude);
  const [selectedLng, setSelectedLng] = useState(DEFAULT_LOCATION.longitude);
  const [selectedAddress, setSelectedAddress] = useState(''); // Commence vide

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

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation(currentLocation);
      setSelectedLat(currentLocation.coords.latitude);
      setSelectedLng(currentLocation.coords.longitude);
      
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        let formattedAddress = '';
        
        if (addr.street) formattedAddress += addr.street + ' ';
        if (addr.streetNumber) formattedAddress += addr.streetNumber + ', ';
        if (addr.postalCode) formattedAddress += addr.postalCode + ' ';
        if (addr.city) formattedAddress += addr.city;
        if (addr.region) formattedAddress += ', ' + addr.region;
        if (addr.country) formattedAddress += ', ' + addr.country;
        
        setAddress(formattedAddress.trim() || `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`);
        setSelectedAddress(formattedAddress.trim());
      } else {
        const coordAddress = `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`;
        setAddress(coordAddress);
        setSelectedAddress(coordAddress);
      }
      
      setHasLocation(true);
      Alert.alert('📍 Position trouvée', 'Votre position a été enregistrée avec succès.');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de récupérer votre position. Vérifiez que le GPS est activé.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Ouvrir la carte pour choisir une position
  const openMapSelector = () => {
    // Utiliser la position actuelle si disponible, sinon la position par défaut
    if (hasLocation && location) {
      setSelectedLat(location.coords.latitude);
      setSelectedLng(location.coords.longitude);
    } else {
      setSelectedLat(DEFAULT_LOCATION.latitude);
      setSelectedLng(DEFAULT_LOCATION.longitude);
    }
    setShowMapModal(true);
  };

  // Fonction appelée quand l'utilisateur clique sur la carte
  const handleMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setSelectedLat(data.lat);
        setSelectedLng(data.lng);
        
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: data.lat,
          longitude: data.lng,
        });
        
        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          let formattedAddress = '';
          
          if (addr.street) formattedAddress += addr.street + ' ';
          if (addr.streetNumber) formattedAddress += addr.streetNumber + ', ';
          if (addr.postalCode) formattedAddress += addr.postalCode + ' ';
          if (addr.city) formattedAddress += addr.city;
          if (addr.region) formattedAddress += ', ' + addr.region;
          if (addr.country) formattedAddress += ', ' + addr.country;
          
          setSelectedAddress(formattedAddress.trim() || `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
        } else {
          setSelectedAddress(`${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
        }
      }
    } catch (error) {
      console.error('Erreur parsing message:', error);
    }
  };

  // Confirmer la position sélectionnée
  const confirmLocation = () => {
    const newLocation = {
      coords: {
        latitude: selectedLat,
        longitude: selectedLng,
      }
    };
    setLocation(newLocation);
    setAddress(selectedAddress);
    setHasLocation(true);
    setShowMapModal(false);
    Alert.alert('✅ Succès', 'Position sélectionnée avec succès.');
  };

  // HTML de la carte Leaflet (OpenStreetMap)
  const getMapHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .info-panel {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: white;
            padding: 12px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            text-align: center;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #333;
          }
          .center-btn {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: #844567;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="info-panel" id="infoPanel">
          📍 Cliquez sur la carte ou glissez le marqueur pour sélectionner votre position
        </div>
        <button class="center-btn" onclick="centerOnMarker()">🎯 Centrer</button>
        <script>
          var lat = ${selectedLat};
          var lng = ${selectedLng};
          var map, marker;
          var positionChoisie = false;
          
          function initMap() {
            map = L.map('map').setView([lat, lng], 15);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
              subdomains: 'abcd',
              maxZoom: 19,
              minZoom: 1
            }).addTo(map);
            
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            
            marker.on('dragend', function(e) {
              var pos = e.target.getLatLng();
              updatePosition(pos.lat, pos.lng, true);
            });
            
            map.on('click', function(e) {
              updatePosition(e.latlng.lat, e.latlng.lng, true);
            });
            
            // Ne pas envoyer de position au démarrage
            updatePosition(lat, lng, false);
          }
          
          function updatePosition(lat, lng, envoyerMessage) {
            if (marker) {
              marker.setLatLng([lat, lng]);
            }
            document.getElementById('infoPanel').innerHTML = '📍 ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
            if (envoyerMessage === true) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: lat,
                lng: lng
              }));
            }
          }
          
          function centerOnMarker() {
            if (marker) {
              var pos = marker.getLatLng();
              map.setView([pos.lat, pos.lng], 15);
            }
          }
          
          window.onload = initMap;
        </script>
      </body>
      </html>
    `;
  };

  const handleSelectSoin = async (typeSoin) => {
    if (!hasLocation) {
      Alert.alert(
        '📍 Position requise',
        'Pour continuer, veuillez d\'abord partager votre position ou en sélectionner une sur la carte.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ma position', onPress: () => getCurrentLocation() },
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
    <>
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
            
            {hasLocation && address ? (
              <>
                <View style={styles.addressContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.smallButton, { borderColor: colors.border }]} 
                    onPress={getCurrentLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                        <Text style={[styles.smallButtonText, { color: colors.primary }]}>Actualiser</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallButton, { borderColor: colors.primary, borderWidth: 1 }]} 
                    onPress={openMapSelector}
                  >
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={[styles.smallButtonText, { color: colors.primary }]}>Changer sur carte</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.locationButton, { backgroundColor: colors.primary, flex: 1 }]} 
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
                  style={[styles.mapButton, { borderColor: colors.primary, borderWidth: 1, flex: 1 }]} 
                  onPress={openMapSelector}
                >
                  <Ionicons name="map-outline" size={20} color={colors.primary} />
                  <Text style={[styles.mapButtonText, { color: colors.primary }]}>Choisir sur carte</Text>
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
                <Ionicons name={soin.icon} size={32} color={colors.primary} />
              </View>
              <View style={styles.soinInfo}>
                <Text style={[styles.soinNom, { color: colors.text }]}>{soin.nom}</Text>
                <Text style={[styles.soinDescription, { color: colors.textSecondary }]}>{soin.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal Carte OpenStreetMap */}
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

            <WebView
              source={{ html: getMapHTML() }}
              style={styles.map}
              onMessage={handleMapMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />

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
                style={[styles.modalButton, { backgroundColor: selectedAddress ? colors.primary : '#ccc' }]} 
                onPress={confirmLocation}
                disabled={!selectedAddress}
              >
                <Text style={styles.modalButtonText}>
                  {selectedAddress ? 'Confirmer cette position' : 'Sélectionnez une position sur la carte'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  buttonRow: { flexDirection: 'row', gap: 10 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 8 },
  locationButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 8 },
  mapButtonText: { fontSize: 16, fontWeight: '600' },
  smallButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
  smallButtonText: { fontSize: 14, fontWeight: '500' },
  addressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 10 },
  addressText: { fontSize: 14, flex: 1, flexWrap: 'wrap' },
  soinCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  soinIcon: { width: 50, alignItems: 'center' },
  soinInfo: { flex: 1 },
  soinNom: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  soinDescription: { fontSize: 12 },
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