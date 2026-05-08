import { Stack } from "expo-router";
import { useEffect } from "react";
import "../src/i18n";
import useAuthStore from "../store/authStore";

export default function RootLayout() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="store" />
      <Stack.Screen name="warehouse" />
      <Stack.Screen name="transaction" />
      <Stack.Screen name="delivery" />
      <Stack.Screen name="scanner" />
    </Stack>
  );
}
