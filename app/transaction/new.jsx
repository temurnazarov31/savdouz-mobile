import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import ProductScanner from "../../components/productScanner";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, post } from "../../services/api";

export default function NewTransaction({ onClose }) {
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [saleSource, setSaleSource] = useState("store");
  const [storeProducts, setStoreProducts] = useState([]);
  const [whProducts, setWhProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("naqd");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [priceType, setPriceType] = useState("retail");
  // Permissions
  const { isOwner, role } = useRole();
  const isUser = role === "user";
  const isWorker = role === "worker";
  const { t } = useTranslation();

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const fetchOultets = async () => {
    try {
      setStoresLoading(true);

      if (isWorker) {
        const store = await get("/stores/my-store").catch(() => null);
        const warehouse = await get("/warehouses/my-warehouse").catch(
          () => null,
        );

        const outletId =
          store.data?.store?._id || warehouse.data?.warehouse?._id;

        setSelectedStore(store.data?.store);
        setSelectedWarehouse(warehouse.data?.warehouse);
        if (outletId) {
          fetchInventory(outletId);
        }
        return;
      }

      const store = await get("/stores").catch(() => null);
      setStores(store.data?.stores || []);
      const warehouse = await get("/warehouses").catch(() => null);
      setWarehouses(warehouse.data?.warehouses || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setStoresLoading(false);
    }
  };

  const fetchInventory = async (storeId) => {
    try {
      const data = await get(`/stores/products/${storeId}`);
      const inventory = data.data.inventory;
      setStoreProducts(
        Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
      );
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const fetchWarehouseInventory = async (warehouseId) => {
    try {
      const data = await get(`/warehouses/products/warehouse/${warehouseId}`);
      setWhProducts(data.data.whProduct || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  useEffect(() => {
    fetchOultets();
  }, []);

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setCart([]);
    setStoreProducts([]);
    fetchInventory(store._id);
  };

  const handleSelectWarehouse = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setCart([]);
    setWhProducts([]);
    fetchWarehouseInventory(warehouse._id);
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c._id === item._id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart([...cart, { ...item, quantity: 1, priceType: "retail" }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 0) {
      removeFromCart(id);
      return;
    }
    setCart(
      cart.map((item) => (item._id === id ? { ...item, quantity } : item)),
    );
  };

  const updateAllPriceTypes = (type) => {
    setPriceType(type);
    setCart(cart.map((item) => ({ ...item, priceType: type })));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price =
        item.priceType === "bulk"
          ? item.pricing?.bulkPrice
          : item.pricing?.retailPrice;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleCreateTransaction = async () => {
    const invalidItems = cart.filter(
      (item) => !item.quantity || Number(item.quantity) < 1,
    );
    if (invalidItems.length > 0) {
      Alert.alert(
        "Error",
        `${t("transactions.validQuantity")} ${invalidItems.map((i) => i.name).join(", ")}`,
      );
      return;
    }
    if (saleSource === "store" && !selectedStore) {
      Alert.alert("Error", "Please select a store");
      return;
    }
    if (saleSource === "warehouse" && !selectedWarehouse) {
      Alert.alert("Error", t("transactions.validStore"));
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Error", t("transactions.validWarehouse"));
      return;
    }

    try {
      setLoading(true);

      const productsToSend = cart.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
      }));

      await post("/transactions", {
        outletId:
          saleSource === "store" ? selectedStore._id : selectedWarehouse._id,
        products: productsToSend,
        saleSource,
        priceType,
        paymentMethod,
      });

      Alert.alert(t("common.success"), t("transactions.saleRecorded"), [
        { text: "OK", onPress: handleClose },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayProducts = (
    saleSource === "store" ? storeProducts : whProducts
  ).filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (storesLoading) {
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
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("transactions.newTransaction")}
        </Text>
        <View />
      </View>

      {/* Step 1 - Sale Source */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("transactions.saleSource")}
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                saleSource === "store" && styles.sourceButtonActive,
              ]}
              onPress={() => {
                setSaleSource("store");
                setCart([]);
                setSelectedWarehouse(null);
              }}
            >
              <Text
                style={[
                  styles.sourceText,
                  saleSource === "store" && styles.sourceTextActive,
                ]}
              >
                🏪 {t("stores.store")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                saleSource === "warehouse" && styles.sourceButtonActive,
              ]}
              onPress={() => {
                setSaleSource("warehouse");
                setCart([]);
                setSelectedStore(null);
              }}
            >
              <Text
                style={[
                  styles.sourceText,
                  saleSource === "warehouse" && styles.sourceTextActive,
                ]}
              >
                🏪 {t("warehouse.warehouse")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2 - Select Store or Warehouse */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {" "}
            {saleSource === "store"
              ? t("stores.selectStore")
              : t("warehouse.selectWarehouse")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(saleSource === "store" ? stores : warehouses).map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[
                  styles.chip,
                  (saleSource === "store" ? selectedStore : selectedWarehouse)
                    ?._id === item._id && styles.chipActive,
                ]}
                onPress={() =>
                  saleSource === "store"
                    ? handleSelectStore(item)
                    : handleSelectWarehouse(item)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    (saleSource === "store" ? selectedStore : selectedWarehouse)
                      ?._id === item._id && styles.chipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Step 3 - Select Products & Quantity */}
      {(selectedStore || selectedWarehouse) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("products.addProduct")}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={t("common.searchProduct")}
  placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => setScannerVisible(true)}
            >
              <Text style={styles.scanBtnText}>QR Scan</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
            {displayProducts.length === 0 ? (
              <Text style={styles.empty}>{t("products.emptyProduct")}</Text>
            ) : (
              displayProducts.map((item) => {
                const cartItem = cart.find((c) => c._id === item._id);
                return (
                  <View key={item._id} style={styles.productCard}>
                    {/* Left - product info */}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productModel}>
                        Model: {item.model}
                      </Text>
                      <Text style={styles.productStock}>
                        {t("products.inStock")}: {item.quantity}
                      </Text>
                    </View>

                    {/* Right - actions */}
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.priceText}>
                        {t("products.bulkFirstLetter")}:{" "}
                        {item.pricing?.bulkPrice?.toLocaleString()}
                      </Text>
                      <Text style={styles.priceText}>
                        {t("products.retailFirstLetter")}:{" "}
                        {item.pricing?.retailPrice?.toLocaleString()}
                      </Text>
                      {cartItem ? (
                        <>
                          <View style={styles.qtyControls}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() =>
                                updateQuantity(item._id, cartItem.quantity - 1)
                              }
                            >
                              <Text style={styles.qtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={styles.qtyInput}
                              value={String(cartItem.quantity)}
                              onChangeText={(val) =>
                                updateQuantity(item._id, Number(val) || 0)
                              }
                              keyboardType="numeric"
                            />
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() =>
                                updateQuantity(item._id, cartItem.quantity + 1)
                              }
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeFromCart(item._id)}
                              style={styles.removeFromCartBtn}
                            >
                              <Text style={styles.removeFromCartText}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => addToCart(item)}
                          >
                            <Text style={styles.addBtnText}>
                              + {t("common.add")}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {cart.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("transactions.priceType")}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                priceType === "bulk" && styles.sourceButtonActive,
              ]}
              onPress={() => updateAllPriceTypes("bulk")}
            >
              <Text
                style={[
                  styles.sourceText,
                  priceType === "bulk" && styles.sourceTextActive,
                ]}
              >
                {t("transactions.bulk")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                priceType === "retail" && styles.sourceButtonActive,
              ]}
              onPress={() => updateAllPriceTypes("retail")}
            >
              <Text
                style={[
                  styles.sourceText,
                  priceType === "retail" && styles.sourceTextActive,
                ]}
              >
                {t("transactions.retail")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Payment Method */}
      {cart.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("transactions.paymentMethod")}
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                paymentMethod === "naqd" && styles.sourceButtonActive,
              ]}
              onPress={() => setPaymentMethod("naqd")}
            >
              <Text
                style={[
                  styles.sourceText,
                  paymentMethod === "naqd" && styles.sourceTextActive,
                ]}
              >
                {t("transactions.cash")}
                💵
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                paymentMethod === "karta" && styles.sourceButtonActive,
              ]}
              onPress={() => setPaymentMethod("karta")}
            >
              <Text
                style={[
                  styles.sourceText,
                  paymentMethod === "karta" && styles.sourceTextActive,
                ]}
              >
                {t("transactions.card")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summary */}
      {cart.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("reports.summary")} | {priceType === "bulk" ? t("transactions.bulk") : t("transactions.retail")} | {paymentMethod === "naqd" ? t("transactions.cash") : t("transactions.card")}</Text>

          {/* Items List */}
          {cart.map((item) => {
            const price =
              item.priceType === "bulk"
                ? item.pricing?.bulkPrice
                : item.pricing?.retailPrice;
            return (
              <View key={item._id} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  <Text style={styles.summaryItemName}>
                    {item.name} - {item.model}
                  </Text>
                  <Text style={styles.summaryItemDetail}>
                    {item.quantity} x {price?.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.summaryItemTotal}>
                  {(price * item.quantity)?.toLocaleString()} UZS
                </Text>
              </View>
            );
          })}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {getCartTotal().toLocaleString()} UZS
            </Text>
          </View>
        </View>
      )}

      {/* Submit */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateTransaction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {t("transactions.recordSale")}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {isUser && <Text style={styles.empty}>{t("transactions.isUser")}</Text>}

      <View style={{ height: 40 }} />

      <Modal visible={scannerVisible} animationType="slide">
        <ProductScanner
          products={displayProducts}
          priceType={priceType}
          onAddToCart={(item) => {
            const existing = cart.find((c) => c._id === item._id);
            if (existing) {
              setCart(
                cart.map((c) =>
                  c._id === item._id
                    ? { ...c, quantity: c.quantity + item.quantity }
                    : c,
                ),
              );
            } else {
              setCart([...cart, { ...item, quantity: item.quantity || 1 }]);
            }
          }}
          onClose={() => setScannerVisible(false)}
        />
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
  section: { margin: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  row: { flexDirection: "row", gap: 12 },
  sourceButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  sourceButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourceText: { fontWeight: "600", color: Colors.text },
  sourceTextActive: { color: Colors.white },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: "500" },
  chipTextActive: { color: Colors.white },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    fontSize: 16,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    padding: 6,
    paddingLeft: 0,
  },
  productNameActive: { color: Colors.white, padding: 6, paddingLeft: 0 },
  productStock: {
    fontSize: 13,
    color: Colors.textLight,
    padding: 6,
    paddingLeft: 0,
  },
  productStockActive: { color: Colors.white },
  priceText: { fontSize: 13, color: Colors.textLight, padding: 6 },
  priceTextActive: { color: Colors.white },
  productInfo: {
    marginBottom: 8,
  },
  productInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productModel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  productPrices: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  cartControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  priceToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginTop: 16,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleTxt: { fontSize: 12, fontWeight: "600", color: Colors.text },
  toggleTxtActive: { color: Colors.white },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: Colors.white, fontSize: 18, fontWeight: "bold" },
  qtyInput: {
    width: 50,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: "flex-end",
  },
  addBtnText: { color: Colors.white, fontWeight: "600", fontSize: 14 },
  cartCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cartName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  removeText: { color: Colors.error, fontSize: 18 },
  priceTypeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  priceTypeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priceTypeTxt: { fontSize: 12, fontWeight: "600", color: Colors.text },
  priceTypeTxtActive: { color: Colors.white },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 12,
  },
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryItemLeft: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  summaryItemDetail: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  summaryItemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  summaryLabel: { color: Colors.textLight, fontSize: 14 },
  summaryValue: { fontWeight: "600", color: Colors.text, fontSize: 14 },
  submitButton: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  submitButtonText: { color: Colors.white, fontWeight: "bold", fontSize: 18 },
  empty: { textAlign: "center", color: Colors.textLight, marginTop: 20 },
  removeFromCartBtn: {
    backgroundColor: Colors.error + "12",
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  removeFromCartText: {
    fontSize: 13,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  scanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  scanBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});
