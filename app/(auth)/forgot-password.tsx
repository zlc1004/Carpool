import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { forgotPassword, state } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await forgotPassword(email);
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'If an account with this email exists, you will receive a password reset link shortly.'
      );
    } catch (error: any) {
      Alert.alert('Error', state.error || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.back();
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
              Forgot Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {emailSent
                ? 'Check your email for password reset instructions'
                : 'Enter your email address and we\'ll send you a link to reset your password'}
            </Text>
          </View>

          {!emailSent && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.cardContent}>
                {/* Email Input */}
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                  style={styles.input}
                />
                {errors.email && (
                  <HelperText type="error" visible={!!errors.email}>
                    {errors.email}
                  </HelperText>
                )}

                {/* Send Reset Email Button */}
                <Button
                  mode="contained"
                  onPress={handleForgotPassword}
                  loading={isLoading}
                  style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
                  contentStyle={styles.buttonContent}
                >
                  Send Reset Email
                </Button>

                {/* Error Message */}
                {state.error && (
                  <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
                    {state.error}
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}

          {emailSent && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.successContainer}>
                  <Text style={[styles.successIcon, { color: theme.colors.primary }]}>
                    ✓
                  </Text>
                  <Text style={[styles.successMessage, { color: theme.colors.onSurface }]}>
                    Email sent successfully!
                  </Text>
                  <Text style={[styles.successSubtext, { color: theme.colors.onSurfaceVariant }]}>
                    Please check your email and follow the instructions to reset your password.
                  </Text>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => setEmailSent(false)}
                  style={styles.resendButton}
                  contentStyle={styles.buttonContent}
                >
                  Send Another Email
                </Button>
              </Card.Content>
            </Card>
          )}

          {/* Back to Sign In */}
          <View style={styles.backSection}>
            <Button mode="text" onPress={handleBackToSignIn} compact>
              ← Back to Sign In
            </Button>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  cardContent: {
    padding: 20,
  },
  input: {
    marginBottom: 8,
  },
  resetButton: {
    borderRadius: 8,
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorMessage: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    borderRadius: 8,
  },
  backSection: {
    alignItems: 'center',
  },
});
