import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SkeletonList } from "../../components/skeleton";
import StorePage from "../../components/storePage";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import {
  del,
  getCached,
  invalidateCache,
  patch,
  post,
} from "../../services/api";

export default function StoreDetail() {
  const { id } = useLocalSearchParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [name, setName] = useState();
  const { isOwner } = useRole();
  const [errorMessage, setErrorMessage] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [workersModal, setWorkersModal] = useState(false);

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  const [addProductModal, setAddProductModal] = useState(false);

  const { t } = useTranslation();

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const data = await getCached(`/outlets/${id}`);
      setStore(data?.data?.outlet);
      setName(data?.data?.outlet?.name);
    } catch (err) {
      setErrorMessage(err.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchStoreData();
      }
    }, [id]),
  );

  const handleUpdateStore = async () => {
    try {
      await patch(`/outlets/${id}`, { name });
      // Invalidate outlet cache + list caches
      invalidateCache(
        `/outlets/${id}`,
        "/outlets?type=store",
        "/outlets?type=warehouse",
        "/outlets/",
      );
      setEditModal(false);
      fetchStoreData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteStore = () => {
    setDeleteModal(true);
  };

  if (!store) return null;

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Delete Option */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {store.name}
        </Text>
        {isOwner && (
          <View style={styles.storeHeaderRow}>
            <TouchableOpacity
              onPress={() => router.push(`/outlets/${id}/stats`)}
            >
              <Ionicons
                name="bar-chart-outline"
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWorkersModal(true)}
              style={{ position: "relative" }}
            >
              <MaterialIcons
                name="people-outline"
                size={28}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditModal(true)}>
              <MaterialCommunityIcons
                name="square-edit-outline"
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteStore}>
              <MaterialCommunityIcons
                name="delete"
                size={24}
                color={Colors.error}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={7} type="product" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <StorePage
            store={store}
            isOwner={isOwner}
            onDelete={handleDeleteStore}
            addProductModal={addProductModal}
            setAddProductModal={setAddProductModal}
          />
        </View>
      )}
      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("stores.editStore")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("stores.storeName")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdateStore}>
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
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[
                  styles.centeredBtn,
                  { backgroundColor: Colors.success },
                ]}
                onPress={() => setSuccessModal(false)}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="warning" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>{t("stores.deleteStore")}</Text>
            <Text style={styles.centeredSubtitle}>
              {t("stores.deleteStoreConfirm", { name: store.name })}
            </Text>
            <Text
              style={[styles.centeredSubtitle, { fontSize: 13, marginTop: 4 }]}
            >
              {t("stores.typeToConfirm")}{" "}
              <Text style={{ fontWeight: "700", color: Colors.error }}>
                {store.name}
              </Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={store.name}
              placeholderTextColor="#999"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <TouchableOpacity
                style={[styles.centeredBtn, { backgroundColor: "transparent" }]}
                onPress={() => {
                  setDeleteModal(false);
                  setDeleteConfirmText("");
                }}
              >
                <Text
                  style={[styles.centeredBtnText, { color: Colors.textLight }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.centeredBtn,
                  deleteConfirmText !== store.name && { opacity: 0.4 },
                ]}
                disabled={deleteConfirmText !== store.name}
                onPress={async () => {
                  try {
                    await del(`/outlets/${store._id}`);
                    setDeleteModal(false);
                    setDeleteConfirmText("");
                    invalidateCache(
                      `/outlets/${id}`,
                      "/outlets?type=store",
                      "/outlets?type=warehouse",
                      "/outlets/",
                    );
                    router.replace("/stores");
                  } catch (err) {
                    setDeleteModal(false);
                    setDeleteConfirmText("");
                    setErrorMessage(err.message);
                  }
                }}
              >
                <Text style={styles.centeredBtnText}>{t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workers Modal */}
      <Modal visible={workersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={styles.modalTitle}>
                {t("stores.storeWorkers")} ({store?.workers?.length || 0})
              </Text>
              <TouchableOpacity onPress={() => setWorkersModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {store?.workers?.length === 0 ? (
              <Text
                style={{
                  textAlign: "center",
                  color: Colors.textLight,
                  marginVertical: 20,
                }}
              >
                {t("workers.empty")}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {store?.workers?.map((worker) => (
                  <View key={worker._id} style={styles.workerRow}>
                    <View style={styles.workerAvatar}>
                      <Text style={styles.workerAvatarText}>
                        {worker.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <Text style={styles.workerName}>
                      {worker.name || t("common.unknown")}
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await del(
                            `/outlets/${store._id}/workers/${worker.user}`,
                          );
                          fetchStoreData();
                        } catch (err) {
                          setWorkersModal(false);
                          setErrorMessage(err.message);
                        }
                      }}
                    >
                      <Ionicons
                        name="person-remove-outline"
                        size={20}
                        color={Colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: "row", marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.button, { flex: 1 }]}
                onPress={async () => {
                  try {
                    const data = await post(`/outlets/${store._id}/invite`);
                    setWorkersModal(false);
                    setInviteToken(data.data.token);
                    setInviteModal(true);
                  } catch (err) {
                    setErrorMessage(err.message);
                  }
                }}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.buttonText}>
                  {t("workers.inviteWorker")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite QR Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("workers.inviteWorker")}</Text>
            <View
              style={{
                alignItems: "center",
                padding: 24,
                backgroundColor: Colors.white,
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <QRCode
                value={inviteToken || "empty"}
                size={200}
                color={Colors.text}
                backgroundColor={Colors.white}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textLight,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t("workers.QRExpires")}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setInviteModal(false)}
            >
              <Text style={styles.buttonText}>{t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isOwner && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddProductModal(true)}
        >
          <MaterialCommunityIcons
            name="package-variant-closed-plus"
            size={20}
            color={Colors.white}
          />
          <Text style={styles.fabText}>{t("products.addProduct")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    maxWidth: "60%",
    flex: 1,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  cancelButton: { padding: 16, alignItems: "center" },
  cancelText: { color: Colors.textLight, fontSize: 16 },
  storeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  editText: { color: Colors.primary, fontSize: 14, fontWeight: "400" },
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
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  workerAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  workerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  requestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  requestBannerText: {
    flex: 1,
    color: Colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 80,
    right: 14,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
