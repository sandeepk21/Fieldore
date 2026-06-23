import { router } from 'expo-router';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  Mail,
  Phone,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CreateWorkerRequest,
  UpdateWorkerRequest,
  WORKER_ROLES,
  WorkerResponse,
  createWorkerApi,
  deactivateWorkerApi,
  formatWorkerRoleLabel,
  getWorkerInitials,
  getWorkersApi,
  updateWorkerApi,
} from '@/src/services/workerService';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

const emptyForm = (): FormData => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'technician',
});

const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  manager: '#2563eb',
  technician: '#0891b2',
  staff: '#64748b',
  owner: '#dc2626',
};

export default function TeamScreen() {
  const [workers, setWorkers] = useState<WorkerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerResponse | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadWorkers = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const isActive = showInactive ? undefined : true;
      const list = await getWorkersApi({ isActive });
      setWorkers(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load team members');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const openAddForm = () => {
    setEditingWorker(null);
    setFormData(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (worker: WorkerResponse) => {
    setEditingWorker(worker);
    setFormData({
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email || '',
      phone: worker.phone || '',
      role: worker.role || 'technician',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    const { firstName, lastName, role } = formData;
    if (!firstName.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setFormError('Last name is required');
      return;
    }
    if (!role) {
      setFormError('Role is required');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingWorker) {
        const payload: UpdateWorkerRequest = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role,
        };
        const updated = await updateWorkerApi(editingWorker.id, payload);
        setWorkers(prev => prev.map(w => (w.id === updated.id ? updated : w)));
      } else {
        const payload: CreateWorkerRequest = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role,
        };
        const created = await createWorkerApi(payload);
        setWorkers(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e: any) {
      setFormError(e?.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = (worker: WorkerResponse) => {
    Alert.alert(
      'Deactivate Worker',
      `Remove ${worker.displayName} from your team? They will no longer appear in job assignments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deactivateWorkerApi(worker.id);
              setWorkers(prev =>
                showInactive
                  ? prev.map(w => (w.id === updated.id ? updated : w))
                  : prev.filter(w => w.id !== updated.id)
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to deactivate worker');
            }
          },
        },
      ]
    );
  };

  const roleColor = (role: string) => ROLE_COLORS[role?.toLowerCase()] || '#64748b';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddForm}>
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !showInactive && styles.filterChipActive]}
          onPress={() => setShowInactive(false)}
        >
          <Text style={[styles.filterChipText, !showInactive && styles.filterChipTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showInactive && styles.filterChipActive]}
          onPress={() => setShowInactive(true)}
        >
          <Text style={[styles.filterChipText, showInactive && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <AlertCircle size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadWorkers()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadWorkers(true)} tintColor="#2563eb" />
          }
        >
          {workers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={32} color="#2563eb" />
              </View>
              <Text style={styles.emptyTitle}>No team members yet</Text>
              <Text style={styles.emptySubtitle}>Add your first worker to start assigning jobs</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddForm}>
                <Plus size={16} color="white" />
                <Text style={styles.emptyAddText}>Add Worker</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workers.map(worker => (
              <View key={worker.id} style={[styles.workerCard, !worker.isActive && styles.workerCardInactive]}>
                <View style={styles.workerRow}>
                  <View style={[styles.avatar, { backgroundColor: roleColor(worker.role) + '22' }]}>
                    <Text style={[styles.avatarText, { color: roleColor(worker.role) }]}>
                      {getWorkerInitials(worker)}
                    </Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <View style={styles.workerNameRow}>
                      <Text style={styles.workerName}>{worker.displayName}</Text>
                      {!worker.isActive && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor(worker.role) + '18' }]}>
                      <Shield size={10} color={roleColor(worker.role)} />
                      <Text style={[styles.roleBadgeText, { color: roleColor(worker.role) }]}>
                        {formatWorkerRoleLabel(worker.role)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    {worker.isActive ? (
                      <>
                        <TouchableOpacity style={styles.editBtn} onPress={() => openEditForm(worker)}>
                          <UserCheck size={16} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeactivate(worker)}>
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </View>

                {(worker.email || worker.phone) ? (
                  <View style={styles.contactRow}>
                    {worker.email ? (
                      <View style={styles.contactItem}>
                        <Mail size={12} color="#94a3b8" />
                        <Text style={styles.contactText}>{worker.email}</Text>
                      </View>
                    ) : null}
                    {worker.phone ? (
                      <View style={styles.contactItem}>
                        <Phone size={12} color="#94a3b8" />
                        <Text style={styles.contactText}>{worker.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add/Edit Worker Modal */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingWorker ? 'Edit Worker' : 'Add Worker'}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowForm(false)}>
                <X size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.fieldLabel}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Jane"
                    placeholderTextColor="#cbd5e1"
                    value={formData.firstName}
                    onChangeText={v => setFormData(d => ({ ...d, firstName: v }))}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.fieldLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Smith"
                    placeholderTextColor="#cbd5e1"
                    value={formData.lastName}
                    onChangeText={v => setFormData(d => ({ ...d, lastName: v }))}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Role *</Text>
                <TouchableOpacity
                  style={styles.roleSelector}
                  onPress={() => setShowRolePicker(v => !v)}
                >
                  <Shield size={16} color={roleColor(formData.role)} />
                  <Text style={[styles.roleSelectorText, { color: roleColor(formData.role) }]}>
                    {formatWorkerRoleLabel(formData.role)}
                  </Text>
                  <ChevronDown
                    size={16}
                    color="#94a3b8"
                    style={showRolePicker ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                </TouchableOpacity>
                {showRolePicker ? (
                  <View style={styles.roleDropdown}>
                    {WORKER_ROLES.map(r => (
                      <TouchableOpacity
                        key={r.value}
                        style={styles.roleOption}
                        onPress={() => {
                          setFormData(d => ({ ...d, role: r.value }));
                          setShowRolePicker(false);
                        }}
                      >
                        <Shield size={14} color={roleColor(r.value)} />
                        <Text style={styles.roleOptionText}>{r.label}</Text>
                        {formData.role === r.value ? <Check size={15} color="#2563eb" /> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jane@example.com"
                  placeholderTextColor="#cbd5e1"
                  value={formData.email}
                  onChangeText={v => setFormData(d => ({ ...d, email: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 555 000 0000"
                  placeholderTextColor="#cbd5e1"
                  value={formData.phone}
                  onChangeText={v => setFormData(d => ({ ...d, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingWorker ? 'Save Changes' : 'Add to Team'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: 'white',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  workerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  workerCardInactive: {
    opacity: 0.55,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  inactiveBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formError: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formHalf: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
  },
  // Inline role dropdown
  roleDropdown: {
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  roleOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
});
