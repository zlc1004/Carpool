import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Index() {
  const { state } = useAuth();

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return <LoadingSpinner message="Initializing..." />;
  }

  // Redirect based on authentication status
  if (state.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/landing" />;
  }
}
