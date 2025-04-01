import { ENDPOINTS } from '../config/api';
import { post, get } from './apiService';

export interface Transaction {
  id: string;
  userId: string;
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
  amount: number;
  price: number;
  type: 'buy' | 'sell';
  date: string;
}

export interface BuyCryptoData {
  cryptoId: string;
  amount: number;
}

export interface SellCryptoData {
  cryptoId: string;
  amount: number;
}

/**
 * Acheter de la crypto-monnaie
 */
export const buyCrypto = async (data: BuyCryptoData): Promise<any> => {
  return await post(ENDPOINTS.BUY_CRYPTO, data);
};

/**
 * Vendre de la crypto-monnaie
 */
export const sellCrypto = async (data: SellCryptoData): Promise<any> => {
  return await post(ENDPOINTS.SELL_CRYPTO, data);
};

/**
 * Récupérer l'historique des transactions de l'utilisateur
 */
export const getUserTransactions = async (): Promise<Transaction[]> => {
  return await get(ENDPOINTS.TRANSACTIONS);
}; 