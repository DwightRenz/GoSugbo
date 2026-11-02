import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AuthShell,
  Field,
  Heading,
  LinkButton,
  Message,
  PrimaryButton,
} from "@/components/gosugbo/auth-parts";
import { useCooldown } from "@/hooks/use-cooldown";
import { ApiError } from "@/lib/api";
import { resendVerification, verifyEmail } from "@/services/authService";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("We sent a 6-digit code to your email.");
  const { seconds, start } = useCooldown(60);

  // A code was just sent (at sign up or on a blocked login).
  useEffect(() => {
    start();
  }, [start]);

  async function submit() {
    if (busy) return;
    setError("");
    setInfo("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    try {
      await verifyEmail(email, code.trim());
      router.replace({
        pathname: "/login",
        params: { email: email.trim().toLowerCase(), verified: "1" },
      });
    } catch (e) {
      setError(
        e instanceof ApiError ?
          e.displayMessage
        : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return;
    setError("");
    try {
      const res = await resendVerification(email);
      setInfo(res.message);
      start();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.displayMessage : "Could not resend the code.",
      );
    }
  }

  return (
    <AuthShell>
      <Heading
        title="Verify your email"
        subtitle="Enter the code we sent so you can start using GoSugbo."
      />

      {params.email ?
        <Text style={{ marginBottom: 16, color: "#4C1C24", fontWeight: "600" }}>
          {params.email}
        </Text>
      : <Field
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          email
        />
      }

      <Field
        label="Verification code"
        placeholder="123456"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
        numeric
        maxLength={6}
      />

      <Message kind="error" text={error} />
      <Message kind="info" text={info} />

      <PrimaryButton label="Verify email" onPress={submit} loading={busy} />

      <LinkButton
        label={seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
        onPress={resend}
        disabled={seconds > 0}
      />
      <LinkButton
        label="Back to log in"
        onPress={() => router.replace("/login")}
      />
    </AuthShell>
  );
}
