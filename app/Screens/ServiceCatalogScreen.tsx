import { ServiceCatalogItemResponse } from '@/src/api/generated';
import { useLoader } from '@/src/context/LoaderContext';
import {
  createServiceCatalogItemApi,
  deleteServiceCatalogItemApi,
  getServiceCatalogApi,
  updateServiceCatalogItemApi,
} from '@/src/services/serviceCatalogService';
import { formatCurrency } from '@/src/utils/currency';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ChevronLeft, Pencil, Plus, Tag, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ServiceCatalogScreen: React.FC = () => {
  const { showLoader, hideLoader } = useLoader();
  const [items, setItems] = useState<ServiceCatalogItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getServiceCatalogApi({ IsActive: undefined }); // show active + inactive
      setItems(result.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load the catalog.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setCategory('');
    setPrice('');
    setDescription('');
    setModalVisible(true);
  };

  const openEdit = (item: ServiceCatalogItemResponse) => {
    setEditingId(item.id || null);
    setName(item.name || '');
    setCategory(item.category || '');
    setPrice(item.defaultUnitPrice != null ? String(item.defaultUnitPrice) : '');
    setDescription(item.description || '');
    setModalVisible(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a service name.');
      return;
    }
    setSaving(true);
    showLoader();
    try {
      const payloadBase = {
        name: name.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        defaultUnitPrice: price.trim() ? parseFloat(price) || 0 : null,
      };
      if (editingId) {
        await updateServiceCatalogItemApi(editingId, { ...payloadBase, isActive: true });
      } else {
        await createServiceCatalogItemApi(payloadBase);
      }
      hideLoader();
      setSaving(false);
      setModalVisible(false);
      load();
    } catch (e: any) {
      hideLoader();
      setSaving(false);
      Alert.alert('Could not save', e?.message || 'Something went wrong.');
    }
  };

  const remove = (item: ServiceCatalogItemResponse) => {
    if (!item.id) return;
    Alert.alert('Delete service?', `"${item.name}" will be removed from your catalog.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          showLoader();
          try {
            await deleteServiceCatalogItemApi(item.id!);
            hideLoader();
            load();
          } catch (e: any) {
            hideLoader();
            Alert.alert('Could not delete', e?.message || 'Something went wrong.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SERVICE CATALOG</Text>
        <TouchableOpacity style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={openCreate}>
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading catalog...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved services yet</Text>
              <Text style={styles.emptySub}>
                Add the services you quote often with a default price. They&apos;ll be one tap away when building an estimate.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
                <Plus size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.emptyBtnText}>Add your first service</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemIcon}>
                  <Tag size={18} color="#2563eb" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category?.trim() ? `${item.category} • ` : ''}
                    {item.defaultUnitPrice != null ? formatCurrency(item.defaultUnitPrice) : 'No default price'}
                  </Text>
                  {!!item.description?.trim() && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}>
                    <Pencil size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => remove(item)}>
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Service' : 'New Service'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>SERVICE NAME</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Drain cleaning" placeholderTextColor="#cbd5e1" />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CATEGORY</Text>
                <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Optional" placeholderTextColor="#cbd5e1" />
              </View>
              <View style={{ width: 130 }}>
                <Text style={styles.label}>DEFAULT PRICE</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#cbd5e1" />
              </View>
            </View>

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional default description"
              placeholderTextColor="#cbd5e1"
              multiline
            />

            <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} disabled={saving} onPress={save}>
              <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Service'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  iconBtnPrimary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  muted: { color: '#94a3b8', fontWeight: '600' },
  errorText: { color: '#dc2626', fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '800' },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  itemCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', padding: 16 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  itemMeta: { fontSize: 12, fontWeight: '600', color: '#2563eb', marginTop: 2 },
  itemDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  itemActions: { flexDirection: 'row', gap: 6 },
  smallBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});

export default ServiceCatalogScreen;
