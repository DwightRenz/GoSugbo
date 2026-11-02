import { useRef, useState, type ComponentRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OtpScreen({ email }: { email?: string }) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');

  function verify() {
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      input.current?.focus();
      return;
    }
    if (code !== '123456') {
      setError('Incorrect code. Use 123456 for this mockup.');
      return;
    }
    router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/signup')}>
              <Text style={styles.arrow}>{'←'}</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Confirm</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.iconCircle} accessible={false}>
              <View style={styles.envelope}><View style={styles.flap} /></View>
              <Text style={styles.check}>{'✓'}</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">Verify Your Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit verification code sent to your{email ? '\n' : '\nemail address.'}
              {!!email && <Text style={styles.email}>{email}</Text>}
            </Text>

            <View style={styles.codeContainer}>
              <View style={styles.codeRow} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {Array.from({ length: 6 }, (_, index) => (
                  <View key={index} style={[styles.cell, focused && index === Math.min(code.length, 5) && styles.activeCell, !!error && styles.errorCell]}>
                    <Text style={styles.digit}>{code[index] ?? ''}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                ref={input}
                style={styles.codeInput}
                accessibilityLabel="6-digit email verification code"
                accessibilityHint="Enter or paste the code from your email"
                value={code}
                onChangeText={(value) => { setCode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoCorrect={false}
                caretHidden
                onSubmitEditing={verify}
              />
            </View>
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t receive a code? </Text>
              <Pressable accessibilityRole="button" hitSlop={8} style={styles.resendButton} onPress={() => Alert.alert('Resend preview', 'Connect your authentication provider here to send a new verification email.')}>
                <Text style={styles.resendText}>Resend Code</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={verify} style={({ pressed }) => [styles.verifyButton, pressed && styles.pressed]}>
              <Text style={styles.verifyText}>Verify Code</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.signInButton}>
              <Text style={styles.signInText}>{'← Back to Sign In'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F3EB' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  arrow: { color: '#4C1C24', fontSize: 25 },
  headerTitle: { color: '#4C1C24', fontSize: 18, fontWeight: '700', marginLeft: 8 },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 40 },
  iconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#F0DFCD', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  envelope: { width: 36, height: 28, borderWidth: 3, borderColor: '#4C1C24', borderRadius: 5, overflow: 'hidden' },
  flap: { width: 24, height: 24, borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#4C1C24', transform: [{ rotate: '45deg' }], alignSelf: 'center', marginTop: -16 },
  check: { position: 'absolute', right: 18, bottom: 20, color: '#4C1C24', backgroundColor: '#F0DFCD', fontSize: 20, fontWeight: '800', lineHeight: 22 },
  title: { color: '#4C1C24', fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { color: '#88766E', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10, marginBottom: 12 },
  email: { fontWeight: '600', color: '#4C1C24' },
  codeContainer: { position: 'relative', marginHorizontal: 32 },
  codeRow: { flexDirection: 'row', gap: 7 },
  cell: { flex: 1, height: 50, borderWidth: 1, borderColor: '#DDB88F', borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  activeCell: { borderColor: '#4C1C24', borderWidth: 2 },
  errorCell: { borderColor: '#A92D36' },
  digit: { fontSize: 23, fontWeight: '600', color: '#4C1C24' },
  codeInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.03, color: 'transparent', backgroundColor: 'transparent', fontSize: 16 },
  error: { color: '#A92D36', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 12 },
  resendRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 16 },
  resendPrompt: { color: '#88766E', fontSize: 13 },
  resendButton: { minHeight: 44, justifyContent: 'center' },
  resendText: { color: '#4C1C24', fontSize: 13, fontWeight: '700' },
  verifyButton: { backgroundColor: '#4C1C24', borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  verifyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  signInButton: { minHeight: 48, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: '#4C1C24', fontSize: 14, fontWeight: '700' },
});
