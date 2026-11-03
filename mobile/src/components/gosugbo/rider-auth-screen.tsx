import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
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
import type { VehicleType } from "@/types/auth";

type RiderAuthScreenProps = {
  mode: "login" | "signup";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VEHICLE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
];

export default function RiderAuthScreen({ mode }: RiderAuthScreenProps) {
  const signup = mode === "signup";
  const params = useLocalSearchParams<{
    email?: string;
    verified?: string;
    reset?: string;
  }>();
  const { registerRider, login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("motorcycle");
  const [plateNumber, setPlateNumber] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
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
        await registerRider({
          firstName,
          lastName,
          email,
          password,
          confirmPassword: confirmation,
          vehicleType,
          plateNumber: plateNumber || undefined,
          licenseNo: licenseNo || undefined,
        });
        router.replace({
          pathname: "/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }

      // Login is the shared endpoint; role comes back as "rider".
      await login({
        email,
        password,
        otp: otpRequired ? otp.trim() : undefined,
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === "TEST_OTP_REQUIRED") {
        router.push("/otp");
      } else if (e instanceof ApiError && e.code === "EMAIL_NOT_VERIFIED") {
        router.push({
          pathname: "/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
      } else if (e instanceof ApiError && e.code === "OTP_REQUIRED") {
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

  return (
    <AuthShell>
      <Heading
        title={signup ? "Become a GoSugbo rider." : "Rider log in"}
        subtitle={
          signup ?
            "Tell us about your vehicle to start driving with GoSugbo."
          : "Welcome back! Sign in to start accepting rides."
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

          <Text style={styles.label}>Vehicle type</Text>
          <View style={styles.chipRow}>
            {VEHICLE_OPTIONS.map((option) => {
              const selected = vehicleType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setVehicleType(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="Plate Number (optional)"
            placeholder="e.g. ABC 1234"
            value={plateNumber}
            onChangeText={setPlateNumber}
          />

          <Field
            label="License No. (optional)"
            placeholder="e.g. N01-23-456789"
            value={licenseNo}
            onChangeText={setLicenseNo}
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
          signup ? "Create rider account"
          : otpRequired ?
            "Verify and log in"
          : "Log in"
        }
        onPress={submit}
        loading={busy}
      />

      <Pressable
        onPress={() =>
          router.replace(signup ? "/rider-login" : "/rider-signup")
        }
        accessibilityRole="button"
        style={styles.switchButton}>
        <Text style={styles.switchText}>
          {signup ? "Already a GoSugbo rider? " : "New to GoSugbo riders? "}
          <Text style={styles.bold}>
            {signup ? "Log in" : "Create an account"}
          </Text>
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/login")}
        accessibilityRole="button"
        style={styles.backButton}>
        <Text style={styles.backText}>
          {"Looking for your customer account? "}
          <Text style={styles.bold}>Log in here</Text>
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
  label: {
    color: authColors.dark,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: authColors.dark,
    borderColor: authColors.dark,
  },
  chipText: {
    color: authColors.dark,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
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
  backButton: {
    minHeight: 44,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: authColors.muted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
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
