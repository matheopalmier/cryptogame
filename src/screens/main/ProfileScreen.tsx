import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Switch,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../services/authService';
import { getTransactionHistory } from '../../services/gameService';
import { User, Transaction, Cryptocurrency } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchTopCryptos } from '../../services/cryptoApi';

// Créer un composant pour l'icône avec un fallback
interface AssetIconProps {
  crypto: Cryptocurrency | undefined;
  assetId: string;
}

const AssetIcon: React.FC<AssetIconProps> = ({ crypto, assetId }) => {
  const [hasError, setHasError] = useState(false);
  
  return (
    <View style={styles.assetIconContainer}>
      {!hasError ? (
        <Image 
          source={{ uri: crypto?.image }} 
          style={styles.assetIcon} 
          onError={() => {
            console.log(`Erreur de chargement d'image pour ${crypto?.symbol || assetId}`);
            setHasError(true);
          }}
        />
      ) : (
        <View style={styles.fallbackBubble}>
          <Text style={styles.fallbackText}>
            {(crypto?.symbol || assetId).slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async (showRefreshIndicator = true) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      
      console.log("🔄 Chargement des données du profil...");
      
      // Récupérer toutes les données nécessaires en parallèle
      const [userData, transactionsData, cryptosData] = await Promise.all([
        getCurrentUser(),
        getTransactionHistory(),
        fetchTopCryptos(100), // Récupérer les 100 premières cryptos pour avoir leurs prix
      ]);

      console.log("👤 Données utilisateur récupérées:", userData);
      console.log(`💰 ${cryptosData.length} cryptomonnaies récupérées avec leurs prix actuels`);
      
      setUser(userData);
      setTransactions(transactionsData);
      setCryptos(cryptosData);
      setLastUpdate(new Date());
      
      // Afficher dans la console les cryptos de l'utilisateur et leurs valeurs actuelles
      if (userData && userData.portfolio && cryptosData.length > 0) {
        console.log("📊 Portefeuille actuel:");
        let totalValue = 0;
        
        userData.portfolio.forEach(asset => {
          const crypto = cryptosData.find(c => c.id === asset.cryptoId);
          if (crypto) {
            const currentValue = asset.amount * crypto.currentPrice;
            totalValue += currentValue;
            console.log(`   - ${asset.cryptoId}: ${asset.amount} × $${crypto.currentPrice} = $${currentValue.toFixed(2)}`);
          } else {
            console.log(`   - ${asset.cryptoId}: Non trouvé dans les données de marché`);
          }
        });
        
        console.log(`💵 Valeur totale des actifs: $${totalValue.toFixed(2)}`);
        console.log(`💵 Solde liquide: $${userData.balance.toFixed(2)}`);
        console.log(`💵 Valeur totale du portefeuille: $${(totalValue + userData.balance).toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      Alert.alert(
        "Erreur de chargement", 
        "Impossible de charger les données les plus récentes. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Charger les données au montage du composant
  useEffect(() => {
    loadData();
    
    // Configurer une actualisation automatique toutes les 60 secondes
    refreshTimerRef.current = setInterval(() => {
      console.log("⏱️ Actualisation automatique des données...");
      loadData(false); // Ne pas montrer l'indicateur pour les actualisations automatiques
    }, 60000);
    
    // Nettoyage à la destruction du composant
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadData]);
  
  // Recharger les données lorsque l'écran redevient actif
  useFocusEffect(
    useCallback(() => {
      console.log("🔍 L'écran de profil est de nouveau au premier plan, actualisation des données...");
      loadData();
      
      return () => {
        console.log("⬅️ Sortie de l'écran de profil");
      };
    }, [loadData])
  );

  // Calculer la valeur actuelle des actifs en fonction des prix du marché
  const calculateCurrentPortfolioValue = () => {
    if (!user || !user.portfolio || !cryptos.length) return 0;
    
    let portfolioValue = 0;
    
    user.portfolio.forEach(asset => {
      // Trouver la crypto correspondante pour obtenir son prix actuel
      const crypto = cryptos.find(c => c.id === asset.cryptoId);
      if (crypto) {
        // Calculer la valeur basée sur le prix actuel
        const currentValue = asset.amount * crypto.currentPrice;
        portfolioValue += currentValue;
      } else {
        console.log(`⚠️ Crypto non trouvée pour l'actif: ${asset.cryptoId}`);
      }
    });
    
    return portfolioValue;
  };

  // Fonction pour obtenir le solde liquide
  const getLiquidBalance = () => {
    return user ? user.balance : 0;
  };

  // Fonction pour obtenir la valeur totale (solde + actifs)
  const getTotalValue = () => {
    const assetsValue = calculateCurrentPortfolioValue();
    const liquidBalance = getLiquidBalance();
    return assetsValue + liquidBalance;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' as never }],
                })
              );
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRefresh = () => {
    loadData();
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `Il y a ${diffInSeconds} secondes`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a89f3" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#F44336" />
        <Text style={styles.errorText}>Impossible de charger le profil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculs des valeurs actuelles
  const assetsValue = calculateCurrentPortfolioValue();
  const liquidBalance = getLiquidBalance();
  const totalValue = assetsValue + liquidBalance;

  return (
    <ScrollView 
      style={[styles.container, darkMode && styles.darkContainer]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#4a89f3']}
          tintColor={darkMode ? "#fff" : "#4a89f3"}
        />
      }
    >
      <View style={[styles.header, darkMode && styles.darkHeader]}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle" size={80} color={darkMode ? "#fff" : "#4a89f3"} />
          )}
        </View>
        <Text style={[styles.username, darkMode && styles.darkText]}>
          {user.username || 'Utilisateur'} 
          {!user.username && " (Nom non défini)"}
        </Text>
        <Text style={[styles.email, darkMode && styles.darkSubtext]}>
          {user.email || 'Email non défini'}
        </Text>
      </View>

      <View style={[styles.statsCard, darkMode && styles.darkCard]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, darkMode && styles.darkText]}>
            ${liquidBalance.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, darkMode && styles.darkSubtext]}>Solde liquide</Text>
        </View>
        <View style={[styles.statDivider, darkMode && styles.darkDivider]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, darkMode && styles.darkText]}>
            {user.portfolio?.length || 0}
          </Text>
          <Text style={[styles.statLabel, darkMode && styles.darkSubtext]}>Actifs</Text>
        </View>
        <View style={[styles.statDivider, darkMode && styles.darkDivider]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, darkMode && styles.darkText]}>
            {user.rank ? `#${user.rank}` : 'N/A'}
          </Text>
          <Text style={[styles.statLabel, darkMode && styles.darkSubtext]}>Classement</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.refreshButton, darkMode && styles.darkRefreshButton]} 
        onPress={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color={darkMode ? "#fff" : "#4a89f3"} />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color={darkMode ? "#fff" : "#4a89f3"} />
            <Text style={[styles.refreshText, darkMode && styles.darkRefreshText]}>
              Actualiser les données
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {lastUpdate && (
        <Text style={[styles.lastUpdateText, darkMode && styles.darkSubtext]}>
          Dernière mise à jour: {formatTimeAgo(lastUpdate)}
        </Text>
      )}

      <View style={[styles.valueCard, darkMode && styles.darkValueCard]}>
        <Text style={[styles.cardTitle, darkMode && styles.darkText]}>
          Valeur totale de votre portefeuille
        </Text>
        <Text style={[styles.totalValue, darkMode && styles.darkText]}>
          ${totalValue.toFixed(2)}
        </Text>
        <View style={styles.valueSplit}>
          <View style={styles.valueItem}>
            <Text style={[styles.valueAmount, darkMode && styles.darkText]}>
              ${liquidBalance.toFixed(2)}
            </Text>
            <Text style={[styles.valueLabel, darkMode && styles.darkSubtext]}>Solde liquide</Text>
          </View>
          <View style={styles.valuePlusContainer}>
            <Text style={[styles.valuePlus, darkMode && styles.darkText]}>+</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={[styles.valueAmount, darkMode && styles.darkText]}>
              ${assetsValue.toFixed(2)}
            </Text>
            <Text style={[styles.valueLabel, darkMode && styles.darkSubtext]}>Valeur des actifs</Text>
          </View>
        </View>
        <View style={styles.profitSection}>
          <Text style={[styles.profitLabel, darkMode && styles.darkText]}>Profit total</Text>
          <Text 
            style={[
              styles.profitValue, 
              { color: user.profitPercentage && user.profitPercentage >= 0 ? '#4CAF50' : '#F44336' },
              darkMode && styles.darkText
            ]}
          >
            {user.profitPercentage && user.profitPercentage >= 0 ? '+' : ''}
            {user.profitPercentage?.toFixed(2) || '0.00'}%
          </Text>
        </View>
      </View>

      {/* Portfolio détaillé */}
      <View style={[styles.section, darkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Détail de vos actifs</Text>
        
        {user.portfolio && user.portfolio.length > 0 ? (
          user.portfolio.map((asset) => {
            const crypto = cryptos.find(c => c.id === asset.cryptoId);
            const currentValue = crypto ? asset.amount * crypto.currentPrice : 0;
            const profitLoss = crypto ? currentValue - (asset.amount * asset.averageBuyPrice) : 0;
            const profitLossPercentage = crypto && asset.averageBuyPrice > 0 
              ? ((crypto.currentPrice - asset.averageBuyPrice) / asset.averageBuyPrice) * 100 
              : 0;
            
            return (
              <View key={asset.cryptoId} style={[styles.assetItem, darkMode && styles.darkAssetItem]}>
                <View style={[styles.assetHeader, darkMode && styles.darkAssetHeader]}>
                  <View style={[styles.assetNameContainer, darkMode && styles.darkAssetNameContainer]}>
                    <AssetIcon crypto={crypto} assetId={asset.cryptoId} />
                    <Text style={[styles.assetName, darkMode && styles.darkText]}>
                      {crypto?.name || asset.cryptoId}
                    </Text>
                  </View>
                  <Text style={[styles.assetValue, darkMode && styles.darkText]}>
                    ${currentValue.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.assetDetails, darkMode && styles.darkAssetDetails]}>
                  <Text style={[styles.assetAmount, darkMode && styles.darkText]}>
                    {asset.amount.toFixed(6)} {crypto?.symbol || asset.cryptoId}
                  </Text>
                  <Text style={[
                    styles.assetProfit,
                    { color: profitLoss >= 0 ? '#4CAF50' : '#F44336' },
                    darkMode && styles.darkText
                  ]}>
                    {profitLoss >= 0 ? '+' : ''}
                    {profitLossPercentage.toFixed(2)}%
                  </Text>
                </View>
                <View style={[styles.assetPriceInfo, darkMode && styles.darkAssetPriceInfo]}>
                  <Text style={[styles.assetPriceLabel, darkMode && styles.darkText]}>Prix d'achat:</Text>
                  <Text style={[styles.assetPrice, darkMode && styles.darkText]}>
                    ${asset.averageBuyPrice.toFixed(2)}
                  </Text>
                  <Text style={[styles.assetPriceLabel, darkMode && styles.darkText]}>Prix actuel:</Text>
                  <Text style={[styles.assetPrice, darkMode && styles.darkText]}>
                    ${crypto?.currentPrice.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.emptyTransactions, darkMode && styles.darkText]}>
            Vous n'avez pas encore d'actifs
          </Text>
        )}
      </View>

      <View style={[styles.section, darkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Paramètres</Text>
        
        <View style={[styles.settingItem, darkMode && styles.darkSettingItem]}>
          <View style={[styles.settingLabelContainer, darkMode && styles.darkSettingLabelContainer]}>
            <Ionicons 
              name="moon-outline" 
              size={24} 
              color={darkMode ? "#fff" : "#333"} 
              style={styles.settingIcon} 
            />
            <Text style={[styles.settingLabel, darkMode && styles.darkText]}>
              Mode sombre
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#e0e0e0', true: '#4a89f380' }}
            thumbColor={darkMode ? '#4a89f3' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={[styles.section, darkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Historique des transactions</Text>
        
        {transactions.length > 0 ? (
          // Afficher les 4 transactions les plus récentes en triant par date décroissante
          [...transactions]
            .sort((a, b) => b.timestamp - a.timestamp) // Trier par date décroissante (plus récent en premier)
            .slice(0, 4) // Prendre seulement les 4 premières (plus récentes)
            .map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, darkMode && styles.darkTransactionItem]}>
              <View style={[styles.transactionInfo, darkMode && styles.darkTransactionInfo]}>
                <Text style={[styles.transactionType, darkMode && styles.darkText]}>
                  {transaction.type === 'buy' ? 'Achat' : 'Vente'}
                </Text>
                <Text style={[styles.transactionDate, darkMode && styles.darkText]}>
                  {formatDate(transaction.timestamp)}
                </Text>
              </View>
              <View style={[styles.transactionDetails, darkMode && styles.darkTransactionDetails]}>
                <Text style={[styles.transactionAmount, darkMode && styles.darkText]}>
                  {transaction.amount.toFixed(4)} {transaction.cryptoId.toUpperCase()}
                </Text>
                <Text style={[styles.transactionPrice, darkMode && styles.darkText]}>
                  ${transaction.price.toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyTransactions, darkMode && styles.darkText]}>
            Aucune transaction pour le moment
          </Text>
        )}
        
        {transactions.length > 4 && (
          <TouchableOpacity style={[styles.viewAllButton, darkMode && styles.darkViewAllButton]}>
            <Text style={[styles.viewAllButtonText, darkMode && styles.darkText]}>Voir tout l'historique</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4a89f3',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 8,
    color: '#4a89f3',
    fontSize: 14,
    fontWeight: '600',
  },
  valueCard: {
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  valueSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
  },
  valueAmount: {
    fontSize: 16,
    color: '#333',
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  valuePlusContainer: {
    width: 20,
    alignItems: 'center',
  },
  valuePlus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  profitSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 16,
    color: '#666',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  assetItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  assetNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  assetIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  assetIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
  },
  assetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  assetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  assetAmount: {
    fontSize: 14,
    color: '#666',
  },
  assetProfit: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  assetPriceInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  assetPriceLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  assetPrice: {
    fontSize: 12,
    color: '#333',
    marginRight: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionDetails: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    color: '#333',
  },
  transactionPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyTransactions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  viewAllButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  viewAllButtonText: {
    color: '#4a89f3',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 12,
    borderRadius: 8,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackBubble: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkHeader: {
    borderBottomColor: '#2c2c2c',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#aaa',
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#000',
  },
  darkDivider: {
    backgroundColor: '#2c2c2c',
  },
  darkSection: {
    borderBottomColor: '#2c2c2c',
  },
  darkValueCard: {
    borderBottomColor: '#2c2c2c',
  },
  darkRefreshButton: {
    backgroundColor: '#2c2c2c',
  },
  darkRefreshText: {
    color: '#fff',
  },
  darkAssetItem: {
    backgroundColor: '#1e1e1e',
  },
  darkAssetHeader: {
    backgroundColor: '#2c2c2c',
  },
  darkAssetNameContainer: {
    backgroundColor: '#2c2c2c',
  },
  darkAssetDetails: {
    backgroundColor: '#2c2c2c',
  },
  darkAssetPriceInfo: {
    backgroundColor: '#2c2c2c',
  },
  darkAssetPriceLabel: {
    color: '#aaa',
  },
  darkAssetPrice: {
    color: '#aaa',
  },
  darkSettingItem: {
    backgroundColor: '#2c2c2c',
  },
  darkSettingLabelContainer: {
    backgroundColor: '#2c2c2c',
  },
  darkSettingIcon: {
    color: '#aaa',
  },
  darkSettingLabel: {
    color: '#aaa',
  },
  darkTransactionItem: {
    backgroundColor: '#2c2c2c',
  },
  darkTransactionInfo: {
    backgroundColor: '#2c2c2c',
  },
  darkTransactionType: {
    color: '#aaa',
  },
  darkTransactionDate: {
    color: '#aaa',
  },
  darkTransactionDetails: {
    backgroundColor: '#2c2c2c',
  },
  darkTransactionAmount: {
    color: '#aaa',
  },
  darkTransactionPrice: {
    color: '#aaa',
  },
  darkEmptyTransactions: {
    color: '#aaa',
  },
  darkViewAllButton: {
    backgroundColor: '#2c2c2c',
  },
  darkViewAllButtonText: {
    color: '#aaa',
  },
});

export default ProfileScreen; 