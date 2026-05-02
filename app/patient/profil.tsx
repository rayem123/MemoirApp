import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfilScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Informations utilisateur (modifiables)
  const [userInfo, setUserInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });
  
  // Informations patient (modifiables)
  const [patientInfo, setPatientInfo] = useState({
    adresse: '',
    age: '',
    groupe_sangine: '',
  });
  
  const [maladieChronique, setMaladieChronique] = useState(false);
  const [maladies, setMaladies] = useState<string[]>([]);
  const [showMaladies, setShowMaladies] = useState(false);

  const groupesSanguins = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const maladiesOptions = [
    'Diabète', 'Hypertension', 'Asthme', 'Insuffisance cardiaque',
    'Arthrite', 'Dépression', 'Maladie de Crohn'
  ];

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    
    // Charger les infos utilisateur depuis profile
    if (profile) {
      setUserInfo({
        nom: profile.nom || '',
        prenom: profile.prenom || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
      });
      setPhoto(profile.photo_url);
    }
    
    // Charger les infos patient
    const { data, error } = await supabase
      .from('patient')
      .select('*')
      .eq('utilisateur_id', user?.id)
      .single();

    if (!error && data) {
      setPatientInfo({
        adresse: data.adresse || '',
        age: data.age || '',
        groupe_sangine: data.groupe_sangine || '',
      });
      
      if (data.maladies_chronique) {
        const maladiesList = JSON.parse(data.maladies_chronique || '[]');
        setMaladies(maladiesList);
        setMaladieChronique(maladiesList.length > 0);
      }
    }
    
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
      const fileExt = result.assets[0].uri.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });
      
      if (!error) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        await supabase.from('utilisateur').update({ photo_url: urlData.publicUrl }).eq('id', user?.id);
        refreshProfile();
      }
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

      if (userError) throw userError;

      // 2. Mettre à jour la table patient
      const { error: patientError } = await supabase
        .from('patient')
        .upsert({
          utilisateur_id: user?.id,
          adresse: patientInfo.adresse,
          age: patientInfo.age,
          groupe_sangine: patientInfo.groupe_sangine,
          maladies_chronique: JSON.stringify(maladies),
        })
        .eq('utilisateur_id', user?.id);

      if (patientError) throw patientError;

      // 3. Rafraîchir le profil
      await refreshProfile();
      
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#844567" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Mon Profil</Text>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>
                {userInfo.prenom?.charAt(0)}{userInfo.nom?.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.changePhotoText}>Changer la photo</Text>
        </TouchableOpacity>

        {/* Informations personnelles modifiables */}
        <Text style={styles.sectionTitle}>Informations personnelles</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={userInfo.nom}
            onChangeText={(text) => setUserInfo({...userInfo, nom: text})}
            placeholder="Votre nom"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            value={userInfo.prenom}
            onChangeText={(text) => setUserInfo({...userInfo, prenom: text})}
            placeholder="Votre prénom"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={userInfo.email}
            onChangeText={(text) => setUserInfo({...userInfo, email: text})}
            placeholder="Votre email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={userInfo.telephone}
            onChangeText={(text) => setUserInfo({...userInfo, telephone: text})}
            placeholder="Votre téléphone"
            keyboardType="phone-pad"
          />
        </View>

        {/* Informations médicales modifiables */}
        <Text style={styles.sectionTitle}>Informations médicales</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.input}
            value={patientInfo.adresse}
            onChangeText={(text) => setPatientInfo({...patientInfo, adresse: text})}
            placeholder="Votre adresse"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Âge</Text>
          <TextInput
            style={styles.input}
            value={patientInfo.age}
            onChangeText={(text) => setPatientInfo({...patientInfo, age: text})}
            placeholder="Votre âge"
            keyboardType="numeric"
          />
        </View>

        {/* Groupe sanguin */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Groupe sanguin</Text>
          <View style={styles.groupeContainer}>
            {groupesSanguins.map((groupe) => (
              <TouchableOpacity
                key={groupe}
                style={[
                  styles.groupeButton,
                  patientInfo.groupe_sangine === groupe && styles.groupeButtonActive
                ]}
                onPress={() => setPatientInfo({...patientInfo, groupe_sangine: groupe})}
              >
                <Text style={[
                  styles.groupeButtonText,
                  patientInfo.groupe_sangine === groupe && styles.groupeButtonTextActive
                ]}>{groupe}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Maladies chroniques */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Maladie chronique ?</Text>
          <Switch
            value={maladieChronique}
            onValueChange={(value) => {
              setMaladieChronique(value);
              if (!value) setMaladies([]);
            }}
            trackColor={{ false: '#767577', true: '#5aadbf' }}
            thumbColor={maladieChronique ? '#844567' : '#f4f3f4'}
          />
        </View>

        {maladieChronique && (
          <View style={styles.maladiesContainer}>
            <TouchableOpacity style={styles.maladiesHeader} onPress={() => setShowMaladies(!showMaladies)}>
              <Text style={styles.maladiesHeaderText}>
                {maladies.length > 0 ? `${maladies.length} maladie(s) sélectionnée(s)` : 'Sélectionner vos maladies'}
              </Text>
              <Ionicons name={showMaladies ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>
            {showMaladies && (
              <View style={styles.maladiesList}>
                {maladiesOptions.map((maladie) => (
                  <TouchableOpacity key={maladie} style={styles.maladieItem} onPress={() => toggleMaladie(maladie)}>
                    <Ionicons name={maladies.includes(maladie) ? 'checkbox' : 'square-outline'} size={20} color={maladies.includes(maladie) ? '#844567' : '#666'} />
                    <Text style={styles.maladieText}>{maladie}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Lien vers carnet de santé */}
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/patient/carnet')}>
          <Ionicons name="heart-outline" size={24} color="#844567" />
          <Text style={styles.linkButtonText}>Mon carnet de santé</Text>
        </TouchableOpacity>

        {/* Bouton enregistrer */}
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#844567' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#844567' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#844567', marginTop: 20, marginBottom: 15 },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
  placeholderImage: { backgroundColor: '#844567' },
  placeholderText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  changePhotoText: { color: '#5aadbf', fontSize: 16 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  groupeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  groupeButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  groupeButtonActive: { backgroundColor: '#844567', borderColor: '#844567' },
  groupeButtonText: { fontSize: 14, color: '#333' },
  groupeButtonTextActive: { color: '#fff' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 5 },
  switchLabel: { fontSize: 16, color: '#333' },
  maladiesContainer: { marginBottom: 20, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  maladiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  maladiesHeaderText: { fontSize: 16, color: '#333' },
  maladiesList: { marginTop: 10 },
  maladieItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  maladieText: { marginLeft: 10, fontSize: 16, color: '#333' },
  linkButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  linkButtonText: { marginLeft: 10, fontSize: 16, color: '#844567', fontWeight: '500' },
  button: { backgroundColor: '#844567', paddingVertical: 14, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});