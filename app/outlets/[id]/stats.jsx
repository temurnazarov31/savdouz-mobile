import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Colors from "../../../constants/colors";
import { formatPrice } from "../../../constants/formatNumber";
import { get } from "../../../services/api";

export default function StoreStats() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();

  const [products, setProducts] = useState([]);
  const [outlet, setOutlet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [outletData, productsData] = await Promise.all([
          get(`/outlets/${id}`),
          get(`/outlets/products/${id}`),
        ]);
        setOutlet(outletData.data?.outlet);
        setProducts(productsData.data?.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ─── Computed stats ────────────────────────────────────────
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

  const totalCostValue = products.reduce(
    (sum, p) => sum + (p.pricing?.costPrice || 0) * (p.quantity || 0),
    0,
  );
  const totalRetailValue = products.reduce(
    (sum, p) => sum + (p.pricing?.retailPrice || 0) * (p.quantity || 0),
    0,
  );
  const totalWholesaleValue = products.reduce(
    (sum, p) => sum + (p.pricing?.wholesalePrice || 0) * (p.quantity || 0),
    0,
  );
  const potentialProfit = totalRetailValue - totalCostValue;

  const outOfStock = products.filter((p) => p.quantity === 0).length;
  const lowStock = products.filter(
    (p) => p.quantity > 0 && p.quantity <= 5,
  ).length;

  // Sort by retail value descending
  const sortedProducts = [...products].sort(
    (a, b) =>
      (b.pricing?.retailPrice || 0) * (b.quantity || 0) -
      (a.pricing?.retailPrice || 0) * (a.quantity || 0),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{outlet?.name}</Text>
          <Text style={styles.headerSubtitle}>
            {t("stores.inventoryStats")}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={24}
          color={Colors.primary}
        />
      </View>

      <FlatList
        data={sortedProducts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Overview cards */}
            <View style={styles.row}>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: Colors.primary + "40",
                    backgroundColor: Colors.primary + "08",
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: Colors.primary }]}>
                  {totalProducts}
                </Text>
                <Text style={styles.statLabel}>{t("products.title")}</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: Colors.success + "40",
                    backgroundColor: Colors.success + "08",
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  {totalQuantity.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>{t("stores.totalUnits")}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: Colors.error + "40",
                    backgroundColor: Colors.error + "08",
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: Colors.error }]}>
                  {outOfStock}
                </Text>
                <Text style={styles.statLabel}>{t("stores.outOfStock")}</Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: Colors.warning + "40",
                    backgroundColor: Colors.warning + "08",
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: Colors.warning }]}>
                  {lowStock}
                </Text>
                <Text style={styles.statLabel}>{t("stores.lowStock")}</Text>
              </View>
            </View>

            {/* Value summary */}
            <View style={styles.valueCard}>
              <Text style={styles.valueCardTitle}>
                {t("stores.inventoryValue")}
              </Text>

              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{t("stores.costValue")}</Text>
                <Text style={[styles.valueAmount, { color: Colors.text }]}>
                  {formatPrice(totalCostValue)}
                </Text>
              </View>

              <View style={[styles.divider]} />

              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>
                  {t("stores.wholesaleValue")}
                </Text>
                <Text style={[styles.valueAmount, { color: Colors.primary }]}>
                  {formatPrice(totalWholesaleValue)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>{t("stores.retailValue")}</Text>
                <Text style={[styles.valueAmount, { color: Colors.primary }]}>
                  {formatPrice(totalRetailValue)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.valueRow}>
                <Text style={[styles.valueLabel, { fontWeight: "700" }]}>
                  {t("stores.potentialProfit")}
                </Text>
                <Text
                  style={[
                    styles.valueAmount,
                    { color: Colors.success, fontWeight: "700" },
                  ]}
                >
                  {formatPrice(potentialProfit)}
                </Text>
              </View>
            </View>

            {/* Profit margin bar */}
            <View style={styles.marginCard}>
              <View style={styles.marginHeader}>
                <Text style={styles.marginTitle}>
                  {t("reports.profitMargin")}
                </Text>
                <Text style={[styles.marginPct, { color: Colors.success }]}>
                  {totalRetailValue > 0
                    ? `${Math.round((potentialProfit / totalRetailValue) * 100)}%`
                    : "0%"}
                </Text>
              </View>
              <View style={styles.marginBar}>
                <View
                  style={[
                    styles.marginFill,
                    {
                      flex: totalCostValue,
                      backgroundColor: Colors.error + "80",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.marginFill,
                    {
                      flex: potentialProfit > 0 ? potentialProfit : 0,
                      backgroundColor: Colors.success,
                    },
                  ]}
                />
              </View>
              <View style={styles.marginLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: Colors.error + "80" },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {t("products.initialPrice")}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: Colors.success },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {t("reports.totalRevenue")}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {t("stores.productsByValue")} ({sortedProducts.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t("products.noProducts")}</Text>
        }
        renderItem={({ item, index }) => {
          const itemRetailValue =
            (item.pricing?.retailPrice || 0) * (item.quantity || 0);
          const itemCostValue =
            (item.pricing?.costPrice || 0) * (item.quantity || 0);
          const itemProfit = itemRetailValue - itemCostValue;
          const pct =
            totalRetailValue > 0
              ? (itemRetailValue / totalRetailValue) * 100
              : 0;

          return (
            <View
              style={[
                styles.productCard,
                item.quantity === 0 && styles.productCardEmpty,
              ]}
            >
              <View style={styles.productRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productMain}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.quantity === 0 ? (
                    <View style={styles.emptyBadge}>
                      <Text style={styles.emptyBadgeText}>
                        {t("stores.outOfStock")}
                      </Text>
                    </View>
                  ) : item.quantity <= 5 ? (
                    <View style={styles.lowBadge}>
                      <Text style={styles.lowBadgeText}>
                        {item.quantity} {t("stores.left")}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.qtyText}>
                      {item.quantity} {t("stores.units")}
                    </Text>
                  )}
                </View>
                <Text style={styles.productModel}>{item.model}</Text>

                {/* Progress bar showing share of total value */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceItem}>
                    {t("products.initialPrice")}: {formatPrice(itemCostValue)}
                  </Text>
                  <Text style={[styles.priceItem, { color: Colors.primary }]}>
                    {t("transactions.retail")}: {formatPrice(itemRetailValue)}
                  </Text>
                  <Text style={[styles.priceItem, { color: Colors.success }]}>
                    +{formatPrice(itemProfit)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "500",
  },

  valueCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  valueAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  marginCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marginHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  marginTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  marginPct: {
    fontSize: 22,
    fontWeight: "700",
  },
  marginBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.border,
  },
  marginFill: {
    height: "100%",
  },
  marginLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textLight,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },

  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  productCardEmpty: {
    opacity: 0.5,
  },
  productRank: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textLight,
  },
  productMain: { flex: 1 },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  productModel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textLight,
  },
  emptyBadge: {
    backgroundColor: Colors.error + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.error,
  },
  lowBadge: {
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.warning,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
  },
  priceItem: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: "500",
  },

  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
  },
});
