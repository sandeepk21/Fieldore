import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    ChevronLeft,
    Clock,
    Images,
    Mail,
    MapPin,
    MessageSquare,
    MoreVertical,
    Phone,
    Play,
    Plus,
    Trash2,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    Modal,
    PanResponder,
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

import {
    CountryLookupResponse,
    JobChecklistItemRequest,
    JobPhotoResponse,
    JobResponse,
    PostApiJobsAddPhotoJobIdBody,
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
    replaceJobChecklistApi,
    updateJobApi,
    updateJobStatusApi,
} from '@/src/services/jobService';
import {
    DURATION_OPTIONS,
    JOB_PRIORITY_OPTIONS,
    JOB_STATUS_OPTIONS,
    JOB_TYPE_OPTIONS,
    JobPriority,
    JobStatus,
} from '@/src/utils/jobValidation';

type TabType = 'Checklist' | 'Photos' | 'Notes';
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

const toInputDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}-${toTwoDigits(date.getMonth() + 1)}-${toTwoDigits(date.getDate())}`;
};

const toInputTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${toTwoDigits(date.getHours())}:${toTwoDigits(date.getMinutes())}`;
};

const parseTimeParts = (value: string): TimeParts => {
  const [hourString, minuteString] = value.split(':');
  const hour24 = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour12: 9, minute: 0, meridiem: 'AM' };
  }

  return {
    hour12: hour24 % 12 || 12,
    minute,
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
};

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
        <View style={styles.mapPulse} />
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
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
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
  const [draggingChecklistId, setDraggingChecklistId] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [countries, setCountries] = useState<CountryLookupResponse[]>([]);
  const [states, setStates] = useState<StateProvinceLookupResponse[]>([]);
  const pendingChecklistOrderRef = useRef<string[]>([]);
  const didReorderChecklistRef = useRef(false);

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

  const hydrateEditForm = useCallback((currentJob: JobResponse) => {
    setEditTitle(currentJob.title?.trim() || '');
    setEditJobType(currentJob.jobType?.trim() || JOB_TYPE_OPTIONS[0]);
    setEditPriority((currentJob.priority?.trim() as JobPriority) || 'Normal');
    setEditStatus((currentJob.status?.trim() as JobStatus) || 'Scheduled');
    setEditScheduledDate(toInputDate(currentJob.scheduledStartAt));
    const nextTimeValue = toInputTime(currentJob.scheduledStartAt);
    setEditScheduledTime(nextTimeValue);
    setTimeParts(parseTimeParts(nextTimeValue));
    setEditDurationMinutes(String(currentJob.estimatedDurationMinutes ?? 120));
    setEditUseCustomerPrimaryAddress(Boolean(currentJob.useCustomerPrimaryAddress));
    setEditAddressLine1(currentJob.serviceAddress?.line1?.trim() || '');
    setEditAddressLine2(currentJob.serviceAddress?.line2?.trim() || '');
    setEditCity(currentJob.serviceAddress?.city?.trim() || '');
    setEditState(currentJob.serviceAddress?.stateOrProvince?.trim() || '');
    setEditPostalCode(currentJob.serviceAddress?.postalCode?.trim() || '');
    setEditCountry(currentJob.serviceAddress?.country?.trim() || '');
    setEditDescription(currentJob.description?.trim() || '');
    setCalendarCursor(currentJob.scheduledStartAt ? new Date(currentJob.scheduledStartAt) : new Date());
  }, []);

  const scheduleLabel = useMemo(() => {
    if (!job?.scheduledStartAt) return 'No schedule';

    const start = `${formatDate(job.scheduledStartAt)} • ${formatTime(job.scheduledStartAt)}`;
    const end = job.scheduledEndAt ? formatTime(job.scheduledEndAt) : null;

    return end ? `${start} - ${end}` : start;
  }, [job]);

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
      setError(updateError?.message || 'Failed to update job status.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const openEditSheet = () => {
    if (!job) return;
    hydrateEditForm(job);
    setActiveSheet('editJob');
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
    activeSheet === 'jobType'
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
            <View style={styles.mapPinContainer}>
              <View style={styles.mapPulse} />
              <View style={styles.mapIconBox}>
                <MapPin size={20} color="white" fill="white" />
              </View>
            </View>
            <Text style={styles.addressHint}>{getJobAddressText(job)}</Text>
          </View>

          <View style={styles.jobInfoSection}>
            <Text style={styles.jobTitle}>{getJobDisplayTitle(job)}</Text>
            <View style={styles.jobMetaRow}>
              <View style={styles.metaItem}>
                <Calendar size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{formatDate(job?.scheduledStartAt)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{scheduleLabel}</Text>
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
                style={styles.dangerSoftAction}
                onPress={handleDeleteJob}
                activeOpacity={0.9}
                disabled={isDetailsSaving}
              >
                <Text style={styles.dangerSoftActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
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

          {!!error ? (
            <View style={styles.inlineErrorBox}>
              <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.tabBar}>
            {(['Checklist', 'Photos', 'Notes'] as TabType[]).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                {activeTab === tab ? <View style={styles.tabIndicator} /> : null}
              </TouchableOpacity>
            ))}
          </View>

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
              <Text style={styles.calendarMonthLabel}>{formatMonthLabel(calendarCursor)}</Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
              >
                <Text style={styles.calendarNavText}>Next</Text>
              </TouchableOpacity>
            </View>

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
          </View>
        ) : activeSheet === 'time' ? (
          <View style={styles.sheetContent}>
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
    height: 200,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapPinContainer: { alignItems: 'center', justifyContent: 'center' },
  mapPulse: { position: 'absolute', width: 60, height: 60, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: 30 },
  mapIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  addressHint: {
    marginTop: 20,
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '700',
    textAlign: 'center',
  },
  jobInfoSection: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  jobTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1, lineHeight: 28 },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500', flexShrink: 1 },
  jobTagRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },
  descriptionText: { marginTop: 16, fontSize: 14, lineHeight: 22, color: '#475569' },
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
    minWidth: 96,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dangerSoftActionText: { fontSize: 13, fontWeight: '900', color: '#b91c1c' },
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
  tabBar: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, paddingVertical: 16, alignItems: 'center' },
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
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    maxHeight: '78%',
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
});

export default JobDetailScreen;
