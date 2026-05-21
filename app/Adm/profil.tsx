import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminProfilScreen() {
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
  
  const [proInfo, setProInfo] = useState({
    specialite: '',
    type_soignant: '',
  });

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
      const { data: userData } = await supabase
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
      
      const { data: proData } = await supabase
        .from('professionnel_sante')
        .select(`
          specialite:specialite_id (nom),
          type_soignant:type_soignant_id (categorie)
        `)
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (proData) {
        setProInfo({
          specialite: proData.specialite?.nom || '',
          type_soignant: proData.type_soignant?.categorie || '',
        });
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
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie.');
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
      
      // ✅ Recharger les données après mise à jour
      await loadAllData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getInitials = () => {
    return `${userInfo.prenom?.charAt(0) || ''}${userInfo.nom?.charAt(0) || ''}`;
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
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>Mon Profil</Text>
          <TouchableOpacity onPress={() => router.push('/admin/modifier-profil')}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Photo avec bouton pour changer */}
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
        </TouchableOpacity>
        {uploadingPhoto && <ActivityIndicator size="small" color={colors.primary} style={styles.uploadingIndicator} />}

        {/* Badge Admin */}
        <View style={[styles.adminBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Administrateur</Text>
        </View>

        {/* Informations personnelles */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>📋 Informations personnelles</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nom :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.nom}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Prénom :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.prenom}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.email}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Téléphone :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.telephone || 'Non renseigné'}</Text>
          </View>
        </View>

        {/* Informations professionnelles (sans disponibilité) */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>👨‍⚕️ Informations professionnelles</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Rôle :</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Administrateur</Text>
          </View>
          {proInfo.type_soignant && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type :</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{proInfo.type_soignant}</Text>
            </View>
          )}
          {proInfo.specialite && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Spécialité :</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{proInfo.specialite}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold' },
  
  photoContainer: { 
    alignItems: 'center', 
    marginBottom: 16,
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
    marginTop: 5,
    alignSelf: 'center'
  },
  adminBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    alignSelf: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20, 
    marginBottom: 20, 
    gap: 8 
  },
  adminBadgeText: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginTop: 20, 
    marginBottom: 12 
  },
  infoCard: { 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 5, 
    borderWidth: 1 
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
});