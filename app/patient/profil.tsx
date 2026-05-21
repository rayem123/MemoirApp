import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfilScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  
  const [userInfo, setUserInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });
  
  const [patientInfo, setPatientInfo] = useState({
    adresse: '',
    age: '',
    groupe_sangine: '',
  });
  
  const [maladieChronique, setMaladieChronique] = useState(false);
  const [maladies, setMaladies] = useState<string[]>([]);
  const [showMaladies, setShowMaladies] = useState(false);

  const maladiesOptions = [
    'Diabète', 'Hypertension', 'Asthme', 'Insuffisance cardiaque',
    'Arthrite', 'Dépression', 'Maladie de Crohn'
  ];

  // ✅ Recharger les données à chaque focus de l'écran
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadAllData();
      }
    }, [user])
  );

  const loadAllData = async () => {
    setLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, email, telephone, photo_url')
        .eq('id', user?.id)
        .single();

      if (userData) {
        setUserInfo({
          nom: userData.nom || '',
          prenom: userData.prenom || '',
          email: userData.email || '',
          telephone: userData.telephone || '',
        });
        setPhoto(userData.photo_url);
      }
      
      const { data: patientData, error: patientError } = await supabase
        .from('patient')
        .select('adresse, age, groupe_sangine, maladies_chronique')
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (patientData) {
        setPatientInfo({
          adresse: patientData.adresse || '',
          age: patientData.age || '',
          groupe_sangine: patientData.groupe_sangine || '',
        });
        
        if (patientData.maladies_chronique) {
          try {
            const maladiesList = JSON.parse(patientData.maladies_chronique || '[]');
            setMaladies(maladiesList);
            setMaladieChronique(maladiesList.length > 0);
          } catch (e) {
            setMaladies([]);
            setMaladieChronique(false);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0]) {
      const base64Image = result.assets[0].base64;
      if (base64Image) {
        uploadImageToDatabase(`data:image/jpeg;base64,${base64Image}`);
      }
    }
  };

  const uploadImageToDatabase = async (base64Image: string) => {
    setUploadingPhoto(true);
    
    try {
      const { error: updateError } = await supabase
        .from('utilisateur')
        .update({ photo_url: base64Image })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      setPhoto(base64Image);
      await refreshProfile();
      
      Alert.alert('Succès', 'Photo de profil mise à jour');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleMaladie = (maladie: string) => {
    if (maladies.includes(maladie)) {
      setMaladies(maladies.filter((m) => m !== maladie));
    } else {
      setMaladies([...maladies, maladie]);
    }
  };

  const handleSave = async () => {
    try {
      const maladiesToSave = maladieChronique ? maladies : [];
      
      const { error } = await supabase
        .from('patient')
        .update({
          maladies_chronique: JSON.stringify(maladiesToSave),
        })
        .eq('utilisateur_id', user?.id);
      
      if (error) throw error;
      
      Alert.alert('Succès', maladieChronique ? 'Maladies mises à jour' : 'Maladies supprimées');
      
      await loadAllData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const getInitials = () => {
    return `${userInfo.prenom?.charAt(0) || ''}${userInfo.nom?.charAt(0) || ''}`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Chargement de votre profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.primary }]}>Mon Profil</Text>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} disabled={uploadingPhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage, { backgroundColor: colors.primary }]}>
              <Text style={styles.placeholderText}>{getInitials()}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
          {uploadingPhoto && <ActivityIndicator size="small" color={colors.primary} style={styles.uploadingIndicator} />}
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>Changer la photo</Text>
        </TouchableOpacity>

        {/* Informations personnelles */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📋 Informations personnelles</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nom :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.nom || 'Non renseigné'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Prénom :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.prenom || 'Non renseigné'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.email || 'Non renseigné'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Téléphone :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.telephone || 'Non renseigné'}</Text>
          </View>
        </View>

        {/* Informations médicales */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🏥 Informations médicales</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Adresse :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.adresse || 'Non renseignée'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Âge :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.age || 'Non renseigné'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Groupe sanguin :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{patientInfo.groupe_sangine || 'Non renseigné'}</Text>
          </View>
        </View>

        {/* Maladies chroniques */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🩺 Maladies chroniques</Text>
        
        <View style={[styles.switchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Je souffre d'une maladie chronique</Text>
          <Switch
            value={maladieChronique}
            onValueChange={(value) => {
              setMaladieChronique(value);
              if (!value) setMaladies([]);
            }}
            trackColor={{ false: '#767577', true: '#5aadbf' }}
            thumbColor={maladieChronique ? colors.primary : '#f4f3f4'}
          />
        </View>

        {maladieChronique && (
          <View style={[styles.maladiesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.maladiesHeader} onPress={() => setShowMaladies(!showMaladies)}>
              <Text style={[styles.maladiesHeaderText, { color: colors.text }]}>
                {maladies.length > 0 ? `✓ ${maladies.length} maladie(s) sélectionnée(s)` : 'Sélectionnez vos maladies'}
              </Text>
              <Ionicons name={showMaladies ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showMaladies && (
              <View style={styles.maladiesList}>
                {maladiesOptions.map((maladie) => (
                  <TouchableOpacity key={maladie} style={[styles.maladieItem, { borderBottomColor: colors.border }]} onPress={() => toggleMaladie(maladie)}>
                    <Ionicons 
                      name={maladies.includes(maladie) ? 'checkbox' : 'square-outline'} 
                      size={22} 
                      color={maladies.includes(maladie) ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[styles.maladieText, { color: colors.text }, maladies.includes(maladie) && styles.maladieTextSelected]}>
                      {maladie}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Lien vers carnet de santé */}
        <TouchableOpacity style={[styles.linkButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/patient/carnet')}>
          <Ionicons name="heart-outline" size={24} color={colors.primary} />
          <Text style={[styles.linkButtonText, { color: colors.primary }]}>📊 Mon carnet de santé</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Bouton enregistrer */}
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.buttonText}>💾 Enregistrer les maladies</Text>
        </TouchableOpacity>

        {/* Message informatif */}
        <View style={[styles.noteBox, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.primary }]}>
            Les informations personnelles et médicales sont fournies par l'administrateur.
            Seules les maladies chroniques peuvent être modifiées ici.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    paddingVertical: 20 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 20 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginTop: 20, 
    marginBottom: 12 
  },
  
  photoContainer: { 
    alignItems: 'center', 
    marginBottom: 20,
    position: 'relative'
  },
  profileImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    marginBottom: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  placeholderImage: { 
    backgroundColor: '#844567' 
  },
  placeholderText: { 
    color: '#fff', 
    fontSize: 36, 
    fontWeight: 'bold' 
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 10,
    right: 0,
    backgroundColor: '#844567',
    borderRadius: 15,
    padding: 4,
  },
  uploadingIndicator: {
    marginTop: 5
  },
  changePhotoText: { 
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5
  },
  
  infoCard: { 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 5,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  infoRow: { 
    flexDirection: 'row', 
    marginBottom: 12, 
    paddingBottom: 8, 
    borderBottomWidth: 1 
  },
  infoLabel: { 
    width: 120, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  infoValue: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '500'
  },
  
  switchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 15, 
    paddingHorizontal: 5,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  switchLabel: { 
    fontSize: 15, 
    fontWeight: '500'
  },
  maladiesContainer: { 
    marginBottom: 20, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12
  },
  maladiesHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  maladiesHeaderText: { 
    fontSize: 15, 
    fontWeight: '500'
  },
  maladiesList: { 
    marginTop: 12 
  },
  maladieItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  maladieText: { 
    marginLeft: 12, 
    fontSize: 15 
  },
  maladieTextSelected: {
    fontWeight: 'bold'
  },
  
  linkButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 15, 
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1
  },
  linkButtonText: { 
    flex: 1,
    marginLeft: 12, 
    fontSize: 16, 
    fontWeight: '500' 
  },
  button: { 
    paddingVertical: 14, 
    borderRadius: 12, 
    marginTop: 20, 
    alignItems: 'center'
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    marginBottom: 30,
    gap: 10
  },
  noteText: { 
    flex: 1,
    fontSize: 12, 
    lineHeight: 18,
    fontStyle: 'italic'
  },
});