import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import Colors from "../constants/colors";
import useAuthStore from "../store/authStore";

export default function Index() {
  const { user, token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user && token) {
    return <Redirect href="/(tabs)/reports" />;
  }

  return <Redirect href="/(auth)/login" />;
}
