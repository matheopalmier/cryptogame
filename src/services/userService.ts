import { ENDPOINTS } from '../config/api';
import { get } from './apiService';

export interface LeaderboardUser {
  id: string;
  username: string;
  portfolioValue: number;
  rank: number;
}

export interface PortfolioItem {
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
  amount: number;
  currentPrice: number;
  valueUSD: number;
  percentageOfPortfolio: number;
}

export interface Portfolio {
  totalValue: number;
  items: PortfolioItem[];
}

/**
 * Récupérer le classement des utilisateurs
 */
export const getLeaderboard = async (): Promise<LeaderboardUser[]> => {
  return await get(ENDPOINTS.LEADERBOARD);
};

/**
 * Récupérer le portfolio de l'utilisateur
 */
export const getUserPortfolio = async (): Promise<Portfolio> => {
  return await get(ENDPOINTS.PORTFOLIO);
}; 