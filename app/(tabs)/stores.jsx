import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Dropdown from "../../components/dropdown";
import { SkeletonList } from "../../components/skeleton";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, getCached, invalidateCache, post } from "../../services/api";

export default function StoreDetail() {
  const [outlets, setOutlets] = useState([]);
  const [type, setType] = useState("store");
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  // worker permissions
  const { isOwner, role } = useRole();
  const isWorker = role === "worker";
  const isUser = role === "user";

  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [totalLowStock, setTotalLowStock] = useState(0);

  const { t } = useTranslation();

  const fetchOutlets = async (outletType) => {
    try {
      setLoading(true);

      if (isWorker) {
        const data = await getCached("/outlets/my-outlet");
        const workerOutlet = data?.data?.outlet;
        setOutlets(workerOutlet ? [workerOutlet] : []);
        return;
      }

      const data = await getCached(`/outlets?type=${outletType}`);
      const outletList = data.data?.outlets || [];
      setOutlets(outletList);

      const counts = await Promise.all(
        outletList.map((outlet) =>
          get(`/outlets/${outlet._id}/low-stock?threshold=5`)
            .then((res) => res.data?.results || 0)
            .catch(() => 0),
        ),
      );
      setTotalLowStock(counts.reduce((sum, c) => sum + c, 0));
    } catch (err) {
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (role === null) return;
      fetchOutlets(type);
    }, [type, role]),
  );

  const handleCreateStore = async () => {
    if (!name) {
      setErrorMessage(t("stores.invalidName"));
      return;
    }
    try {
      await post("/outlets", { name, type });
      invalidateCache(`/outlets?type=${type}`);
      setModalVisible(false);
      setName("");
      setSuccessModal(true);
      fetchOutlets(type);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("stores.title")}</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          {!isUser && (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity
                style={{ position: "relative" }}
                onPress={() => router.push("/outlets/restock")}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={Colors.warning}
                />
                {totalLowStock > 0 && <View style={styles.redDot} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/outlets/worker")}>
                <Ionicons name="stats-chart" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          {(isOwner || isUser) && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="store-plus-outline"
                size={28}
                color={Colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isWorker ? (
        <View style={styles.section}>
          <Dropdown
            options={[
              { label: t("stores.store"), value: "store" },
              { label: t("warehouse.warehouse"), value: "warehouse" },
            ]}
            selected={type}
            onSelect={setType}
            placeholder={t("common.selectType")}
            selector={styles.selector}
          />
        </View>
      ) : (
        <View style={{height: 20}}></View>
      )}
      
      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <SkeletonList count={5} type="outlet" />
        </View>
      ) : (
        <FlatList
          data={outlets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.section}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isOwner || isUser
                ? `${t("stores.noStores")}. ${t("products.addOne")}`
                : t("workers.notAttachedToStore")}
            </Text>
          }
          renderItem={({ item: outlet }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/outlets/${outlet._id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{outlet.name}</Text>
              </View>
              <View style={styles.storeInfo}>
                <View style={{ flexDirection: "column", alignItems: "center" }}>
                  <Feather
                    name="users"
                    size={24}
                    color={Colors.primary}
                    style={{ paddingHorizontal: 18 }}
                  />
                  <Text style={styles.storeStats}>
                    {outlet.workers?.length || 0} {t("workers.title")}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", alignItems: "center" }}>
                  <Feather
                    name="box"
                    size={24}
                    color={Colors.primary}
                    style={{ paddingHorizontal: 22 }}
                  />
                  <Text style={styles.storeStats}>
                    {outlet.productsCount || 0} {t("products.title")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modals unchanged */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("stores.createStore")} </Text>
            <TextInput
              style={styles.input}
              placeholder={t("stores.storeName")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity style={styles.button} onPress={handleCreateStore}>
              <Text style={styles.buttonText}>{t("common.create")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  addButtonText: { color: Colors.white, fontWeight: "600" },
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  tabs: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 44,
  },
  tabsContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 4,
  },
  tabActive: {
    backgroundColor: Colors.primary + "20",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  page: { flex: 1 },
  storeHeader: {
    backgroundColor: Colors.white,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  storeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  editText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  storeStats: { textTransform: "lowercase", color: Colors.text, fontSize: 16 },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 20, fontWeight: "bold", color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 16 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallBtnText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  workerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workerName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  productModel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  productStock: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  productPrices: { alignItems: "flex-end", gap: 4 },
  priceText: { fontSize: 12, color: Colors.textLight },
  removeText: { color: Colors.error, fontSize: 13, marginTop: 4 },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  cancelButton: { padding: 16, alignItems: "center" },
  cancelText: { color: Colors.textLight, fontSize: 16 },
  inviteLabel: { fontSize: 14, color: Colors.textLight, marginBottom: 12 },
  inviteNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  selectItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectItemText: { color: Colors.text, fontSize: 14 },
  selectItemTextActive: { color: Colors.white },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 7,
  },
  storeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  centeredOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
  },
  centeredModal: {
    width: "100%",
    alignItems: "center",
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
