import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue à e-HomeCare</Text>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      <TouchableOpacity style={styles.button} onPress={() => router.push( '/auth/login')}>
      <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => router.push('/auth/signup')}>
        <Text style={[styles.buttonText, styles.buttonOutlineText]}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#844567', // violet
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#844567', // violet
    marginTop: 10,
  },
  brandSlogan: {
    fontSize: 14,
    color: '#5aadbf', // vert
    marginBottom: 20,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#fff',
    marginBottom: 30,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#844567', // violet
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginVertical: 10,
    width: '80%',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5aadbf', // vert
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonOutlineText: {
    color: '#5aadbf', // vert
  },
});