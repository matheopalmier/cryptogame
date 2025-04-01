import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation';
import { getCurrentUser } from '../../services/authService';
import { buyCrypto, sellCrypto } from '../../services/gameService';
import { User, PortfolioItem } from '../../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Transaction'>;

const TransactionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { cryptoId, cryptoName, currentPrice, type } = route.params;
  const [amount, setAmount] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [ownedAmount, setOwnedAmount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          setAvailableBalance(userData.balance);
          
          // Si c'est une vente, vérifier combien l'utilisateur possède de cette crypto
          if (type === 'sell') {
            const portfolioItem = userData.portfolio.find(
              (item: PortfolioItem) => item.cryptoId === cryptoId
            );
            setOwnedAmount(portfolioItem ? portfolioItem.amount : 0);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Erreur', 'Impossible de charger les données utilisateur');
      } finally {
        setIsInitializing(false);
      }
    };

    loadUserData();
  }, [cryptoId, type]);

  useEffect(() => {
    const numAmount = parseFloat(amount || '0');
    if (!isNaN(numAmount)) {
      setTotalCost(numAmount * currentPrice);
    } else {
      setTotalCost(0);
    }
  }, [amount, currentPrice]);

  const handleAmountChange = (text: string) => {
    // Accepter uniquement les nombres avec jusqu'à 8 décimales
    const regex = /^\d*\.?\d{0,8}$/;
    if (text === '' || regex.test(text)) {
      setAmount(text);
    }
  };

  const handleMaxAmount = () => {
    if (type === 'buy') {
      // Pour l'achat, utiliser 99.5% du solde disponible pour éviter les problèmes d'arrondi
      const maxAmount = (availableBalance * 0.995) / currentPrice;
      // Limiter à 8 décimales maximum pour éviter les problèmes d'arrondi
      setAmount(maxAmount.toFixed(8));
    } else {
      // Pour la vente, utiliser tout le montant possédé
      setAmount(ownedAmount.toString());
    }
  };

  const handleConfirmTransaction = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (type === 'buy' && totalCost > availableBalance) {
      Alert.alert('Erreur', 'Solde insuffisant pour effectuer cet achat');
      return;
    }

    if (type === 'sell' && numAmount > ownedAmount) {
      Alert.alert('Erreur', 'Vous ne possédez pas suffisamment de cette cryptomonnaie');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log(`💰 Tentative de ${type === 'buy' ? 'achat' : 'vente'} de ${numAmount} ${cryptoName} à ${currentPrice}$`);
      
      if (type === 'buy') {
        const updatedUser = await buyCrypto(cryptoId, cryptoName, numAmount, currentPrice);
        console.log(`✅ Achat réussi, nouveau solde: ${updatedUser.balance}$`);
        
        Alert.alert(
          'Transaction réussie',
          `Vous avez acheté ${numAmount} ${cryptoName}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Naviguer vers l'écran principal avec l'onglet Portfolio actif
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    { 
                      name: 'MainTabs',
                      // Définir l'onglet Portfolio comme onglet initial
                      params: { initialTab: 'Portfolio' }
                    }
                  ],
                })
              );
            } 
          }]
        );
      } else {
        const updatedUser = await sellCrypto(cryptoId, numAmount, currentPrice);
        console.log(`✅ Vente réussie, nouveau solde: ${updatedUser.balance}$`);
        
        Alert.alert(
          'Transaction réussie',
          `Vous avez vendu ${numAmount} ${cryptoName}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Naviguer vers l'écran principal avec l'onglet Portfolio actif
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    { 
                      name: 'MainTabs',
                      // Définir l'onglet Portfolio comme onglet initial
                      params: { initialTab: 'Portfolio' }
                    }
                  ],
                })
              );
            } 
          }]
        );
      }
    } catch (error) {
      console.error(`❌ Erreur de transaction:`, error);
      
      // Analyser l'erreur pour fournir un message plus descriptif
      let errorMessage = 'Une erreur est survenue lors de la transaction.';
      
      if (error instanceof Error) {
        console.log(`Message d'erreur détaillé:`, error.message);
        
        if (error.message.includes('Insufficient funds')) {
          errorMessage = 'Solde insuffisant pour effectuer cet achat.';
        } else if (error.message.includes('You do not own this cryptocurrency')) {
          errorMessage = 'Vous ne possédez pas cette cryptomonnaie.';
        } else if (error.message.includes('Insufficient cryptocurrency amount')) {
          errorMessage = 'Vous ne possédez pas suffisamment de cette cryptomonnaie.';
        } else if (error.message.includes('invalid price')) {
          errorMessage = 'Prix non disponible pour cette cryptomonnaie. Veuillez réessayer plus tard.';
        } else if (error.message.includes('connect') || error.message.includes('network')) {
          errorMessage = 'Problème de connexion au serveur. Vérifiez votre connexion internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Le serveur met trop de temps à répondre. Veuillez réessayer plus tard.';
        } else {
          // Utiliser le message d'erreur si disponible
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Erreur de transaction', 
        errorMessage,
        [
          {
            text: 'Réessayer',
            onPress: () => handleConfirmTransaction(),
            style: 'default',
          },
          {
            text: 'Annuler',
            style: 'cancel',
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a89f3" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const formatPrice = (price: number | undefined | null) => {
    // Vérifier si le prix est défini et valide
    if (price === undefined || price === null || isNaN(price)) {
      return '$0.00';
    }
    return `$${price.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    })}`;
  };

  const isBuyDisabled = 
    type === 'buy' && (totalCost > availableBalance || totalCost === 0 || isLoading);
  
  const isSellDisabled = 
    type === 'sell' && (parseFloat(amount || '0') > ownedAmount || parseFloat(amount || '0') === 0 || isLoading);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        <View style={styles.infoContainer}>
          <View style={styles.cryptoInfo}>
            <Text style={styles.cryptoName}>{cryptoName}</Text>
            <Text style={styles.cryptoPrice}>
              Prix actuel: {formatPrice(currentPrice)}
            </Text>
          </View>

          {type === 'buy' ? (
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Votre solde</Text>
              <Text style={styles.balanceValue}>{formatPrice(availableBalance)}</Text>
            </View>
          ) : (
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Quantité possédée</Text>
              <Text style={styles.balanceValue}>{ownedAmount} {cryptoName}</Text>
            </View>
          )}
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Quantité</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.maxButton}
              onPress={handleMaxAmount}
            >
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {type === 'buy' ? 'Coût total' : 'Montant reçu'}
            </Text>
            <Text style={styles.totalValue}>{formatPrice(totalCost)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              type === 'buy' 
                ? styles.buyButton 
                : styles.sellButton,
              type === 'buy' && isBuyDisabled && styles.disabledButton,
              type === 'sell' && isSellDisabled && styles.disabledButton,
            ]}
            onPress={handleConfirmTransaction}
            disabled={type === 'buy' ? isBuyDisabled : isSellDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {type === 'buy' ? 'Acheter' : 'Vendre'} {cryptoName}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoPanel}>
          <Ionicons name="information-circle-outline" size={20} color="#666" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {type === 'buy'
              ? 'Lorsque vous achetez, le montant sera déduit de votre solde virtuel.'
              : 'Lorsque vous vendez, le montant sera ajouté à votre solde virtuel.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
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
  infoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  cryptoInfo: {
    marginBottom: 16,
  },
  cryptoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cryptoPrice: {
    fontSize: 16,
    color: '#666',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  maxButton: {
    position: 'absolute',
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TransactionScreen; 