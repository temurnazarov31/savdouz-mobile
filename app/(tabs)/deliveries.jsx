import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, getCached, invalidateCache, post } from "../../services/api";

export default function NewDelivery({ onClose }) {
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [fromType, setFromType] = useState("");
  const [toType, setToType] = useState("");
  const [fromId, setFromId] = useState(null);
  const [toId, setToId] = useState(null);
  const [sourceProducts, setSourceProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [success, setSuccess] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);
  const [error, setError] = useState(null);
  const [workerOutlet, setWorkerOutlet] = useState(null);
  const scrollRef = useRef(null);
  const { t } = useTranslation();

  const { role } = useRole();
  const isWorker = role === "worker";

  const getError = () => {
    if (!fromId) return t("delivery.selectSource");
    if (!toId) return t("delivery.selectDestination");
    if (fromId === toId) return t("delivery.sameSourceDest");
    if (cart.length === 0) return t("delivery.emptyCart");

    const invalidItems = cart.filter(
      (item) => !item.quantity || Number(item.quantity) < 1,
    );
    if (invalidItems.length > 0) {
      return `${t("delivery.invalidQuantity")} ${invalidItems.map((i) => i.name).join(", ")}`;
    }
    const zeroStockItems = cart.filter((item) => {
      const sourceProduct = sourceProducts.find((p) => p._id === item._id);
      return sourceProduct && sourceProduct.quantity === 0;
    });

    if (zeroStockItems.length > 0) {
      return `${t("delivery.outOfStock")}: ${zeroStockItems.map((i) => i.name).join(", ")}`;
    }

    return null;
  };

  const fetchOutlets = async () => {
    try {
      if (isWorker) {
        const data = await getCached("/outlets/my-outlet");
        const outlet = data?.data?.outlet;
        setWorkerOutlet(outlet);

        setFromId(outlet?._id);
        setFromType(outlet?.type);

        if (outlet?._id) fetchSourceProducts(outlet.type, outlet._id);
      }

      const [storesData, warehousesData] = await Promise.all([
        getCached("/outlets?type=store"),
        getCached("/outlets?type=warehouse"),
      ]);
      setStores(storesData.data?.outlets || []);
      setWarehouses(warehousesData.data?.outlets || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSourceProducts = async (type, id) => {
    try {
      const data = await get(`/outlets/products/${id}`);
      const inventory = data.data?.products;
      setSourceProducts(
        Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
      );
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      fetchOutlets();
      setDataLoading(false);
    };
    loadData();
  }, []);
  const resetForm = () => {
    setFromType("");
    setToType("");
    setFromId(null);
    setToId(null);
    setSourceProducts([]);
    setCart([]);
    setSearchQuery("");
    setDeliveryError(false);
    setError(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, x: 0, animated: false });

      return () => {
        resetForm();
      };
    }, []),
  );

  const handleSelectFrom = (type, id) => {
    setFromType(type);
    setFromId(id);
    setCart([]);
    setSourceProducts([]);
    fetchSourceProducts(type, id);
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
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 0) {
      setCart(cart.filter((item) => item._id !== id));
      return;
    }
    setCart(
      cart.map((item) => (item._id === id ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  const handleCreateDelivery = async () => {
    setDeliveryError(true);
    if (getError()) return;

    try {
      setLoading(true);
      await post("/deliveries", {
        fromType,
        fromId,
        toType,
        toId,
        products: cart.map((item) => ({
          productId: item.product?._id || item.product || item._id,
          quantity: Number(item.quantity),
        })),
      });
      // Invalidate source outlet products — stock changed
      invalidateCache(`/outlets/products/${fromId}`);
      invalidateCache(`/outlets?type=store`);
      invalidateCache(`/outlets?type=warehouse`);
      invalidateCache(`/outlets/my-outlet`);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOutlets = (type) => (type === "store" ? stores : warehouses);

  const displayProducts = sourceProducts.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (dataLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      stickyHeaderIndices={[0]}
    >
      {/* Header */}
      <View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("delivery.newDelivery")}</Text>
          <TouchableOpacity onPress={() => router.push("delivery/history")}>
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 1 - From */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("common.from")}</Text>

        {isWorker && workerOutlet ? (
          <View
            style={[
              styles.chip,
              styles.chipActive,
              { alignSelf: "flex-start" },
            ]}
          >
            <Text style={styles.chipTextActive}>{workerOutlet.name}</Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  fromType === "store" && styles.typeBtnActive,
                ]}
                onPress={() => {
                  setFromType("store");
                  setFromId(null);
                  setCart([]);
                  setSourceProducts([]);
                }}
              >
                <Ionicons
                  name="storefront-sharp"
                  size={16}
                  style={[
                    styles.typeTxt,
                    fromType === "store" && styles.typeTxtActive,
                  ]}
                />
                <Text
                  style={[
                    styles.typeTxt,
                    fromType === "store" && styles.typeTxtActive,
                  ]}
                >
                  {t("stores.store")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  fromType === "warehouse" && styles.typeBtnActive,
                ]}
                onPress={() => {
                  setFromType("warehouse");
                  setFromId(null);
                  setCart([]);
                  setSourceProducts([]);
                }}
              >
                <MaterialIcons
                  name="warehouse"
                  size={18}
                  style={[
                    styles.typeTxt,
                    fromType === "warehouse" && styles.typeTxtActive,
                  ]}
                />
                <Text
                  style={[
                    styles.typeTxt,
                    fromType === "warehouse" && styles.typeTxtActive,
                  ]}
                >
                  {t("warehouse.warehouse")}
                </Text>
              </TouchableOpacity>
            </View>
            {fromType && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getOutlets(fromType).map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={[
                      styles.chip,
                      fromId === item._id && styles.chipActive,
                    ]}
                    onPress={() => handleSelectFrom(fromType, item._id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        fromId === item._id && styles.chipTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Step 2 - To */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("common.to")}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.typeBtn, toType === "store" && styles.typeBtnActive]}
            onPress={() => {
              setToType("store");
              setToId(null);
            }}
          >
            <Ionicons
              name="storefront-sharp"
              size={16}
              style={[
                styles.typeTxt,
                toType === "store" && styles.typeTxtActive,
              ]}
            />
            <Text
              style={[
                styles.typeTxt,
                toType === "store" && styles.typeTxtActive,
              ]}
            >
              {t("stores.store")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              toType === "warehouse" && styles.typeBtnActive,
            ]}
            onPress={() => {
              setToType("warehouse");
              setToId(null);
            }}
          >
            <MaterialIcons
              name="warehouse"
              size={18}
              style={[
                styles.typeTxt,
                toType === "warehouse" && styles.typeTxtActive,
              ]}
            />
            <Text
              style={[
                styles.typeTxt,
                toType === "warehouse" && styles.typeTxtActive,
              ]}
            >
              {t("warehouse.warehouse")}
            </Text>
          </TouchableOpacity>
        </View>
        {toType && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getOutlets(toType).map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.chip, toId === item._id && styles.chipActive]}
                onPress={() => setToId(item._id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    toId === item._id && styles.chipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Step 3 - Products */}
      {fromId && toId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("products.selectProduct")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("products.searchProduct")}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            {displayProducts.length === 0 ? (
              <Text style={styles.empty}>{t("products.emptyProduct")}</Text>
            ) : (
              displayProducts.map((item) => {
                const cartItem = cart.find((c) => c._id === item._id);
                return (
                  <View key={item._id} style={styles.productCard}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productModel}>{item.model}</Text>
                      <Text style={styles.productStock}>
                        {t("products.inStock")}: {item.quantity}
                      </Text>
                    </View>
                    {cartItem ? (
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
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => addToCart(item)}
                      >
                        <Text style={styles.addBtnText}>
                          + {t("common.add")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Summary */}
      {cart.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>{t("reports.summary")}</Text>
            <View style={styles.summaryRoute}>
              <View style={styles.summaryRouteChip}>
                <Ionicons
                  name={
                    fromType === "store" ? "storefront-outline" : "cube-outline"
                  }
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.summaryRouteText} numberOfLines={1}>
                  {getOutlets(fromType).find((o) => o._id === fromId)?.name ||
                    workerOutlet?.name}
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={Colors.textLight}
              />
              <View style={styles.summaryRouteChip}>
                <Ionicons
                  name={
                    toType === "store" ? "storefront-outline" : "cube-outline"
                  }
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.summaryRouteText} numberOfLines={1}>
                  {getOutlets(toType).find((o) => o._id === toId)?.name}
                </Text>
              </View>
            </View>
          </View>
          {cart.map((item) => (
            <View key={item._id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.name} - {item.model}
              </Text>
              <Text style={styles.summaryValue}>x{item.quantity}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.summaryLabel}>
              {t("reports.totalProducts")}
            </Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {cart.length} {t("delivery.types")}
            </Text>
          </View>
        </View>
      )}

      {/* Submit */}
      {deliveryError && getError() && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            {getError()} {error}
          </Text>
        </View>
      )}

      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleCreateDelivery}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {t("delivery.sendDelivery")}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />

      <Modal visible={success} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Ionicons
              name="checkmark-circle"
              size={60}
              color={Colors.success}
            />
            <Text style={styles.modalTitle}>{t("delivery.success")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("delivery.createdSuccess")}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setSuccess(false);
                resetForm();
                onClose?.();
              }}
            >
              <Text style={styles.buttonText}>{t("common.ok")}</Text>
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
    paddingHorizontal: 30,
    paddingBottom: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.primary, fontSize: 16 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  section: { margin: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
    textTransform: "capitalize",
  },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
    gap: 8,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeTxt: { fontWeight: "600", color: Colors.text },
  typeTxtActive: { color: Colors.white },
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
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  productModel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  productStock: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: Colors.white, fontSize: 16, fontWeight: "bold" },
  qtyInput: {
    width: 40,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    color: Colors.text,
  },
  removeText: { color: Colors.error, fontSize: 18, marginLeft: 4 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.white, fontWeight: "600", fontSize: 13 },
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  error: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 18,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    width: "85%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 15,
  },
  summaryRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryRouteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  summaryRouteText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
});
