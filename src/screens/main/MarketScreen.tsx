import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation';
import { fetchTopCryptos } from '../../services/cryptoApi';
import { Cryptocurrency } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

type ScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

const MarketScreen: React.FC = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([]);
  const [filteredCryptos, setFilteredCryptos] = useState<Cryptocurrency[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { darkMode } = useTheme();

  const loadCryptos = useCallback(async () => {
    try {
      const data = await fetchTopCryptos(100);
      
      // Debug log pour vérifier la structure des données
      if (data && data.length > 0) {
        console.log('Premier élément crypto reçu:', JSON.stringify(data[0], null, 2));
      } else {
        console.warn('Aucune donnée crypto reçue');
      }
      
      setCryptos(data);
      setFilteredCryptos(data);
    } catch (error) {
      console.error('Error loading cryptocurrencies:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCryptos();

    // Dans une vraie application, nous pourrions avoir une mise à jour en temps réel
    const intervalId = setInterval(() => {
      loadCryptos();
    }, 60000); // Rafraîchir chaque minute

    return () => clearInterval(intervalId);
  }, [loadCryptos]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCryptos(cryptos);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cryptos.filter(
        crypto =>
          crypto.name.toLowerCase().includes(query) ||
          crypto.symbol.toLowerCase().includes(query)
      );
      setFilteredCryptos(filtered);
    }
  }, [searchQuery, cryptos]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCryptos();
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '$0.00';
    if (price >= 1000) {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    } else {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
    }
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (marketCap === undefined || marketCap === null) return '$0';
    
    if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md`;
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M`;
    } else {
      return `$${marketCap.toLocaleString('fr-FR')}`;
    }
  };

  const renderCryptoItem = ({ item }: { item: Cryptocurrency }) => {
    // Garantir que toutes les propriétés sont définies
    const currentPrice = item.currentPrice ?? 0;
    const marketCap = item.marketCap ?? 0;
    const volume24h = item.volume24h ?? 0;
    const priceChangePercentage = item.priceChangePercentage24h ?? 0;
    const cryptoSymbol = item.symbol || 'UNKNOWN';
    const cryptoName = item.name || 'Unknown Cryptocurrency';
    const imageUrl = item.image || 'https://via.placeholder.com/32';
    
    const priceChangeColor = priceChangePercentage >= 0 ? '#4CAF50' : '#F44336';
    
    return (
      <TouchableOpacity
        style={[styles.cryptoItem, darkMode && styles.darkCryptoItem]}
        onPress={() => 
          navigation.navigate('Details', { 
            cryptoId: item.id, 
            cryptoName: cryptoName 
          })
        }
      >
        <View style={styles.cryptoInfo}>
          <Image source={{ uri: imageUrl }} style={styles.cryptoIcon} />
          <View style={styles.cryptoNameContainer}>
            <Text style={[styles.cryptoName, darkMode && styles.darkText]}>{cryptoName}</Text>
            <Text style={[styles.cryptoSymbol, darkMode && styles.darkSubtext]}>{cryptoSymbol}</Text>
          </View>
        </View>
        
        <View style={styles.cryptoPriceContainer}>
          <Text style={[styles.cryptoPrice, darkMode && styles.darkText]}>{formatPrice(currentPrice)}</Text>
          <View style={[styles.priceChangeContainer, { backgroundColor: `${priceChangeColor}20` }]}>
            <Text style={[styles.priceChange, { color: priceChangeColor }]}>
              {priceChangePercentage >= 0 ? '+' : ''}
              {priceChangePercentage.toFixed(2)}%
            </Text>
          </View>
          <Text style={[styles.marketCap, darkMode && styles.darkSubtext]}>{formatMarketCap(marketCap)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#4a89f3" />
        <Text style={[styles.loadingText, darkMode && styles.darkText]}>Chargement des cryptomonnaies...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.searchContainer, darkMode && styles.darkSearchContainer]}>
        <Ionicons name="search" size={20} color={darkMode ? "#aaa" : "#666"} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, darkMode && styles.darkSearchInput]}
          placeholder="Rechercher une cryptomonnaie..."
          placeholderTextColor={darkMode ? "#888" : "#999"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      <FlatList
        data={filteredCryptos}
        renderItem={renderCryptoItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            tintColor={darkMode ? "#fff" : "#4a89f3"}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, darkMode && styles.darkText]}>Marché Crypto</Text>
            <Text style={[styles.headerSubtitle, darkMode && styles.darkSubtext]}>
              Les 100 principales cryptomonnaies par capitalisation
            </Text>
          </View>
        }
      />
    </View>
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
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#aaa',
  },
  darkCryptoItem: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#2c2c2c',
  },
  darkSearchContainer: {
    backgroundColor: '#1e1e1e',
    borderColor: '#2c2c2c',
  },
  darkSearchInput: {
    color: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  cryptoNameContainer: {
    flex: 1,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cryptoPriceContainer: {
    alignItems: 'flex-end',
  },
  cryptoPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceChangeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  marketCap: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default MarketScreen; 