import { Ionicons } from "@expo/vector-icons";
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
import { get } from "../../services/api";

export default function ClientStats() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchClients = async () => {
    try {
      const data = await get("/clients?sort=-debt");
      setClients(data.data?.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const totalDebt = clients.reduce((s, c) => s + (c.debt || 0), 0);
  const withDebt = clients.filter((c) => c.debt > 0);
  const cleared = clients.filter((c) => c.debt === 0);
  const avgDebt =
    withDebt.length > 0 ? Math.round(totalDebt / withDebt.length) : 0;
  const maxDebt = Math.max(...clients.map((c) => c.debt || 0), 1);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("clients.analytics")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Overview cards */}
      <View style={styles.cardRow}>
        <View
          style={[
            styles.overviewCard,
            {
              borderColor: Colors.error + "40",
              backgroundColor: Colors.error + "08",
            },
          ]}
        >
          <Text style={[styles.overviewValue, { color: Colors.error }]}>
            {formatPrice(totalDebt)}
          </Text>
          <Text style={styles.overviewLabel}>{t("clients.totalDebt")}</Text>
        </View>
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
            {clients.length}
          </Text>
          <Text style={styles.overviewLabel}>{t("clients.title")}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View
          style={[
            styles.overviewCard,
            {
              borderColor: Colors.error + "40",
              backgroundColor: Colors.error + "08",
            },
          ]}
        >
          <Text style={[styles.overviewValue, { color: Colors.error }]}>
            {withDebt.length}
          </Text>
          <Text style={styles.overviewLabel}>{t("clients.withDebt")}</Text>
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
            {cleared.length}
          </Text>
          <Text style={styles.overviewLabel}>{t("clients.cleared")}</Text>
        </View>
      </View>

      {/* Avg debt */}
      <View style={styles.avgCard}>
        <Text style={styles.avgLabel}>{t("clients.avgDebt")}</Text>
        <Text style={styles.avgValue}>{formatPrice(avgDebt)}</Text>
      </View>

      {/* Debt ratio bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("clients.debtRatio")}</Text>
        <View style={styles.ratioBar}>
          <View
            style={[
              styles.ratioFill,
              {
                flex: withDebt.length,
                backgroundColor: Colors.error,
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
              },
            ]}
          />
          <View
            style={[
              styles.ratioFill,
              {
                flex: cleared.length || 1,
                backgroundColor: Colors.success,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
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
          <Text style={[styles.ratioLabel, { color: Colors.error }]}>
            {withDebt.length} {t("clients.inDebt")} (
            {clients.length > 0
              ? Math.round((withDebt.length / clients.length) * 100)
              : 0}
            %)
          </Text>
          <Text style={[styles.ratioLabel, { color: Colors.success }]}>
            {cleared.length} {t("clients.cleared")} (
            {clients.length > 0
              ? Math.round((cleared.length / clients.length) * 100)
              : 0}
            %)
          </Text>
        </View>
      </View>

      {/* Top debtors */}
      {withDebt.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("clients.topDebtors")}</Text>
          {[...withDebt]
            .sort((a, b) => b.debt - a.debt)
            .slice(0, 10)
            .map((c, i) => {
              const pct = (c.debt / maxDebt) * 100;
              return (
                <TouchableOpacity
                  key={c._id}
                  style={styles.rankRow}
                  onPress={() => router.push(`/client/${c._id}`)}
                >
                  <Text style={styles.rankNum}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={styles.rankName}>{c.name}</Text>
                      <Text
                        style={[styles.rankAmount, { color: Colors.error }]}
                      >
                        {formatPrice(c.debt)}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%`, backgroundColor: Colors.error },
                        ]}
                      />
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textLight}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              );
            })}
        </View>
      )}

      {/* Cleared clients */}
      {cleared.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("clients.clearedClients")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {cleared.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={styles.clearedChip}
                onPress={() => router.push(`/client/${c._id}`)}
              >
                <Text style={styles.clearedChipText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {clients.length === 0 && (
        <Text style={styles.empty}>{t("clients.noClients")}</Text>
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
  overviewValue: { fontSize: 20, fontWeight: "700" },
  overviewLabel: { fontSize: 12, color: Colors.textLight, textAlign: "center" },
  avgCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avgLabel: { fontSize: 14, color: Colors.textLight },
  avgValue: { fontSize: 18, fontWeight: "700", color: Colors.primary },
  section: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  ratioBar: {
    height: 16,
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  ratioFill: { height: 16 },
  ratioLabel: { fontSize: 12, fontWeight: "600" },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rankNum: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textLight,
    width: 28,
  },
  rankName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  rankAmount: { fontSize: 14, fontWeight: "700" },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  clearedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.success + "20",
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  clearedChipText: { fontSize: 12, fontWeight: "600", color: Colors.success },
  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 60,
    fontSize: 16,
  },
});
