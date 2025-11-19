#!/bin/bash

# CarpSchool Supabase Server Development Startup Script

set -e

echo "🚀 Starting CarpSchool Supabase Server Development Environment"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please review and update .env file with your configuration"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p postgres_data
mkdir -p postgres_init
mkdir -p storage_data
mkdir -p functions_cache
mkdir -p openmaptilesdata/data
mkdir -p openmaptilesdata/style
mkdir -p osrmdata/data
mkdir -p pgdataNominatimInternal


# Check if Kong configuration exists
if [ ! -f kong.yml ]; then
    echo "📄 Kong configuration not found. Please ensure kong.yml exists."
    echo "This should have been created by the setup. If not, check the documentation."
fi

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local max_attempts=$2
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if docker compose ps --format "table {{.Service}}\t{{.State}}" | grep "$service_name" | grep -q "running"; then
            if docker compose exec -T "$service_name" echo "Service is responsive" >/dev/null 2>&1; then
                echo "✅ $service_name is ready!"
                return 0
            fi
        fi

        echo "   Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 5
        ((attempt++))
    done

    echo "❌ $service_name failed to start within expected time"
    return 1
}

# Start core Supabase services first
echo "🔧 Starting core Supabase services..."
docker compose up -d supabase-db supabase-analytics

# Wait for database to be ready
if ! wait_for_service "supabase-db" 12; then
    echo "❌ Database failed to start. Checking logs..."
    docker compose logs supabase-db
    exit 1
fi

# Start auth service to create auth schema
echo "🔧 Starting auth service..."
docker compose up -d supabase-auth

# Wait for auth service to initialize
echo "⏳ Waiting for auth service to initialize..."
wait_for_service "supabase-auth" 8

# Apply database migrations (after auth schema is created)
echo "📊 Applying database migrations..."
if [ -f "supabase/migrations/01_initial_schema.sql" ]; then
    docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/01_initial_schema.sql
    echo "✅ Initial schema applied"
fi

if [ -f "supabase/migrations/02_rls_policies.sql" ]; then
    docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/02_rls_policies.sql
    echo "✅ RLS policies applied"
fi

if [ -f "supabase/migrations/03_seed_data.sql" ]; then
    docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/03_seed_data.sql
    echo "✅ Seed data applied"
fi

# Start remaining Supabase services
echo "🔧 Starting remaining Supabase services..."
docker compose up -d supabase-rest supabase-realtime supabase-storage supabase-imgproxy supabase-meta supabase-functions supabase-inbucket kong

# Start Supabase Studio
echo "🎨 Starting Supabase Studio..."
docker compose up -d supabase-studio

# Note: Map services are managed separately
if [ -d "../services/openmaptilesdata/data" ] && [ "$(ls -A ../services/openmaptilesdata/data)" ]; then
    echo "📍 Map data found. To use map services, start them separately:"
    echo "   cd ../services && docker compose up -d"
else
    echo "📍 Map data not found in services/openmaptilesdata/ and services/osrmdata/ directories."
    echo "   Map services are managed separately and can be started independently."
fi



# Start service proxy (optional)
if [ "$1" = "--with-proxy" ]; then
    echo "🌐 Starting service proxy..."
    docker compose --profile proxy up -d
fi

# Display status
echo ""
echo "🎉 Supabase development environment is starting up!"
echo ""
echo "📋 Service URLs:"
echo "   🗄️  Supabase Studio:     http://localhost:3001"
echo "   🔑 Supabase API:        http://localhost:8000"
echo "   📧 Inbucket (Email):    http://localhost:9000"
echo "   📊 Database (direct):   localhost:5432"
echo ""

echo "🗺️  Map Services (managed separately):"
echo "   Start services:        cd ../services && docker compose up -d"
echo "   📍 Nominatim:          http://localhost:40060 (if proxy enabled)"
echo "   🗺️  Tileserver:         http://localhost:40061 (if proxy enabled)"
echo "   🛣️  OSRM:              http://localhost:40062 (if proxy enabled)"
echo ""



echo "🔧 Management Commands:"
echo "   View logs:             docker compose logs -f [service_name]"
echo "   Stop services:         docker compose down"
echo "   Reset database:        docker compose down -v && ./start-dev.sh"
echo "   Check status:          docker compose ps"
echo ""

echo "📖 Documentation:"
echo "   API Documentation:     Open Supabase Studio and check the API docs"
echo "   Database Schema:       Check the migrations in supabase/migrations/"
echo "   Edge Functions:        Located in supabase/functions/"
echo ""

# Wait a bit and show final status
sleep 5
echo "📊 Current Service Status:"
docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Ports}}"

echo ""
echo "✅ Development environment is ready!"
echo "   🔑 Default database password: $(grep POSTGRES_PASSWORD .env | cut -d'=' -f2)"
echo "   📧 Check email at: http://localhost:9000"
echo "   🎨 Open Supabase Studio: http://localhost:3001"
