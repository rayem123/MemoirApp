import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    console.log('🔐 Tentative connexion:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.log('❌ Erreur:', error.message);
        Alert.alert('Erreur', error.message);
        setLoading(false);
        return;
      }

      console.log('✅ Connexion réussie:', data.user?.id);

      const { data: userData, error: roleError } = await supabase
        .from('utilisateur')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (roleError) {
        console.log('Erreur récupération rôle:', roleError);
      }

      const role = userData?.role;
      console.log('Rôle:', role);

      setTimeout(() => {
        if (isMounted) {
          if (role === 'patient') {
            router.replace('/patient');
          } else if (role === 'admin') {
            router.replace('/Adm');
          } else {
            router.replace('/pro');
          }
        }
      }, 100);

    } catch (err: any) {
      console.log('Exception:', err);
      Alert.alert('Erreur', err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
      <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
      <Text style={[styles.title, { color: colors.primary }]}>Connexion</Text>

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
        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Mot de passe"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={{ color: colors.text }}>Vous n'avez pas de compte ? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
          <Text style={[styles.link, { color: '#5aadbf' }]}>S'inscrire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  logo: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10 },
  icon: { marginRight: 10 }, 
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }, 
  link: { fontWeight: '600' },
});