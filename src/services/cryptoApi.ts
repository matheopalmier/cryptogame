import axios from 'axios';
import { Cryptocurrency, PriceHistoryPoint } from '../types';
import { COINLORE_API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de cache
const CACHE_KEYS = {
  TOP_CRYPTOS: 'cache_top_cryptos',
  CRYPTO_DETAILS: 'cache_crypto_details_', // + cryptoId
  GLOBAL_MARKET: 'cache_global_market',
};

// Durée de vie du cache en millisecondes
const CACHE_TTL = {
  TOP_CRYPTOS: 5 * 60 * 1000, // 5 minutes
  CRYPTO_DETAILS: 2 * 60 * 1000, // 2 minutes
  GLOBAL_MARKET: 15 * 60 * 1000, // 15 minutes
};

// Coinlore utilise des tickers internes, nous devons garder une correspondance
const COIN_MAPPING: { [key: string]: string } = {
  'bitcoin': '90',
  'ethereum': '80',
  'binancecoin': '2710',
  'ripple': '58',
  'cardano': '2010',
  'solana': '48543',
  'polkadot': '41417',
  'dogecoin': '2',
  'avalanche-2': '44883',
  'matic-network': '3890',
  // Ajoutez d'autres correspondances selon vos besoins
};

// Correspondance inverse (id Coinlore -> id standard)
const REVERSE_COIN_MAPPING: { [key: string]: string } = {};
Object.entries(COIN_MAPPING).forEach(([key, value]) => {
  REVERSE_COIN_MAPPING[value] = key;
});

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
 * Effectue une requête avec gestion des erreurs
 */
const fetchWithRetry = async (url: string, maxRetries = 3): Promise<any> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      retries++;
      if (retries < maxRetries) {
        console.warn(`⚠️ Erreur API pour ${url} - Tentative ${retries}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Échec après ${maxRetries} tentatives pour ${url}`);
};

/**
 * Obtenir une URL d'icône pour une crypto (utilise maintenant une image par défaut)
 */
const getCryptoIconUrl = (symbol: string): string => {
  // Retourne une image par défaut pour toutes les cryptos
  return 'https://via.placeholder.com/32';
};

/**
 * Récupère les top cryptomonnaies
 */
export const fetchTopCryptos = async (limit = 100): Promise<Cryptocurrency[]> => {
  try {
    // Vérifier le cache d'abord
    const cacheKey = CACHE_KEYS.TOP_CRYPTOS;
    const cachedData = await getFromCache(cacheKey);
    
    if (cachedData && isCacheValid(cachedData.timestamp, CACHE_TTL.TOP_CRYPTOS)) {
      console.log('📊 Utilisation des données en cache pour les top cryptos');
      return cachedData.data;
    }
    
    // Sinon, faire l'appel API
    console.log('📊 Récupération des top cryptos depuis Coinlore...');
    const url = `${COINLORE_API_URL}/tickers/?start=0&limit=${limit}`;
    
    try {
      const response = await fetchWithRetry(url);
      const data = response.data;
      
      // Vérifier que les données sont valides
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('⚠️ Réponse API vide ou invalide pour les top cryptos');
        throw new Error('Données cryptos invalides');
      }
      
      // Transformer au format attendu par l'application (interface Cryptocurrency)
      const validData = data.map(crypto => {
        // Calculer l'ID "standard" si disponible, sinon utiliser l'ID numérique de Coinlore
        const standardId = REVERSE_COIN_MAPPING[crypto.id] || `coin-${crypto.id}`;
        
        // Extraire et convertir les valeurs en veillant à ce qu'elles soient de type number
        const currentPrice = parseFloat(crypto.price_usd) || 0;
        const marketCap = parseFloat(crypto.market_cap_usd) || 0;
        const volume24h = parseFloat(crypto.volume24) || 0;
        const priceChangePercentage24h = parseFloat(crypto.percent_change_24h) || 0;
        
        return {
          id: standardId,
          symbol: (crypto.symbol || 'UNK').toUpperCase(),
          name: crypto.name || 'Unknown',
          currentPrice, // Nom de propriété mappé correctement selon l'interface
          marketCap, // Nom de propriété mappé correctement selon l'interface
          volume24h, // Nom de propriété mappé correctement selon l'interface
          priceChangePercentage24h, // Nom de propriété mappé correctement selon l'interface
          image: getCryptoIconUrl(crypto.symbol) // Utiliser une image générique
        };
      });
      
      // Sauvegarder dans le cache
      await saveToCache(cacheKey, validData);
      
      return validData;
    } catch (apiError) {
      console.error('❌ Erreur lors de l\'appel API Coinlore:', apiError);
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
    
    // Trouver l'ID Coinlore correspondant
    let coinloreId = COIN_MAPPING[cryptoId];
    
    // Si l'ID standard n'est pas dans notre mapping, vérifier si c'est un ID direct de Coinlore
    if (!coinloreId && cryptoId.startsWith('coin-')) {
      coinloreId = cryptoId.replace('coin-', '');
    }
    
    if (!coinloreId) {
      throw new Error(`ID crypto non reconnu: ${cryptoId}`);
    }
    
    // Faire l'appel API
    console.log(`📊 Récupération des détails pour ${cryptoId} depuis Coinlore...`);
    const url = `${COINLORE_API_URL}/ticker/?id=${coinloreId}`;
    
    const response = await fetchWithRetry(url);
    
    // Coinlore renvoie un tableau, même pour un seul élément
    if (!response || !Array.isArray(response) || response.length === 0) {
      throw new Error(`Données invalides pour ${cryptoId}`);
    }
    
    const cryptoData = response[0];
    
    // Transformer au format attendu par l'application
    const formattedData = {
      id: cryptoId,
      coinloreId: cryptoData.id,
      symbol: cryptoData.symbol,
      name: cryptoData.name,
      market_data: {
        current_price: {
          usd: parseFloat(cryptoData.price_usd)
        },
        market_cap: {
          usd: parseFloat(cryptoData.market_cap_usd)
        },
        total_volume: {
          usd: parseFloat(cryptoData.volume24)
        },
        price_change_percentage_24h: parseFloat(cryptoData.percent_change_24h),
        circulating_supply: parseFloat(cryptoData.csupply),
        total_supply: parseFloat(cryptoData.tsupply)
      },
      image: {
        large: getCryptoIconUrl(cryptoData.symbol),
        small: getCryptoIconUrl(cryptoData.symbol)
      },
      last_updated: new Date().toISOString()
    };
    
    // Sauvegarder dans le cache
    await saveToCache(cacheKey, formattedData);
    
    return formattedData;
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
const getMockTopCryptos = (): Cryptocurrency[] => {
  console.log('Utilisation des données mockées pour les cryptos');
  return [
    { 
      id: 'bitcoin', 
      symbol: 'BTC', 
      name: 'Bitcoin', 
      currentPrice: 50000, 
      marketCap: 1000000000000, 
      volume24h: 25000000000, 
      priceChangePercentage24h: 2.5, 
      image: getCryptoIconUrl('BTC') 
    },
    { 
      id: 'ethereum', 
      symbol: 'ETH', 
      name: 'Ethereum', 
      currentPrice: 2000, 
      marketCap: 500000000000, 
      volume24h: 15000000000, 
      priceChangePercentage24h: 1.8, 
      image: getCryptoIconUrl('ETH') 
    },
    { 
      id: 'ripple', 
      symbol: 'XRP', 
      name: 'XRP', 
      currentPrice: 0.5, 
      marketCap: 50000000000, 
      volume24h: 2000000000, 
      priceChangePercentage24h: -0.5, 
      image: getCryptoIconUrl('XRP') 
    },
    { 
      id: 'cardano', 
      symbol: 'ADA', 
      name: 'Cardano', 
      currentPrice: 1.2, 
      marketCap: 40000000000, 
      volume24h: 1500000000, 
      priceChangePercentage24h: 0.8, 
      image: getCryptoIconUrl('ADA') 
    },
    { 
      id: 'solana', 
      symbol: 'SOL', 
      name: 'Solana', 
      currentPrice: 100, 
      marketCap: 30000000000, 
      volume24h: 2500000000, 
      priceChangePercentage24h: 3.2, 
      image: getCryptoIconUrl('SOL') 
    },
  ];
};

/**
 * Vide le cache pour forcer le rafraîchissement des données
 */
export const clearCryptoCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key: string) => 
      key === CACHE_KEYS.TOP_CRYPTOS || 
      key === CACHE_KEYS.GLOBAL_MARKET ||
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

/**
 * Génération d'un historique de prix simulé (Coinlore n'offre pas d'historique)
 * @param cryptoId ID de la cryptomonnaie
 * @param days Nombre de jours d'historique
 */
export const fetchCryptoPriceHistory = async (
  cryptoId: string,
  days: number = 7
): Promise<PriceHistoryPoint[]> => {
  try {
    // Récupérer les détails actuels pour avoir le prix actuel
    const cryptoDetails = await fetchCryptoDetails(cryptoId);
    if (!cryptoDetails || !cryptoDetails.market_data || !cryptoDetails.market_data.current_price) {
      throw new Error(`Impossible de récupérer le prix actuel pour ${cryptoId}`);
    }
    
    const currentPrice = cryptoDetails.market_data.current_price.usd;
    const priceChange = cryptoDetails.market_data.price_change_percentage_24h / 100;
    
    // Générer un historique de prix simulé basé sur le prix actuel et la tendance
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const pointsPerDay = 24; // Un point par heure
    const totalPoints = days * pointsPerDay;
    const millisecondsPerPoint = millisecondsPerDay / pointsPerDay;
    
    // Calculer le prix d'il y a [days] jours en fonction de la tendance actuelle
    // Cette approche est simpliste mais suffisante pour une simulation
    const volatility = 0.02; // 2% de volatilité par jour
    const trend = 1 + (priceChange / days); // Tendance quotidienne basée sur la variation sur 24h
    const startingPrice = currentPrice / Math.pow(trend, days);
    
    // Générer les points de données
    const priceHistory: PriceHistoryPoint[] = [];
    
    for (let i = 0; i < totalPoints; i++) {
      const timestamp = now - (totalPoints - i) * millisecondsPerPoint;
      const dayProgress = i / totalPoints;
      
      // Calculer le prix avec une composante tendancielle et une composante aléatoire
      const trendComponent = startingPrice * Math.pow(trend, dayProgress * days);
      const randomComponent = (Math.random() - 0.5) * volatility * trendComponent;
      const price = trendComponent + randomComponent;
      
      priceHistory.push({
        timestamp,
        price
      });
    }
    
    // Ajouter le point final avec le prix actuel exact
    priceHistory.push({
      timestamp: now,
      price: currentPrice
    });
    
    return priceHistory;
  } catch (error) {
    console.error(`Error generating price history for ${cryptoId}:`, error);
    // Retourner un tableau vide en cas d'erreur
    return [];
  }
}; 