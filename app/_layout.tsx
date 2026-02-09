import { useEffect, useState } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../utils/authStore";
import { getToken } from "@/utils/tokenStorage";

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await getToken();
      setHasToken(!!token);
    } catch (error) {
      console.error('Error checking token:', error);
      setHasToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator while checking token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1f3a8a" />
      </View>
    );
  }

  // Redirect to login if not authenticated and no token, unless already on login page
  if (!isAuthenticated && !hasToken && pathname !== "/login") {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
