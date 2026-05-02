import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [userType, setUserType] = useState('patient');
  const [proType, setProType] = useState('');
  const [specialiteTexte, setSpecialiteTexte] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [age, setAge] = useState(''); // ✅ AJOUT : âge pour patient
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [groupeSanguin, setGroupeSanguin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (userId: string, imageUri: string) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.log('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.log('Erreur upload:', err);
      return null;
    }
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

    // ✅ Si admin, vérifier que c'est un médecin et qu'il n'y a pas déjà un admin
    if (isAdmin) {
      if (proType !== 'medecin') {
        Alert.alert('Erreur', 'Seul un médecin peut créer un compte administrateur.');
        return;
      }
      
      const { count, error: countError } = await supabase
        .from('utilisateur')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (countError) {
        Alert.alert('Erreur', countError.message);
        return;
      }
      
      if (count && count > 0) {
        Alert.alert('Erreur', 'Un compte administrateur existe déjà. Un seul admin est autorisé.');
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
    if ((proType === 'medecin' || proType === 'infirmier') && !specialiteTexte.trim() && !isAdmin) {
      Alert.alert('Erreur', 'Veuillez saisir votre spécialité.');
      return;
    }

    setIsLoading(true);
    try {
      let finalRole = userType === 'patient' ? 'patient' : proType;
      if (isAdmin) {
        finalRole = 'admin';
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            telephone,
            role: finalRole,
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Erreur lors de la création');

      const userId = data.user.id;

      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadImage(userId, photo);
        console.log('Photo URL:', photoUrl);
      }

      const { error: userError } = await supabase
        .from('utilisateur')
        .insert({
          id: userId,
          nom,
          prenom,
          email,
          telephone,
          role: finalRole,
          statut: isAdmin ? 'actif' : (userType === 'patient' ? 'actif' : 'en_attente'),
          photo_url: photoUrl,
        });

      if (userError) throw userError;

      if (isAdmin) {
        const { data: typeData } = await supabase
          .from('type_soignant')
          .select('id')
          .eq('categorie', 'medecin')
          .single();

        let specialiteId = null;
        if (specialiteTexte.trim()) {
          let { data: existingSpecialite } = await supabase
            .from('specialite')
            .select('id')
            .eq('nom', specialiteTexte)
            .single();
          
          if (existingSpecialite) {
            specialiteId = existingSpecialite.id;
          } else {
            const { data: newSpecialite, error: specialiteError } = await supabase
              .from('specialite')
              .insert({ nom: specialiteTexte })
              .select()
              .single();
            
            if (!specialiteError && newSpecialite) {
              specialiteId = newSpecialite.id;
            }
          }
        }

        const { error: proError } = await supabase
          .from('professionnel_sante')
          .insert({
            utilisateur_id: userId,
            type_soignant_id: typeData?.id,
            specialite_id: specialiteId,
            disponibilite: 'disponible',
            admin: true,
          });

        if (proError) throw proError;
        Alert.alert('Succès', 'Compte administrateur créé avec succès !');
      } else if (userType === 'patient') {
        const { error: patientError } = await supabase
          .from('patient')
          .insert({
            utilisateur_id: userId,
            adresse: adresse || null,
            groupe_sangine: groupeSanguin,
            age: age, // ✅ AJOUT : âge du patient
          });

        if (patientError) throw patientError;
        Alert.alert('Succès', 'Compte patient créé avec succès !');
      } else {
        const { data: typeData } = await supabase
          .from('type_soignant')
          .select('id')
          .eq('categorie', proType)
          .single();

        let specialiteId = null;
        if (specialiteTexte.trim()) {
          let { data: existingSpecialite } = await supabase
            .from('specialite')
            .select('id')
            .eq('nom', specialiteTexte)
            .single();
          
          if (existingSpecialite) {
            specialiteId = existingSpecialite.id;
          } else {
            const { data: newSpecialite, error: specialiteError } = await supabase
              .from('specialite')
              .insert({ nom: specialiteTexte })
              .select()
              .single();
            
            if (!specialiteError && newSpecialite) {
              specialiteId = newSpecialite.id;
            }
          }
        }

        const { error: proError } = await supabase
          .from('professionnel_sante')
          .insert({
            utilisateur_id: userId,
            type_soignant_id: typeData?.id,
            specialite_id: specialiteId,
            disponibilite: 'disponible',
            admin: false,
          });

        if (proError) throw proError;
        Alert.alert('Information', 'Votre demande a été envoyée. Un administrateur va valider votre compte.');
      }

      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#844567" />
        </TouchableOpacity>
        
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Créer un compte</Text>

        <Text style={styles.label}>Vous êtes :</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity style={[styles.typeButton, userType === 'patient' && styles.typeButtonActive]} onPress={() => setUserType('patient')}>
            <Text style={[styles.typeText, userType === 'patient' && styles.typeTextActive]}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeButton, userType === 'pro' && styles.typeButtonActive]} onPress={() => setUserType('pro')}>
            <Text style={[styles.typeText, userType === 'pro' && styles.typeTextActive]}>Professionnel</Text>
          </TouchableOpacity>
        </View>

        {userType === 'pro' && (
          <>
            <Text style={styles.label}>Profession :</Text>
            <View style={styles.proTypeContainer}>
              <TouchableOpacity style={[styles.proTypeButton, proType === 'medecin' && styles.proTypeButtonActive]} onPress={() => setProType('medecin')}>
                <Text style={[styles.proTypeText, proType === 'medecin' && styles.proTypeTextActive]}>Médecin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.proTypeButton, proType === 'infirmier' && styles.proTypeButtonActive]} onPress={() => setProType('infirmier')}>
                <Text style={[styles.proTypeText, proType === 'infirmier' && styles.proTypeTextActive]}>Infirmier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.proTypeButton, proType === 'aide-soignant' && styles.proTypeButtonActive]} onPress={() => setProType('aide-soignant')}>
                <Text style={[styles.proTypeText, proType === 'aide-soignant' && styles.proTypeTextActive]}>Aide-soignant</Text>
              </TouchableOpacity>
            </View>

            {proType === 'medecin' && (
              <TouchableOpacity style={styles.adminCheckbox} onPress={() => setIsAdmin(!isAdmin)}>
                <Ionicons name={isAdmin ? 'checkbox' : 'square-outline'} size={24} color="#844567" />
                <Text style={styles.adminCheckboxText}>Créer un compte administrateur</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#ff8800" />
                <Text style={styles.infoText}>Un seul compte administrateur est autorisé. Vous serez connecté directement comme admin.</Text>
              </View>
            )}

            {(proType === 'medecin' || proType === 'infirmier') && (
              <View style={styles.inputContainer}>
                <Ionicons name="medkit-outline" size={20} color="#666" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Spécialité (ex: Généraliste, Cardiologue...)"
                  value={specialiteTexte}
                  onChangeText={setSpecialiteTexte}
                />
              </View>
            )}
          </>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Nom" value={nom} onChangeText={setNom} />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Prénom" value={prenom} onChangeText={setPrenom} />
        </View>

        {userType === 'patient' && (
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Âge"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Téléphone" value={telephone} onChangeText={setTelephone} />
        </View>

        {userType === 'patient' && (
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
            <TextInput style={styles.input} placeholder="Adresse" value={adresse} onChangeText={setAdresse} />
          </View>
        )}

        {userType === 'patient' && (
          <View style={styles.inputContainer}>
            <Ionicons name="heart-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Groupe sanguin (A+, A-, B+, B-, AB+, AB-, O+, O-)"
              value={groupeSanguin}
              onChangeText={setGroupeSanguin}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Confirmer" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>

        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.photoButtonText}>{photo ? 'Changer la photo' : 'Ajouter une photo'}</Text>
        </TouchableOpacity>
        {photo && (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        )}

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Création...' : 'S\'inscrire'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.link}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, padding: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  logo: { width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#844567' },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 10 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, gap: 10 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#844567', borderColor: '#844567' },
  typeText: { fontSize: 16, color: '#333' }, typeTextActive: { color: '#fff' },
  proTypeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  proTypeButton: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  proTypeButtonActive: { backgroundColor: '#5aadbf', borderColor: '#5aadbf' },
  proTypeText: { fontSize: 14, color: '#333' }, proTypeTextActive: { color: '#fff' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, paddingHorizontal: 10 },
  icon: { marginRight: 10 }, input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  photoButton: { backgroundColor: '#844567', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginBottom: 15, marginTop: 10, gap: 8 },
  photoButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  photoPreview: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 15 },
  button: { backgroundColor: '#844567', paddingVertical: 14, borderRadius: 8, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }, 
  link: { color: '#5aadbf', fontWeight: '600' },
  adminCheckbox: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, padding: 5 },
  adminCheckboxText: { marginLeft: 10, fontSize: 16, color: '#844567' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3e0', padding: 10, borderRadius: 8, marginVertical: 10, gap: 8 },
  infoText: { fontSize: 12, color: '#ff8800', flex: 1 },
});