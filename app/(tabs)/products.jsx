import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
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
import { SkeletonList } from "../../components/skeleton";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import {
  del,
  getCached,
  invalidateCache,
  patch,
  post,
} from "../../services/api";
import useAuthStore from "../../store/authStore";

export default function Products() {
  const token = useAuthStore((state) => state.token);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [updateName, setUpdateName] = useState("");
  const [updateModel, setUpdateModel] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState("");
  const [updateWholesalePrice, setUpdateWholesalePrice] = useState("");
  const [updateRetailPrice, setUpdateRetailPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrModal, setQrModal] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [updateBarcode, setUpdateBarcode] = useState("");
  const [barcodeScanModal, setBarcodeScanModal] = useState(false);
  const [scanTarget, setScanTarget] = useState(null);
  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [brand, setBrand] = useState("");
  const [updateBrand, setUpdateBrand] = useState("");

  // Modal states
  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

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
      const data = await getCached("/products"); // ✅ cache
      if (data?.data?.products) {
        setProducts(data.data.products);
      }
    } catch (err) {
      setErrorMessage(err.message);
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
        brand: brand || undefined,
        pricing: {
          costPrice: Number(costPrice),
          wholesalePrice: Number(wholesalePrice),
          retailPrice: Number(retailPrice),
        },
        barcode: barcode || undefined,
      });
      invalidateCache("/products"); // ✅ clear cache
      setModalVisible(false);
      setName("");
      setModel("");
      setCostPrice("");
      setWholesalePrice("");
      setRetailPrice("");
      setBarcode("");
      setBrand("");
      setSuccessModal(true);
      fetchProducts(); // refetch fresh
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleOpenUpdate = (product) => {
    setSelectedProduct(product);
    setUpdateName(product.name);
    setUpdateModel(product.model);
    setUpdateCostPrice(String(product.pricing?.costPrice || ""));
    setUpdateWholesalePrice(String(product.pricing?.wholesalePrice || ""));
    setUpdateRetailPrice(String(product.pricing?.retailPrice || ""));
    setUpdateModalVisible(true);
    setUpdateBarcode(product.barcode || "");
    setUpdateBrand(product.brand || "");
  };

  const handleUpdateProduct = async () => {
    try {
      await patch(`/products/${selectedProduct._id}`, {
        name: updateName,
        model: updateModel,
        brand: updateBrand || undefined,
        pricing: {
          costPrice: Number(updateCostPrice),
          wholesalePrice: Number(updateWholesalePrice),
          retailPrice: Number(updateRetailPrice),
        },
        barcode: updateBarcode || undefined,
      });
      invalidateCache("/products"); // ✅ clear cache
      setUpdateModalVisible(false);
      setSuccessModal(true);
      fetchProducts(); // refetch fresh
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteProduct = (id) => {
    setDeleteTargetId(id);
    setDeleteModal(true);
  };

  const handleExportPDF = async () => {
    try {
      const fileUri =
        (FileSystem.documentDirectory || FileSystem.cacheDirectory) +
        "barcodes.pdf";
      const response = await FileSystem.downloadAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/products/export-barcodes`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await Sharing.shareAsync(response.uri);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleExportSinglePDF = async (product) => {
    try {
      if (!product?._id) {
        setErrorMessage(t("products.notSelected"));
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
      setErrorMessage(err.message);
    }
  };

  const generateBarcode = () => {
    // EAN-13 format: 12 random digits + check digit
    const digits = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 10),
    );
    const checkDigit =
      (10 -
        (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) %
          10)) %
      10;
    return [...digits, checkDigit].join("");
  };

  const renderProduct = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>Model: {item.model}</Text>
          {item.brand && <Text style={styles.cardSubtitle}>{item.brand}</Text>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActions}
            onPress={() => {
              setSelectedQrProduct(item);
              setQrModal(true);
            }}
          >
            <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          {(isOwner || isUser) && (
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleOpenUpdate(item)}>
                <MaterialCommunityIcons
                  name="square-edit-outline"
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteProduct(item._id)}>
                <MaterialCommunityIcons
                  name="delete"
                  size={20}
                  color={Colors.error}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <View style={styles.pricing}>
        {isOwner && (
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>{t("products.initialPrice")}</Text>
            <Text style={styles.priceValue}>
              {item.pricing?.costPrice.toLocaleString()}
            </Text>
          </View>
        )}
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{t("transactions.bulk")}</Text>
          <Text style={styles.priceValue}>
            {item.pricing?.wholesalePrice.toLocaleString()}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{t("transactions.retail")}</Text>
          <Text style={styles.priceValue}>
            {item.pricing?.retailPrice.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("products.title")}</Text>
        {isOwner && (
          <TouchableOpacity
            onPress={handleExportPDF}
            style={{ flexDirection: "row", gap: 4 }}
          >
            <Text style={{ color: Colors.primary, fontWeight: "600" }}>
              PDF
            </Text>
            <MaterialCommunityIcons
              name="export-variant"
              size={17}
              color={Colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={24}
          color="#999"
          style={{ marginTop: 10 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t("products.searchProduct")}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={6} type="product" />
        </View>
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
          <Ionicons name="add" color={Colors.white} style={{ fontSize: 20 }} />
          <Text style={styles.fabText}>{t("products.addProduct")}</Text>
        </TouchableOpacity>
      )}

      {/* Update Modal */}
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
                placeholder={t("products.brand") || "Brand"}
                placeholderTextColor="#999"
                value={updateBrand}
                onChangeText={setUpdateBrand}
                autoCapitalize="characters"
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
                value={updateCostPrice}
                onChangeText={setUpdateCostPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.bulkPrice")}
                placeholderTextColor="#999"
                value={updateWholesalePrice}
                onChangeText={setUpdateWholesalePrice}
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
                  style={styles.barcodeInput}
                  placeholder={t("products.barcode")}
                  placeholderTextColor="#999"
                  value={updateBarcode}
                  onChangeText={setUpdateBarcode}
                />
                {/* Generate button — only show when no barcode */}
                {!updateBarcode && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        marginBottom: 0,
                        paddingHorizontal: 16,
                        backgroundColor: Colors.success,
                      },
                    ]}
                    onPress={() => setUpdateBarcode(generateBarcode())}
                  >
                    <MaterialCommunityIcons
                      name="barcode"
                      size={24}
                      color={Colors.white}
                    />
                  </TouchableOpacity>
                )}
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
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    color={Colors.white}
                  />
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

      {/* Create Modal */}
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
                placeholder={t("products.brand") || "Brand"}
                placeholderTextColor="#999"
                value={brand}
                onChangeText={setBrand}
                autoCapitalize="characters"
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
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder={t("products.bulkPrice")}
                placeholderTextColor="#999"
                value={wholesalePrice}
                onChangeText={setWholesalePrice}
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
                {/* Generate button — only show when no barcode */}
                {!barcode && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        marginBottom: 0,
                        paddingHorizontal: 16,
                        backgroundColor: Colors.success,
                      },
                    ]}
                    onPress={() => setBarcode(generateBarcode())}
                  >
                    <MaterialCommunityIcons
                      name="barcode"
                      size={24}
                      color={Colors.white}
                    />
                  </TouchableOpacity>
                )}
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
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    color={Colors.white}
                  />
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

      {/* QR Modal */}
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
              <MaterialCommunityIcons
                name="export-variant"
                size={17}
                color={Colors.white}
              />
              <Text style={styles.buttonText}>
                {t("products.barcodePrint")}
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

      {/* Barcode Scanner Modal */}
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
              <Feather name="x" size={24} color={Colors.error} />
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

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons
              name="checkmark-circle"
              size={60}
              color={Colors.success}
            />
            <Text style={styles.modalTitle}>{t("common.success")}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setSuccessModal(false)}
            >
              <Text style={styles.buttonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="close-circle" size={60} color={Colors.error} />
            <Text style={styles.modalTitle}>{t("common.errorTitle")}</Text>
            <Text style={styles.modalSubtitle}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={styles.buttonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="warning" size={60} color={Colors.error} />
            <Text style={styles.modalTitle}>{t("products.deleteProduct")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("products.deleteProductConfirm")}
            </Text>
            <View style={{ flexDirection: "row-reverse" }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.error }]}
                onPress={async () => {
                  try {
                    await del(`/products/${deleteTargetId}`);
                    invalidateCache("/products");
                    setProducts((prev) =>
                      prev.filter((p) => p._id !== deleteTargetId),
                    );
                    setDeleteModal(false);
                  } catch (err) {
                    setDeleteModal(false);
                    setErrorMessage(err.message);
                  }
                }}
              >
                <Text style={styles.buttonText}>{t("common.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 70
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
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  pricing: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 14,
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
    flexDirection: "row",
    alignContent: "center",
    gap: 8,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 17,
    color: Colors.text,
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
  barcodeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    flex: 1,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    gap: 5,
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
    gap: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignContent: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingLeft: 20,
    marginTop: 10,
    marginHorizontal: 16,
  },
  searchInput: {
    padding: 12,
    fontSize: 16,
  },
  qrContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
  },
});
