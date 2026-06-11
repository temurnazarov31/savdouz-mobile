import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import useRole from "../../hooks/useRole";
import { get, getCached } from "../../services/api";

const THRESHOLD = 5;

export default function Restock() {
  const { t } = useTranslation();
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [lowStockMap, setLowStockMap] = useState({});
  const [loading, setLoading] = useState(true);

  const { role, isOwner } = useRole();
  const isWorker = role === "worker";

  // Track which outlets have been "acknowledged" (red dot removed)
  const [acknowledged, setAcknowledged] = useState({});

  const fetchOutlets = async () => {
    try {
      setLoading(true);

      let all = [];

      if (isWorker) {
        const data = await getCached("/outlets/my-outlet");
        const outlet = data?.data?.outlet;
        if (outlet) {
          all = [outlet];
          setOutlets(all);
          setSelectedOutlet(outlet);
        }
      } else {
        const [storesData, warehousesData] = await Promise.all([
          getCached("/outlets?type=store"),
          getCached("/outlets?type=warehouse"),
        ]);
        all = [
          ...(storesData.data?.outlets || []),
          ...(warehousesData.data?.outlets || []),
        ];
        setOutlets(all);
      }

      // Fetch low stock counts
      const counts = {};
      await Promise.all(
        all.map(async (outlet) => {
          try {
            const data = await get(
              `/outlets/${outlet._id}/low-stock?threshold=${THRESHOLD}`,
            );
            counts[outlet._id] = data.data?.products || [];
          } catch {
            counts[outlet._id] = [];
          }
        }),
      );
      setLowStockMap(counts);

      // Auto-select first outlet with low stock
      const firstWithIssue = all.find((o) => (counts[o._id]?.length || 0) > 0);
      if (firstWithIssue) {
        setSelectedOutlet(firstWithIssue);
      } else if (all.length > 0 && !selectedOutlet) {
        setSelectedOutlet(all[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutlets();
    }, []),
  );

  const handleSelectOutlet = (outlet) => {
    setSelectedOutlet(outlet);
    // Mark as acknowledged — red dot removed
    setAcknowledged((prev) => ({ ...prev, [outlet._id]: true }));
  };

  const currentProducts = selectedOutlet
    ? lowStockMap[selectedOutlet._id] || []
    : [];

  const hasLowStock = (outletId) => {
    const count = lowStockMap[outletId]?.length || 0;
    return count > 0 && !acknowledged[outletId];
  };

  const totalAlerts = outlets.reduce((sum, o) => {
    return sum + (hasLowStock(o._id) ? 1 : 0);
  }, 0);

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
          <Text style={styles.headerTitle}>{t("restock.title")}</Text>
          {totalAlerts > 0 && (
            <Text style={styles.headerSubtitle}>
              {totalAlerts} {t("restock.outletsNeedAttention")}
            </Text>
          )}
        </View>

        <View style={styles.headerBadgeWrap}>
          <Ionicons name="warning-outline" size={24} color={Colors.warning} />
          {totalAlerts > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalAlerts}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom outlet selector */}
      {isOwner && (
        <View style={styles.bottomBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomBarContent}
          >
            {outlets.map((outlet) => {
              const active = selectedOutlet?._id === outlet._id;
              const alert = hasLowStock(outlet._id);
              const count = lowStockMap[outlet._id]?.length || 0;

              return (
                <TouchableOpacity
                  key={outlet._id}
                  style={[styles.outletChip, active && styles.outletChipActive]}
                  onPress={() => handleSelectOutlet(outlet)}
                >
                  {outlet.type === "store" ? (
                    <Ionicons
                      name={"storefront-outline"}
                      size={20}
                      color={Colors.textLight}
                    />
                  ) : (
                    <MaterialIcons
                      name="warehouse"
                      size={20}
                      color={Colors.textLight}
                    />
                  )}
                  <Text
                    style={[
                      styles.outletChipText,
                      active && styles.outletChipTextActive,
                    ]}
                  >
                    {outlet.name}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        alert ? styles.chipBadgeAlert : styles.chipBadgeOk,
                      ]}
                    >
                      <Text style={styles.chipBadgeText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Product list */}
      {selectedOutlet ? (
        <FlatList
          data={currentProducts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListHeaderComponent={
            <Text style={styles.outletLabel}>
              {selectedOutlet.name} —{" "}
              <Text style={{ color: Colors.warning }}>
                {currentProducts.length} {t("restock.lowStock")}
              </Text>
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="checkmark-circle-outline"
                size={64}
                color={Colors.success}
              />
              <Text style={styles.emptyTitle}>{t("restock.allStocked")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("restock.noProductsBelowThreshold")} {THRESHOLD}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productLeft}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productModel}>{t("products.model")}: {item.model}</Text>
                <View style={styles.stockRow}>
                  <View
                    style={[
                      styles.stockBadge,
                      item.quantity === 0
                        ? styles.stockBadgeEmpty
                        : styles.stockBadgeLow,
                    ]}
                  >
                    <Text style={styles.stockBadgeText}>
                      {item.quantity === 0
                        ? t("stores.outOfStock")
                        : `${item.quantity} ${t("stores.left")}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t("stores.noStores")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
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
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 2,
  },
  headerBadgeWrap: { position: "relative" },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "700" },

  // Outlet label
  outletLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },

  // Product card
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productLeft: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  productModel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  stockRow: { flexDirection: "row", marginTop: 8 },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stockBadgeLow: { backgroundColor: Colors.warning + "20" },
  stockBadgeEmpty: { backgroundColor: Colors.error + "20" },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.warning,
  },

  // Restock button
  restockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  restockBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 13,
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    marginTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Bottom bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  bottomBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  outletChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  outletChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  outletChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  },
  outletChipTextActive: { color: Colors.white },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  chipBadgeAlert: { backgroundColor: Colors.error },
  chipBadgeOk: { backgroundColor: Colors.success },
  chipBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "700" },
});
