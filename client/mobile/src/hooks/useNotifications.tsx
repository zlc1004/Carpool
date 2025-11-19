import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './useAuth';
import { pushNotificationService, NotificationData } from '../services/pushNotifications';
import { supabase } from '../config/supabase';

interface NotificationContextType {
  isReady: boolean;
  expoPushToken: string | null;
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationsAsRead: (notificationIds: string[]) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  pendingNavigation: NotificationData | null;
  clearPendingNavigation: () => void;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  created_at: string;
  type: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NotificationData | null>(null);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (user) {
      initializePushNotifications();
    } else {
      // Clean up when user logs out
      setIsReady(false);
      setExpoPushToken(null);
      setUnreadCount(0);
      setNotifications([]);
      pushNotificationService.cleanup();
    }
  }, [user]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Check for pending navigation when app becomes active
        const navAction = pushNotificationService.getAndClearNavigationAction();
        if (navAction) {
          setPendingNavigation(navAction);
        }
        
        // Refresh notifications when app becomes active
        if (user) {
          refreshNotifications();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user]);

  // Load notifications on mount
  useEffect(() => {
    if (user && isReady) {
      refreshNotifications();
    }
  }, [user, isReady]);

  const initializePushNotifications = async () => {
    try {
      console.log('Initializing push notifications...');
      
      // Initialize the push notification service
      const token = await pushNotificationService.initialize();
      setExpoPushToken(token);

      if (token && user) {
        // Subscribe to push notifications on the server
        const success = await pushNotificationService.subscribeToPushNotifications(user.id);
        if (success) {
          console.log('Successfully subscribed to push notifications');
        }
      }

      setIsReady(true);
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      setIsReady(true); // Still mark as ready even if notifications fail
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('notifications', {
        body: null,
      }, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const fetchedNotifications = data?.notifications || [];
      setNotifications(fetchedNotifications);
      
      // Update unread count
      const unread = fetchedNotifications.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);

      // Update badge count
      await pushNotificationService.setBadgeCount(unread);

    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async (notificationIds: string[]) => {
    if (!user || notificationIds.length === 0) return;

    try {
      const { error } = await supabase.functions.invoke('notifications', {
        body: {
          userId: user.id,
          notificationIds,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));

      // Update badge count
      const newUnreadCount = Math.max(0, unreadCount - notificationIds.length);
      await pushNotificationService.setBadgeCount(newUnreadCount);

    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      // Mark all as read on server
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        await markNotificationsAsRead(unreadIds);
      }

      // Clear local notifications and badge
      await pushNotificationService.clearAllNotifications();
      setUnreadCount(0);

    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const clearPendingNavigation = () => {
    setPendingNavigation(null);
  };

  const value: NotificationContextType = {
    isReady,
    expoPushToken,
    unreadCount,
    notifications,
    loading,
    refreshNotifications,
    markNotificationsAsRead,
    clearAllNotifications,
    pendingNavigation,
    clearPendingNavigation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
