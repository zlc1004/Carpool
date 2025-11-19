# CarpSchool - Complete Carpool Platform

A comprehensive carpool application with Supabase backend and Expo mobile client, featuring real-time push notifications and modern mobile-first design.

## 🏗️ Architecture Overview

### Server (Supabase Backend)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Deno-based serverless functions
- **Storage**: File uploads and image handling
- **Push Notifications**: Expo Push Service integration

### Client (Expo React Native)
- **Framework**: Expo SDK with TypeScript
- **Navigation**: React Navigation v6 with tabs and stack
- **State Management**: React Context + Hooks
- **Push Notifications**: expo-notifications with server integration
- **Authentication**: Supabase Auth integration
- **UI**: Native components with custom styling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator (for testing)

### 1. Start the Server

```bash
# Start Supabase stack
cd server
docker compose up -d

# Verify all services are running (should show 11/11)
docker compose ps
```

The server will be available at:
- **Supabase Studio**: http://localhost:8000
- **API Gateway**: http://localhost:8000/rest/v1/
- **Edge Functions**: http://localhost:8000/functions/v1/
- **Realtime**: ws://localhost:8000/realtime/v1/

### 2. Start the Mobile Client

```bash
# Install dependencies and start Expo
cd client/mobile
npm install
npm start

# Run on device/simulator
npm run ios     # iOS Simulator
npm run android # Android Emulator
```

## 🔧 Configuration

### Server Configuration

The server uses environment variables defined in `server/.env`:

```env
# Supabase Configuration
POSTGRES_PASSWORD=your-postgres-password
JWT_SECRET=your-jwt-secret
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# Push Notifications
EXPO_ACCESS_TOKEN=your-expo-access-token

# External Services
TILESERVER_URL=https://tileserver.carp.school
NOMINATIM_URL=https://nominatim.carp.school
OSRM_URL=https://osrm.carp.school
```

### Mobile Configuration

The mobile app uses environment variables in `client/mobile/.env`:

```env
# Supabase Connection
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📱 Features

### ✅ Implemented Features

#### Authentication System
- User registration with email verification
- Secure login with JWT tokens
- Password reset functionality
- Profile management

#### Push Notifications
- **Expo Push Service** integration
- Real-time ride notifications (request, confirmation, cancellation)
- Message notifications
- System notifications
- Background and foreground handling
- Notification badge counts
- Deep linking from notifications

#### Core Functionality
- User profiles with verification system
- Ride creation and management
- Ride search with geolocation
- Real-time messaging (structure in place)
- Place management with mapping services
- Admin functionality

#### Mobile App
- Native tab navigation with icons
- Smooth screen transitions
- Offline-first design patterns
- Push notification integration
- Modern UI components

### 🚧 In Development

#### Enhanced Features
- Interactive mapping with external tile servers
- Real-time location tracking
- Advanced ride matching algorithms
- Payment integration
- Rating and review system

#### Mobile Enhancements
- Map integration with react-native-maps
- Camera integration for profile photos
- Location services for ride tracking
- Offline data synchronization

## 🏛️ Database Schema

### Core Tables
- `profiles` - User profile information
- `rides` - Ride listings and details
- `ride_requests` - Ride join requests
- `places` - Saved locations and addresses
- `notifications` - User notification history
- `push_subscriptions` - Expo push token management
- `chat_messages` - Real-time messaging
- `image_uploads` - File storage references

### Key Features
- **Row Level Security** on all tables
- **Real-time subscriptions** for live updates
- **UUID primary keys** for security
- **Audit trails** with created_at/updated_at
- **Soft deletes** for data integrity

## 🔔 Push Notification System

### Server Side (Expo Push Service)
```typescript
// Send ride request notification
await NotificationHelpers.notifyRideRequest({
  rideId: 'ride-uuid',
  driverId: 'driver-uuid',
  riderId: 'rider-uuid',
  riderName: 'John Doe',
  origin: 'School',
  destination: 'Home'
});
```

### Client Side (React Native)
```typescript
// Subscribe to notifications
const { expoPushToken } = useNotifications();

// Handle notification navigation
const { pendingNavigation } = useNotifications();
useEffect(() => {
  if (pendingNavigation) {
    // Navigate based on notification data
  }
}, [pendingNavigation]);
```

### Notification Types
- `ride_request` - New ride join request
- `ride_confirmed` - Ride request approved
- `ride_cancelled` - Ride cancellation
- `ride_reminder` - Departure reminder
- `message` - New chat message
- `system` - System announcements

## 🛠️ Development

### Server Development

```bash
cd server

# View logs
supabase logs

# Apply database migrations
supabase db push

# Generate TypeScript types
npm run generate-types

# Deploy edge functions
supabase functions deploy
```

### Mobile Development

```bash
cd client/mobile

# Start with cache clear
npm run clear

# Test on specific platform
npm run ios
npm run android

# Build for production
npm run build:ios
npm run build:android
```

### Database Management

```bash
# Connect to database
supabase db connect

# Reset database (development only)
supabase db reset

# Create new migration
supabase migration new migration_name
```

## 🧪 Testing

### Push Notifications Testing

1. Use the [Expo Push Notification Tool](https://expo.dev/notifications)
2. Get the Expo push token from the app logs
3. Send test notifications to verify delivery

### API Testing

All Edge Functions support direct HTTP calls:

```bash
# Test notification sending
curl -X POST http://localhost:8000/functions/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "userId": "user-uuid",
    "title": "Test Notification",
    "body": "This is a test",
    "type": "system"
  }'
```

## 🚀 Deployment

### Server Deployment

The server is designed to run in Docker containers and can be deployed to:
- **Docker Swarm** clusters
- **Kubernetes** with the provided configurations
- **Cloud providers** (AWS, GCP, Azure)

### Mobile App Deployment

```bash
# Build for app stores
cd client/mobile

# iOS App Store
eas build --platform ios --profile production

# Google Play Store  
eas build --platform android --profile production
```

## 🔗 External Services

The application integrates with custom mapping services:

- **TileServer** (https://tileserver.carp.school) - Map tile rendering
- **Nominatim** (https://nominatim.carp.school) - Geocoding and search
- **OSRM** (https://osrm.carp.school) - Route calculation

These services provide enhanced mapping capabilities optimized for carpool route planning.

## 📞 Support

For development questions or issues:

1. Check the server logs: `docker compose logs -f`
2. Check mobile logs in Expo DevTools
3. Verify database connections in Supabase Studio
4. Test push notifications with Expo tools

## 🏗️ Project Structure

```
├── server/                 # Supabase backend
│   ├── docker-compose.yml     # Service orchestration
│   ├── supabase/
│   │   ├── functions/         # Edge Functions
│   │   ├── migrations/        # Database migrations
│   │   └── config.toml        # Supabase config
│   └── types/                 # Generated TypeScript types
├── client/
│   └── mobile/             # Expo React Native app
│       ├── src/
│       │   ├── components/    # Reusable UI components
│       │   ├── screens/       # Screen components
│       │   ├── navigation/    # Navigation setup
│       │   ├── hooks/         # Custom React hooks
│       │   ├── services/      # External service integrations
│       │   └── types/         # TypeScript definitions
│       ├── app.json          # Expo configuration
│       └── package.json      # Dependencies
└── tools/                  # Development utilities
```

## 📋 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**CarpSchool** - Safe, reliable carpooling for students 🚗📱
