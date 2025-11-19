import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { expoPushService } from './expo-push-service.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface RideNotificationData {
  rideId: string;
  driverId?: string;
  riderId?: string;
  riderIds?: string[];
  origin?: string;
  destination?: string;
  departureTime?: string;
  driverName?: string;
  riderName?: string;
}

export class NotificationHelpers {
  
  /**
   * Send ride request notification to driver
   */
  static async notifyRideRequest(data: RideNotificationData) {
    if (!data.driverId || !data.riderName) {
      throw new Error('Driver ID and rider name are required for ride request notification');
    }

    const title = 'New Ride Request';
    const body = `${data.riderName} wants to join your ride from ${data.origin} to ${data.destination}`;
    
    return await this.sendNotification({
      userIds: [data.driverId],
      title,
      body,
      type: 'ride_request',
      data: {
        rideId: data.rideId,
        riderId: data.riderId,
        action: 'view_ride_request'
      },
      priority: 'high'
    });
  }

  /**
   * Send ride confirmation notification to rider
   */
  static async notifyRideConfirmed(data: RideNotificationData) {
    if (!data.riderId || !data.driverName) {
      throw new Error('Rider ID and driver name are required for ride confirmation notification');
    }

    const title = 'Ride Confirmed!';
    const body = `${data.driverName} accepted your ride request for ${data.origin} to ${data.destination}`;
    
    return await this.sendNotification({
      userIds: [data.riderId],
      title,
      body,
      type: 'ride_confirmed',
      data: {
        rideId: data.rideId,
        driverId: data.driverId,
        action: 'view_ride_details'
      },
      priority: 'high'
    });
  }

  /**
   * Send ride cancellation notification
   */
  static async notifyRideCancelled(data: RideNotificationData) {
    if (!data.riderIds || data.riderIds.length === 0) {
      console.log('No riders to notify for ride cancellation');
      return { success: true };
    }

    const title = 'Ride Cancelled';
    const body = `Your ride from ${data.origin} to ${data.destination} has been cancelled`;
    
    return await this.sendNotification({
      userIds: data.riderIds,
      title,
      body,
      type: 'ride_cancelled',
      data: {
        rideId: data.rideId,
        action: 'find_alternative_ride'
      },
      priority: 'high'
    });
  }

  /**
   * Send ride departure reminder notifications
   */
  static async notifyRideDeparture(data: RideNotificationData) {
    const userIds = [data.driverId, ...(data.riderIds || [])].filter(Boolean);
    
    if (userIds.length === 0) {
      console.log('No users to notify for ride departure');
      return { success: true };
    }

    const title = 'Ride Departure Soon';
    const body = `Your ride from ${data.origin} to ${data.destination} departs in 15 minutes`;
    
    return await this.sendNotification({
      userIds,
      title,
      body,
      type: 'ride_reminder',
      data: {
        rideId: data.rideId,
        action: 'view_ride_details'
      },
      priority: 'high'
    });
  }

  /**
   * Send new message notification
   */
  static async notifyNewMessage(data: {
    chatId: string;
    senderId: string;
    senderName: string;
    message: string;
    recipientIds: string[];
  }) {
    if (!data.recipientIds || data.recipientIds.length === 0) {
      console.log('No recipients for message notification');
      return { success: true };
    }

    const title = `New message from ${data.senderName}`;
    const body = data.message.length > 50 
      ? `${data.message.substring(0, 47)}...` 
      : data.message;
    
    return await this.sendNotification({
      userIds: data.recipientIds,
      title,
      body,
      type: 'message',
      data: {
        chatId: data.chatId,
        senderId: data.senderId,
        action: 'open_chat'
      },
      priority: 'normal'
    });
  }

  /**
   * Send system notification to user(s)
   */
  static async notifySystem(data: {
    userIds: string[];
    title: string;
    body: string;
    actionData?: any;
  }) {
    return await this.sendNotification({
      userIds: data.userIds,
      title: data.title,
      body: data.body,
      type: 'system',
      data: data.actionData || {},
      priority: 'normal'
    });
  }

  /**
   * Core notification sending function
   */
  private static async sendNotification(params: {
    userIds: string[];
    title: string;
    body: string;
    type: string;
    data: any;
    priority: 'normal' | 'high';
  }) {
    try {
      // Get active push subscriptions for the users
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('expo_push_token, user_id')
        .in('user_id', params.userIds)
        .eq('active', true);

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
        return { success: false, error: 'Failed to fetch push subscriptions' };
      }

      // Extract valid tokens
      const tokens = subscriptions
        ?.map(sub => sub.expo_push_token)
        .filter(token => token && expoPushService.isValidExpoPushToken(token)) || [];

      if (tokens.length === 0) {
        console.log('No valid Expo push tokens found for notification');
        return { success: true }; // Not an error, just no one to notify
      }

      // Send push notifications
      const result = await expoPushService.sendPushNotifications([{
        to: tokens,
        title: params.title,
        body: params.body,
        data: {
          type: params.type,
          ...params.data
        },
        sound: 'default',
        priority: params.priority === 'high' ? 'high' : 'default',
        channelId: 'default'
      }]);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Store notification records in database
      const notificationRecords = params.userIds.map(userId => ({
        user_id: userId,
        title: params.title,
        body: params.body,
        data: { type: params.type, ...params.data },
        read: false,
        type: params.type
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationRecords);

      if (insertError) {
        console.error('Error storing notification records:', insertError);
        // Don't fail the request just because we couldn't store the record
      }

      console.log(`Successfully sent ${params.type} notification to ${tokens.length} devices`);
      return { success: true };

    } catch (error) {
      console.error(`Error sending ${params.type} notification:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's notification settings
   */
  static async getUserNotificationSettings(userId: string) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('notification_settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching notification settings:', error);
      // Return default settings if no preferences found
      return {
        rideRequests: true,
        rideUpdates: true,
        messages: true,
        reminders: true,
        system: true
      };
    }

    return data?.notification_settings || {
      rideRequests: true,
      rideUpdates: true,
      messages: true,
      reminders: true,
      system: true
    };
  }

  /**
   * Check if user has enabled specific notification type
   */
  static async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    const settings = await this.getUserNotificationSettings(userId);
    
    switch (notificationType) {
      case 'ride_request':
        return settings.rideRequests ?? true;
      case 'ride_confirmed':
      case 'ride_cancelled':
      case 'ride_reminder':
        return settings.rideUpdates ?? true;
      case 'message':
        return settings.messages ?? true;
      case 'system':
        return settings.system ?? true;
      default:
        return true;
    }
  }
}
