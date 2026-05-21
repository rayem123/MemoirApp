import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function AddPostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [professionnelId, setProfessionnelId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    
    setIsUploading(true);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    
    if (!result.canceled && result.assets && result.assets[0]) {
      const base64 = result.assets[0].base64;
      if (base64) {
        const imageDataUrl = `data:image/jpeg;base64,${base64}`;
        setImageBase64(imageDataUrl);
      }
    }
    
    setIsUploading(false);
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
      const publicationData: any = {
        contenu: content.trim(),
        professionnel_id: professionnelId,
      };
      
      if (imageBase64) {
        publicationData.image_url = imageBase64;
      }

      const { error: insertError } = await supabase
        .from('publication')
        .insert(publicationData);

      if (insertError) {
        Alert.alert('Erreur', insertError.message);
        return;
      }

      Alert.alert('Succès', 'Publication ajoutée avec succès');
      router.back();
      
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header fixe */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Nouvelle publication</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.text }]}>Contenu :</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Écrivez votre publication ici..."
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={[styles.imageButton, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={pickImage} disabled={isUploading}>
          <Ionicons name="image-outline" size={24} color={colors.primary} />
          <Text style={[styles.imageButtonText, { color: colors.primary }]}>
            {isUploading ? 'Traitement...' : (imageBase64 ? 'Changer l\'image' : 'Ajouter une image')}
          </Text>
        </TouchableOpacity>
        
        {isUploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>Traitement de l'image...</Text>
          </View>
        )}

        {imageBase64 && !isUploading && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImageBase64(null)}>
              <Ionicons name="close-circle" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.publishButton, { backgroundColor: colors.primary }]} 
          onPress={handlePublish} 
          disabled={isLoading || isUploading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publier</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { 
    padding: 8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
  },
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8,
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    fontSize: 16, 
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  imageButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingVertical: 12, 
    marginBottom: 15, 
    gap: 8,
  },
  imageButtonText: { 
    fontSize: 16,
  },
  uploadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 15, 
    gap: 8,
  },
  uploadingText: { 
    fontSize: 12,
  },
  imagePreviewContainer: { 
    position: 'relative', 
    marginBottom: 15,
  },
  imagePreview: { 
    width: '100%', 
    height: 200, 
    borderRadius: 12,
  },
  removeImage: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 15, 
    padding: 2,
  },
  publishButton: { 
    paddingVertical: 14, 
    borderRadius: 12, 
    marginTop: 20, 
    alignItems: 'center',
  },
  publishButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
  },
});