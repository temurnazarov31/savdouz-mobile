import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import { formatPrice } from "../../constants/formatNumber";
import useRole from "../../hooks/useRole";
import { get } from "../../services/api";
import NewSale from "../transaction/new";

export default function Reports() {
  // Outlet's reports
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);

  // Loading and refreshing
  const [loading, setLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal and expandedTransaction
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [expandedTransaction, setExpandedTransaction] = useState(null);

  // Worker's permissions and role separation
  const { isOwner, role } = useRole();

  const { t } = useTranslation();

  const fetchOutlets = async () => {
    try {
      const isWorker = role === "worker";
      if (isWorker) {
        const store = await get("/stores/my-store");
        const warehouse = await get("/warehouses/my-warehouse");
        const outletId =
          store?.data?.store?._id || warehouse?.data?.warehouse?._id;

        setSelectedStore(store?.data?.store || null);
        setSelectedWarehouse(warehouse?.data?.warehouse || null);
        if (outletId) {
          fetchReport(outletId);
        }
        return;
      }

      const store = await get("/stores");
      const warehouse = await get("/warehouses");
      setStores(store.data.stores);
      setWarehouses(warehouse.data.warehouses);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setStoresLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (role === null) return;
      fetchOutlets();
    }, [role, isOwner]),
  );

  const fetchReport = async (outletId) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [reportData, summaryData] = await Promise.all([
        get(`/transactions/store/${outletId}/daily?date=${today}`),
        get(`/transactions/store/${outletId}/summary?days=7`),
      ]);

      setReport(reportData.data.report || reportData.data);
      setSummary(summaryData.data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    fetchReport(store._id);
  };

  const onRefresh = async () => {
    const outletId = selectedStore?._id || selectedWarehouse?._id;
    if (!outletId) return;
    await fetchReport(outletId);
    setRefreshing(false);
  };

  if (storesLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]} // Android
          tintColor={Colors.primary} // iOS
        />
      }
    >
      <Modal
        visible={saleModalVisible}
        animationType="slide"
        onRequestClose={() => setSaleModalVisible(false)}
      >
        <NewSale onClose={() => setSaleModalVisible(false)} />
      </Modal>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t("reports.title")}</Text>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push("transaction/history")}
          >
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={() => setSaleModalVisible(true)}
        >
          <Text style={styles.newSaleButtonText}>
            {t("reports.transaction")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selector — Stores & Warehouses */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("reports.store")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Stores */}
            {stores.map((store) => (
              <TouchableOpacity
                key={store._id}
                style={[
                  styles.storeChip,
                  selectedStore?._id === store._id && styles.storeChipActive,
                ]}
                onPress={() => handleSelectStore(store)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedStore?._id === store._id &&
                      styles.storeChipTextActive,
                  ]}
                >
                  🏪 {store.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Warehouses */}
            {warehouses.map((warehouse) => (
              <TouchableOpacity
                key={warehouse._id}
                style={[
                  styles.storeChip,
                  selectedStore?._id === warehouse._id &&
                    styles.storeChipActive,
                ]}
                onPress={() => handleSelectStore(warehouse)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedStore?._id === warehouse._id &&
                      styles.storeChipTextActive,
                  ]}
                >
                  🏭 {warehouse.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && selectedStore && (
        <>
          {/* 7 Day Summary */}
          {isOwner && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t("reports.weekly")}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>
                    {t("reports.totalSales")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatPrice(summary?.totalIncome) || 0}
                  </Text>
                </View>
                {isOwner && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>
                      {t("reports.totalRevenue")}
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: Colors.success }]}
                    >
                      {formatPrice(summary?.totalProfit) || 0}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>
                    {t("reports.salesCount")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {summary?.totalTransactions || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {/* Today's Report */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("reports.today")}</Text>

            {report?.totalTransactions === 0 || !report?.transactions ? (
              <Text style={styles.empty}>
                {t("transactions.noSales")}
              </Text>
            ) : (
              <>
                <View style={styles.todayStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{t("reports.income")}</Text>
                    <Text style={styles.statValue}>
                      {formatPrice(report?.totalIncome) || 0}
                    </Text>
                  </View>
                  {isOwner && (
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>
                        {t("reports.profit")}
                      </Text>
                      <Text
                        style={[styles.statValue, { color: Colors.success }]}
                      >
                        {formatPrice(report?.totalProfit) || 0}
                      </Text>
                    </View>
                  )}
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {t("reports.salesCount")}
                    </Text>
                    <Text style={styles.statValue}>
                      {report?.totalTransactions || 0}
                    </Text>
                  </View>
                </View>

                {/* Transaction List */}
                {report?.transactions?.map((transaction, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.transactionCard}
                    onPress={() =>
                      setExpandedTransaction(
                        expandedTransaction === index ? null : index,
                      )
                    }
                  >
                    {/* Row 1 - Time & Products Count */}
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionProduct}>
                        {transaction.products?.length} {t("reports.product")}
                        {transaction.products?.length > 1 ? t("common.plural") : ""}
                      </Text>
                      <Text style={styles.transactionTime}>
                        {new Date(transaction.createdAt).toLocaleTimeString(
                          "uz-UZ",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Tashkent",
                          },
                        )}
                      </Text>
                    </View>

                    {/* Row 2 - Total Quantity & Total Amount */}
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDetail}>
                        {t("common.quantity")} - {transaction.totalQuantity} |{" "}
                        {transaction.paymentMethod === "naqd"
                          ? t("transactions.cash")
                          : t("transactions.card")}{" "}
                        |{" "}
                        {transaction.priceType === "bulk"
                          ? t("transactions.bulk")
                          : t("transactions.retail")}
                      </Text>
                      <Text
                        style={[
                          styles.transactionDetail,
                          { color: Colors.primary },
                        ]}
                      >
                        {transaction.totalAmount?.toLocaleString()} UZS
                      </Text>
                    </View>

                    {/* Row 3 - Profit */}
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

                    {/* Expanded - Show all products */}
                    {expandedTransaction === index && (
                      <View style={styles.expandedProducts}>
                        {transaction.products?.map((p, i) => (
                          <View key={i} style={styles.expandedProduct}>
                            {/* Row 1 - Name */}
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
                            {/* Row 2 - Model & Profit */}
                            <View style={styles.transactionDetails}>
                              <Text style={styles.transactionDetail}>
                                {p.model}
                              </Text>
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
                            {/* Row 3 - Quantity & Price Type */}
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
              </>
            )}
          </View>
        </>
      )}
      {!selectedStore && !loading && (
        <Text style={styles.empty}>{t("transactions.noSales")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
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
    marginBottom: 20,
  },
  newSaleButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 50,
  },
  newSaleButtonText: {
    textAlign: "center",
    color: Colors.white,
    fontWeight: "600",
    fontSize: 30,
    marginRight: 20,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  storeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  storeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  storeChipText: {
    color: Colors.text,
    fontWeight: "500",
  },
  storeChipTextActive: {
    color: Colors.white,
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
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  todayStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
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
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
  },
  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionDetail: {
    fontSize: 13,
    color: Colors.textLight,
  },
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
  expandedName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  historyBtn: {
    padding: 8,
  },
});
