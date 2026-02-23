import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginRequest } from "../services/authService";
import { BackendUser } from "../utils/auth";

const USER_KEY = "auth_user";
const SESSION_EXPIRY_KEY = "session_expiry";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AuthState {
  user: BackendUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });

    console.log("[auth] login start", { username });
    try {
      const res = await loginRequest(username, password);
      console.log("[auth] login response", res);

      const { token, refreshToken, tokenExpiry, ...user } = res?.data || ({} as any);
      console.log("[auth] extracted", { token, user });

      if (!token) {
        console.log("[auth] missing token in response");
        throw new Error("Missing token");
      }

      // If the API returns username as null, store the login username
      const userWithUsername: BackendUser = {
        ...user,
        username: user.username || username,
      };

      // Persist token, user data, and session expiry (24 hours from now)
      const expiryTime = Date.now() + SESSION_DURATION_MS;
      await AsyncStorage.setItem("access_token", token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userWithUsername));
      await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());

      set({
        user: userWithUsername,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log("[auth] login success, session expires at", new Date(expiryTime).toISOString());
    } catch (error: any) {
      console.log("[auth] login error", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    try {
      const [token, userJson, expiryStr] = await Promise.all([
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(SESSION_EXPIRY_KEY),
      ]);

      if (!token || !userJson) {
        console.log("[auth] no stored session found");
        return false;
      }

      // Check if session has expired
      if (expiryStr) {
        const expiryTime = parseInt(expiryStr, 10);
        const now = Date.now();
        if (now > expiryTime) {
          console.log("[auth] session expired, clearing storage");
          await AsyncStorage.multiRemove(["access_token", USER_KEY, SESSION_EXPIRY_KEY]);
          return false;
        }
        const remainingHours = ((expiryTime - now) / (1000 * 60 * 60)).toFixed(1);
        console.log(`[auth] session valid, expires in ${remainingHours} hours`);
      } else {
        // No expiry set (old sessions) - set it now for 24h
        const expiryTime = Date.now() + SESSION_DURATION_MS;
        await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
        console.log("[auth] legacy session, set new 24h expiry");
      }

      const user: BackendUser = JSON.parse(userJson);
      console.log("[auth] session restored for", user.empId);
      set({
        user,
        token,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error("[auth] restoreSession error:", error);
      return false;
    }
  },

  logout: async () => {
    console.log("[auth] logout start");
    await AsyncStorage.multiRemove(["access_token", USER_KEY, SESSION_EXPIRY_KEY]);

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    console.log("[auth] logout done");
  },
}));
