#!/bin/bash

# CarpSchool Supabase Server Production Deployment Script

set -e

echo "🚀 Deploying CarpSchool Supabase Server to Production"

# Check if production environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Required environment variable $1 is not set"
        exit 1
    fi
}

echo "🔍 Checking required environment variables..."
check_env_var "SUPABASE_PROJECT_URL"
check_env_var "SUPABASE_PROJECT_ID" 
check_env_var "SUPABASE_ACCESS_TOKEN"
check_env_var "JWT_SECRET"
check_env_var "POSTGRES_PASSWORD"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g @supabase/cli"
    exit 1
fi

# Login to Supabase
echo "🔑 Logging in to Supabase..."
echo "$SUPABASE_ACCESS_TOKEN" | supabase auth login --token

# Link to project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref "$SUPABASE_PROJECT_ID"

# Push database migrations
echo "📊 Pushing database migrations..."
supabase db push

# Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."

# Deploy individual functions
functions=("auth" "captcha" "rides" "chat" "admin" "notifications" "places" "uploads")

for func in "${functions[@]}"; do
    echo "   Deploying function: $func"
    supabase functions deploy "$func" --no-verify-jwt
done

# Deploy main router function
echo "   Deploying main router function"
supabase functions deploy main --no-verify-jwt

# Set production secrets
echo "🔐 Setting production secrets..."
supabase secrets set --from-stdin << EOF
JWT_SECRET=$JWT_SECRET
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
SUPABASE_URL=$SUPABASE_PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ONESIGNAL_APP_ID=$ONESIGNAL_APP_ID
ONESIGNAL_API_KEY=$ONESIGNAL_API_KEY
FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY
GEOCODING_API_KEY=$GEOCODING_API_KEY
MAPS_API_KEY=$MAPS_API_KEY
EOF

# Configure Storage buckets
echo "🪣 Configuring storage buckets..."
supabase storage create uploads --public=false

# Set up storage policies
echo "🔒 Setting up storage policies..."
supabase sql << 'EOF'
-- Storage policies for uploads bucket
CREATE POLICY "Users can view own files" ON storage.objects FOR SELECT
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE
USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
EOF

# Verify deployment
echo "✅ Verifying deployment..."
echo "   📊 Database status:"
supabase db status

echo "   ⚡ Functions status:"
supabase functions list

echo "   🪣 Storage status:"
supabase storage list

# Test API endpoints
echo "🧪 Testing API endpoints..."
BASE_URL="$SUPABASE_PROJECT_URL/functions/v1"

# Test main router
if curl -s "$BASE_URL/main/auth" | grep -q "Missing Authorization"; then
    echo "   ✅ Main router is responding"
else
    echo "   ⚠️  Main router may not be working correctly"
fi

# Test captcha endpoint
if curl -s -X POST "$BASE_URL/main/captcha/generate" | grep -q "sessionId"; then
    echo "   ✅ Captcha service is working"
else
    echo "   ⚠️  Captcha service may not be working correctly"
fi

echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Production URLs:"
echo "   🔑 Supabase Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
echo "   📡 API Base URL:       $SUPABASE_PROJECT_URL"
echo "   ⚡ Functions URL:      $SUPABASE_PROJECT_URL/functions/v1/main"
echo "   🪣 Storage URL:        $SUPABASE_PROJECT_URL/storage/v1/object/public"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update your client application with the production URLs"
echo "   2. Configure your domain DNS to point to Supabase"
echo "   3. Set up monitoring and alerts"
echo "   4. Configure backup schedules"
echo "   5. Test all functionality thoroughly"
echo ""
echo "📖 Documentation:"
echo "   - Supabase Docs: https://supabase.com/docs"
echo "   - API Reference: $SUPABASE_PROJECT_URL/rest/v1/"
echo "   - Real-time: $SUPABASE_PROJECT_URL/realtime/v1/"
