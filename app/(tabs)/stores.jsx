import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import QRCode from "react-native-qrcode-svg";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { del, get, patch, post } from "../../services/api";

function StorePage({ store, isOwner, onDelete }) {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [addProductModal, setAddProductModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [name, setName] = useState(store.name);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const fetchProducts = () => {
    get(`/stores/products/${store._id}`)
      .then((data) => {
        const inventory = data.data.inventory;
        setProducts(
          Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
        );
      })
      .catch(() => {});
  };

  const fetchAllProducts = () => {
    get("/products")
      .then((data) => setAllProducts(data.data.products))
      .catch(() => {});
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

  const handleUpdateStore = async () => {
    try {
      await patch(`/stores/${store._id}`, { name });
      setEditModal(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const data = await post(`/stores/${store._id}/invite`);
      setInviteToken(data.data.token);
      setInviteModal(true);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleRemoveWorker = (workerId, workerName) => {
    Alert.alert(`${workerName}`, `${"workers.deleteWorkerConfirm"}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await del(`/stores/${store._id}/workers/${workerId}`);
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleAddProduct = async () => {
    if (!selectedProductId || !quantity) {
      Alert.alert(
        t("common.errorTitle"),
        t("products.selectProductAndQuantity"),
      );
      return;
    }
    try {
      await post(`/stores/${store._id}/products`, {
        productId: selectedProductId,
        quantity: Number(quantity),
      });
      setAddProductModal(false);
      setSelectedProductId("");
      setQuantity("");
      fetchProducts();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleRemoveProduct = (productId, productName) => {
    Alert.alert(`${productName}`, `${t("products.deleteProductConfirm")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          try {
            await del(`/stores/products/${productId}`);
            fetchProducts();
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.page}>
      {/* Store Header */}
      <View style={styles.storeHeader}>
        <View style={styles.storeHeaderRow}>
          <Text style={styles.storeName}>{store.name}</Text>
          {isOwner && (
            <TouchableOpacity onPress={() => setEditModal(true)}>
              <Text style={styles.editText}>{t("common.edit")}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.storeStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{store.workers?.length || 0}</Text>
            <Text style={styles.statLabel}>{t("stores.storeWorkers")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{products?.length || 0}</Text>
            <Text style={styles.statLabel}>{t("stores.storeProducts")}</Text>
          </View>
        </View>
      </View>

      {/* Delivery */}
      <View style={styles.section}>
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push({
                pathname: "/delivery/history",
                params: { outletId: store._id },
              })
            }
          >
            <Text style={styles.actionBtnText}>
              📦 {t("delivery.historyTitle")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push("/delivery/new")}
          >
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>
              📦 {t("delivery.title")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workers */}
      {isOwner && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("stores.storeWorkers")} ({store?.workers?.length || 0})
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => router.push(`/store/${store._id}/requests`)}
              >
                <Text style={styles.smallBtnText}>{t("workers.requests")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                onPress={handleGenerateInvite}
              >
                <Text style={[styles.smallBtnText, { color: Colors.white }]}>
                  + {t("workers.invite")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {store?.workers?.length === 0 ? (
            <Text style={styles.empty}>{t("workers.empty")}</Text>
          ) : (
            store?.workers?.map((worker) => (
              <View key={worker._id} style={styles.workerCard}>
                <Text style={styles.workerName}>
                  {worker.name || "Unknown"}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveWorker(worker.user, worker.name)}
                >
                  <Text style={styles.removeText}>{t("common.remove")}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t("products.title")} ({products.length})
          </Text>
          {isOwner && (
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setAddProductModal(true)}
            >
              <Text style={[styles.smallBtnText, { color: Colors.white }]}>
                + {t("common.add")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {products.length === 0 ? (
          <Text style={styles.empty}>{t("products.noProducts")}</Text>
        ) : (
          products.map((item) => (
            <View key={item._id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productModel}>Model: {item.model}</Text>
                <Text style={styles.productStock}>
                  {t("products.inStock")}: {item.quantity?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.productPrices}>
                <Text style={styles.priceText}>
                  {t("transactions.bulk")}:{" "}
                  {item.pricing?.bulkPrice?.toLocaleString()}
                </Text>
                <Text style={styles.priceText}>
                  {t("transactions.retail")}:{" "}
                  {item.pricing?.retailPrice?.toLocaleString()}
                </Text>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => handleRemoveProduct(item.product, item.name)}
                  >
                    <Text style={styles.removeText}>{t("common.remove")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />

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
    </ScrollView>
  );
}

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  // const { isOwner, role } = useRole();
  const pagerRef = useRef(null);
  // worker permissions
  const { isOwner, role } = useRole();
  const isWorker = role === "worker";
  const isUser = role === "user";

  const { t } = useTranslation();

  const fetchStores = async () => {
    try {
      setLoading(true);
      // In fetchStores:
      if (isWorker) {
        const data = await get("/stores/my-store").catch(() => null);
        const store = data?.data?.store;
        if (store) setStores([store]);
        return;
      }

      const data = await get("/stores");
      setStores(data?.data?.stores);
    } catch (err) {
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (role === null) return;
      fetchStores();
    }, []),
  );

  const handleCreateStore = async () => {
    if (!name) {
      Alert.alert(t("common.errorTitle"), t("stores.invalidName"));
      return;
    }
    try {
      await post("/stores", { name });
      setModalVisible(false);
      setName("");
      fetchStores();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeleteStore = (id, storeName) => {
    Alert.alert(
      t("stores.deleteStore"),
      t("stores.deleteStoreConfirm", { name: storeName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await del(`/stores/${id}`);
              pagerRef.current?.setPage(0);
              setCurrentPage(0);
              fetchStores();
            } catch (err) {
              Alert.alert(t("stores.error"), err.message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {stores[currentPage]?.name || "Stores"}
        </Text>
        {(isOwner || isUser) && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addButtonText}>+ {t("common.add")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: Colors.error }]}
              onPress={() => {
                const current = stores[currentPage];
                if (current) handleDeleteStore(current._id, current.name);
              }}
            >
              <Text style={[styles.addButtonText]}>{t("common.delete")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Store Name Tabs */}
      {stores.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsContent}
        >
          {stores.map((store, i) => (
            <TouchableOpacity
              key={store._id}
              style={[styles.tab, i === currentPage && styles.tabActive]}
              onPress={() => pagerRef.current?.setPage(i)}
            >
              <Text
                style={[
                  styles.tabText,
                  i === currentPage && styles.tabTextActive,
                ]}
              >
                {store.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Pager */}
      {stores.length === 0 ? (
        <Text style={styles.empty}>
          {isOwner || isUser
            ? `${t("stores.noStores")}. ${t("products.addOne")}`
            : t("workers.notAttachedToStore")}
        </Text>
      ) : (
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {stores.map((store) => (
            <View key={store._id}>
              <StorePage
                store={store}
                isOwner={isOwner}
                onDelete={handleDeleteStore}
              />
            </View>
          ))}
        </PagerView>
      )}

      {/* Create Store Modal */}
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
});
