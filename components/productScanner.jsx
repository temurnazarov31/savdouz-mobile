import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../constants/colors";

export default function ProductScanner({
  products,
  onAddToCart,
  onClose,
  priceType,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [modalVisible, setModalVisible] = useState(false);
  const { t } = useTranslation();

  const handleBarCodeScanned = ({ data }) => {

    if (scanned) return;
    setScanned(true);

    // Find product by _id or product field
    const product = products.find(
      (p) =>
        p._id === data ||
        p.product === data ||
        p.product?._id === data ||
        p.barcode === data || // ← add this
        p.product?.barcode === data, // ← and this
    );
    
    if (!product) {
      Alert.alert(t("common.notFound"), t("products.productNotFound"), [
        { text: t("common.close"), onPress: onClose },
        { text: t("scanner.scanAgain"), onPress: () => setScanned(false) },
      ]);
      return;
    }

    setScannedProduct(product);
    setQuantity("1");
    setModalVisible(true);
  };

  const handleApprove = () => {
    if (!scannedProduct) return;
    const qty = Number(quantity);
    if (!qty || qty < 1) {
      Alert.alert("Error", t("transactions.validQuantity"));
      return;
    }
    onAddToCart({ ...scannedProduct, quantity: qty });
    setModalVisible(false);
    setScannedProduct(null);
    setQuantity("1");
    setScanned(false); // continue scanning
  };

  const handleCancel = () => {
    setModalVisible(false);
    setScannedProduct(null);
    setScanned(false); // continue scanning
  };

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t("scanner.cameraPermission")}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t("scanner.grantPermission")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("scanner.productTitle")}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕ {t("common.back")}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanText}>{t("scanner.pointCamera")}</Text>
        </View>
      </CameraView>

      {/* Quantity Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{scannedProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>
              {scannedProduct?.model} • {t("products.inStock")}:{" "}
              {scannedProduct?.quantity}
            </Text>

            {/* Price Info */}
            <View style={styles.priceToggle}>
              <Text style={styles.toggleTxt}>
                {t("transactions.bulk")}:{" "}
                {scannedProduct?.pricing?.bulkPrice?.toLocaleString()} UZS
              </Text>
              <Text style={styles.toggleTxt}>
                {t("transactions.retail")}:{" "}
                {scannedProduct?.pricing?.retailPrice?.toLocaleString()} UZS
              </Text>
            </View>

            {/* Quantity */}
            <Text style={styles.label}>{t("common.quantity")}</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  setQuantity((prev) => String(Math.max(1, Number(prev) - 1)))
                }
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((prev) => String(Number(prev) + 1))}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.total}>
              {t("transactions.bulk")} -{" "}
              {(
                scannedProduct?.pricing?.bulkPrice * Number(quantity)
              )?.toLocaleString()}{" "}
              UZS{"     "}
              {t("transactions.retail")} -{" "}
              {(
                scannedProduct?.pricing?.retailPrice * Number(quantity)
              )?.toLocaleString()}{" "}
              UZS
            </Text>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelText}>{t("common.skip")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={handleApprove}
              >
                <Text style={styles.approveText}>✓ {t("scanner.addCart")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#000",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  closeBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeBtnText: { color: "#fff", fontWeight: "600" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: "transparent",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 24,
    textAlign: "center",
  },
  message: { color: "#fff", textAlign: "center", fontSize: 16, margin: 24 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  priceToggle: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  toggleTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.black,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleTxtActive: { color: Colors.white },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  qtyInput: {
    width: 60,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    color: Colors.text,
  },
  total: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: { color: Colors.textLight, fontWeight: "600", fontSize: 16 },
  approveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  approveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
