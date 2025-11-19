import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const createPlaceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  address: Joi.string().min(5).max(200).required(),
  city: Joi.string().max(50),
  state: Joi.string().max(20),
  zip: Joi.string().max(10),
  country: Joi.string().max(2).default('US'),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  place_type: Joi.string().valid('school', 'home', 'custom', 'popular').default('custom')
});

const updatePlaceSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  address: Joi.string().min(5).max(200),
  city: Joi.string().max(50),
  state: Joi.string().max(20),
  zip: Joi.string().max(10),
  country: Joi.string().max(2),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  place_type: Joi.string().valid('school', 'home', 'custom', 'popular')
});

// Simple geocoding function (replace with actual geocoding service)
async function geocodeAddress(address: string): Promise<{ latitude?: number, longitude?: number }> {
  try {
    // This would integrate with a real geocoding service (Google Maps, MapBox, etc.)
    // For now, return mock coordinates
    console.log('Would geocode address:', address);
    
    // Return some mock coordinates for common test addresses
    const mockCoordinates: { [key: string]: { latitude: number, longitude: number } } = {
      'sample': { latitude: 37.7749, longitude: -122.4194 },
      'test': { latitude: 40.7128, longitude: -74.0060 },
      'university': { latitude: 37.7751, longitude: -122.4180 },
      'college': { latitude: 40.7130, longitude: -74.0055 }
    };

    for (const [key, coords] of Object.entries(mockCoordinates)) {
      if (address.toLowerCase().includes(key)) {
        return coords;
      }
    }

    return {};
  } catch (error) {
    console.error('Geocoding error:', error);
    return {};
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

    // Get user's profile and school
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, role')
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
      case 'list': {
        if (req.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const url = new URL(req.url);
        const type = url.searchParams.get('type');
        const search = url.searchParams.get('search');

        let query = supabase
          .from('places')
          .select('*')
          .eq('school_id', profile.school_id)
          .order('usage_count', { ascending: false })
          .order('name');

        if (type && type !== 'all') {
          query = query.eq('place_type', type);
        }

        if (search) {
          query = query.or(
            `name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching places:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch places' }),
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
        const { error: validationError, value } = createPlaceSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If coordinates not provided, try to geocode
        if (!value.latitude || !value.longitude) {
          const coords = await geocodeAddress(value.address);
          value.latitude = coords.latitude;
          value.longitude = coords.longitude;
        }

        // Create place
        const { data, error } = await supabase
          .from('places')
          .insert({
            ...value,
            school_id: profile.school_id,
            created_by: user.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating place:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create place' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (req.method !== 'PUT') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { placeId } = body;
        const { error: validationError, value } = updatePlaceSchema.validate(body);
        
        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!placeId) {
          return new Response(
            JSON.stringify({ error: 'Place ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build update query with proper authorization
        let query = supabase
          .from('places')
          .update({
            ...value,
            updated_at: new Date().toISOString()
          })
          .eq('id', placeId)
          .eq('school_id', profile.school_id);

        // Only creators or admins can update places
        if (profile.role !== 'admin' && profile.role !== 'school_admin') {
          query = query.eq('created_by', user.id);
        }

        const { data, error } = await query.select().single();

        if (error) {
          console.error('Error updating place:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update place or place not found' }),
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
        const { placeId } = body;

        if (!placeId) {
          return new Response(
            JSON.stringify({ error: 'Place ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if place is being used in any rides
        const { data: ridesUsingPlace, error: ridesError } = await supabase
          .from('rides')
          .select('id')
          .or(`origin_id.eq.${placeId},destination_id.eq.${placeId}`)
          .limit(1);

        if (ridesError) {
          console.error('Error checking place usage:', ridesError);
          return new Response(
            JSON.stringify({ error: 'Failed to check place usage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (ridesUsingPlace && ridesUsingPlace.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete place that is being used in rides' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build delete query with proper authorization
        let query = supabase
          .from('places')
          .delete()
          .eq('id', placeId)
          .eq('school_id', profile.school_id);

        // Only creators or admins can delete places
        if (profile.role !== 'admin' && profile.role !== 'school_admin') {
          query = query.eq('created_by', user.id);
        }

        const { error } = await query;

        if (error) {
          console.error('Error deleting place:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete place or place not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Place deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'increment-usage': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { placeId } = body;

        if (!placeId) {
          return new Response(
            JSON.stringify({ error: 'Place ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment usage count
        const { data, error } = await supabase
          .from('places')
          .update({ 
            usage_count: supabase.sql`usage_count + 1`,
            updated_at: new Date().toISOString()
          })
          .eq('id', placeId)
          .eq('school_id', profile.school_id)
          .select()
          .single();

        if (error) {
          console.error('Error incrementing place usage:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update place usage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        // Only admins can verify places
        if (profile.role !== 'admin' && profile.role !== 'school_admin') {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { placeId, verified } = body;

        if (!placeId || typeof verified !== 'boolean') {
          return new Response(
            JSON.stringify({ error: 'Place ID and verified status are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('places')
          .update({ 
            verified,
            updated_at: new Date().toISOString()
          })
          .eq('id', placeId)
          .eq('school_id', profile.school_id)
          .select()
          .single();

        if (error) {
          console.error('Error updating place verification:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update place verification' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
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
    console.error('Places function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
