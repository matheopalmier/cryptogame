import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation';
import { fetchCryptoDetails, fetchCryptoPriceHistory } from '../../services/cryptoApi';
import { Cryptocurrency, PriceHistoryPoint } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

type Props = NativeStackScreenProps<MainStackParamList, 'Details'>;

const getCryptoIconUrl = (symbol: string): string => {
  // Retourne une image par défaut pour toutes les cryptos
  return 'https://via.placeholder.com/32';
};

const DetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { cryptoId, cryptoName } = route.params;
  const [crypto, setCrypto] = useState<Cryptocurrency | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState<number>(7); // jours
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const { darkMode } = useTheme();

  // Définir la fonction loadPriceHistory en dehors des useEffect
  const loadPriceHistory = async () => {
    setIsChartLoading(true);
    try {
      const history = await fetchCryptoPriceHistory(cryptoId, timeRange);
      setPriceHistory(history);
    } catch (error) {
      console.error('Error loading price history:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des prix');
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    const loadCryptoDetails = async () => {
      try {
        setIsLoading(true);
        const data = await fetchCryptoDetails(cryptoId);
        setCrypto({
          id: data.id,
          name: data.name,
          symbol: data.symbol,
          currentPrice: data.market_data?.current_price?.usd || 0,
          marketCap: data.market_data?.market_cap?.usd || 0,
          volume24h: data.market_data?.total_volume?.usd || 0,
          priceChangePercentage24h: data.market_data?.price_change_percentage_24h || 0,
          image: data.image?.large || getCryptoIconUrl(data.symbol),
        });
        setIsLoading(false);
        // Maintenant loadPriceHistory est accessible ici
        await loadPriceHistory();
      } catch (error) {
        console.error('Error loading crypto details:', error);
        Alert.alert(
          'Erreur',
          'Impossible de charger les détails de cette cryptomonnaie. Veuillez réessayer.'
        );
        setIsLoading(false);
      }
    };

    loadCryptoDetails();
  }, [cryptoId]);

  // Mettre à jour l'historique des prix lorsque timeRange change
  useEffect(() => {
    if (crypto) { // Ne charger que si nous avons déjà des détails crypto
      loadPriceHistory();
    }
  }, [timeRange, cryptoId]);

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) return '$0.00';
    if (price >= 1000) {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
    } else {
      return `$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR');
  };

  const handleBuy = () => {
    if (!crypto) return;
    
    navigation.navigate('Transaction', {
      cryptoId,
      cryptoName,
      currentPrice: crypto.currentPrice,
      type: 'buy',
    });
  };

  const handleSell = () => {
    if (!crypto) return;
    
    navigation.navigate('Transaction', {
      cryptoId,
      cryptoName,
      currentPrice: crypto.currentPrice,
      type: 'sell',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, darkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#4a89f3" />
        <Text style={[styles.loadingText, darkMode && styles.darkText]}>
          Chargement des détails...
        </Text>
      </View>
    );
  }

  if (!crypto) {
    return (
      <View style={[styles.errorContainer, darkMode && styles.darkContainer]}>
        <Ionicons name="alert-circle-outline" size={50} color="#F44336" />
        <Text style={[styles.errorText, darkMode && styles.darkText]}>
          Impossible de charger les détails
        </Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 32;
  const chartData = {
    labels: priceHistory.length > 0 
      ? priceHistory
          .filter((_, i) => i % Math.max(1, Math.floor(priceHistory.length / 6)) === 0)
          .map(point => formatDate(point.timestamp))
      : [''],
    datasets: [
      {
        data: priceHistory.length > 0 
          ? priceHistory.map(point => point.price) 
          : [0],
        color: (opacity = 1) => `rgba(74, 137, 243, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: darkMode ? '#1e1e1e' : '#fff',
    backgroundGradientTo: darkMode ? '#1e1e1e' : '#fff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(74, 137, 243, ${opacity})`,
    labelColor: (opacity = 1) => darkMode 
      ? `rgba(255, 255, 255, ${opacity})` 
      : `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: '#4a89f3',
    },
  };

  const priceChangeColor = crypto.priceChangePercentage24h >= 0 ? '#4CAF50' : '#F44336';

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={[styles.header, darkMode && styles.darkHeader]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, darkMode && styles.darkText]}>Prix actuel</Text>
          <Text style={[styles.price, darkMode && styles.darkText]}>
            {formatPrice(crypto.currentPrice)}
          </Text>
          <View style={[styles.priceChangeContainer, { backgroundColor: `${priceChangeColor}20` }]}>
            <Text style={[styles.priceChange, { color: priceChangeColor }]}>
              {crypto.priceChangePercentage24h >= 0 ? '+' : ''}
              {crypto.priceChangePercentage24h.toFixed(2)}% (24h)
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.chartContainer, darkMode && styles.darkChartContainer]}>
        <View style={styles.timeRangeSelector}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 1 && styles.timeRangeButtonActive,
              darkMode && styles.darkTimeRangeButton,
              timeRange === 1 && darkMode && styles.darkTimeRangeButtonActive
            ]}
            onPress={() => setTimeRange(1)}
          >
            <Text 
              style={[
                styles.timeRangeButtonText,
                timeRange === 1 && styles.timeRangeButtonTextActive,
                darkMode && styles.darkTimeRangeButtonText,
                timeRange === 1 && darkMode && styles.darkTimeRangeButtonTextActive
              ]}
            >
              1J
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 7 && styles.timeRangeButtonActive,
              darkMode && styles.darkTimeRangeButton,
              timeRange === 7 && darkMode && styles.darkTimeRangeButtonActive
            ]}
            onPress={() => setTimeRange(7)}
          >
            <Text 
              style={[
                styles.timeRangeButtonText,
                timeRange === 7 && styles.timeRangeButtonTextActive,
                darkMode && styles.darkTimeRangeButtonText,
                timeRange === 7 && darkMode && styles.darkTimeRangeButtonTextActive
              ]}
            >
              7J
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 30 && styles.timeRangeButtonActive,
              darkMode && styles.darkTimeRangeButton,
              timeRange === 30 && darkMode && styles.darkTimeRangeButtonActive
            ]}
            onPress={() => setTimeRange(30)}
          >
            <Text 
              style={[
                styles.timeRangeButtonText,
                timeRange === 30 && styles.timeRangeButtonTextActive,
                darkMode && styles.darkTimeRangeButtonText,
                timeRange === 30 && darkMode && styles.darkTimeRangeButtonTextActive
              ]}
            >
              30J
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              timeRange === 90 && styles.timeRangeButtonActive,
              darkMode && styles.darkTimeRangeButton,
              timeRange === 90 && darkMode && styles.darkTimeRangeButtonActive
            ]}
            onPress={() => setTimeRange(90)}
          >
            <Text 
              style={[
                styles.timeRangeButtonText,
                timeRange === 90 && styles.timeRangeButtonTextActive,
                darkMode && styles.darkTimeRangeButtonText,
                timeRange === 90 && darkMode && styles.darkTimeRangeButtonTextActive
              ]}
            >
              90J
            </Text>
          </TouchableOpacity>
        </View>

        {isChartLoading ? (
          <View style={[styles.chartLoading, darkMode && styles.darkChartLoading]}>
            <ActivityIndicator size="small" color="#4a89f3" />
            <Text style={[styles.chartLoadingText, darkMode && styles.darkText]}>
              Chargement du graphique...
            </Text>
          </View>
        ) : (
          <LineChart
            data={chartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={false}
            withInnerLines={false}
            withOuterLines={true}
            fromZero={false}
          />
        )}
      </View>

      <View style={[styles.infoContainer, darkMode && styles.darkInfoContainer]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, darkMode && styles.darkText]}>Symbole</Text>
          <Text style={[styles.infoValue, darkMode && styles.darkText]}>{crypto.symbol}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, darkMode && styles.darkText]}>Capitalisation</Text>
          <Text style={[styles.infoValue, darkMode && styles.darkText]}>
            ${crypto.marketCap.toLocaleString('fr-FR')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, darkMode && styles.darkText]}>Volume (24h)</Text>
          <Text style={[styles.infoValue, darkMode && styles.darkText]}>
            ${crypto.volume24h.toLocaleString('fr-FR')}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.buyButton]}
          onPress={handleBuy}
        >
          <Text style={styles.actionButtonText}>Acheter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.sellButton]}
          onPress={handleSell}
        >
          <Text style={styles.actionButtonText}>Vendre</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  darkHeader: {
    backgroundColor: '#1e1e1e',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#aaa',
  },
  darkChartContainer: {
    backgroundColor: '#1e1e1e',
  },
  darkChartLoading: {
    backgroundColor: '#1e1e1e',
  },
  darkStatsContainer: {
    backgroundColor: '#1e1e1e',
  },
  darkTimeRangeButton: {
    backgroundColor: '#2c2c2c',
  },
  darkTimeRangeButtonActive: {
    backgroundColor: '#4a89f380',
  },
  darkTimeRangeButtonText: {
    color: '#aaa',
  },
  darkTimeRangeButtonTextActive: {
    color: '#fff',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#4a89f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceChangeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#4a89f3',
  },
  timeRangeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timeRangeButtonTextActive: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLoading: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  infoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  sellButton: {
    backgroundColor: '#F44336',
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  darkInfoContainer: {
    backgroundColor: '#1e1e1e',
  },
});

export default DetailsScreen; 