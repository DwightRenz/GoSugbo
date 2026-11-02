import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, setUnauthorizedHandler } from "@/lib/api";
import { tokenStorage } from "@/lib/storage";
import * as authService from "@/services/authService";
import type {
  AuthResponse,
  LoginInput,
  RegisterCustomerInput,
  User,
} from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  register: (input: RegisterCustomerInput) => Promise<User>;
  login: (input: LoginInput) => Promise<User>;
  verifyTestOtp: (code: string) => void;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Temporary frontend preview account. Never accepted in production builds.
const TEST_USER: User = {
  id: -1,
  firstName: "Test",
  lastName: "Customer",
  email: "test@gmail.com",
  role: "customer",
  status: "active",
  profileImage: null,
  createdAt: "2026-01-01T00:00:00Z",
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const testLoginPending = useRef(false);

  // Any authenticated request that returns 401 signs the user out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void tokenStorage.clear();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore the session on app start.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token) return;
        const me = await authService.fetchMe();
        if (!active) return;
        if (me.role === "customer") {
          setUser(me);
        } else {
          await tokenStorage.clear();
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401)
          await tokenStorage.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const establishSession = useCallback(
    async (res: AuthResponse): Promise<User> => {
      // This app is customer-only; the backend login endpoint is shared by all roles.
      if (res.user.role !== "customer") {
        await authService.logoutRequest(res.accessToken).catch(() => {}); // revoke it
        throw new ApiError(403, "This app is for customers only.");
      }
      await tokenStorage.set(res.accessToken);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const register = useCallback(
    (input: RegisterCustomerInput) => authService.registerCustomer(input),
    [],
  );

const login = useCallback(
  async (input: LoginInput) => {
    const email = input.email.trim().toLowerCase();

    if (__DEV__ && email === "test@gmail.com") {
      if (input.password !== "test12345") {
        throw new ApiError(
          401,
          "Incorrect password for the test account.",
        );
      }

      await tokenStorage.clear();
      testLoginPending.current = false;
      setUser(TEST_USER);
      return TEST_USER;
    }

    return establishSession(await authService.login(input));
  },
  [establishSession],
);

  const loginWithGoogle = useCallback(async () => {
    const res = await authService.signInWithGoogle();
    return res ? establishSession(res) : null;
  }, [establishSession]);

  const verifyTestOtp = useCallback((code: string) => {
    if (!__DEV__ || !testLoginPending.current) {
      throw new Error("Please log in with the test account first.");
    }
    if (code !== "123456") throw new Error("Incorrect verification code.");
    testLoginPending.current = false;
    setUser(TEST_USER);
  }, []);

  const logout = useCallback(async () => {
    if (__DEV__ && user === TEST_USER) {
      setUser(null);
      return;
    }
    try {
      await authService.logoutRequest(); // revokes the token on the server
    } catch {
      // still sign out locally
    }
    await tokenStorage.clear();
    await authService.googleSignOut();
    setUser(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      register,
      login,
      verifyTestOtp,
      loginWithGoogle,
      logout,
    }),
    [user, loading, register, login, verifyTestOtp, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
