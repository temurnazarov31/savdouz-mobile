import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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
import Colors from "../constants/colors";
import { del, get, getCached, invalidateCache, post } from "../services/api";

export default function StorePage({
  store,
  isOwner,
  onDelete,
  addProductModal,
  setAddProductModal,
}) {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [removeProductModal, setRemoveProductModal] = useState(false);
  const [removeProductTarget, setRemoveProductTarget] = useState(null);
  const { t } = useTranslation();

  const fetchProducts = async () => {
    try {
      // ❌ don't cache — stock changes every sale/delivery
      const data = await get(`/outlets/products/${store?._id}`);
      const inventory = data.data?.products;
      setProducts(
        Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
      );
    } catch {}
  };

  const fetchAllProducts = async () => {
    try {
      const data = await getCached("/products");
      setAllProducts(data.data?.products || []);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchAllProducts();
    }, [store._id]),
  );

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddProduct = async () => {
    if (!selectedProductId || !quantity) {
      setErrorMessage(t("products.selectProductAndQuantity"));
      return;
    }
    try {
      await post(`/outlets/${store._id}/products`, {
        productId: selectedProductId,
        quantity: Number(quantity),
      });
      invalidateCache(
        `/outlets/products/${store._id}`,
        `/outlets?type=store`,
        `/outlets?type=warehouse`,
        `/outlets/my-outlet`,
      );
      setAddProductModal(false);
      setSelectedProductId("");
      setQuantity("");
      fetchProducts();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleRemoveProduct = (productId, productName) => {
    setRemoveProductTarget({ id: productId, name: productName });
    setRemoveProductModal(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Products */}
        <View style={styles.section}>
          {products.length === 0 ? (
            <Text style={styles.empty}>{t("products.noProducts")}</Text>
          ) : (
            products.map((item) => (
              <View key={item._id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productModel}>
                    {t("products.productModel")}: {item.model}
                  </Text>
                  <Text style={styles.productStock}>
                    {t("products.inStock")}: {item.quantity?.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.productPrices}>
                  <Text style={styles.priceText}>
                    {t("transactions.bulk")}:{" "}
                    {item.pricing?.wholesalePrice?.toLocaleString()}
                  </Text>
                  <Text style={styles.priceText}>
                    {t("transactions.retail")}:{" "}
                    {item.pricing?.retailPrice?.toLocaleString()}
                  </Text>
                  {isOwner && (
                    <TouchableOpacity
                      onPress={() =>
                        handleRemoveProduct(item.product?._id, item.name)
                      }
                    >
                      <Text style={styles.removeText}>
                        {t("common.remove")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("workers.inviteWorker")}</Text>
            <Text style={styles.inviteLabel}>{t("workers.inviteQR")}:</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={inviteToken || "empty"}
                size={200}
                color={Colors.text}
                backgroundColor={Colors.white}
              />
            </View>
            <Text style={styles.inviteNote}>{t("workers.QRExpires")}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setInviteModal(false)}
            >
              <Text style={styles.buttonText}>{t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={addProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>
              {t("stores.addProductToStore")}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t("products.searchProduct")}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView style={{ maxHeight: 200 }}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={[
                    styles.selectItem,
                    selectedProductId === p._id && styles.selectItemActive,
                  ]}
                  onPress={() => setSelectedProductId(p._id)}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      selectedProductId === p._id &&
                        styles.selectItemTextActive,
                    ]}
                  >
                    {p.name} — {p.model}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder={t("common.quantity")}
              placeholderTextColor="#999"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={handleAddProduct}>
              <Text style={styles.buttonText}>{t("common.add")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setAddProductModal(false)}
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

      {/* Remove Product Modal */}
      <Modal visible={removeProductModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="warning" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>
              {removeProductTarget?.name}
            </Text>
            <Text style={styles.centeredSubtitle}>
              {t("products.deleteProductConfirm")}
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
                onPress={() => setRemoveProductModal(false)}
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
                  try {
                    await del(`/outlets/product/${removeProductTarget.id}`);
                    invalidateCache(`/outlets/products/${store._id}`);
                    setRemoveProductModal(false);
                    fetchProducts();
                  } catch (err) {
                    setRemoveProductModal(false);
                    setErrorMessage(err.message);
                  }
                }}
              >
                <Text style={styles.centeredBtnText}>{t("common.remove")}</Text>
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
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: { color: Colors.white, fontWeight: "600" },
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
  page: { flex: 1, marginTop: 14 },
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
  storeStats: { flexDirection: "row", alignItems: "center" },
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
    paddingHorizontal: 16,
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
