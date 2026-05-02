import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'patient' | 'medecin' | 'infirmier' | 'aide_soignant' | 'admin';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpPatient: (userData: any) => Promise<void>;
  signUpPro: (userData: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session au démarrage
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      setIsLoading(false);
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        await fetchUserRole(newSession.user.id);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log('🔍 Recherche rôle pour:', userId);
      
      // 1. Vérifier d'abord dans la table utilisateur
      const { data: userData, error: userError } = await supabase
        .from('utilisateur')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (userData && userData.role) {
        console.log('✅ Rôle trouvé dans utilisateur:', userData.role);
        setRole(userData.role as UserRole);
        return;
      }
      
      // 2. Vérifier dans patient
      const { data: patientData, error: patientError } = await supabase
        .from('patient')
        .select('id')
        .eq('utilisateur_id', userId)
        .maybeSingle();
      
      if (patientData) {
        console.log('✅ Rôle: patient');
        setRole('patient');
        return;
      }
      
      // 3. Vérifier dans professionnel_sante
      const { data: proData, error: proError } = await supabase
        .from('professionnel_sante')
        .select('type_soignant_id, admin')
        .eq('utilisateur_id', userId)
        .maybeSingle();
      
      if (proData) {
        if (proData.admin === true) {
          console.log('✅ Rôle: admin');
          setRole('admin');
          return;
        }
        
        const { data: typeData, error: typeError } = await supabase
          .from('type_soignant')
          .select('categorie')
          .eq('id', proData.type_soignant_id)
          .maybeSingle();
        
        if (typeData) {
          console.log(`✅ Rôle: ${typeData.categorie}`);
          setRole(typeData.categorie as UserRole);
          return;
        }
      }
      
      console.log('⚠️ Aucun rôle trouvé pour:', userId);
      setRole(null);
    } catch (error) {
      console.error('Erreur fetchUserRole:', error);
      setRole(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Tentative connexion:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('❌ Erreur signIn:', error.message);
      throw error;
    }
    
    console.log('✅ Connexion réussie, userId:', data.user?.id);
  };

  const signUpPatient = async (userData: any) => {
    console.log('📝 Inscription patient:', userData.email);
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          nom: userData.nom,
          prenom: userData.prenom,
          telephone: userData.telephone,
        }
      }
    });
    
    if (error) throw error;
    if (!data.user) throw new Error('Erreur: utilisateur non créé');
    
    const userId = data.user.id;
    
    // Insérer dans utilisateur
    const { error: userError } = await supabase
      .from('utilisateur')
      .insert({
        id: userId,
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        telephone: userData.telephone,
        role: 'patient',
        statut: 'actif',
      });
    
    if (userError) throw userError;
    
    // Insérer dans patient
    const { error: patientError } = await supabase
      .from('patient')
      .insert({
        utilisateur_id: userId,
        adresse: userData.adresse || null,
      });
    
    if (patientError) throw patientError;
    
    console.log('✅ Patient inscrit avec succès');
  };

  const signUpPro = async (userData: any) => {
    console.log('📝 Inscription professionnel:', userData.email);
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          nom: userData.nom,
          prenom: userData.prenom,
          telephone: userData.telephone,
        }
      }
    });
    
    if (error) throw error;
    if (!data.user) throw new Error('Erreur: utilisateur non créé');
    
    const userId = data.user.id;
    
    // Insérer dans utilisateur
    const { error: userError } = await supabase
      .from('utilisateur')
      .insert({
        id: userId,
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        telephone: userData.telephone,
        role: userData.role,
        statut: 'en_attente',
      });
    
    if (userError) throw userError;
    
    // Récupérer type_soignant
    const { data: typeData } = await supabase
      .from('type_soignant')
      .select('id')
      .eq('categorie', userData.role)
      .single();
    
    // Insérer dans professionnel_sante
    const { error: proError } = await supabase
      .from('professionnel_sante')
      .insert({
        utilisateur_id: userId,
        type_soignant_id: typeData?.id,
        disponibilite: 'disponible',
        admin: false,
      });
    
    if (proError) throw proError;
    
    console.log('✅ Professionnel inscrit avec succès');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    console.log('🔓 Déconnexion réussie');
  };

  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, signIn, signUpPatient, signUpPro, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}