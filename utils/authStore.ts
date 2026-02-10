import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginRequest } from "../services/authService";
import { BackendUser } from "../utils/auth";

const USER_KEY = "auth_user";

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

      // Persist both token and user data
      await AsyncStorage.setItem("access_token", token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userWithUsername));

      set({
        user: userWithUsername,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log("[auth] login success, state updated");
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
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        const user: BackendUser = JSON.parse(userJson);
        console.log("[auth] session restored for", user.empId);
        set({
          user,
          token,
          isAuthenticated: true,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("[auth] restoreSession error:", error);
      return false;
    }
  },

  logout: async () => {
    console.log("[auth] logout start");
    await AsyncStorage.multiRemove(["access_token", USER_KEY]);

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    console.log("[auth] logout done");
  },
}));
