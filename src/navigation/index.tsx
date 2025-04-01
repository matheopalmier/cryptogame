import React, { useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { isAuthenticated } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Écrans d'authentification
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Écrans principaux
import MarketScreen from '../screens/main/MarketScreen';
import PortfolioScreen from '../screens/main/PortfolioScreen';
import DetailsScreen from '../screens/main/DetailsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TransactionScreen from '../screens/main/TransactionScreen';

// Types de navigation
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined | { initialTab?: keyof MainTabsParamList };
  Details: { cryptoId: string; cryptoName: string };
  Transaction: { 
    cryptoId: string; 
    cryptoName: string; 
    currentPrice: number;
    type: 'buy' | 'sell';
  };
};

export type MainTabsParamList = {
  Market: undefined;
  Portfolio: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

// Type exporté pour la référence du NavigationContainer
export type RootNavigationRef = NavigationContainerRef<any>;

// Création des navigateurs
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// Navigateur pour les onglets principaux
const MainTabs = ({ route }: any) => {
  // Récupérer l'onglet initial des paramètres de route, s'il existe
  const initialTab = route.params?.initialTab;
  const { darkMode } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName={initialTab || "Market"}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Market') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4a89f3',
        tabBarInactiveTintColor: darkMode ? '#aaa' : 'gray',
        tabBarStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
          borderTopColor: darkMode ? '#2c2c2c' : '#e0e0e0',
        },
        tabBarLabelStyle: {
          color: darkMode ? '#fff' : '#333',
        },
        headerStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
          borderBottomColor: darkMode ? '#2c2c2c' : '#e0e0e0',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: darkMode ? '#fff' : '#333',
        },
        headerTintColor: darkMode ? '#fff' : '#333',
      })}
    >
      <Tab.Screen 
        name="Market" 
        component={MarketScreen} 
        options={{ title: 'Marché' }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen} 
        options={{ title: 'Portefeuille' }}
      />
      <Tab.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen} 
        options={{ title: 'Classement' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

// Navigateur pour les écrans authentifiés
const MainNavigator = () => {
  const { darkMode } = useTheme();
  
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
        },
        headerTitleStyle: {
          color: darkMode ? '#fff' : '#333',
        },
        headerTintColor: darkMode ? '#fff' : '#333',
        contentStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
        }
      }}
    >
      <MainStack.Screen 
        name="Marché" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="Details" 
        component={DetailsScreen} 
        options={({ route }: any) => ({ 
          title: route.params.cryptoName 
        })}
      />
      <MainStack.Screen 
        name="Transaction" 
        component={TransactionScreen} 
        options={({ route }: any) => ({ 
          title: `${route.params.type === 'buy' ? 'Acheter' : 'Vendre'} ${route.params.cryptoName}`
        })}
      />
    </MainStack.Navigator>
  );
};

// Navigateur pour les écrans d'authentification
const AuthNavigator = () => {
  const { darkMode } = useTheme();
  
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
        },
        headerTitleStyle: {
          color: darkMode ? '#fff' : '#333',
        },
        headerTintColor: darkMode ? '#fff' : '#333',
        contentStyle: {
          backgroundColor: darkMode ? '#121212' : '#fff',
        }
      }}
    >
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Connexion' }}
      />
      <AuthStack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: 'Inscription' }}
      />
    </AuthStack.Navigator>
  );
};

// Navigateur principal qui gère l'état d'authentification
const AppNavigator = () => {
  // Utiliser le contexte d'authentification
  const { isAuthenticated, isLoading } = useAuth();
  const { darkMode } = useTheme();

  // Vérifier si l'utilisateur est authentifié après chaque changement d'écran 
  // pour rediriger vers la page de connexion si nécessaire
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);
  
  // Cette fonction sera appelée à chaque changement d'état de navigation
  const onStateChange = () => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute && !isAuthenticated) {
      // Si l'utilisateur n'est pas connecté et qu'il n'est pas déjà sur un écran d'authentification
      const isAuthScreen = currentRoute.name === 'Login' || currentRoute.name === 'Register';
      if (!isAuthScreen) {
        // Rediriger vers l'écran de connexion
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }]
        });
      }
    }
  };

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: darkMode ? '#121212' : '#fff'
      }}>
        <ActivityIndicator size="large" color="#4a89f3" />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onStateChange={onStateChange}
      theme={darkMode ? DarkTheme : DefaultTheme}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator; 