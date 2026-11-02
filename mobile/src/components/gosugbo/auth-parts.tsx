import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const authColors = {
  bg: "#F8F3EB",
  dark: "#4C1C24",
  accent: "#B74738",
  muted: "#88766E",
  border: "#E5CCB4",
  error: "#A92D36",
};

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <ImageBackground
            source={require("../../../assets/auth/cebu-header.png")}
            style={styles.header}
            imageStyle={styles.headerImage}
            resizeMode="cover">
            <Text style={styles.logo}>
              <Text style={styles.logoAccent}>Go</Text>Sugbo·
            </Text>
            <Text style={styles.tagline}>Ride, Order, Explore Cebu</Text>
          </ImageBackground>

          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  password?: boolean;
  email?: boolean;
  numeric?: boolean;
  maxLength?: number;
  editable?: boolean;
  autoComplete?: TextInputProps["autoComplete"];
};

export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  password = false,
  email = false,
  numeric = false,
  maxLength,
  editable = true,
  autoComplete,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
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
          keyboardType={
            email ? "email-address"
            : numeric ?
              "number-pad"
            : "default"
          }
          autoCapitalize={email || password || numeric ? "none" : "words"}
          autoCorrect={!email && !password && !numeric}
          autoComplete={autoComplete}
          maxLength={maxLength}
          editable={editable}
        />

        {password && (
          <Pressable
            onPress={() => setVisible((previous) => !previous)}
            accessibilityRole="button"
            accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
            style={styles.visibilityButton}>
            <Text style={styles.visibilityText}>
              {visible ? "Hide" : "Show"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const blocked = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryButton,
        (pressed || blocked) && styles.pressed,
      ]}>
      {loading ?
        <ActivityIndicator color="#FFFFFF" />
      : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[styles.linkButton, disabled && styles.pressed]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

export function Message({
  kind,
  text,
}: {
  kind: "error" | "info";
  text: string;
}) {
  if (!text) return null;
  return (
    <Text
      style={kind === "error" ? styles.error : styles.info}
      accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  header: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCF6EB",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  headerImage: { opacity: 0.55 },
  logo: {
    color: authColors.dark,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoAccent: { color: authColors.accent },
  tagline: { color: authColors.muted, fontSize: 14, marginTop: 8 },
  form: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    color: authColors.dark,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: {
    color: authColors.dark,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  inputFocused: { borderColor: authColors.dark },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: authColors.dark,
  },
  visibilityButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 8,
  },
  visibilityText: { color: authColors.muted, fontSize: 11, fontWeight: "600" },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: authColors.dark,
  },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.6 },
  linkButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  linkText: { color: authColors.dark, fontSize: 13, fontWeight: "700" },
  error: {
    color: authColors.error,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  info: { color: "#2F6B3F", fontSize: 12, lineHeight: 18, marginBottom: 12 },
});
