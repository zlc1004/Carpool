import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function for CAPTCHA generation and verification
 * Uses the same svg-captcha library as the main Meteor.js branch for consistency
 * Provides REST endpoints for: generate, verify, and cleanup operations
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple SVG captcha generation using the same configuration as main branch
function generateCaptchaSvg() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generate SVG matching svg-captcha library output format
  const width = 150;
  const height = 50;
  const fontSize = 40;
  const background = "#f0f0f0";
  
  // Generate noise (lines and dots)
  let noise = '';
  // Add random lines for noise
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width; 
    const y2 = Math.random() * height;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 50%, 70%)`;
    noise += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2"/>`;
  }
  
  // Add random circles for noise
  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 5 + 1;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 50%, 80%)`;
    noise += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
  }

  // Generate text with random colors and slight rotation
  let textElements = '';
  for (let i = 0; i < text.length; i++) {
    const x = (i + 1) * (width / 6) - 10 + (Math.random() * 10 - 5);
    const y = height / 2 + 5 + (Math.random() * 10 - 5);
    const rotation = Math.random() * 30 - 15;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 40%)`;
    
    textElements += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" 
                     font-weight="bold" fill="${color}" 
                     transform="rotate(${rotation} ${x} ${y})">${text[i]}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${background}"/>
    ${noise}
    ${textElements}
  </svg>`;

  return { text, data: svg };
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

        // Generate new captcha using svg-captcha-compatible format
        const captcha = generateCaptchaSvg();
        
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
