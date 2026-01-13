import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  useTheme,
  TextInput,
  Switch,
  Divider,
  List,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { profileAPI } from '@/services/api';

interface UserProfile {
  Name: string;
  Location: string;
  Image?: string;
  Phone: string;
  Other: string;
  UserType: 'driver' | 'rider' | 'both';
  Ride: string;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { state: authState, logout, updateUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({
    Name: '',
    Location: '',
    Image: '',
    Phone: '',
    Other: '',
    UserType: 'both',
    Ride: '',
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      if (response.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await profileAPI.updateProfile(profile);
      Alert.alert('Success', 'Profile updated successfully!');
      setEditing(false);
      if (response.user) {
        updateUser(response.user);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        setLoading(true);
        const imageUri = result.assets[0].uri;
        const response = await profileAPI.uploadProfileImage(imageUri);
        setProfile({ ...profile, Image: response.imageUrl });
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/landing');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'My Rides',
      subtitle: 'View and manage your rides',
      icon: 'car-sport',
      onPress: () => router.push('/(tabs)/my-rides'),
    },
    {
      title: 'Ride History',
      subtitle: 'Past rides and reviews',
      icon: 'time',
      onPress: () => Alert.alert('Coming Soon', 'Ride history feature coming soon!'),
    },
    {
      title: 'Settings',
      subtitle: 'App preferences and privacy',
      icon: 'settings',
      onPress: () => Alert.alert('Coming Soon', 'Settings page coming soon!'),
    },
    {
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle',
      onPress: () => Alert.alert('Coming Soon', 'Help & support coming soon!'),
    },
    {
      title: 'Terms of Service',
      subtitle: 'Read our terms and privacy policy',
      icon: 'document-text',
      onPress: () => Alert.alert('Coming Soon', 'Terms of service coming soon!'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={editing ? handleImagePicker : undefined} activeOpacity={editing ? 0.7 : 1}>
                <View style={styles.avatarContainer}>
                  <Avatar.Image
                    size={80}
                    source={{
                      uri: profile.Image || 'https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150',
                    }}
                  />
                  {editing && (
                    <View style={[styles.avatarOverlay, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="camera" size={20} color="white" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                  {authState.user?.name || 'User'}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                  {authState.user?.email}
                </Text>
                <Text style={[styles.userType, { color: theme.colors.primary }]}>
                  {profile.UserType === 'both' ? 'Driver & Rider' : 
                   profile.UserType === 'driver' ? 'Driver' : 'Rider'}
                </Text>
              </View>

              <Button
                mode={editing ? 'contained' : 'outlined'}
                onPress={() => setEditing(!editing)}
                compact
                style={styles.editButton}
              >
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {editing ? (
          /* Edit Profile Form */
          <Card style={[styles.editCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.editContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Edit Profile
              </Text>

              <TextInput
                label="Full Name"
                value={profile.Name}
                onChangeText={(text) => setProfile({ ...profile, Name: text })}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Location"
                value={profile.Location}
                onChangeText={(text) => setProfile({ ...profile, Location: text })}
                mode="outlined"
                placeholder="City, State"
                style={styles.input}
              />

              <TextInput
                label="Phone Number"
                value={profile.Phone}
                onChangeText={(text) => setProfile({ ...profile, Phone: text })}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <TextInput
                label="About Me"
                value={profile.Other}
                onChangeText={(text) => setProfile({ ...profile, Other: text })}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Tell other students about yourself..."
                style={styles.input}
              />

              <TextInput
                label="Car Information"
                value={profile.Ride}
                onChangeText={(text) => setProfile({ ...profile, Ride: text })}
                mode="outlined"
                placeholder="Car model, color, license plate..."
                style={styles.input}
              />

              <View style={styles.userTypeContainer}>
                <Text style={[styles.userTypeLabel, { color: theme.colors.onSurface }]}>
                  I am a:
                </Text>
                <View style={styles.userTypeButtons}>
                  {['driver', 'rider', 'both'].map((type) => (
                    <Button
                      key={type}
                      mode={profile.UserType === type ? 'contained' : 'outlined'}
                      onPress={() => setProfile({ ...profile, UserType: type as any })}
                      style={styles.userTypeButton}
                      compact
                    >
                      {type === 'both' ? 'Both' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </View>
              </View>

              <Button
                mode="contained"
                onPress={handleSaveProfile}
                loading={loading}
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.saveButtonContent}
              >
                Save Changes
              </Button>
            </Card.Content>
          </Card>
        ) : (
          /* Profile Details */
          <Card style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.detailsContent}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Profile Details
              </Text>

              {profile.Location && (
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={20} color={theme.colors.primary} />
                  <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                    {profile.Location}
                  </Text>
                </View>
              )}

              {profile.Phone && (
                <View style={styles.detailItem}>
                  <Ionicons name="call" size={20} color={theme.colors.primary} />
                  <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                    {profile.Phone}
                  </Text>
                </View>
              )}

              {profile.Ride && (
                <View style={styles.detailItem}>
                  <Ionicons name="car" size={20} color={theme.colors.primary} />
                  <Text style={[styles.detailText, { color: theme.colors.onSurface }]}>
                    {profile.Ride}
                  </Text>
                </View>
              )}

              {profile.Other && (
                <View style={styles.aboutSection}>
                  <Text style={[styles.aboutTitle, { color: theme.colors.onSurface }]}>
                    About Me
                  </Text>
                  <Text style={[styles.aboutText, { color: theme.colors.onSurfaceVariant }]}>
                    {profile.Other}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Quick Settings */}
        <Card style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Quick Settings
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                <Text style={[styles.settingText, { color: theme.colors.onSurface }]}>
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <Text style={[styles.settingText, { color: theme.colors.onSurface }]}>
                  Location Services
                </Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Menu Items */}
        <Card style={[styles.menuCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.menuContent}>
            {menuItems.map((item, index) => (
              <View key={item.title}>
                <List.Item
                  title={item.title}
                  description={item.subtitle}
                  left={(props) => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={item.onPress}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
                {index < menuItems.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Sign Out Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
          contentStyle={styles.logoutButtonContent}
        >
          Sign Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  profileCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  profileContent: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  userType: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  editButton: {
    borderRadius: 6,
  },
  editCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  editContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  userTypeContainer: {
    marginVertical: 16,
  },
  userTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  userTypeButton: {
    flex: 1,
  },
  saveButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  detailsCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  detailsContent: {
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  aboutSection: {
    marginTop: 8,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingsCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  menuContent: {
    padding: 0,
  },
  logoutButton: {
    borderRadius: 8,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
});
