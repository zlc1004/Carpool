# CarpSchool Supabase Server

This directory contains the Supabase backend for the CarpSchool application, migrated from Meteor.js + MongoDB to Supabase + PostgreSQL with Docker Compose support.

## Architecture

- **Database**: PostgreSQL with Row Level Security (RLS)
- **API**: Supabase Edge Functions (Deno runtime)
- **Auth**: Supabase Auth with custom profiles
- **Storage**: Supabase Storage for file uploads
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Docker Compose for local development
- **Data Storage**: Local directories (like main branch)

## Features Migrated

### Core Collections
- ✅ Users & Profiles (multi-tenant by school)
- ✅ Schools (organizations)
- ✅ Places (locations for pickup/dropoff)
- ✅ Rides (carpooling trips)
- ✅ Ride Participants (join requests)
- ✅ Chat Messages (ride communications)
- ✅ Captcha Sessions (security verification)
- ✅ Notifications (push notifications)
- ✅ File Uploads (images, documents)

### Edge Functions
- ✅ **auth/**: User authentication, profile management
- ✅ **captcha/**: Security verification system  
- ✅ **rides/**: Ride creation, joining, share codes
- ✅ **chat/**: Messaging system
- ✅ **admin/**: Administrative functions
- ✅ **notifications/**: Push notification system
- ✅ **places/**: Location management
- ✅ **uploads/**: File upload handling

### External Services
- ✅ **Nominatim**: Geocoding and address search
- ✅ **TileServer GL**: Map tiles serving
- ✅ **OSRM**: Route optimization
- ✅ **CodePush**: Mobile app updates (optional)

### Security Features
- ✅ Row Level Security (RLS) policies
- ✅ Multi-tenant architecture (school-based isolation)
- ✅ Role-based permissions (user, school_admin, admin)
- ✅ Rate limiting
- ✅ CAPTCHA verification
- ✅ Input validation with Joi

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- 8GB+ RAM (for all services)

### 1. Clone and Setup
```bash
cd server
./setup.sh           # One-time setup (creates directories, configs, etc.)
```

### 2. Start Development Environment
```bash
# Start all core services
./start-dev.sh

# With CodePush (mobile deployments)
./start-dev.sh --with-codepush

# With service proxy (external APIs)  
./start-dev.sh --with-proxy
```

### 3. Access Services
- **Supabase Studio**: http://localhost:3001
- **API Endpoint**: http://localhost:8000
- **Email Testing**: http://localhost:9000
- **Database**: localhost:5432

## Docker Services

### Core Supabase Stack
```yaml
supabase-db          # PostgreSQL database
supabase-auth        # Authentication service  
supabase-rest        # PostgREST API
supabase-realtime    # Real-time subscriptions
supabase-storage     # File storage
supabase-functions   # Edge Functions runtime
supabase-studio      # Admin dashboard
kong                 # API Gateway
```

### External Services
```yaml
tileserver-gl        # Map tiles
nominatim           # Geocoding
osrm                # Route optimization
```

### Optional Services
```yaml
codepush-server     # Mobile app updates
codepush-mysql      # CodePush database  
codepush-redis      # CodePush cache
service-proxy       # Nginx proxy
```

## Data Storage Structure

All data is stored in local directories (similar to main branch):

```
server/
├── postgres_data/          # PostgreSQL database files
├── storage_data/           # Supabase Storage files
├── functions_cache/        # Edge Functions cache
├── codepush_storage/       # CodePush files
├── codepush_mysql_data/    # CodePush MySQL data
├── codepush_redis_data/    # CodePush Redis data
├── openmaptilesdata/       # Map tile data
├── osrmdata/              # OSRM routing data
├── pgdataNominatimInternal/# Nominatim data
├── redis_data/            # Redis cache (production)
├── prometheus_data/       # Monitoring data (production)
├── grafana_data/          # Grafana dashboards (production)
└── backups/               # Backup files
```

These directories are created automatically by the setup script and are git-ignored to prevent committing data files.

## Development Workflow

### Database Migrations
```bash
# View current migrations
ls supabase/migrations/

# Apply manually (auto-applied on startup)
docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/20231201000001_initial_schema.sql
```

### Edge Functions
```bash
# View function logs
docker compose logs -f supabase-functions

# Test function
curl -X POST http://localhost:8000/functions/v1/main/captcha/generate

# Restart functions
docker compose restart supabase-functions
```

### Database Access
```bash
# PostgreSQL CLI
docker compose exec supabase-db psql -U supabase_admin -d postgres

# Or via Studio
open http://localhost:3001
```

## API Endpoints

Base URL: `http://localhost:8000/functions/v1/main`

### Authentication
- `POST /auth/send-verification-email`
- `PUT /auth/update-profile` 
- `GET /auth/get-profile`
- `DELETE /auth/delete-account`

### CAPTCHA
- `POST /captcha/generate`
- `POST /captcha/verify`
- `POST /captcha/cleanup`

### Rides
- `POST /rides/create`
- `POST /rides/join`
- `POST /rides/join-with-code`
- `POST /rides/generate-share-code`

### Chat
- `POST /chat/send`
- `GET /chat/get?ride_id=<uuid>`
- `PUT /chat/edit`
- `DELETE /chat/delete`

### Admin (Requires admin role)
- `GET /admin/users`
- `PUT /admin/update-user`
- `DELETE /admin/delete-user`
- `GET /admin/rides`
- `DELETE /admin/delete-ride`
- `GET /admin/schools`
- `POST /admin/schools`

### Notifications
- `GET /notifications/get`
- `PUT /notifications/mark-read`
- `POST /notifications/create`
- `POST /notifications/subscribe`

### Places
- `GET /places/list`
- `POST /places/create`
- `PUT /places/update`
- `DELETE /places/delete`

### File Uploads
- `POST /uploads/upload` (multipart/form-data)
- `GET /uploads/get`
- `DELETE /uploads/delete`
- `POST /uploads/get-signed-url`

## Production Deployment

### Using Supabase Cloud
```bash
# Set environment variables
export SUPABASE_PROJECT_URL="https://your-project.supabase.co"
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Deploy
./deploy-production.sh
```

### Self-Hosted
```bash
# Use production docker-compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or modify docker-compose.yml for production
```

## Configuration

### Environment Variables
Key variables in `.env`:
```bash
# Core Supabase
SUPABASE_URL=http://localhost:8000
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-32-chars-minimum

# Authentication  
SITE_URL=http://localhost:3000
ENABLE_EMAIL_SIGNUP=true

# Push Notifications
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_API_KEY=your-onesignal-api-key

# Maps (optional)
GEOCODING_API_KEY=your-geocoding-key
```

### Database Schema
```sql
-- Main tables
schools              # Organizations
profiles             # User profiles  
places               # Locations
rides                # Carpooling trips
ride_participants    # Join requests
chat_messages        # Communications
notifications        # User notifications
captcha_sessions     # Security verification
```

### Security Model
- **Multi-tenant**: Users only access their school's data
- **RLS**: Database-level row security  
- **Roles**: user, school_admin, admin
- **No client DB access**: All through Edge Functions

## Monitoring & Debugging

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f supabase-functions
docker compose logs -f supabase-db
docker compose logs -f supabase-auth
```

### Health Checks
```bash
# Service status
docker compose ps

# Manual health check
curl http://localhost:8000/health
```

### Database Monitoring
```bash
# Active connections
docker compose exec supabase-db psql -U supabase_admin -d postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Recent queries
docker compose exec supabase-db psql -U supabase_admin -d postgres -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start DESC;"
```

## Backup & Restore

```bash
# Create full backup
./backup-restore.sh backup

# Database only
./backup-restore.sh backup-db

# Storage only
./backup-restore.sh backup-storage

# List backups
./backup-restore.sh list

# Restore database
./backup-restore.sh restore-db backups/database_20231201_120000.sql.gz

# Restore storage
./backup-restore.sh restore-storage backups/storage_20231201_120000.tar.gz
```

## Makefile Commands

```bash
# Development
make dev              # Start and show status
make start            # Start all services
make stop             # Stop all services
make restart          # Restart all services
make status           # Show service status
make logs             # View all logs

# Database
make db-shell         # Open database shell
make db-migrate       # Apply migrations
make db-reset         # Reset database (WARNING: destroys data)

# Health & Monitoring
make health           # Run health checks
make health-quick     # Quick health check
make health-full      # Full health check

# Backup
make backup           # Create full backup
make backup-db        # Database backup only
make backup-list      # List available backups

# Development Utilities
make clean            # Clean up containers
make clean-all        # Clean everything (WARNING: destroys data)

# Information
make urls             # Show all service URLs
make info             # Show system information
make help             # Show all commands
```

## Troubleshooting

### Common Issues

**Database won't start**
```bash
# Check logs
docker compose logs supabase-db

# Reset database
docker compose down -v
./start-dev.sh
```

**Functions not responding**
```bash
# Restart functions
docker compose restart supabase-functions

# Check function logs
docker compose logs -f supabase-functions
```

**Out of memory**
```bash
# Check resource usage
docker stats

# Reduce services
docker compose down tileserver-gl nominatim osrm
```

**Port conflicts**
```bash
# Check what's using ports
lsof -i :8000
lsof -i :5432

# Modify ports in docker-compose.yml
```

### Reset Everything
```bash
# Nuclear option - removes all data
docker compose down
rm -rf postgres_data storage_data functions_cache redis_data
./start-dev.sh
```

## Migration from Meteor

### Completed Migrations
- [x] MongoDB → PostgreSQL + RLS
- [x] Meteor Methods → Edge Functions
- [x] Meteor Publications → Direct queries + RLS
- [x] Meteor Accounts → Supabase Auth + Profiles
- [x] File uploads → Supabase Storage
- [x] Real-time → Supabase Realtime

### Key Differences
- **No client DB access**: All operations server-side
- **RLS instead of publications**: Database-level security
- **PostgreSQL**: JSONB for flexible schemas
- **Docker Compose**: Simplified deployment
- **Edge Functions**: Serverless API endpoints
- **Local directories**: Data stored in local directories (like main branch)

## Performance Notes

### Resource Usage
- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores  
- **Storage**: ~2GB for core services
- **With maps**: +5GB for map data

### Production Optimizations
- Use external PostgreSQL (AWS RDS, etc.)
- Enable connection pooling
- Configure Redis for caching
- Use CDN for static assets
- Monitor with external tools (Grafana, etc.)

## Support

- 📚 [Supabase Documentation](https://supabase.com/docs)
- 🐳 [Docker Compose Reference](https://docs.docker.com/compose/)
- 🗃️ [PostgreSQL Docs](https://www.postgresql.org/docs/)
- 🚀 [Edge Functions Guide](https://supabase.com/docs/guides/functions)
