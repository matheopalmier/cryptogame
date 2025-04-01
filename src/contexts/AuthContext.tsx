import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification au chargement de l'application
    const checkAuth = async () => {
      setIsLoading(true);
      
      try {
        // Décommenter la ligne suivante pour forcer la déconnexion au démarrage de l'app (utile pour tester)
        // await authService.logout();
        
        const isAuth = await authService.isAuthenticated();
        if (isAuth) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log("👤 AuthContext: Tentative de connexion avec:", { email });
      const response = await authService.login({ email, password });
      console.log("👤 AuthContext: Connexion réussie, données utilisateur:", response.user);
      setUser(response.user as User);
      
      // Forcer un rafraîchissement des données utilisateur depuis le serveur
      await refreshUser();
      
      return true;
    } catch (error) {
      console.error('👤 AuthContext: Erreur de connexion:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log("👤 AuthContext: Tentative d'inscription avec:", { username, email });
      const response = await authService.register({ username, email, password });
      console.log("👤 AuthContext: Inscription réussie, données utilisateur:", response.user);
      setUser(response.user as User);
      return true;
    } catch (error) {
      console.error("👤 AuthContext: Erreur d'inscription:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      console.log("🔄 AuthContext: Rafraîchissement des données utilisateur");
      const userData = await authService.getCurrentUser();
      console.log("🔄 AuthContext: Nouvelles données utilisateur:", userData);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('🔄 AuthContext: Erreur lors du rafraîchissement des données:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 