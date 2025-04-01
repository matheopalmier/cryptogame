// Données fictives pour les tests sans backend
const mockData = {
  // Auth
  register: {
    success: true,
    user: {
      id: 'user_1',
      username: 'TestUser',
      email: 'test@example.com',
      balance: 10000,
      portfolio: []
    },
    token: 'mock_token_123'
  },
  
  login: {
    success: true,
    user: {
      id: 'user_1',
      username: 'TestUser',
      email: 'test@example.com',
      balance: 10000,
      portfolio: []
    },
    token: 'mock_token_123'
  },
  
  currentUser: {
    id: 'user_1',
    username: 'TestUser',
    email: 'test@example.com',
    balance: 10000,
    portfolio: [
      {
        cryptoId: 'bitcoin',
        amount: 0.5,
        averageBuyPrice: 45000
      },
      {
        cryptoId: 'ethereum',
        amount: 2,
        averageBuyPrice: 3000
      }
    ]
  },
  
  // Crypto
  cryptoMarket: [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      currentPrice: 50000,
      marketCap: 950000000000,
      priceChangePercentage24h: 2.5,
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      currentPrice: 3500,
      marketCap: 420000000000,
      priceChangePercentage24h: 1.8,
      image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
    },
    {
      id: 'cardano',
      name: 'Cardano',
      symbol: 'ADA',
      currentPrice: 1.2,
      marketCap: 38000000000,
      priceChangePercentage24h: -0.7,
      image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png'
    },
    {
      id: 'solana',
      name: 'Solana',
      symbol: 'SOL',
      currentPrice: 110,
      marketCap: 42000000000,
      priceChangePercentage24h: 3.2,
      image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
    },
    {
      id: 'binancecoin',
      name: 'Binance Coin',
      symbol: 'BNB',
      currentPrice: 420,
      marketCap: 65000000000,
      priceChangePercentage24h: 0.5,
      image: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png'
    }
  ],
  
  cryptoDetails: {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    currentPrice: 50000,
    marketCap: 950000000000,
    priceChangePercentage24h: 2.5,
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    description: 'Bitcoin est une crypto-monnaie inventée en 2008 par une personne ou un groupe de personnes utilisant le nom Satoshi Nakamoto. Elle a été mise en œuvre en tant que logiciel open-source en 2009. Bitcoin est une monnaie numérique décentralisée sans banque centrale ni administrateur unique.',
    high24h: 51200,
    low24h: 48500,
    ath: 69000,
    athDate: '2021-11-10T16:00:00.000Z',
    totalVolume: 32000000000,
    circulatingSupply: 19000000
  },
  
  cryptoHistory: [
    { timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, price: 45000 },
    { timestamp: Date.now() - 25 * 24 * 60 * 60 * 1000, price: 47000 },
    { timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000, price: 46000 },
    { timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000, price: 48000 },
    { timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, price: 47500 },
    { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, price: 49000 },
    { timestamp: Date.now(), price: 50000 }
  ],
  
  // Transactions
  buyCrypto: {
    success: true,
    message: 'Achat réussi',
    transaction: {
      id: 'tx_1',
      userId: 'user_1',
      cryptoId: 'bitcoin',
      cryptoName: 'Bitcoin',
      cryptoSymbol: 'BTC',
      amount: 0.1,
      price: 50000,
      type: 'buy',
      date: new Date().toISOString()
    },
    newBalance: 9500
  },
  
  sellCrypto: {
    success: true,
    message: 'Vente réussie',
    transaction: {
      id: 'tx_2',
      userId: 'user_1',
      cryptoId: 'bitcoin',
      cryptoName: 'Bitcoin',
      cryptoSymbol: 'BTC',
      amount: 0.05,
      price: 50000,
      type: 'sell',
      date: new Date().toISOString()
    },
    newBalance: 9750
  },
  
  transactions: [
    {
      id: 'tx_1',
      userId: 'user_1',
      cryptoId: 'bitcoin',
      cryptoName: 'Bitcoin',
      cryptoSymbol: 'BTC',
      amount: 0.2,
      price: 45000,
      type: 'buy',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'tx_2',
      userId: 'user_1',
      cryptoId: 'ethereum',
      cryptoName: 'Ethereum',
      cryptoSymbol: 'ETH',
      amount: 2,
      price: 3000,
      type: 'buy',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'tx_3',
      userId: 'user_1',
      cryptoId: 'bitcoin',
      cryptoName: 'Bitcoin',
      cryptoSymbol: 'BTC',
      amount: 0.05,
      price: 48000,
      type: 'sell',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  
  // Users
  leaderboard: [
    {
      userId: 'user_2',
      username: 'CryptoWhale',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      balance: 145750,
      profitPercentage: 45.75
    },
    {
      userId: 'user_7',
      username: 'BitcoinBaron',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      balance: 132680,
      profitPercentage: 32.68
    },
    {
      userId: 'user_3',
      username: 'CryptoQueen',
      avatar: 'https://randomuser.me/api/portraits/women/15.jpg',
      balance: 124930,
      profitPercentage: 24.93
    },
    {
      userId: 'user_1',
      username: 'TestUser',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      balance: 112000,
      profitPercentage: 12.0
    },
    {
      userId: 'user_8',
      username: 'DeFiDiva',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      balance: 108450,
      profitPercentage: 8.45
    },
    {
      userId: 'user_4',
      username: 'Hodler',
      avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
      balance: 106320,
      profitPercentage: 6.32
    },
    {
      userId: 'user_9',
      username: 'SatoshiFan',
      avatar: 'https://randomuser.me/api/portraits/men/36.jpg',
      balance: 103750,
      profitPercentage: 3.75
    },
    {
      userId: 'user_10',
      username: 'AltcoinAnnie',
      avatar: 'https://randomuser.me/api/portraits/women/36.jpg',
      balance: 101200,
      profitPercentage: 1.20
    },
    {
      userId: 'user_5',
      username: 'TraderPro',
      avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
      balance: 98500,
      profitPercentage: -1.5
    },
    {
      userId: 'user_11',
      username: 'TokenTrader',
      avatar: 'https://randomuser.me/api/portraits/men/62.jpg',
      balance: 95800,
      profitPercentage: -4.2
    },
    {
      userId: 'user_12',
      username: 'CryptoCadet',
      avatar: 'https://randomuser.me/api/portraits/women/48.jpg',
      balance: 92400,
      profitPercentage: -7.6
    },
    {
      userId: 'user_13',
      username: 'BlockchainBob',
      avatar: 'https://randomuser.me/api/portraits/men/78.jpg',
      balance: 89600,
      profitPercentage: -10.4
    },
    {
      userId: 'user_14',
      username: 'NFTNelly',
      avatar: 'https://randomuser.me/api/portraits/women/76.jpg',
      balance: 86900,
      profitPercentage: -13.1
    },
    {
      userId: 'user_15',
      username: 'MetaMike',
      avatar: 'https://randomuser.me/api/portraits/men/91.jpg',
      balance: 84200,
      profitPercentage: -15.8
    }
  ],
  
  portfolio: {
    totalValue: 15000,
    items: [
      {
        cryptoId: 'bitcoin',
        cryptoName: 'Bitcoin',
        cryptoSymbol: 'BTC',
        amount: 0.15,
        currentPrice: 50000,
        valueUSD: 7500,
        percentageOfPortfolio: 50
      },
      {
        cryptoId: 'ethereum',
        cryptoName: 'Ethereum',
        cryptoSymbol: 'ETH',
        amount: 2,
        currentPrice: 3500,
        valueUSD: 7000,
        percentageOfPortfolio: 46.67
      },
      {
        cryptoId: 'cardano',
        cryptoName: 'Cardano',
        cryptoSymbol: 'ADA',
        amount: 500,
        currentPrice: 1.2,
        valueUSD: 600,
        percentageOfPortfolio: 4
      }
    ]
  }
};

export default mockData; 