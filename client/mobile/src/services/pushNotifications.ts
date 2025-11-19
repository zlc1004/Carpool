import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'ride_request' | 'ride_confirmed' | 'ride_cancelled' | 'message' | 'system' | 'ride_reminder';
  rideId?: string;
  chatId?: string;
  senderId?: string;
  action?: string;
  [key: string]: any;
}

export interface PushNotification {
  title: string;
  body: string;
  data: NotificationData;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<string | null> {
    try {
      // Request permissions and get token
      const token = await this.registerForPushNotifications();
      this.expoPushToken = token;

      // Set up notification listeners
      this.setupNotificationListeners();

      return token;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return null;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create additional channels for different types
        await Notifications.setNotificationChannelAsync('ride_updates', {
          name: 'Ride Updates',
          description: 'Notifications about ride requests, confirmations, and cancellations',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007bff',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'Chat messages from other users',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#28a745',
        });
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permission not granted for push notifications');
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Project ID not found - cannot register for push notifications');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      console.log('Expo Push Token:', token);
      return token;

    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Subscribe user to push notifications on the server
   */
  async subscribeToPushNotifications(userId: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        console.warn('No push token available for subscription');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('notifications', {
        body: {
          action: 'subscribe',
          expoPushToken: this.expoPushToken,
          userId: userId,
        },
      });

      if (error) {
        console.error('Error subscribing to push notifications:', error);
        return false;
      }

      console.log('Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      console.error('Error in subscribeToPushNotifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        return true; // No token to unsubscribe
      }

      const { data, error } = await supabase.functions.invoke('notifications', {
        body: {
          action: 'unsubscribe',
          expoPushToken: this.expoPushToken,
          userId: userId,
        },
      });

      if (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return false;
      }

      console.log('Successfully unsubscribed from push notifications');
      return true;

    } catch (error) {
      console.error('Error in unsubscribeFromPushNotifications:', error);
      return false;
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners() {
    // Listen for notifications received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification received while app is in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data as NotificationData;
    
    // You can customize behavior based on notification type
    switch (data.type) {
      case 'ride_request':
        // Could show an in-app alert for ride requests
        break;
      case 'message':
        // Could update message badge count
        break;
      default:
        break;
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data as NotificationData;
    
    // Navigate based on notification type and action
    this.handleNotificationNavigation(data);
  }

  /**
   * Handle navigation based on notification data
   */
  private handleNotificationNavigation(data: NotificationData) {
    // This would be called from the main app component where navigation is available
    // For now, we'll store the navigation action to be handled by the app
    this.setNavigationAction(data);
  }

  /**
   * Store navigation action for handling by the main app
   */
  private navigationAction: NotificationData | null = null;

  setNavigationAction(data: NotificationData) {
    this.navigationAction = data;
  }

  getAndClearNavigationAction(): NotificationData | null {
    const action = this.navigationAction;
    this.navigationAction = null;
    return action;
  }

  /**
   * Get the current Expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clean up notification listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Schedule a local notification for later
   */
  async scheduleLocalNotification(
    title: string, 
    body: string, 
    triggerDate: Date, 
    data?: any
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: {
        date: triggerDate,
      },
    });
    return identifier;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
