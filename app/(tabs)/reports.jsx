import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Dropdown from "../../components/dropdown";
import Colors from "../../constants/colors";
import { formatPrice } from "../../constants/formatNumber";
import useRole from "../../hooks/useRole";
import { get, getCached } from "../../services/api";

export default function Reports() {
  const [user, setUser] = useState([]);
  // Outlet's reports
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [summary, setSummary] = useState(null);

  // Loading and refreshing
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal and expandedTransaction
  const [type, setType] = useState("store");
  const [navigating, setNavigating] = useState(false);
  const [historyNavigating, setHistoryNavigating] = useState(false);

  // Worker's permissions and role separation
  const { isOwner, role } = useRole();

  const [errorMessage, setErrorMessage] = useState(null);

  const { t } = useTranslation();

  const fetchOutlets = async () => {
    try {
      if (role === "worker") {
        const outlet = await getCached("/outlets/my-outlet");
        setSelectedOutlet(outlet?.data?.outlet || null);
        fetchReport(outlet?.data?.outlet?._id);
        return;
      }

      const data = await getCached(`/outlets?type=${type}`);
      setOutlets(data.data?.outlets || []);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
      setHistoryNavigating(false);
      if (role === null) return;
      fetchOutlets();
    }, [type, role, isOwner]),
  );

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await getCached("/users/getMe");
      setUser(data.data.user);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, []),
  );

  const fetchReport = async (outletId) => {
    try {
      setLoading(true);
      const summaryData = await get(
        `/transactions/outlet/${outletId}/summary?days=7`,
      );
      setSummary(summaryData.data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutlet = (outlet) => {
    setSelectedOutlet(outlet);
    fetchReport(outlet._id);
  };

  const onRefresh = async () => {
    const outletId = selectedOutlet?._id;
    if (!outletId) return;
    await fetchReport(outletId);
    setRefreshing(false);
  };

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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.push("outlets/profile")}
            style={styles.headerRow}
          >
            <Text style={styles.headerTitle}>{user.name}</Text>
            <Feather
              name="chevron-right"
              size={24}
              color={Colors.text}
              style={{ marginTop: 6 }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyBtn, historyNavigating && { opacity: 0.6 }]}
            disabled={historyNavigating}
            onPress={() => {
              setHistoryNavigating(true);
              router.push("transaction/history");
            }}
          >
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.saleButton}>
        <TouchableOpacity
          style={[styles.newSaleButton, navigating && { opacity: 0.6 }]}
          disabled={navigating}
          onPress={() => {
            setNavigating(true);
            router.push("/transaction/new");
          }}
        >
          <Text style={styles.newSaleButtonText}>
            {t("reports.transaction")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selector — outlets & Warehouses */}
      {isOwner && (
        <View style={styles.section}>
          <View style={styles.sectionSelector}>
            <Text style={styles.sectionTitle}>{t("reports.outlet")}</Text>
            <Dropdown
              options={[
                { label: t("stores.store"), value: "store" },
                { label: t("warehouse.warehouse"), value: "warehouse" },
              ]}
              selected={type}
              onSelect={setType}
              placeholder={t("common.selectType")}
              selector={styles.selector}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Outlets */}
            {outlets.map((outlet) => (
              <TouchableOpacity
                key={outlet._id}
                style={[
                  styles.outletChip,
                  selectedOutlet?._id === outlet._id && styles.outletChipActive,
                ]}
                onPress={() => handleSelectOutlet(outlet)}
              >
                <Text
                  style={[
                    styles.outletChipText,
                    selectedOutlet?._id === outlet._id &&
                      styles.outletChipTextActive,
                  ]}
                >
                  {outlet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && selectedOutlet && (
        <>
          {/* 7 Day Summary */}
          <View style={styles.summaryTable}>
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
            {/* Weekly Table */}
            {summary?.dailyBreakdown && (
              <View style={styles.tableCard}>
                {/* Header row */}
                <View style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeader,
                      { flex: 1.5 },
                    ]}
                  >
                    {t("reports.day")}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableHeader]}>
                    {t("reports.income")}
                  </Text>
                  {isOwner && (
                    <Text style={[styles.tableCell, styles.tableHeader]}>
                      {t("reports.profit")}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeader,
                      { flex: 0.8, textAlign: "center" },
                    ]}
                  >
                    {t("reports.sales")}
                  </Text>
                </View>

                {/* Data rows */}
                {summary.dailyBreakdown.map((row, i) => {
                  const d = new Date(row.date);
                  const days = t("common.days", { returnObjects: true });
                  const dayName = days[d.getUTCDay()];
                  return (
                    <View
                      key={row._id}
                      style={[
                        styles.tableRow,
                        i % 2 === 0 && styles.tableRowEven,
                      ]}
                    >
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.tableCellBold}>{dayName}</Text>
                        <Text style={styles.tableCellSub}>
                          {new Date(row.createdAt).toLocaleDateString("uz-UZ", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            timeZone: "Asia/Tashkent",
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[styles.tableCell, { color: Colors.primary }]}
                      >
                        {formatPrice(row.totalIncome)}
                      </Text>
                      {isOwner && (
                        <Text
                          style={[styles.tableCell, { color: Colors.success }]}
                        >
                          {formatPrice(row.totalProfit)}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 0.8, textAlign: "center" },
                        ]}
                      >
                        {row.totalTransactions}
                      </Text>
                    </View>
                  );
                })}

                {/* Total row */}
                <View style={[styles.tableRow, styles.tableTotalRow]}>
                  <Text
                    style={[
                      styles.tableCellBold,
                      { flex: 1.5, color: Colors.white },
                    ]}
                  >
                    {t("reports.total")}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBold,
                      { color: Colors.white },
                    ]}
                  >
                    {formatPrice(summary.totalIncome)}
                  </Text>
                  {isOwner && (
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellBold,
                        { color: Colors.white },
                      ]}
                    >
                      {formatPrice(summary.totalProfit)}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellBold,
                      { flex: 0.8, textAlign: "center", color: Colors.white },
                    ]}
                  >
                    {summary.totalTransactions}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── NEW STATS SECTION ── */}
          {summary && (
            <View style={{ margin: 16, gap: 12 }}>
              {/* Avg sale value */}
              <View style={styles.statRow}>
                <View
                  style={[
                    styles.statBox,
                    {
                      borderColor: Colors.primary + "40",
                      backgroundColor: Colors.primary + "08",
                    },
                  ]}
                >
                  <Text style={styles.statBoxLabel}>
                    {t("reports.avgSaleValue")}
                  </Text>
                  <Text
                    style={[styles.statBoxValue, { color: Colors.primary }]}
                  >
                    {summary.totalTransactions > 0
                      ? formatPrice(
                          Math.round(
                            summary.totalIncome / summary.totalTransactions,
                          ),
                        )
                      : formatPrice(0)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statBox,
                    {
                      borderColor: Colors.success + "40",
                      backgroundColor: Colors.success + "08",
                    },
                  ]}
                >
                  <Text style={styles.statBoxLabel}>
                    {t("reports.profitMargin")}
                  </Text>
                  <Text
                    style={[styles.statBoxValue, { color: Colors.success }]}
                  >
                    {summary.totalIncome > 0
                      ? `${Math.round((summary.totalProfit / summary.totalIncome) * 100)}%`
                      : "0%"}
                  </Text>
                </View>
              </View>

              {/* Best performing day */}
              {summary.dailyBreakdown?.length > 0 &&
                (() => {
                  const best = [...summary.dailyBreakdown].sort(
                    (a, b) => b.totalIncome - a.totalIncome,
                  )[0];
                  const worst = [...summary.dailyBreakdown].sort(
                    (a, b) => a.totalIncome - b.totalIncome,
                  )[0];
                  const days = t("common.days", { returnObjects: true });
                  return (
                    <View style={styles.statRow}>
                      {/* Best/Slowest day cards — add icon above label */}
                      <View
                        style={[
                          styles.statBox,
                          {
                            borderColor: Colors.success + "40",
                            backgroundColor: Colors.success + "08",
                          },
                        ]}
                      >
                        <Ionicons
                          name="trending-up"
                          size={18}
                          color={Colors.success}
                        />
                        <Text style={styles.statBoxLabel}>
                          {t("reports.bestDay")}
                        </Text>
                        <Text
                          style={[
                            styles.statBoxValue,
                            { color: Colors.success },
                          ]}
                        >
                          {days[new Date(best.date).getUTCDay()]}
                        </Text>
                        <Text style={styles.statBoxSub}>
                          {formatPrice(best.totalIncome)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statBox,
                          {
                            borderColor: Colors.error + "40",
                            backgroundColor: Colors.error + "08",
                          },
                        ]}
                      >
                        <Ionicons
                          name="trending-down"
                          size={18}
                          color={Colors.error}
                        />
                        <Text style={styles.statBoxLabel}>
                          {t("reports.slowestDay")}
                        </Text>
                        <Text
                          style={[styles.statBoxValue, { color: Colors.error }]}
                        >
                          {days[new Date(worst.date).getUTCDay()]}
                        </Text>
                        <Text style={styles.statBoxSub}>
                          {formatPrice(worst.totalIncome)}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

              {/* Week over week comparison */}
              {summary.dailyBreakdown?.length > 0 &&
                (() => {
                  const mid = Math.floor(summary.dailyBreakdown.length / 2);
                  const firstHalf = summary.dailyBreakdown
                    .slice(0, mid)
                    .reduce((s, r) => s + r.totalIncome, 0);
                  const secondHalf = summary.dailyBreakdown
                    .slice(mid)
                    .reduce((s, r) => s + r.totalIncome, 0);
                  const diff =
                    firstHalf > 0
                      ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
                      : 0;
                  const isUp = diff >= 0;
                  return (
                    <View
                      style={[
                        styles.wowCard,
                        {
                          borderColor: isUp
                            ? Colors.success + "40"
                            : Colors.error + "40",
                          backgroundColor: isUp
                            ? Colors.success + "08"
                            : Colors.error + "08",
                        },
                      ]}
                    >
                      <Ionicons
                        name={isUp ? "trending-up" : "trending-down"}
                        size={28}
                        color={isUp ? Colors.success : Colors.error}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.wowTitle}>
                          {t("reports.periodComparison")}
                        </Text>
                        <Text
                          style={[
                            styles.wowValue,
                            { color: isUp ? Colors.success : Colors.error },
                          ]}
                        >
                          {isUp ? "+" : ""}
                          {diff}% {t("reports.vsEarlierWeek")}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

              {/* Daily avg sales count */}
              <View
                style={[
                  styles.wowCard,
                  {
                    borderColor: Colors.primary + "30",
                    backgroundColor: Colors.white,
                  },
                ]}
              >
                <Ionicons name="stats-chart" size={28} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.wowTitle}>
                    {t("reports.dailyAvgTransactions")}
                  </Text>
                  <Text style={[styles.wowValue, { color: Colors.primary }]}>
                    {summary.dailyBreakdown?.length > 0
                      ? Math.round(
                          summary.totalTransactions /
                            summary.dailyBreakdown.length,
                        )
                      : 0}{" "}
                    {t("reports.salesPerDay")}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {!selectedOutlet && !loading && (
        <Text style={styles.empty}>{t("transactions.noSales")}</Text>
      )}

      {/* Error Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.errorOverlay}>
          <View style={styles.errorModal}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>{t("common.errorTitle")}</Text>
            <Text style={styles.errorSubtitle}>{errorMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={styles.errorBtn}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.errorBtnText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  saleButton: {
    borderRadius: 18,
    padding: 20,
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
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  selector: {
    width: 140,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  outletChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.white,
  },
  outletChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  outletChipText: {
    color: Colors.text,
    fontWeight: "500",
  },
  outletChipTextActive: {
    color: Colors.white,
  },
  summaryTable: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.border,
    margin: 16,
  },
  summaryCard: {
    margin: 16,
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
  headerRow: { flexDirection: "row", alignItems: "center" },
  historyBtn: {
    padding: 8,
  },
  sourceText: { color: Colors.text },
  tableCard: {
    backgroundColor: Colors.white,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  tableRowEven: { backgroundColor: Colors.background },
  tableTotalRow: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 10,
    borderBottomStartRadius: 10,
  },
  tableHeader: { fontWeight: "600", color: Colors.textLight, fontSize: 12 },
  tableCell: { flex: 1, fontSize: 13, color: Colors.text },
  tableCellBold: { fontWeight: "600", color: Colors.text },
  tableCellSub: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  errorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
  },
  errorModal: {
    width: "100%",
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  errorSubtitle: {
    fontSize: 17,
    color: Colors.text,
  },
  errorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.error,
    borderRadius: 12,
    marginTop: 12,
  },
  errorBtnText: {
    color: Colors.white,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "500",
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statBoxSub: {
    fontSize: 12,
    color: Colors.textLight,
  },
  wowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  wowTitle: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: "500",
  },
  wowValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
});
