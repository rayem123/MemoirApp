import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function AddPostScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [professionnelId, setProfessionnelId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Récupérer l'utilisateur connecté et son professionnel_id
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('utilisateur')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(userData);
        
        // Récupérer le professionnel_id (nécessaire pour publication)
        if (userData?.role !== 'patient') {
          const { data: proData } = await supabase
            .from('professionnel_sante')
            .select('id')
            .eq('utilisateur_id', session.user.id)
            .single();
          if (proData) {
            setProfessionnelId(proData.id);
          }
        }
      }
    };
    getUser();
  }, []);

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
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;
    
    setIsUploading(true);
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const fileExt = image.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `publications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('publications')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.log('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('publications')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.log('Erreur upload:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un contenu pour votre publication');
      return;
    }

    if (!professionnelId && user?.role !== 'admin') {
      Alert.alert('Erreur', 'Vous devez être professionnel pour publier');
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Upload de l'image si elle existe
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
      }

      // 2. Créer la publication
      const { error: insertError } = await supabase
        .from('publication')
        .insert({
          contenu: content,
          image_url: imageUrl,
          professionnel_id: professionnelId,
        });

      if (insertError) {
        console.error('Erreur publication:', insertError);
        Alert.alert('Erreur', insertError.message);
        return;
      }

      Alert.alert('Succès', 'Publication ajoutée avec succès');
      router.back();
      
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

        <Text style={styles.title}>Nouvelle publication</Text>

        <Text style={styles.label}>Contenu :</Text>
        <TextInput
          style={[styles.input, { minHeight: 120 }]}
          placeholder="Écrivez votre publication ici..."
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color="#844567" />
          <Text style={styles.imageButtonText}>Ajouter une image</Text>
        </TouchableOpacity>
        
        {isUploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#844567" />
            <Text style={styles.uploadingText}>Téléchargement de l'image...</Text>
          </View>
        )}

        {image && !isUploading && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={24} color="#844567" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.publishButton} onPress={handlePublish} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff', paddingVertical: 20 },
  container: { flex: 1, padding: 20 },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#844567', marginTop: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  imageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#844567', borderRadius: 8, paddingVertical: 12, marginBottom: 15 },
  imageButtonText: { marginLeft: 8, fontSize: 16, color: '#844567' },
  uploadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, padding: 10 },
  uploadingText: { marginLeft: 8, color: '#666' },
  imagePreviewContainer: { position: 'relative', marginBottom: 15 },
  imagePreview: { width: '100%', height: 150, borderRadius: 8, backgroundColor: '#f0f0f0' },
  removeImage: { position: 'absolute', top: 5, right: 5, backgroundColor: '#fff', borderRadius: 12 },
  publishButton: { backgroundColor: '#844567', paddingVertical: 14, borderRadius: 8, marginTop: 20 },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});