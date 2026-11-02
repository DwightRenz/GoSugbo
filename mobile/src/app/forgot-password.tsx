import { useState } from "react";
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
import { forgotPassword, resetPassword } from "@/services/authService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const { seconds, start } = useCooldown(60);

  const fail = (e: unknown) =>
    setError(
      e instanceof ApiError ?
        e.displayMessage
      : "Something went wrong. Please try again.",
    );

  async function sendCode() {
    if (busy) return;
    setError("");
    setInfo("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await forgotPassword(email);
      setInfo(res.message);
      setStep("reset");
      start();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return;
    setError("");
    try {
      const res = await forgotPassword(email);
      setInfo(res.message);
      start();
    } catch (e) {
      fail(e);
    }
  }

  async function submitReset() {
    if (busy) return;
    setError("");
    setInfo("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (
      newPassword.length < 8 ||
      newPassword.length > 72 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setError(
        "Your password must have 8-72 characters, including a letter and a number.",
      );
      return;
    }
    if (newPassword !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword({
        email,
        otp: code.trim(),
        newPassword,
        confirmPassword: confirmation,
      });
      router.replace({
        pathname: "/login",
        params: { email: email.trim().toLowerCase(), reset: "1" },
      });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      {step === "email" ?
        <>
          <Heading
            title="Forgot password?"
            subtitle="Enter your email and we’ll send you a code to reset it."
          />
          <Field
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            email
          />
          <Message kind="error" text={error} />
          <PrimaryButton label="Send code" onPress={sendCode} loading={busy} />
        </>
      : <>
          <Heading
            title="Reset password"
            subtitle={`Enter the code sent to ${email.trim()} and choose a new password.`}
          />
          <Field
            label="Reset code"
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            numeric
            maxLength={6}
          />
          <Field
            label="New password"
            placeholder="Create a new password"
            value={newPassword}
            onChangeText={setNewPassword}
            autoComplete="new-password"
            password
          />
          <Field
            label="Confirm new password"
            placeholder="Confirm password"
            value={confirmation}
            onChangeText={setConfirmation}
            autoComplete="new-password"
            password
          />
          <Message kind="error" text={error} />
          <Message kind="info" text={info} />
          <PrimaryButton
            label="Update password"
            onPress={submitReset}
            loading={busy}
          />
          <LinkButton
            label={seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
            onPress={resend}
            disabled={seconds > 0}
          />
        </>
      }

      <LinkButton
        label="Back to log in"
        onPress={() => router.replace("/login")}
      />
    </AuthShell>
  );
}
