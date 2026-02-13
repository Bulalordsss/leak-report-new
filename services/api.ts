import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const api = axios.create({
  baseURL: "https://dev-api.davao-water.gov.ph",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear session and redirect to login
      console.log('[API] Token expired or invalid, redirecting to login...');
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("@auth_user");
      router.replace("/login");
      // Return a never-resolving promise to silently stop the caller
      // (the user is being redirected, so no point propagating the error)
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);
