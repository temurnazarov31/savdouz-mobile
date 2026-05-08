import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import useRole from "../../hooks/useRole";
import { del, get, patch, post } from "../../services/api";
import useAuthStore from "../../store/authStore";

export default function Products() {
  const token = useAuthStore((state) => state.token);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [initialPrice, setInitialPrice] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateName, setUpdateName] = useState("");
  const [updateModel, setUpdateModel] = useState("");
  const [updateInitialPrice, setUpdateInitialPrice] = useState("");
  const [updateBulkPrice, setUpdateBulkPrice] = useState("");
  const [updateRetailPrice, setUpdateRetailPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrModal, setQrModal] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [updateBarcode, setUpdateBarcode] = useState("");
  const [barcodeScanModal, setBarcodeScanModal] = useState(false);
  const [scanTarget, setScanTarget] = useState(null); // 'create' or 'update'
  const [barcodeScanned, setBarcodeScanned] = useState(false);

  // Worker's permissions and role separation
  const { isOwner, role } = useRole();
  const isUser = role === "user";
  const { t } = useTranslation();

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await get("/products");
      if (data?.data?.products) {
        setProducts(data.data.products);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async () => {
    try {
      await post("/products", {
        name,
        model,
        pricing: {
          initialPrice: Number(initialPrice),
          bulkPrice: Number(bulkPrice),
          retailPrice: Number(retailPrice),
        },
        barcode: barcode || undefined,
      });
      setModalVisible(false);
      setName("");
      setModel("");
      setInitialPrice("");
      setBulkPrice("");
      setRetailPrice("");
      fetchProducts();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDeleteProduct = (id) => {
    Alert.alert(
      t("products.deleteProduct"),
      t("products.deleteProductConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await del(`/products/${id}`);
              setProducts((prev) => prev.filter((p) => p._id !== id));
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ],
    );
  };

  const handleOpenUpdate = (product) => {
    setSelectedProduct(product);
    setUpdateName(product.name);
    setUpdateModel(product.model);
    setUpdateInitialPrice(String(product.pricing?.initialPrice || ""));
    setUpdateBulkPrice(String(product.pricing?.bulkPrice || ""));
    setUpdateRetailPrice(String(product.pricing?.retailPrice || ""));
    setUpdateModalVisible(true);
    setUpdateBarcode(product.barcode || "");
  };

  const handleUpdateProduct = async () => {
    try {
      await patch(`/products/${selectedProduct._id}`, {
        name: updateName,
        model: updateModel,
        pricing: {
          initialPrice: Number(updateInitialPrice),
          bulkPrice: Number(updateBulkPrice),
          retailPrice: Number(updateRetailPrice),
        },
        barcode: updateBarcode || undefined,
      });
      setUpdateModalVisible(false);
      fetchProducts();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      const fileUri =
        (FileSystem.documentDirectory || FileSystem.cacheDirectory) +
        "barcodes.pdf";

      const response = await FileSystem.downloadAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/products/export-barcodes`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await Sharing.shareAsync(response.uri);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleExportSinglePDF = async (product) => {
    try {
      if (!product?._id) {
        Alert.alert("Error", t("products.notSelected"));
        return;
      }
      const fileUri =
        (FileSystem.documentDirectory || FileSystem.cacheDirectory) +
        `${product.name}-barcode.pdf`;
      const response = await FileSystem.downloadAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/products/${product._id}/export-barcode`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await Sharing.shareAsync(response.uri);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>Model: {item.model}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActions}
            onPress={() => {
              setSelectedQrProduct(item);
              setQrModal(true);
            }}
          >
            <Text style={styles.editText}>📷 QR</Text>
          </TouchableOpacity>
          {(isOwner || isUser) && (
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleOpenUpdate(item)}>
                <Text style={styles.editText}>{t("common.edit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteProduct(item._id)}>
                <Text style={styles.deleteText}>{t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <View style={styles.pricing}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{t("products.initialPrice")}</Text>
          <Text style={styles.priceValue}>
            {item.pricing?.initialPrice.toLocaleString()} UZS
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{t("transactions.bulk")}</Text>
          <Text style={styles.priceValue}>
            {item.pricing?.bulkPrice.toLocaleString()} UZS
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{t("transactions.retail")}</Text>
          <Text style={styles.priceValue}>
            {item.pricing?.retailPrice.toLocaleString()} UZS
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("products.title")}</Text>
        <TouchableOpacity onPress={handleExportPDF}>
          <Text style={{ color: Colors.primary, fontWeight: "600" }}>
            {t("products.exportPDF")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("products.searchProduct")}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {t("products.emptyProduct")}. {t("products.addOne")}!
            </Text>
          }
          refreshing={loading}
          onRefresh={fetchProducts}
        />
      )}

      {(isOwner || isUser) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabText}>+ {t("products.addProduct")}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={updateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {t("products.updateProduct")}
              </Text>

              <TextInput
                style={styles.input}
                placeholder={t("products.productName")}
                placeholderTextColor="#999"
                value={updateName}
                onChangeText={setUpdateName}
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.productModel")}
                placeholderTextColor="#999"
                value={updateModel}
                onChangeText={setUpdateModel}
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.initialPrice")}
                placeholderTextColor="#999"
                value={updateInitialPrice}
                onChangeText={setUpdateInitialPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.bulkPrice")}
                placeholderTextColor="#999"
                value={updateBulkPrice}
                onChangeText={setUpdateBulkPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.retailPrice")}
                placeholderTextColor="#999"
                value={updateRetailPrice}
                onChangeText={setUpdateRetailPrice}
                keyboardType="numeric"
              />

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={t("products.barcode")}
                  placeholderTextColor="#999"
                  value={updateBarcode}
                  onChangeText={setUpdateBarcode}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    { marginBottom: 0, paddingHorizontal: 16 },
                  ]}
                  onPress={() => {
                    setScanTarget("update");
                    setBarcodeScanModal(true);
                  }}
                >
                  <Text style={styles.buttonText}>📷 QR</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleUpdateProduct}
              >
                <Text style={styles.buttonText}>{t("common.update")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setUpdateModalVisible(false)}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{t("products.addProduct")}</Text>

              <TextInput
                style={styles.input}
                placeholder={t("products.productName")}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.productModel")}
                placeholderTextColor="#999"
                value={model}
                onChangeText={setModel}
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.initialPrice")}
                placeholderTextColor="#999"
                value={initialPrice}
                onChangeText={setInitialPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.bulkPrice")}
                placeholderTextColor="#999"
                value={bulkPrice}
                onChangeText={setBulkPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.retailPrice")}
                placeholderTextColor="#999"
                value={retailPrice}
                onChangeText={setRetailPrice}
                keyboardType="numeric"
              />
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder={t("products.barcode")}
                  placeholderTextColor="#999"
                  value={barcode}
                  onChangeText={setBarcode}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    { marginBottom: 0, paddingHorizontal: 16 },
                  ]}
                  onPress={() => {
                    setScanTarget("create");
                    setBarcodeScanModal(true);
                  }}
                >
                  <Text style={styles.buttonText}>📷 QR</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateProduct}
              >
                <Text style={styles.buttonText}>{t("common.create")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={qrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedQrProduct?.name}</Text>
            <Text style={{ color: Colors.textLight, marginBottom: 16 }}>
              {selectedQrProduct?.model}
            </Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={selectedQrProduct?._id || "empty"}
                size={200}
                color={Colors.text}
                backgroundColor={Colors.white}
              />
            </View>
            <Text
              style={{
                color: Colors.textLight,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t("products.qr")}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleExportSinglePDF(selectedQrProduct)}
            >
              <Text style={styles.buttonText}>
                🖨 {t("products.exportBarcode")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setQrModal(false)}
            >
              <Text style={styles.buttonText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={barcodeScanModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 20,
              paddingTop: 60,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
              {t("scanner.scanBarcode")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setBarcodeScanModal(false);
                setBarcodeScanned(false);
              }}
            >
              <Text
                style={{ color: Colors.error, fontWeight: "600", fontSize: 16 }}
              >
                ✕ {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            onBarcodeScanned={
              barcodeScanned
                ? undefined
                : ({ data }) => {
                    setBarcodeScanned(true);
                    if (scanTarget === "create") {
                      setBarcode(data);
                    } else {
                      setUpdateBarcode(data);
                    }
                    setBarcodeScanModal(false);
                    setBarcodeScanned(false);
                  }
            }
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "code128",
                "code39",
                "ean13",
                "ean8",
                "upc_a",
                "upc_e",
              ],
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  list: {
    padding: 16,
  },
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
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 14,
  },
  pricing: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  priceItem: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  loader: {
    flex: 1,
  },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
  },
  fabText: {
    color: Colors.white,
    fontWeight: "600",
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
    marginTop: 100,
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
  buttonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
  },
  cancelText: {
    color: Colors.textLight,
    fontSize: 16,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  editText: {
    color: Colors.primary,
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  qrBtn: {
    marginTop: 12,
    padding: 10,
    alignItems: "center",
  },
  qrBtnText: { color: Colors.primary, fontWeight: "600" },
  qrContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
  },
});
