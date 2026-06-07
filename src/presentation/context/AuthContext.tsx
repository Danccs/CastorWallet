import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@infrastructure/supabase/client';
import type { User } from '@domain/entities/User';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const mapSupabaseUser = (sbUser: any): User => {
    return {
      id: sbUser.id,
      email: sbUser.email || '',
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || '',
      avatarUrl: sbUser.user_metadata?.avatar_url || '',
      createdAt: new Date(sbUser.created_at),
    };
  };

  useEffect(() => {
    // 1. Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // In development/production, Supabase uses redirect urls.
          // In the free Netlify setup, it redirects back to site.
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      alert('Error al conectar con Google. Por favor, revisa la configuración.');
    }
  };

  const signInWithGoogleToken = async (idToken: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error de login con ID Token:', err);
      alert('Error al autenticar con Google. Por favor, reintenta.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithGoogleToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
