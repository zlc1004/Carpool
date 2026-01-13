import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme, Button, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface CaptchaComponentProps {
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
}

const CaptchaComponent: React.FC<CaptchaComponentProps> = ({
  onSuccess,
  onError,
}) => {
  const theme = useTheme();
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    // Generate simple math captcha
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer: number;
    let question: string;
    
    switch (operator) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        // Ensure positive result
        const bigger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        answer = bigger - smaller;
        question = `${bigger} - ${smaller}`;
        break;
      case '*':
        // Use smaller numbers for multiplication
        const smallNum1 = Math.floor(Math.random() * 5) + 1;
        const smallNum2 = Math.floor(Math.random() * 5) + 1;
        answer = smallNum1 * smallNum2;
        question = `${smallNum1} × ${smallNum2}`;
        break;
      default:
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setUserAnswer('');
    setIsVerified(false);
  };

  const verifyCaptcha = async () => {
    setIsLoading(true);
    
    // Simulate server verification delay
    setTimeout(() => {
      if (userAnswer.trim() === captchaAnswer) {
        setIsVerified(true);
        // Generate a simple token (in production, this would come from server)
        const token = btoa(`captcha_verified_${Date.now()}_${Math.random()}`);
        onSuccess(token);
        setIsLoading(false);
      } else {
        setAttempts(prev => prev + 1);
        if (attempts >= 2) {
          // Regenerate after 3 failed attempts
          generateCaptcha();
          setAttempts(0);
          Alert.alert('Too many attempts', 'New captcha generated');
        }
        onError?.('Incorrect answer. Please try again.');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleRefresh = () => {
    generateCaptcha();
    setAttempts(0);
  };

  if (isVerified) {
    return (
      <Card style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content style={styles.content}>
          <View style={styles.verifiedContainer}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.verifiedIcon}
            />
            <Text style={[styles.verifiedText, { color: theme.colors.primary }]}>
              Verified Successfully
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Security Verification
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons 
              name="refresh" 
              size={20} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.questionLabel, { color: theme.colors.onSurface }]}>
            What is:
          </Text>
          <View style={[styles.questionBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.questionText, { color: theme.colors.onSurface }]}>
              {captchaQuestion} = ?
            </Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.answerInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.onSurface,
                borderColor: theme.colors.outline,
              }
            ]}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Enter your answer"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="numeric"
            maxLength={3}
          />
          <Button
            mode="contained"
            onPress={verifyCaptcha}
            loading={isLoading}
            disabled={!userAnswer.trim() || isLoading}
            style={styles.verifyButton}
            contentStyle={styles.verifyButtonContent}
          >
            Verify
          </Button>
        </View>

        {attempts > 0 && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Incorrect answer. {3 - attempts} attempts remaining.
          </Text>
        )}

        <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
          Please solve the math problem above to verify you're human.
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 4,
  },
  questionContainer: {
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  questionBox: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  verifyButton: {
    borderRadius: 6,
  },
  verifyButtonContent: {
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    marginRight: 8,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CaptchaComponent;
