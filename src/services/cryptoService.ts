import { ENDPOINTS } from '../config/api';
import { get } from './apiService';

export interface Crypto {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  marketCap: number;
  priceChangePercentage24h: number;
  image: string;
}

export interface CryptoDetail extends Crypto {
  description: string;
  high24h: number;
  low24h: number;
  ath: number;
  athDate: string;
  totalVolume: number;
  circulatingSupply: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

/**
 * Récupérer la liste des crypto-monnaies sur le marché
 */
export const getCryptoMarket = async (): Promise<Crypto[]> => {
  return await get(ENDPOINTS.CRYPTO_MARKET);
};

/**
 * Récupérer les détails d'une crypto-monnaie spécifique
 */
export const getCryptoDetails = async (cryptoId: string): Promise<CryptoDetail> => {
  return await get(ENDPOINTS.CRYPTO_DETAILS(cryptoId));
};

/**
 * Récupérer l'historique des prix d'une crypto-monnaie
 */
export const getCryptoHistory = async (cryptoId: string): Promise<PricePoint[]> => {
  return await get(ENDPOINTS.CRYPTO_HISTORY(cryptoId));
}; 