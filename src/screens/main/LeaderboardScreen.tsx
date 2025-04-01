import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import * as gameService from '../../services/gameService';
import { LeaderboardEntry } from '../../types';
import { Ionicons } from '@expo/vector-icons';

// Interface mise à jour pour inclure la totalValue et portfolioValue
interface EnhancedLeaderboardEntry extends LeaderboardEntry {
  totalValue: number;
  portfolioValue: number;
}

const LeaderboardScreen: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<EnhancedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await gameService.getLeaderboard();
      // Confirmer que les données contiennent les nouvelles propriétés
      console.log('Leaderboard data received:', data[0]);
      setLeaderboard(data as EnhancedLeaderboardEntry[]);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Impossible de charger le classement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`;
  };

  const renderItem = ({ item, index }: { item: EnhancedLeaderboardEntry; index: number }) => {
    const isCurrentUser = user && item.userId === user.id;
    
    // Garantir que les valeurs sont des nombres valides
    const balance = typeof item.balance === 'number' ? item.balance : 0;
    const portfolioValue = typeof item.portfolioValue === 'number' ? item.portfolioValue : 0;
    const totalValue = typeof item.totalValue === 'number' ? item.totalValue : balance + portfolioValue;
    
    // Log pour le debugging
    if (isCurrentUser) {
      console.log('Utilisateur actuel dans le classement:', {
        username: item.username,
        balance: balance,
        portfolioValue: portfolioValue,
        totalValue: totalValue
      });
    }
    
    return (
      <View style={[
        styles.itemContainer, 
        isCurrentUser && styles.currentUserContainer
      ]}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {item.username}
            {isCurrentUser && ' (Vous)'}
          </Text>
        </View>
        
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>
            {formatCurrency(totalValue)}
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>
              {formatCurrency(balance)} + {formatCurrency(portfolioValue)}
            </Text>
          </View>
          <Text style={[
            styles.percentageText,
            item.profitPercentage >= 0 ? styles.positiveText : styles.negativeText
          ]}>
            {item.profitPercentage >= 0 ? '+' : ''}
            {item.profitPercentage.toFixed(2)}%
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a89f3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchLeaderboard}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classement des Traders</Text>
        <Text style={styles.headerSubtitle}>
          Basé sur la valeur totale (solde + actifs)
        </Text>
      </View>
      
      {leaderboard.length > 0 ? (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchLeaderboard}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            Aucune donnée de classement disponible pour le moment.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#4a89f3',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listContainer: {
    paddingVertical: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserContainer: {
    backgroundColor: 'rgba(74, 137, 243, 0.1)',
    borderWidth: 1,
    borderColor: '#4a89f3',
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a89f3',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  percentageText: {
    fontSize: 14,
    marginTop: 4,
  },
  positiveText: {
    color: '#2ecc71',
  },
  negativeText: {
    color: '#e74c3c',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4a89f3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default LeaderboardScreen; 