import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple SVG captcha generation (equivalent to svg-captcha)
function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding confusing characters
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generate simple SVG
  const width = 150;
  const height = 50;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f5f5f5"/>
      ${generateNoise(width, height)}
      <text x="${width/2}" y="${height/2 + 8}" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
            fill="#333" transform="rotate(${Math.random() * 20 - 10} ${width/2} ${height/2})">
        ${text}
      </text>
    </svg>
  `;

  return { text, data: svg };
}

function generateNoise(width: number, height: number) {
  let noise = '';
  
  // Add some random lines
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ccc" stroke-width="1"/>`;
  }
  
  // Add some random circles
  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 3 + 1;
    noise += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ddd"/>`;
  }
  
  return noise;
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

    const url = new URL(req.url);
    const method = url.pathname.split('/').pop();
    
    switch (method) {
      case 'generate': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        // Generate new captcha
        const captcha = generateCaptcha();
        
        // Store in database
        const { data, error } = await supabase
          .from('captcha_sessions')
          .insert({
            text: captcha.text,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating captcha session:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to generate captcha' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            sessionId: data.id,
            svg: captcha.data,
            expires_at: data.expires_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { sessionId, userInput } = body;

        if (!sessionId || !userInput) {
          return new Response(
            JSON.stringify({ error: 'Session ID and user input are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get captcha session
        const { data: session, error } = await supabase
          .from('captcha_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (error || !session) {
          return new Response(
            JSON.stringify({ error: 'Invalid captcha session' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if expired
        if (new Date(session.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: 'Captcha has expired' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already used
        if (session.used) {
          return new Response(
            JSON.stringify({ error: 'Captcha has already been used' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify the input (case insensitive)
        const isCorrect = session.text.toLowerCase() === userInput.toLowerCase();

        if (isCorrect) {
          // Mark as solved
          await supabase
            .from('captcha_sessions')
            .update({ solved: true })
            .eq('id', sessionId);
        }

        // Add small random delay to prevent timing attacks
        const delay = Math.floor(Math.random() * 100) + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, delay));

        return new Response(
          JSON.stringify({ 
            success: isCorrect,
            message: isCorrect ? 'Captcha verified successfully' : 'Incorrect captcha'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cleanup': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        // Clean up expired captcha sessions
        const { error } = await supabase
          .from('captcha_sessions')
          .delete()
          .lt('expires_at', new Date().toISOString());

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to cleanup expired sessions' }),
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
    console.error('Captcha function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
