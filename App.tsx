import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation';
import { AuthProvider } from './src/contexts/AuthContext';
import { isAuthenticated } from './src/services/authService';

export default function App() {
  useEffect(() => {
    // Vérifier si un token d'authentification existe au démarrage
    const checkToken = async () => {
      try {
        const auth = await isAuthenticated();
        console.log('🔑 Authentification au démarrage:', auth ? 'Présente' : 'Absente');
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
      }
    };
    
    checkToken();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
