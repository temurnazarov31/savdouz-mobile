import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../../../constants/colors";
import { get } from "../../../services/api";

export default function Deliveries() {
  const { id } = useLocalSearchParams();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await get(`/deliveries/outlet/${id}`);
      setDeliveries(data.data.deliveries);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <View />
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.storeName}>
                📦 {item.store?.name || "Unknown Store"}
              </Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {item.products?.map((p, index) => (
              <View key={index} style={styles.productRow}>
                <Text style={styles.productName}>
                  {p.product?.name || "Unknown"}
                </Text>
                <Text style={styles.productQty}>x{p.quantity}</Text>
              </View>
            ))}
            {item.note && <Text style={styles.note}>📝 {item.note}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No deliveries yet</Text>}
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
  list: { padding: 16 },
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
  storeName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  date: { fontSize: 12, color: Colors.textLight },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  productName: { fontSize: 14, color: Colors.text },
  productQty: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  note: { fontSize: 13, color: Colors.textLight, marginTop: 8 },
  empty: { textAlign: "center", color: Colors.textLight, marginTop: 40 },
});
