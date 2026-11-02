import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  AuthShell,
  Field,
  Heading,
  Message,
  PrimaryButton,
  authColors,
} from "./auth-parts";

type AuthScreenProps = {
  mode: "login" | "signup";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ mode }: AuthScreenProps) {
  const signup = mode === "signup";
  const params = useLocalSearchParams<{
    email?: string;
    verified?: string;
    reset?: string;
  }>();
  const { register, login, loginWithGoogle } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    params.verified ? "Email verified! You can now log in."
    : params.reset ? "Password updated! You can now log in."
    : "",
  );

  function showError(e: unknown) {
    setError(
      e instanceof ApiError ?
        e.displayMessage
      : "Something went wrong. Please try again.",
    );
  }

  async function submit() {
    if (busy) return;
    setError("");
    setInfo("");

    if (signup && (!firstName.trim() || !lastName.trim())) {
      setError("Please enter your first and last name.");
      return;
    }

    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    // The local test account uses the same OTP flow from either auth screen.
    if (__DEV__ && email.trim().toLowerCase() === "test@gmail.com") {
      setBusy(true);
      try {
        await login({ email, password });
      } catch (e) {
        if (e instanceof ApiError && e.code === "TEST_OTP_REQUIRED") {
          router.push("/otp");
        } else {
          showError(e);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    if (signup) {
      if (
        password.length < 8 ||
        password.length > 72 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password)
      ) {
        setError(
          "Your password must have 8-72 characters, including a letter and a number.",
        );
        return;
      }

      if (password !== confirmation) {
        setError("Your passwords do not match.");
        return;
      }

      if (!acceptedTerms) {
        setError("Please accept the Terms of Service and Privacy Policy.");
        return;
      }
    } else if (otpRequired && !/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code we sent to your email.");
      return;
    }

    setBusy(true);
    try {
      if (signup) {
        await register({
          firstName,
          lastName,
          email,
          password,
          confirmPassword: confirmation,
        });
        router.replace({
          pathname: "/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }

      // On success the route guard in _layout.tsx moves the user to /home.
      await login({
        email,
        password,
        otp: otpRequired ? otp.trim() : undefined,
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === "TEST_OTP_REQUIRED") {
        router.push("/otp");
      } else if (e instanceof ApiError && e.code === "EMAIL_NOT_VERIFIED") {
        // The backend already emailed a fresh code.
        router.push({
          pathname: "/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
      } else if (e instanceof ApiError && e.code === "OTP_REQUIRED") {
        // Inactive 30+ days: a code was emailed; ask for it and resubmit.
        setOtpRequired(true);
        setOtp("");
        setInfo(e.message);
      } else {
        showError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    if (busy) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await loginWithGoogle(); // returns null if the user cancelled
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Heading
        title={signup ? "Let’s get you started." : "Log in"}
        subtitle={
          signup ?
            "A few details, then you’re good to GoSugbo."
          : "Welcome back! Please sign in to continue using GoSugbo."
        }
      />

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
        placeholder={signup ? "Create a password" : "Enter your password"}
        value={password}
        onChangeText={setPassword}
        autoComplete={signup ? "new-password" : "current-password"}
        password
      />

      {signup ?
        <>
          <Text style={styles.hint}>
            Use 8-72 characters, including a letter and a number.
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
              onPress={() => setAcceptedTerms((previous) => !previous)}
              accessibilityRole="checkbox"
              accessibilityLabel="Accept terms and privacy policy"
              accessibilityState={{ checked: acceptedTerms }}
              style={styles.checkboxTarget}>
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxSelected,
                ]}>
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>

            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                style={styles.bold}
                accessibilityRole="link"
                onPress={() =>
                  Alert.alert(
                    "Terms of Service",
                    "Add your Terms of Service page here.",
                  )
                }>
                Terms of Service
              </Text>
              {" and "}
              <Text
                style={styles.bold}
                accessibilityRole="link"
                onPress={() =>
                  Alert.alert(
                    "Privacy Policy",
                    "Add your Privacy Policy page here.",
                  )
                }>
                Privacy Policy.
              </Text>
            </Text>
          </View>
        </>
      : <>
          {otpRequired && (
            <Field
              label="Security code"
              placeholder="6-digit code from your email"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
              numeric
              maxLength={6}
            />
          )}

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/forgot-password",
                params: { email: email.trim() },
              })
            }
            accessibilityRole="button"
            style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </>
      }

      <Message kind="error" text={error} />
      <Message kind="info" text={info} />

      <PrimaryButton
        label={
          signup ? "Create account"
          : otpRequired ?
            "Verify and log in"
          : "Log in"
        }
        onPress={submit}
        loading={busy}
      />

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <Pressable
        onPress={submitGoogle}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.googleButton,
          (pressed || busy) && styles.pressed,
        ]}>
        <Image
          source={require("../../../assets/auth/google-logo.png")}
          style={styles.googleLogo}
          resizeMode="contain"
          accessible={false}
        />

        <Text style={styles.googleText}>
          {signup ? "Sign up with Google" : "Continue with Google"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace(signup ? "/login" : "/signup")}
        accessibilityRole="button"
        style={styles.switchButton}>
        <Text style={styles.switchText}>
          {signup ? "Already part of GoSugbo? " : "New to GoSugbo? "}
          <Text style={styles.bold}>
            {signup ? "Log in" : "Create an account"}
          </Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: authColors.muted,
    fontSize: 11,
    marginTop: -8,
    marginBottom: 18,
  },
  forgotButton: {
    minHeight: 40,
    alignSelf: "flex-end",
    justifyContent: "center",
    marginTop: -8,
    marginBottom: 10,
  },
  forgotText: {
    color: authColors.dark,
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: authColors.border,
  },
  orText: {
    color: authColors.muted,
    fontSize: 12,
  },
  googleButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: authColors.dark,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  googleLogo: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  googleText: {
    color: authColors.dark,
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  switchButton: {
    minHeight: 48,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  switchText: {
    color: authColors.dark,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  bold: {
    color: authColors.dark,
    fontWeight: "700",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxTarget: {
    width: 40,
    minHeight: 44,
    justifyContent: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: authColors.dark,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: authColors.dark,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  termsText: {
    flex: 1,
    color: authColors.dark,
    fontSize: 11,
    lineHeight: 18,
  },
});
