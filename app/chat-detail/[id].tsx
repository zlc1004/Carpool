import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  IconButton,
  Avatar,
  Appbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import { chatAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Message {
  _id: string;
  text: string;
  timestamp: string;
  sender: {
    _id: string;
    name: string;
    profile?: {
      Image?: string;
    };
  };
}

interface ChatData {
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
  messages: Message[];
}

export default function ChatDetailScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [chat, setChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      loadChat();
    }
  }, [id]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChat(id);
      setChat(response.chat);
      setMessages(response.chat.messages || []);
    } catch (error: any) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await chatAPI.sendMessage(id, messageText);
      setMessages(prev => [...prev, response.message]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.sender._id === authState.user?._id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isCurrentUser && 
      (!previousMessage || previousMessage.sender._id !== item.sender._id);

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {showAvatar && !isCurrentUser && (
          <Avatar.Image
            size={32}
            source={{
              uri: item.sender.profile?.Image || 
                   'https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150',
            }}
            style={styles.messageAvatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isCurrentUser 
              ? theme.colors.primary 
              : theme.colors.surface,
          },
          !isCurrentUser && !showAvatar && styles.messageBubbleIndented
        ]}>
          {!isCurrentUser && showAvatar && (
            <Text style={[styles.senderName, { color: theme.colors.primary }]}>
              {item.sender.name}
            </Text>
          )}
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? theme.colors.onPrimary : theme.colors.onSurface }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            { 
              color: isCurrentUser 
                ? theme.colors.onPrimary + '80'
                : theme.colors.onSurfaceVariant 
            }
          ]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversation..." />;
  }

  if (!chat) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={`${chat.ride.origin} → ${chat.ride.destination}`}
          subtitle={`${chat.participants.length} participants`}
        />
        <Appbar.Action icon="information" onPress={() => {
          Alert.alert(
            'Ride Information',
            `Driver: ${chat.ride.driver.name}\nDate: ${format(new Date(chat.ride.date), 'MMM d, yyyy h:mm a')}`
          );
        }} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesContent}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <Card style={[styles.inputCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.inputContainer}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
              style={styles.textInput}
              mode="outlined"
              maxLength={500}
            />
            <IconButton
              icon="send"
              size={24}
              iconColor={theme.colors.primary}
              disabled={!newMessage.trim() || sending}
              onPress={handleSendMessage}
              style={styles.sendButton}
            />
          </View>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  messageAvatar: {
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    flex: 1,
  },
  messageBubbleIndented: {
    marginLeft: 40, // Space for avatar
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  inputCard: {
    margin: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    margin: 0,
  },
});
