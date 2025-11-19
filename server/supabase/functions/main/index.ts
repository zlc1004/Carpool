import { serve } from "https://deno.land/std@0.177.1/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Function routing map
const functionRoutes = {
  '/auth': () => import('../auth/index.ts'),
  '/captcha': () => import('../captcha/index.ts'),
  '/rides': () => import('../rides/index.ts'),
  '/chat': () => import('../chat/index.ts'),
  '/admin': () => import('../admin/index.ts'),
  '/notifications': () => import('../notifications/index.ts'),
  '/places': () => import('../places/index.ts'),
  '/uploads': () => import('../uploads/index.ts'),
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
    const routeLoader = functionRoutes[functionPath as keyof typeof functionRoutes];
    
    if (!routeLoader) {
      return new Response(
        JSON.stringify({ 
          error: 'Function not found',
          available_functions: Object.keys(functionRoutes)
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Dynamically import and execute the function
    const functionModule = await routeLoader();
    
    // The imported module should have a default export that handles the request
    if (typeof functionModule.default === 'function') {
      return await functionModule.default(req);
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
