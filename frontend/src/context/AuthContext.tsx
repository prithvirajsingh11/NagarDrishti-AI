import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CitizenProfile {
  name: string;
  age: number;
  email: string;
  phone: string;
  registeredAt: string;
}

interface AuthContextType {
  citizen: CitizenProfile | null;
  isLoggedIn: boolean;
  signup: (data: { name: string; age: number; email: string; phone: string }) => { success: boolean; error?: string };
  login: (identifier: string) => { success: boolean; error?: string };
  logout: () => void;
  quickDemoLogin: () => void;
}

const STORAGE_KEY_CURRENT = 'nagardrishti_citizen';
const STORAGE_KEY_USERS = 'nagardrishti_registered_users';

const DEFAULT_DEMO_CITIZEN: CitizenProfile = {
  name: 'Rajesh Kumar',
  age: 28,
  email: 'rajesh.kumar@gmail.com',
  phone: '9876543210',
  registeredAt: new Date(Date.now() - 7 * 86400000).toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [citizen, setCitizen] = useState<CitizenProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved citizen auth:', e);
    }
    return null;
  });

  // Ensure default demo user exists in storage pool
  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY_USERS);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([DEFAULT_DEMO_CITIZEN]));
      }
    } catch (e) {
      console.error('Failed to initialize demo users in storage:', e);
    }
  }, []);

  const getRegisteredUsers = (): CitizenProfile[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to retrieve registered users:', e);
    }
    return [DEFAULT_DEMO_CITIZEN];
  };

  const signup = (data: { name: string; age: number; email: string; phone: string }): { success: boolean; error?: string } => {
    const trimmedName = data.name.trim();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim().replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Please enter a valid full name.' };
    }
    if (!data.age || data.age < 10 || data.age > 120) {
      return { success: false, error: 'Please enter a valid age between 10 and 120.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid Gmail / email address.' };
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const users = getRegisteredUsers();
    const existingIndex = users.findIndex(
      (u) => u.email.toLowerCase() === cleanEmail || u.phone.replace(/\D/g, '') === cleanPhone
    );

    const newProfile: CitizenProfile = {
      name: trimmedName,
      age: Number(data.age),
      email: cleanEmail,
      phone: cleanPhone,
      registeredAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newProfile;
    } else {
      users.push(newProfile);
    }

    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(newProfile));
      setCitizen(newProfile);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Storage error. Please try again.' };
    }
  };

  const login = (identifier: string): { success: boolean; error?: string } => {
    const clean = identifier.trim().toLowerCase();
    const digits = clean.replace(/\D/g, '');

    if (!clean) {
      return { success: false, error: 'Please enter your registered Gmail or phone number.' };
    }

    const users = getRegisteredUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === clean || (digits.length >= 10 && u.phone.replace(/\D/g, '') === digits)
    );

    if (found) {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(found));
      setCitizen(found);
      return { success: true };
    }

    // If identifier looks like a valid email or 10-digit phone, create a profile on the fly for seamless user experience
    if (clean.includes('@') && clean.includes('.')) {
      const generatedName = clean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const autoProfile: CitizenProfile = {
        name: generatedName || 'Citizen User',
        age: 26,
        email: clean,
        phone: '9876500000',
        registeredAt: new Date().toISOString(),
      };
      users.push(autoProfile);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(autoProfile));
      setCitizen(autoProfile);
      return { success: true };
    } else if (digits.length === 10) {
      const autoProfile: CitizenProfile = {
        name: 'Citizen User',
        age: 28,
        email: `${digits}@gmail.com`,
        phone: digits,
        registeredAt: new Date().toISOString(),
      };
      users.push(autoProfile);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(autoProfile));
      setCitizen(autoProfile);
      return { success: true };
    }

    return {
      success: false,
      error: 'Account not found. Please enter a valid Gmail address or 10-digit mobile number, or sign up.',
    };
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT);
    } catch (e) {
      console.error(e);
    }
    setCitizen(null);
  };

  const quickDemoLogin = () => {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(DEFAULT_DEMO_CITIZEN));
    setCitizen(DEFAULT_DEMO_CITIZEN);
  };

  return (
    <AuthContext.Provider
      value={{
        citizen,
        isLoggedIn: !!citizen,
        signup,
        login,
        logout,
        quickDemoLogin,
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
