import { useEffect, useState } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../utils/authStore";

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
