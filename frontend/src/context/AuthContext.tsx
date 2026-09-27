import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

export interface CitizenUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen';
  registeredAt?: string;
}

interface AuthContextType {
  citizen: CitizenUser | null;
  user: CitizenUser | null;
  session: Session | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  signup: (data: { name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  login: (data: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractCitizenProfile(authUser: User | null): CitizenUser | null {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  const email = authUser.email || '';
  const fullName = meta.full_name || meta.name || email.split('@')[0] || 'Citizen';

  return {
    id: authUser.id,
    name: fullName,
    email,
    role: 'citizen',
    registeredAt: authUser.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [citizen, setCitizen] = useState<CitizenUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Restore active session on application startup
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.warn('Error restoring Supabase session:', error.message);
      }
      setSession(initialSession);
      setCitizen(extractCitizenProfile(initialSession?.user || null));
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setCitizen(extractCitizenProfile(currentSession?.user || null));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const password = data.password;

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: 'citizen', // Strictly default to citizen
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('already registered')) {
          msg = 'An account with this email already exists. Please sign in.';
        } else if (msg.toLowerCase().includes('weak password')) {
          msg = 'Password is too weak. Please use a stronger password.';
        }
        return { success: false, error: msg };
      }

      if (authData.user) {
        setCitizen(extractCitizenProfile(authData.user));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed. Please try again.' };
    }
  };

  const login = async (data: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const password = data.password;

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('invalid login credentials')) {
          msg = 'Invalid email or password. Please try again.';
        }
        return { success: false, error: msg };
      }

      setSession(authData.session);
      setCitizen(extractCitizenProfile(authData.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed. Please check your credentials.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out:', err);
    } finally {
      setSession(null);
      setCitizen(null);
      window.location.hash = 'login';
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter your registered email address.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/#login`,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not send reset link. Please try again.' };
    }
  };

  const token = session?.access_token || null;

  return (
    <AuthContext.Provider
      value={{
        citizen,
        user: citizen,
        session,
        token,
        isLoggedIn: !!citizen,
        loading,
        signup,
        login,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
