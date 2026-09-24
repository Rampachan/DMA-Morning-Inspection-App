import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { RootStackParamList } from './src/types';
import LoginScreen from './src/screens/LoginScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { getCurrentUser } from './src/services/authService';
import { setNavigateToLogin } from './src/services/api';
import { setupNetworkListener, init as initQueue } from './src/services/offlineQueue';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    let unsubscribeNetwork: (() => void) | null = null;

    const bootstrap = async (): Promise<void> => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
      } catch {
        setIsAuthenticated(false);
      }

      try {
        await initQueue();
        unsubscribeNetwork = setupNetworkListener();
      } catch (err) {
        console.error('Failed to init offline queue:', err);
      }

      setIsReady(true);
    };

    void bootstrap();

    return () => {
      unsubscribeNetwork?.();
    };
  }, []);

  useEffect(() => {
    setNavigateToLogin(() => {
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    });
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Inspection' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Inspection" component={InspectionScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});

export default App;
