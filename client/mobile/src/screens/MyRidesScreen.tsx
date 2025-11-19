import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Ride } from '../types';
import Button from '../components/Button';

const MyRidesScreen: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRides = async () => {
    setLoading(true);
    // TODO: Load rides from Supabase
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    loadRides();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRides();
  };

  const handleCreateRide = () => {
    // TODO: Navigate to create ride screen
  };

  const renderRideItem = ({ item }: { item: Ride }) => (
    <TouchableOpacity style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <Text style={styles.rideTitle}>{item.origin.name} → {item.destination.name}</Text>
        <Text style={styles.rideTime}>
          {new Date(item.departureTime).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.rideStatus}>Status: {item.status}</Text>
      <Text style={styles.rideSeats}>
        Available seats: {item.availableSeats}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={{ uri: 'https://via.placeholder.com/120/007bff/ffffff?text=🚗' }}
        style={styles.emptyImage}
        contentFit="contain"
      />
      <Text style={styles.emptyTitle}>No rides yet</Text>
      <Text style={styles.emptyMessage}>
        Create your first ride or join an existing one to get started!
      </Text>
      <Button
        title="Create Your First Ride"
        onPress={handleCreateRide}
        style={styles.createButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>My Rides</Text>
        <Button
          title="+ New Ride"
          onPress={handleCreateRide}
          style={styles.newRideButton}
        />
      </View>

      <FlatList
        data={rides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Constants.statusBarHeight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  newRideButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  list: {
    flexGrow: 1,
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  rideTime: {
    fontSize: 12,
    color: '#666',
  },
  rideStatus: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 4,
  },
  rideSeats: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    minWidth: 200,
  },
});

export default MyRidesScreen;
