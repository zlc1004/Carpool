import { serve } from "https://deno.land/std@0.177.1/http/server.ts";

// Static imports instead of dynamic imports to fix compilation
import authHandler from '../auth/index.ts';
import captchaHandler from '../captcha/index.ts';
import ridesHandler from '../rides/index.ts';
import chatHandler from '../chat/index.ts';
import adminHandler from '../admin/index.ts';
import notificationsHandler from '../notifications/index.ts';
import placesHandler from '../places/index.ts';
import uploadsHandler from '../uploads/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Function routing map with static handlers
const functionRoutes = {
  '/auth': authHandler,
  '/captcha': captchaHandler,
  '/rides': ridesHandler,
  '/chat': chatHandler,
  '/admin': adminHandler,
  '/notifications': notificationsHandler,
  '/places': placesHandler,
  '/uploads': uploadsHandler,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const functionPath = '/' + url.pathname.split('/')[1];

    // Find matching route
    const routeHandler = functionRoutes[functionPath as keyof typeof functionRoutes];

    if (!routeHandler) {
      return new Response(
        JSON.stringify({
          error: 'Not found',
          available_functions: Object.keys(functionRoutes)
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Execute the function handler directly
    if (typeof routeHandler === 'function') {
      return await routeHandler(req);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid function module' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function router error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
