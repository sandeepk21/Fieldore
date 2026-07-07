import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  Images,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Package,
  Phone,
  Play,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import {
  CountryLookupResponse,
  JobChecklistItemRequest,
  JobPhotoResponse,
  JobResponse,
  PostApiJobsAddPhotoJobIdBody,
  ServiceCatalogItemResponse,
  StateProvinceLookupResponse,
  getFieldoreAPI,
} from '@/src/api/generated';
import {
  addJobNoteApi,
  addJobPhotoApi,
  deleteJobApi,
  deleteJobNoteApi,
  deleteJobPhotoApi,
  editJobNoteApi,
  getJobAddressText,
  getJobByIdApi,
  getJobCustomerName,
  getJobDisplayTitle,
  getJobInitials,
  reorderJobChecklistApi,
  replaceJobAssignmentsApi,
  replaceJobChecklistApi,
  replaceJobLineItemsApi,
  updateJobApi,
  updateJobStatusApi,
} from '@/src/services/jobService';
import { getServiceCatalogApi } from '@/src/services/serviceCatalogService';
import {
  WorkerResponse,
  formatWorkerRoleLabel,
  getAssignableWorkersApi,
  getWorkerInitials,
} from '@/src/services/workerService';
import {
  CATEGORY_COLORS,
  EXPENSE_CATEGORIES,
  ExpenseResponse,
  CreateExpenseRequest,
  createExpenseApi,
  deleteExpenseApi,
  formatExpenseCategoryLabel,
  formatExpenseDate,
  getExpensesApi,
  updateExpenseApi,
} from '@/src/services/expenseService';
import { getInvoiceByJobIdApi, formatInvoiceCurrency } from '@/src/services/invoiceService';
import {
  WEB_PRICING_URL,
  cleanGateMessage,
  isSubscriptionGateError,
} from '@/src/services/subscriptionService';
import {
  DURATION_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  JobPriority,
  JobStatus,
} from '@/src/utils/jobValidation';

type TabType = 'Checklist' | 'Items' | 'Photos' | 'Notes' | 'Expenses';

type JobLineItem = {
  id?: string;
  sortOrder?: number;
  serviceName: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
};
type ActiveSheet =
  | 'editJob'
  | 'jobType'
  | 'priority'
  | 'status'
  | 'serviceCountry'
  | 'serviceState'
  | 'date'
  | 'time'
  | 'duration'
  | 'editNote'
  | 'quickStatus'
  | null;
type TimeParts = {
  hour12: number;
  minute: number;
  meridiem: 'AM' | 'PM';
};

type PreviewPhotoState = {
  visible: boolean;
  uri: string;
  title: string;
};

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#f59e0b',
  'In Progress': '#2563eb',
  Completed: '#10b981',
  Cancelled: '#dc2626',
};
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 5);
const DRAG_STEP = 44;
const api = getFieldoreAPI();

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return 'No time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const toTwoDigits = (value: number) => String(value).padStart(2, '0');

const formatTimeParts = ({ hour12, minute, meridiem }: TimeParts) => {
  const normalizedHour12 = Math.min(Math.max(hour12, 1), 12);
  const normalizedMinute = Math.min(Math.max(minute, 0), 59);
  const hour24 =
    meridiem === 'PM'
      ? normalizedHour12 === 12
        ? 12
        : normalizedHour12 + 12
      : normalizedHour12 === 12
        ? 0
        : normalizedHour12;

  return `${toTwoDigits(hour24)}:${toTwoDigits(normalizedMinute)}`;
};

const combineJobDateTime = (dateValue: string, timeValue: string) => {
  if (!dateValue.trim() || !timeValue.trim()) return null;
  const combined = new Date(`${dateValue.trim()}T${timeValue.trim()}:00`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined;
};

const getCalendarDays = (cursor: Date) => {
  const startOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const cells: (Date | null)[] = [];

  for (let index = 0; index < startOfMonth.getDay(); index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const formatMonthLabel = (value: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);

const formatEditDateLabel = (value: string) => {
  if (!value) return 'Choose a date';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatEditTimeLabel = (value: string) => {
  if (!value) return 'Choose a time';

  const [hourString, minuteString] = value.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const buildChecklistRequest = (job: JobResponse): JobChecklistItemRequest[] =>
  (job.checklistItems || []).map((item, index) => ({
    sortOrder: item.sortOrder || index + 1,
    taskName: item.taskName?.trim() || `Task ${index + 1}`,
    isCompleted: Boolean(item.isCompleted),
  }));

const getPhotoCaption = (fileName?: string | null) => {
  const normalizedName = fileName?.trim().replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');

  if (normalizedName) {
    return normalizedName;
  }

  return `Job Photo ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())}`;
};

const buildJobPhotoUploadBody = (asset: ImagePicker.ImagePickerAsset): PostApiJobsAddPhotoJobIdBody => {
  const fileName = asset.fileName?.trim() || asset.uri.split('/').pop()?.trim() || `job-photo-${Date.now()}.jpg`;

  return {
    File: {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType?.trim() || 'image/jpeg',
    } as unknown as Blob,
    Caption: getPhotoCaption(asset.fileName),
    TakenAt: new Date().toISOString(),
  };
};

const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const JobDetailSkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
    <View style={styles.mapSection}>
      <View style={styles.mapPinContainer}>
        <View style={styles.mapGlowOuter} />
        <View style={styles.mapIconBox} />
      </View>
    </View>

    <View style={styles.jobInfoSection}>
      <SkeletonBlock height={28} width="60%" />
      <View style={styles.jobMetaRow}>
        <SkeletonBlock height={14} width={96} />
        <SkeletonBlock height={14} width={132} />
      </View>
    </View>

    <View style={styles.customerSection}>
      <View style={styles.customerRow}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock height={18} width="54%" />
          <SkeletonBlock height={14} width="76%" />
        </View>
      </View>
    </View>

    <View style={styles.contentPadding}>
      {[0, 1, 2].map(item => (
        <View key={item} style={styles.checkItem}>
          <SkeletonBlock height={22} width={22} style={{ borderRadius: 8 }} />
          <SkeletonBlock height={16} width="62%" />
        </View>
      ))}
    </View>
  </ScrollView>
);

const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetSafeArea}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

const ChecklistRow = ({
  item,
  index,
  total,
  disabled,
  isDragging,
  onToggle,
  onDelete,
  onDragStart,
  onDragShift,
  onDragEnd,
}: {
  item: NonNullable<JobResponse['checklistItems']>[number];
  index: number;
  total: number;
  disabled: boolean;
  isDragging: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragShift: (direction: 'up' | 'down') => void;
  onDragEnd: () => void;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);

  const resetDrag = useCallback(() => {
    offsetRef.current = 0;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled && (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
        onPanResponderGrant: () => {
          onDragStart();
        },
        onPanResponderMove: (_, gestureState) => {
          const relativeDy = gestureState.dy - offsetRef.current;
          translateY.setValue(relativeDy);

          if (relativeDy <= -DRAG_STEP && index > 0) {
            offsetRef.current -= DRAG_STEP;
            onDragShift('up');
          } else if (relativeDy >= DRAG_STEP && index < total - 1) {
            offsetRef.current += DRAG_STEP;
            onDragShift('down');
          }
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: () => {
          resetDrag();
          onDragEnd();
        },
        onPanResponderTerminate: () => {
          resetDrag();
          onDragEnd();
        },
      }),
    [disabled, index, onDragEnd, onDragShift, onDragStart, resetDrag, total, translateY]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.checkItemCard,
        item.isCompleted && styles.checkItemCardDone,
        isDragging && styles.checkItemCardDragging,
        { transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity onPress={onToggle} style={styles.checkItemMain} disabled={disabled}>
        <View style={[styles.checkBox, item.isCompleted && styles.checkBoxDone]}>
          {item.isCompleted ? <Check size={14} color="white" strokeWidth={4} /> : null}
        </View>
        <View style={styles.checkTextWrap}>
          <Text style={[styles.checkText, item.isCompleted && styles.checkTextDone]}>
            {item.taskName?.trim() || 'Untitled task'}
          </Text>
          <Text style={styles.checkSubText}>
            {item.isCompleted ? 'Completed task' : 'Hold and drag to reorder'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.checkActions}>
        <TouchableOpacity onPress={onDelete} style={styles.checkDeleteIconBtn} disabled={disabled}>
          <Trash2 size={16} color="#b91c1c" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const buildUpdateJobPayload = (
  job: JobResponse,
  overrides?: Partial<{
    title: string;
    jobType: string;
    priority: string;
    status: string;
    description: string | null;
    scheduledStartAt: string;
    scheduledEndAt: string | null;
    estimatedDurationMinutes: number;
    useCustomerPrimaryAddress: boolean;
    serviceAddress: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      stateOrProvince: string | null;
      postalCode: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
    } | undefined;
  }>
) => ({
  customerId: job.customerId,
  sourceLeadId: job.sourceLeadId || null,
  title: overrides?.title ?? job.title ?? null,
  jobType: overrides?.jobType ?? job.jobType ?? null,
  priority: overrides?.priority ?? job.priority ?? null,
  status: overrides?.status ?? job.status ?? null,
  scheduledStartAt: overrides?.scheduledStartAt ?? job.scheduledStartAt,
  scheduledEndAt: overrides?.scheduledEndAt ?? (job.scheduledEndAt || null),
  actualStartAt: job.actualStartAt || null,
  actualEndAt: job.actualEndAt || null,
  estimatedDurationMinutes: overrides?.estimatedDurationMinutes ?? job.estimatedDurationMinutes ?? null,
  useCustomerPrimaryAddress: overrides?.useCustomerPrimaryAddress ?? Boolean(job.useCustomerPrimaryAddress),
  serviceAddress:
    overrides && 'serviceAddress' in overrides
      ? overrides.serviceAddress
      : job.serviceAddress
        ? {
          line1: job.serviceAddress.line1 || null,
          line2: job.serviceAddress.line2 || null,
          city: job.serviceAddress.city || null,
          stateOrProvince: job.serviceAddress.stateOrProvince || null,
          postalCode: job.serviceAddress.postalCode || null,
          country: job.serviceAddress.country || null,
          latitude: job.serviceAddress.latitude ?? null,
          longitude: job.serviceAddress.longitude ?? null,
        }
        : undefined,
  description: overrides?.description ?? job.description ?? null,
  assignments: (job.assignments || [])
    .filter(item => item.userProfileId)
    .map(item => ({
      userProfileId: item.userProfileId || '',
      isPrimary: Boolean(item.isPrimary),
    })),
  checklistItems: buildChecklistRequest(job),
});

const JobDetailScreen: React.FC = () => {
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const [activeTab, setActiveTab] = useState<TabType>('Checklist');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isChecklistSaving, setIsChecklistSaving] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [isDetailsSaving, setIsDetailsSaving] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isPhotoDeletingId, setIsPhotoDeletingId] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoState>({
    visible: false,
    uri: '',
    title: '',
  });
  const [isNoteMutatingId, setIsNoteMutatingId] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editJobType, setEditJobType] = useState('');
  const [editPriority, setEditPriority] = useState<JobPriority>('Normal');
  const [editStatus, setEditStatus] = useState<JobStatus>('Scheduled');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState('120');
  const [editUseCustomerPrimaryAddress, setEditUseCustomerPrimaryAddress] = useState(true);
  const [editAddressLine1, setEditAddressLine1] = useState('');
  const [editAddressLine2, setEditAddressLine2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [timeParts, setTimeParts] = useState<TimeParts>({ hour12: 9, minute: 0, meridiem: 'AM' });
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [isChoosingMonthYear, setIsChoosingMonthYear] = useState(false);
  const [draggingChecklistId, setDraggingChecklistId] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [isItemsSaving, setIsItemsSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItemResponse[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [catalogQuantities, setCatalogQuantities] = useState<Record<string, string>>({});
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [assignableWorkers, setAssignableWorkers] = useState<WorkerResponse[]>([]);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [primaryWorkerId, setPrimaryWorkerId] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [isAssignSaving, setIsAssignSaving] = useState(false);

  // Expense state
  const [jobExpenses, setJobExpenses] = useState<ExpenseResponse[]>([]);
  const [isExpensesLoading, setIsExpensesLoading] = useState(false);
  const [jobInvoiceTotal, setJobInvoiceTotal] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'other', expenseDate: new Date().toISOString().split('T')[0], vendorName: '', referenceNumber: '' });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showExpCategoryModal, setShowExpCategoryModal] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSheet === 'date') {
      setIsChoosingMonthYear(false);
    }
  }, [activeSheet]);
  const [countries, setCountries] = useState<CountryLookupResponse[]>([]);
  const [states, setStates] = useState<StateProvinceLookupResponse[]>([]);
  const pendingChecklistOrderRef = useRef<string[]>([]);
  const didReorderChecklistRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadJob = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!jobId) {
      setError('Job id is missing.');
      setJob(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      const response = await getJobByIdApi(jobId);
      setJob(response);
      setError('');
    } catch (loadError: any) {
      setJob(null);
      setError(loadError?.message || 'Failed to load job.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      loadJob('initial');
    }, [loadJob])
  );

  const loadJobExpenses = useCallback(async () => {
    if (!jobId) return;
    setIsExpensesLoading(true);
    try {
      const [expenses, invoice] = await Promise.all([
        getExpensesApi({ jobId }),
        getInvoiceByJobIdApi(jobId).catch(() => null),
      ]);
      setJobExpenses(expenses);
      setJobInvoiceTotal(invoice?.totalAmount ?? null);
    } catch {
      // silently fail — tab shows empty state
    } finally {
      setIsExpensesLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (activeTab === 'Expenses') loadJobExpenses();
  }, [activeTab, loadJobExpenses]);

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpForm({ description: '', amount: '', category: 'other', expenseDate: new Date().toISOString().split('T')[0], vendorName: '', referenceNumber: '' });
    setShowExpenseForm(true);
  };

  const openEditExpense = (e: ExpenseResponse) => {
    setEditingExpense(e);
    setExpForm({ description: e.description, amount: String(e.amount), category: e.category, expenseDate: e.expenseDate, vendorName: e.vendorName || '', referenceNumber: e.referenceNumber || '' });
    setShowExpenseForm(true);
  };

  const handleSaveExpense = async () => {
    const amount = parseFloat(expForm.amount);
    if (!expForm.description.trim()) { Alert.alert('Validation', 'Description is required.'); return; }
    if (!expForm.amount || isNaN(amount) || amount <= 0) { Alert.alert('Validation', 'Enter a valid amount.'); return; }
    setIsSavingExpense(true);
    try {
      const payload: CreateExpenseRequest = {
        category: expForm.category,
        description: expForm.description.trim(),
        amount,
        expenseDate: expForm.expenseDate,
        jobId,
        vendorName: expForm.vendorName.trim() || null,
        referenceNumber: expForm.referenceNumber.trim() || null,
      };
      if (editingExpense) {
        await updateExpenseApi(editingExpense.id, payload);
      } else {
        await createExpenseApi(payload);
      }
      setShowExpenseForm(false);
      await loadJobExpenses();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeletingExpenseId(id);
          try {
            await deleteExpenseApi(id);
            await loadJobExpenses();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete.');
          } finally {
            setDeletingExpenseId(null);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);

      try {
        const response = await api.getApiLocationsCountries();
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Failed to load countries');
        }

        setCountries(result.data || []);
      } catch (lookupError: any) {
        setError(lookupError?.response?.data?.message || lookupError?.message || 'Failed to load countries.');
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (!editCountry || editUseCustomerPrimaryAddress) {
        setStates([]);
        return;
      }

      setIsLoadingStates(true);

      try {
        const response = await api.getApiLocationsStates({ countryCode: editCountry });
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Failed to load states');
        }

        setStates(result.data || []);
      } catch (lookupError: any) {
        setStates([]);
        setError(lookupError?.response?.data?.message || lookupError?.message || 'Failed to load states.');
      } finally {
        setIsLoadingStates(false);
      }
    };

    fetchStates();
  }, [editCountry, editUseCustomerPrimaryAddress]);

  const scheduleLabel = useMemo(() => {
    if (!job?.scheduledStartAt) return 'No schedule';

    const start = `${formatDate(job.scheduledStartAt)} • ${formatTime(job.scheduledStartAt)}`;
    const end = job.scheduledEndAt ? formatTime(job.scheduledEndAt) : null;

    return end ? `${start} - ${end}` : start;
  }, [job]);

  const timeLabel = useMemo(() => {
    if (!job?.scheduledStartAt) return 'No time set';
    const start = formatTime(job.scheduledStartAt);
    const end = job.scheduledEndAt ? ` – ${formatTime(job.scheduledEndAt)}` : '';
    return `${start}${end}`;
  }, [job]);

  const hasCoordinates =
    job?.serviceAddress?.latitude != null && job?.serviceAddress?.longitude != null;

  const mapHtml = useMemo(() => {
    const lat = hasCoordinates ? Number(job?.serviceAddress?.latitude) : 20;
    const lng = hasCoordinates ? Number(job?.serviceAddress?.longitude) : 0;
    const zoom = hasCoordinates ? 15 : 2;
    const markerScript = hasCoordinates
      ? `L.circleMarker([${lat},${lng}],{radius:10,color:'#2563eb',fillColor:'#3b82f6',fillOpacity:1,weight:3}).addTo(map);`
      : '';
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0}body{background:#e9f0f7}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{center:[${lat},${lng}],zoom:${zoom},zoomControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
${markerScript}
</script></body></html>`;
  }, [hasCoordinates, job?.serviceAddress?.latitude, job?.serviceAddress?.longitude]);

  const selectedCountry = useMemo(
    () => countries.find(country => country.code === editCountry),
    [countries, editCountry]
  );

  const selectedState = useMemo(
    () => states.find(state => (state.code || '') === editState),
    [editState, states]
  );

  const countryOptions = useMemo(
    () =>
      countries
        .map(country => ({
          label: country.name || country.code || 'Unknown Country',
          value: country.code || '',
        }))
        .filter(option => option.value),
    [countries]
  );

  const stateOptions = useMemo(
    () =>
      states
        .map(state => ({
          label: state.name || state.code || 'Unknown Province',
          value: state.code || '',
        }))
        .filter(option => option.value),
    [states]
  );

  const jobLineItems = useMemo(
    () => ((job as any)?.lineItems || []) as JobLineItem[],
    [job]
  );

  const saveLineItems = async (items: JobLineItem[]) => {
    if (!job?.id) return;
    setIsItemsSaving(true);
    try {
      const updated = await replaceJobLineItemsApi(
        job.id,
        items.map((item, index) => ({
          sortOrder: index + 1,
          serviceName: item.serviceName,
          description: item.description || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      );
      setJob(updated);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update line items.');
    } finally {
      setIsItemsSaving(false);
    }
  };

  const handleAddLineItem = async () => {
    const name = newItemName.trim();
    const qty = parseFloat(newItemQty) || 1;
    const price = parseFloat(newItemPrice) || 0;
    if (!name) return;
    const nextItems: JobLineItem[] = [
      ...jobLineItems,
      { serviceName: name, description: newItemDesc.trim() || null, quantity: qty, unitPrice: price },
    ];
    setNewItemName('');
    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemPrice('');
    setShowManualForm(false);
    await saveLineItems(nextItems);
  };

  const handleDeleteLineItem = async (index: number) => {
    const nextItems = jobLineItems.filter((_, i) => i !== index);
    await saveLineItems(nextItems);
  };

  const loadCatalog = useCallback(async () => {
    if (serviceCatalog.length > 0) return;
    setIsCatalogLoading(true);
    try {
      const result = await getServiceCatalogApi({ IsActive: true });
      setServiceCatalog(result.data);
    } catch {
      // best-effort
    } finally {
      setIsCatalogLoading(false);
    }
  }, [serviceCatalog.length]);

  const openCatalogPicker = () => {
    setSelectedCatalogIds([]);
    setCatalogQuantities({});
    setCatalogSearch('');
    setShowCatalogPicker(true);
    loadCatalog();
  };

  const toggleCatalogItem = (id: string) => {
    setSelectedCatalogIds(prev => {
      if (prev.includes(id)) {
        setCatalogQuantities(q => { const next = { ...q }; delete next[id]; return next; });
        return prev.filter(x => x !== id);
      }
      setCatalogQuantities(q => ({ ...q, [id]: '1' }));
      return [...prev, id];
    });
  };

  const setCatalogItemQty = (id: string, value: string) => {
    setCatalogQuantities(prev => ({ ...prev, [id]: value }));
  };

  const stepCatalogQty = (id: string, delta: number) => {
    const current = parseFloat(catalogQuantities[id] || '1') || 1;
    const next = Math.max(1, current + delta);
    setCatalogQuantities(prev => ({ ...prev, [id]: String(next) }));
  };

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return serviceCatalog;
    return serviceCatalog.filter(c =>
      c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
    );
  }, [serviceCatalog, catalogSearch]);

  const handleAddFromCatalog = async () => {
    const selected = serviceCatalog.filter(c => c.id && selectedCatalogIds.includes(c.id));
    if (selected.length === 0) return;
    const nextItems: JobLineItem[] = [
      ...jobLineItems,
      ...selected.map(c => ({
        serviceName: c.name || '',
        description: c.description?.trim() || null,
        quantity: parseFloat(catalogQuantities[c.id!] || '1') || 1,
        unitPrice: c.defaultUnitPrice ?? 0,
      })),
    ];
    setShowCatalogPicker(false);
    setSelectedCatalogIds([]);
    setCatalogQuantities({});
    await saveLineItems(nextItems);
  };

  const openWorkerPicker = async () => {
    const currentAssignments = (job?.assignments || []);
    setSelectedWorkerIds(currentAssignments.map((a: any) => a.userProfileId).filter(Boolean));
    const primary = currentAssignments.find((a: any) => a.isPrimary);
    setPrimaryWorkerId(primary?.userProfileId || null);
    setWorkerSearch('');
    setShowWorkerPicker(true);
    if (assignableWorkers.length === 0) {
      setIsWorkersLoading(true);
      try {
        const list = await getAssignableWorkersApi();
        setAssignableWorkers(list);
      } catch { /* ignore */ }
      setIsWorkersLoading(false);
    }
  };

  const toggleWorker = (id: string) => {
    setSelectedWorkerIds(prev => {
      if (prev.includes(id)) {
        if (primaryWorkerId === id) setPrimaryWorkerId(null);
        return prev.filter(w => w !== id);
      }
      const next = [...prev, id];
      if (next.length === 1) setPrimaryWorkerId(id);
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    if (!job?.id) return;
    setIsAssignSaving(true);
    try {
      const assignments = selectedWorkerIds.map(id => ({
        userProfileId: id,
        isPrimary: id === primaryWorkerId,
      }));
      const updated = await replaceJobAssignmentsApi(job.id, assignments);
      setJob(updated);
      setShowWorkerPicker(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update assignments');
    } finally {
      setIsAssignSaving(false);
    }
  };

  const filteredAssignableWorkers = useMemo(() => {
    const q = workerSearch.toLowerCase().trim();
    if (!q) return assignableWorkers;
    return assignableWorkers.filter(w =>
      w.displayName.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q)
    );
  }, [assignableWorkers, workerSearch]);

  const handleCall = async () => {
    const phone = job?.customer?.mobilePhone?.trim();
    if (!phone) return;

    const url = `tel:${phone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleEmail = async () => {
    const email = job?.customer?.email?.trim();
    if (!email) return;

    const url = `mailto:${email}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleOpenMaps = async () => {
    if (!job) return;
    const address = getJobAddressText(job);
    if (!address) return;
    const encoded = encodeURIComponent(address);
    const nativeUrl = Platform.OS === 'ios'
      ? `comgooglemaps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;
    if (await Linking.canOpenURL(nativeUrl)) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(`https://maps.google.com/maps?q=${encoded}`);
    }
  };

  const handleCreateInvoice = () => {
    if (!job?.id) return;
    const prefillLineItems = jobLineItems.length > 0
      ? JSON.stringify(jobLineItems.map(item => ({
          serviceName: item.serviceName,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })))
      : undefined;
    router.push({
      pathname: '../Screens/CreateInvoiceScreen',
      params: {
        prefillCustomerId: job.customerId || '',
        prefillJobId: job.id,
        ...(prefillLineItems && { prefillLineItems }),
      },
    });
  };

  const promptUpgrade = (message?: string) => {
    Alert.alert(
      'Upgrade required',
      cleanGateMessage(message),
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => Linking.openURL(WEB_PRICING_URL) },
      ],
    );
  };

  const handleStatusUpdate = async () => {
    if (!job?.id) return;

    const nextStatus = job.status === 'In Progress' ? 'Completed' : 'In Progress';

    setIsStatusUpdating(true);

    try {
      const updated = await updateJobStatusApi(job.id, {
        status: nextStatus,
        actualStartAt: nextStatus === 'In Progress' ? new Date().toISOString() : job.actualStartAt || new Date().toISOString(),
        actualEndAt: nextStatus === 'Completed' ? new Date().toISOString() : null,
      });

      setJob(updated);
      setError('');
    } catch (updateError: any) {
      if (isSubscriptionGateError(updateError?.message)) {
        promptUpgrade(updateError.message);
      } else {
        setError(updateError?.message || 'Failed to update job status.');
      }
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleQuickStatus = async (newStatus: JobStatus) => {
    if (!job?.id || job.status === newStatus) return;
    setActiveSheet(null);
    setIsStatusUpdating(true);
    try {
      const updated = await updateJobStatusApi(job.id, {
        status: newStatus,
        actualStartAt:
          newStatus === 'In Progress'
            ? new Date().toISOString()
            : job.actualStartAt || new Date().toISOString(),
        actualEndAt: newStatus === 'Completed' ? new Date().toISOString() : null,
      });
      setJob(updated);
      setError('');
    } catch (statusError: any) {
      if (isSubscriptionGateError(statusError?.message)) {
        promptUpgrade(statusError.message);
      } else {
        setError(statusError?.message || 'Failed to update job status.');
      }
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const openEditSheet = () => {
    if (!job) return;
    router.push({
      pathname: '../Screens/CreateJobScreen',
      params: { jobId: job.id || '' },
    });
  };

  const handleSaveJobDetails = async () => {
    if (!job?.id) return;

    const title = editTitle.trim();
    const jobType = editJobType.trim();
    const scheduledAt = combineJobDateTime(editScheduledDate, editScheduledTime);
    const duration = Number(editDurationMinutes);

    if (!title) {
      setError('Job title is required.');
      return;
    }

    if (!jobType) {
      setError('Job type is required.');
      return;
    }

    if (!scheduledAt) {
      setError('Please choose a valid date and time.');
      return;
    }

    if (!Number.isFinite(duration) || duration < 15) {
      setError('Duration should be at least 15 minutes.');
      return;
    }

    if (
      !editUseCustomerPrimaryAddress &&
      (!editAddressLine1.trim() || !editCity.trim() || !editState.trim() || !editPostalCode.trim() || !editCountry.trim())
    ) {
      setError('Please complete the service address fields.');
      return;
    }

    const scheduledEndAt = new Date(scheduledAt.getTime() + duration * 60 * 1000).toISOString();

    setIsDetailsSaving(true);

    try {
      const updated = await updateJobApi(
        job.id,
        buildUpdateJobPayload(job, {
          title,
          jobType,
          priority: editPriority,
          status: editStatus,
          scheduledStartAt: scheduledAt.toISOString(),
          scheduledEndAt,
          estimatedDurationMinutes: duration,
          useCustomerPrimaryAddress: editUseCustomerPrimaryAddress,
          serviceAddress: editUseCustomerPrimaryAddress
            ? undefined
            : {
              line1: editAddressLine1.trim(),
              line2: editAddressLine2.trim() || null,
              city: editCity.trim(),
              stateOrProvince: editState.trim(),
              postalCode: editPostalCode.trim(),
              country: editCountry.trim(),
              latitude: job.serviceAddress?.latitude ?? null,
              longitude: job.serviceAddress?.longitude ?? null,
            },
          description: editDescription.trim() || null,
        })
      );

      setJob(updated);
      setError('');
      setActiveSheet(null);
    } catch (detailsError: any) {
      setError(detailsError?.message || 'Failed to update job details.');
    } finally {
      setIsDetailsSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!job?.id) return;
    const currentJobId = job.id;

    Alert.alert('Delete job', 'This job and its checklist timeline will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDetailsSaving(true);

          try {
            await deleteJobApi(currentJobId);
            router.back();
          } catch (deleteError: any) {
            setError(deleteError?.message || 'Failed to delete job.');
            setIsDetailsSaving(false);
          }
        },
      },
    ]);
  };

  const saveChecklist = async (nextJob: JobResponse) => {
    if (!nextJob.id) return;

    pendingChecklistOrderRef.current = [];
    didReorderChecklistRef.current = false;
    setDraggingChecklistId('');
    setIsChecklistSaving(true);
    setJob(nextJob);

    try {
      const updated = await replaceJobChecklistApi(nextJob.id, buildChecklistRequest(nextJob));
      setJob(updated);
      setError('');
    } catch (checklistError: any) {
      setError(checklistError?.message || 'Failed to update checklist.');
      await loadJob('refresh');
    } finally {
      setIsChecklistSaving(false);
    }
  };

  const toggleChecklistItem = async (itemId?: string) => {
    if (!job || !itemId) return;

    const nextChecklist = (job.checklistItems || []).map(item =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );

    await saveChecklist({
      ...job,
      checklistItems: nextChecklist,
    });
  };

  const handleAddTask = async () => {
    const taskName = newTask.trim();
    if (!job || !taskName) return;

    const nextChecklist = [
      ...(job.checklistItems || []),
      {
        id: `local-${Date.now()}`,
        sortOrder: (job.checklistItems?.length || 0) + 1,
        taskName,
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
      },
    ];

    setNewTask('');
    await saveChecklist({
      ...job,
      checklistItems: nextChecklist,
    });
  };

  const handleDeleteTask = async (itemId?: string) => {
    if (!job || !itemId) return;

    const nextChecklist = (job.checklistItems || []).filter(item => item.id !== itemId);

    await saveChecklist({
      ...job,
      checklistItems: nextChecklist.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      })),
    });
  };

  const moveChecklistItemLocally = useCallback((itemId: string, direction: 'up' | 'down') => {
    setJob(currentJob => {
      if (!currentJob) return currentJob;

      const items = [...(currentJob.checklistItems || [])];
      const currentIndex = items.findIndex(item => item.id === itemId);
      if (currentIndex < 0) return currentJob;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return currentJob;

      const [movedItem] = items.splice(currentIndex, 1);
      items.splice(targetIndex, 0, movedItem);

      didReorderChecklistRef.current = true;
      pendingChecklistOrderRef.current = items.map(item => item.id || '').filter(Boolean);

      return {
        ...currentJob,
        checklistItems: items.map((item, index) => ({
          ...item,
          sortOrder: index + 1,
        })),
      };
    });
  }, []);

  const persistChecklistOrder = useCallback(async () => {
    if (!job?.id) return;

    if (!didReorderChecklistRef.current) {
      setDraggingChecklistId('');
      return;
    }

    const ids = pendingChecklistOrderRef.current.length
      ? pendingChecklistOrderRef.current
      : (job.checklistItems || []).map(item => item.id).filter((id): id is string => Boolean(id));
    if (ids.length !== (job.checklistItems || []).length) {
      setError('Checklist order can only be updated after all tasks are synced.');
      pendingChecklistOrderRef.current = [];
      didReorderChecklistRef.current = false;
      await loadJob('refresh');
      return;
    }

    setIsChecklistSaving(true);

    try {
      const updated = await reorderJobChecklistApi(job.id, ids);
      setJob(updated);
      setError('');
    } catch (reorderError: any) {
      setError(reorderError?.message || 'Failed to reorder checklist.');
      await loadJob('refresh');
    } finally {
      pendingChecklistOrderRef.current = [];
      didReorderChecklistRef.current = false;
      setIsChecklistSaving(false);
      setDraggingChecklistId('');
    }
  }, [job, loadJob]);

  const handleAddNote = async () => {
    if (!job?.id || !newNote.trim()) return;

    setIsNoteSaving(true);

    try {
      await addJobNoteApi(job.id, { body: newNote.trim() });
      setNewNote('');
      await loadJob('refresh');
    } catch (noteError: any) {
      setError(noteError?.message || 'Failed to add note.');
    } finally {
      setIsNoteSaving(false);
    }
  };

  const openEditNoteSheet = (noteId?: string, body?: string | null) => {
    if (!noteId) return;
    setEditingNoteId(noteId);
    setEditingNoteBody(body?.trim() || '');
    setActiveSheet('editNote');
  };

  const handleSaveEditedNote = async () => {
    if (!job?.id || !editingNoteId || !editingNoteBody.trim()) return;

    setIsNoteMutatingId(editingNoteId);

    try {
      await editJobNoteApi(job.id, editingNoteId, { body: editingNoteBody.trim() });
      setActiveSheet(null);
      setEditingNoteId('');
      setEditingNoteBody('');
      await loadJob('refresh');
    } catch (noteError: any) {
      setError(noteError?.message || 'Failed to update note.');
    } finally {
      setIsNoteMutatingId('');
    }
  };

  const handleDeleteNote = async (noteId?: string) => {
    if (!job?.id || !noteId) return;

    Alert.alert('Delete note', 'This note will be removed from the job timeline.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsNoteMutatingId(noteId);

          try {
            await deleteJobNoteApi(job.id!, noteId);
            await loadJob('refresh');
          } catch (noteError: any) {
            setError(noteError?.message || 'Failed to delete note.');
          } finally {
            setIsNoteMutatingId('');
          }
        },
      },
    ]);
  };

  const handleDeletePhoto = async (photoId?: string) => {
    if (!job?.id || !photoId) return;

    Alert.alert('Delete photo', 'This photo will be removed from the job record.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsPhotoDeletingId(photoId);

          try {
            await deleteJobPhotoApi(job.id!, photoId);
            await loadJob('refresh');
          } catch (photoError: any) {
            setError(photoError?.message || 'Failed to delete photo.');
          } finally {
            setIsPhotoDeletingId('');
          }
        },
      },
    ]);
  };

  const handleAddPhoto = async (source: 'camera' | 'library') => {
    if (!job?.id || isPhotoUploading) return;

    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setError(source === 'camera' ? 'Camera permission is required to capture a photo.' : 'Photo library permission is required to choose an image.');
        return;
      }

      const pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
          : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const asset = pickerResult.assets[0];

      setIsPhotoUploading(true);
      setError('');
      await addJobPhotoApi(job.id, buildJobPhotoUploadBody(asset));

      await loadJob('refresh');
    } catch (photoError: any) {
      setError(photoError?.message || 'Failed to upload photo.');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const openPhotoPreview = (photo?: JobPhotoResponse | null) => {
    const uri = photo?.storagePath?.trim();
    if (!uri) return;

    setPreviewPhoto({
      visible: true,
      uri,
      title: photo?.caption?.trim() || 'Job photo',
    });
  };

  const closePhotoPreview = () => {
    setPreviewPhoto({
      visible: false,
      uri: '',
      title: '',
    });
  };

  const statusLabel = job?.status?.trim() || 'Scheduled';
  const canStart = statusLabel === 'Scheduled';
  const canComplete = statusLabel === 'In Progress';
  const customerPhone = job?.customer?.mobilePhone?.trim();
  const customerEmail = job?.customer?.email?.trim();
  const calendarDays = useMemo(() => getCalendarDays(calendarCursor), [calendarCursor]);
  const sheetTitle =
    activeSheet === 'quickStatus'
      ? 'Update Job Status'
      : activeSheet === 'jobType'
        ? 'Select Job Type'
        : activeSheet === 'priority'
          ? 'Select Priority'
          : activeSheet === 'status'
            ? 'Select Status'
            : activeSheet === 'serviceCountry'
              ? 'Select Country'
              : activeSheet === 'serviceState'
                ? 'Select State / Province'
                : activeSheet === 'date'
                  ? 'Select Date'
                  : activeSheet === 'time'
                    ? 'Select Time'
                    : activeSheet === 'duration'
                      ? 'Select Duration'
                      : activeSheet === 'editNote'
                        ? 'Edit Note'
                        : 'Edit Job';
  const sheetOptions =
    activeSheet === 'jobType'
      ? JOB_TYPE_OPTIONS
      : activeSheet === 'priority'
        ? JOB_PRIORITY_OPTIONS
        : activeSheet === 'status'
          ? JOB_STATUS_OPTIONS
          : activeSheet === 'serviceCountry'
            ? countryOptions.map(option => option.value)
            : activeSheet === 'serviceState'
              ? stateOptions.map(option => option.value)
              : activeSheet === 'duration'
                ? DURATION_OPTIONS
                : [];
  const getSheetOptionLabel = (option: string) => {
    if (activeSheet === 'serviceCountry') {
      return countryOptions.find(item => item.value === option)?.label || option;
    }

    if (activeSheet === 'serviceState') {
      return stateOptions.find(item => item.value === option)?.label || option;
    }

    return option;
  };
  const isSheetOptionSelected = (option: string) => {
    if (activeSheet === 'jobType') return editJobType === option;
    if (activeSheet === 'priority') return editPriority === option;
    if (activeSheet === 'status') return editStatus === option;
    if (activeSheet === 'duration') return editDurationMinutes === option;
    if (activeSheet === 'serviceCountry') return editCountry === option;
    if (activeSheet === 'serviceState') return editState === option;

    return false;
  };

  return (
    <SafeAreaView style={styles.container}>


      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerJobID}>{job?.jobNumber?.trim() || 'JOB DETAILS'}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusLabel === 'Completed'
                      ? '#10b981'
                      : statusLabel === 'In Progress'
                        ? '#2563eb'
                        : statusLabel === 'Cancelled'
                          ? '#dc2626'
                          : '#f59e0b',
                },
              ]}
            />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={openEditSheet}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <JobDetailSkeleton />
      ) : error && !job ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load job</Text>
          <Text style={styles.stateError}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadJob('initial')}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadJob('refresh')} tintColor="#2563eb" />
          }
        >
          <View style={styles.mapSection}>
            <WebView
              style={StyleSheet.absoluteFill}
              source={{ html: mapHtml }}
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              pointerEvents="none"
            />

            {/* Open in Google Maps button */}
            <TouchableOpacity style={styles.mapOpenBtn} onPress={handleOpenMaps} activeOpacity={0.85}>
              <MapPin size={12} color="#2563eb" />
              <Text style={styles.mapOpenBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>

            {/* Pin overlay — shown only when coordinates are stored */}
            {hasCoordinates ? (
              <View style={styles.mapPinContainer}>
                <Animated.View
                  style={[styles.mapGlowOuter, {
                    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.15, 0] }),
                  }]}
                />
                <Animated.View
                  style={[styles.mapGlowInner, {
                    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
                    opacity: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.4, 0.1] }),
                  }]}
                />
                <View style={styles.mapIconBox}>
                  <MapPin size={20} color="white" fill="white" />
                </View>
              </View>
            ) : (
              <View style={styles.mapNoPinChip}>
                <MapPin size={13} color="#64748b" />
                <Text style={styles.mapNoPinText}>No precise location stored</Text>
              </View>
            )}

            {/* Address pill */}
            <View style={styles.mapAddressPill}>
              <Text style={styles.mapAddressText} numberOfLines={1}>{getJobAddressText(job)}</Text>
            </View>
          </View>

          <View style={styles.jobInfoSection}>
            <Text style={styles.jobTitle}>{getJobDisplayTitle(job)}</Text>
            <View style={styles.scheduleChipsRow}>
              <View style={styles.scheduleDateChip}>
                <Calendar size={13} color="#64748b" />
                <Text style={styles.scheduleDateChipText}>{formatDate(job?.scheduledStartAt)}</Text>
              </View>
              <View style={styles.scheduleTimeChip}>
                <Clock size={14} color="#2563eb" />
                <Text style={styles.scheduleTimeChipText}>{timeLabel}</Text>
              </View>
            </View>
            <View style={styles.jobTagRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{job?.jobType?.trim() || 'General'}</Text>
              </View>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{job?.priority?.trim() || 'Normal'} priority</Text>
              </View>
            </View>
            {!!job?.description?.trim() && (
              <Text style={styles.descriptionText}>{job.description.trim()}</Text>
            )}
            <View style={styles.jobActionRow}>
              <TouchableOpacity style={styles.primarySoftAction} onPress={openEditSheet} activeOpacity={0.9}>
                <Text style={styles.primarySoftActionText}>Edit Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statusSoftAction}
                onPress={() => setActiveSheet('quickStatus')}
                activeOpacity={0.9}
                disabled={isStatusUpdating}
              >
                {isStatusUpdating ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Text style={styles.statusSoftActionText}>Status</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerSoftAction}
                onPress={handleDeleteJob}
                activeOpacity={0.9}
                disabled={isDetailsSaving}
              >
                <Text style={styles.dangerSoftActionText}>Delete</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.createInvoiceBtn} onPress={handleCreateInvoice} activeOpacity={0.88}>
              <FileText size={16} color="#059669" />
              <Text style={styles.createInvoiceBtnText}>Create Invoice from this Job</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.customerSection}>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.avatarText}>{getJobInitials(job)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{getJobCustomerName(job)}</Text>
                <Text style={styles.customerAddress}>{getJobAddressText(job)}</Text>
              </View>
              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={[styles.actionCircle, !customerPhone && styles.actionCircleDisabled]}
                  onPress={handleCall}
                  disabled={!customerPhone}
                >
                  <Phone size={18} color={customerPhone ? '#2563eb' : '#cbd5e1'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionCircle, !customerEmail && styles.actionCircleDisabled]}
                  onPress={handleEmail}
                  disabled={!customerEmail}
                >
                  <Mail size={18} color={customerEmail ? '#2563eb' : '#cbd5e1'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Assigned Workers */}
          <View style={styles.workersSection}>
            <View style={styles.workersSectionHeader}>
              <View style={styles.workersSectionTitleRow}>
                <Users size={16} color="#64748b" />
                <Text style={styles.workersSectionTitle}>Assigned Workers</Text>
              </View>
              <TouchableOpacity style={styles.assignWorkersBtn} onPress={openWorkerPicker}>
                <UserCheck size={14} color="#2563eb" />
                <Text style={styles.assignWorkersBtnText}>Assign</Text>
              </TouchableOpacity>
            </View>
            {(job?.assignments || []).length === 0 ? (
              <Text style={styles.noWorkersText}>No workers assigned</Text>
            ) : (
              <View style={styles.workerChipRow}>
                {(job?.assignments || []).map((a: any) => (
                  <View key={a.id} style={[styles.workerChip, a.isPrimary && styles.workerChipPrimary]}>
                    <View style={styles.workerChipAvatar}>
                      <Text style={styles.workerChipAvatarText}>
                        {(a.displayName || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <Text style={styles.workerChipName} numberOfLines={1}>{a.displayName}</Text>
                    {a.isPrimary ? (
                      <View style={styles.primaryDot} />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {!!error ? (
            <View style={styles.inlineErrorBox}>
              <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <View style={styles.tabBar}>
              {(['Checklist', 'Items', 'Photos', 'Notes', 'Expenses'] as TabType[]).map(tab => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                  {activeTab === tab ? <View style={styles.tabIndicator} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.contentPadding}>
            {activeTab === 'Checklist' ? (
              <View style={styles.listGap}>
                <View style={styles.checklistHeaderCard}>
                  <Text style={styles.checklistHeaderTitle}>Checklist</Text>
                  <Text style={styles.checklistHeaderText}>Tap to complete, drag handle to reorder.</Text>
                </View>

                {(job?.checklistItems || []).map((item, index, items) => (
                  <ChecklistRow
                    key={item.id || `${item.taskName}-${index}`}
                    item={item}
                    index={index}
                    total={items.length}
                    disabled={isChecklistSaving}
                    isDragging={draggingChecklistId === item.id}
                    onToggle={() => toggleChecklistItem(item.id)}
                    onDelete={() => handleDeleteTask(item.id)}
                    onDragStart={() => setDraggingChecklistId(item.id || '')}
                    onDragShift={direction => {
                      if (item.id) {
                        moveChecklistItemLocally(item.id, direction);
                      }
                    }}
                    onDragEnd={() => {
                      if (item.id) {
                        persistChecklistOrder();
                      } else {
                        setDraggingChecklistId('');
                      }
                    }}
                  />
                ))}

                <View style={styles.addTaskRow}>
                  <TextInput
                    style={styles.addTaskInput}
                    placeholder="Add checklist task..."
                    placeholderTextColor="#cbd5e1"
                    value={newTask}
                    onChangeText={setNewTask}
                  />
                  <TouchableOpacity
                    style={[styles.addTaskBtn, !newTask.trim() && styles.addTaskBtnDisabled]}
                    onPress={handleAddTask}
                    disabled={!newTask.trim() || isChecklistSaving}
                  >
                    {isChecklistSaving ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <>
                        <Plus size={16} color="#2563eb" />
                        <Text style={styles.addTaskText}>ADD</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {activeTab === 'Photos' ? (
              <View style={styles.photoGrid}>
                <View style={styles.photoActionCard}>
                  <Text style={styles.photoActionTitle}>Add job photos</Text>
                  <Text style={styles.photoActionText}>
                    Capture a new image on-site or pick one from the gallery, then we will upload it and attach it to this job.
                  </Text>
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={[styles.photoActionBtn, isPhotoUploading && styles.photoActionBtnDisabled]}
                      onPress={() => handleAddPhoto('camera')}
                      disabled={isPhotoUploading}
                    >
                      {isPhotoUploading ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <>
                          <Camera size={16} color="#2563eb" />
                          <Text style={styles.photoActionBtnText}>Take Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.photoActionBtn, isPhotoUploading && styles.photoActionBtnDisabled]}
                      onPress={() => handleAddPhoto('library')}
                      disabled={isPhotoUploading}
                    >
                      {isPhotoUploading ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <>
                          <Images size={16} color="#2563eb" />
                          <Text style={styles.photoActionBtnText}>Choose Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {(job?.photos || []).length > 0 ? (
                  <View style={styles.photoTiles}>
                    {(job?.photos || []).map(photo => (
                      <View key={photo.id || photo.storagePath} style={styles.photoTile}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={styles.photoTileTouchable}
                          onPress={() => openPhotoPreview(photo)}
                          disabled={!photo.storagePath}
                        >
                          {photo.storagePath ? (
                            <Image source={{ uri: photo.storagePath }} style={styles.photoImage} contentFit="cover" />
                          ) : (
                            <View style={styles.photoPlaceholder}>
                              <Text style={styles.photoPlaceholderText}>No preview</Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {photo.id ? (
                          <TouchableOpacity
                            style={styles.photoDeleteIconBtn}
                            onPress={() => handleDeletePhoto(photo.id)}
                            disabled={isPhotoDeletingId === photo.id}
                          >
                            {isPhotoDeletingId === photo.id ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Trash2 size={14} color="white" />
                            )}
                          </TouchableOpacity>
                        ) : null}

                        <View style={styles.photoMeta}>
                          <Text style={styles.photoCaption} numberOfLines={1}>
                            {photo.caption?.trim() || 'Untitled photo'}
                          </Text>
                          <Text style={styles.photoTimestamp} numberOfLines={1}>
                            {formatDateTime(photo.createdAt)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No photos yet</Text>
                    <Text style={styles.emptyCardText}>Photos you add from the camera or gallery will appear here.</Text>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === 'Items' ? (
              <View style={styles.listGap}>
                <View style={styles.checklistHeaderCard}>
                  <Text style={styles.checklistHeaderTitle}>Service Items</Text>
                  <Text style={styles.checklistHeaderText}>
                    Items here will auto-fill when creating an invoice from this job.
                  </Text>
                </View>

                {jobLineItems.length > 0 ? (
                  jobLineItems.map((item, index) => (
                    <View key={item.id || index} style={styles.lineItemCard}>
                      <View style={styles.lineItemIcon}>
                        <Package size={16} color="#2563eb" />
                      </View>
                      <View style={styles.lineItemMain}>
                        <Text style={styles.lineItemName}>{item.serviceName}</Text>
                        {item.description ? (
                          <Text style={styles.lineItemDesc}>{item.description}</Text>
                        ) : null}
                        <View style={styles.lineItemPriceRow}>
                          <Text style={styles.lineItemMeta}>
                            {item.quantity} × {item.unitPrice.toFixed(2)}
                          </Text>
                          <Text style={styles.lineItemTotal}>
                            = {(item.lineTotal ?? item.quantity * item.unitPrice).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteLineItem(index)}
                        disabled={isItemsSaving}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.lineItemDeleteBtn}
                      >
                        <Trash2 size={15} color={isItemsSaving ? '#cbd5e1' : '#ef4444'} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No items yet</Text>
                    <Text style={styles.emptyCardText}>Pick from your catalog or add manually. Items auto-fill your invoice.</Text>
                  </View>
                )}

                <View style={styles.addItemActionsRow}>
                  <TouchableOpacity style={styles.addItemCatalogBtn} onPress={openCatalogPicker} activeOpacity={0.85}>
                    <BookOpen size={15} color="#2563eb" />
                    <Text style={styles.addItemCatalogBtnText}>From Catalog</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addItemManualBtn, showManualForm && styles.addItemManualBtnActive]}
                    onPress={() => setShowManualForm(v => !v)}
                    activeOpacity={0.85}
                  >
                    <Plus size={15} color={showManualForm ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.addItemManualBtnText, showManualForm && styles.addItemManualBtnTextActive]}>
                      Add Manually
                    </Text>
                  </TouchableOpacity>
                </View>

                {showManualForm ? (
                  <View style={styles.addItemCard}>
                    <TextInput
                      style={styles.addItemInput}
                      placeholder="Service name *"
                      placeholderTextColor="#94a3b8"
                      value={newItemName}
                      onChangeText={setNewItemName}
                    />
                    <TextInput
                      style={[styles.addItemInput, styles.addItemDescInput]}
                      placeholder="Description (optional)"
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={2}
                      value={newItemDesc}
                      onChangeText={setNewItemDesc}
                    />
                    <View style={styles.addItemRow}>
                      <View style={styles.addItemSmall}>
                        <Text style={styles.addItemFieldLabel}>Quantity</Text>
                        <TextInput
                          style={styles.addItemInput}
                          placeholder="1"
                          placeholderTextColor="#94a3b8"
                          keyboardType="decimal-pad"
                          value={newItemQty}
                          onChangeText={setNewItemQty}
                        />
                      </View>
                      <View style={styles.addItemSmall}>
                        <Text style={styles.addItemFieldLabel}>Unit Price</Text>
                        <TextInput
                          style={styles.addItemInput}
                          placeholder="0.00"
                          placeholderTextColor="#94a3b8"
                          keyboardType="decimal-pad"
                          value={newItemPrice}
                          onChangeText={setNewItemPrice}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.addItemSaveBtn, (!newItemName.trim() || isItemsSaving) && styles.addItemSaveBtnDisabled]}
                      onPress={handleAddLineItem}
                      disabled={!newItemName.trim() || isItemsSaving}
                      activeOpacity={0.85}
                    >
                      {isItemsSaving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.addItemSaveBtnText}>Add Item</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'Expenses' ? (
              <View style={styles.expensesSection}>
                {/* Profit card */}
                {(() => {
                  const totalExp = jobExpenses.reduce((s, e) => s + e.amount, 0);
                  const profit = jobInvoiceTotal !== null ? jobInvoiceTotal - totalExp : null;
                  return (
                    <View style={styles.profitCard}>
                      <View style={styles.profitCardItem}>
                        <Text style={styles.profitCardLabel}>Expenses</Text>
                        <Text style={[styles.profitCardValue, { color: '#dc2626' }]}>{formatInvoiceCurrency(totalExp)}</Text>
                      </View>
                      <View style={styles.profitCardDivider} />
                      <View style={styles.profitCardItem}>
                        <Text style={styles.profitCardLabel}>Invoice</Text>
                        <Text style={styles.profitCardValue}>{jobInvoiceTotal !== null ? formatInvoiceCurrency(jobInvoiceTotal) : '—'}</Text>
                      </View>
                      <View style={styles.profitCardDivider} />
                      <View style={styles.profitCardItem}>
                        <Text style={styles.profitCardLabel}>Net Profit</Text>
                        <Text style={[styles.profitCardValue, { color: profit !== null ? (profit >= 0 ? '#059669' : '#dc2626') : '#94a3b8' }]}>
                          {profit !== null ? formatInvoiceCurrency(profit) : '—'}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Add button */}
                <TouchableOpacity style={styles.expAddBtn} onPress={openAddExpense}>
                  <Plus size={15} color="#2563eb" />
                  <Text style={styles.expAddBtnText}>Add Expense</Text>
                </TouchableOpacity>

                {/* List */}
                {isExpensesLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />
                ) : jobExpenses.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No expenses yet</Text>
                    <Text style={styles.emptyCardText}>Log materials, fuel, and labour costs for this job.</Text>
                  </View>
                ) : (
                  <View style={styles.expenseList}>
                    {jobExpenses.map((exp, idx) => {
                      const colors = CATEGORY_COLORS[exp.category] ?? CATEGORY_COLORS.other;
                      const isDeleting = deletingExpenseId === exp.id;
                      const isLast = idx === jobExpenses.length - 1;
                      return (
                        <View key={exp.id} style={[styles.expenseRow, isLast && { borderBottomWidth: 0 }]}>
                          <View style={[styles.expCatDot, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.expCatDotText, { color: colors.text }]}>
                              {formatExpenseCategoryLabel(exp.category).charAt(0)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.expDesc}>{exp.description}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <View style={[styles.expCatBadge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.expCatBadgeText, { color: colors.text }]}>{formatExpenseCategoryLabel(exp.category)}</Text>
                              </View>
                              <Text style={styles.expDate}>{formatExpenseDate(exp.expenseDate)}</Text>
                            </View>
                            {exp.vendorName ? <Text style={styles.expVendor}>{exp.vendorName}</Text> : null}
                          </View>
                          <Text style={styles.expAmount}>{formatInvoiceCurrency(exp.amount)}</Text>
                          <TouchableOpacity style={styles.expActionBtn} onPress={() => openEditExpense(exp)}>
                            <Package size={14} color="#64748b" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.expActionBtn} onPress={() => handleDeleteExpense(exp.id)} disabled={isDeleting}>
                            {isDeleting ? <ActivityIndicator size="small" color="#dc2626" /> : <Trash2 size={14} color="#dc2626" />}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === 'Notes' ? (
              <View style={styles.notesSection}>
                <View style={styles.noteComposer}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add an update for your team or customer..."
                    placeholderTextColor="#cbd5e1"
                    multiline
                    value={newNote}
                    onChangeText={setNewNote}
                  />
                  <TouchableOpacity
                    style={[styles.noteSubmitBtn, !newNote.trim() && styles.noteSubmitBtnDisabled]}
                    onPress={handleAddNote}
                    disabled={!newNote.trim() || isNoteSaving}
                  >
                    {isNoteSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.noteSubmitText}>Add Note</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {(job?.notes || []).length > 0 ? (
                  (job?.notes || []).map(note => (
                    <View key={note.id || note.createdAt} style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <View style={styles.noteAuthorBadge}>
                          <MessageSquare size={14} color="#2563eb" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteAuthor}>{note.createdByDisplayName?.trim() || 'Team update'}</Text>
                          <Text style={styles.noteTime}>{formatDateTime(note.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.noteBody}>{note.body?.trim() || 'No note content'}</Text>
                      {note.id ? (
                        <View style={styles.noteActionsRow}>
                          <TouchableOpacity
                            style={styles.noteActionBtn}
                            onPress={() => openEditNoteSheet(note.id, note.body)}
                            disabled={isNoteMutatingId === note.id}
                          >
                            <Text style={styles.noteActionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.noteActionBtn, styles.noteDeleteActionBtn]}
                            onPress={() => handleDeleteNote(note.id)}
                            disabled={isNoteMutatingId === note.id}
                          >
                            {isNoteMutatingId === note.id ? (
                              <ActivityIndicator size="small" color="#b91c1c" />
                            ) : (
                              <Text style={[styles.noteActionText, styles.noteDeleteActionText]}>Delete</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No notes yet</Text>
                    <Text style={styles.emptyCardText}>Keep job progress visible by posting updates here.</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {job ? (
        <View style={styles.footer}>
          {canStart || canComplete ? (
            <TouchableOpacity
              onPress={handleStatusUpdate}
              style={[styles.startBtn, canComplete && styles.completeBtn]}
              activeOpacity={0.9}
              disabled={isStatusUpdating}
            >
              {isStatusUpdating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  {canStart ? (
                    <Play size={20} color="white" fill="white" />
                  ) : (
                    <CheckCircle2 size={18} color="white" strokeWidth={2.5} />
                  )}
                  <Text style={styles.startBtnText}>{canStart ? 'Start Job' : 'Complete Job'}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.statusFooterCard}>
              <Text style={styles.statusFooterLabel}>Current status</Text>
              <Text style={styles.statusFooterText}>{statusLabel}</Text>
            </View>
          )}
        </View>
      ) : null}

      <Modal visible={showCatalogPicker} animationType="slide" onRequestClose={() => setShowCatalogPicker(false)}>
        <SafeAreaView style={styles.catalogModalOverlay}>
          <View style={styles.catalogModalContent}>
            <View style={styles.catalogModalHeader}>
              <Text style={styles.catalogModalTitle}>Select Services</Text>
              <TouchableOpacity onPress={() => setShowCatalogPicker(false)} style={styles.catalogModalCloseBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.catalogSearchContainer}>
              <Search size={18} color="#cbd5e1" style={styles.catalogSearchIcon} />
              <TextInput
                style={styles.catalogSearchInput}
                placeholder="Search services..."
                placeholderTextColor="#94a3b8"
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                autoCorrect={false}
              />
            </View>

            {isCatalogLoading ? (
              <View style={styles.catalogLoadingBox}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.catalogLoadingText}>Loading catalog...</Text>
              </View>
            ) : filteredCatalog.length === 0 ? (
              <View style={styles.catalogLoadingBox}>
                <Text style={styles.catalogEmptyText}>
                  {serviceCatalog.length === 0 ? 'No services in your catalog yet.' : 'No results found.'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.catalogModalScroll} showsVerticalScrollIndicator={false}>
                {filteredCatalog.map(item => {
                  const isSelected = Boolean(item.id && selectedCatalogIds.includes(item.id));
                  return (
                    <View
                      key={item.id}
                      style={[styles.catalogModalItem, isSelected && styles.catalogModalItemSelected]}
                    >
                      <TouchableOpacity
                        style={styles.catalogModalItemRow}
                        onPress={() => item.id && toggleCatalogItem(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.catalogModalItemContent}>
                          <Text style={[styles.catalogModalItemTitle, isSelected && styles.catalogModalItemTitleSelected]}>
                            {item.name}
                          </Text>
                          {item.description ? (
                            <Text style={styles.catalogModalItemDesc} numberOfLines={2}>{item.description}</Text>
                          ) : null}
                          <View style={styles.catalogModalItemMeta}>
                            {item.category ? (
                              <View style={styles.catalogCategoryChip}>
                                <Text style={styles.catalogCategoryText}>{item.category}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.catalogModalItemPrice}>
                              {(item.defaultUnitPrice ?? 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        {isSelected ? (
                          <View style={styles.catalogCheckCircle}>
                            <Check size={14} color="white" strokeWidth={4} />
                          </View>
                        ) : (
                          <View style={styles.catalogUncheckCircle} />
                        )}
                      </TouchableOpacity>

                      {isSelected && item.id ? (
                        <View style={styles.catalogQtyRow}>
                          <Text style={styles.catalogQtyLabel}>Quantity</Text>
                          <View style={styles.catalogQtyStepper}>
                            <TouchableOpacity
                              style={styles.catalogQtyBtn}
                              onPress={() => stepCatalogQty(item.id!, -1)}
                            >
                              <Text style={styles.catalogQtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={styles.catalogQtyInput}
                              value={catalogQuantities[item.id] ?? '1'}
                              onChangeText={v => setCatalogItemQty(item.id!, v)}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                            />
                            <TouchableOpacity
                              style={styles.catalogQtyBtn}
                              onPress={() => stepCatalogQty(item.id!, 1)}
                            >
                              <Text style={styles.catalogQtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.catalogModalFooter}>
              <TouchableOpacity
                style={[styles.catalogAddBtn, (selectedCatalogIds.length === 0 || isItemsSaving) && styles.catalogAddBtnDisabled]}
                onPress={handleAddFromCatalog}
                disabled={selectedCatalogIds.length === 0 || isItemsSaving}
                activeOpacity={0.88}
              >
                {isItemsSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.catalogAddBtnText}>
                    {selectedCatalogIds.length > 0
                      ? `Add ${selectedCatalogIds.length} Item${selectedCatalogIds.length > 1 ? 's' : ''}`
                      : 'Select items above'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Worker Picker Modal */}
      <Modal visible={showWorkerPicker} animationType="slide" onRequestClose={() => setShowWorkerPicker(false)}>
        <SafeAreaView style={styles.catalogModalOverlay}>
          <View style={styles.catalogModalContent}>
            <View style={styles.catalogModalHeader}>
              <Text style={styles.catalogModalTitle}>Assign Workers</Text>
              <TouchableOpacity style={styles.catalogModalCloseBtn} onPress={() => setShowWorkerPicker(false)}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.catalogSearchContainer}>
              <Search size={18} color="#94a3b8" style={styles.catalogSearchIcon} />
              <TextInput
                style={styles.catalogSearchInput}
                placeholder="Search workers..."
                placeholderTextColor="#94a3b8"
                value={workerSearch}
                onChangeText={setWorkerSearch}
              />
            </View>

            {isWorkersLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <ScrollView style={styles.catalogModalScroll} showsVerticalScrollIndicator={false}>
                {filteredAssignableWorkers.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 14 }}>No workers found</Text>
                  </View>
                ) : (
                  filteredAssignableWorkers.map(worker => {
                    const isSelected = selectedWorkerIds.includes(worker.id);
                    const isPrimary = primaryWorkerId === worker.id;
                    return (
                      <View key={worker.id} style={[styles.catalogModalItem, isSelected && styles.catalogModalItemSelected]}>
                        <TouchableOpacity
                          style={styles.catalogModalItemRow}
                          onPress={() => toggleWorker(worker.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.workerPickerAvatar}>
                            <Text style={styles.workerPickerAvatarText}>{getWorkerInitials(worker)}</Text>
                          </View>
                          <View style={styles.catalogModalItemContent}>
                            <Text style={styles.catalogModalItemTitle}>{worker.displayName}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
                              <View style={styles.workerRoleChip}>
                                <Shield size={9} color="#64748b" />
                                <Text style={styles.workerRoleChipText}>{formatWorkerRoleLabel(worker.role)}</Text>
                              </View>
                              {worker.email ? (
                                <Text style={styles.workerPickerEmail} numberOfLines={1}>{worker.email}</Text>
                              ) : null}
                            </View>
                          </View>
                          {isSelected ? (
                            <View style={styles.catalogCheckCircle}>
                              <Check size={14} color="white" />
                            </View>
                          ) : (
                            <View style={styles.catalogUncheckCircle} />
                          )}
                        </TouchableOpacity>
                        {isSelected ? (
                          <TouchableOpacity
                            style={styles.primaryWorkerRow}
                            onPress={() => setPrimaryWorkerId(isPrimary ? null : worker.id)}
                          >
                            <View style={[styles.primaryRadio, isPrimary && styles.primaryRadioActive]}>
                              {isPrimary ? <View style={styles.primaryRadioDot} /> : null}
                            </View>
                            <Text style={styles.primaryWorkerLabel}>Set as primary</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={styles.catalogModalFooter}>
              <TouchableOpacity
                style={[styles.catalogAddBtn, isAssignSaving && styles.catalogAddBtnDisabled]}
                onPress={handleSaveAssignments}
                disabled={isAssignSaving}
                activeOpacity={0.88}
              >
                {isAssignSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.catalogAddBtnText}>
                    {selectedWorkerIds.length > 0
                      ? `Assign ${selectedWorkerIds.length} Worker${selectedWorkerIds.length > 1 ? 's' : ''}`
                      : 'Save (clear assignments)'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Expense Category Picker — full-screen modal */}
      <Modal visible={showExpCategoryModal} animationType="slide" onRequestClose={() => setShowExpCategoryModal(false)}>
        <SafeAreaView style={styles.expFsOverlay}>
          <View style={styles.expFsContent}>
            <View style={styles.expFsHeader}>
              <Text style={styles.expFsTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowExpCategoryModal(false)} style={styles.expFsCloseBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {EXPENSE_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={styles.expFsItem}
                  onPress={() => { setExpForm(f => ({ ...f, category: c.value })); setShowExpCategoryModal(false); }}
                >
                  <View style={styles.expFsItemContent}>
                    <Text style={styles.expFsItemTitle}>{c.label}</Text>
                    <Text style={styles.expFsItemSub}>{expForm.category === c.value ? 'Selected' : 'Tap to choose'}</Text>
                  </View>
                  {expForm.category === c.value && (
                    <View style={styles.expFsCheckCircle}>
                      <Check size={14} color="white" strokeWidth={4} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Expense Add / Edit — full-screen modal */}
      <Modal visible={showExpenseForm} animationType="slide" onRequestClose={() => setShowExpenseForm(false)}>
        <SafeAreaView style={styles.expFsOverlay}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.expFsContent}>
              <View style={styles.expFsHeader}>
                <Text style={styles.expFsTitle}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Text>
                <TouchableOpacity onPress={() => setShowExpenseForm(false)} style={styles.expFsCloseBtn}>
                  <X size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description *</Text>
                  <TextInput style={styles.formInput} value={expForm.description} onChangeText={v => setExpForm(f => ({ ...f, description: v }))} placeholder="e.g. Copper pipes, fuel to site" placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Amount *</Text>
                  <TextInput style={styles.formInput} value={expForm.amount} onChangeText={v => setExpForm(f => ({ ...f, amount: v }))} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Category *</Text>
                  <TouchableOpacity style={styles.formSelect} onPress={() => setShowExpCategoryModal(true)}>
                    <Text style={styles.formSelectText}>{EXPENSE_CATEGORIES.find(c => c.value === expForm.category)?.label ?? 'Select category'}</Text>
                    <ChevronDown size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD) *</Text>
                  <TextInput style={styles.formInput} value={expForm.expenseDate} onChangeText={v => setExpForm(f => ({ ...f, expenseDate: v }))} placeholder="2025-01-01" placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vendor / Supplier</Text>
                  <TextInput style={styles.formInput} value={expForm.vendorName} onChangeText={v => setExpForm(f => ({ ...f, vendorName: v }))} placeholder="e.g. Shell, Home Depot" placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Reference / Bill No.</Text>
                  <TextInput style={styles.formInput} value={expForm.referenceNumber} onChangeText={v => setExpForm(f => ({ ...f, referenceNumber: v }))} placeholder="Receipt number" placeholderTextColor="#94a3b8" />
                </View>
                <TouchableOpacity style={[styles.expFsSaveBtn, isSavingExpense && { opacity: 0.6 }]} onPress={handleSaveExpense} disabled={isSavingExpense}>
                  {isSavingExpense
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={styles.expFsSaveBtnText}>{editingExpense ? 'Save Changes' : 'Add Expense'}</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <BottomSheet visible={Boolean(activeSheet)} onClose={() => setActiveSheet(null)} title={sheetTitle}>
        {activeSheet === 'editJob' ? (
          <ScrollView style={styles.sheetScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <TouchableOpacity style={styles.sheetRefreshBtn} onPress={() => loadJob('refresh')}>
              <Text style={styles.sheetRefreshText}>Refresh latest job data</Text>
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Job title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter job title"
                placeholderTextColor="#94a3b8"
                value={editTitle}
                onChangeText={setEditTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Job type</Text>
              <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('jobType')}>
                <Text style={styles.formSelectText}>{editJobType || 'Select job type'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('priority')}>
                <Text style={styles.formSelectText}>{editPriority}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Status</Text>
              <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('status')}>
                <Text style={styles.formSelectText}>{editStatus}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formHalf]}>
                <Text style={styles.formLabel}>Date</Text>
                <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('date')}>
                  <Text style={styles.formSelectText}>{formatEditDateLabel(editScheduledDate)}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, styles.formHalf]}>
                <Text style={styles.formLabel}>Time</Text>
                <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('time')}>
                  <Text style={styles.formSelectText}>{formatEditTimeLabel(editScheduledTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Duration</Text>
              <TouchableOpacity style={styles.formSelect} onPress={() => setActiveSheet('duration')}>
                <Text style={styles.formSelectText}>{editDurationMinutes} mins</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addressCard}>
              <View style={styles.addressCardHeader}>
                <Text style={styles.formLabel}>Service Address</Text>
                <TouchableOpacity
                  style={[
                    styles.addressModeChip,
                    editUseCustomerPrimaryAddress && styles.addressModeChipActive,
                  ]}
                  onPress={() => setEditUseCustomerPrimaryAddress(value => !value)}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.addressModeChipText,
                      editUseCustomerPrimaryAddress && styles.addressModeChipTextActive,
                    ]}
                  >
                    {editUseCustomerPrimaryAddress ? 'Using customer primary' : 'Custom address'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!editUseCustomerPrimaryAddress ? (
                <>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Street address"
                    placeholderTextColor="#94a3b8"
                    value={editAddressLine1}
                    onChangeText={setEditAddressLine1}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Apartment, suite, landmark"
                    placeholderTextColor="#94a3b8"
                    value={editAddressLine2}
                    onChangeText={setEditAddressLine2}
                  />
                  <View style={styles.formRow}>
                    <TextInput
                      style={[styles.formInput, styles.formHalfInput]}
                      placeholder="City"
                      placeholderTextColor="#94a3b8"
                      value={editCity}
                      onChangeText={setEditCity}
                    />
                    <TouchableOpacity
                      style={[styles.formSelect, styles.formHalfInput]}
                      onPress={() => {
                        if (!editCountry) {
                          setError('Please select country first.');
                          return;
                        }

                        setActiveSheet('serviceState');
                      }}
                      disabled={!editCountry || isLoadingStates}
                    >
                      <Text style={styles.formSelectText}>
                        {isLoadingStates ? 'Loading...' : selectedState?.name || editState || 'Select state'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.formRow}>
                    <TextInput
                      style={[styles.formInput, styles.formHalfInput]}
                      placeholder="Postal Code"
                      placeholderTextColor="#94a3b8"
                      value={editPostalCode}
                      onChangeText={setEditPostalCode}
                    />
                    <TouchableOpacity
                      style={[styles.formSelect, styles.formHalfInput]}
                      onPress={() => setActiveSheet('serviceCountry')}
                      disabled={isLoadingCountries}
                    >
                      <Text style={styles.formSelectText}>
                        {isLoadingCountries ? 'Loading...' : selectedCountry?.name || editCountry || 'Select country'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.addressPreviewText}>{getJobAddressText(job)}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder="Describe the work to be done"
                placeholderTextColor="#94a3b8"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>

            <TouchableOpacity
              style={[styles.sheetPrimaryBtn, isDetailsSaving && styles.sheetPrimaryBtnDisabled]}
              onPress={handleSaveJobDetails}
              disabled={isDetailsSaving}
            >
              {isDetailsSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sheetPrimaryBtnText}>Save Job Details</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : activeSheet === 'editNote' ? (
          <View style={styles.sheetContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder="Update note"
                placeholderTextColor="#94a3b8"
                value={editingNoteBody}
                onChangeText={setEditingNoteBody}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>

            <TouchableOpacity
              style={[styles.sheetPrimaryBtn, !editingNoteBody.trim() && styles.sheetPrimaryBtnDisabled]}
              onPress={handleSaveEditedNote}
              disabled={!editingNoteBody.trim() || isNoteMutatingId === editingNoteId}
            >
              {isNoteMutatingId === editingNoteId ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sheetPrimaryBtnText}>Save Note</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : activeSheet === 'date' ? (
          <View style={styles.sheetContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
              >
                <Text style={styles.calendarNavText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsChoosingMonthYear(prev => !prev)}
                style={styles.calendarMonthSelectorBtn}
              >
                <Text style={styles.calendarMonthLabel}>{formatMonthLabel(calendarCursor)} ▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
              >
                <Text style={styles.calendarNavText}>Next</Text>
              </TouchableOpacity>
            </View>

            {isChoosingMonthYear ? (
              <View style={styles.monthYearPickerContainer}>
                <View style={styles.monthYearPickerRow}>
                  {/* Left Column: Months */}
                  <View style={styles.monthYearPickerCol}>
                    <Text style={styles.monthYearPickerTitle}>Select Month</Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.monthYearPickerScroll}>
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((monthName, idx) => {
                        const isSelected = calendarCursor.getMonth() === idx;
                        return (
                          <TouchableOpacity
                            key={monthName}
                            style={[styles.monthYearChip, isSelected && styles.monthYearChipActive]}
                            onPress={() => setCalendarCursor(current => new Date(current.getFullYear(), idx, 1))}
                          >
                            <Text style={[styles.monthYearChipText, isSelected && styles.monthYearChipTextActive]}>
                              {monthName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Right Column: Years */}
                  <View style={styles.monthYearPickerCol}>
                    <Text style={styles.monthYearPickerTitle}>Select Year</Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.monthYearPickerScroll}>
                      {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(year => {
                        const isSelected = calendarCursor.getFullYear() === year;
                        return (
                          <TouchableOpacity
                            key={year}
                            style={[styles.monthYearChip, isSelected && styles.monthYearChipActive]}
                            onPress={() => setCalendarCursor(current => new Date(year, current.getMonth(), 1))}
                          >
                            <Text style={[styles.monthYearChipText, isSelected && styles.monthYearChipTextActive]}>
                              {year}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.monthYearConfirmBtn}
                  onPress={() => setIsChoosingMonthYear(false)}
                >
                  <Text style={styles.monthYearConfirmBtnText}>Back to Calendar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.calendarWeekRow}>
                  {WEEKDAY_LABELS.map(day => (
                    <Text key={day} style={styles.calendarWeekLabel}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((date, index) => {
                    const isoDate = date
                      ? `${date.getFullYear()}-${toTwoDigits(date.getMonth() + 1)}-${toTwoDigits(date.getDate())}`
                      : '';
                    const isSelected = isoDate === editScheduledDate;

                    return (
                      <TouchableOpacity
                        key={`${isoDate}-${index}`}
                        style={[styles.calendarCell, isSelected && styles.calendarCellSelected, !date && styles.calendarCellEmpty]}
                        disabled={!date}
                        onPress={() => {
                          if (isoDate) {
                            setEditScheduledDate(isoDate);
                            setActiveSheet('editJob');
                          }
                        }}
                      >
                        <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextSelected]}>
                          {date ? date.getDate() : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        ) : activeSheet === 'time' ? (
          <View style={styles.sheetContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.timePickerScroll} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.timeSheetContent}>
                <View style={styles.timeSelectorColumn}>
                  <Text style={styles.timeSelectorLabel}>Hour</Text>
                  <View style={styles.timeChipWrap}>
                    {HOUR_OPTIONS.map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[styles.timeChip, timeParts.hour12 === hour && styles.timeChipActive]}
                        onPress={() => setTimeParts(current => ({ ...current, hour12: hour }))}
                      >
                        <Text style={[styles.timeChipText, timeParts.hour12 === hour && styles.timeChipTextActive]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.timeSelectorColumn}>
                  <Text style={styles.timeSelectorLabel}>Minutes</Text>
                  <View style={styles.timeChipWrap}>
                    {MINUTE_OPTIONS.map(minute => (
                      <TouchableOpacity
                        key={minute}
                        style={[styles.timeChip, timeParts.minute === minute && styles.timeChipActive]}
                        onPress={() => setTimeParts(current => ({ ...current, minute }))}
                      >
                        <Text style={[styles.timeChipText, timeParts.minute === minute && styles.timeChipTextActive]}>
                          {toTwoDigits(minute)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.meridiemRow}>
                {(['AM', 'PM'] as TimeParts['meridiem'][]).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.meridiemChip, timeParts.meridiem === option && styles.meridiemChipActive]}
                    onPress={() => setTimeParts(current => ({ ...current, meridiem: option }))}
                  >
                    <Text
                      style={[
                        styles.meridiemChipText,
                        timeParts.meridiem === option && styles.meridiemChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetPrimaryBtn}
              onPress={() => {
                setEditScheduledTime(formatTimeParts(timeParts));
                setActiveSheet('editJob');
              }}
            >
              <Text style={styles.sheetPrimaryBtnText}>Apply Time</Text>
            </TouchableOpacity>
          </View>
        ) : activeSheet === 'quickStatus' ? (
          <View style={styles.sheetOptionsList}>
            {JOB_STATUS_OPTIONS.map(status => {
              const isCurrent = job?.status === status;
              const dotColor = STATUS_COLORS[status] || '#64748b';
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.sheetOptionRow, isCurrent && styles.sheetOptionRowActive]}
                  onPress={() => handleQuickStatus(status)}
                  disabled={isStatusUpdating || isCurrent}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.statusOptionDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.sheetOptionText, isCurrent && { color: dotColor }]}>{status}</Text>
                  </View>
                  {isCurrent ? <Check size={18} color={dotColor} strokeWidth={3} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.sheetOptionsList}>
            {sheetOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={styles.sheetOptionRow}
                onPress={() => {
                  if (activeSheet === 'jobType') setEditJobType(option);
                  if (activeSheet === 'priority') setEditPriority(option as JobPriority);
                  if (activeSheet === 'status') setEditStatus(option as JobStatus);
                  if (activeSheet === 'duration') setEditDurationMinutes(option);
                  if (activeSheet === 'serviceCountry') {
                    setEditCountry(option);
                    setEditState('');
                  }
                  if (activeSheet === 'serviceState') setEditState(option);
                  setActiveSheet('editJob');
                }}
              >
                <Text style={styles.sheetOptionText}>{getSheetOptionLabel(option)}</Text>
                {isSheetOptionSelected(option) ? <Check size={18} color="#2563eb" strokeWidth={3} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>

      <Modal visible={previewPhoto.visible} transparent animationType="fade" onRequestClose={closePhotoPreview}>
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={closePhotoPreview} activeOpacity={0.85}>
            <X size={20} color="white" />
          </TouchableOpacity>

          <View style={styles.previewContent}>
            {previewPhoto.uri ? (
              <Image source={{ uri: previewPhoto.uri }} style={styles.previewImage} contentFit="contain" />
            ) : null}
            <Text style={styles.previewTitle}>{previewPhoto.title}</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerJobID: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  scrollPadding: { paddingBottom: 150 },
  mapSection: {
    height: 220,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Map: no-location chip */
  mapNoPinChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  mapNoPinText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  /* Glow rings */
  mapGlowOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
  },
  mapGlowInner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
  },
  mapPinContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mapIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  /* Map overlay UI */
  mapOpenBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    zIndex: 2,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapOpenBtnText: { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  mapAddressPill: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.8)',
    zIndex: 2,
    alignItems: 'center',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapAddressText: { fontSize: 12, fontWeight: '700', color: '#1e3a8a', textAlign: 'center' },
  jobInfoSection: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  jobTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500', flexShrink: 1 },
  scheduleChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  scheduleDateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 14,
  },
  scheduleDateChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  scheduleTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5, borderColor: '#2563eb',
    borderRadius: 14,
  },
  scheduleTimeChipText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  jobTagRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },
  descriptionText: { marginTop: 16, fontSize: 14, lineHeight: 22, color: '#475569', textTransform: 'capitalize' },
  jobActionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primarySoftAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySoftActionText: { fontSize: 13, fontWeight: '900', color: '#2563eb' },
  dangerSoftAction: {
    minWidth: 80,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dangerSoftActionText: { fontSize: 13, fontWeight: '900', color: '#b91c1c' },
  statusSoftAction: {
    minWidth: 80,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusSoftActionText: { fontSize: 13, fontWeight: '900', color: '#059669' },
  createInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  createInvoiceBtnText: { fontSize: 14, fontWeight: '800', color: '#059669' },
  sheetOptionRowActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusOptionDot: { width: 10, height: 10, borderRadius: 5 },
  customerSection: { padding: 24, backgroundColor: 'white' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '900', color: '#2563eb' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  customerAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  customerActions: { flexDirection: 'row', gap: 8 },
  actionCircle: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleDisabled: { backgroundColor: '#f8fafc' },
  inlineErrorBox: {
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: { fontSize: 12, color: '#b91c1c', fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#2563eb' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2563eb', borderRadius: 3 },
  contentPadding: { padding: 24 },
  listGap: { gap: 12 },
  checklistHeaderCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  checklistHeaderTitle: { fontSize: 15, fontWeight: '900', color: '#1d4ed8' },
  checklistHeaderText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  checkItem: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkItemCard: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkItemCardDone: { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' },
  checkItemCardDragging: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  checkItemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkTextWrap: { flex: 1, gap: 3 },
  checkItemDone: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#475569' },
  checkSubText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  checkTextDone: { color: '#059669', textDecorationLine: 'line-through', opacity: 0.7 },
  checkActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDeleteIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDeleteBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDeleteText: { fontSize: 11, fontWeight: '800', color: '#b91c1c' },
  checkOrderActions: { gap: 8 },
  orderBtn: {
    minWidth: 52,
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnText: { fontSize: 10, fontWeight: '800', color: '#334155' },
  addTaskRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  addTaskInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  addTaskBtn: {
    minWidth: 84,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  addTaskBtnDisabled: { opacity: 0.55 },
  addTaskText: { fontSize: 11, fontWeight: '900', color: '#2563eb' },
  photoGrid: { gap: 14 },
  photoActionCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  photoActionTitle: { fontSize: 15, fontWeight: '900', color: '#1d4ed8' },
  photoActionText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#475569' },
  photoActionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  photoActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  photoActionBtnDisabled: { opacity: 0.7 },
  photoActionBtnText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  photoTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: '48.2%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  photoTileTouchable: {
    width: '100%',
  },
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoImage: { width: '100%', aspectRatio: 1, backgroundColor: '#e2e8f0' },
  photoPlaceholder: { aspectRatio: 1, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  photoMeta: { paddingHorizontal: 12, paddingVertical: 10 },
  photoCaption: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  photoTimestamp: { fontSize: 11, color: '#64748b', marginTop: 3 },
  photoDeleteIconBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 32,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 56,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  previewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  previewImage: {
    width: '100%',
    height: '78%',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  notesSection: { gap: 12 },
  noteComposer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteSubmitBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSubmitBtnDisabled: { opacity: 0.5 },
  noteSubmitText: { color: 'white', fontSize: 13, fontWeight: '800' },
  noteCard: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  noteAuthorBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteAuthor: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  noteTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  noteBody: { fontSize: 14, lineHeight: 22, color: '#475569' },
  noteActionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  noteActionBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDeleteActionBtn: { backgroundColor: '#fee2e2' },
  noteActionText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  noteDeleteActionText: { color: '#b91c1c' },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyCardText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startBtn: {
    height: 68,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  completeBtn: { backgroundColor: '#10b981' },
  startBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  statusFooterCard: {
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statusFooterLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.1, textTransform: 'uppercase' },
  statusFooterText: { marginTop: 4, fontSize: 18, fontWeight: '900', color: '#0f172a' },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 999 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#e2e8f0' },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  stateTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  stateError: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: 'white', fontSize: 14, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.38)' },
  sheetSafeArea: {
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheetCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 14,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetCloseBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  sheetCloseText: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  sheetScrollView: { maxHeight: '100%' },
  sheetContent: { gap: 14 },
  sheetRefreshBtn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRefreshText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  formGroup: { gap: 8 },
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  formLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },
  formInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  formHalfInput: { flex: 1 },
  formInputMultiline: { minHeight: 110, paddingTop: 14, paddingBottom: 14 },
  formSelect: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSelectText: { width: '100%', fontSize: 14, fontWeight: '600', color: '#0f172a' },
  addressCard: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    padding: 14,
  },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  addressModeChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressModeChipActive: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  addressModeChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  addressModeChipTextActive: { color: '#2563eb' },
  addressPreviewText: { fontSize: 13, lineHeight: 20, color: '#475569' },
  sheetPrimaryBtn: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  sheetPrimaryBtnDisabled: { opacity: 0.65 },
  sheetPrimaryBtnText: { color: 'white', fontSize: 15, fontWeight: '900' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  calendarMonthLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  calendarWeekRow: { flexDirection: 'row', marginTop: 12 },
  calendarWeekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  calendarCell: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  calendarCellEmpty: { opacity: 0 },
  calendarCellText: { fontSize: 13, fontWeight: '800', color: '#334155' },
  calendarCellTextSelected: { color: 'white' },
  timeSheetContent: { flexDirection: 'row', gap: 16 },
  timeSelectorColumn: { flex: 1 },
  timeSelectorLabel: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 10 },
  timeChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    minWidth: 54,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  timeChipText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  timeChipTextActive: { color: '#2563eb' },
  meridiemRow: { flexDirection: 'row', gap: 12 },
  meridiemChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridiemChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  meridiemChipText: { fontSize: 13, fontWeight: '900', color: '#475569' },
  meridiemChipTextActive: { color: '#2563eb' },
  sheetOptionsList: { gap: 8, paddingBottom: 6 },
  sheetOptionRow: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  timePickerScroll: {
    maxHeight: 280,
  },
  monthYearPickerContainer: {
    paddingTop: 10,
    paddingBottom: 16,
  },
  monthYearPickerRow: {
    flexDirection: 'row',
    gap: 16,
    height: 240,
  },
  monthYearPickerCol: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 12,
  },
  monthYearPickerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  monthYearPickerScroll: {
    flex: 1,
  },
  monthYearChip: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthYearChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  monthYearChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  monthYearChipTextActive: {
    color: '#2563eb',
  },
  monthYearConfirmBtn: {
    height: 50,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  monthYearConfirmBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  calendarMonthSelectorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lineItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 12,
  },
  lineItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  lineItemMain: { flex: 1 },
  lineItemName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  lineItemDesc: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
  lineItemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  lineItemMeta: { fontSize: 12, color: '#94a3b8' },
  lineItemTotal: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  lineItemDeleteBtn: { paddingTop: 2 },
  addItemActionsRow: { flexDirection: 'row', gap: 10 },
  addItemCatalogBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  addItemCatalogBtnText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  addItemManualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  addItemManualBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  addItemManualBtnText: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  addItemManualBtnTextActive: { color: '#2563eb' },
  addItemCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 10,
  },
  addItemInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  addItemDescInput: { minHeight: 64, textAlignVertical: 'top' },
  addItemFieldLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  addItemRow: { flexDirection: 'row', gap: 10 },
  addItemSmall: { flex: 1 },
  addItemSaveBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemSaveBtnDisabled: { opacity: 0.45 },
  addItemSaveBtnText: { fontSize: 14, fontWeight: '800', color: 'white' },
  catalogModalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  catalogModalContent: {
    flex: 1,
    padding: 24,
  },
  catalogModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  catalogModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  catalogModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catalogSearchContainer: {
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
  },
  catalogSearchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  catalogSearchInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  catalogLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  catalogLoadingText: { fontSize: 13, color: '#94a3b8' },
  catalogEmptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  catalogModalScroll: { flex: 1 },
  catalogModalItem: {
    width: '100%',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'column',
    marginBottom: 12,
  },
  catalogModalItemSelected: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  catalogModalItemContent: { flex: 1, paddingRight: 16 },
  catalogModalItemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  catalogModalItemTitleSelected: { color: '#2563eb' },
  catalogModalItemDesc: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
  catalogModalItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  catalogCategoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  catalogCategoryText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  catalogModalItemPrice: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  catalogCheckCircle: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  catalogUncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    flexShrink: 0,
  },
  catalogModalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catalogQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  catalogQtyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  catalogQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
  },
  catalogQtyBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogQtyBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
    lineHeight: 24,
  },
  catalogQtyInput: {
    width: 48,
    height: 38,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: 'white',
    paddingVertical: 0,
  },
  catalogModalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  catalogAddBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogAddBtnDisabled: { backgroundColor: '#cbd5e1' },
  catalogAddBtnText: { fontSize: 15, fontWeight: '900', color: 'white' },
  // Workers section
  workersSection: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  workersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  workersSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workersSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  assignWorkersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  assignWorkersBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  noWorkersText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  workerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  workerChipPrimary: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  workerChipAvatar: {
    width: 22,
    height: 22,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerChipAvatarText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'white',
  },
  workerChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 100,
  },
  primaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  // Worker picker
  workerPickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  workerPickerAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb',
  },
  workerRoleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  workerRoleChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  workerPickerEmail: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  primaryWorkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  primaryRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRadioActive: {
    borderColor: '#2563eb',
  },
  primaryRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  primaryWorkerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  // Expenses tab
  expensesSection: { gap: 12 },
  profitCard: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 4 },
  profitCardItem: { flex: 1, alignItems: 'center' },
  profitCardDivider: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  profitCardLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  profitCardValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  expAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  expAddBtnText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  expenseList: { borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', backgroundColor: '#fff' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  expCatDot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  expCatDotText: { fontSize: 14, fontWeight: '800' },
  expDesc: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  expCatBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  expCatBadgeText: { fontSize: 10, fontWeight: '600' },
  expDate: { fontSize: 11, color: '#94a3b8' },
  expVendor: { fontSize: 11, color: '#64748b', marginTop: 2 },
  expAmount: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  expActionBtn: { padding: 5 },

  // Expense full-screen modals (matches CreateJobScreen SelectionModal pattern)
  expFsOverlay: { flex: 1, backgroundColor: '#ffffff' },
  expFsContent: { flex: 1, padding: 24 },
  expFsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  expFsTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  expFsCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  expFsItem: { width: '100%', padding: 20, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  expFsItemContent: { flex: 1, paddingRight: 16 },
  expFsItemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  expFsItemSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  expFsCheckCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  expFsSaveBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  expFsSaveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});

export default JobDetailScreen;
