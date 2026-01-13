import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  SegmentedButtons,
  Card,
  TextInput,
  Modal,
  Portal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ridesAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import RideCard from '@/components/RideCard';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MyRide {
  _id: string;
  driver: {
    _id: string;
    name: string;
    profile?: any;
  };
  origin: string;
  destination: string;
  date: string;
  seats: number;
  riders: string[];
  notes?: string;
  shareCode: string;
  school: {
    name: string;
  };
}

export default function MyRidesScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();

  const [rides, setRides] = useState<MyRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('driving');
  const [joinRideModalVisible, setJoinRideModalVisible] = useState(false);
  const [shareCode, setShareCode] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadMyRides();
    }, [])
  );

  const loadMyRides = async () => {
    try {
      setLoading(true);
      const response = await ridesAPI.getMyRides();
      setRides(response.rides || []);
    } catch (error: any) {
      console.error('Error loading my rides:', error);
      Alert.alert('Error', 'Failed to load your rides. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyRides();
    setRefreshing(false);
  };

  const handleLeaveRide = async (rideId: string) => {
    Alert.alert(
      'Leave Ride',
      'Are you sure you want to leave this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.leaveRide(rideId);
              Alert.alert('Success', 'You have left the ride.');
              loadMyRides();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to leave ride');
            }
          },
        },
      ]
    );
  };

  const handleCancelRide = async (rideId: string) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? All riders will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.deleteRide(rideId);
              Alert.alert('Success', 'Ride has been cancelled.');
              loadMyRides();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel ride');
            }
          },
        },
      ]
    );
  };

  const handleJoinRideByCode = async () => {
    if (!shareCode.trim()) {
      Alert.alert('Error', 'Please enter a valid share code.');
      return;
    }

    try {
      await ridesAPI.joinRide('', shareCode.trim());
      Alert.alert('Success', 'You have joined the ride!');
      setJoinRideModalVisible(false);
      setShareCode('');
      loadMyRides();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to join ride');
    }
  };

  const filterRides = (rides: MyRide[]) => {
    const now = new Date();
    
    return rides.reduce((acc, ride) => {
      const rideDate = new Date(ride.date);
      const isDriver = ride.driver._id === authState.user?._id;
      const isRider = ride.riders.includes(authState.user?._id || '');
      
      if (activeTab === 'driving' && isDriver) {
        if (rideDate > now) {
          acc.upcoming.push(ride);
        } else {
          acc.past.push(ride);
        }
      } else if (activeTab === 'riding' && isRider && !isDriver) {
        if (rideDate > now) {
          acc.upcoming.push(ride);
        } else {
          acc.past.push(ride);
        }
      }
      
      return acc;
    }, { upcoming: [] as MyRide[], past: [] as MyRide[] });
  };

  const getRideActions = (ride: MyRide) => {
    const isDriver = ride.driver._id === authState.user?._id;
    const isRider = ride.riders.includes(authState.user?._id || '');
    
    if (isDriver) {
      return (
        <View style={styles.rideActions}>
          <Button
            mode="outlined"
            onPress={() => router.push(`/ride-details/${ride._id}`)}
            compact
            style={styles.actionButton}
          >
            Manage
          </Button>
          <Button
            mode="contained"
            onPress={() => handleCancelRide(ride._id)}
            buttonColor={theme.colors.error}
            compact
            style={styles.actionButton}
          >
            Cancel
          </Button>
        </View>
      );
    } else if (isRider) {
      return (
        <View style={styles.rideActions}>
          <Button
            mode="outlined"
            onPress={() => router.push(`/ride-details/${ride._id}`)}
            compact
            style={styles.actionButton}
          >
            Details
          </Button>
          <Button
            mode="contained"
            onPress={() => handleLeaveRide(ride._id)}
            buttonColor={theme.colors.error}
            compact
            style={styles.actionButton}
          >
            Leave
          </Button>
        </View>
      );
    }
    
    return null;
  };

  const renderRideItem = ({ item }: { item: MyRide }) => (
    <RideCard
      ride={item}
      onJoin={() => {}}
      currentUserId={authState.user?._id}
      showJoinButton={false}
      actions={getRideActions(item)}
      style={styles.rideCard}
    />
  );

  const renderRideSection = (title: string, rides: MyRide[], emptyMessage: string) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        {title} ({rides.length})
      </Text>
      {rides.length > 0 ? (
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {emptyMessage}
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading your rides..." />;
  }

  const filteredRides = filterRides(rides);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          My Rides
        </Text>
        <Button
          mode="outlined"
          onPress={() => setJoinRideModalVisible(true)}
          icon="plus"
          compact
        >
          Join by Code
        </Button>
      </View>

      {/* Tab Selector */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          {
            value: 'driving',
            label: 'Driving',
            icon: 'steering',
          },
          {
            value: 'riding',
            label: 'Riding',
            icon: 'seat-passenger',
          },
        ]}
        style={styles.tabSelector}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredRides.upcoming.length === 0 && filteredRides.past.length === 0 ? (
          <EmptyState
            icon={activeTab === 'driving' ? 'car-off' : 'seat-passenger-off'}
            title={`No ${activeTab} rides`}
            message={
              activeTab === 'driving'
                ? 'You haven\'t created any rides yet. Start by creating your first ride!'
                : 'You haven\'t joined any rides yet. Browse available rides or join with a code!'
            }
            actionText={activeTab === 'driving' ? 'Create Ride' : 'Browse Rides'}
            onAction={() => router.push(activeTab === 'driving' ? '/(tabs)/create-ride' : '/(tabs)/')}
          />
        ) : (
          <>
            {renderRideSection(
              'Upcoming',
              filteredRides.upcoming,
              `No upcoming ${activeTab} rides.`
            )}
            {renderRideSection(
              'Past',
              filteredRides.past,
              `No past ${activeTab} rides.`
            )}
          </>
        )}
      </ScrollView>

      {/* Join by Code Modal */}
      <Portal>
        <Modal
          visible={joinRideModalVisible}
          onDismiss={() => setJoinRideModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Join Ride by Code
          </Text>
          <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Enter the share code provided by the driver
          </Text>
          <TextInput
            label="Share Code"
            value={shareCode}
            onChangeText={setShareCode}
            mode="outlined"
            placeholder="e.g., ABCD-1234"
            autoCapitalize="characters"
            style={styles.codeInput}
          />
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setJoinRideModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleJoinRideByCode}
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            >
              Join Ride
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabSelector: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  rideCard: {
    marginBottom: 12,
  },
  rideActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  separator: {
    height: 12,
  },
  emptyCard: {
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  codeInput: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
