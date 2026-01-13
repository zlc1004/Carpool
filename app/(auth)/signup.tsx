import React, { useState, useEffect } from 'react';
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
  Menu,
  Checkbox,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { schoolsAPI } from '@/services/api';
import CaptchaComponent from '@/components/CaptchaComponent';

interface School {
  _id: string;
  name: string;
  domain: string;
}

export default function SignUpScreen() {
  const theme = useTheme();
  const { register, state } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolId: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolMenuVisible, setSchoolMenuVisible] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.getSchools();
      setSchools(response.schools || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.schoolId) {
      newErrors.schoolId = 'Please select your school';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    if (!captchaToken) {
      newErrors.captcha = 'Please complete the captcha verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        schoolId: formData.schoolId,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', state.error || 'Please try again.');
    }
  };

  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school);
    setFormData({ ...formData, schoolId: school._id });
    setSchoolMenuVisible(false);
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
  };

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
    setErrors({ ...errors, captcha: '' });
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
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Join your school's ride sharing community
            </Text>
          </View>

          {/* Form */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              {/* Name Input */}
              <TextInput
                label="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                mode="outlined"
                autoCapitalize="words"
                autoComplete="name"
                error={!!errors.name}
                style={styles.input}
              />
              {errors.name && (
                <HelperText type="error" visible={!!errors.name}>
                  {errors.name}
                </HelperText>
              )}

              {/* Email Input */}
              <TextInput
                label="School Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
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

              {/* School Selection */}
              <Menu
                visible={schoolMenuVisible}
                onDismiss={() => setSchoolMenuVisible(false)}
                anchor={
                  <TextInput
                    label="School"
                    value={selectedSchool?.name || ''}
                    mode="outlined"
                    editable={false}
                    error={!!errors.schoolId}
                    style={styles.input}
                    right={<TextInput.Icon icon="chevron-down" onPress={() => setSchoolMenuVisible(true)} />}
                    onPressIn={() => setSchoolMenuVisible(true)}
                  />
                }
              >
                {schools.map((school) => (
                  <Menu.Item
                    key={school._id}
                    onPress={() => handleSchoolSelect(school)}
                    title={school.name}
                  />
                ))}
              </Menu>
              {errors.schoolId && (
                <HelperText type="error" visible={!!errors.schoolId}>
                  {errors.schoolId}
                </HelperText>
              )}

              {/* Password Input */}
              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                error={!!errors.password}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />
              {errors.password && (
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>
              )}

              {/* Confirm Password Input */}
              <TextInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />
              {errors.confirmPassword && (
                <HelperText type="error" visible={!!errors.confirmPassword}>
                  {errors.confirmPassword}
                </HelperText>
              )}

              {/* Captcha */}
              <View style={styles.captchaContainer}>
                <CaptchaComponent onSuccess={handleCaptchaSuccess} />
                {errors.captcha && (
                  <HelperText type="error" visible={!!errors.captcha}>
                    {errors.captcha}
                  </HelperText>
                )}
              </View>

              {/* Terms Agreement */}
              <View style={styles.termsContainer}>
                <Checkbox
                  status={formData.agreeToTerms ? 'checked' : 'unchecked'}
                  onPress={() =>
                    setFormData({ ...formData, agreeToTerms: !formData.agreeToTerms })
                  }
                />
                <Text style={[styles.termsText, { color: theme.colors.onSurface }]}>
                  I agree to the{' '}
                  <Text style={{ color: theme.colors.primary }}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={{ color: theme.colors.primary }}>Privacy Policy</Text>
                </Text>
              </View>
              {errors.agreeToTerms && (
                <HelperText type="error" visible={!!errors.agreeToTerms}>
                  {errors.agreeToTerms}
                </HelperText>
              )}

              {/* Sign Up Button */}
              <Button
                mode="contained"
                onPress={handleSignUp}
                loading={state.isLoading}
                style={[styles.signUpButton, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.buttonContent}
              >
                Create Account
              </Button>

              {/* Error Message */}
              {state.error && (
                <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
                  {state.error}
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <Text style={[styles.signInText, { color: theme.colors.onSurfaceVariant }]}>
              Already have an account?{' '}
            </Text>
            <Button mode="text" onPress={handleSignIn} compact>
              Sign In
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
  captchaContainer: {
    marginVertical: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  termsText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  signUpButton: {
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
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
  },
});
