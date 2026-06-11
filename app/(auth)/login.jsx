import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import useAuthStore from "../../store/authStore";

export default function Login() {
  const [loginInput, setLoginIput] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const getError = () => {
    if (!loginInput) {
      return t("auth.required");
    }
    const isPhone = loginInput.startsWith("+") || /^\d+$/.test(loginInput);
    const isEmail = loginInput.includes("@");
    if (!isPhone && !isEmail && loginInput.trim().length < 3) {
      return t("auth.validLoginInput");
    }
    if (!password) {
      return t("auth.requiredPassword");
    }
    if (password.length < 8) {
      return t("auth.passwordShort");
    }
    if (loginError) {
      return t("auth.invalidCredentials");
    }
    return null;
  };

  const handleLogin = async () => {
    setSubmitted(true);

    if (getError()) return;

    const success = await login(loginInput, password);
    setLoginError(true);
    if (success) router.replace("/(tabs)/reports");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>SavdoUz</Text>
        <Text style={styles.subtitle}>{t("auth.loginTitle")}</Text>

        {submitted && getError() ? (
          <Text style={styles.error}>{getError()}</Text>
        ) : (
          submitted && <Text style={styles.error}>{error}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder={t("auth.loginInput")}
          placeholderTextColor="#999"
          value={loginInput}
          onChangeText={(val) => {
            setLoginIput(val);
            setSubmitted(false);
            setLoginError(false);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordInput}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: Colors.white,
              fontSize: 16,
              color: Colors.text,
            }}
            placeholder={t("auth.password")}
            placeholderTextColor="#999"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setSubmitted(false);
              setLoginError(false);
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#5d7ba5"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.login")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.link}>{t("auth.newUser")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
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
  passwordInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    paddingHorizontal: 14,
    padding: 8,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 16,
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
