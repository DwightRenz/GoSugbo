import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "gosugbo.accessToken";

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return typeof localStorage !== "undefined" ?
            localStorage.getItem(KEY)
          : null;
      }
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined")
          localStorage.setItem(KEY, token);
        return;
      }
      await SecureStore.setItemAsync(KEY, token);
    } catch {
      // ignore storage failures; the session just won't persist
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
        return;
      }
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // ignore
    }
  },
};
