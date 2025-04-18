import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList, MainTabsParamList } from '../../navigation';
import { getCurrentUser } from '../../services/authService';
import { getUserPortfolio } from '../../services/gameService';
import { fetchTopCryptos, clearCryptoCache } from '../../services/cryptoApi';
import { User, Cryptocurrency, PortfolioItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

type StackNavigationProp = NativeStackNavigationProp<MainStackParamList>;
type TabNavigationProp = BottomTabNavigationProp<MainTabsParamList>;

type PortfolioItemWithDetails = PortfolioItem & {
  name: string;
  symbol: string;
  image: string;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
};

const PortfolioScreen: React.FC = () => {
  const stackNavigation = useNavigation<StackNavigationProp>();
  const tabNavigation = useNavigation<TabNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const { darkMode } = useTheme();

  const loadData = async (showRefreshIndicator = true) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      setRefreshError(null);
      
      console.log('📊 Chargement des données du portefeuille...');
      
      // Récupérer les données utilisateur et les cryptos en parallèle
      const [userData, cryptosData] = await Promise.all([
        getUserPortfolio(),
        fetchTopCryptos(100)
      ]);
      
      if (userData) {
        setUser(userData);
        console.log('📊 Données utilisateur chargées avec succès:', {
          balance: userData.balance,
          portfolioItems: userData.portfolio?.length || 0
        });
      } else {
        console.warn('⚠️ Données utilisateur nulles');
      }
      
      if (cryptosData && Array.isArray(cryptosData) && cryptosData.length > 0) {
        setCryptos(cryptosData);
        console.log('📊 Données des cryptos chargées avec succès:', {
          count: cryptosData.length,
          firstCrypto: cryptosData[0]?.name || 'N/A'
        });
        
        // Si nous avons à la fois l'utilisateur et les données crypto, calculer le portefeuille
        if (userData && userData.portfolio && Array.isArray(userData.portfolio)) {
          console.log('📊 Calcul du portefeuille détaillé...');
          const portfolioWithDetails: PortfolioItemWithDetails[] = userData.portfolio
            .map(portfolioItem => {
              if (!portfolioItem || !portfolioItem.cryptoId) {
                console.warn('⚠️ Élément du portefeuille invalide:', portfolioItem);
                return null;
              }
              
              const cryptoDetails = cryptosData.find(
                crypto => crypto.id === portfolioItem.cryptoId
              );

              if (!cryptoDetails) {
                console.warn(`⚠️ Crypto non trouvée pour l'ID: ${portfolioItem.cryptoId}`);
                return null;
              }

              // Utiliser des valeurs par défaut si nécessaire
              const currentPrice = cryptoDetails.currentPrice || 0;
              const amount = portfolioItem.amount || 0;
              const averageBuyPrice = portfolioItem.averageBuyPrice || 0;
              
              const totalValue = amount * currentPrice;
              const investmentValue = amount * averageBuyPrice;
              const profitLoss = totalValue - investmentValue;
              const profitLossPercentage = investmentValue > 0 
                ? (profitLoss / investmentValue) * 100 
                : 0;

              return {
                ...portfolioItem,
                name: cryptoDetails.name || 'Unknown',
                symbol: cryptoDetails.symbol || 'UNK',
                image: cryptoDetails.image || 'https://via.placeholder.com/32',
                currentPrice,
                totalValue,
                profitLoss,
                profitLossPercentage
              };
            })
            .filter((item): item is PortfolioItemWithDetails => item !== null)
            .sort((a, b) => b.totalValue - a.totalValue);
          
          console.log('📊 Portefeuille détaillé calculé:', {
            count: portfolioWithDetails.length,
            total: portfolioWithDetails.reduce((sum, item) => sum + item.totalValue, 0)
          });
          setPortfolioItems(portfolioWithDetails);
        } else {
          console.log('📊 Aucun portefeuille trouvé, initialisation avec un tableau vide');
          setPortfolioItems([]);
        }
      } else {
        console.warn('⚠️ Données des cryptos invalides');
      }
      
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setRefreshError('Erreur lors du chargement des données. Réessayez ou attendez quelques minutes.');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    console.log('📊 PortfolioScreen: Chargement initial des données');
    loadData();
    
    // Rafraîchissement automatique toutes les 60 secondes
    console.log('📊 PortfolioScreen: Configuration du rafraîchissement automatique');
    const intervalId = setInterval(() => {
      console.log('📊 PortfolioScreen: Rafraîchissement automatique');
      loadData(false);
    }, 60000); // 60 secondes
    
    return () => {
      console.log('📊 PortfolioScreen: Nettoyage du rafraîchissement automatique');
      clearInterval(intervalId);
    };
  }, []); // Aucune dépendance pour éviter les rechargements inutiles

  // Actualiser les données lorsque l'écran est de nouveau au premier plan
  useFocusEffect(
    useCallback(() => {
      console.log('📊 PortfolioScreen: L\'écran est au premier plan');
      
      // Vérifier si la dernière mise à jour date de plus de 30 secondes ou est nulle
      const shouldRefresh = !lastUpdate || new Date().getTime() - lastUpdate.getTime() > 30000;
      
      if (shouldRefresh) {
        console.log('📊 PortfolioScreen: Rechargement des données (dernière mise à jour > 30s)');
        loadData(false); // Ne pas afficher l'indicateur de rafraîchissement
      } else {
        console.log('📊 PortfolioScreen: Pas de rechargement nécessaire (dernière mise à jour < 30s)');
      }
            
      return () => {
        console.log('📊 PortfolioScreen: L\'écran n\'est plus au premier plan');
      };
    }, []) // Retirer la dépendance sur lastUpdate pour éviter les boucles
  );

  const handleRefresh = () => {
    loadData(true);
  };
  
  const handleForceRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Vider le cache pour forcer le rafraîchissement
      await clearCryptoCache();
      console.log('🧹 Cache vidé, rechargement des données...');
      await loadData(false);
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement forcé:', error);
      setRefreshError('Impossible de rafraîchir les données. Veuillez réessayer plus tard.');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Formater le temps écoulé depuis la dernière mise à jour
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'jamais';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `il y a ${diffSec} secondes`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
    
    const diffDay = Math.floor(diffHour / 24);
    return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  };

  const handleCryptoPress = (cryptoId: string, cryptoName: string) => {
    stackNavigation.navigate('Details', { cryptoId, cryptoName });
  };

  const calculateTotalPortfolioValue = () => {
    return portfolioItems.reduce((total, item) => total + item.totalValue, 0);
  };

  const calculateTotalProfitLoss = () => {
    return portfolioItems.reduce((total, item) => total + item.profitLoss, 0);
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '$0.00';
    return `$${price.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const renderPortfolioItem = ({ item }: { item: PortfolioItemWithDetails }) => {
    return (
      <TouchableOpacity
        style={[styles.portfolioItem, darkMode && styles.darkPortfolioItem]}
        onPress={() => handleCryptoPress(item.cryptoId, item.name)}
      >
        <View style={styles.cryptoInfo}>
          <Image source={{ uri: item.image }} style={styles.cryptoIcon} />
          <View style={styles.cryptoDetails}>
            <Text style={[styles.cryptoName, darkMode && styles.darkText]}>
              {item.name}
            </Text>
            <Text style={[styles.cryptoAmount, darkMode && styles.darkSubtext]}>
              {item.amount.toFixed(6)} {item.symbol}
            </Text>
          </View>
        </View>
        
        <View style={styles.valueInfo}>
          <Text style={[styles.itemValue, darkMode && styles.darkText]}>
            ${item.totalValue.toFixed(2)}
          </Text>
          
          <Text style={[
            styles.profitLossText,
            { color: item.profitLoss >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {item.profitLoss >= 0 ? '+' : ''}
            {item.profitLossPercentage.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyPortfolio = () => {
    return (
      <View style={[styles.emptyContainer, darkMode && styles.darkEmptyContainer]}>
        <Ionicons 
          name="wallet-outline" 
          size={80} 
          color={darkMode ? "#555" : "#ddd"} 
        />
        <Text style={[styles.emptyTitle, darkMode && styles.darkText]}>
          Portefeuille vide
        </Text>
        <Text style={[styles.emptyText, darkMode && styles.darkSubtext]}>
          Vous n'avez pas encore d'actifs dans votre portefeuille.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => tabNavigation.navigate('Market')}
        >
          <Text style={styles.startButtonText}>Explorer le marché</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#4a89f3" />
        <Text style={[styles.loadingText, darkMode && styles.darkText]}>
          Chargement de votre portefeuille...
        </Text>
      </View>
    );
  }

  const totalPortfolioValue = calculateTotalPortfolioValue();
  const totalProfitLoss = calculateTotalProfitLoss();
  const totalValue = (user?.balance || 0) + totalPortfolioValue;
  const totalProfitLossPercentage = totalValue > 0 
    ? ((totalValue - 10000) / 10000) * 100
    : 0;

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.header, darkMode && styles.darkHeader]}>
        <Text style={[styles.headerTitle, darkMode && styles.darkText]}>Mon Portefeuille</Text>
        {/* Ajouter des informations sur la dernière mise à jour */}
        <View style={styles.updateInfo}>
          <Text style={[styles.updateText, darkMode && styles.darkSubtext]}>
            Dernière mise à jour: {formatTimeAgo(lastUpdate)}
          </Text>
          <TouchableOpacity 
            onPress={handleForceRefresh} 
            disabled={isRefreshing}
            style={[styles.refreshButton, darkMode && styles.darkRefreshButton]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={darkMode ? "#333" : "white"} />
            ) : (
              <Text style={[styles.refreshButtonText, darkMode && styles.darkRefreshButtonText]}>Actualiser</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {refreshError ? (
        <View style={[styles.errorContainer, darkMode && styles.darkContainer]}>
          <Ionicons name="alert-circle-outline" size={64} color={darkMode ? "#aaa" : "#666"} />
          <Text style={[styles.errorText, darkMode && styles.darkText]}>{refreshError}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleForceRefresh}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={[styles.balanceCard, darkMode && styles.darkBalanceCard]}>
            <Text style={[styles.balanceLabel, darkMode && styles.darkSubtext]}>Valeur totale</Text>
            <Text style={[styles.balanceValue, darkMode && styles.darkText]}>{formatPrice(totalValue)}</Text>
            
            <View style={[styles.profitLossRow, darkMode && styles.darkProfitLossRow]}>
              <Text style={[styles.profitLossLabel, darkMode && styles.darkSubtext]}>Profit/Perte</Text>
              <View style={styles.profitLossValueContainer}>
                <Text 
                  style={[
                    styles.profitLossValue, 
                    { color: totalProfitLossPercentage >= 0 ? '#4CAF50' : '#F44336' }
                  ]}
                >
                  {totalProfitLossPercentage >= 0 ? '+' : ''}
                  {formatPrice(totalValue - 10000)}
                  {' ('}
                  {totalProfitLossPercentage.toFixed(2)}
                  {'%)'}
                </Text>
              </View>
            </View>
          </View>

          {portfolioItems.length > 0 ? (
            <FlatList
              data={portfolioItems}
              renderItem={renderPortfolioItem}
              keyExtractor={(item) => item.cryptoId}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={isRefreshing} 
                  onRefresh={handleRefresh} 
                  colors={['#4a89f3']}
                  tintColor={darkMode ? "#fff" : "#4a89f3"} 
                />
              }
              ListHeaderComponent={
                <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Vos actifs</Text>
              }
            />
          ) : (
            <View style={styles.emptyListContainer}>
              {renderEmptyPortfolio()}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#aaa',
  },
  darkSummaryContainer: {
    backgroundColor: '#1e1e1e',
  },
  darkSectionHeader: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#2c2c2c',
  },
  darkPortfolioItem: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#2c2c2c',
  },
  darkEmptyContainer: {
    backgroundColor: '#121212',
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
  balanceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    marginBottom: 10,
  },
  profitLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  profitLossLabel: {
    fontSize: 14,
    color: '#666',
  },
  profitLossValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitLossValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cryptoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cryptoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  cryptoDetails: {
    flex: 1,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cryptoAmount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  valueInfo: {
    alignItems: 'flex-end',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profitLossText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyListContainer: {
    flex: 1,
    paddingTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#4a89f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#888',
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4a89f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  darkHeader: {
    borderBottomColor: '#2c2c2c',
  },
  darkRefreshButton: {
    backgroundColor: '#2c2c2c',
  },
  darkRefreshButtonText: {
    color: '#fff',
  },
  darkBalanceCard: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#000',
  },
  darkProfitLossRow: {
    borderTopColor: '#2c2c2c',
  }
});

export default PortfolioScreen; 