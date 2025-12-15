import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Joi from "https://esm.sh/joi@17.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const sendVerificationSchema = Joi.object({
  captchaSessionId: Joi.string().uuid().required()
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  bio: Joi.string().max(500),
  student_id: Joi.string().max(20),
  graduation_year: Joi.number().integer().min(2000).max(2100),
  emergency_contact: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    relationship: Joi.string().required()
  })
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
      case 'send-verification-email': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError } = sendVerificationSchema.validate(body);

        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if email is already verified
        if (user.email_confirmed_at) {
          return new Response(
            JSON.stringify({ error: 'Email is already verified' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify captcha
        const { data: captcha, error: captchaError } = await supabase
          .from('captcha_sessions')
          .select('*')
          .eq('id', body.captchaSessionId)
          .single();

        if (captchaError || !captcha || !captcha.solved || captcha.used || new Date(captcha.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired captcha' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark captcha as used
        await supabase
          .from('captcha_sessions')
          .update({ used: true })
          .eq('id', body.captchaSessionId);

        // Send verification email using Supabase Auth
        const { error: emailError } = await supabase.auth.admin.generateLink({
          type: 'signup',
          email: user.email!
        });

        if (emailError) {
          return new Response(
            JSON.stringify({ error: 'Failed to send verification email' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Verification email sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-profile': {
        if (req.method !== 'PUT') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { error: validationError, value } = updateProfileSchema.validate(body);

        if (validationError) {
          return new Response(
            JSON.stringify({ error: validationError.details[0].message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ...value,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-profile': {
        if (req.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            schools (
              id,
              name,
              domain,
              timezone
            )
          `)
          .eq('id', user.id)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Profile not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-account': {
        if (req.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        // Delete user account (this will cascade to profile due to FK constraint)
        const { error } = await supabase.auth.admin.deleteUser(user.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Account deleted successfully' }),
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
    console.error('Auth function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
