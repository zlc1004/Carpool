import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  FAB,
  Chip,
  useTheme,
  Menu,
  Badge,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ridesAPI, placesAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import RideCard from '@/components/RideCard';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import SearchBar from '@/components/SearchBar';

const { width } = Dimensions.get('window');

interface Ride {
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

interface Place {
  _id: string;
  name: string;
  address: string;
}

export default function RidesScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();

  const [rides, setRides] = useState<Ride[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [originMenuVisible, setOriginMenuVisible] = useState(false);
  const [destinationMenuVisible, setDestinationMenuVisible] = useState(false);
  const [dateMenuVisible, setDateMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [ridesResponse, placesResponse] = await Promise.all([
        ridesAPI.getRides({
          origin: selectedOrigin || undefined,
          destination: selectedDestination || undefined,
          schoolId: authState.user?.schoolId,
        }),
        placesAPI.getPlaces(authState.user?.schoolId),
      ]);
      setRides(ridesResponse.rides || []);
      setPlaces(placesResponse.places || []);
    } catch (error: any) {
      console.error('Error loading rides:', error);
      Alert.alert('Error', 'Failed to load rides. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleJoinRide = async (rideId: string, shareCode?: string) => {
    try {
      await ridesAPI.joinRide(rideId, shareCode);
      Alert.alert('Success', 'You have joined this ride!');
      loadData(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to join ride');
    }
  };

  const filteredRides = rides.filter((ride) => {
    const matchesSearch = 
      ride.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.driver.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = 
      dateFilter === 'all' ||
      (dateFilter === 'today' && isToday(new Date(ride.date))) ||
      (dateFilter === 'tomorrow' && isTomorrow(new Date(ride.date))) ||
      (dateFilter === 'week' && isThisWeek(new Date(ride.date)));

    return matchesSearch && matchesDate;
  });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const isThisWeek = (date: Date) => {
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    return date >= today && date <= oneWeekFromNow;
  };

  const clearFilters = () => {
    setSelectedOrigin('');
    setSelectedDestination('');
    setDateFilter('all');
    setSearchQuery('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedOrigin) count++;
    if (selectedDestination) count++;
    if (dateFilter !== 'all') count++;
    return count;
  };

  const renderRideItem = ({ item }: { item: Ride }) => (
    <RideCard
      ride={item}
      onJoin={handleJoinRide}
      currentUserId={authState.user?._id}
      style={styles.rideCard}
    />
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Available Rides
        </Text>
        <Button
          mode="outlined"
          onPress={() => setShowFilters(!showFilters)}
          icon="filter-variant"
          compact
        >
          Filters
          {getActiveFiltersCount() > 0 && (
            <Badge style={styles.filterBadge}>{getActiveFiltersCount()}</Badge>
          )}
        </Button>
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder="Search rides, places, or drivers..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ color: theme.colors.onSurface }}
      />

      {/* Filters */}
      {showFilters && (
        <Card style={[styles.filtersCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.filtersContent}>
            <View style={styles.filterRow}>
              <Menu
                visible={originMenuVisible}
                onDismiss={() => setOriginMenuVisible(false)}
                anchor={
                  <Chip
                    mode="outlined"
                    onPress={() => setOriginMenuVisible(true)}
                    icon="map-marker"
                  >
                    {selectedOrigin || 'From'}
                  </Chip>
                }
              >
                <Menu.Item onPress={() => { setSelectedOrigin(''); setOriginMenuVisible(false); }} title="Any Origin" />
                {places.map((place) => (
                  <Menu.Item
                    key={place._id}
                    onPress={() => { setSelectedOrigin(place.name); setOriginMenuVisible(false); }}
                    title={place.name}
                  />
                ))}
              </Menu>

              <Menu
                visible={destinationMenuVisible}
                onDismiss={() => setDestinationMenuVisible(false)}
                anchor={
                  <Chip
                    mode="outlined"
                    onPress={() => setDestinationMenuVisible(true)}
                    icon="map-marker-check"
                  >
                    {selectedDestination || 'To'}
                  </Chip>
                }
              >
                <Menu.Item onPress={() => { setSelectedDestination(''); setDestinationMenuVisible(false); }} title="Any Destination" />
                {places.map((place) => (
                  <Menu.Item
                    key={place._id}
                    onPress={() => { setSelectedDestination(place.name); setDestinationMenuVisible(false); }}
                    title={place.name}
                  />
                ))}
              </Menu>

              <Menu
                visible={dateMenuVisible}
                onDismiss={() => setDateMenuVisible(false)}
                anchor={
                  <Chip
                    mode="outlined"
                    onPress={() => setDateMenuVisible(true)}
                    icon="calendar"
                  >
                    {dateFilter === 'all' ? 'Any Date' :
                     dateFilter === 'today' ? 'Today' :
                     dateFilter === 'tomorrow' ? 'Tomorrow' :
                     'This Week'}
                  </Chip>
                }
              >
                <Menu.Item onPress={() => { setDateFilter('all'); setDateMenuVisible(false); }} title="Any Date" />
                <Menu.Item onPress={() => { setDateFilter('today'); setDateMenuVisible(false); }} title="Today" />
                <Menu.Item onPress={() => { setDateFilter('tomorrow'); setDateMenuVisible(false); }} title="Tomorrow" />
                <Menu.Item onPress={() => { setDateFilter('week'); setDateMenuVisible(false); }} title="This Week" />
              </Menu>
            </View>

            {getActiveFiltersCount() > 0 && (
              <Button mode="text" onPress={clearFilters} compact>
                Clear Filters
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Rides List */}
      <FlatList
        data={filteredRides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-off"
            title="No rides available"
            message="Be the first to create a ride for your route!"
            actionText="Create Ride"
            onAction={() => router.push('/(tabs)/create-ride')}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Create Ride FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/(tabs)/create-ride')}
        label="Create Ride"
      />
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
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 0,
  },
  filtersCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  filtersContent: {
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
    flexGrow: 1,
  },
  rideCard: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
