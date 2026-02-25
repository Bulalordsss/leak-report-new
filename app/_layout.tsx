import { useEffect, useState } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../utils/authStore";

// Dynamically import notifications to handle Expo Go limitations
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  
  // Configure notification handler only if available
  // All foreground alerts/banners/sounds are suppressed — progress notifications
  // should only appear silently in the notification shade, not as pop-ups.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
} catch (error) {
  console.warn('[App] expo-notifications not available. Notifications disabled in Expo Go.');
}

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();

  // Allow access to splash screen and login without authentication check
  const publicRoutes = ['/screens/splashLoading', '/login', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Redirect to splash if not authenticated and not on a public route
  if (!isAuthenticated && !isPublicRoute) {
    return <Redirect href="/screens/splashLoading" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
