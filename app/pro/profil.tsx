import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

export default function ProProfilScreen() {
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
    role: '',
  });

  // ✅ Recharger les données à chaque focus de l'écran
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
  );

  const loadData = async () => {
    setLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('nom, prenom, email, telephone, photo_url, role')
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
        setProInfo(prev => ({ ...prev, role: userData.role || '' }));
      }
      
      const { data: proData, error: proError } = await supabase
        .from('professionnel_sante')
        .select('specialite_id')
        .eq('utilisateur_id', user?.id)
        .maybeSingle();

      if (proData && proData.specialite_id) {
        const { data: specialiteData } = await supabase
          .from('specialite')
          .select('nom')
          .eq('id', proData.specialite_id)
          .maybeSingle();
        
        if (specialiteData) {
          setProInfo(prev => ({ ...prev, specialite: specialiteData.nom }));
        }
      } else {
        setProInfo(prev => ({ ...prev, specialite: 'Non renseignée' }));
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
      
      // ✅ Recharger les données après mise à jour de la photo
      await loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getRoleLabel = () => {
    switch(proInfo.role) {
      case 'medecin': return 'Médecin';
      case 'infirmier': return 'Infirmier';
      case 'aide_soignant': return 'Aide-soignant';
      case 'admin': return 'Administrateur';
      default: return 'Professionnel de santé';
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Mon profil</Text>
        <TouchableOpacity onPress={() => router.push('/pro/modifier-profil')}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Section Photo */}
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
      </View>

      {/* Informations */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>👨‍⚕️ Rôle :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{getRoleLabel()}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>👤 Nom complet :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.prenom} {userInfo.nom}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>🎓 Spécialité :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{proInfo.specialite || 'Non renseignée'}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📧 Email :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.email}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📞 Téléphone :</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{userInfo.telephone || 'Non renseigné'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold' },
  
  photoSection: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#844567', borderRadius: 15, padding: 4 },
  uploadingIndicator: { marginTop: 8 },
  
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1 },
  infoLabel: { width: 110, fontSize: 14 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500' },
});