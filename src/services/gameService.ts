import * as SecureStore from 'expo-secure-store';
import { User, PortfolioItem, Transaction, LeaderboardEntry } from '../types';
import { getCurrentUser } from './authService';
import { ENDPOINTS } from '../config/api';
import { get, post } from './apiService';
import mockData from './mockData';

const USER_DATA_KEY = 'user_data';
const TRANSACTIONS_KEY = 'transactions';
const LEADERBOARD_KEY = 'leaderboard';

// Acheter une cryptomonnaie
export const buyCrypto = async (
  cryptoId: string,
  cryptoName: string,
  amount: number,
  price: number
): Promise<User> => {
  try {
    console.log('💰 Tentative d\'achat de cryptomonnaie via l\'API:', { cryptoId, amount, price });
    
    // Appeler l'API pour effectuer l'achat
    const response = await post(ENDPOINTS.BUY_CRYPTO, {
      cryptoId,
      cryptoName,
      amount,
      price
    });
    
    console.log('💰 Réponse de l\'API après achat:', response);
    
    // Si la transaction est réussie, mettre à jour les données utilisateur locales
    if (response && response.success) {
      // Récupérer les dernières données utilisateur depuis le serveur
      const updatedUser = await getCurrentUser();
      console.log('💰 Utilisateur mis à jour après achat:', updatedUser);
      
      if (updatedUser) {
        // Sauvegarder les nouvelles données localement
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
    }
    
    throw new Error(response?.message || 'Erreur lors de l\'achat');
  } catch (error) {
    console.error('💰 Erreur lors de l\'achat de cryptomonnaie:', error);
    throw error;
  }
};

// Vendre une cryptomonnaie
export const sellCrypto = async (
  cryptoId: string,
  amount: number,
  price: number
): Promise<User> => {
  try {
    console.log('💰 Tentative de vente de cryptomonnaie via l\'API:', { cryptoId, amount, price });
    
    // Appeler l'API pour effectuer la vente
    const response = await post(ENDPOINTS.SELL_CRYPTO, {
      cryptoId,
      amount,
      price
    });
    
    console.log('💰 Réponse de l\'API après vente:', response);
    
    // Si la transaction est réussie, mettre à jour les données utilisateur locales
    if (response && response.success) {
      // Récupérer les dernières données utilisateur depuis le serveur
      const updatedUser = await getCurrentUser();
      console.log('💰 Utilisateur mis à jour après vente:', updatedUser);
      
      if (updatedUser) {
        // Sauvegarder les nouvelles données localement
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
    }
    
    throw new Error(response?.message || 'Erreur lors de la vente');
  } catch (error) {
    console.error('💰 Erreur lors de la vente de cryptomonnaie:', error);
    throw error;
  }
};

// Obtenir l'historique des transactions
export const getTransactionHistory = async (): Promise<Transaction[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not logged in');
  }

  const transactionsJson = await SecureStore.getItemAsync(TRANSACTIONS_KEY);
  const transactions: Transaction[] = transactionsJson 
    ? JSON.parse(transactionsJson) 
    : [];
  
  // Filtrer pour n'obtenir que les transactions de l'utilisateur connecté
  return transactions.filter(tx => tx.userId === user.id);
};

/**
 * Récupérer le classement des utilisateurs
 */
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    console.log('📊 Récupération du classement des utilisateurs...');
    // Essayer d'abord d'obtenir les données du serveur réel
    const response = await get(ENDPOINTS.LEADERBOARD);
    
    // Si la réponse a un format API (avec success et data)
    if (response && response.success && response.data) {
      console.log('📊 Données de classement reçues du serveur:', response.data.length > 0 ? {
        "Premier utilisateur": {
          userId: response.data[0].userId,
          username: response.data[0].username,
          balance: response.data[0].balance,
          portfolioValue: response.data[0].portfolioValue,
          totalValue: response.data[0].totalValue
        }
      } : 'Aucun utilisateur dans le classement');
      
      return response.data.map((entry: any) => {
        // S'assurer que portfolioValue et totalValue sont définis correctement
        const portfolioValue = typeof entry.portfolioValue === 'number' ? entry.portfolioValue : 0;
        const totalValue = typeof entry.totalValue === 'number' ? 
          entry.totalValue : 
          (entry.balance + portfolioValue);
          
        console.log(`📊 Utilisateur ${entry.username}: Balance=${entry.balance}, PortfolioValue=${portfolioValue}, TotalValue=${totalValue}`);
        
        return {
          userId: entry.userId,
          username: entry.username,
          avatar: entry.avatar,
          balance: entry.balance,
          portfolioValue: portfolioValue,
          totalValue: totalValue,
          profitPercentage: entry.profitPercentage || 0
        };
      });
    }
    
    // Sinon, si la réponse est directement un tableau
    if (Array.isArray(response)) {
      console.log('📊 Données de classement reçues directement du serveur:', 
        response.length > 0 ? {
          username: response[0].username,
          balance: response[0].balance,
          portfolioValue: response[0].portfolioValue,
          totalValue: response[0].totalValue
        } : 'Aucun utilisateur dans le classement');
      
      return response.map(entry => {
        const portfolioValue = typeof entry.portfolioValue === 'number' ? entry.portfolioValue : 0;
        const totalValue = typeof entry.totalValue === 'number' ? 
          entry.totalValue : 
          (entry.balance + portfolioValue);
        
        return {
          ...entry,
          portfolioValue: portfolioValue,
          totalValue: totalValue
        };
      });
    }
    
    // Fallback sur les données mockées si le format n'est pas reconnu
    console.log('⚠️ Format de réponse non reconnu, utilisation des données mockées');
    const mockLeaderboard = mockData.leaderboard.map(entry => ({
      ...entry,
      portfolioValue: 0, // Les données mockées n'ont pas de portfolioValue
      totalValue: entry.balance // Pour les données mockées, totalValue = balance
    }));
    return mockLeaderboard;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du classement:', error);
    console.log('⚠️ Fallback sur les données mockées après erreur');
    const mockLeaderboard = mockData.leaderboard.map(entry => ({
      ...entry,
      portfolioValue: 0,
      totalValue: entry.balance
    }));
    return mockLeaderboard;
  }
};

/**
 * Récupérer le portefeuille de l'utilisateur actuel avec les valeurs à jour
 */
export const getUserPortfolio = async (): Promise<User | null> => {
  try {
    console.log('📊 Récupération du portefeuille utilisateur...');
    const response = await get(ENDPOINTS.PORTFOLIO);
    
    if (response && response.success && response.data) {
      console.log('📊 Données du portefeuille reçues:', {
        balance: response.data.balance,
        portfolioCount: response.data.portfolio?.length || 0,
        totalValue: response.data.totalValue
      });
      
      // Récupérer l'utilisateur actuel
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('❌ Utilisateur non connecté');
        return null;
      }
      
      // Mettre à jour les données utilisateur avec les dernières informations
      const updatedUser = {
        ...currentUser,
        balance: response.data.balance,
        portfolio: response.data.portfolio || [],
        totalValue: response.data.totalValue,
        portfolioValue: response.data.portfolioValue,
        profitPercentage: response.data.profitPercentage,
        rank: response.data.rank
      };
      
      // Sauvegarder les nouvelles données localement
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    
    // Si le format de réponse n'est pas celui attendu, utiliser les données utilisateur actuelles
    console.warn('⚠️ Format de réponse non reconnu, utilisation des données utilisateur actuelles');
    return await getCurrentUser();
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du portefeuille:', error);
    // En cas d'échec, retourner les données utilisateur actuelles
    return await getCurrentUser();
  }
}; 