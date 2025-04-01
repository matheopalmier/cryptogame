import axios from 'axios';
import { Cryptocurrency, PriceHistoryPoint } from '../types';
import { COINGECKO_API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de cache
const CACHE_KEYS = {
  TOP_CRYPTOS: 'cache_top_cryptos',
  CRYPTO_DETAILS: 'cache_crypto_details_', // + cryptoId
};

// Durée de vie du cache en millisecondes
const CACHE_TTL = {
  TOP_CRYPTOS: 5 * 60 * 1000, // 5 minutes
  CRYPTO_DETAILS: 2 * 60 * 1000, // 2 minutes
};

// Délai entre les requêtes en cas d'erreur de limite de taux
const RATE_LIMIT_RETRY_DELAY = 2000; // 2 secondes

/**
 * Vérifie si les données en cache sont encore valides
 */
const isCacheValid = (timestamp: number, ttl: number): boolean => {
  return Date.now() - timestamp < ttl;
};

/**
 * Récupère des données du cache
 */
const getFromCache = async (key: string): Promise<any> => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      return { data, timestamp };
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du cache:', error);
  }
  return null;
};

/**
 * Sauvegarde des données dans le cache
 */
const saveToCache = async (key: string, data: any): Promise<void> => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du cache:', error);
  }
};

/**
 * Effectue une requête avec gestion des limites de taux
 */
const fetchWithRetry = async (url: string, maxRetries = 3): Promise<any> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        // Rate limit atteint
        console.warn(`⚠️ Rate limit atteint pour ${url} - Tentative ${retries + 1}/${maxRetries}...`);
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY * (retries + 1)));
        retries++;
      } else {
        throw error;
      }
    }
  }
  
  console.error(`❌ Échec après ${maxRetries} tentatives pour ${url}`);
  throw new Error(`Rate limit persistant pour ${url}`);
};

/**
 * Récupère les top cryptomonnaies
 */
export const fetchTopCryptos = async (limit = 100): Promise<any[]> => {
  try {
    // Vérifier le cache d'abord
    const cacheKey = CACHE_KEYS.TOP_CRYPTOS;
    const cachedData = await getFromCache(cacheKey);
    
    if (cachedData && isCacheValid(cachedData.timestamp, CACHE_TTL.TOP_CRYPTOS)) {
      console.log('📊 Utilisation des données en cache pour les top cryptos');
      return cachedData.data;
    }
    
    // Sinon, faire l'appel API
    console.log('📊 Récupération des top cryptos depuis l\'API...');
    const url = `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`;
    
    try {
      const data = await fetchWithRetry(url);
      
      // Vérifier que les données sont valides
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ Réponse API vide ou invalide pour les top cryptos');
        throw new Error('Données cryptos invalides');
      }
      
      // Vérifier que les cryptos ont les propriétés nécessaires
      const validData = data.map(crypto => ({
        id: crypto.id || 'unknown',
        symbol: (crypto.symbol || 'UNK').toUpperCase(),
        name: crypto.name || 'Unknown',
        current_price: typeof crypto.current_price === 'number' ? crypto.current_price : 0,
        market_cap: typeof crypto.market_cap === 'number' ? crypto.market_cap : 0,
        image: crypto.image || 'https://via.placeholder.com/32',
        price_change_percentage_24h: typeof crypto.price_change_percentage_24h === 'number' ? crypto.price_change_percentage_24h : 0
      }));
      
      // Sauvegarder dans le cache
      await saveToCache(cacheKey, validData);
      
      return validData;
    } catch (apiError) {
      console.error('❌ Erreur lors de l\'appel API CoinGecko:', apiError);
      throw apiError; // Relancer pour utiliser le fallback
    }
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    
    // Fallback au cache même périmé
    const cachedData = await getFromCache(CACHE_KEYS.TOP_CRYPTOS);
    if (cachedData && cachedData.data && Array.isArray(cachedData.data) && cachedData.data.length > 0) {
      console.warn('⚠️ Utilisation des données en cache périmées suite à une erreur');
      return cachedData.data;
    }
    
    // Ou utiliser des données mockées
    console.warn('⚠️ Utilisation des données mockées suite à une erreur');
    return getMockTopCryptos();
  }
};

/**
 * Récupère les détails d'une cryptomonnaie
 */
export const fetchCryptoDetails = async (cryptoId: string): Promise<any> => {
  try {
    // Vérifier le cache d'abord
    const cacheKey = CACHE_KEYS.CRYPTO_DETAILS + cryptoId;
    const cachedData = await getFromCache(cacheKey);
    
    if (cachedData && isCacheValid(cachedData.timestamp, CACHE_TTL.CRYPTO_DETAILS)) {
      console.log(`📊 Utilisation des données en cache pour ${cryptoId}`);
      return cachedData.data;
    }
    
    // Sinon, faire l'appel API
    console.log(`📊 Récupération des détails pour ${cryptoId} depuis l'API...`);
    const url = `${COINGECKO_API_URL}/coins/${cryptoId}?localization=false&tickers=false&market_data=true`;
    
    const data = await fetchWithRetry(url);
    
    // Sauvegarder dans le cache
    await saveToCache(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`Error fetching details for ${cryptoId}:`, error);
    
    // Fallback au cache même périmé
    const cachedData = await getFromCache(CACHE_KEYS.CRYPTO_DETAILS + cryptoId);
    if (cachedData) {
      console.warn(`⚠️ Utilisation des données en cache périmées pour ${cryptoId} suite à une erreur`);
      return cachedData.data;
    }
    
    throw error;
  }
};

/**
 * Génère des données mockées pour les top cryptos en cas d'échec total
 */
const getMockTopCryptos = (): any[] => {
  const mockCryptos = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 50000, market_cap: 1000000000000 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 2000, market_cap: 500000000000 },
    { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.5, market_cap: 50000000000 },
    { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 1.2, market_cap: 40000000000 },
    { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 100, market_cap: 30000000000 },
    // Ajouter plus si nécessaire
  ];
  
  return mockCryptos;
};

/**
 * Vide le cache pour forcer le rafraîchissement des données
 */
export const clearCryptoCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key: string) => 
      key === CACHE_KEYS.TOP_CRYPTOS || 
      key.startsWith(CACHE_KEYS.CRYPTO_DETAILS)
    );
    
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🧹 Cache vidé (${cacheKeys.length} entrées)`);
    }
  } catch (error) {
    console.error('Erreur lors du vidage du cache:', error);
  }
};

export const fetchCryptoPriceHistory = async (
  cryptoId: string,
  days: number = 7
): Promise<PriceHistoryPoint[]> => {
  try {
    const url = `${COINGECKO_API_URL}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`;
    const data = await fetchWithRetry(url);

    // Response contains prices array with [timestamp, price] pairs
    if (!data || !data.prices || !Array.isArray(data.prices)) {
      console.error('Format de données invalide pour l\'historique:', data);
      return [];
    }

    return data.prices.map((item: [number, number]) => ({
      timestamp: item[0],
      price: item[1],
    }));
  } catch (error) {
    console.error(`Error fetching price history for ${cryptoId}:`, error);
    // Retourner un tableau vide en cas d'erreur
    return [];
  }
}; 