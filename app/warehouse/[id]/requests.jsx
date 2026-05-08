import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { get, patch } from '../../../services/api';
import Colors from '../../../constants/colors';
import { useTranslation } from 'react-i18next';

export default function WarehouseJoinRequests() {
  const { id } = useLocalSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const {t}= useTranslation()

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await get(`/warehouses/${id}/requests`);
      setRequests(data.data.requests);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequest = async (reqId, action) => {
    try {
      await patch(`/warehouses/${id}/requests/${reqId}`, {
        action,
        permissions: {
          canAddProduct: true,
          canEditProduct: true,
          canDeleteProduct: false,
          canViewIncome: false,
          canManageWarehouse: true,
        },
      });
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

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
          <Text style={styles.back}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("requests.newRequest")}</Text>
        <View />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>{item.worker?.name}</Text>
              <Text style={styles.email}>
                {item.worker?.email || item.worker?.phone}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleRequest(item._id, 'approve')}
              >
                <Text style={styles.approveText}>{t("common.approve")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRequest(item._id, 'reject')}
              >
                <Text style={styles.rejectText}>{t("common.reject")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{t("requests.noPending")}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  email: { fontSize: 14, color: Colors.textLight, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  approveText: { color: Colors.white, fontWeight: '600' },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  rejectText: { color: Colors.white, fontWeight: '600' },
  empty: { textAlign: 'center', color: Colors.textLight, marginTop: 40 },
});