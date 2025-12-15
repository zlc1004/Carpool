import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'https://esm.sh/expo-server-sdk@3.7.0';

export interface ExpoNotificationData {
  to: string | string[];
  title?: string;
  body?: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  subtitle?: string;
}

export interface ExpoNotificationResult {
  success: boolean;
  tickets?: ExpoPushTicket[];
  receipts?: ExpoPushReceipt[];
  error?: string;
}

export class ExpoPushService {
  private expo: Expo;

  constructor() {
    // Create a new Expo SDK client
    this.expo = new Expo();
  }

  /**
   * Validate if a push token is valid Expo push token
   */
  isValidExpoPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /**
   * Send push notifications using Expo Push Service
   */
  async sendPushNotifications(notifications: ExpoNotificationData[]): Promise<ExpoNotificationResult> {
    try {
      // Filter out invalid tokens and prepare messages
      const messages: ExpoPushMessage[] = [];
      
      for (const notification of notifications) {
        const tokens = Array.isArray(notification.to) ? notification.to : [notification.to];
        
        // Filter valid tokens
        const validTokens = tokens.filter(token => this.isValidExpoPushToken(token));
        
        if (validTokens.length === 0) {
          console.warn('No valid Expo push tokens found in notification:', notification);
          continue;
        }

        // Create message for each valid token
        for (const token of validTokens) {
          messages.push({
            to: token,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: notification.sound,
            badge: notification.badge,
            channelId: notification.channelId,
            priority: notification.priority || 'default',
            ttl: notification.ttl,
            subtitle: notification.subtitle,
          });
        }
      }

      if (messages.length === 0) {
        return { success: false, error: 'No valid messages to send' };
      }

      console.log(`Sending ${messages.length} push notifications...`);

      // Send notifications in chunks (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);
      const allTickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          allTickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending notification chunk:', error);
          return { 
            success: false, 
            error: `Failed to send notification chunk: ${error.message}` 
          };
        }
      }

      console.log(`Successfully sent notifications, received ${allTickets.length} tickets`);
      
      // Check for individual ticket errors
      const errorTickets = allTickets.filter(ticket => ticket.status === 'error');
      if (errorTickets.length > 0) {
        console.warn('Some notifications failed:', errorTickets);
      }

      return {
        success: true,
        tickets: allTickets
      };

    } catch (error) {
      console.error('Expo push service error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get push receipts for sent notifications
   */
  async getPushReceipts(ticketIds: string[]): Promise<ExpoNotificationResult> {
    try {
      if (ticketIds.length === 0) {
        return { success: true, receipts: [] };
      }

      const receipts = await this.expo.getPushNotificationReceiptsAsync(ticketIds);
      
      // Convert receipts object to array
      const receiptArray = Object.entries(receipts).map(([id, receipt]) => ({
        id,
        ...receipt
      }));

      // Check for delivery errors
      const errorReceipts = receiptArray.filter(receipt => receipt.status === 'error');
      if (errorReceipts.length > 0) {
        console.warn('Some notifications had delivery errors:', errorReceipts);
      }

      return {
        success: true,
        receipts: receiptArray
      };

    } catch (error) {
      console.error('Error getting push receipts:', error);
      return {
        success: false,
        error: error.message || 'Failed to get push receipts'
      };
    }
  }

  /**
   * Handle push token cleanup for invalid tokens
   */
  async cleanupInvalidTokens(invalidTokens: string[], supabase: any) {
    if (invalidTokens.length === 0) return;

    try {
      console.log(`Cleaning up ${invalidTokens.length} invalid push tokens`);
      
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ active: false })
        .in('expo_push_token', invalidTokens);

      if (error) {
        console.error('Error deactivating invalid tokens:', error);
      } else {
        console.log('Successfully deactivated invalid push tokens');
      }
    } catch (error) {
      console.error('Error in token cleanup:', error);
    }
  }
}

// Export singleton instance
export const expoPushService = new ExpoPushService();
