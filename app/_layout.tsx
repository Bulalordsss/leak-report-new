import { Stack, Redirect, usePathname } from "expo-router";
import { useAuthStore } from "../utils/authStore";

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();

  if (!isAuthenticated && pathname !== "/login") {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
