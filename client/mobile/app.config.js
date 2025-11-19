import 'dotenv/config';

export default {
  expo: {
    name: "CarpSchool",
    slug: "carpool-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.carpschool.mobile",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses location to find nearby carpool routes and track rides for safety.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses location to find nearby carpool routes and track rides for safety.",
        NSCameraUsageDescription: "This app uses the camera to allow you to take photos for your profile and ride documentation.",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to let you choose profile pictures and share ride photos."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.carpschool.mobile",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION", 
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-location",
      "expo-image-picker"
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:8000",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXO0IFR-NtX4h4UmpYeL4k-0JM5UMNo",
      eas: {
        // This will be set automatically by EAS when project is created
        projectId: process.env.EAS_PROJECT_ID
      }
    }
  }
};
