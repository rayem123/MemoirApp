import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ModifierProfilScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Informations utilisateur
  const [userInfo, setUserInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });
  
  // Informations patient
  const [patientInfo, setPatientInfo] = useState({
    adresse: '',
    age: '',
    groupe_sangine: '',
  });

  const groupesSanguins = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Charger les infos utilisateur
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, email, telephone, photo_url')
        .eq('id', user?.id)
        .single();

      if (userError) {
        console.log('Erreur chargement utilisateur:', userError);
      } else if (userData) {
        setUserInfo({
          nom: userData.nom || '',
          prenom: userData.prenom || '',
          email: userData.email || '',
          telephone: userData.telephone || '',
        });
        setPhoto(userData.photo_url);
      }
      
      // Charger les infos patient
      const { data: patientData, error: patientError } = await supabase
        .from('patient')
        .select('adresse, age, groupe_sangine')
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (patientError) {
        console.log('Erreur chargement patient:', patientError);
      } else if (patientData) {
        setPatientInfo({
          adresse: patientData.adresse || '',
          age: patientData.age || '',
          groupe_sangine: patientData.groupe_sangine || '',
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour changer de photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = result.assets[0].base64;
      if (base64Image) {
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;
        uploadImageToDatabase(imageUrl);
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

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // 1. Mettre à jour la table utilisateur
      const { error: userError } = await supabase
        .from('utilisateur')
        .update({
          nom: userInfo.nom,
          prenom: userInfo.prenom,
          email: userInfo.email,
          telephone: userInfo.telephone,
        })
        .eq('id', user?.id);

      if (userError) {
        console.log('Erreur mise à jour utilisateur:', userError);
        throw userError;
      }

      // 2. Vérifier si une ligne patient existe
      const { data: existingPatient } = await supabase
        .from('patient')
        .select('id')
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (existingPatient) {
        // Mise à jour
        const { error: patientError } = await supabase
          .from('patient')
          .update({
            adresse: patientInfo.adresse,
            age: patientInfo.age,
            groupe_sangine: patientInfo.groupe_sangine,
          })
          .eq('utilisateur_id', user?.id);

        if (patientError) throw patientError;
      } else {
        // Insertion
        const { error: patientError } = await supabase
          .from('patient')
          .insert({
            utilisateur_id: user?.id,
            adresse: patientInfo.adresse,
            age: patientInfo.age,
            groupe_sangine: patientInfo.groupe_sangine,
          });

        if (patientError) throw patientError;
      }

      // 3. Rafraîchir le contexte
      await refreshProfile();
      
      Alert.alert('Succès', 'Profil modifié avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    return `${userInfo.prenom?.charAt(0) || ''}${userInfo.nom?.charAt(0) || ''}`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Section Photo */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🖼️ Photo de profil</Text>
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingPhoto}>
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
          </TouchableOpacity>
          {uploadingPhoto && <ActivityIndicator size="small" color={colors.primary} style={styles.uploadingIndicator} />}
          <Text style={[styles.photoHint, { color: colors.textSecondary }]}>Appuyez sur la photo pour la modifier</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📋 Informations personnelles</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Nom</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={userInfo.nom}
            onChangeText={(text) => setUserInfo({...userInfo, nom: text})}
            placeholder="Votre nom"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Prénom</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={userInfo.prenom}
            onChangeText={(text) => setUserInfo({...userInfo, prenom: text})}
            placeholder="Votre prénom"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={userInfo.email}
            onChangeText={(text) => setUserInfo({...userInfo, email: text})}
            placeholder="Votre email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Téléphone</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={userInfo.telephone}
            onChangeText={(text) => setUserInfo({...userInfo, telephone: text})}
            placeholder="Votre téléphone"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🏥 Informations médicales</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={patientInfo.adresse}
            onChangeText={(text) => setPatientInfo({...patientInfo, adresse: text})}
            placeholder="Votre adresse"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Âge</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            value={patientInfo.age}
            onChangeText={(text) => setPatientInfo({...patientInfo, age: text})}
            placeholder="Votre âge"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Groupe sanguin</Text>
          <View style={styles.groupeContainer}>
            {groupesSanguins.map((groupe) => (
              <TouchableOpacity
                key={groupe}
                style={[
                  styles.groupeButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  patientInfo.groupe_sangine === groupe && styles.groupeButtonActive
                ]}
                onPress={() => setPatientInfo({...patientInfo, groupe_sangine: groupe})}
              >
                <Text style={[
                  styles.groupeButtonText,
                  { color: colors.text },
                  patientInfo.groupe_sangine === groupe && styles.groupeButtonTextActive
                ]}>{groupe}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#4CAF50' }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>
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
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginTop: 20, 
    marginBottom: 15 
  },
  
  // Styles pour la photo
  photoSection: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  profileImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 50 
  },
  placeholderImage: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  placeholderText: { 
    color: '#fff', 
    fontSize: 36, 
    fontWeight: 'bold' 
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#844567',
    borderRadius: 15,
    padding: 4,
  },
  uploadingIndicator: {
    marginTop: 8
  },
  photoHint: { 
    fontSize: 12, 
    marginTop: 8 
  },
  
  inputGroup: { 
    marginBottom: 15 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '500', 
    marginBottom: 5 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16 
  },
  groupeContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginTop: 5 
  },
  groupeButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  groupeButtonActive: { 
    backgroundColor: '#844567', 
    borderColor: '#844567' 
  },
  groupeButtonText: { 
    fontSize: 14 
  },
  groupeButtonTextActive: { 
    color: '#fff' 
  },
  saveButton: { 
    paddingVertical: 14, 
    borderRadius: 12, 
    marginTop: 30, 
    marginBottom: 30,
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});
