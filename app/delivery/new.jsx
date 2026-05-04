import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import { get, post } from "../../services/api";

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

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const fetchStores = async () => {
    try {
      const data = await get("/stores");
      setStores(data.data.stores);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await get("/warehouses");
      setWarehouses(data.data.warehouses);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const fetchSourceProducts = async (type, id) => {
    try {
      if (type === "warehouse") {
        const data = await get(`/warehouses/products/warehouse/${id}`);
        setSourceProducts(data.data.whProduct || []);
      } else {
        const data = await get(`/stores/products/${id}`);
        const inventory = data.data.inventory;
        setSourceProducts(
          Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
        );
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      await Promise.all([fetchStores(), fetchWarehouses()]);
      setDataLoading(false);
    };
    loadData();
  }, []);

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
    if (!fromId) {
      Alert.alert("Error", "Please select source");
      return;
    }
    if (!toId) {
      Alert.alert("Error", "Please select destination");
      return;
    }
    if (fromId === toId) {
      Alert.alert("Error", "Source and destination cannot be the same");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Error", "Please add at least one product");
      return;
    }

    const invalidItems = cart.filter(
      (item) => !item.quantity || Number(item.quantity) < 1,
    );
    if (invalidItems.length > 0) {
      Alert.alert(
        "Error",
        `Invalid quantity for: ${invalidItems.map((i) => i.name).join(", ")}`,
      );
      return;
    }

    try {
      setLoading(true);
      await post("/deliveries", {
        fromType,
        fromId,
        toType,
        toId,
        products: cart.map((item) => ({
          productId: item.product?._id || item.product,
          quantity: Number(item.quantity),
        })),
        note,
      });

      Alert.alert("Success", "Delivery created successfully!", [
        { text: "OK", onPress: handleClose },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message);
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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Delivery</Text>
        <View />
      </View>

      {/* Step 1 - From */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. From</Text>
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
            <Text
              style={[
                styles.typeTxt,
                fromType === "store" && styles.typeTxtActive,
              ]}
            >
              🏪 Store
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
            <Text
              style={[
                styles.typeTxt,
                fromType === "warehouse" && styles.typeTxtActive,
              ]}
            >
              🏭 Warehouse
            </Text>
          </TouchableOpacity>
        </View>
        {fromType && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getOutlets(fromType).map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[styles.chip, fromId === item._id && styles.chipActive]}
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
      </View>

      {/* Step 2 - To */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. To</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.typeBtn, toType === "store" && styles.typeBtnActive]}
            onPress={() => {
              setToType("store");
              setToId(null);
            }}
          >
            <Text
              style={[
                styles.typeTxt,
                toType === "store" && styles.typeTxtActive,
              ]}
            >
              🏪 Store
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
            <Text
              style={[
                styles.typeTxt,
                toType === "warehouse" && styles.typeTxtActive,
              ]}
            >
              🏭 Warehouse
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
      {fromId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Select Products</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by name or model..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            {displayProducts.length === 0 ? (
              <Text style={styles.empty}>No products available</Text>
            ) : (
              displayProducts.map((item) => {
                const cartItem = cart.find((c) => c._id === item._id);
                return (
                  <View key={item._id} style={styles.productCard}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productModel}>{item.model}</Text>
                      <Text style={styles.productStock}>
                        Available: {item.quantity}
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
                        <Text style={styles.addBtnText}>+ Add</Text>
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
          <Text style={styles.summaryTitle}>Summary</Text>
          {cart.map((item) => (
            <View key={item._id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.name} - {item.model}
              </Text>
              <Text style={styles.summaryValue}>x{item.quantity}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.summaryLabel}>Total products</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {cart.length} types
            </Text>
          </View>
        </View>
      )}

      {/* Submit */}
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
              Send Delivery ({cart.length} products)
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
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
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.white,
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
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
});
