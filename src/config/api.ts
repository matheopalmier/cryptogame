// Configuration de l'API
import { Platform } from 'react-native';

// Déterminer l'URL de l'API selon la plateforme et l'environnement
// IMPORTANT: Utilisez l'adresse IP réelle de votre machine au lieu de localhost
const getApiUrl = () => {
  // Si nous sommes en environnement de développement
  if (__DEV__) {
    // Adresse IP de votre machine (identifiée par ifconfig)
    const YOUR_COMPUTER_IP = '192.168.86.27';
    
    // Le port correct de votre serveur backend (d'après vos logs)
    const BACKEND_PORT = 3005;
    
    // Pour le développement local, utilisez localhost
    if (process.env.NODE_ENV === 'test' || Platform.OS === 'web') {
      return `http://localhost:${BACKEND_PORT}/api`;
    }
    
    // Sur iOS et Android, utilisez l'adresse IP
    return `http://${YOUR_COMPUTER_IP}:${BACKEND_PORT}/api`;
  }
  
  // En production, utilisez votre URL de serveur réelle
  return 'https://votre-api-production.com/api';
};

export const API_URL = getApiUrl();

// URL de l'API CoinGecko
export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// Endpoints
export const ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  CURRENT_USER: '/auth/me',
  TOP_CRYPTOS: '/cryptos/top',
  CRYPTO_DETAILS: '/cryptos', // + /:id
  BUY_CRYPTO: '/transactions/buy',
  SELL_CRYPTO: '/transactions/sell',
  TRANSACTION_HISTORY: '/transactions/history',
  LEADERBOARD: '/users/leaderboard',
  PORTFOLIO: '/users/portfolio', // Récupérer le portefeuille avec les valeurs actuelles
}; 