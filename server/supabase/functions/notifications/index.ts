import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const createNotificationSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  type: Joi.string().valid('ride_request', 'ride_accepted', 'ride_cancelled', 'message', 'system').required(),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(500).required(),
  data: Joi.object().default({}),
  expires_at: Joi.date().iso()
});

const updateSubscriptionSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  p256dh: Joi.string().required(),
  auth: Joi.string().required(),
  platform: Joi.string().valid('web', 'ios', 'android').required()
});

// Simple push notification sender (replace with OneSignal or FCM in production)
async function sendPushNotification(subscription: any, notification: any) {
  try {
    // This would integrate with your push service (OneSignal, FCM, etc.)
    // For now, just log the notification
    console.log('Would send push notification:', {
      subscription,
      notification
    });
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = url.pathname.split('/').pop();
    
    switch (method) {
      case 'get': {
        if (req.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const url = new URL(req.url);
        const unreadOnly = url.searchParams.get('unread_only') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (unreadOnly) {
          query = query.is('read_at', null);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching notifications:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch notifications' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark-read': {
        if (req.method !== 'PUT') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { notificationId, markAllRead } = body;

        if (markAllRead) {
          // Mark all notifications as read
          const { error } = await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .is('read_at', null);

          if (error) {
            console.error('Error marking all notifications as read:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to mark notifications as read' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, message: 'All notifications marked as read' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!notificationId) {
          return new Response(
            JSON.stringify({ error: 'Notification ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark specific notification as read
        const { data, error } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error marking notification as read:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to mark notification as read' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError, value } = createNotificationSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create notification
        const { data: notification, error } = await supabase
          .from('notifications')
          .insert(value)
          .select()
          .single();

        if (error) {
          console.error('Error creating notification:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create notification' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user's push subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', value.user_id)
          .eq('active', true);

        // Send push notifications
        if (subscriptions && subscriptions.length > 0) {
          const pushPromises = subscriptions.map(subscription =>
            sendPushNotification(subscription, {
              title: value.title,
              body: value.message,
              data: value.data
            })
          );
          
          await Promise.all(pushPromises);
        }

        return new Response(
          JSON.stringify({ data: notification }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'subscribe': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError, value } = updateSubscriptionSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Upsert subscription
        const { data, error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            ...value,
            active: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error updating subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unsubscribe': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { endpoint } = body;

        if (!endpoint) {
          return new Response(
            JSON.stringify({ error: 'Endpoint is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deactivate subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ active: false })
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);

        if (error) {
          console.error('Error unsubscribing:', error);
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

      case 'cleanup': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        // Clean up expired notifications
        const { error } = await supabase
          .from('notifications')
          .delete()
          .not('expires_at', 'is', null)
          .lt('expires_at', new Date().toISOString());

        if (error) {
          console.error('Error cleaning up notifications:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to cleanup notifications' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Cleanup completed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Notifications function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
