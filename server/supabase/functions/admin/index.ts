import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  role: Joi.string().valid('user', 'admin', 'school_admin'),
  verification_status: Joi.string().valid('pending', 'verified', 'rejected'),
  driver_license_verified: Joi.boolean()
});

const createSchoolSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  domain: Joi.string().domain().required(),
  address: Joi.string().max(200),
  city: Joi.string().max(50),
  state: Joi.string().max(20),
  zip: Joi.string().max(10),
  country: Joi.string().max(2).default('US'),
  timezone: Joi.string().default('America/New_York'),
  settings: Joi.object().default({})
});

async function checkAdminPermission(supabase: any, userId: string, requiredRole: string = 'admin') {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { authorized: false, profile: null };
  }

  let authorized = false;
  if (requiredRole === 'admin') {
    authorized = profile.role === 'admin';
  } else if (requiredRole === 'school_admin') {
    authorized = profile.role === 'admin' || profile.role === 'school_admin';
  }

  return { authorized, profile };
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
      case 'users': {
        const { authorized, profile } = await checkAdminPermission(supabase, user.id, 'school_admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (req.method === 'GET') {
          // Get users for admin's school (or all if system admin)
          let query = supabase
            .from('profiles')
            .select(`
              *,
              schools(name, domain)
            `);

          if (profile.role !== 'admin') {
            query = query.eq('school_id', profile.school_id);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching users:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch users' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }

      case 'update-user': {
        if (req.method !== 'PUT') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const { authorized, profile } = await checkAdminPermission(supabase, user.id, 'school_admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { userId } = body;
        const { error: validationError, value } = updateUserSchema.validate(body);

        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build update query with proper authorization
        let query = supabase
          .from('profiles')
          .update({
            ...value,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // School admins can only update users in their school
        if (profile.role !== 'admin') {
          query = query.eq('school_id', profile.school_id);
        }

        const { data, error } = await query.select().single();

        if (error) {
          console.error('Error updating user:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to update user or user not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-user': {
        if (req.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const { authorized, profile } = await checkAdminPermission(supabase, user.id, 'admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'System admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user account (will cascade to profile)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
          console.error('Error deleting user:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'rides': {
        const { authorized, profile } = await checkAdminPermission(supabase, user.id, 'school_admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (req.method === 'GET') {
          // Get rides for admin's school (or all if system admin)
          let query = supabase
            .from('rides')
            .select(`
              *,
              origin:places!rides_origin_id_fkey(name, address),
              destination:places!rides_destination_id_fkey(name, address),
              driver:profiles!rides_driver_id_fkey(name, email),
              ride_participants(
                id,
                seats_requested,
                status,
                user:profiles(name, email)
              )
            `);

          if (profile.role !== 'admin') {
            query = query.eq('school_id', profile.school_id);
          }

          const { data, error } = await query.order('departure_time', { ascending: true });

          if (error) {
            console.error('Error fetching rides:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch rides' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }

      case 'delete-ride': {
        if (req.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const { authorized, profile } = await checkAdminPermission(supabase, user.id, 'school_admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();
        const { rideId } = body;

        if (!rideId) {
          return new Response(
            JSON.stringify({ error: 'Ride ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build delete query with proper authorization
        let query = supabase
          .from('rides')
          .delete()
          .eq('id', rideId);

        // School admins can only delete rides in their school
        if (profile.role !== 'admin') {
          query = query.eq('school_id', profile.school_id);
        }

        const { error } = await query;

        if (error) {
          console.error('Error deleting ride:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete ride or ride not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Ride deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'schools': {
        const { authorized } = await checkAdminPermission(supabase, user.id, 'admin');
        if (!authorized) {
          return new Response(
            JSON.stringify({ error: 'System admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('schools')
            .select('*')
            .order('name');

          if (error) {
            console.error('Error fetching schools:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch schools' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (req.method === 'POST') {
          const body = await req.json();
          const { error: validationError, value } = createSchoolSchema.validate(body);

          if (validationError) {
            return new Response(
              JSON.stringify({ error: validationError.details[0].message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data, error } = await supabase
            .from('schools')
            .insert(value)
            .select()
            .single();

          if (error) {
            console.error('Error creating school:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to create school' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
