import { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

type AuthScreenProps = {
  mode: 'login' | 'signup';
};

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  password?: boolean;
  email?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  password = false,
  email = false,
  autoComplete,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor="#B8ABA5"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={password && !visible}
          keyboardType={email ? 'email-address' : 'default'}
          autoCapitalize={email || password ? 'none' : 'words'}
          autoCorrect={!email && !password}
          autoComplete={autoComplete}
        />

        {password && (
          <Pressable
            onPress={() => setVisible((previous) => !previous)}
            accessibilityRole="button"
            accessibilityLabel={
              visible ? `Hide ${label}` : `Show ${label}`
            }
            style={styles.visibilityButton}
          >
            <Text style={styles.visibilityText}>
              {visible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function AuthScreen({ mode }: AuthScreenProps) {
  const signup = mode === 'signup';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');

  function submit() {
    setError('');

    if (signup && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (signup) {
      if (password.length < 8 || !/\d/.test(password)) {
        setError(
          'Your password must have at least 8 characters, including a number.'
        );
        return;
      }

      if (password !== confirmation) {
        setError('Your passwords do not match.');
        return;
      }

      if (!acceptedTerms) {
        setError(
          'Please accept the Terms of Service and Privacy Policy.'
        );
        return;
      }

      Alert.alert(
        'Create Account preview',
        'Your form is valid. Connect your backend to create an account.'
      );
      return;
    }

    Alert.alert(
      'Login preview',
      'Your form is valid. Connect your backend to sign in.'
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ImageBackground
            source={require('../../../assets/auth/cebu-header.png')}
            style={styles.header}
            imageStyle={styles.headerImage}
            resizeMode="cover"
          >
            <Text style={styles.logo}>
              <Text style={styles.logoAccent}>Go</Text>Sugbo·
            </Text>

            <Text style={styles.tagline}>
              Ride, Order, Explore Cebu
            </Text>
          </ImageBackground>

          <View style={styles.form}>
            <Text style={styles.heading}>
              {signup ? 'Let’s get you started.' : 'Log in'}
            </Text>

            <Text style={styles.subtitle}>
              {signup
                ? 'A few details, then you’re good to GoSugbo.'
                : 'Welcome back! Please sign in to continue using GoSugbo.'}
            </Text>

            {signup && (
              <>
                <Field
                  label="First Name"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoComplete="given-name"
                />

                <Field
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoComplete="family-name"
                />
              </>
            )}

            <Field
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              email
            />

            <Field
              label="Password"
              placeholder={
                signup ? 'Create a password' : 'Enter your password'
              }
              value={password}
              onChangeText={setPassword}
              autoComplete={
                signup ? 'new-password' : 'current-password'
              }
              password
            />

            {signup ? (
              <>
                <Text style={styles.hint}>
                  Use at least 8 characters, including a number.
                </Text>

                <Field
                  label="Confirm Password"
                  placeholder="Confirm password"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  autoComplete="new-password"
                  password
                />

                <View style={styles.termsRow}>
                  <Pressable
                    onPress={() =>
                      setAcceptedTerms((previous) => !previous)
                    }
                    accessibilityRole="checkbox"
                    accessibilityLabel="Accept terms and privacy policy"
                    accessibilityState={{
                      checked: acceptedTerms,
                    }}
                    style={styles.checkboxTarget}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedTerms && styles.checkboxSelected,
                      ]}
                    >
                      {acceptedTerms && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </Pressable>

                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                      style={styles.bold}
                      accessibilityRole="link"
                      onPress={() =>
                        Alert.alert(
                          'Terms of Service',
                          'Add your Terms of Service page here.'
                        )
                      }
                    >
                      Terms of Service
                    </Text>
                    {' and '}
                    <Text
                      style={styles.bold}
                      accessibilityRole="link"
                      onPress={() =>
                        Alert.alert(
                          'Privacy Policy',
                          'Add your Privacy Policy page here.'
                        )
                      }
                    >
                      Privacy Policy.
                    </Text>
                  </Text>
                </View>
              </>
            ) : (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Forgot password',
                    'Password reset will be connected later.'
                  )
                }
                accessibilityRole="button"
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>
                  Forgot password?
                </Text>
              </Pressable>
            )}

            {!!error && (
              <Text
                style={styles.error}
                accessibilityLiveRegion="polite"
              >
                {error}
              </Text>
            )}

            <Pressable
              onPress={submit}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>
                {signup ? 'Create account' : 'Log in'}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.line} />
            </View>

            <Pressable
              onPress={() =>
                Alert.alert(
                  'Google sign-in',
                  'Google authentication will be connected later.'
                )
              }
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={require('../../../assets/auth/google-logo.png')}
                style={styles.googleLogo}
                resizeMode="contain"
                accessible={false}
              />

              <Text style={styles.googleText}>
                {signup
                  ? 'Sign up with Google'
                  : 'Continue with Google'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.replace(signup ? '/login' : '/signup')
              }
              accessibilityRole="button"
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {signup
                  ? 'Already part of GoSugbo? '
                  : 'New to GoSugbo? '}
                <Text style={styles.bold}>
                  {signup ? 'Log in' : 'Create an account'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F3EB',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCF6EB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  headerImage: {
    opacity: 0.55,
  },
  logo: {
    color: '#4C1C24',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoAccent: {
    color: '#B74738',
  },
  tagline: {
    color: '#88766E',
    fontSize: 14,
    marginTop: 8,
  },
  form: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    color: '#4C1C24',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#88766E',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: '#4C1C24',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5CCB4',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#4C1C24',
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: '#4C1C24',
  },
  visibilityButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  visibilityText: {
    color: '#88766E',
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    color: '#88766E',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 18,
  },
  forgotButton: {
    minHeight: 40,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    marginTop: -8,
    marginBottom: 10,
  },
  forgotText: {
    color: '#4C1C24',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#4C1C24',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5CCB4',
  },
  orText: {
    color: '#88766E',
    fontSize: 12,
  },
  googleButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4C1C24',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  googleLogo: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  googleText: {
    color: '#4C1C24',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  switchButton: {
    minHeight: 48,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    color: '#4C1C24',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  bold: {
    color: '#4C1C24',
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxTarget: {
    width: 40,
    minHeight: 44,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#4C1C24',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4C1C24',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  termsText: {
    flex: 1,
    color: '#4C1C24',
    fontSize: 11,
    lineHeight: 18,
  },
  error: {
    color: '#A92D36',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
});