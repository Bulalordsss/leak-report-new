import { useEffect, useState } from "react";
import { Stack, Redirect, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../utils/authStore";

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Show loading indicator while checking token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1f3a8a" />
      </View>
    );
  }

  // Redirect to login if not authenticated, unless already on login page
  if (!isAuthenticated && pathname !== "/login") {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
