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
import { fetchTopCryptos } from '../../services/cryptoApi';

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigation = useNavigation();
  const { logout } = useAuth();
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Dans une vraie application, vous enregistreriez ce choix
  };

  const toggleNotifications = () => {
    setNotifications(!notifications);
    // Dans une vraie application, vous enregistreriez ce choix
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
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#4a89f3']}
          tintColor="#4a89f3"
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle" size={80} color="#4a89f3" />
          )}
        </View>
        <Text style={styles.username}>
          {user.username || 'Utilisateur'} 
          {!user.username && " (Nom non défini)"}
        </Text>
        <Text style={styles.email}>{user.email || 'Email non défini'}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            ${liquidBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.statLabel}>Solde liquide</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.portfolio?.length || 0}</Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {user.rank ? `#${user.rank}` : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Classement</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#4a89f3" />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color="#4a89f3" />
            <Text style={styles.refreshText}>Actualiser les données</Text>
          </>
        )}
      </TouchableOpacity>
      
      {lastUpdate && (
        <Text style={styles.lastUpdateText}>
          Dernière mise à jour: {formatTimeAgo(lastUpdate)}
        </Text>
      )}

      <View style={styles.valueCard}>
        <Text style={styles.cardTitle}>Valeur totale de votre portefeuille</Text>
        <Text style={styles.totalValue}>
          ${totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
        </Text>
        <View style={styles.valueSplit}>
          <View style={styles.valueItem}>
            <Text style={styles.valueAmount}>
              ${liquidBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.valueLabel}>Solde liquide</Text>
          </View>
          <View style={styles.valuePlusContainer}>
            <Text style={styles.valuePlus}>+</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueAmount}>
              ${assetsValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.valueLabel}>Valeur des actifs</Text>
          </View>
        </View>
        <View style={styles.profitSection}>
          <Text style={styles.profitLabel}>Profit total</Text>
          <Text 
            style={[
              styles.profitValue, 
              { color: user.profitPercentage && user.profitPercentage >= 0 ? '#4CAF50' : '#F44336' }
            ]}
          >
            {user.profitPercentage && user.profitPercentage >= 0 ? '+' : ''}
            {user.profitPercentage?.toFixed(2) || '0.00'}%
          </Text>
        </View>
      </View>

      {/* Portfolio détaillé */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Détail de vos actifs</Text>
        
        {user.portfolio && user.portfolio.length > 0 ? (
          user.portfolio.map((asset) => {
            const crypto = cryptos.find(c => c.id === asset.cryptoId);
            const currentValue = crypto ? asset.amount * crypto.currentPrice : 0;
            const profitLoss = crypto ? currentValue - (asset.amount * asset.averageBuyPrice) : 0;
            const profitLossPercentage = crypto && asset.averageBuyPrice > 0 
              ? ((crypto.currentPrice - asset.averageBuyPrice) / asset.averageBuyPrice) * 100 
              : 0;
            
            return (
              <View key={asset.cryptoId} style={styles.assetItem}>
                <View style={styles.assetHeader}>
                  <Text style={styles.assetName}>
                    {crypto?.name || asset.cryptoId}
                  </Text>
                  <Text style={styles.assetValue}>
                    ${currentValue.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.assetDetails}>
                  <Text style={styles.assetAmount}>
                    {asset.amount.toFixed(6)} {crypto?.symbol || asset.cryptoId}
                  </Text>
                  <Text style={[
                    styles.assetProfit,
                    { color: profitLoss >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {profitLoss >= 0 ? '+' : ''}
                    {profitLossPercentage.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.assetPriceInfo}>
                  <Text style={styles.assetPriceLabel}>Prix d'achat:</Text>
                  <Text style={styles.assetPrice}>
                    ${asset.averageBuyPrice.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.assetPriceLabel}>Prix actuel:</Text>
                  <Text style={styles.assetPrice}>
                    ${crypto?.currentPrice.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) || 'N/A'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyTransactions}>
            Vous n'avez pas encore d'actifs
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="moon-outline" size={24} color="#333" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Mode sombre</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#e0e0e0', true: '#4a89f380' }}
            thumbColor={darkMode ? '#4a89f3' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="notifications-outline" size={24} color="#333" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#e0e0e0', true: '#4a89f380' }}
            thumbColor={notifications ? '#4a89f3' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des transactions</Text>
        
        {transactions.length > 0 ? (
          transactions.slice(0, 5).map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionType}>
                  {transaction.type === 'buy' ? 'Achat' : 'Vente'}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.timestamp)}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionAmount}>
                  {transaction.amount.toFixed(4)} {transaction.cryptoId.toUpperCase()}
                </Text>
                <Text style={styles.transactionPrice}>
                  ${transaction.price.toLocaleString('fr-FR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyTransactions}>
            Aucune transaction pour le moment
          </Text>
        )}
        
        {transactions.length > 5 && (
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllButtonText}>Voir tout l'historique</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
});

export default ProfileScreen; 