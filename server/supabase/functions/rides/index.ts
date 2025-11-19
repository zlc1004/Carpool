import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const createRideSchema = Joi.object({
  origin_id: Joi.string().uuid().required(),
  destination_id: Joi.string().uuid().required(),
  departure_time: Joi.date().iso().required(),
  seats_available: Joi.number().integer().min(1).max(8).required(),
  price_per_seat: Joi.number().min(0).max(100).default(0),
  notes: Joi.string().max(500).allow('').default('')
});

const updateRideSchema = Joi.object({
  origin_id: Joi.string().uuid(),
  destination_id: Joi.string().uuid(),
  departure_time: Joi.date().iso(),
  seats_available: Joi.number().integer().min(1).max(8),
  price_per_seat: Joi.number().min(0).max(100),
  notes: Joi.string().max(500).allow('')
});

const joinRideSchema = Joi.object({
  seats_requested: Joi.number().integer().min(1).max(4).default(1),
  message: Joi.string().max(200).allow('').default('')
});

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

    // Get user's profile and school
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = url.pathname.split('/').pop();
    
    switch (method) {
      case 'create': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError, value } = createRideSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate departure time is in the future
        if (new Date(value.departure_time) <= new Date()) {
          return new Response(
            JSON.stringify({ error: 'Departure time must be in the future' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate origin and destination are different
        if (value.origin_id === value.destination_id) {
          return new Response(
            JSON.stringify({ error: 'Origin and destination must be different' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify places belong to user's school
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('id')
          .eq('school_id', profile.school_id)
          .in('id', [value.origin_id, value.destination_id]);

        if (placesError || places.length !== 2) {
          return new Response(
            JSON.stringify({ error: 'Invalid origin or destination' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create ride
        const { data, error } = await supabase
          .from('rides')
          .insert({
            ...value,
            school_id: profile.school_id,
            driver_id: user.id
          })
          .select(`
            *,
            origin:places!rides_origin_id_fkey(id, name, address),
            destination:places!rides_destination_id_fkey(id, name, address),
            driver:profiles!rides_driver_id_fkey(id, first_name, last_name, avatar_url)
          `)
          .single();

        if (error) {
          console.error('Error creating ride:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create ride' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'join': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { rideId } = body;
        const { error: validationError, value } = joinRideSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!rideId) {
          return new Response(
            JSON.stringify({ error: 'Ride ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get ride details
        const { data: ride, error: rideError } = await supabase
          .from('rides')
          .select('*, ride_participants(*)')
          .eq('id', rideId)
          .eq('school_id', profile.school_id)
          .single();

        if (rideError || !ride) {
          return new Response(
            JSON.stringify({ error: 'Ride not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user is the driver
        if (ride.driver_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot join your own ride' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user is already a participant
        const existingParticipant = ride.ride_participants.find(
          (p: any) => p.user_id === user.id
        );

        if (existingParticipant) {
          return new Response(
            JSON.stringify({ error: 'You are already a participant in this ride' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if enough seats are available
        const confirmedSeats = ride.ride_participants
          .filter((p: any) => p.status === 'confirmed')
          .reduce((sum: number, p: any) => sum + p.seats_requested, 0);

        if (confirmedSeats + value.seats_requested > ride.seats_available) {
          return new Response(
            JSON.stringify({ error: 'Not enough seats available' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Join ride
        const { data, error } = await supabase
          .from('ride_participants')
          .insert({
            ride_id: rideId,
            user_id: user.id,
            seats_requested: value.seats_requested,
            message: value.message,
            status: 'pending'
          })
          .select()
          .single();

        if (error) {
          console.error('Error joining ride:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to join ride' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'join-with-code': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { shareCode, seats_requested = 1 } = body;

        if (!shareCode) {
          return new Response(
            JSON.stringify({ error: 'Share code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find ride by share code
        const { data: ride, error: rideError } = await supabase
          .from('rides')
          .select('*, ride_participants(*)')
          .eq('share_code', shareCode)
          .eq('school_id', profile.school_id)
          .single();

        if (rideError || !ride) {
          return new Response(
            JSON.stringify({ error: 'Invalid share code' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Same validation as regular join
        if (ride.driver_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot join your own ride' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const existingParticipant = ride.ride_participants.find(
          (p: any) => p.user_id === user.id
        );

        if (existingParticipant) {
          return new Response(
            JSON.stringify({ error: 'You are already a participant in this ride' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const confirmedSeats = ride.ride_participants
          .filter((p: any) => p.status === 'confirmed')
          .reduce((sum: number, p: any) => sum + p.seats_requested, 0);

        if (confirmedSeats + seats_requested > ride.seats_available) {
          return new Response(
            JSON.stringify({ error: 'Not enough seats available' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Join ride
        const { data, error } = await supabase
          .from('ride_participants')
          .insert({
            ride_id: ride.id,
            user_id: user.id,
            seats_requested,
            status: 'confirmed' // Auto-confirm when joining with share code
          })
          .select()
          .single();

        if (error) {
          console.error('Error joining ride with code:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to join ride' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate-share-code': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { rideId } = body;

        if (!rideId) {
          return new Response(
            JSON.stringify({ error: 'Ride ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user owns this ride
        const { data: ride, error: rideError } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .eq('driver_id', user.id)
          .single();

        if (rideError || !ride) {
          return new Response(
            JSON.stringify({ error: 'Ride not found or not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Return existing share code if available
        if (ride.share_code) {
          return new Response(
            JSON.stringify({ shareCode: ride.share_code }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate new share code using database function
        const { data, error } = await supabase
          .rpc('generate_share_code');

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to generate share code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update ride with share code
        const { error: updateError } = await supabase
          .from('rides')
          .update({ share_code: data })
          .eq('id', rideId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to save share code' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ shareCode: data }),
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
    console.error('Rides function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
