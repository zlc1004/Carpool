import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList, TabParamList } from '../types';

// Import screens
import LandingScreen from '../screens/LandingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import FindRidesScreen from '../screens/FindRidesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import RideInfoScreen from '../screens/RideInfoScreen';
import ChatScreen from '../screens/ChatScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PlaceManagerScreen from '../screens/PlaceManagerScreen';
import CreateRideScreen from '../screens/CreateRideScreen';
import JoinRideScreen from '../screens/JoinRideScreen';
import LoadingScreen from '../components/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'MyRides') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'FindRides') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="MyRides" 
        component={MyRidesScreen}
        options={{ title: 'My Rides' }}
      />
      <Tab.Screen 
        name="FindRides" 
        component={FindRidesScreen}
        options={{ title: 'Find Rides' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading CarpSchool..." subMessage="Initializing your account" />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {user ? (
          // User is signed in
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="RideInfo" 
              component={RideInfoScreen}
              options={{ 
                headerShown: true,
                title: 'Ride Details',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ 
                headerShown: true,
                title: 'Chat',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ 
                headerShown: true,
                title: 'Edit Profile',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="PlaceManager" 
              component={PlaceManagerScreen}
              options={{ 
                headerShown: true,
                title: 'Manage Places',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="CreateRide" 
              component={CreateRideScreen}
              options={{ 
                headerShown: true,
                title: 'Create Ride',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen 
              name="JoinRide" 
              component={JoinRideScreen}
              options={{ 
                headerShown: true,
                title: 'Join Ride',
                headerStyle: { backgroundColor: '#007bff' },
                headerTintColor: '#fff',
              }}
            />
          </>
        ) : (
          // User is not signed in
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
