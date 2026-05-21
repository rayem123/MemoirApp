import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'patient' | 'medecin' | 'infirmier' | 'aide_soignant' | 'admin';

type Profile = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: UserRole;
  statut: 'actif' | 'en_attente' | 'refuse';
  photo_url: string | null;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setIsLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        await fetchUserProfile(newSession.user.id);
      } else {
        setRole(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('utilisateur')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data as Profile);
      setRole(data.role as UserRole);
    } catch (error) {
      setProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      throw error;
    }
    
    if (data.user) {
      await fetchUserProfile(data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const value = {
    session,
    user,
    role,
    profile,
    isLoading,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}