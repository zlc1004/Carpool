# CarpSchool Mobile App

A React Native mobile application built with Expo for the CarpSchool carpool platform.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your Supabase configuration:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on specific platforms:**
   ```bash
   # iOS Simulator
   npm run ios
   
   # Android Emulator  
   npm run android
   
   # Web browser
   npm run web
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── hooks/             # Custom React hooks
├── config/            # App configuration
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Features

- ✅ Authentication (Sign up, Sign in, Password reset)
- �� Tab-based navigation with native icons
- ✅ Supabase integration
- ✅ TypeScript support
- ✅ Expo managed workflow
- 🚧 Ride management (Create, Join, View)
- 🚧 Real-time chat
- 🚧 Location services
- 🚧 Push notifications

## Environment Variables

Create a `.env` file in the project root with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add to navigation in `src/navigation/AppNavigator.tsx`
3. Update TypeScript types in `src/types/index.ts`

### Supabase Integration

The app is configured to work with a local Supabase instance running on `localhost:8000`. To connect to your Supabase project:

1. Update the environment variables in `.env`
2. Configure your Supabase database schema
3. Update the authentication flows as needed

### Building for Production

```bash
# Build for iOS
expo build:ios

# Build for Android  
expo build:android
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues:**
   ```bash
   npx expo start --clear
   ```

2. **Node modules issues:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS build issues:**
   - Make sure Xcode is installed and up to date
   - Clear iOS Simulator cache

4. **Android build issues:**
   - Ensure Android Studio is properly configured
   - Check ANDROID_HOME environment variable

### Getting Help

- Check the [Expo Documentation](https://docs.expo.dev/)
- Visit the [React Navigation docs](https://reactnavigation.org/)
- Review [Supabase React Native guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
