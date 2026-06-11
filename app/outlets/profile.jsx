import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
// import useRole from "../../hooks/useRole";
import { useTranslation } from "react-i18next";
import { SkeletonBox } from "../../components/skeleton";
import useRole from "../../hooks/useRole";
import {
  clearCache,
  getCached,
  invalidateCache,
  patch,
} from "../../services/api";
import useAuthStore from "../../store/authStore";

export default function Profile() {
  const { logout } = useAuthStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password modal
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { t } = useTranslation();

  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [logoutModal, setLogoutModal] = useState(false);

  // Check user
  const {role, isOwner} = useRole();
  const isUser = role === "user";
  const isWorker = role === "worker"

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await getCached("/users/getMe");
      setUser(data.data.user);
      setName(data.data.user.name || "");
      setEmail(data.data.user.email || "");
      setPhone(data.data.user.phone || "");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, []),
  );

  const handleUpdateProfile = async () => {
    try {
      await patch("/users/updateMe", { name, email, phone });
      invalidateCache("/users/getMe");
      setEditModal(false);
      fetchUser();
      setSuccessMessage(t("profile.updatedSuccessfully"));
      setSuccessModal(true);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage(t("profile.passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t("auth.passwordShort"));
      return;
    }
    try {
      await patch("/users/updateMyPassword", {
        passwordCurrent: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });
      invalidateCache("/users/getMe");
      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(
        `${t("profile.passwordChanged")} ${t("profile.relogin")}`,
      );
      setSuccessModal(true);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleLogout = () => {
    clearCache();
    setLogoutModal(true);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header — always visible */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Feather name="log-out" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <>
          {/* Avatar skeleton */}
          <View style={[styles.avatarSection, { gap: 12 }]}>
            <SkeletonBox width={80} height={80} borderRadius={40} />
            <SkeletonBox width={140} height={20} />
            <SkeletonBox width={80} height={14} />
          </View>

          {/* Info card skeleton */}
          <View style={styles.section}>
            <SkeletonBox width={100} height={12} style={{ marginBottom: 8 }} />
            <View style={styles.infoCard}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.infoRow}>
                  <SkeletonBox width={60} height={14} />
                  <SkeletonBox width={120} height={14} />
                </View>
              ))}
            </View>
          </View>

          {/* Actions card skeleton */}
          <View style={styles.section}>
            <SkeletonBox width={80} height={12} style={{ marginBottom: 8 }} />
            <View style={styles.actionsCard}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.actionRow}>
                  <SkeletonBox width={160} height={16} />
                  <SkeletonBox width={20} height={20} />
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.username}</Text>
            {isUser && (<Text style={styles.userRole}>{t("profile.user")}</Text>)}
            {isOwner && (<Text style={styles.userRole}>{t("profile.owner")}</Text>)}
            {isWorker && (<Text style={styles.userRole}>{t("profile.worker")}</Text>)}
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.accountInfo")}</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("profile.name")}</Text>
                <Text style={styles.infoValue}>{user?.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("profile.email")}</Text>
                {user?.email ? (
                  <Text style={styles.infoValue}>{user.email}</Text>
                ) : (
                  <TouchableOpacity onPress={() => setEditModal(true)}>
                    <Text style={styles.addText}>
                      + {t("profile.addEmail")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("profile.phone")}</Text>
                {user?.phone ? (
                  <Text style={styles.infoValue}>{user.phone}</Text>
                ) : (
                  <TouchableOpacity onPress={() => setEditModal(true)}>
                    <Text style={styles.addText}>
                      + {t("profile.addPhone")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.settings")}</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => setEditModal(true)}
              >
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <MaterialCommunityIcons
                    name="account-edit-outline"
                    size={24}
                    color={Colors.primary}
                  />
                  <Text style={styles.actionText}>
                    {t("profile.editProfile")}
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => setPasswordModal(true)}
              >
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <MaterialIcons
                    name="password"
                    size={24}
                    color={Colors.primary}
                  />
                  <Text style={styles.actionText}>
                    {t("profile.changePassword")}
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              {isUser && (
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => router.push("/scanner")}
                >
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    <Ionicons
                      name="qr-code-outline"
                      size={24}
                      color={Colors.primary}
                    />
                    <Text style={styles.actionText}>
                      {t("profile.scanToJoin")}
                    </Text>
                  </View>
                  <Text style={styles.actionArrow}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </>
      )}
      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("profile.fullName")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder={t("profile.email")}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder={t("profile.phone")}
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.buttonText}>{t("common.save")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModal(false)}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Change Password Modal */}
      <Modal visible={passwordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("profile.changePassword")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("profile.currentPassword")}
              placeholderTextColor="#999"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder={t("profile.newPassword")}
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder={t("profile.confirmNewPassword")}
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}
            >
              <Text style={styles.buttonText}>
                {t("profile.changePassword")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModal(false)}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={Colors.success}
            />
            <Text style={styles.centeredTitle}>{t("common.success")}</Text>
            <Text style={styles.centeredSubtitle}>{successMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[
                  styles.centeredBtn,
                  { backgroundColor: Colors.success },
                ]}
                onPress={async () => {
                  setSuccessModal(false);
                  if (successMessage.includes(t("profile.passwordChanged"))) {
                    await logout();
                    router.replace("/(auth)/login");
                  }
                }}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>{t("common.errorTitle")}</Text>
            <Text style={styles.centeredSubtitle}>{errorMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={styles.centeredBtn}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirm Modal */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="log-out-outline" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>{t("profile.logout")}</Text>
            <Text style={styles.centeredSubtitle}>
              {t("profile.logoutConfirm")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <TouchableOpacity
                style={[styles.centeredBtn, { backgroundColor: "transparent" }]}
                onPress={() => setLogoutModal(false)}
              >
                <Text
                  style={[styles.centeredBtnText, { color: Colors.textLight }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.centeredBtn}
                onPress={async () => {
                  setLogoutModal(false);
                  await logout();
                  router.replace("/(auth)/login");
                }}
              >
                <Text style={styles.centeredBtnText}>
                  {t("profile.logout")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  avatarSection: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    borderColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textLight,
    textTransform: "capitalize",
  },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textLight,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  infoLabel: { fontSize: 14, color: Colors.textLight },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.text },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  actionText: { fontSize: 16, color: Colors.text },
  actionArrow: { fontSize: 20, color: Colors.textLight },
  logoutText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  cancelButton: { padding: 16, alignItems: "center" },
  cancelText: { color: Colors.textLight, fontSize: 16 },
  centeredOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
  },
  centeredModal: {
    width: "100%",
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  centeredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  centeredSubtitle: {
    fontSize: 17,
    color: Colors.text,
  },
  centeredBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.error,
    borderRadius: 12,
    marginTop: 12,
  },
  centeredBtnText: {
    color: Colors.white,
  },
});
