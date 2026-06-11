import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProductScanner from "../../components/productScanner";
import { SkeletonBox } from "../../components/skeleton";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, getCached, invalidateCache, post } from "../../services/api";

export default function NewTransaction({ onClose }) {
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [saleSource, setSaleSource] = useState("store");
  const [outletProducts, setOutletProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("naqd");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [priceType, setPriceType] = useState("retail");
  const [discount, setDiscount] = useState("");

  // Permissions
  const { isOwner, role } = useRole();
  const isUser = role === "user";
  const isWorker = role === "worker";
  const { t } = useTranslation();

  // Clients
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNote, setNewClientNote] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [addDebt, setAddDebt] = useState(false);
  const [clientMode, setClientMode] = useState("none");

  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isMaxDebt, setIsMaxDebt] = useState(false);

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const fetchOultets = async () => {
    try {
      setStoresLoading(true);

      if (isWorker) {
        const outlet = await getCached("/outlets/my-outlet");
        setSelectedOutlet(outlet?.data?.outlet);
        fetchInventory(outlet?.data?.outlet?._id);
        return;
      }

      const [storeData, warehouseData] = await Promise.all([
        getCached("/outlets?type=store"),
        getCached("/outlets?type=warehouse"),
      ]);
      setStores(storeData.data?.outlets || []);
      setWarehouses(warehouseData.data?.outlets || []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setStoresLoading(false);
    }
  };

  const fetchInventory = async (outletId) => {
    try {
      // ❌ don't cache — stock changes every sale
      const data = await get(`/outlets/products/${outletId}`);
      const inventory = data.data?.products;
      setOutletProducts(
        Array.isArray(inventory) ? inventory : inventory ? [inventory] : [],
      );
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await getCached("/clients?sort=-debt");
      setClients(data.data?.clients || []);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    fetchOultets();
    fetchClients();
  }, []);

  const handleSelectOutlet = (outlet) => {
    setSelectedOutlet(outlet);
    setCart([]);
    setOutletProducts([]);
    fetchInventory(outlet._id);
  };

  const handleCreateTransaction = async () => {
    const invalidItems = cart.filter(
      (item) => !item.quantity || Number(item.quantity) < 1,
    );
    if (invalidItems.length > 0) {
      setErrorMessage(
        `${t("transactions.validQuantity")} ${invalidItems.map((i) => i.name).join(", ")}`,
      );
      return;
    }
    if (saleSource === "store" && !selectedOutlet) {
      setErrorMessage(t("stores.selectStore"));
      return;
    }
    if (cart.length === 0) {
      setErrorMessage(t("transactions.validWarehouse"));
      return;
    }

    const raw = cart.reduce((sum, item) => {
      const price =
        item.priceType === "wholesale"
          ? (item.pricing?.wholesalePrice ?? 0)
          : (item.pricing?.retailPrice ?? 0);
      return sum + price * item.quantity;
    }, 0);
    const maxDiscount = raw - getCostTotal();

    if (discount && Number(discount) > maxDiscount) {
      setErrorMessage(
        `${t("transactions.discountTooHigh")} ${maxDiscount.toLocaleString()} UZS`,
      );
      return;
    }

    try {
      setLoading(true);

      const productsToSend = cart.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
      }));

      const clientId =
        clientMode === "existing" ? selectedClient?._id : undefined;
      const newClient =
        clientMode === "new" && newClientName
          ? {
              name: newClientName,
              phone: newClientPhone,
              note: newClientNote,
            }
          : undefined;

      await post("/transactions", {
        outletId: selectedOutlet._id,
        products: productsToSend,
        saleSource,
        priceType,
        paymentMethod,
        ...(clientId && { clientId }),
        ...(newClient && { newClient }),
        ...(addDebt && debtAmount && { debt: Number(debtAmount) }),
        ...(discount && Number(discount) > 0 && { discount: Number(discount) }),
      });

      // Invalidate stock and client caches
      invalidateCache(`/outlets/products/${selectedOutlet._id}`);
      if (newClient?.name || (clientId && addDebt && debtAmount)) {
        invalidateCache(
          "/clients?sort=-debt",
          "/clients?debtOnly=true&sort=-debt",
        );
      }

      setSuccessModal(true);
    } catch (err) {
      setErrorMessage(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // rest unchanged
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
    const raw = cart.reduce((sum, item) => {
      const price =
        item.priceType === "wholesale"
          ? (item.pricing?.wholesalePrice ?? 0)
          : (item.pricing?.retailPrice ?? 0);
      return sum + price * item.quantity;
    }, 0);

    if (!discount || Number(discount) <= 0) return raw;
    return Math.max(0, raw - Number(discount));
  };

  const getCostTotal = () => {
    return cart.reduce((sum, item) => {
      return sum + (item.pricing?.costPrice ?? 0) * item.quantity;
    }, 0);
  };

  useEffect(() => {
    if (isMaxDebt) {
      setDebtAmount(String(getCartTotal()));
    }
  }, [discount, cart]);

  const displayProducts = outletProducts.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const discountWarning = () => {
    if (!discount || Number(discount) <= 0) return null;
    const raw = cart.reduce((sum, item) => {
      const price =
        item.priceType === "wholesale"
          ? (item.pricing?.wholesalePrice ?? 0)
          : (item.pricing?.retailPrice ?? 0);
      return sum + price * item.quantity;
    }, 0);
    const maxDiscount = raw - getCostTotal();
    if (Number(discount) > maxDiscount) {
      return `Max: ${maxDiscount.toLocaleString()} UZS`;
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: 50 }]}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons
                name="arrow-back"
                size={24}
                color="black"
                style={styles.back}
              />
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
                    setSelectedOutlet(null);
                  }}
                >
                  <Ionicons
                    name="storefront-sharp"
                    size={16}
                    style={[
                      styles.sourceText,
                      saleSource === "store" && styles.sourceTextActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.sourceText,
                      saleSource === "store" && styles.sourceTextActive,
                    ]}
                  >
                    {" "}
                    {t("stores.store")}
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
                    setSelectedOutlet(null);
                  }}
                >
                  <MaterialIcons
                    name="warehouse"
                    size={20}
                    style={[
                      styles.sourceText,
                      saleSource === "warehouse" && styles.sourceTextActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.sourceText,
                      saleSource === "warehouse" && styles.sourceTextActive,
                    ]}
                  >
                    {" "}
                    {t("warehouse.warehouse")}
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
              {storesLoading ? (
                // ✅ skeleton for outlet chips
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <SkeletonBox width={80} height={36} borderRadius={20} />
                  <SkeletonBox width={100} height={36} borderRadius={20} />
                  <SkeletonBox width={90} height={36} borderRadius={20} />
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(saleSource === "store" ? stores : warehouses).map(
                    (item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={[
                          styles.chip,
                          selectedOutlet?._id === item._id && styles.chipActive,
                        ]}
                        onPress={() => handleSelectOutlet(item)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedOutlet?._id === item._id &&
                              styles.chipTextActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {/* Step 3 - Select Products & Quantity */}
          {selectedOutlet && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t("products.addProduct")}
              </Text>
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={24} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t("common.searchProduct")}
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setScannerVisible(true)}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    style={styles.scanBtnText}
                  />
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
                        <View style={{ alignItems: "flex-end", height: 110 }}>
                          <Text style={styles.priceText}>
                            {t("products.bulkFirstLetter")}:{" "}
                            {item.pricing?.wholesalePrice?.toLocaleString()}
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
                                    updateQuantity(
                                      item._id,
                                      cartItem.quantity - 1,
                                    )
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
                                    updateQuantity(
                                      item._id,
                                      cartItem.quantity + 1,
                                    )
                                  }
                                >
                                  <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => removeFromCart(item._id)}
                                  style={styles.removeFromCartBtn}
                                >
                                  <MaterialCommunityIcons
                                    name="delete"
                                    size={28}
                                    color={Colors.error}
                                  />
                                </TouchableOpacity>
                              </View>
                            </>
                          ) : (
                            <>
                              <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => addToCart(item)}
                              >
                                <MaterialIcons
                                  name="add-shopping-cart"
                                  size={20}
                                  style={styles.addBtnText}
                                />
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
              <Text style={styles.sectionTitle}>
                {t("transactions.priceType")}
              </Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.sourceButton,
                    priceType === "wholesale" && styles.sourceButtonActive,
                  ]}
                  onPress={() => updateAllPriceTypes("wholesale")}
                >
                  <Text
                    style={[
                      styles.sourceText,
                      priceType === "wholesale" && styles.sourceTextActive,
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
                  <MaterialCommunityIcons
                    name="cash-100"
                    size={24}
                    color="green"
                    style={[
                      paymentMethod === "naqd" && styles.sourceTextActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.sourceText,
                      paymentMethod === "naqd" && styles.sourceTextActive,
                    ]}
                  >
                    {t("transactions.cash")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sourceButton,
                    paymentMethod === "karta" && styles.sourceButtonActive,
                  ]}
                  onPress={() => setPaymentMethod("karta")}
                >
                  <Ionicons
                    name="card"
                    size={24}
                    style={[
                      styles.sourceText,
                      paymentMethod === "karta" && styles.sourceTextActive,
                    ]}
                  />
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.summaryTitle}>
                  {t("reports.summary")} |{" "}
                  {priceType === "wholesale"
                    ? t("transactions.bulk")
                    : t("transactions.retail")}{" "}
                  |{" "}
                  {paymentMethod === "naqd"
                    ? t("transactions.cash")
                    : t("transactions.card")}
                </Text>

                {/* Debt adder funtion */}
                <TouchableOpacity
                  onPress={() => setAddDebt(addDebt === true ? false : true)}
                >
                  <Text style={styles.summaryTitle}>
                    {t("transactions.addDebt")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginVertical: 12 }}>
                {/* Client mode selector */}
                {addDebt && (
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={[
                        styles.sourceButton,
                        clientMode === "none" && styles.sourceButtonActive,
                      ]}
                      onPress={() => {
                        setClientMode("none");
                        setSelectedClient(null);
                        setNewClientName("");
                      }}
                    >
                      <Text
                        style={[
                          styles.sourceText,
                          clientMode === "none" && styles.sourceTextActive,
                        ]}
                      >
                        {t("transactions.noClient")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sourceButton,
                        clientMode === "existing" && styles.sourceButtonActive,
                      ]}
                      onPress={() => setClientMode("existing")}
                    >
                      <Text
                        style={[
                          styles.sourceText,
                          clientMode === "existing" && styles.sourceTextActive,
                        ]}
                      >
                        {t("transactions.existingClient")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sourceButton,
                        clientMode === "new" && styles.sourceButtonActive,
                      ]}
                      onPress={() => setClientMode("new")}
                    >
                      <Text
                        style={[
                          styles.sourceText,
                          clientMode === "new" && styles.sourceTextActive,
                        ]}
                      >
                        {t("transactions.newClient")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Existing client search */}
                {clientMode === "existing" && addDebt && (
                  <>
                    <View
                      style={[
                        styles.searchContainer,
                        { width: "100%", marginTop: 12, marginBottom: 12 },
                      ]}
                    >
                      <Ionicons name="search" size={20} color="#999" />
                      <TextInput
                        style={[{ width: "100%" }]}
                        placeholder={t("clients.search")}
                        placeholderTextColor="#999"
                        value={clientSearchQuery}
                        onChangeText={setClientSearchQuery}
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                      {(clients || [])
                        .filter(
                          (c) =>
                            c.name
                              ?.toLowerCase()
                              .includes(clientSearchQuery.toLowerCase()) ||
                            c.phone?.includes(clientSearchQuery),
                        )
                        .map((client) => (
                          <TouchableOpacity
                            key={client._id}
                            style={[
                              styles.chip,
                              { marginBottom: 6, width: "100%" },
                              selectedClient?._id === client._id &&
                                styles.chipActive,
                            ]}
                            onPress={() => setSelectedClient(client)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selectedClient?._id === client._id &&
                                  styles.chipTextActive,
                              ]}
                            >
                              {client.name}{" "}
                              {client.debt > 0
                                ? `• ${client.debt.toLocaleString()} UZS`
                                : ""}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </>
                )}

                {/* New client */}
                {clientMode === "new" && addDebt && (
                  <View>
                    <TextInput
                      style={[
                        styles.searchContainer,
                        { marginTop: 12, paddingVertical: 4, width: "100%" },
                      ]}
                      placeholder={t("clients.name")}
                      placeholderTextColor="#999"
                      value={newClientName}
                      onChangeText={setNewClientName}
                    />
                    <TextInput
                      style={[
                        styles.searchContainer,
                        { marginTop: 12, paddingVertical: 4, width: "100%" },
                      ]}
                      placeholder={t("clients.phone")}
                      placeholderTextColor="#999"
                      value={newClientPhone}
                      onChangeText={setNewClientPhone}
                    />
                    <TextInput
                      style={[
                        styles.searchContainer,
                        { marginTop: 12, paddingVertical: 4, width: "100%" },
                      ]}
                      placeholder={t("clients.note")}
                      placeholderTextColor="#999"
                      value={newClientNote}
                      onChangeText={setNewClientNote}
                    />
                  </View>
                )}

                {/* Debt amount — only for credit */}
                {addDebt && clientMode !== "none" && (
                  <View
                    style={[styles.searchContainer, styles.debtInputContainer]}
                  >
                    <Ionicons name="cash-outline" size={20} color="#999" />
                    <TextInput
                      style={[styles.searchInput, styles.debtInput]}
                      placeholder={t("clients.debt")}
                      placeholderTextColor="#999"
                      value={debtAmount}
                      onChangeText={(val) => {
                        setIsMaxDebt(false);
                        setDebtAmount(val);
                      }}
                      keyboardType="numeric"
                      autoComplete="off"
                      autoCorrect={false}
                      textContentType="none"
                    />
                    <TouchableOpacity
                      style={styles.maxBtn}
                      onPress={() => {
                        setIsMaxDebt(true);
                        setDebtAmount(String(getCartTotal()));
                      }}
                    >
                      <Text style={styles.maxBtnText}>Max</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Items List */}
              {cart.map((item) => {
                const price =
                  item.priceType === "wholesale"
                    ? item.pricing?.wholesalePrice
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

              {/* Discount input */}
              <View
                style={[
                  styles.searchContainer,
                  { width: "100%", marginBottom: 4 },
                ]}
              >
                <Ionicons name="pricetag-outline" size={20} color="#999" />
                <TextInput
                  style={[styles.searchInput, { flex: 1 }]}
                  placeholder={t("transactions.discount")}
                  placeholderTextColor="#999"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                  autoComplete="off"
                  autoCorrect={false}
                  textContentType="none"
                />
              </View>

              {discountWarning() && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="warning-outline"
                    size={14}
                    color={Colors.error}
                  />
                  <Text style={{ color: Colors.error, fontSize: 12 }}>
                    {discountWarning()}
                  </Text>
                </View>
              )}

              {/* Subtotal row — only show when discount applied */}
              {discount && Number(discount) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {t("transactions.subtotal")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {cart
                      .reduce((sum, item) => {
                        const price =
                          item.priceType === "wholesale"
                            ? item.pricing?.wholesalePrice
                            : item.pricing?.retailPrice;
                        return sum + price * item.quantity;
                      }, 0)
                      .toLocaleString()}{" "}
                    UZS
                  </Text>
                </View>
              )}

              {/* Discount row */}
              {discount && Number(discount) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.error }]}>
                    {t("transactions.discount")}
                  </Text>
                  <Text style={[styles.summaryValue, { color: Colors.error }]}>
                    -{Number(discount).toLocaleString()} UZS
                  </Text>
                </View>
              )}

              {/* Total */}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>
                  {t("reports.total")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: Colors.primary, fontSize: 16 },
                  ]}
                >
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

          {isUser && (
            <Text style={styles.empty}>{t("transactions.isUser")}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
              {t("transactions.saleRecorded")}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[
                  styles.centeredBtn,
                  { backgroundColor: Colors.success },
                ]}
                onPress={() => {
                  setSuccessModal(false);
                  handleClose();
                }}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={styles.centeredModal}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.centeredTitle}>{t("common.errorTitle")}</Text>
            <Text style={styles.centeredSubtitle}>{errorMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={styles.centeredBtn}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.centeredBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.text },
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
    gap: 5,
  },
  sourceButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourceText: { fontWeight: "600", color: Colors.text, textAlign: "center" },
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
  searchContainer: {
    width: 295,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    padding: 16,
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
    position: "absolute",
    flexDirection: "row",
    top: 70,
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
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    marginTop: 12,
  },
  addBtnText: { color: Colors.white },
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
    flex: 1,
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  removeFromCartText: {
    color: Colors.white,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  scanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
  },
  scanBtnText: {
    color: Colors.white,
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

  debtInputContainer: {
    marginTop: 12,
    width: "100%",
  },
  debtInput: {
    flex: 1,
  },
  maxBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  maxBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});
