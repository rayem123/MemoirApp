import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [userType, setUserType] = useState('patient');
  const [proType, setProType] = useState('');
  const [specialiteTexte, setSpecialiteTexte] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [groupeSanguin, setGroupeSanguin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
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
        setPhoto(imageUrl);
      }
    }
  };

  const getOrCreateSpecialite = async (nomSpecialite: string): Promise<string | null> => {
    if (!nomSpecialite.trim()) return null;
    
    const { data: existing } = await supabase
      .from('specialite')
      .select('id')
      .eq('nom', nomSpecialite.trim())
      .maybeSingle();
    
    if (existing) return existing.id;
    
    const { data: newSpecialite, error: createError } = await supabase
      .from('specialite')
      .insert({ nom: nomSpecialite.trim() })
      .select()
      .single();
    
    if (createError) return null;
    return newSpecialite.id;
  };

  const handleSignup = async () => {
    if (!nom || !prenom || !email || !telephone || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont obligatoires.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (isAdmin) {
      if (proType !== 'medecin') {
        Alert.alert('Erreur', 'Seul un médecin peut créer un compte administrateur.');
        return;
      }
      
      const { count } = await supabase
        .from('utilisateur')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (count && count > 0) {
        Alert.alert('Erreur', 'Un compte administrateur existe déjà.');
        return;
      }
    }

    if (userType === 'patient' && !groupeSanguin) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre groupe sanguin.');
      return;
    }
    if (userType === 'patient' && !age) {
      Alert.alert('Erreur', 'Veuillez saisir votre âge.');
      return;
    }
    
    if (userType === 'pro' && !proType && !isAdmin) {
      Alert.alert('Erreur', 'Veuillez sélectionner votre profession.');
      return;
    }

    setIsLoading(true);
    
    try {
      let finalRole = userType === 'patient' ? 'patient' : proType;
      if (isAdmin) finalRole = 'admin';
      
      let finalStatut = 'actif';
      if (!isAdmin && userType === 'pro') finalStatut = 'en_attente';
      
      // ÉTAPE 1: Créer le compte Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom, prenom, telephone, role: finalRole } }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      const userId = authData.user.id;

      // ÉTAPE 2: Insérer avec la photo en base64 directement
      const { error: userError } = await supabase
        .from('utilisateur')
        .insert({
          id: userId,
          nom,
          prenom,
          email,
          telephone,
          role: finalRole,
          statut: finalStatut,
          photo_url: photo || null,
        });

      if (userError) throw userError;

      // ÉTAPE 3: Insérer dans les tables spécifiques
      if (isAdmin || userType === 'pro') {
        const specialiteId = await getOrCreateSpecialite(specialiteTexte);
        
        const { error: proError } = await supabase
          .from('professionnel_sante')
          .insert({
            utilisateur_id: userId,
            specialite_id: specialiteId,
            disponibilite: 'disponible',
            admin: isAdmin || false,
          });

        if (proError) throw proError;
        
        if (isAdmin) {
          Alert.alert('Succès', 'Compte administrateur créé avec succès !');
        } else {
          Alert.alert('Information', 'Votre demande a été envoyée. Un administrateur va valider votre compte.');
        }
        
      } else if (userType === 'patient') {
        const { error: patientError } = await supabase
          .from('patient')
          .insert({
            utilisateur_id: userId,
            adresse: adresse || null,
            groupe_sangine: groupeSanguin,
            age: age,
          });

        if (patientError) throw patientError;
        Alert.alert('Succès', 'Compte patient créé avec succès !');
      }

      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
      
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
        <Text style={[styles.title, { color: colors.primary }]}>Créer un compte</Text>

        <Text style={[styles.label, { color: colors.text }]}>Vous êtes :</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity 
            style={[styles.typeButton, { borderColor: colors.border, backgroundColor: colors.surface }, userType === 'patient' && styles.typeButtonActive]} 
            onPress={() => setUserType('patient')}
          >
            <Text style={[styles.typeText, { color: colors.text }, userType === 'patient' && styles.typeTextActive]}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, { borderColor: colors.border, backgroundColor: colors.surface }, userType === 'pro' && styles.typeButtonActive]} 
            onPress={() => setUserType('pro')}
          >
            <Text style={[styles.typeText, { color: colors.text }, userType === 'pro' && styles.typeTextActive]}>Professionnel</Text>
          </TouchableOpacity>
        </View>

        {userType === 'pro' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Profession :</Text>
            <View style={styles.proTypeContainer}>
              <TouchableOpacity 
                style={[styles.proTypeButton, { borderColor: colors.border, backgroundColor: colors.surface }, proType === 'medecin' && styles.proTypeButtonActive]} 
                onPress={() => setProType('medecin')}
              >
                <Text style={[styles.proTypeText, { color: colors.text }, proType === 'medecin' && styles.proTypeTextActive]}>Médecin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.proTypeButton, { borderColor: colors.border, backgroundColor: colors.surface }, proType === 'infirmier' && styles.proTypeButtonActive]} 
                onPress={() => setProType('infirmier')}
              >
                <Text style={[styles.proTypeText, { color: colors.text }, proType === 'infirmier' && styles.proTypeTextActive]}>Infirmier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.proTypeButton, { borderColor: colors.border, backgroundColor: colors.surface }, proType === 'aide-soignant' && styles.proTypeButtonActive]} 
                onPress={() => setProType('aide-soignant')}
              >
                <Text style={[styles.proTypeText, { color: colors.text }, proType === 'aide-soignant' && styles.proTypeTextActive]}>Aide-soignant</Text>
              </TouchableOpacity>
            </View>

            {proType === 'medecin' && (
              <TouchableOpacity style={styles.adminCheckbox} onPress={() => setIsAdmin(!isAdmin)}>
                <Ionicons name={isAdmin ? 'checkbox-outline' : 'square-outline'} size={24} color={colors.primary} />
                <Text style={[styles.adminCheckboxText, { color: colors.text }]}>Créer un compte administrateur</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#ff8800" />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>Un seul compte administrateur est autorisé.</Text>
              </View>
            )}

            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="medkit-outline" size={20} color={colors.textSecondary} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Spécialité (ex: Généraliste, Cardiologue...)"
                placeholderTextColor={colors.textSecondary}
                value={specialiteTexte}
                onChangeText={setSpecialiteTexte}
              />
            </View>
          </>
        )}

        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput style={[styles.input, { color: colors.text }]} placeholder="Nom" placeholderTextColor={colors.textSecondary} value={nom} onChangeText={setNom} />
        </View>
        
        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput style={[styles.input, { color: colors.text }]} placeholder="Prénom" placeholderTextColor={colors.textSecondary} value={prenom} onChangeText={setPrenom} />
        </View>

        {userType === 'patient' && (
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Âge"
              placeholderTextColor={colors.textSecondary}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput 
            style={[styles.input, { color: colors.text }]} 
            placeholder="Email" 
            placeholderTextColor={colors.textSecondary} 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
        </View>
        
        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput 
            style={[styles.input, { color: colors.text }]} 
            placeholder="Téléphone" 
            placeholderTextColor={colors.textSecondary} 
            value={telephone} 
            onChangeText={setTelephone} 
            keyboardType="phone-pad"
          />
        </View>

        {userType === 'patient' && (
          <>
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.icon} />
              <TextInput 
                style={[styles.input, { color: colors.text }]} 
                placeholder="Adresse" 
                placeholderTextColor={colors.textSecondary} 
                value={adresse} 
                onChangeText={setAdresse} 
              />
            </View>

            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="heart-outline" size={20} color={colors.textSecondary} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Groupe sanguin (A+, A-, B+, B-, AB+, AB-, O+, O-)"
                placeholderTextColor={colors.textSecondary}
                value={groupeSanguin}
                onChangeText={setGroupeSanguin}
                autoCapitalize="characters"
              />
            </View>
          </>
        )}

        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput 
            style={[styles.input, { color: colors.text }]} 
            placeholder="Mot de passe (min. 6 caractères)" 
            placeholderTextColor={colors.textSecondary} 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />
        </View>
        
        <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
          <TextInput 
            style={[styles.input, { color: colors.text }]} 
            placeholder="Confirmer le mot de passe" 
            placeholderTextColor={colors.textSecondary} 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            secureTextEntry 
          />
        </View>

        {/* Section photo de profil */}
        <Text style={[styles.label, { color: colors.text, marginTop: 10 }]}>Photo de profil (optionnel)</Text>
        <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.primary }]} onPress={pickImage} disabled={uploadingPhoto}>
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.photoButtonText}>
            {photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Text>
        </TouchableOpacity>
        
        {photo && (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.removePhotoButton} onPress={() => setPhoto(null)}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={handleSignup} 
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Création en cours...' : "S'inscrire"}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: colors.text }}>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[styles.link, { color: '#5aadbf' }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, padding: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10, padding: 8 },
  logo: { width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, gap: 10 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#844567', borderColor: '#844567' },
  typeText: { fontSize: 16 }, 
  typeTextActive: { color: '#fff' },
  proTypeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, gap: 10 },
  proTypeButton: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  proTypeButtonActive: { backgroundColor: '#5aadbf', borderColor: '#5aadbf' },
  proTypeText: { fontSize: 14 }, 
  proTypeTextActive: { color: '#fff' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10 },
  icon: { marginRight: 10 }, 
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginBottom: 15, marginTop: 10, gap: 8 },
  photoButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  photoPreviewContainer: { position: 'relative', alignSelf: 'center', marginBottom: 15 },
  photoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#5aadbf' },
  removePhotoButton: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 12 },
  button: { paddingVertical: 14, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }, 
  link: { fontWeight: '600' },
  adminCheckbox: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, padding: 5, gap: 10 },
  adminCheckboxText: { fontSize: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginVertical: 10, gap: 8 },
  infoText: { fontSize: 12, flex: 1 },
});