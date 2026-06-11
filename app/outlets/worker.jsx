import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import { formatPrice } from "../../constants/formatNumber";
import useRole from "../../hooks/useRole";
import { get, getCached } from "../../services/api";

export default function WorkersStats() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const { isOwner } = useRole();
  const { t } = useTranslation();

  const fetchData = async () => {
    try {
      const [storesData, warehousesData, txData] = await Promise.all([
        getCached("/outlets?type=store"),
        getCached("/outlets?type=warehouse"),
        get("/transactions?"),
      ]);

      const allOutlets = [
        ...(storesData.data?.outlets || []),
        ...(warehousesData.data?.outlets || []),
      ];
      setOutlets(allOutlets);
      setTransactions(txData.data?.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Build worker stats from transactions
  const workerMap = {};
  transactions.forEach((tx) => {
    const id = tx.soldBy?._id;
    const name = tx.soldBy?.name;
    if (!id) return;
    if (!workerMap[id]) {
      workerMap[id] = {
        id,
        name,
        salesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
      };
    }
    workerMap[id].salesCount += 1;
    workerMap[id].totalRevenue += tx.totalAmount || 0;
    workerMap[id].totalProfit += tx.totalProfit || 0;
  });

  const workers = Object.values(workerMap).sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );

  // All workers across all outlets
  const allWorkers = [];
  outlets.forEach((outlet) => {
    outlet.workers?.forEach((w) => {
      if (!allWorkers.find((x) => x.user === w.user?.toString())) {
        allWorkers.push({
          ...w,
          outletName: outlet.name,
          outletId: outlet._id,
        });
      }
    });
  });

  const totalRevenue = transactions.reduce(
    (s, t) => s + (t.totalAmount || 0),
    0,
  );
  const totalProfit = transactions.reduce(
    (s, t) => s + (t.totalProfit || 0),
    0,
  );
  const maxRevenue = Math.max(...workers.map((w) => w.totalRevenue), 1);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("workers.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Overview */}
      <View style={styles.cardRow}>
        <View
          style={[
            styles.overviewCard,
            {
              borderColor: Colors.primary + "40",
              backgroundColor: Colors.primary + "08",
            },
          ]}
        >
          <Text style={[styles.overviewValue, { color: Colors.primary }]}>
            {allWorkers.length}
          </Text>
          <Text style={styles.overviewLabel}>{t("workers.totalWorkers")}</Text>
        </View>
        <View
          style={[
            styles.overviewCard,
            {
              borderColor: Colors.success + "40",
              backgroundColor: Colors.success + "08",
            },
          ]}
        >
          <Text style={[styles.overviewValue, { color: Colors.success }]}>
            {workers.length}
          </Text>
          <Text style={styles.overviewLabel}>{t("workers.activeSellers")}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View
          style={[
            styles.overviewCard,
            {
              borderColor: Colors.primary + "40",
              backgroundColor: Colors.primary + "08",
            },
          ]}
        >
          <Text
            style={[
              styles.overviewValue,
              { color: Colors.primary, fontSize: 16 },
            ]}
          >
            {formatPrice(totalRevenue)}
          </Text>
          <Text style={styles.overviewLabel}>{t("reports.totalSales")}</Text>
        </View>
        {isOwner && (
          <View
            style={[
              styles.overviewCard,
              {
                borderColor: Colors.success + "40",
                backgroundColor: Colors.success + "08",
              },
            ]}
          >
            <Text
              style={[
                styles.overviewValue,
                { color: Colors.success, fontSize: 16 },
              ]}
            >
              {formatPrice(totalProfit)}
            </Text>
            <Text style={styles.overviewLabel}>{t("reports.totalRevenue")}</Text>
          </View>
        )}
      </View>

      {/* Worker Rankings */}
      {workers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("workers.salesRanking")}</Text>
          {workers.map((w, i) => {
            const pct = (w.totalRevenue / maxRevenue) * 100;
            const avgSale =
              w.salesCount > 0 ? Math.round(w.totalRevenue / w.salesCount) : 0;
            return (
              <View key={w.id} style={styles.workerCard}>
                <View style={styles.workerRankBadge}>
                  <Text style={styles.workerRankText}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={styles.workerName}>{w.name}</Text>
                    <Text
                      style={[styles.workerRevenue, { color: Colors.primary }]}
                    >
                      {formatPrice(w.totalRevenue)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${pct}%`,
                          backgroundColor:
                            i === 0
                              ? Colors.success
                              : i === 1
                                ? Colors.primary
                                : Colors.textLight,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={styles.workerStat}>{w.salesCount} {t("workers.sales")}</Text>
                    <Text style={styles.workerStat}>
                      {t("workers.avg")} {formatPrice(avgSale)}
                    </Text>
                    {isOwner && (
                      <Text
                        style={[styles.workerStat, { color: Colors.success }]}
                      >
                        +{formatPrice(w.totalProfit)} {t("stores.profit")}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Workers per outlet */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("workers.byOutlet")}</Text>
        {outlets
          .filter((o) => o.workers?.length > 0)
          .map((outlet) => (
            <View key={outlet._id} style={styles.outletCard}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <MaterialCommunityIcons
                    name={outlet.type === "store" ? "store" : "warehouse"}
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.outletName}>{outlet.name}</Text>
                </View>
                <View style={styles.workerCountBadge}>
                  <Text style={styles.workerCountText}>
                    {outlet.workers?.length}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                {outlet.workers?.map((w) => (
                  <View key={w._id} style={styles.workerChip}>
                    <View style={styles.workerChipAvatar}>
                      <Text style={styles.workerChipAvatarText}>
                        {w.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <Text style={styles.workerChipName}>{w.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        {outlets.filter((o) => o.workers?.length > 0).length === 0 && (
          <Text style={styles.empty}>{t("workers.noWorkersAssigned")}</Text>
        )}
      </View>

      {/* Unassigned workers */}
      {allWorkers.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.empty}>{t("workers.empty")}</Text>
        </View>
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
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  cardRow: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
    marginBottom: 0,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  overviewValue: { fontSize: 22, fontWeight: "700" },
  overviewLabel: { fontSize: 12, color: Colors.textLight, textAlign: "center" },
  section: {
    margin: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  workerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  workerRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  workerRankText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  workerName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  workerRevenue: { fontSize: 14, fontWeight: "700" },
  workerStat: { fontSize: 11, color: Colors.textLight },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  outletCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outletName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  workerCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  workerCountText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  workerChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  workerChipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  workerChipAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
  },
  workerChipName: { fontSize: 12, fontWeight: "600", color: Colors.text },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 20,
    fontSize: 15,
  },
});
