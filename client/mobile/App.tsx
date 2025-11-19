import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/hooks/useAuth';
import { NotificationProvider, useNotifications } from './src/hooks/useNotifications';
import AppNavigator from './src/navigation/AppNavigator';
import { RootStackParamList } from './src/types';

// Create the main app content component
const AppContent: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { pendingNavigation, clearPendingNavigation } = useNotifications();

  // Handle notification navigation
  useEffect(() => {
    if (pendingNavigation && navigationRef.current?.isReady()) {
      handleNotificationNavigation(pendingNavigation);
      clearPendingNavigation();
    }
  }, [pendingNavigation]);

  const handleNotificationNavigation = (data: any) => {
    if (!navigationRef.current?.isReady()) return;

    try {
      switch (data.type) {
        case 'ride_request':
        case 'ride_confirmed':
        case 'ride_cancelled':
        case 'ride_reminder':
          if (data.rideId) {
            navigationRef.current.navigate('RideInfo', { rideId: data.rideId });
          }
          break;

        case 'message':
          if (data.chatId) {
            navigationRef.current.navigate('Chat', { rideId: data.chatId });
          } else {
            navigationRef.current.navigate('MainTabs', { screen: 'Messages' });
          }
          break;

        case 'system':
          // Navigate to appropriate system screen based on action
          if (data.action === 'view_profile') {
            navigationRef.current.navigate('MainTabs', { screen: 'Profile' });
          }
          break;

        default:
          // Default to main screen
          navigationRef.current.navigate('MainTabs', { screen: 'MyRides' });
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <AppNavigator ref={navigationRef} />
    </View>
  );
};

export default function App() {
  // Initialize any device-specific configurations
  const isDevice = Device.isDevice;
  
  // Log device info for debugging
  useEffect(() => {
    console.log('Device info:', {
      isDevice,
      deviceName: Device.deviceName,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    });
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
