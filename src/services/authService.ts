import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthProvider, User } from '../types';
import { ENDPOINTS } from '../config/api';
import { post, get, setAuthToken, removeAuthToken } from './apiService';

// Dans une véritable app, ces identifiants seraient stockés de manière sécurisée
// et différents selon les environnements
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const API_URL = 'https://your-backend-api.com';

// Clés pour stocker les données d'authentification
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    balance: number;
    portfolio: Array<{
      cryptoId: string;
      amount: number;
      averageBuyPrice: number;
    }>;
  };
  token: string;
}

// Fonction pour enregistrer un nouvel utilisateur avec le backend
export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const response = await post(ENDPOINTS.REGISTER, userData);
  console.log('🔍 Réponse brute du register:', JSON.stringify(response, null, 2));
  
  // Adapter la réponse si elle a un format différent (avec data et success)
  let token, user;
  if (response.token) {
    // Format attendu par le client existant
    token = response.token;
    user = response.user;
  } else if (response.data && response.success) {
    // Format renvoyé par le serveur réel
    token = response.data.token;
    
    // Construire l'objet user à partir des propriétés de data
    const responseData = response.data;
    user = {
      id: responseData._id || responseData.id,
      username: responseData.username || responseData.name || 'Utilisateur', // Essayer plusieurs champs possibles
      email: responseData.email,
      balance: responseData.balance || 0,
      portfolio: responseData.portfolio || [],
      rank: responseData.rank,
      profitPercentage: responseData.profitPercentage,
      avatar: responseData.avatar
    };
    
    console.log('👤 Utilisateur formaté après inscription:', user);
  } else {
    console.error("Format de réponse inconnu:", response);
    throw new Error("Format de réponse invalide");
  }
  
  // Stocker le token et les données utilisateur
  if (token) {
    await setAuthToken(token);
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
  }
  
  // Retourner un objet au format attendu par le client
  return { token, user };
};

// Fonction pour connecter un utilisateur avec le backend
export const login = async (credentials: LoginData): Promise<AuthResponse> => {
  const response = await post(ENDPOINTS.LOGIN, credentials);
  console.log('🔍 Réponse brute du login:', JSON.stringify(response, null, 2));
  
  // Adapter la réponse si elle a un format différent (avec data et success)
  let token, user;
  if (response.token) {
    // Format attendu par le client existant
    token = response.token;
    user = response.user;
  } else if (response.data && response.success) {
    // Format renvoyé par le serveur réel
    token = response.data.token;
    
    // Construire l'objet user à partir des propriétés de data
    const userData = response.data;
    user = {
      id: userData._id || userData.id,
      username: userData.username || userData.name || 'Utilisateur', // Essayer plusieurs champs possibles
      email: userData.email,
      balance: userData.balance || 0,
      portfolio: userData.portfolio || [],
      rank: userData.rank,
      profitPercentage: userData.profitPercentage,
      avatar: userData.avatar
    };
    
    console.log('👤 Utilisateur formaté après login:', user);
  } else {
    console.error("Format de réponse inconnu:", response);
    throw new Error("Format de réponse invalide");
  }
  
  // Stocker le token et les données utilisateur
  if (token) {
    await setAuthToken(token);
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
  }
  
  // Retourner un objet au format attendu par le client
  return { token, user };
};

// Fonction pour obtenir les informations de l'utilisateur actuel
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('👤 Tentative de récupération des informations utilisateur depuis le serveur...');
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    
    if (!token) {
      console.log('⚠️ Aucun token JWT trouvé en stockage local');
      // Renvoyer les données en cache si disponibles
      const cachedUser = await SecureStore.getItemAsync(USER_DATA_KEY);
      return cachedUser ? JSON.parse(cachedUser) : null;
    }
    
    // Essayer d'obtenir les informations utilisateur
    try {
      const userData = await get(ENDPOINTS.CURRENT_USER);
      console.log('🔍 Données brutes reçues du serveur:', JSON.stringify(userData, null, 2));
      
      if (!userData) {
        console.log('⚠️ Réponse vide du serveur pour les informations utilisateur');
        const cachedUser = await SecureStore.getItemAsync(USER_DATA_KEY);
        return cachedUser ? JSON.parse(cachedUser) : null;
      }
      
      // Adapter le format des données selon la structure réelle reçue
      let formattedUser: User;
      
      if (userData.data) {
        // Si la réponse est dans un format avec un champ 'data'
        formattedUser = {
          id: userData.data._id || userData.data.id,
          username: userData.data.username || userData.data.name || 'Utilisateur',
          email: userData.data.email,
          balance: userData.data.balance || 0,
          portfolio: userData.data.portfolio || [],
          rank: userData.data.rank,
          profitPercentage: userData.data.profitPercentage,
          avatar: userData.data.avatar
        };
      } else {
        // Format direct
        formattedUser = {
          id: userData._id || userData.id,
          username: userData.username || userData.name || 'Utilisateur',
          email: userData.email,
          balance: userData.balance || 0,
          portfolio: userData.portfolio || [],
          rank: userData.rank,
          profitPercentage: userData.profitPercentage,
          avatar: userData.avatar
        };
      }
      
      console.log('✅ Informations utilisateur formatées:', formattedUser);
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(formattedUser));
      return formattedUser;
    } catch (serverError) {
      console.error('🔴 Erreur lors de la récupération des informations utilisateur:', serverError);
    }
    
    // En cas d'échec, revenir aux données en cache
    console.log('🔄 Utilisation des données utilisateur en cache');
    const cachedUser = await SecureStore.getItemAsync(USER_DATA_KEY);
    
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      console.log('👤 Données utilisateur en cache:', user.username);
      return user;
    }
    
    console.log('❌ Aucune donnée utilisateur disponible');
    return null;
  } catch (error) {
    console.error('🔴 Erreur dans getCurrentUser:', error);
    const cachedUser = await SecureStore.getItemAsync(USER_DATA_KEY);
    return cachedUser ? JSON.parse(cachedUser) : null;
  }
};

// Déconnexion
export const logout = async (): Promise<void> => {
  await removeAuthToken();
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);
};

// Authentification Google - À connecter avec le backend dans une version future
export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const [request, response, promptAsync] = Google.useAuthRequest({
      clientId: GOOGLE_CLIENT_ID,
    });

    if (response?.type === 'success') {
      const { authentication } = response;
      
      // Dans une version future, envoyer le token au backend
      // et récupérer les informations utilisateur
      const mockUser: User = {
        id: `google_user_${Date.now()}`,
        username: 'GoogleUser',
        email: 'google@example.com',
        balance: 10000,
        portfolio: [],
      };

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, authentication?.accessToken || '');
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(mockUser));

      return mockUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error with Google Sign In:', error);
    return null;
  }
};

// Authentification Apple - À connecter avec le backend dans une version future
export const loginWithApple = async (): Promise<User | null> => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (credential) {
      // Dans une version future, envoyer le token au backend
      const mockUser: User = {
        id: `apple_user_${credential.user}`,
        username: 'AppleUser',
        email: credential.email || 'apple@example.com',
        balance: 10000,
        portfolio: [],
      };

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, credential.identityToken || '');
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(mockUser));

      return mockUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error with Apple Sign In:', error);
    return null;
  }
};

// Vérifier si l'utilisateur est connecté
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  return !!token;
};

// Force la déconnexion et efface toutes les données stockées
export const forceLogout = async (): Promise<void> => {
  const keys = ['auth_token', 'user_data', 'leaderboard'];
  
  // Supprimer le token JWT et les données utilisateur
  for (const key of keys) {
    await SecureStore.deleteItemAsync(key);
  }
  
  console.log('Toutes les données d\'authentification ont été effacées');
}; 