import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/colors";
import { post } from "../services/api";

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { t } = useTranslation();

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const token = data.includes("/join/") ? data.split("/join/")[1] : data;
      await post(`/outlets/join/${token}`);
      setSuccessModal(true);
    } catch (err) {
      setErrorMessage(err.message);
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center", padding: 24 },
        ]}
      >
        <Ionicons name="camera-outline" size={64} color={Colors.primary} />
        <Text style={[styles.message, { marginBottom: 16 }]}>
          {t("scanner.cameraPermission")}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            const { granted } = await requestPermission();
            if (!granted) {
              // Permission denied — open app settings
              Linking.openSettings();
            }
          }}
        >
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
          <Ionicons
            name="arrow-back-outline"
            size={24}
            color={Colors.primary}
          />
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
            <Text style={styles.centeredSubtitle}>
              {t("workers.joinedSuccessfully")}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[
                  styles.centeredBtn,
                  { backgroundColor: Colors.success },
                ]}
                onPress={() => {
                  setSuccessModal(false);
                  router.back();
                }}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={errorModal} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>{t("common.errorTitle")}</Text>
            <Text style={styles.centeredSubtitle}>{errorMessage}</Text>
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
                  setErrorModal(false);
                  router.back();
                }}
              >
                <Text
                  style={[styles.centeredBtnText, { color: Colors.textLight }]}
                >
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.centeredBtn}
                onPress={() => {
                  setErrorModal(false);
                  setScanned(false);
                }}
              >
                <Text style={styles.centeredBtnText}>
                  {t("scanner.tryAgain")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
