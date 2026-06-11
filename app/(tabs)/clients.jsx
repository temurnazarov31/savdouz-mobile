import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SkeletonList } from "../../components/skeleton";
import Colors from "../../constants/colors";
import { formatPrice } from "../../constants/formatNumber";
import { getCached, invalidateCache, post } from "../../services/api";

export default function Clients() {
  const { t } = useTranslation();

  const [clients, setClients] = useState([]);
  const [myClients, setMyClients] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [initialDebt, setInitialDebt] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const getError = () => {
    if (!name.trim()) {
      return t("clients.nameRequired");
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const query = debtOnly ? "?debtOnly=true&sort=-debt" : "?sort=-debt";
      const url = myClients ? "/clients/my-clients" : `/clients${query}`;
      const data = await getCached(url);
      setClients(data.data?.clients || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchClients();
    }, [debtOnly, myClients]),
  );

  const handleCreateClient = async () => {
    setSubmitted(true);
    if (getError()) return;
    try {
      await post("/clients", {
        name: name.trim(),
        phone: phone.trim() || undefined,
        note: note.trim() || undefined,
        initialDebt: initialDebt ? Number(initialDebt) : 0,
      });
      // Invalidate both cache variants
      invalidateCache(
        "/clients?sort=-debt",
        "/clients?debtOnly=true&sort=-debt",
        "/clients/my-clients",
      );
      setCreateModal(false);
      setName("");
      setPhone("");
      setNote("");
      setInitialDebt("");
      setSubmitted(false);
      fetchClients();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery),
  );

  const totalDebt = clients.reduce((sum, c) => sum + (c.debt || 0), 0);

  const renderClient = ({ item }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => router.push(`/client/${item._id}`)}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>
          {item.name[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        {item.phone ? (
          <Text style={styles.clientPhone}>{item.phone}</Text>
        ) : (
          <Text style={styles.clientPhoneMuted}>{t("clients.noPhone")}</Text>
        )}
      </View>
      <View style={styles.clientDebt}>
        {item.debt > 0 ? (
          <>
            <Text style={styles.debtAmount}>{formatPrice(item.debt)}</Text>
            <Text style={styles.debtLabel}>{t("clients.debt")}</Text>
          </>
        ) : (
          <View style={styles.clearedBadge}>
            <Text style={styles.clearedText}>{t("clients.cleared")}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <View style={styles.header}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={styles.headerTitle}>{t("clients.title")}</Text>
              <Text style={styles.headerSubtitle}>
                {clients.length} {t("clients.total")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.statsBtn}
              onPress={() => router.push("/client/stats")}
            >
              <Ionicons
                name="bar-chart-outline"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {totalDebt > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {t("clients.totalOutstanding")}
            </Text>
            <Text style={styles.summaryAmount}>{formatPrice(totalDebt)}</Text>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("clients.search")}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              !debtOnly && !myClients && styles.filterBtnActive,
            ]}
            onPress={() => {
              setDebtOnly(false);
              setMyClients(false);
            }}
          >
            <Text
              style={[
                styles.filterBtnText,
                !debtOnly && !myClients && styles.filterBtnTextActive,
              ]}
            >
              {t("clients.all")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, debtOnly && styles.filterBtnActive]}
            onPress={() => {
              setDebtOnly(true);
              setMyClients(false);
            }}
          >
            <Text
              style={[
                styles.filterBtnText,
                debtOnly && styles.filterBtnTextActive,
              ]}
            >
              {t("clients.withDebt")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, myClients && styles.filterBtnActive]}
            onPress={() => {
              setMyClients(true);
              setDebtOnly(false);
            }}
          >
            <Text
              style={[
                styles.filterBtnText,
                myClients && styles.filterBtnTextActive,
              ]}
            >
              {t("clients.myClients")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* skeleton or list */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={6} type="client" />
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item._id}
          renderItem={renderClient}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchClients();
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("clients.noClients")}</Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setCreateModal(true);
        }}
      >
        <Ionicons name="add" size={24} color={Colors.white} />
        <Text style={styles.fabText}>{t("clients.addClient")}</Text>
      </TouchableOpacity>

      {/* Create Client Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("clients.addClient")}</Text>

            {submitted && getError() && (
              <View style={styles.error}>
                <Text style={styles.errorText}>{getError()}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder={t("clients.name")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={(val) => {
                setName(val);
                setSubmitted(false);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder={t("clients.phone")}
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, { flexWrap: "wrap" }]}
              placeholder={t("clients.note")}
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
            />
            <TextInput
              style={styles.input}
              placeholder={t("clients.initialDebt")}
              placeholderTextColor="#999"
              value={initialDebt}
              onChangeText={setInitialDebt}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleCreateClient}
            >
              <Text style={styles.buttonText}>{t("common.create")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCreateModal(false);
                setName("");
                setPhone("");
                setInitialDebt("");
                setSubmitted(false);
              }}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Sticky header
  stickyHeader: {
    backgroundColor: Colors.background,
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
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Summary
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error + "30",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: "500",
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.error,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    margin: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },

  // Filter
  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textLight },
  filterBtnTextActive: { color: Colors.white },

  // Client card
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
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  clientPhone: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  clientPhoneMuted: {
    fontSize: 13,
    color: Colors.border,
    marginTop: 2,
    fontStyle: "italic",
  },
  clientDebt: { alignItems: "flex-end" },
  debtAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.error,
  },
  debtLabel: { fontSize: 11, color: Colors.error, marginTop: 2 },
  clearedBadge: {
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearedText: { fontSize: 12, fontWeight: "600", color: Colors.success },

  // Empty
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 60,
    fontSize: 16,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: { color: Colors.white, fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: Colors.white, fontWeight: "600", fontSize: 16 },
  cancelButton: { padding: 16, alignItems: "center" },
  cancelText: { color: Colors.textLight, fontSize: 16 },
  error: {
    alignItems: "center",
    paddingTop: 0,
    padding: 16,
  },
  errorText: {
    color: Colors.error,
  },
});
