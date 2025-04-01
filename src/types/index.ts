export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  balance: number;
  portfolio: PortfolioItem[];
  rank?: number;
  profitPercentage?: number;
  totalValue?: number;
}

export interface PortfolioItem {
  cryptoId: string;
  amount: number;
  averageBuyPrice: number;
}

export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  priceChangePercentage24h: number;
  image: string;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  balance: number;
  profitPercentage: number;
}

export type AuthProvider = 'local' | 'google' | 'apple';

export interface Transaction {
  id: string;
  userId: string;
  cryptoId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
} 