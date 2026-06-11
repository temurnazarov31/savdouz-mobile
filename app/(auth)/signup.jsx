import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import useAuthStore from "../../store/authStore";
import { isValidEmail, isValidPhone } from "../../utils/validate";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const { signup, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getError = () => {
    if (!username) return t("auth.requiredUsername");
    if (!name) return t("auth.requiredName");
    if (email && !isValidEmail(email)) return t("auth.emailInvalid");
    if (phone && !isValidPhone(phone)) return t("auth.phoneInvalid");
    if (password.length < 8) return t("auth.passwordShort");
    if (password !== passwordConfirm) return t("auth.passwordMismatch");
    return null;
  };

  const handleSignup = async () => {
    setSubmitted(true);

    if (getError()) return;

    const success = await signup(
      username,
      name,
      surname,
      email,
      phone,
      password,
      passwordConfirm,
    );
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

        {submitted && getError() && (
          <Text style={styles.error}>{getError()}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder={t("auth.username")}
          placeholderTextColor="#999"
          value={username}
          onChangeText={(val) => {
            setUsername(val);
            setSubmitted(false);
          }}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder={t("auth.name")}
          placeholderTextColor="#999"
          value={name}
          onChangeText={(val) => {
            setName(val);
            setSubmitted(false);
          }}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.surname")}
          placeholderTextColor="#999"
          value={surname}
          onChangeText={(val) => {
            setSurname(val);
            setSubmitted(false);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t("auth.email")}
          placeholderTextColor="#999"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            setSubmitted(false);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder={t("auth.phone")}
          placeholderTextColor="#999"
          value={phone}
          onChangeText={(val) => {
            setPhone(val);
            setSubmitted(false);
          }}
          keyboardType="phone-pad"
        />

        <View style={styles.passwordInput}>
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: Colors.text,
            }}
            placeholder={t("auth.password")}
            placeholderTextColor="#999"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setSubmitted(false);
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

        <TextInput
          style={styles.input}
          placeholder={t("auth.confirmPassword")}
          placeholderTextColor="#999"
          value={passwordConfirm}
          onChangeText={(val) => {
            setPasswordConfirm(val);
            setSubmitted(false);
          }}
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
  passwordInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    padding: 6,
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
