import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed file types
const allowedMimeTypes = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

const maxFileSize = 10 * 1024 * 1024; // 10MB

function generateFileName(userId: string, purpose: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${purpose}/${userId}/${timestamp}-${random}.${extension}`;
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > maxFileSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!allowedMimeTypes[file.type as keyof typeof allowedMimeTypes]) {
    return { valid: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, PDF' };
  }

  return { valid: true };
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
      case 'upload': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const purpose = formData.get('purpose') as string;

        if (!purpose || !['profile_photo', 'verification_document', 'chat_image'].includes(purpose)) {
          return new Response(
            JSON.stringify({ error: 'Invalid or missing purpose' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const validation = validateFile(file);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const extension = allowedMimeTypes[file.type as keyof typeof allowedMimeTypes];
        const fileName = generateFileName(user.id, purpose, extension);
        
        // Convert File to ArrayBuffer
        const fileBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, uint8Array, {
            contentType: file.type,
            duplex: 'half'
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          return new Response(
            JSON.stringify({ error: 'Failed to upload file' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Record in database
        const { data: dbRecord, error: dbError } = await supabase
          .from('image_uploads')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            mime_type: file.type,
            purpose
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error recording upload in database:', dbError);
          // Try to clean up uploaded file
          await supabase.storage.from('uploads').remove([uploadData.path]);
          
          return new Response(
            JSON.stringify({ error: 'Failed to record upload' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get public URL
        const { data: publicURL } = supabase.storage
          .from('uploads')
          .getPublicUrl(uploadData.path);

        return new Response(
          JSON.stringify({ 
            data: {
              ...dbRecord,
              public_url: publicURL.publicUrl
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (req.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const url = new URL(req.url);
        const purpose = url.searchParams.get('purpose');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        let query = supabase
          .from('image_uploads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (purpose) {
          query = query.eq('purpose', purpose);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching uploads:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch uploads' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add public URLs
        const dataWithUrls = data.map(upload => ({
          ...upload,
          public_url: supabase.storage
            .from('uploads')
            .getPublicUrl(upload.file_path).data.publicUrl
        }));

        return new Response(
          JSON.stringify({ data: dataWithUrls }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (req.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { uploadId } = body;

        if (!uploadId) {
          return new Response(
            JSON.stringify({ error: 'Upload ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get upload record
        const { data: upload, error: fetchError } = await supabase
          .from('image_uploads')
          .select('*')
          .eq('id', uploadId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !upload) {
          return new Response(
            JSON.stringify({ error: 'Upload not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .remove([upload.file_path]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from('image_uploads')
          .delete()
          .eq('id', uploadId);

        if (dbError) {
          console.error('Error deleting from database:', dbError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete upload record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Upload deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-signed-url': {
        if (req.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const body = await req.json();
        const { filePath, expiresIn = 3600 } = body;

        if (!filePath) {
          return new Response(
            JSON.stringify({ error: 'File path is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user owns this file
        const { data: upload, error: fetchError } = await supabase
          .from('image_uploads')
          .select('id')
          .eq('file_path', filePath)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !upload) {
          return new Response(
            JSON.stringify({ error: 'File not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate signed URL
        const { data: signedURL, error: urlError } = await supabase.storage
          .from('uploads')
          .createSignedUrl(filePath, expiresIn);

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          return new Response(
            JSON.stringify({ error: 'Failed to create signed URL' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data: { signedUrl: signedURL.signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000) } }),
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
    console.error('Upload function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
