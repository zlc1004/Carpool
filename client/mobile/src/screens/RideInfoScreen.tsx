import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type RideInfoScreenRouteProp = RouteProp<RootStackParamList, 'RideInfo'>;

interface Props {
  route: RideInfoScreenRouteProp;
}

const RideInfoScreen: React.FC<Props> = ({ route }) => {
  const { rideId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Ride Details</Text>
        <Text style={styles.message}>Ride ID: {rideId}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
  },
});

export default RideInfoScreen;
