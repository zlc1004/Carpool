import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  useTheme,
  HelperText,
  Menu,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ridesAPI, placesAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Place {
  _id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export default function CreateRideScreen() {
  const theme = useTheme();
  const { state: authState } = useAuth();

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: new Date(),
    seats: '4',
    notes: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [originMenuVisible, setOriginMenuVisible] = useState(false);
  const [destinationMenuVisible, setDestinationMenuVisible] = useState(false);
  const [selectedOriginPlace, setSelectedOriginPlace] = useState<Place | null>(null);
  const [selectedDestinationPlace, setSelectedDestinationPlace] = useState<Place | null>(null);

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      const response = await placesAPI.getPlaces(authState.user?.schoolId);
      setPlaces(response.places || []);
    } catch (error) {
      console.error('Error loading places:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.origin.trim()) {
      newErrors.origin = 'Origin is required';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }

    if (formData.origin === formData.destination) {
      newErrors.destination = 'Destination must be different from origin';
    }

    if (!formData.date) {
      newErrors.date = 'Date and time are required';
    } else if (formData.date <= new Date()) {
      newErrors.date = 'Date must be in the future';
    }

    const seats = parseInt(formData.seats);
    if (!seats || seats < 1 || seats > 7) {
      newErrors.seats = 'Seats must be between 1 and 7';
    }

    if (formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRide = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await ridesAPI.createRide({
        origin: formData.origin,
        destination: formData.destination,
        date: formData.date.toISOString(),
        seats: parseInt(formData.seats),
        notes: formData.notes || undefined,
        schoolId: authState.user?.schoolId || '',
      });

      Alert.alert(
        'Ride Created!',
        'Your ride has been created successfully. Other students can now join.',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/my-rides') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(formData.date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setFormData({ ...formData, date: newDate });
    }
  };

  const handleOriginSelect = (place: Place) => {
    setSelectedOriginPlace(place);
    setFormData({ ...formData, origin: place.name });
    setOriginMenuVisible(false);
  };

  const handleDestinationSelect = (place: Place) => {
    setSelectedDestinationPlace(place);
    setFormData({ ...formData, destination: place.name });
    setDestinationMenuVisible(false);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMapRegion = () => {
    if (selectedOriginPlace?.latitude && selectedOriginPlace?.longitude) {
      return {
        latitude: selectedOriginPlace.latitude,
        longitude: selectedOriginPlace.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Default to a general area if no specific location
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Create New Ride
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Share your ride with fellow students
            </Text>
          </View>

          {/* Map Preview */}
          <Card style={[styles.mapCard, { backgroundColor: theme.colors.surface }]}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={getMapRegion()}
              showsUserLocation
            >
              {selectedOriginPlace?.latitude && selectedOriginPlace?.longitude && (
                <Marker
                  coordinate={{
                    latitude: selectedOriginPlace.latitude,
                    longitude: selectedOriginPlace.longitude,
                  }}
                  title={selectedOriginPlace.name}
                  description="Origin"
                  pinColor={theme.colors.primary}
                />
              )}
              {selectedDestinationPlace?.latitude && selectedDestinationPlace?.longitude && (
                <Marker
                  coordinate={{
                    latitude: selectedDestinationPlace.latitude,
                    longitude: selectedDestinationPlace.longitude,
                  }}
                  title={selectedDestinationPlace.name}
                  description="Destination"
                  pinColor={theme.colors.secondary}
                />
              )}
            </MapView>
          </Card>

          {/* Form */}
          <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.formContent}>
              {/* Origin Selection */}
              <Menu
                visible={originMenuVisible}
                onDismiss={() => setOriginMenuVisible(false)}
                anchor={
                  <TextInput
                    label="Origin"
                    value={formData.origin}
                    mode="outlined"
                    editable={false}
                    error={!!errors.origin}
                    style={styles.input}
                    right={<TextInput.Icon icon="chevron-down" onPress={() => setOriginMenuVisible(true)} />}
                    onPressIn={() => setOriginMenuVisible(true)}
                  />
                }
              >
                {places.map((place) => (
                  <Menu.Item
                    key={place._id}
                    onPress={() => handleOriginSelect(place)}
                    title={place.name}
                    titleStyle={{ fontSize: 14 }}
                  />
                ))}
              </Menu>
              {errors.origin && (
                <HelperText type="error" visible={!!errors.origin}>
                  {errors.origin}
                </HelperText>
              )}

              {/* Destination Selection */}
              <Menu
                visible={destinationMenuVisible}
                onDismiss={() => setDestinationMenuVisible(false)}
                anchor={
                  <TextInput
                    label="Destination"
                    value={formData.destination}
                    mode="outlined"
                    editable={false}
                    error={!!errors.destination}
                    style={styles.input}
                    right={<TextInput.Icon icon="chevron-down" onPress={() => setDestinationMenuVisible(true)} />}
                    onPressIn={() => setDestinationMenuVisible(true)}
                  />
                }
              >
                {places.map((place) => (
                  <Menu.Item
                    key={place._id}
                    onPress={() => handleDestinationSelect(place)}
                    title={place.name}
                    titleStyle={{ fontSize: 14 }}
                  />
                ))}
              </Menu>
              {errors.destination && (
                <HelperText type="error" visible={!!errors.destination}>
                  {errors.destination}
                </HelperText>
              )}

              {/* Date and Time */}
              <View style={styles.dateTimeContainer}>
                <Text style={[styles.dateLabel, { color: theme.colors.onSurface }]}>
                  Date & Time
                </Text>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { borderColor: theme.colors.outline }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                  <Text style={[styles.dateTimeText, { color: theme.colors.onSurface }]}>
                    {formatDateTime(formData.date)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
                {errors.date && (
                  <HelperText type="error" visible={!!errors.date}>
                    {errors.date}
                  </HelperText>
                )}
              </View>

              {/* Number of Seats */}
              <TextInput
                label="Available Seats"
                value={formData.seats}
                onChangeText={(text) => setFormData({ ...formData, seats: text })}
                mode="outlined"
                keyboardType="numeric"
                error={!!errors.seats}
                style={styles.input}
                right={<TextInput.Icon icon="seat-passenger" />}
              />
              {errors.seats && (
                <HelperText type="error" visible={!!errors.seats}>
                  {errors.seats}
                </HelperText>
              )}

              {/* Notes */}
              <TextInput
                label="Notes (Optional)"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Any additional information for riders..."
                error={!!errors.notes}
                style={styles.notesInput}
                maxLength={500}
              />
              <Text style={[styles.characterCount, { color: theme.colors.onSurfaceVariant }]}>
                {formData.notes.length}/500 characters
              </Text>
              {errors.notes && (
                <HelperText type="error" visible={!!errors.notes}>
                  {errors.notes}
                </HelperText>
              )}

              {/* Quick Tips */}
              <Card style={[styles.tipsCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <Card.Content style={styles.tipsContent}>
                  <Text style={[styles.tipsTitle, { color: theme.colors.onPrimaryContainer }]}>
                    💡 Tips for a great ride
                  </Text>
                  <Text style={[styles.tipText, { color: theme.colors.onPrimaryContainer }]}>
                    • Be punctual and communicate with your riders
                  </Text>
                  <Text style={[styles.tipText, { color: theme.colors.onPrimaryContainer }]}>
                    • Set clear pickup and meeting points
                  </Text>
                  <Text style={[styles.tipText, { color: theme.colors.onPrimaryContainer }]}>
                    • Keep your car clean and safe
                  </Text>
                </Card.Content>
              </Card>

              {/* Create Button */}
              <Button
                mode="contained"
                onPress={handleCreateRide}
                loading={loading}
                style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.createButtonContent}
              >
                Create Ride
              </Button>
            </Card.Content>
          </Card>

          {/* Date/Time Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={formData.date}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  mapCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  map: {
    height: 200,
  },
  formCard: {
    borderRadius: 12,
    elevation: 3,
  },
  formContent: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  dateTimeContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 4,
    gap: 8,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
  },
  notesInput: {
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  tipsCard: {
    marginBottom: 20,
    borderRadius: 8,
  },
  tipsContent: {
    padding: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  createButton: {
    borderRadius: 8,
  },
  createButtonContent: {
    paddingVertical: 12,
  },
});
