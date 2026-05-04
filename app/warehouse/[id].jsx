import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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
import QRCode from "react-native-qrcode-svg";
import Colors from "../../constants/colors";
// import useRole from "../../hooks/useRole";
import { del, get, patch, post } from "../../services/api";

export default function WarehouseDetail() {
  const { id } = useLocalSearchParams();
  const [warehouse, setWarehouse] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [name, setName] = useState("");

  // Add product modal
  const [addProductModal, setAddProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Invite modal
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteModal, setInviteModal] = useState(false);

  // Check ownership
  // const isOwner = useRole().isOwner;

  const fetchWarehouse = async () => {
    try {
      setLoading(true);
      const data = await get(`/warehouses/${id}`);
      setWarehouse(data.data.warehouse);
      setName(data.data.warehouse.name);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseProducts = async () => {
    try {
      const data = await get(`/warehouses/products/warehouse/${id}`);
      setProducts(data.data.whProduct || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const data = await get("/products");
      setAllProducts(data.data.products);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWarehouse();
      fetchWarehouseProducts();
      fetchAllProducts();
    }, []),
  );

  const handleUpdateWarehouse = async () => {
    try {
      await patch(`/warehouses/${id}`, { name });
      setEditModal(false);
      fetchWarehouse();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const data = await post(`/warehouses/${id}/invite`);
      setInviteToken(data.data.token);
      setInviteModal(true);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleRemoveWorker = (workerId, workerName) => {
    Alert.alert("Remove Worker", `Remove ${workerName} from warehouse?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await del(`/warehouses/${id}/workers/${workerId}`);
            fetchWarehouse();
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleAddProduct = async () => {
    if (!selectedProductId || !quantity) {
      Alert.alert("Error", "Please select product and enter quantity");
      return;
    }
    try {
      await post(`/warehouses/${id}/products`, {
        productId: selectedProductId,
        quantity: Number(quantity),
      });
      setAddProductModal(false);
      setSelectedProductId("");
      setQuantity("");
      setSearchQuery("");
      fetchWarehouseProducts();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleRemoveProduct = (productId, productName) => {
    Alert.alert("Remove Product", `Remove ${productName} from warehouse?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await del(`/warehouses/products/${productId}`);
            fetchWarehouseProducts();
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{warehouse?.name}</Text>
        <TouchableOpacity onPress={() => setEditModal(true)}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Delivery History Button */}
      <View style={styles.section}>
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            style={styles.deliveryBtn}
            onPress={() =>
              router.push({
                pathname: "/delivery/history",
                params: { outletId: id },
              })
            }
          >
            <Text style={styles.deliveryBtnText}>📦 Delivery History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deliveryBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push("/delivery/new")}
          >
            <Text style={[styles.deliveryBtnText, { color: Colors.white }]}>
              📦 New Delivery
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Workers ({warehouse?.workers?.length || 0})
          </Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/warehouse/${id}/requests`)}
            >
              <Text style={styles.actionBtnText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
              onPress={handleGenerateInvite}
            >
              <Text style={[styles.actionBtnText, { color: Colors.white }]}>
                + Invite
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {warehouse?.workers?.length === 0 ? (
          <Text style={styles.empty}>No workers yet</Text>
        ) : (
          warehouse?.workers?.map((worker) => (
            <View key={worker._id} style={styles.workerCard}>
              <View>
                <Text style={styles.workerName}>
                  {worker.user?.name || "Unknown"}
                </Text>
                <Text style={styles.workerEmail}>
                  {worker.user?.email || worker.user?.phone || ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  handleRemoveWorker(worker.user?._id, worker.user?.name)
                }
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Products ({products?.length || 0})
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => setAddProductModal(true)}
          >
            <Text style={[styles.actionBtnText, { color: Colors.white }]}>
              + Add
            </Text>
          </TouchableOpacity>
        </View>

        {products?.length === 0 ? (
          <Text style={styles.empty}>No products yet</Text>
        ) : (
          products?.map((item) => (
            <View key={item._id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productModel}>Model: {item.model}</Text>
                <Text style={styles.productStock}>
                  Stock: {item.quantity?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.productPrices}>
                <Text style={styles.priceText}>
                  Bulk: {item.pricing?.bulkPrice?.toLocaleString()}
                </Text>
                <Text style={styles.priceText}>
                  Retail: {item.pricing?.retailPrice?.toLocaleString()}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveProduct(item._id, item.name)}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
      {/* Edit Warehouse Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Warehouse</Text>
            <TextInput
              style={styles.input}
              placeholder="Warehouse Name"
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdateWarehouse}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Invite Token Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite Worker</Text>
            <Text style={styles.inviteLabel}>
              Worker scans this QR code to join:
            </Text>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <QRCode
                value={inviteToken || "empty"}
                size={200}
                color={Colors.text}
                backgroundColor={Colors.white}
              />
            </View>

            <Text style={styles.inviteNote}>Token expires after one scan</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setInviteModal(false)}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Add Product Modal */}
      <Modal visible={addProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Product to Warehouse</Text>
            <TextInput
              style={styles.input}
              placeholder="Search by name or model..."
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
              placeholder="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.button} onPress={handleAddProduct}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setAddProductModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  editText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  infoCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { fontSize: 14, color: Colors.textLight },
  section: { margin: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  sectionActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: Colors.text },
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
  workerEmail: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
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
  deliveryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deliveryBtnText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  empty: { textAlign: "center", color: Colors.textLight, marginTop: 12 },
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
    maxHeight: "80%",
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
  tokenBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  tokenText: { fontSize: 14, color: Colors.text, textAlign: "center" },
  inviteNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
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
  qrContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
  },
});
