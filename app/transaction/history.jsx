import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
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
import useRole from "../../hooks/useRole";
import { get } from "../../services/api";

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const { isOwner, role } = useRole();
  const { t } = useTranslation();

  const fetchOutlets = async () => {
    try {
      if (isOwner) {
        const [storesData, warehousesData] = await Promise.all([
          get("/stores"),
          get("/warehouses"),
        ]);
        setStores(storesData.data.stores || []);
        setWarehouses(warehousesData.data.warehouses || []);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let url = "/transactions?";
      if (selectedOutletId) url += `outletId=${selectedOutletId}&`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const data = await get(url);
      setTransactions(data.data.transactions || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutlets();
      fetchTransactions();
    }, [role, isOwner]),
  );

  const handleFilter = () => {
    fetchTransactions();
  };

  const handleClearFilter = () => {
    setSelectedOutletId(null);
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchTransactions(), 100);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("transactions.transactionHistory")}
        </Text>
        <View />
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        {/* Date Range */}
        <View style={styles.dateSection}>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>
                {t("common.date")}({t("common.from")})
              </Text>
              <View style={styles.dateInputRow}>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateYear")}
                  placeholderTextColor="#999"
                  value={startDate.split("-")[0] || ""}
                  onChangeText={(val) => {
                    const parts = startDate.split("-");
                    parts[0] = val;
                    setStartDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <Text style={styles.dateDash}>-</Text>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateMonth")}
                  placeholderTextColor="#999"
                  value={startDate.split("-")[1] || ""}
                  onChangeText={(val) => {
                    const parts = startDate.split("-");
                    parts[1] = val;
                    setStartDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.dateDash}>-</Text>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateDay")}
                  placeholderTextColor="#999"
                  value={startDate.split("-")[2] || ""}
                  onChangeText={(val) => {
                    const parts = startDate.split("-");
                    parts[2] = val;
                    setStartDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>
                {t("common.date")}({t("common.to")})
              </Text>
              <View style={styles.dateInputRow}>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateYear")}
                  placeholderTextColor="#999"
                  value={endDate.split("-")[0] || ""}
                  onChangeText={(val) => {
                    const parts = endDate.split("-");
                    parts[0] = val;
                    setEndDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <Text style={styles.dateDash}>-</Text>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateMonth")}
                  placeholderTextColor="#999"
                  value={endDate.split("-")[1] || ""}
                  onChangeText={(val) => {
                    const parts = endDate.split("-");
                    parts[1] = val;
                    setEndDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.dateDash}>-</Text>
                <TextInput
                  style={styles.dateSegment}
                  placeholder={t("common.dateDay")}
                  placeholderTextColor="#999"
                  value={endDate.split("-")[2] || ""}
                  onChangeText={(val) => {
                    const parts = endDate.split("-");
                    parts[2] = val;
                    setEndDate(parts.join("-"));
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Outlet Filter — owner only */}
        {isOwner && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.outletScroll}
          >
            <TouchableOpacity
              style={[styles.chip, !selectedOutletId && styles.chipActive]}
              onPress={() => setSelectedOutletId(null)}
            >
              <Text
                style={[
                  styles.chipText,
                  !selectedOutletId && styles.chipTextActive,
                ]}
              >
                {t("common.all")}
              </Text>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity
                key={store._id}
                style={[
                  styles.chip,
                  selectedOutletId === store._id && styles.chipActive,
                ]}
                onPress={() => setSelectedOutletId(store._id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedOutletId === store._id && styles.chipTextActive,
                  ]}
                >
                  🏪 {store.name}
                </Text>
              </TouchableOpacity>
            ))}
            {warehouses.map((warehouse) => (
              <TouchableOpacity
                key={warehouse._id}
                style={[
                  styles.chip,
                  selectedOutletId === warehouse._id && styles.chipActive,
                ]}
                onPress={() => setSelectedOutletId(warehouse._id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedOutletId === warehouse._id && styles.chipTextActive,
                  ]}
                >
                  🏭 {warehouse.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterBtns}>
          <TouchableOpacity style={styles.filterBtn} onPress={handleFilter}>
            <Text style={styles.filterBtnText}>🔍 {t("common.filter")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilter}>
            <Text style={styles.clearBtnText}>✕ {t("common.clear")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : transactions.length === 0 ? (
        <Text style={styles.empty}>{t("transactions.noTransactions")}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {transactions.map((transaction, index) => (
            <TouchableOpacity
              key={transaction._id}
              style={styles.transactionCard}
              onPress={() =>
                setExpandedTransaction(
                  expandedTransaction === index ? null : index,
                )
              }
            >
              {/* Row 1 - Date & Products Count */}
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionProduct}>
                  {transaction.products?.length} {t("reports.product")}
                  {transaction.products?.length > 1 ? t("common.plural") : ""}
                </Text>
                <Text style={styles.transactionTime}>
                  {new Date(transaction.createdAt).toLocaleDateString("uz-UZ", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Asia/Tashkent",
                  })}{" "}
                  {new Date(transaction.createdAt).toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Tashkent",
                  })}
                </Text>
              </View>

              {/* Row 2 - Total & Payment */}
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDetail}>
                  {t("common.quantity")}: {transaction.totalQuantity} |{" "}
                  {transaction.paymentMethod === "naqd"
                    ? t("transactions.cash")
                    : t("transactions.card")}
                </Text>
                <Text
                  style={[styles.transactionDetail, { color: Colors.primary }]}
                >
                  {transaction.totalAmount?.toLocaleString()} UZS
                </Text>
              </View>

              {/* Row 3 - Sold by & Profit */}
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDetail}>
                  {transaction.soldBy?.name}
                </Text>
                {isOwner && (
                  <Text
                    style={[
                      styles.transactionDetail,
                      { color: Colors.success },
                    ]}
                  >
                    +{transaction.totalProfit?.toLocaleString()} UZS
                  </Text>
                )}
              </View>

              {/* Expanded Products */}
              {expandedTransaction === index && (
                <View style={styles.expandedProducts}>
                  {transaction.products?.map((p, i) => (
                    <View key={i} style={styles.expandedProduct}>
                      <View style={styles.transactionHeader}>
                        <Text style={styles.expandedName}>{p.name}</Text>
                        <Text
                          style={[
                            styles.transactionDetail,
                            { color: Colors.primary },
                          ]}
                        >
                          {p.totalAmount?.toLocaleString()} UZS
                        </Text>
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDetail}>{p.model}</Text>
                        {isOwner && (
                          <Text
                            style={[
                              styles.transactionDetail,
                              { color: Colors.success },
                            ]}
                          >
                            +{p.totalProfit?.toLocaleString()} UZS
                          </Text>
                        )}
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDetail}>
                          {p.quantity} x {p.priceAtSale?.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  filterSection: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dateInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  dateSeparator: {
    color: Colors.textLight,
    fontSize: 16,
  },
  outletScroll: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: "500", fontSize: 13 },
  chipTextActive: { color: Colors.white },
  filterBtns: { flexDirection: "row", gap: 8 },
  filterBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  filterBtnText: { color: Colors.white, fontWeight: "600" },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  clearBtnText: { color: Colors.textLight, fontWeight: "600" },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultText: { color: Colors.textLight, fontSize: 13 },
  list: { padding: 16 },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transactionProduct: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  transactionTime: { fontSize: 12, color: Colors.textLight },
  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionDetail: { fontSize: 13, color: Colors.textLight },
  expandedProducts: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  expandedProduct: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expandedName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  dateSection: { marginBottom: 12 },
  dateField: { flex: 1 },
  dateLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
    fontWeight: "600",
  },
  dateInputRow: { flexDirection: "row", alignItems: "center" },
  dateSegment: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    textAlign: "center",
    fontSize: 12,
  },
  dateDash: { color: Colors.textLight, marginHorizontal: 4, fontSize: 16 },
});
