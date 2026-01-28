import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginRequest } from "../services/authService";
import { BackendUser } from "../utils/auth";

interface AuthState {
  user: BackendUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

      const { token, ...user } = res?.data || ({} as any);
      console.log("[auth] extracted", { token, user });

      if (!token) {
        console.log("[auth] missing token in response");
        throw new Error("Missing token");
      }

      // Save token if you want session persistence in future
      await AsyncStorage.setItem("access_token", token);

      set({
        user: user as BackendUser,
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

  logout: async () => {
    console.log("[auth] logout start");
    await AsyncStorage.removeItem("access_token");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    console.log("[auth] logout done");
  },
}));
