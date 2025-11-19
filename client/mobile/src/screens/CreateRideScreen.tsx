import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const CreateRideScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Create Ride</Text>
      <Text style={styles.message}>Create a new carpool ride</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  message: { fontSize: 16, color: '#666' },
});

export default CreateRideScreen;
