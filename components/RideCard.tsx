import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ViewStyle,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Avatar,
  Chip,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';

interface Driver {
  _id: string;
  name: string;
  profile?: {
    Image?: string;
  };
}

interface Ride {
  _id: string;
  driver: Driver;
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

interface RideCardProps {
  ride: Ride;
  onJoin: (rideId: string, shareCode?: string) => void;
  currentUserId?: string;
  style?: ViewStyle;
  showJoinButton?: boolean;
  onPress?: () => void;
  actions?: React.ReactNode;
}

const RideCard: React.FC<RideCardProps> = ({
  ride,
  onJoin,
  currentUserId,
  style,
  showJoinButton = true,
  onPress,
  actions,
}) => {
  const theme = useTheme();

  const rideDate = new Date(ride.date);
  const isDriverCurrentUser = ride.driver._id === currentUserId;
  const isRiderCurrentUser = ride.riders.includes(currentUserId || '');
  const availableSeats = ride.seats - ride.riders.length;
  const isFull = availableSeats <= 0;

  const formatDate = (date: Date) => {
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handleJoinPress = () => {
    if (isFull) {
      Alert.alert('Ride Full', 'This ride is already at capacity.');
      return;
    }

    if (isRiderCurrentUser) {
      Alert.alert('Already Joined', 'You are already part of this ride.');
      return;
    }

    Alert.alert(
      'Join Ride',
      `Join ride from ${ride.origin} to ${ride.destination}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: () => onJoin(ride._id, ride.shareCode) 
        },
      ]
    );
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    }
  };

  const getStatusChip = () => {
    if (isDriverCurrentUser) {
      return <Chip mode="outlined" icon="steering" compact>Driver</Chip>;
    } else if (isRiderCurrentUser) {
      return <Chip mode="outlined" icon="check-circle" compact>Joined</Chip>;
    } else if (isFull) {
      return <Chip mode="outlined" icon="close-circle" compact>Full</Chip>;
    } else {
      return <Chip mode="outlined" icon="seat-passenger" compact>Available</Chip>;
    }
  };

  const CardContent = (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <Card.Content style={styles.cardContent}>
        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <Avatar.Image
              size={40}
              source={{
                uri: ride.driver.profile?.Image || 'https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150',
              }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverDetails}>
              <Text style={[styles.driverName, { color: theme.colors.onSurface }]}>
                {ride.driver.name}
              </Text>
              <Text style={[styles.schoolName, { color: theme.colors.onSurfaceVariant }]}>
                {ride.school.name}
              </Text>
            </View>
          </View>
          {getStatusChip()}
        </View>

        {/* Route Info */}
        <View style={styles.routeSection}>
          <View style={styles.routePoint}>
            <Ionicons name="radio-button-on" size={16} color={theme.colors.primary} />
            <Text style={[styles.locationText, { color: theme.colors.onSurface }]}>
              {ride.origin}
            </Text>
          </View>
          <View style={styles.routeLine}>
            <View style={[styles.line, { backgroundColor: theme.colors.outline }]} />
            <Ionicons name="arrow-down" size={16} color={theme.colors.onSurfaceVariant} />
          </View>
          <View style={styles.routePoint}>
            <Ionicons name="location" size={16} color={theme.colors.secondary} />
            <Text style={[styles.locationText, { color: theme.colors.onSurface }]}>
              {ride.destination}
            </Text>
          </View>
        </View>

        {/* Ride Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Ionicons name="time" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
              {formatDate(rideDate)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
              {availableSeats} of {ride.seats} seats available
            </Text>
          </View>
        </View>

        {/* Notes */}
        {ride.notes && (
          <View style={styles.notesSection}>
            <Text style={[styles.notesText, { color: theme.colors.onSurfaceVariant }]}>
              "{ride.notes}"
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          {actions}
          {showJoinButton && !isDriverCurrentUser && !isRiderCurrentUser && (
            <Button
              mode="contained"
              onPress={handleJoinPress}
              disabled={isFull}
              style={[
                styles.joinButton,
                { 
                  backgroundColor: isFull 
                    ? theme.colors.surfaceVariant 
                    : theme.colors.primary 
                }
              ]}
              contentStyle={styles.joinButtonContent}
            >
              {isFull ? 'Full' : 'Join Ride'}
            </Button>
          )}
          <IconButton
            icon="share"
            size={20}
            onPress={() => {
              // Share functionality
              Alert.alert('Share', `Share ride code: ${ride.shareCode}`);
            }}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  schoolName: {
    fontSize: 12,
    marginTop: 2,
  },
  routeSection: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    marginVertical: 2,
  },
  line: {
    width: 1,
    height: 12,
    marginRight: 7,
  },
  detailsSection: {
    marginBottom: 12,
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
  notesSection: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e2e8f0',
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  joinButton: {
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  joinButtonContent: {
    paddingVertical: 4,
  },
});

export default RideCard;
