import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';
import mockData from './mockData';

// Flag pour utiliser les données mockées au lieu de l'API réelle
const USE_MOCK_API = false; // Assurez-vous que cette valeur est bien false

// Clé pour stocker le token JWT
const AUTH_TOKEN_KEY = 'auth_token';

// Créer une instance axios avec l'URL de base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Augmenter le timeout pour éviter les problèmes de connexion
  timeout: 15000, // Augmenté à 15 secondes
});

// Ajouter un intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`🔐 Token d'authentification ajouté à la requête: ${config.url}`);
    } else {
      console.log(`⚠️ Aucun token d'authentification pour la requête: ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('⚠️ Erreur dans l\'intercepteur de requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Si le token est expiré ou invalide, déconnecter l'utilisateur
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      // Vous pouvez ajouter ici une redirection vers l'écran de connexion
    }
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour obtenir des données mockées
const getMockData = (url: string): any => {
  // Nettoyer l'URL des paramètres et des slashes pour correspondre aux clés de mockData
  let cleanUrl = url.split('?')[0];
  
  // Gestion des URL dynamiques avec paramètres dans le chemin
  if (cleanUrl.includes('/crypto/') && !cleanUrl.includes('/history')) {
    const parts = cleanUrl.split('/');
    if (parts.length >= 3) {
      // Pour les détails d'une crypto
      return mockData.cryptoDetails;
    }
  }
  
  if (cleanUrl.includes('/crypto/') && cleanUrl.includes('/history')) {
    // Pour l'historique d'une crypto
    return mockData.cryptoHistory;
  }
  
  // Mapper l'URL vers la clé appropriée dans mockData
  if (cleanUrl === '/auth/register') return mockData.register;
  if (cleanUrl === '/auth/login') return mockData.login; 
  if (cleanUrl === '/auth/me') return mockData.currentUser;
  if (cleanUrl === '/crypto/market') return mockData.cryptoMarket;
  if (cleanUrl === '/transactions/buy') return mockData.buyCrypto;
  if (cleanUrl === '/transactions/sell') return mockData.sellCrypto;
  if (cleanUrl === '/transactions') return mockData.transactions;
  if (cleanUrl === '/users/leaderboard') return mockData.leaderboard;
  if (cleanUrl === '/users/portfolio') return mockData.portfolio;
  
  // Si l'URL ne correspond à aucune donnée mockée, retourner un objet vide
  console.warn(`Pas de données mockées pour l'URL: ${url}`);
  return { message: 'Données non disponibles' };
};

// Fonctions wrapper pour les méthodes HTTP avec support de mock
export const get = async (url: string, params?: any): Promise<any> => {
  // Si on utilise les données mockées, retourner directement les données mockées
  if (USE_MOCK_API) {
    console.log(`🧪 MOCK - GET ${url}`);
    return Promise.resolve(getMockData(url));
  }
  
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Ne pas utiliser le fallback vers les données mockées en cas d'erreur
    throw error;
  }
};

export const post = async (url: string, data: any): Promise<any> => {
  // Si on utilise les données mockées, simuler une réponse avec les données envoyées
  if (USE_MOCK_API) {
    console.log(`🧪 MOCK - POST ${url}`, data);
    
    if (url === '/auth/login') {
      // Simuler une connexion réussie
      return Promise.resolve({
        ...mockData.login,
        user: {
          ...mockData.login.user,
          email: data.email || 'user@example.com',
        }
      });
    }
    
    if (url === '/auth/register') {
      // Simuler une inscription réussie
      return Promise.resolve({
        ...mockData.register,
        user: {
          ...mockData.register.user,
          username: data.username || 'User',
          email: data.email || 'user@example.com',
        }
      });
    }
    
    if (url === '/transactions/buy') {
      // Simuler un achat de crypto
      return Promise.resolve({
        ...mockData.buyCrypto,
        amount: data.amount || 1,
        cryptoId: data.cryptoId || 'bitcoin',
      });
    }
    
    if (url === '/transactions/sell') {
      // Simuler une vente de crypto
      return Promise.resolve({
        ...mockData.sellCrypto,
        amount: data.amount || 1,
        cryptoId: data.cryptoId || 'bitcoin',
      });
    }
    
    return Promise.resolve(getMockData(url));
  }
  
  try {
    console.log(`🌐 REAL API - POST request to ${url}`, data);
    const response = await api.post(url, data);
    console.log(`🌐 REAL API - POST response from ${url}:`, response.data);
    return response.data;
  } catch (error) {
    console.log(`🌐 REAL API - POST error for ${url}:`, error);
    handleApiError(error);
    // Ne pas utiliser le fallback vers les données mockées en cas d'erreur
    throw error;
  }
};

export const put = async (url: string, data: any): Promise<any> => {
  // Si on utilise les données mockées, retourner directement les données mockées
  if (USE_MOCK_API) {
    console.log(`🧪 MOCK - PUT ${url}`, data);
    return Promise.resolve(getMockData(url));
  }
  
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Ne pas utiliser le fallback vers les données mockées en cas d'erreur
    throw error;
  }
};

export const del = async (url: string): Promise<any> => {
  // Si on utilise les données mockées, retourner directement les données mockées
  if (USE_MOCK_API) {
    console.log(`🧪 MOCK - DELETE ${url}`);
    return Promise.resolve({ success: true, message: 'Deleted successfully' });
  }
  
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Ne pas utiliser le fallback vers les données mockées en cas d'erreur
    throw error;
  }
};

// Fonction pour gérer les erreurs d'API
const handleApiError = (error: any) => {
  if (error.response) {
    // Le serveur a répondu avec un code d'erreur
    console.error('API Error Response:', error.response.data);
    
    // Si on atteint la limite de taux (429), on augmente temporairement le délai entre les requêtes
    if (error.response.status === 429) {
      console.log('Rate limit atteint, augmentation du délai entre les requêtes');
      // Vous pouvez ajouter ici une logique pour limiter les requêtes
    }
  } else if (error.request) {
    // La requête a été faite mais aucune réponse n'a été reçue
    console.error('API Error Request:', error.request);
  } else {
    // Une erreur s'est produite lors de la configuration de la requête
    console.error('API Error Setup:', error.message);
  }
};

// Fonction pour stocker le token JWT
export const setAuthToken = async (token: string) => {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
};

// Fonction pour récupérer le token JWT
export const getAuthToken = async () => {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
};

// Fonction pour supprimer le token JWT (déconnexion)
export const removeAuthToken = async () => {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}; 