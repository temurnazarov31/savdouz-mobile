import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Colors from "../../constants/colors";
import useAuthStore from "../../store/authStore";
import { isValidEmail, isValidPhone } from "../../utils/validate";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const { signup, isLoading, error } = useAuthStore();
  const { t } = useTranslation();

  const handleSignup = async () => {
    if (!name) {
      Alert.alert("Error", t("auth.requiredName"));
      return;
    }
    if (!email && !phone) {
      Alert.alert("Error", t("auth.required"));
      return;
    }
    if (email && !isValidEmail(email)) {
      Alert.alert("Error", t("auth.emailInvalid"));
      return;
    }
    if (phone && !isValidPhone(phone)) {
      Alert.alert("Error", t("auth.phoneInvalid"));
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", t("auth.passwordShort"));
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert("Error", t("auth.passwordMismatch"));
      return;
    }
    const success = await signup(name, email, phone, password, passwordConfirm);
    if (success) router.replace("/(tabs)/reports");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>SavdoUz</Text>
        <Text style={styles.subtitle}>{t("auth.signupTitle")}</Text>

        {error && <Text style={styles.error}>{t("auth.invalidInput")}</Text>}

        <TextInput
          style={styles.input}
          placeholder={t("auth.name")}
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.email")}
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.phone")}
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.password")}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.confirmPassword")}
          placeholderTextColor="#999"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.signup")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.link}>{t("auth.oldUser")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: Colors.error,
    textAlign: "center",
    marginBottom: 16,
  },
  link: {
    color: Colors.primary,
    textAlign: "center",
    fontSize: 14,
  },
});
