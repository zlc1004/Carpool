#!/bin/bash

# CarpSchool Supabase Server Setup Script
# This script sets up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 CarpSchool Supabase Server Setup"
echo "===================================="

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    log_error "Docker Compose is not available. Please install Docker Compose."
    echo "Install from: https://docs.docker.com/compose/install/"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_warn "Node.js is not installed. Recommended for development."
    echo "Install from: https://nodejs.org/"
fi

if ! command -v curl &> /dev/null; then
    log_error "curl is not installed. Required for health checks."
    exit 1
fi

log_success "Prerequisites check completed"

# Setup directories
log_info "Setting up directories..."

mkdir -p db
mkdir -p storage
mkdir -p ssl
mkdir -p monitoring/prometheus
mkdir -p pooler

# Create SQL files that Docker expects
log_info "Creating database initialization files..."


log_success "Directories and SQL files created"

# Setup environment file
if [ ! -f .env ]; then
    log_info "Creating environment file..."
    cp .env.example .env

    # Generate secure passwords and secrets
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    LOGFLARE_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Update .env with generated secrets
    sed -i.bak "s/carpool_db_password_change_in_production/$DB_PASSWORD/" .env
    sed -i.bak "s/super-secret-jwt-token-with-at-least-32-characters-long-change-in-production/$JWT_SECRET/" .env
    sed -i.bak "s/your-super-secret-and-long-logflare-key-change-in-production/$LOGFLARE_KEY/" .env

    rm .env.bak

    log_success "Environment file created with secure defaults"
    log_warn "Please review and update .env file with your specific configuration"
else
    log_info "Environment file already exists"
fi

# Make scripts executable
log_info "Setting script permissions..."
chmod +x *.sh

log_success "Script permissions set"

# Validate configuration
log_info "Validating configuration..."

if ! docker compose config &> /dev/null; then
    log_error "Docker Compose configuration is invalid"
    exit 1
fi

log_success "Configuration validation passed"

# Display next steps
echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "�� Next Steps:"
echo "1. Review configuration:     nano .env"
echo "2. Start development server: make dev"
echo "3. Or use the startup script: ./start-dev.sh"
echo "4. Check health:             make health"
echo "5. Access Supabase Studio:   http://localhost:3001"
echo ""
echo "📚 Useful Commands:"
echo "make help          - Show all available commands"
echo "make status        - Check service status"
echo "make logs          - View all service logs"
echo "make backup        - Create backup"
echo "make clean         - Clean up resources"
echo ""
echo "🔧 Configuration Files:"
echo ".env               - Environment variables"
echo "supabase/config.toml - Supabase configuration"
echo "docker-compose.yml - Service definitions"
echo ""
echo "📖 Documentation:"
echo "README.md          - Complete setup guide"
echo "Supabase Docs:     https://supabase.com/docs"
echo ""

# Optional: Start services immediately
echo "Would you like to start the development environment now? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    log_info "Starting development environment..."
    ./start-dev.sh
fi

log_success "Setup script completed!"
