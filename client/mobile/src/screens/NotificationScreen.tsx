import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNotifications } from '../hooks/useNotifications';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Button from '../components/Button';

type NotificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

interface Props {
  navigation: NotificationScreenNavigationProp;
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

const NotificationScreen: React.FC<Props> = ({ navigation }) => {
  const { 
    notifications, 
    loading, 
    refreshNotifications, 
    markNotificationsAsRead,
    clearAllNotifications 
  } = useNotifications();
  
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    // Refresh notifications when screen loads
    refreshNotifications();
  }, []);

  const handleNotificationPress = (notification: Notification) => {
    if (selectionMode) {
      toggleNotificationSelection(notification.id);
      return;
    }

    // Mark as read if unread
    if (!notification.read) {
      markNotificationsAsRead([notification.id]);
    }

    // Handle navigation based on notification type
    handleNotificationNavigation(notification);
  };

  const handleNotificationNavigation = (notification: Notification) => {
    switch (notification.type) {
      case 'ride_request':
      case 'ride_confirmed':
      case 'ride_cancelled':
      case 'ride_reminder':
        if (notification.data.rideId) {
          navigation.navigate('RideInfo', { rideId: notification.data.rideId });
        }
        break;

      case 'message':
        if (notification.data.chatId) {
          navigation.navigate('Chat', { rideId: notification.data.chatId });
        } else {
          navigation.navigate('MainTabs', { screen: 'Messages' });
        }
        break;

      default:
        // For system notifications or unknown types, stay on current screen
        break;
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedNotifications([]);
  };

  const markSelectedAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    await markNotificationsAsRead(selectedNotifications);
    setSelectedNotifications([]);
    setSelectionMode(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to mark all notifications as read and clear them?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearAllNotifications 
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ride_request':
        return 'car-outline';
      case 'ride_confirmed':
        return 'checkmark-circle-outline';
      case 'ride_cancelled':
        return 'close-circle-outline';
      case 'ride_reminder':
        return 'time-outline';
      case 'message':
        return 'chatbubble-outline';
      case 'system':
        return 'information-circle-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ride_confirmed':
        return '#28a745';
      case 'ride_cancelled':
        return '#dc3545';
      case 'ride_request':
      case 'ride_reminder':
        return '#007bff';
      case 'message':
        return '#17a2b8';
      case 'system':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification,
        selectedNotifications.includes(item.id) && styles.selectedNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => {
        if (!selectionMode) {
          setSelectionMode(true);
          setSelectedNotifications([item.id]);
        }
      }}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.type) as keyof typeof Ionicons.glyphMap}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
      
      {selectionMode && (
        <View style={styles.selectionIndicator}>
          <Ionicons
            name={selectedNotifications.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={selectedNotifications.includes(item.id) ? '#007bff' : '#ccc'}
          />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header Actions */}
      <View style={styles.headerActions}>
        {selectionMode ? (
          <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={toggleSelectionMode} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.selectionCount}>
              {selectedNotifications.length} selected
            </Text>
            
            {selectedNotifications.length > 0 && (
              <TouchableOpacity onPress={markSelectedAsRead} style={styles.markReadButton}>
                <Text style={styles.markReadButtonText}>Mark Read</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.normalHeader}>
            {unreadNotifications.length > 0 && (
              <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Select</Text>
              </TouchableOpacity>
            )}
            
            {notifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshNotifications} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Constants.statusBarHeight,
  },
  headerActions: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  normalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  selectionCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  markReadButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markReadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectButton: {
    padding: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  list: {
    flexGrow: 1,
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  selectedNotification: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
    borderWidth: 2,
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    marginLeft: 8,
  },
  selectionIndicator: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationScreen;
