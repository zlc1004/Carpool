import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Chip,
  useTheme,
  Appbar,
  FAB,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { ridesAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const { width } = Dimensions.get('window');

interface RideDetail {
  _id: string;
  driver: {
    _id: string;
    name: string;
    profile?: {
      Image?: string;
      Phone?: string;
      Ride?: string;
    };
  };
  origin: string;
  destination: string;
  date: string;
  seats: number;
  riders: Array<{
    _id: string;
    name: string;
    profile?: {
      Image?: string;
      Phone?: string;
    };
  }>;
  notes?: string;
  shareCode: string;
  school: {
    name: string;
  };
}

export default function RideDetailsScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRideDetails();
    }
  }, [id]);

  const loadRideDetails = async () => {
    try {
      setLoading(true);
      const response = await ridesAPI.getRide(id);
      setRide(response.ride);
    } catch (error: any) {
      console.error('Error loading ride details:', error);
      Alert.alert('Error', 'Failed to load ride details. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleShareRide = async () => {
    if (!ride) return;

    try {
      await Share.share({
        message: `Join my ride from ${ride.origin} to ${ride.destination} on ${format(new Date(ride.date), 'MMM d, yyyy')}! Share code: ${ride.shareCode}`,
        title: 'CarpSchool Ride',
      });
    } catch (error) {
      console.error('Error sharing ride:', error);
    }
  };

  const handleCallUser = (phone?: string, name?: string) => {
    if (phone) {
      Alert.alert(
        `Call ${name}`,
        `Would you like to call ${name} at ${phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // In a real app, you'd open the phone app
            Alert.alert('Call', `Calling ${name}...`);
          }}
        ]
      );
    } else {
      Alert.alert('No Phone Number', `${name} hasn't provided a phone number.`);
    }
  };

  const handleStartChat = () => {
    // Navigate to chat for this ride
    router.push(`/chat-detail/ride-${ride?._id}`);
  };

  if (loading) {
    return <LoadingSpinner message="Loading ride details..." />;
  }

  if (!ride) {
    return null;
  }

  const isDriver = ride.driver._id === authState.user?._id;
  const isRider = ride.riders.some(rider => rider._id === authState.user?._id);
  const rideDate = new Date(ride.date);
  const isUpcoming = rideDate > new Date();
  const availableSeats = ride.seats - ride.riders.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Ride Details"
          subtitle={isDriver ? 'You are the driver' : isRider ? 'You joined this ride' : 'Ride information'}
        />
        <Appbar.Action icon="share" onPress={handleShareRide} />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route Info */}
        <Card style={[styles.routeCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.routeContent}>
            <View style={styles.routeHeader}>
              <Text style={[styles.routeTitle, { color: theme.colors.onSurface }]}>
                Route
              </Text>
              <Chip
                mode="outlined"
                icon={isDriver ? 'steering' : isRider ? 'check-circle' : 'seat-passenger'}
                compact
              >
                {isDriver ? 'Driver' : isRider ? 'Joined' : `${availableSeats} seats`}
              </Chip>
            </View>

            <View style={styles.routeDetails}>
              <View style={styles.routePoint}>
                <Ionicons name="radio-button-on" size={20} color={theme.colors.primary} />
                <Text style={[styles.locationText, { color: theme.colors.onSurface }]}>
                  {ride.origin}
                </Text>
              </View>
              <View style={styles.routeLine}>
                <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
                <Ionicons name="arrow-down" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={20} color={theme.colors.secondary} />
                <Text style={[styles.locationText, { color: theme.colors.onSurface }]}>
                  {ride.destination}
                </Text>
              </View>
            </View>

            <View style={styles.rideDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                  {format(rideDate, 'EEEE, MMMM d, yyyy')}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                  {format(rideDate, 'h:mm a')}
                </Text>
              </View>
              {isUpcoming && (
                <View style={styles.detailItem}>
                  <Ionicons name="hourglass" size={16} color={theme.colors.primary} />
                  <Text style={[styles.detailText, { color: theme.colors.primary }]}>
                    {formatDistanceToNow(rideDate, { addSuffix: true })}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Driver Info */}
        <Card style={[styles.driverCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Driver
            </Text>
            <List.Item
              title={ride.driver.name}
              description={ride.driver.profile?.Ride || 'No car information provided'}
              left={() => (
                <Avatar.Image
                  size={48}
                  source={{
                    uri: ride.driver.profile?.Image || 'https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150',
                  }}
                />
              )}
              right={() => (
                <View style={styles.contactActions}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => handleCallUser(ride.driver.profile?.Phone, ride.driver.name)}
                    icon="phone"
                  >
                    Call
                  </Button>
                </View>
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          </Card.Content>
        </Card>

        {/* Riders */}
        {ride.riders.length > 0 && (
          <Card style={[styles.ridersCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Riders ({ride.riders.length}/{ride.seats})
              </Text>
              {ride.riders.map((rider, index) => (
                <View key={rider._id}>
                  <List.Item
                    title={rider.name}
                    description={rider._id === authState.user?._id ? 'You' : 'Fellow student'}
                    left={() => (
                      <Avatar.Image
                        size={40}
                        source={{
                          uri: rider.profile?.Image || 'https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150',
                        }}
                      />
                    )}
                    right={() => (
                      <Button
                        mode="text"
                        compact
                        onPress={() => handleCallUser(rider.profile?.Phone, rider.name)}
                        icon="phone"
                        disabled={rider._id === authState.user?._id}
                      >
                        Call
                      </Button>
                    )}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  />
                  {index < ride.riders.length - 1 && <Divider />}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Notes */}
        {ride.notes && (
          <Card style={[styles.notesCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Notes from Driver
              </Text>
              <Text style={[styles.notesText, { color: theme.colors.onSurfaceVariant }]}>
                {ride.notes}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Share Code */}
        <Card style={[styles.shareCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onPrimaryContainer }]}>
              Share Code
            </Text>
            <Text style={[styles.shareCode, { color: theme.colors.onPrimaryContainer }]}>
              {ride.shareCode}
            </Text>
            <Text style={[styles.shareHint, { color: theme.colors.onPrimaryContainer }]}>
              Share this code with friends to let them join directly!
            </Text>
          </Card.Content>
        </Card>

        {/* Map Preview */}
        <Card style={[styles.mapCard, { backgroundColor: theme.colors.surface }]}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={{
              latitude: 37.7749,
              longitude: -122.4194,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation
          >
            <Marker
              coordinate={{ latitude: 37.7749, longitude: -122.4194 }}
              title={ride.origin}
              description="Origin"
              pinColor={theme.colors.primary}
            />
          </MapView>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Chat FAB */}
      <FAB
        icon="message"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleStartChat}
        label="Chat"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  routeContent: {
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeDetails: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    marginVertical: 4,
  },
  line: {
    width: 2,
    height: 20,
    marginRight: 10,
  },
  rideDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  driverCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactActions: {
    justifyContent: 'center',
  },
  ridersCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  notesCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  shareCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  shareCode: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
    fontFamily: 'monospace',
  },
  shareHint: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  mapCard: {
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    height: 200,
  },
  bottomSpacer: {
    height: 80, // Space for FAB
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
