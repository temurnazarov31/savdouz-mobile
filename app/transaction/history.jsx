import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SkeletonList } from "../../components/skeleton";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, getCached } from "../../services/api";

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { isOwner, role } = useRole();
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { t } = useTranslation();

  const fetchOutlets = async () => {
    try {
      if (isOwner) {
        const [storesData, warehousesData] = await Promise.all([
          getCached("/outlets?type=store"),
          getCached("/outlets?type=warehouse"),
        ]);
        setStores(storesData.data?.outlets || []);
        setWarehouses(warehousesData.data?.outlets || []);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const fetchTransactions = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let url = `/transactions?page=${pageNum}&limit=20`;
      if (selectedOutletId) url += `&outletId=${selectedOutletId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const data = await get(url);
      const newTransactions = data.data?.transactions || [];

      if (append) {
        setTransactions((prev) => [...prev, ...newTransactions]);
      } else {
        setTransactions(newTransactions);
      }

      setHasMore(newTransactions.length === 20);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutlets();
      fetchTransactions();
    }, [role, isOwner]),
  );

  const handleFilter = () => {
    setPage(1);
    setHasMore(true);
    fetchTransactions(1, false); // fresh fetch
  };

  const handleClearFilter = () => {
    setSelectedOutletId(null);
    setStartDate("");
    setEndDate("");
    setPage(1);
    setHasMore(true);
    setTimeout(() => fetchTransactions(1, false), 100);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
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

        <Text style={styles.outletTitle}>{t("stores.title")}:</Text>
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
                  {store.name}
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
                  {warehouse.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterBtns}>
          <TouchableOpacity style={styles.filterBtn} onPress={handleFilter}>
            <Ionicons name="search-outline" size={16} color={Colors.white} />
            <Text style={styles.filterBtnText}>{t("common.filter")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilter}>
            <Ionicons name="close-outline" size={20} color={Colors.error} />
            <Text style={styles.clearBtnText}>{t("common.clear")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Transaction List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={5} type="transaction" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("transactions.noTransactions")}</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ padding: 16 }}
              />
            ) : null
          }
          renderItem={({ item: transaction }) => (
            <TouchableOpacity
              style={styles.transactionCard}
              onPress={() => setSelectedTransaction(transaction)}
            >
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
                  {transaction.totalAmount?.toLocaleString()}
                </Text>
              </View>
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
                    +{transaction.totalProfit?.toLocaleString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTransaction} transparent animationType="slide">
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredModal, { maxHeight: "95%" }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={styles.centeredTitle}>
                {selectedTransaction?.products?.length} {t("reports.product")}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <Ionicons name="close" size={32} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Meta info */}
            <View
              style={{
                borderRadius: 12,
                marginBottom: 12,
                gap: 6,
              }}
            >
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {t("common.date")}
                </Text>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {new Date(selectedTransaction?.createdAt).toLocaleDateString(
                    "uz-UZ",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone: "Asia/Tashkent",
                    },
                  )}{" "}
                  {new Date(selectedTransaction?.createdAt).toLocaleTimeString(
                    "uz-UZ",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Tashkent",
                    },
                  )}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {t("transactions.paymentMethod")}
                </Text>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {selectedTransaction?.paymentMethod === "naqd"
                    ? t("transactions.cash")
                    : t("transactions.card")}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {t("reports.soldBy")}
                </Text>
                <Text style={[styles.transactionDetail, { fontSize: 18 }]}>
                  {selectedTransaction?.soldBy?.name}
                </Text>
              </View>
            </View>

            {/* Products */}
            <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
              {selectedTransaction?.products?.map((p, i) => (
                <View key={i}>
                  <View style={styles.expandedProduct}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.expandedName}>{p.name}</Text>
                      <Text
                        style={[
                          styles.transactionDetail,
                          { color: Colors.primary, fontSize: 18 },
                        ]}
                      >
                        {p.totalAmount?.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDetail}>{p.model}</Text>
                      {isOwner && (
                        <Text
                          style={[
                            styles.transactionDetail,
                            { color: Colors.success, fontSize: 18 },
                          ]}
                        >
                          +{p.totalProfit?.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.transactionDetail}>
                      {p.quantity} x {p.priceAtSale?.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Totals */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                marginTop: 12,
                paddingTop: 12,
                gap: 6,
              }}
            >
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDetail}>
                  {t("common.quantity")}
                </Text>
                <Text style={styles.transactionDetail}>
                  {selectedTransaction?.totalQuantity}
                </Text>
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDetail}>
                  {t("transactions.priceType")}
                </Text>
                <Text style={styles.transactionDetail}>
                  {selectedTransaction?.priceType === "wholesale"
                    ? t("transactions.bulk")
                    : t("transactions.retail")}
                </Text>
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDetail}>
                  {t("transactions.saleSource")}
                </Text>
                <Text style={styles.transactionDetail}>
                  {selectedTransaction?.saleSource === "store"
                    ? t("stores.store")
                    : t("warehouse.warehouse")}
                </Text>
              </View>

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: Colors.border,
                  marginVertical: 4,
                }}
              />

              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDetail, { fontWeight: "600" }]}>
                  {t("transactions.subtotal")}
                </Text>
                <Text style={[styles.transactionDetail, { fontWeight: "600" }]}>
                  {selectedTransaction?.totalAmount?.toLocaleString()}
                </Text>
              </View>

              {selectedTransaction?.discount > 0 && (
                <View style={styles.transactionDetails}>
                  <Text
                    style={[styles.transactionDetail, { color: Colors.error }]}
                  >
                    {t("transactions.discount")}
                  </Text>
                  <Text
                    style={[styles.transactionDetail, { color: Colors.error }]}
                  >
                    -{selectedTransaction?.discount?.toLocaleString()}
                  </Text>
                </View>
              )}

              {selectedTransaction?.debt > 0 && (
                <View style={styles.transactionDetails}>
                  <Text
                    style={[styles.transactionDetail, { color: Colors.error }]}
                  >
                    {t("clients.debt")}
                  </Text>
                  <Text
                    style={[styles.transactionDetail, { color: Colors.error }]}
                  >
                    -{selectedTransaction?.debt?.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.transactionDetails}>
                <Text
                  style={[
                    styles.transactionDetail,
                    { fontWeight: "700", color: Colors.text },
                  ]}
                >
                  {t("transactions.paidAmount")}
                </Text>
                <Text
                  style={[
                    styles.transactionDetail,
                    { color: Colors.primary, fontWeight: "700" },
                  ]}
                >
                  {selectedTransaction?.paidAmount?.toLocaleString()}
                </Text>
              </View>

              {selectedTransaction?.client && (
                <>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: Colors.border,
                      marginVertical: 4,
                    }}
                  />
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDetail}>
                      {t("clients.title")}
                    </Text>
                    <Text
                      style={[
                        styles.transactionDetail,
                        { color: Colors.primary },
                      ]}
                    >
                      {selectedTransaction?.client?.name || t("clients.title")}
                    </Text>
                  </View>
                </>
              )}

              {isOwner && (
                <>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: Colors.border,
                      marginVertical: 4,
                    }}
                  />
                  <View style={styles.transactionDetails}>
                    <Text
                      style={[styles.transactionDetail, { fontWeight: "600" }]}
                    >
                      {t("reports.totalRevenue")}
                    </Text>
                    <Text
                      style={[
                        styles.transactionDetail,
                        { color: Colors.success, fontWeight: "600" },
                      ]}
                    >
                      +{selectedTransaction?.totalProfit?.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
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
  outletTitle: {
    color: Colors.textLight,
    fontSize: 16,
    padding: 10,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  filterBtnText: { color: Colors.white, fontWeight: "600" },
  clearBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  clearBtnText: { color: Colors.error, fontWeight: "600" },
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
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
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
  expandedProduct: {
    paddingVertical: 8,
    marginBottom: 4,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: Colors.border,
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
