import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Dropdown from "../../components/dropdown";
import { SkeletonBox } from "../../components/skeleton";
import Colors from "../../constants/colors";
import { formatPrice } from "../../constants/formatNumber";
import {
  del,
  get,
  getCached,
  invalidateCache,
  patch,
  post,
} from "../../services/api";

export default function ClientDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Pay form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  // Edit form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [successModal, setSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("payments"); // "payments" | "transactions"
  const [selectedTx, setSelectedTx] = useState(null);

  const [note, setNote] = useState("");

  const fetchClient = async () => {
    try {
      const data = await getCached(`/clients/${id}`); // ✅ cache per client
      const c = data.data?.client;
      setClient(c);
      setName(c?.name || "");
      setPhone(c?.phone || "");
      setNote(c?.note || "");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTransactions = async () => {
    try {
      // ❌ don't cache — changes every transaction
      const data = await get(`/transactions?clientId=${id}`);
      setTransactions(data.data?.transactions || []);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClient();
      fetchClientTransactions();
    }, [id]),
  );

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      setErrorMessage(t("clients.invalidAmount"));
      return;
    }

    const previousClient = client;
    const amount = Number(payAmount);

    setClient((prev) => ({ ...prev, debt: Math.max(0, prev.debt - amount) }));
    setPayModal(false);
    setPayAmount("");
    setPayNote("");

    try {
      await post(`/clients/${id}/pay`, {
        amount,
        method: payMethod,
        note: payNote || undefined,
      });
      invalidateCache(
        `/clients/${id}`,
        "/clients?sort=-debt",
        "/clients?debtOnly=true&sort=-debt",
      );
      setSuccessModal(true);
      fetchClient();
    } catch (err) {
      setClient(previousClient);
      setPayModal(true);
      setPayAmount(String(amount));
      setErrorMessage(err.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await patch(`/clients/${id}`, { name, phone, note });
      // Invalidate client cache — name/phone changed
      invalidateCache(
        `/clients/${id}`,
        "/clients?sort=-debt",
        "/clients?debtOnly=true&sort=-debt",
      );
      setEditModal(false);
      setSuccessModal(true);
      fetchClient();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  if (!client) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Header always visible */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          {loading ? (
            <SkeletonBox width={120} height={20} style={{ flex: 1 }} />
          ) : (
            <Text style={styles.headerTitle}>{client.name}</Text>
          )}
          <View style={styles.headerActions}>
            {!loading && (
              <>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => setEditModal(true)}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
                {client?.debt === 0 && (
                  <TouchableOpacity
                    style={[styles.headerBtn, { borderColor: Colors.error }]}
                    onPress={() => setDeleteModal(true)}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={20}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {/* Debt card skeleton */}
            <View style={[styles.debtCard, styles.debtCardRed]}>
              <SkeletonBox width={80} height={14} style={{ marginBottom: 8 }} />
              <SkeletonBox
                width={160}
                height={36}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                width={120}
                height={14}
                style={{ marginBottom: 16 }}
              />
              <SkeletonBox width={140} height={44} borderRadius={12} />
            </View>

            {/* Tab skeleton */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SkeletonBox width="50%" height={40} borderRadius={10} />
              <SkeletonBox width="50%" height={40} borderRadius={10} />
            </View>

            {/* Payment cards skeleton */}
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.paymentCard}>
                <View style={styles.paymentLeft}>
                  <SkeletonBox
                    width={60}
                    height={22}
                    borderRadius={8}
                    style={{ marginBottom: 6 }}
                  />
                  <SkeletonBox
                    width={100}
                    height={12}
                    style={{ marginBottom: 4 }}
                  />
                  <SkeletonBox width={80} height={11} />
                </View>
                <SkeletonBox width={80} height={20} />
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Debt Card */}
            <View
              style={[
                styles.debtCard,
                client.debt > 0 ? styles.debtCardRed : styles.debtCardGreen,
              ]}
            >
              <Text style={styles.debtCardLabel}>
                {client.debt > 0
                  ? t("clients.totalDebt")
                  : t("clients.cleared")}
              </Text>
              <Text
                style={[
                  styles.debtCardAmount,
                  { color: client.debt > 0 ? Colors.error : Colors.success },
                ]}
              >
                {formatPrice(client.debt)}
              </Text>
              {client.phone && (
                <Text style={styles.debtCardPhone}>{client.phone}</Text>
              )}
              {client.note && (
                <Text style={styles.debtCardNote}>{client.note}</Text>
              )}
              {client.debt > 0 && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => setPayModal(true)}
                >
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={Colors.white}
                  />
                  <Text style={styles.payBtnText}>
                    {t("clients.recordPayment")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Switch */}
            <View style={styles.section}>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.tabBtn,
                    activeTab === "payments" && styles.tabBtnActive,
                  ]}
                  onPress={() => setActiveTab("payments")}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === "payments" && styles.tabBtnTextActive,
                    ]}
                  >
                    {t("clients.paymentHistory")} (
                    {client.paymentHistory?.length || 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabBtn,
                    activeTab === "transactions" && styles.tabBtnActive,
                  ]}
                  onPress={() => setActiveTab("transactions")}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === "transactions" && styles.tabBtnTextActive,
                    ]}
                  >
                    {t("transactions.title")} ({transactions.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <>
                  {client.paymentHistory?.length === 0 ? (
                    <Text style={styles.empty}>{t("clients.noPayments")}</Text>
                  ) : (
                    [...(client.paymentHistory || [])]
                      .reverse()
                      .map((payment, index) => (
                        <View key={index} style={styles.paymentCard}>
                          <View style={styles.paymentLeft}>
                            <View
                              style={[
                                styles.paymentMethodBadge,
                                payment.method === "cash"
                                  ? styles.cashBadge
                                  : styles.cardBadge,
                              ]}
                            >
                              <Text style={styles.paymentMethodText}>
                                {payment.method === "cash"
                                  ? t("transactions.cash")
                                  : t("transactions.card")}
                              </Text>
                            </View>
                            {payment.note && (
                              <Text style={styles.paymentNote}>
                                {payment.note}
                              </Text>
                            )}
                            <Text style={styles.paymentBy}>
                              {payment.recordedBy?.name}
                            </Text>
                            <Text style={styles.paymentDate}>
                              {new Date(payment.createdAt).toLocaleDateString(
                                "uz-UZ",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Tashkent",
                                },
                              )}
                            </Text>
                          </View>
                          <Text style={styles.paymentAmount}>
                            +{formatPrice(payment.amount)}
                          </Text>
                        </View>
                      ))
                  )}
                </>
              )}

              {/* Transactions Tab */}
              {activeTab === "transactions" && (
                <>
                  {transactions.length === 0 ? (
                    <Text style={styles.empty}>
                      {t("transactions.noTransactions")}
                    </Text>
                  ) : (
                    transactions.map((tx) => (
                      <TouchableOpacity
                        key={tx._id}
                        style={styles.paymentCard}
                        onPress={() => setSelectedTx(tx)}
                      >
                        <View style={styles.paymentLeft}>
                          <View
                            style={[
                              styles.paymentMethodBadge,
                              styles.cashBadge,
                            ]}
                          >
                            <Text style={styles.paymentMethodText}>
                              {tx.products?.length} {t("reports.product")}
                            </Text>
                          </View>
                          <Text style={styles.paymentBy}>
                            {tx.soldBy?.name}
                          </Text>
                          <Text style={styles.paymentDate}>
                            {new Date(tx.createdAt).toLocaleDateString(
                              "uz-UZ",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Tashkent",
                              },
                            )}
                          </Text>
                          {tx.debt > 0 && (
                            <Text
                              style={[
                                styles.paymentDate,
                                { color: Colors.error },
                              ]}
                            >
                              {t("clients.debt")}: {formatPrice(tx.debt)}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              styles.paymentAmount,
                              { color: Colors.primary },
                            ]}
                          >
                            {formatPrice(tx.paidAmount)}
                          </Text>
                          {tx.discount > 0 && (
                            <Text
                              style={[
                                styles.paymentDate,
                                { color: Colors.error },
                              ]}
                            >
                              -{formatPrice(tx.discount)}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Pay Modal */}
      <Modal visible={payModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("clients.recordPayment")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("clients.remaining")}: {formatPrice(client.debt)}
            </Text>
            <TextInput
              style={[styles.input, {marginBottom: 0}]}
              placeholder={t("clients.amount")}
              placeholderTextColor="#999"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
            />
            <Dropdown
              options={[
                { label: t("transactions.cash"), value: "cash" },
                { label: t("transactions.card"), value: "card" },
              ]}
              selected={payMethod}
              onSelect={setPayMethod}
              placeholder={t("clients.selectMethod")}
              selector={styles.paymentType}
            />
            <TextInput
              style={styles.input}
              placeholder={t("clients.note")}
              placeholderTextColor="#999"
              value={payNote}
              onChangeText={setPayNote}
            />
            <TouchableOpacity style={styles.button} onPress={handlePay}>
              <Text style={styles.buttonText}>
                {t("clients.confirmPayment")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setPayModal(false);
                setPayAmount("");
                setPayNote("");
              }}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t("clients.editClient")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("clients.name")}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
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
              style={[styles.input, { textAlignVertical: "top" }]}
              placeholder={t("clients.note") || "Note"}
              placeholderTextColor="#999"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
              <Text style={styles.buttonText}>{t("common.save")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModal(false)}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* delete modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Ionicons name="warning" size={48} color={Colors.error} />
            <Text style={[styles.modalTitle, { marginTop: 8 }]}>
              {client.name}
            </Text>
            <View style={{ marginVertical: 4 }}>
              <Text style={styles.deleteSubtitle}>
                {t("common.deleteConfirm")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: "transparent" }]}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={[styles.deleteText, { color: Colors.textLight }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={async () => {
                  try {
                    await del(`/clients/${client._id}`);
                    setDeleteModal(false);
                    router.back();
                  } catch (err) {
                    setDeleteModal(false);
                    setErrorMessage(err.message);
                  }
                }}
              >
                <Text style={styles.deleteText}>{t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={Colors.success}
            />
            <Text style={[styles.modalTitle, { marginTop: 8 }]}>
              {t("common.success")}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: Colors.success }]}
                onPress={() => setSuccessModal(false)}
              >
                <Text style={styles.deleteText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={!!errorMessage} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <Ionicons name="close-circle" size={48} color={Colors.error} />
            <Text style={[styles.modalTitle, { marginTop: 8 }]}>
              {t("common.errorTitle")}
            </Text>
            <Text style={styles.deleteSubtitle}>{errorMessage}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setErrorMessage(null)}
              >
                <Text style={styles.deleteText}>{t("common.ok")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide">
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteModal, { maxHeight: "80%" }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.modalTitle}>
                {selectedTx?.products?.length} {t("reports.product")}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }}>
              {selectedTx?.products?.map((p, i) => (
                <View key={i} style={[styles.paymentCard, { marginBottom: 6 }]}>
                  <View style={styles.paymentLeft}>
                    <Text style={[styles.paymentMethodText, { fontSize: 14 }]}>
                      {p.name}
                    </Text>
                    <Text style={styles.paymentDate}>{p.model}</Text>
                    <Text style={styles.paymentDate}>
                      {p.quantity} x {formatPrice(p.priceAtSale)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.paymentAmount, { color: Colors.primary }]}
                  >
                    {formatPrice(p.totalAmount)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ gap: 6, marginTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.deleteSubtitle}>
                  {t("transactions.subtotal")}
                </Text>
                <Text style={styles.deleteSubtitle}>
                  {formatPrice(selectedTx?.totalAmount)}
                </Text>
              </View>
              {selectedTx?.discount > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={[styles.deleteSubtitle, { color: Colors.error }]}
                  >
                    {t("transactions.discount")}
                  </Text>
                  <Text
                    style={[styles.deleteSubtitle, { color: Colors.error }]}
                  >
                    -{formatPrice(selectedTx?.discount)}
                  </Text>
                </View>
              )}
              {selectedTx?.debt > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={[styles.deleteSubtitle, { color: Colors.error }]}
                  >
                    {t("clients.debt")}
                  </Text>
                  <Text
                    style={[styles.deleteSubtitle, { color: Colors.error }]}
                  >
                    -{formatPrice(selectedTx?.debt)}
                  </Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={[styles.deleteSubtitle, { fontWeight: "700" }]}>
                  {t("transactions.paid")}
                </Text>
                <Text
                  style={[
                    styles.deleteSubtitle,
                    { fontWeight: "700", color: Colors.primary },
                  ]}
                >
                  {formatPrice(selectedTx?.paidAmount)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.paymentDate}>
                  {t("transactions.paymentMethod")}
                </Text>
                <Text style={styles.paymentDate}>
                  {selectedTx?.paymentMethod === "naqd"
                    ? t("transactions.cash")
                    : t("transactions.card")}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.paymentDate}>{t("reports.soldBy")}</Text>
                <Text style={styles.paymentDate}>
                  {selectedTx?.soldBy?.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: Colors.primary, marginTop: 12 },
              ]}
              onPress={() => setSelectedTx(null)}
            >
              <Text style={styles.deleteText}>{t("common.close")}</Text>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Debt card
  debtCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  debtCardRed: {
    backgroundColor: Colors.white,
    borderColor: Colors.error + "30",
  },
  debtCardGreen: {
    backgroundColor: Colors.success + "10",
    borderColor: Colors.success + "30",
  },
  debtCardLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  debtCardAmount: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  debtCardPhone: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  payBtnText: { color: Colors.white, fontWeight: "600", fontSize: 15 },

  // Section
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },

  // Payment card
  paymentCard: {
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
  paymentLeft: { flex: 1 },
  paymentMethodBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  cashBadge: { backgroundColor: Colors.success + "20" },
  cardBadge: { backgroundColor: Colors.primary + "20" },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  paymentNote: { fontSize: 13, color: Colors.text, marginBottom: 4 },
  paymentBy: { fontSize: 12, color: Colors.textLight },
  paymentDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.success,
  },

  empty: {
    textAlign: "center",
    color: Colors.textLight,
    marginTop: 20,
    fontSize: 15,
  },

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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
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
  deleteOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
  },
  deleteModal: {
    width: "100%",
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  deleteSubtitle: {
    fontSize: 17,
    color: Colors.text,
  },
  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    gap: 5,
  },
  deleteText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  tabBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  debtCardNote: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: "italic",
    marginBottom: 8,
  },
  paymentType: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: Colors.border,
    gap: 8
  }
});
