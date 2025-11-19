export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  emailVerified?: boolean;
  verified?: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  school?: string;
  grade?: string;
  phone?: string;
  profileImage?: string;
  driver?: boolean;
  rider?: boolean;
  emergencyContact?: string;
}

export interface Ride {
  id: string;
  driver: User;
  origin: Place;
  destination: Place;
  departureTime: Date;
  arrivalTime?: Date;
  availableSeats: number;
  riders: User[];
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  recurring?: boolean;
  price?: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'school' | 'home' | 'landmark';
}

export interface ChatMessage {
  id: string;
  rideId: string;
  userId: string;
  user: User;
  message: string;
  timestamp: Date;
  type: 'text' | 'location' | 'image';
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  VerifyEmail: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  RideInfo: { rideId: string };
  Chat: { rideId: string };
  EditProfile: undefined;
  PlaceManager: undefined;
  CreateRide: undefined;
  JoinRide: { rideId: string };
  Notifications: undefined;
};

export type TabParamList = {
  MyRides: undefined;
  FindRides: undefined;
  Profile: undefined;
  Messages: undefined;
};
