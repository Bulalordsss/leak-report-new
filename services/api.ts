import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Network from "expo-network";

export const api = axios.create({
  baseURL: "https://dev-api.davao-water.gov.ph",
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    // Check network connectivity before making request
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.warn('[API] No internet connection detected');
        return Promise.reject(new Error('No internet connection. Please check your network settings.'));
      }
    } catch (netError) {
      // If we can't check network status, continue anyway
      console.warn('[API] Could not check network status:', netError);
    }

    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      console.log('[API] Token expired or invalid, redirecting to login...');
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("@auth_user");
      router.replace("/login");
      return new Promise(() => {});
    }

    // Enhanced error logging for debugging
    if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout - server took too long to respond');
      error.message = 'Request timeout. The server took too long to respond. Please try again.';
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('[API] Network error - cannot reach server');
      error.message = 'Network error. Cannot reach the server. Please check your internet connection.';
    } else if (!error.response) {
      console.error('[API] No response from server:', error.message);
      error.message = error.message || 'Unable to connect to the server. Please check your internet connection.';
    } else {
      console.error('[API] Server error:', error.response?.status, error.response?.data);
    }

    return Promise.reject(error);
  }
);
