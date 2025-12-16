import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const sendMessageSchema = Joi.object({
  ride_id: Joi.string().uuid().required(),
  message: Joi.string().min(1).max(1000).required(),
  message_type: Joi.string().valid('text', 'system').default('text')
});

const editMessageSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required()
});

export default async function(req: Request) {
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
      case 'send': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError, value } = sendMessageSchema.validate(body);

        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is part of the ride (either driver or participant)
        const { data: rideAccess, error: accessError } = await supabase
          .from('rides')
          .select(`
            id,
            driver_id,
            ride_participants!inner(user_id)
          `)
          .eq('id', value.ride_id)
          .or(`driver_id.eq.${user.id},ride_participants.user_id.eq.${user.id}`)
          .single();

        if (accessError || !rideAccess) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to send messages to this ride' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Send message
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            ride_id: value.ride_id,
            sender_id: user.id,
            message: value.message,
            message_type: value.message_type
          })
          .select(`
            *,
            sender:profiles!chat_messages_sender_id_fkey(
              id,
              name,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error sending message:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to send message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (req.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const url = new URL(req.url);
        const rideId = url.searchParams.get('ride_id');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        if (!rideId) {
          return new Response(
            JSON.stringify({ error: 'Ride ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user is part of the ride
        const { data: rideAccess, error: accessError } = await supabase
          .from('rides')
          .select(`
            id,
            driver_id,
            ride_participants!inner(user_id)
          `)
          .eq('id', rideId)
          .or(`driver_id.eq.${user.id},ride_participants.user_id.eq.${user.id}`)
          .single();

        if (accessError || !rideAccess) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to view messages for this ride' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get messages
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            sender:profiles!chat_messages_sender_id_fkey(
              id,
              name,
              avatar_url
            )
          `)
          .eq('ride_id', rideId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Error fetching messages:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch messages' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'edit': {
        if (req.method !== 'PUT') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { messageId } = body;
        const { error: validationError, value } = editMessageSchema.validate(body);

        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!messageId) {
          return new Response(
            JSON.stringify({ error: 'Message ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update message (only sender can edit their own messages)
        const { data, error } = await supabase
          .from('chat_messages')
          .update({
            message: value.message,
            edited_at: new Date().toISOString()
          })
          .eq('id', messageId)
          .eq('sender_id', user.id)
          .is('deleted_at', null)
          .select(`
            *,
            sender:profiles!chat_messages_sender_id_fkey(
              id,
              name,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error editing message:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to edit message or message not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (req.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { messageId } = body;

        if (!messageId) {
          return new Response(
            JSON.stringify({ error: 'Message ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Soft delete message (only sender can delete their own messages)
        const { data, error } = await supabase
          .from('chat_messages')
          .update({
            deleted_at: new Date().toISOString()
          })
          .eq('id', messageId)
          .eq('sender_id', user.id)
          .is('deleted_at', null)
          .select()
          .single();

        if (error) {
          console.error('Error deleting message:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete message or message not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Message deleted successfully' }),
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
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
