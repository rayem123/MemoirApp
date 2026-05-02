import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function ProProfilScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const [nom, setNom] = useState(user?.nom || '');
  const [prenom, setPrenom] = useState(user?.prenom || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telephone, setTelephone] = useState(user?.telephone || '');
  const [specialite, setSpecialite] = useState(user?.specialite || '');
  const [photo, setPhoto] = useState<string | null>(null);

  const getRoleLabel = () => {
    switch(role) {
      case 'medecin': return 'Médecin';
      case 'infirmier': return 'Infirmier';
      case 'aide_soignant': return 'Aide-soignant';
      default: return 'Professionnel';
    }
  };

  const getTitle = () => {
    switch(role) {
      case 'medecin': return 'Dr.';
      case 'infirmier': return 'Inf.';
      case 'aide_soignant': return 'AS.';
      default: return '';
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleSave = () => {
    Alert.alert('Succès', 'Profil mis à jour');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil professionnel</Text>
      </View>

      <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>{prenom.charAt(0)}{nom.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.changePhotoText}>Changer la photo</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Titre :</Text>
          <Text style={styles.infoValue}>{getTitle()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rôle :</Text>
          <Text style={styles.infoValue}>{getRoleLabel()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom complet :</Text>
          <Text style={styles.infoValue}>{prenom} {nom}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Spécialité :</Text>
          <Text style={styles.infoValue}>{specialite || 'Non renseignée'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email :</Text>
          <Text style={styles.infoValue}>{email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Téléphone :</Text>
          <Text style={styles.infoValue}>{telephone}</Text>
        </View>
      </View>

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#844567',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    backgroundColor: '#844567',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  changePhotoText: {
    color: '#5aadbf',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#844567',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});