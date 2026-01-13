import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Badge,
  useTheme,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { chatAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import SearchBar from '@/components/SearchBar';

interface ChatPreview {
  _id: string;
  ride: {
    _id: string;
    origin: string;
    destination: string;
    date: string;
    driver: {
      name: string;
    };
  };
  participants: Array<{
    _id: string;
    name: string;
    profile?: {
      Image?: string;
    };
  }>;
  lastMessage: {
    text: string;
    timestamp: string;
    sender: {
      _id: string;
      name: string;
    };
  };
  unreadCount: number;
}

export default function ChatScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChats();
      setChats(response.chats || []);
    } catch (error: any) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const handleChatPress = (chat: ChatPreview) => {
    router.push(`/chat-detail/${chat._id}`);
  };

  const filteredChats = chats.filter((chat) =>
    chat.ride.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.ride.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.ride.driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => {
    const isLastMessageFromCurrentUser = item.lastMessage.sender._id === authState.user?._id;
    const rideDate = new Date(item.ride.date);
    const isUpcomingRide = rideDate > new Date();

    return (
      <TouchableOpacity onPress={() => handleChatPress(item)} activeOpacity={0.7}>
        <Card style={[styles.chatCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.chatContent}>
            <View style={styles.chatHeader}>
              {/* Avatar Stack for Participants */}
              <View style={styles.avatarContainer}>
                {item.participants.slice(0, 3).map((participant, index) => (
                  <Avatar.Image
                    key={participant._id}
                    size={index === 0 ? 48 : 32}
                    source={{
                      uri: participant.profile?.Image || 
                           `https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150&h=150&fit=crop&crop=face`,
                    }}
                    style={[
                      styles.participantAvatar,
                      index > 0 && styles.stackedAvatar,
                      { zIndex: 3 - index }
                    ]}
                  />
                ))}
                {item.participants.length > 3 && (
                  <View style={[styles.moreParticipants, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.moreParticipantsText, { color: theme.colors.onSurfaceVariant }]}>
                      +{item.participants.length - 3}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.chatInfo}>
                <View style={styles.rideInfo}>
                  <Text style={[styles.routeText, { color: theme.colors.onSurface }]}>
                    {item.ride.origin} → {item.ride.destination}
                  </Text>
                  <View style={styles.rideDetails}>
                    <Ionicons 
                      name="person" 
                      size={12} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                    <Text style={[styles.driverText, { color: theme.colors.onSurfaceVariant }]}>
                      {item.ride.driver.name}
                    </Text>
                    {isUpcomingRide && (
                      <>
                        <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>
                          •
                        </Text>
                        <Ionicons 
                          name="time" 
                          size={12} 
                          color={theme.colors.primary} 
                        />
                        <Text style={[styles.rideDate, { color: theme.colors.primary }]}>
                          {formatDistanceToNow(rideDate, { addSuffix: true })}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.messageInfo}>
                  <View style={styles.lastMessage}>
                    <Text style={[styles.senderName, { color: theme.colors.onSurfaceVariant }]}>
                      {isLastMessageFromCurrentUser ? 'You' : item.lastMessage.sender.name}:
                    </Text>
                    <Text 
                      style={[
                        styles.messageText, 
                        { color: theme.colors.onSurface },
                        item.unreadCount > 0 && styles.unreadMessage
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage.text}
                    </Text>
                  </View>
                  <View style={styles.messageMetadata}>
                    <Text style={[styles.messageTime, { color: theme.colors.onSurfaceVariant }]}>
                      {formatLastMessageTime(item.lastMessage.timestamp)}
                    </Text>
                    {item.unreadCount > 0 && (
                      <Badge style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Badge>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Messages
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <SearchBar
        placeholder="Search conversations..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ color: theme.colors.onSurface }}
      />

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message={
              searchQuery 
                ? "No conversations match your search."
                : "Join or create rides to start chatting with other students!"
            }
            actionText={searchQuery ? undefined : "Browse Rides"}
            onAction={searchQuery ? undefined : () => router.push('/(tabs)/')}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Chat FAB */}
      <FAB
        icon="message-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          Alert.alert(
            'Start New Chat',
            'Join a ride to start chatting with other participants!',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Browse Rides', onPress: () => router.push('/(tabs)/') }
            ]
          );
        }}
        label="New Chat"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
    flexGrow: 1,
  },
  chatCard: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  chatContent: {
    padding: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    width: 60,
    position: 'relative',
  },
  participantAvatar: {
    borderWidth: 2,
    borderColor: 'white',
  },
  stackedAvatar: {
    position: 'absolute',
    left: 20,
    top: 8,
  },
  moreParticipants: {
    position: 'absolute',
    left: 40,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chatInfo: {
    flex: 1,
  },
  rideInfo: {
    marginBottom: 4,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rideDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverText: {
    fontSize: 12,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  rideDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  messageText: {
    fontSize: 13,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  messageMetadata: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    marginBottom: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
