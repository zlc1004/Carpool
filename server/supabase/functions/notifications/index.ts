import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../shared/cors.ts';
import { expoPushService, ExpoNotificationData } from '../shared/expo-push-service.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface NotificationRequest {
  type: 'ride_request' | 'ride_confirmed' | 'ride_cancelled' | 'message' | 'system';
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface SubscribeRequest {
  action: 'subscribe' | 'unsubscribe';
  expoPushToken: string;
  userId: string;
}

/**
 * Send push notifications using Expo Push Service
 */
async function sendExpoPushNotifications(
  recipients: string[],
  notification: Omit<ExpoNotificationData, 'to'>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients specified' };
    }

    // Get active push subscriptions for the recipients
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('expo_push_token, user_id')
      .in('user_id', recipients)
      .eq('active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return { success: false, error: 'Failed to fetch push subscriptions' };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found for recipients');
      return { success: true }; // Not an error, just no one to notify
    }

    // Extract valid tokens
    const tokens = subscriptions
      .map(sub => sub.expo_push_token)
      .filter(token => token && expoPushService.isValidExpoPushToken(token));

    if (tokens.length === 0) {
      console.log('No valid Expo push tokens found');
      return { success: true };
    }

    // Prepare notification data
    const expoNotifications: ExpoNotificationData[] = [{
      to: tokens,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: notification.sound || 'default',
      badge: notification.badge,
      priority: notification.priority || 'default',
      channelId: 'default' // Default channel for Android
    }];

    // Send notifications
    const result = await expoPushService.sendPushNotifications(expoNotifications);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Store notification records in database
    const notificationRecords = recipients.map(userId => ({
      user_id: userId,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      type: notification.data?.type || 'general'
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationRecords);

    if (insertError) {
      console.error('Error storing notification records:', insertError);
      // Don't fail the request just because we couldn't store the record
    }

    // Check for invalid tokens and clean them up
    if (result.tickets) {
      const invalidTokens: string[] = [];
      
      result.tickets.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const tokenIndex = index % tokens.length;
          invalidTokens.push(tokens[tokenIndex]);
        }
      });

      if (invalidTokens.length > 0) {
        await expoPushService.cleanupInvalidTokens(invalidTokens, supabase);
      }
    }

    console.log(`Successfully sent push notifications to ${tokens.length} devices`);
    return { success: true };

  } catch (error) {
    console.error('Error in sendExpoPushNotifications:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { method, url } = req;
    const urlPath = new URL(url).pathname;

    // Route: POST /notifications/send - Send notifications
    if (method === 'POST' && urlPath.endsWith('/send')) {
      const body: NotificationRequest = await req.json();
      
      // Determine recipients
      let recipients: string[] = [];
      if (body.userId) {
        recipients = [body.userId];
      } else if (body.userIds) {
        recipients = body.userIds;
      } else {
        return new Response(
          JSON.stringify({ error: 'Either userId or userIds must be provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notifications
      const result = await sendExpoPushNotifications(recipients, {
        title: body.title,
        body: body.body,
        data: { 
          type: body.type,
          ...body.data 
        },
        sound: body.sound,
        badge: body.badge,
        priority: body.priority
      });

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Route: POST /notifications/subscribe - Manage push subscriptions
    if (method === 'POST' && urlPath.endsWith('/subscribe')) {
      const body: SubscribeRequest = await req.json();
      
      if (!expoPushService.isValidExpoPushToken(body.expoPushToken)) {
        return new Response(
          JSON.stringify({ error: 'Invalid Expo push token format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.action === 'subscribe') {
        // Add or update subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: body.userId,
            expo_push_token: body.expoPushToken,
            active: true,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error upserting subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Subscription saved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (body.action === 'unsubscribe') {
        // Deactivate subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ active: false })
          .eq('user_id', body.userId)
          .eq('expo_push_token', body.expoPushToken);

        if (error) {
          console.error('Error deactivating subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to unsubscribe' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Unsubscribed successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Route: GET /notifications/:userId - Get user notifications
    if (method === 'GET' && urlPath.match(/\/notifications\/[^\/]+$/)) {
      const userId = urlPath.split('/').pop();
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch notifications' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ notifications }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /notifications/mark-read - Mark notifications as read
    if (method === 'POST' && urlPath.endsWith('/mark-read')) {
      const { userId, notificationIds } = await req.json();
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to mark notifications as read' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notifications function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
