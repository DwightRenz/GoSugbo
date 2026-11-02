import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    async (input: LoginInput) =>
      establishSession(await authService.login(input)),
    [establishSession],
  );

  const loginWithGoogle = useCallback(async () => {
    const res = await authService.signInWithGoogle();
    return res ? establishSession(res) : null;
  }, [establishSession]);

  const logout = useCallback(async () => {
    try {
      await authService.logoutRequest(); // revokes the token on the server
    } catch {
      // still sign out locally
    }
    await tokenStorage.clear();
    await authService.googleSignOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      register,
      login,
      loginWithGoogle,
      logout,
    }),
    [user, loading, register, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
