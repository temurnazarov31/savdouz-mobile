import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Colors from "../constants/colors";

// Single shimmer bar
export function SkeletonBox({ width, height, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Outlet card skeleton
export function OutletCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBox width="50%" height={16} />
        <SkeletonBox width={60} height={22} borderRadius={20} />
      </View>
      <View style={styles.storeInfo}>
        <View style={styles.statItem}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={50} height={12} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.statItem}>
          <SkeletonBox width={24} height={24} borderRadius={12} />
          <SkeletonBox width={60} height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
}

// Product card skeleton
export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <SkeletonBox width="60%" height={15} />
        <SkeletonBox width="40%" height={12} style={{ marginTop: 6 }} />
        <SkeletonBox width="30%" height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.productPrices}>
        <SkeletonBox width={80} height={12} />
        <SkeletonBox width={80} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

// Client card skeleton
export function ClientCardSkeleton() {
  return (
    <View style={styles.clientCard}>
      <SkeletonBox width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="50%" height={16} />
        <SkeletonBox width="35%" height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <SkeletonBox width={70} height={16} />
        <SkeletonBox width={40} height={11} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

// Transaction card skeleton
export function TransactionCardSkeleton() {
  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <SkeletonBox width="40%" height={16} />
        <SkeletonBox width="30%" height={13} />
      </View>
      <View style={[styles.transactionHeader, { marginTop: 8 }]}>
        <SkeletonBox width="55%" height={13} />
        <SkeletonBox width="25%" height={13} />
      </View>
      <View style={[styles.transactionHeader, { marginTop: 8 }]}>
        <SkeletonBox width="30%" height={13} />
        <SkeletonBox width="35%" height={13} />
      </View>
    </View>
  );
}

// Report summary skeleton
export function ReportSummarySkeleton() {
  return (
    <View style={styles.summaryCard}>
      <SkeletonBox width="40%" height={16} style={{ marginBottom: 16 }} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <SkeletonBox width={60} height={12} />
          <SkeletonBox width={80} height={20} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.summaryItem}>
          <SkeletonBox width={60} height={12} />
          <SkeletonBox width={80} height={20} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.summaryItem}>
          <SkeletonBox width={40} height={12} />
          <SkeletonBox width={40} height={20} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
}

// Generic list skeleton — renders N skeleton cards
export function SkeletonList({ count = 5, type = "outlet" }) {
  const skeletons = Array.from({ length: count });
  const components = {
    outlet: OutletCardSkeleton,
    product: ProductCardSkeleton,
    client: ClientCardSkeleton,
    transaction: TransactionCardSkeleton,
  };
  const Skeleton = components[type] || OutletCardSkeleton;

  return (
    <>
      {skeletons.map((_, i) => (
        <Skeleton key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  statItem: { alignItems: "center" },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productInfo: { flex: 1 },
  productPrices: { alignItems: "flex-end", gap: 4 },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center" },
});
