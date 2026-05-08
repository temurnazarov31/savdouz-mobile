import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../constants/colors";
import { get } from "../../services/api";

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
  const { outletId } = useLocalSearchParams();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const { t } = useTranslation();

  const dates = getLast30Days();

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await get(`/deliveries/outlet/${outletId}`);
      setDeliveries(data.data.deliveries);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, []),
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("delivery.historyTitle")}</Text>
        <View />
      </View>

      {/* Search */}
      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          placeholder={t("delivery.searchDelivery")}
  placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

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
                <Text style={styles.outletIcon}>
                  {item.fromType === "store" ? "🏪" : "🏭"}
                </Text>
                <Text style={styles.outletName}>{item.fromName}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.outletBox}>
                <Text style={styles.outletIcon}>
                  {item.toType === "store" ? "🏪" : "🏭"}
                </Text>
                <Text style={styles.outletName}>{item.toName}</Text>
              </View>
            </View>

            {/* Row 2 - Products count & Date */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {item.products?.length} product
                {item.products?.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.dateText}>
                {item.date}{" "}
                {new Date(item.createdAt).toLocaleTimeString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Tashkent",
                })}
              </Text>
            </View>

            {/* Note */}
            {item.note && <Text style={styles.note}>📝 {item.note}</Text>}

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
  filters: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
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
});
