import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Button from '../components/Button';

type LandingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;

interface Props {
  navigation: LandingScreenNavigationProp;
}

const LandingScreen: React.FC<Props> = ({ navigation }) => {
  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>CarpSchool</Text>
          <Text style={styles.subtitle}>Safe carpooling for students</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>🚗 Safe Rides</Text>
            <Text style={styles.featureText}>Verified drivers and riders from your school</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>💬 Chat & Connect</Text>
            <Text style={styles.featureText}>Communicate directly with your ride partners</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureTitle}>📍 Live Tracking</Text>
            <Text style={styles.featureText}>Real-time location sharing for peace of mind</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Sign In"
            onPress={handleSignIn}
            style={styles.button}
          />
          <Button
            title="Create Account"
            onPress={handleSignUp}
            variant="secondary"
            style={styles.button}
          />
        </View>
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
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },
  feature: {
    marginBottom: 32,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
});

export default LandingScreen;
