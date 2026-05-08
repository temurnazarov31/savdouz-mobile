import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/colors";
import { post } from "../services/api";

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const token = data.includes("/join/") ? data.split("/join/")[1] : data;
      const isWarehouse = data.includes("/warehouses/");

      const endpoint = isWarehouse
        ? `/warehouses/join/${token}`
        : `/stores/join/${token}`;

      await post(endpoint);

      Alert.alert(
        `${t("common.success")}! 🎉 `,
        `${t("workers.joinRequestSent")} ${t("workers.waitingApproval")}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(t("common.errorTitle"), err.message, [
        { text: t("scanner.tryAgain"), onPress: () => setScanned(false) },
        { text: t("common.cancel"), onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View />;
  }

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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("scanner.scanQR")}</Text>
        <View />
      </View>

      {/* Camera */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "code39"],
        }}
        enableTorch={false}
        tryAgain
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            {/* Corner borders */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanText}>
            {loading ? t("scanner.processing") : t("scanner.pointCamera")}
          </Text>
        </View>
      </CameraView>

      {/* Rescan button */}
      {scanned && !loading && (
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanText}>{t("scanner.tapScan")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.black,
  },
  back: { color: Colors.white, fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.white },
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
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 24,
    textAlign: "center",
  },
  rescanButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  rescanText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  message: {
    color: Colors.white,
    textAlign: "center",
    fontSize: 16,
    margin: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: "center",
  },
  buttonText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
});
