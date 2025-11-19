import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export interface AuthenticatedUser {
  id: string;
  email?: string;
  profile?: {
    school_id: string;
    role: 'user' | 'admin' | 'school_admin';
    name: string;
  };
}

export async function authenticate(
  request: Request,
  supabase: any
): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  try {
    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('school_id, role, name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { success: false, error: 'Profile not found' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        profile
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export function createErrorResponse(error: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({ data }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

export function createMessageResponse(message: string, status: number = 200) {
  return new Response(
    JSON.stringify({ success: true, message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

export async function handleCors(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, maxLength);
}

export async function rateLimitCheck(
  supabase: any,
  userId: string | null,
  ipAddress: string | null,
  endpoint: string,
  maxRequests: number = 60,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; remaining?: number }> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Build query based on available identifiers
    let query = supabase
      .from('rate_limits')
      .select('request_count')
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    } else {
      // Can't rate limit without identifier
      return { allowed: true };
    }

    const { data: existing } = await query.single();

    if (existing && existing.request_count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Update or create rate limit record
    const newCount = (existing?.request_count || 0) + 1;
    await supabase
      .from('rate_limits')
      .upsert({
        user_id: userId,
        ip_address: ipAddress,
        endpoint,
        request_count: newCount,
        window_start: existing ? existing.window_start : new Date().toISOString()
      });

    return {
      allowed: true,
      remaining: maxRequests - newCount
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow on error to avoid blocking legitimate requests
    return { allowed: true };
  }
}

export async function logError(
  supabase: any,
  error: Error,
  context: {
    userId?: string;
    endpoint?: string;
    userAgent?: string;
    ip?: string;
  }
) {
  try {
    // Log error to a system table or external service
    console.error('Function error:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to log to an external service
    // like Sentry, LogRocket, or a dedicated logging table
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

export function getClientInfo(request: Request) {
  return {
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip: request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    referer: request.headers.get('referer') || 'unknown'
  };
}

export async function cleanupExpiredData(supabase: any) {
  try {
    // Cleanup expired captcha sessions
    await supabase
      .from('captcha_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Cleanup expired notifications
    await supabase
      .from('notifications')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    // Cleanup old rate limit records (older than 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', yesterday.toISOString());

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

export function parseQueryParams(url: URL) {
  const params: { [key: string]: string | number | boolean } = {};

  for (const [key, value] of url.searchParams.entries()) {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      params[key] = Number(value);
    }
    // Try to parse as boolean
    else if (value === 'true' || value === 'false') {
      params[key] = value === 'true';
    }
    // Keep as string
    else {
      params[key] = value;
    }
  }

  return params;
}

export function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
