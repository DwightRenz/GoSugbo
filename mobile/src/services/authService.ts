import { Platform, TurboModuleRegistry } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import { ApiError, request } from "@/lib/api";
import { GOOGLE_WEB_CLIENT_ID } from "@/lib/config";
import { getFirebaseAuth } from "@/lib/firebase";
import type {
  AuthResponse,
  LoginInput,
  MessageResponse,
  RegisterCustomerInput,
  RegisterRiderInput, // NEW
  ResetPasswordInput,
  User,
} from "@/types/auth";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isExpoGo = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// True only if the native Google module is actually compiled into this app.
const hasGoogleNative = () => TurboModuleRegistry.get("RNGoogleSignin") != null;

export function registerCustomer(input: RegisterCustomerInput) {
  return request<User>("/api/auth/register/customer", {
    method: "POST",
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizeEmail(input.email),
      password: input.password,
      confirmPassword: input.confirmPassword,
    },
  });
}

export function registerRider(input: RegisterRiderInput) {
  return request<User>("/api/auth/register/rider", {
    method: "POST",
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizeEmail(input.email),
      password: input.password,
      confirmPassword: input.confirmPassword,
      vehicleType: input.vehicleType,
      ...(input.plateNumber?.trim() ?
        { plateNumber: input.plateNumber.trim() }
      : {}),
      ...(input.licenseNo?.trim() ? { licenseNo: input.licenseNo.trim() } : {}),
    },
  });
}

export function verifyEmail(email: string, otp: string) {
  return request<MessageResponse>("/api/auth/verify-email", {
    method: "POST",
    body: { email: normalizeEmail(email), otp },
  });
}

export function resendVerification(email: string) {
  return request<MessageResponse>("/api/auth/resend-verification", {
    method: "POST",
    body: { email: normalizeEmail(email) },
  });
}

export function login(input: LoginInput) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: {
      email: normalizeEmail(input.email),
      password: input.password,
      ...(input.otp ? { otp: input.otp } : {}), // backend rejects an empty string
    },
  });
}

export function forgotPassword(email: string) {
  return request<MessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: { email: normalizeEmail(email) },
  });
}

export function resetPassword(input: ResetPasswordInput) {
  return request<MessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: {
      email: normalizeEmail(input.email),
      otp: input.otp,
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    },
  });
}

export function fetchMe() {
  return request<User>("/api/auth/me", { auth: true });
}

export function logoutRequest(token?: string) {
  return request<MessageResponse>("/api/auth/logout", {
    method: "POST",
    auth: true,
    token,
  });
}

/**
 * Google -> Firebase -> Firebase ID token (what POST /api/auth/google expects).
 * Returns null if the user cancelled.
 */
async function getFirebaseIdToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    throw new ApiError(
      0,
      "Google sign-in is only available in the mobile app build.",
    );
  }
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new ApiError(
      0,
      "Google sign-in is not configured (missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).",
    );
  }
  // Expo Go, or a dev build made before the Google module was installed:
  // importing the module would crash, so stop here.
  if (isExpoGo() || !hasGoogleNative()) {
    throw new ApiError(
      0,
      "Google sign-in isn't available in this build. Rebuild the development build (npx expo run:android) or use email login.",
    );
  }

  let GoogleSignin: any;
  let statusCodes: any;
  try {
    ({ GoogleSignin, statusCodes } =
      await import("@react-native-google-signin/google-signin"));
  } catch {
    throw new ApiError(
      0,
      "Google sign-in could not be loaded. Rebuild the development build.",
    );
  }

  try {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices();
    const result: any = await GoogleSignin.signIn();
    if (result?.type === "cancelled") return null;

    // v13+ returns { type, data: { idToken } }, older versions return { idToken }
    const googleIdToken: string | undefined =
      result?.data?.idToken ?? result?.idToken;
    if (!googleIdToken) {
      throw new ApiError(
        0,
        "Google did not return an ID token. Please try again.",
      );
    }

    const auth = getFirebaseAuth();
    const credential = await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(googleIdToken),
    );
    const firebaseToken = await credential.user.getIdToken();
    await signOut(auth).catch(() => {}); // Firebase is only used to mint the token
    return firebaseToken;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (
      e?.code === statusCodes.SIGN_IN_CANCELLED ||
      e?.code === statusCodes.IN_PROGRESS
    )
      return null;
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new ApiError(
        0,
        "Google Play Services is not available on this device.",
      );
    }
    throw new ApiError(0, "Google sign-in failed. Please try again.");
  }
}

export async function signInWithGoogle(): Promise<AuthResponse | null> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) return null;
  return request<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: { idToken },
  });
}

export async function googleSignOut() {
  if (Platform.OS === "web" || isExpoGo() || !hasGoogleNative()) return;
  try {
    const { GoogleSignin } =
      await import("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}
