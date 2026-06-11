import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import { get, getCached } from "../../services/api";

// Generate last 30 days for date picker
const getLast30Days = () => {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
};

export default function DeliveryHistory() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const { t } = useTranslation();

  const dates = getLast30Days();

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      const data = await getCached("/outlets/");
      const outletList = data.data?.outlets || [];
      setOutlets(outletList);
      if (outletList.length > 0) {
        setSelectedOutlet(outletList[0]._id);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutlets();
    }, []),
  );

  const fetchDeliveries = async () => {
    if (!selectedOutlet) return;
    try {
      setLoading(true);
      const data = await get(`/deliveries/outlet/${selectedOutlet}`);
      setDeliveries(data.data?.deliveries || []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [selectedOutlet]),
  );

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      searchQuery === "" ||
      d.products?.some(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.model?.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      d.fromName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.toName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = selectedDate === "" || d.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back-outline"
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("delivery.historyTitle")}</Text>
        <View />
      </View>

      {/* Search */}
      <View style={styles.outletFilter}>
        <Text style={styles.filterLabel}>{t("stores.selectStore")}</Text>
        <View
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexDirection: "row", flexWrap: "wrap" }}
        >
          {outlets.map((outlet) => (
            <TouchableOpacity
              key={outlet._id}
              style={[
                styles.dateChip,
                selectedOutlet === outlet._id && styles.dateChipActive,
              ]}
              onPress={() => setSelectedOutlet(outlet._id)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  selectedOutlet === outlet._id && styles.dateChipTextActive,
                ]}
              >
                {outlet.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filters}>
        {/* Date Picker — scroll through last 30 days */}
        <Text style={styles.filterLabel}>{t("delivery.filterByDate")}:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.dateChip,
              selectedDate === "" && styles.dateChipActive,
            ]}
            onPress={() => setSelectedDate("")}
          >
            <Text
              style={[
                styles.dateChipText,
                selectedDate === "" && styles.dateChipTextActive,
              ]}
            >
              {t("common.all")}
            </Text>
          </TouchableOpacity>
          {dates.map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.dateChip,
                selectedDate === date && styles.dateChipActive,
              ]}
              onPress={() => setSelectedDate(selectedDate === date ? "" : date)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  selectedDate === date && styles.dateChipTextActive,
                ]}
              >
                {date === new Date().toISOString().split("T")[0]
                  ? t("common.today")
                  : date.slice(5)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Clear filters */}
        {(searchQuery || selectedDate) && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setSelectedDate("");
            }}
          >
            <Text style={styles.clearText}>✕ {t("delivery.clearFilter")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searchQuery || selectedDate
              ? t("delivery.noMatches")
              : t("delivery.noDeliveries")}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              setExpandedId(expandedId === item._id ? null : item._id)
            }
          >
            {/* Row 1 - From → To with names */}
            <View style={styles.routeRow}>
              <View style={styles.outletBox}>
                {item.fromType === "store" ? (
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
                <Text style={styles.outletName}>{item.fromName}</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={Colors.text} />
              <View style={styles.outletBox}>
                {item.toType === "store" ? (
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
                <Text style={styles.outletName}>{item.toName}</Text>
              </View>
            </View>

            {/* Row 2 - Products count & Date */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {item.products?.length} {t("reports.product")}
                {item.products?.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString("uz-UZ", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "Asia/Tashkent",
                })}{" "}
                {new Date(item.createdAt).toLocaleTimeString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Tashkent",
                })}
              </Text>
            </View>

            {/* Note */}
            {item.note && <Text style={styles.note}>{item.note}</Text>}

            {/* Expanded Products */}
            {expandedId === item._id && (
              <View style={styles.expandedSection}>
                {item.products?.map((p, index) => (
                  <View key={index} style={styles.productRow}>
                    <View>
                      <Text style={styles.productName}>{p.name}</Text>
                      <Text style={styles.productModel}>{p.model}</Text>
                    </View>
                    <Text style={styles.productQty}>x{p.quantity}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
      />

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
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  outletFilter: {
    padding: 16,
    paddingBottom: 0,
    backgroundColor: Colors.white,
    borderBottomColor: Colors.border,
  },
  filters: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateChipText: { fontSize: 13, color: Colors.text },
  dateChipTextActive: { color: Colors.white },
  clearText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  outletBox: {
    flex: 1,
    alignItems: "center",
  },
  outletIcon: { fontSize: 20 },
  outletName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
    textAlign: "center",
  },
  arrow: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: { fontSize: 13, color: Colors.textLight },
  dateText: { fontSize: 12, color: Colors.textLight },
  note: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  productModel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  productQty: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 40,
    fontSize: 16,
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
});
