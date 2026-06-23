import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  ChevronDown,
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CATEGORY_COLORS,
  EXPENSE_CATEGORIES,
  ExpenseResponse,
  CreateExpenseRequest,
  createExpenseApi,
  deleteExpenseApi,
  formatExpenseCategoryLabel,
  formatExpenseDate,
  getExpenseSummaryApi,
  getExpensesApi,
  updateExpenseApi,
  ExpenseSummary,
} from '@/src/services/expenseService';
import { formatCurrency } from '@/src/utils/currency';

const TODAY = new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  description: '',
  amount: '',
  category: 'other' as string,
  expenseDate: TODAY,
  vendorName: '',
  referenceNumber: '',
  notes: '',
});

const ExpenseListScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [expList, sum] = await Promise.all([
        getExpensesApi(),
        getExpenseSummaryApi(),
      ]);
      setExpenses(expList);
      setSummary(sum);
    } catch (e: any) {
      setError(e?.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowCategoryPicker(false);
    setShowModal(true);
  };

  const openEdit = (expense: ExpenseResponse) => {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      expenseDate: expense.expenseDate,
      vendorName: expense.vendorName || '',
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
    });
    setShowCategoryPicker(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.description.trim()) { Alert.alert('Validation', 'Description is required.'); return; }
    if (!form.amount || isNaN(amount) || amount <= 0) { Alert.alert('Validation', 'Enter a valid amount.'); return; }

    setIsSaving(true);
    try {
      const payload: CreateExpenseRequest = {
        category: form.category,
        description: form.description.trim(),
        amount,
        expenseDate: form.expenseDate,
        vendorName: form.vendorName.trim() || null,
        referenceNumber: form.referenceNumber.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await updateExpenseApi(editingId, payload);
      } else {
        await createExpenseApi(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteExpenseApi(id);
            await loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete expense.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const filtered = activeCategory
    ? expenses.filter(e => e.category === activeCategory)
    : expenses;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.stateText}>Loading expenses...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Failed to load</Text>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const profitPositive = (summary?.netProfit ?? 0) >= 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses & Profit</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        {summary && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#fef3c7' }]}>
                <TrendingDown size={18} color="#d97706" />
              </View>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalExpenses)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#d1fae5' }]}>
                <TrendingUp size={18} color="#059669" />
              </View>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: profitPositive ? '#d1fae5' : '#fecaca' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: profitPositive ? '#d1fae5' : '#fee2e2' }]}>
                <Wallet size={18} color={profitPositive ? '#059669' : '#dc2626'} />
              </View>
              <Text style={styles.summaryLabel}>Net Profit</Text>
              <Text style={[styles.summaryValue, { color: profitPositive ? '#059669' : '#dc2626' }]}>
                {formatCurrency(summary.netProfit)}
              </Text>
            </View>
          </View>
        )}

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !activeCategory && styles.filterChipActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.filterChipText, !activeCategory && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {EXPENSE_CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.filterChip, activeCategory === c.value && styles.filterChipActive]}
              onPress={() => setActiveCategory(prev => prev === c.value ? null : c.value)}
            >
              <Text style={[styles.filterChipText, activeCategory === c.value && styles.filterChipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Expense list */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to log your first expense</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((expense, idx) => {
              const colors = CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.other;
              const isDeleting = deletingId === expense.id;
              const isLast = idx === filtered.length - 1;
              return (
                <View key={expense.id} style={[styles.expenseRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={[styles.catDot, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.catDotText, { color: colors.text }]}>
                      {formatExpenseCategoryLabel(expense.category).charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDesc}>{expense.description}</Text>
                    <View style={styles.expenseMeta}>
                      <View style={[styles.catBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.catBadgeText, { color: colors.text }]}>
                          {formatExpenseCategoryLabel(expense.category)}
                        </Text>
                      </View>
                      <Text style={styles.expenseDate}>{formatExpenseDate(expense.expenseDate)}</Text>
                    </View>
                    {expense.vendorName ? (
                      <Text style={styles.expenseVendor}>{expense.vendorName}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(expense)}>
                    <Pencil size={15} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(expense.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color="#dc2626" />
                      : <Trash2 size={15} color="#dc2626" />
                    }
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={styles.textInput}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="What was this expense for?"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Amount *</Text>
              <TextInput
                style={styles.textInput}
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowCategoryPicker(v => !v)}
              >
                <Text style={styles.dropdownTriggerText}>
                  {EXPENSE_CATEGORIES.find(c => c.value === form.category)?.label ?? 'Select category'}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.dropdownList}>
                  {EXPENSE_CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.dropdownOption, form.category === c.value && styles.dropdownOptionActive]}
                      onPress={() => { setForm(f => ({ ...f, category: c.value })); setShowCategoryPicker(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, form.category === c.value && styles.dropdownOptionTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                value={form.expenseDate}
                onChangeText={v => setForm(f => ({ ...f, expenseDate: v }))}
                placeholder="2025-01-01"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Vendor / Supplier</Text>
              <TextInput
                style={styles.textInput}
                value={form.vendorName}
                onChangeText={v => setForm(f => ({ ...f, vendorName: v }))}
                placeholder="e.g. Shell, Home Depot"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Reference Number</Text>
              <TextInput
                style={styles.textInput}
                value={form.referenceNumber}
                onChangeText={v => setForm(f => ({ ...f, referenceNumber: v }))}
                placeholder="Receipt / bill number"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textInputMulti]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Optional notes"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)} disabled={isSaving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Expense'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 60 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  filterRow: { gap: 8, paddingBottom: 16, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8' },

  list: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#fff' },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  catDot: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catDotText: { fontSize: 16, fontWeight: '800' },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  expenseDate: { fontSize: 12, color: '#94a3b8' },
  expenseVendor: { fontSize: 12, color: '#64748b', marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginRight: 4 },
  actionBtn: { padding: 6 },

  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  stateText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalCloseBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  textInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a',
  },
  textInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownTriggerText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  dropdownList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionActive: { backgroundColor: '#eff6ff' },
  dropdownOptionText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  dropdownOptionTextActive: { color: '#2563eb', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, paddingVertical: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ExpenseListScreen;
