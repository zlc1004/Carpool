import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';

export default function TabBarBackground() {
  return Platform.OS === 'ios' ? (
    <BlurView
      tint="systemChromeMaterialLight"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  ) : null;
}
