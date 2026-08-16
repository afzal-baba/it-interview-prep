import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tip_player_name';

interface AuthContextValue {
  playerName: string | null;
  isLoading: boolean;
  signIn: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  playerName: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => setPlayerName(val ?? null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (name: string) => {
    const trimmed = name.trim();
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    setPlayerName(trimmed);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setPlayerName(null);
  };

  return (
    <AuthContext.Provider value={{ playerName, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
