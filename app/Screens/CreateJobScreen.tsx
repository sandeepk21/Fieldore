import {
  CountryLookupResponse,
  StateProvinceLookupResponse,
  getFieldoreAPI,
} from '@/src/api/generated';
import { router } from 'expo-router';
import {
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  LucideIcon,
    MapPin,
    Plus,
    Search,
    StickyNote,
    Timer,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLoader } from '@/src/context/LoaderContext';
import { getCustomerDisplayName, getCustomersApi } from '@/src/services/customerService';
import { createJobApi } from '@/src/services/jobService';
import {
  CreateJobFormData,
  CreateJobFormErrors,
  DURATION_OPTIONS,
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  buildCreateJobPayload,
  createInitialJobFormData,
  validateCreateJobForm,
  validateJobField,
} from '@/src/utils/jobValidation';

interface SectionProps {
  title: string;
  accent: string;
  children: React.ReactNode;
}

interface InputFieldProps {
  label: string;
  placeholder: string;
  icon?: LucideIcon;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}

interface TriggerFieldProps {
  label: string;
  placeholder: string;
  icon: LucideIcon;
  value: string;
  onPress: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

type CustomerOption = {
  label: string;
  value: string;
};

type SelectOption = {
  label: string;
  value: string;
};

type SheetOption = SelectOption & {
  selected: boolean;
  onSelect: () => void;
};

type ActiveSheet =
  | 'customer'
  | 'jobType'
  | 'priority'
  | 'status'
  | 'duration'
  | 'serviceCountry'
  | 'serviceState'
  | null;

type TimeParts = {
  hour12: number;
  minute: number;
  meridiem: 'AM' | 'PM';
};

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 5);
const api = getFieldoreAPI();

const toTwoDigits = (value: number) => String(value).padStart(2, '0');

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);

const formatDisplayDate = (value: string) => {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDisplayTime = (value: string) => {
  if (!value) return '';

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

const parseTimeParts = (value: string): TimeParts => {
  const [hourString, minuteString] = value.split(':');
  const hour24 = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return { hour12: 9, minute: 0, meridiem: 'AM' };
  }

  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return {
    hour12,
    minute,
    meridiem,
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

const getCalendarDays = (cursor: Date) => {
  const startOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();
  const cells: (Date | null)[] = [];

  for (let index = 0; index < startDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${toTwoDigits(date.getMonth() + 1)}-${toTwoDigits(date.getDate())}`;

const Section: React.FC<SectionProps> = ({ title, accent, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: accent }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  icon: Icon,
  required,
  multiline,
  keyboardType = 'default',
  value,
  onChangeText,
  error,
  autoCapitalize = 'sentences',
  maxLength,
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required ? <View style={styles.requiredDot} /> : null}
    </View>
    <View style={[styles.inputWrapper, multiline && styles.textAreaWrapper, error && styles.inputWrapperError]}>
      {Icon ? <Icon size={16} color="#cbd5e1" style={multiline ? styles.iconTop : styles.iconCenter} /> : null}
      <TextInput
        style={[styles.textInput, multiline && styles.textArea, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        multiline={multiline}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
    {!!error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const TriggerField: React.FC<TriggerFieldProps> = ({
  label,
  placeholder,
  icon: Icon,
  value,
  onPress,
  error,
  required,
  disabled,
  loading,
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required ? <View style={styles.requiredDot} /> : null}
    </View>
    <TouchableOpacity
      style={[styles.inputWrapper, error && styles.inputWrapperError, disabled && styles.inputWrapperDisabled]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon size={16} color="#cbd5e1" style={styles.iconCenter} />
      <Text style={[styles.selectText, !value && styles.placeholderText]}>
        {loading ? 'Loading...' : value || placeholder}
      </Text>
      <ChevronDown size={16} color="#94a3b8" />
    </TouchableOpacity>
    {!!error && <Text style={styles.errorText}>{error}</Text>}
  </View>
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
            <View>
              <Text style={styles.sheetEyebrow}>Choose Value</Text>
              <Text style={styles.sheetTitle}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </SafeAreaView>
    </View>
  </Modal>
);

const SelectionModal = ({
  visible,
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onClose,
  options,
}: {
  visible: boolean;
  title: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  options: SheetOption[];
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.selectionModalOverlay}>
      <View style={styles.selectionModalContent}>
        <View style={styles.selectionModalHeader}>
          <Text style={styles.selectionModalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.selectionModalCloseBtn}>
            <X size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {searchPlaceholder ? (
          <View style={styles.selectionSearchContainer}>
            <Search size={18} color="#cbd5e1" style={styles.selectionSearchIcon} />
            <TextInput
              style={styles.selectionSearchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94a3b8"
              value={searchValue}
              onChangeText={onSearchChange}
            />
          </View>
        ) : null}

        <ScrollView style={styles.selectionModalScroll} showsVerticalScrollIndicator={false}>
          {options.map(option => (
            <TouchableOpacity
              key={option.value}
              style={styles.selectionModalItem}
              onPress={option.onSelect}
            >
              <View style={styles.selectionModalItemContent}>
                <Text style={styles.selectionModalItemTitle}>{option.label}</Text>
                <Text style={styles.selectionModalItemSubtitle}>
                  {option.selected ? 'Selected' : 'Tap to choose'}
                </Text>
              </View>
              {option.selected ? (
                <View style={styles.selectionModalCheckCircle}>
                  <Check size={14} color="white" strokeWidth={4} />
                </View>
              ) : (
                <ChevronRight size={18} color="#cbd5e1" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>
);

const CreateJobScreen: React.FC = () => {
  const { showLoader, hideLoader } = useLoader();
  const [formData, setFormData] = useState<CreateJobFormData>(createInitialJobFormData());
  const [errors, setErrors] = useState<CreateJobFormErrors>({});
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [isDateSheetVisible, setIsDateSheetVisible] = useState(false);
  const [isTimeSheetVisible, setIsTimeSheetVisible] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingServiceStates, setIsLoadingServiceStates] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [timeParts, setTimeParts] = useState<TimeParts>({ hour12: 9, minute: 0, meridiem: 'AM' });
  const [pendingChecklistItem, setPendingChecklistItem] = useState('');
  const [countries, setCountries] = useState<CountryLookupResponse[]>([]);
  const [serviceStates, setServiceStates] = useState<StateProvinceLookupResponse[]>([]);
  const [selectionSearch, setSelectionSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);

      try {
        const result = await getCustomersApi({
          pageNumber: 1,
          pageSize: 100,
          isActive: true,
        });

        setCustomers(
          result.data
            .map(customer => ({
              label: getCustomerDisplayName(customer),
              value: customer.id || '',
            }))
            .filter(option => option.value)
        );
      } catch (error: any) {
        setErrors(current => ({
          ...current,
          server: error?.message || 'Failed to load customers.',
        }));
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

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
      } catch (error: any) {
        setErrors(current => ({
          ...current,
          server: error?.response?.data?.message || error?.message || 'Failed to load countries.',
        }));
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.serviceCountryCode) {
        setServiceStates([]);
        return;
      }

      setIsLoadingServiceStates(true);

      try {
        const response = await api.getApiLocationsStates({ countryCode: formData.serviceCountryCode });
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Failed to load states');
        }

        setServiceStates(result.data || []);
      } catch (error: any) {
        setServiceStates([]);
        setErrors(current => ({
          ...current,
          server: error?.response?.data?.message || error?.message || 'Failed to load states.',
        }));
      } finally {
        setIsLoadingServiceStates(false);
      }
    };

    fetchStates();
  }, [formData.serviceCountryCode]);

  const selectedCustomerLabel = useMemo(
    () => customers.find(customer => customer.value === formData.customerId)?.label || '',
    [customers, formData.customerId]
  );

  const selectedServiceCountry = useMemo(
    () => countries.find(country => country.code === formData.serviceCountryCode),
    [countries, formData.serviceCountryCode]
  );

  const selectedServiceState = useMemo(
    () => serviceStates.find(state => (state.code || '') === formData.serviceStateCode),
    [formData.serviceStateCode, serviceStates]
  );

  const countryOptions: SelectOption[] = useMemo(
    () =>
      countries
        .map(country => ({
          label: country.name || country.code || 'Unknown Country',
          value: country.code || '',
        }))
        .filter(option => option.value),
    [countries]
  );

  const serviceStateOptions: SelectOption[] = useMemo(
    () =>
      serviceStates
        .map(state => ({
          label: state.name || state.code || 'Unknown Province',
          value: state.code || '',
        }))
        .filter(option => option.value),
    [serviceStates]
  );

  const formIsValid = useMemo(
    () => Object.keys(validateCreateJobForm(formData)).length === 0,
    [formData]
  );

  const calendarDays = useMemo(() => getCalendarDays(calendarCursor), [calendarCursor]);

  const closeAllSheets = () => {
    setActiveSheet(null);
    setSelectionSearch('');
    setIsDateSheetVisible(false);
    setIsTimeSheetVisible(false);
  };

  const closeSelectionModal = useCallback(() => {
    setActiveSheet(null);
    setSelectionSearch('');
  }, []);

  const handleFieldChange = useCallback((field: keyof CreateJobFormData, value: string | boolean | string[]) => {
    const nextData = { ...formData, [field]: value } as CreateJobFormData;

    if (field === 'useCustomerPrimaryAddress' && value) {
      nextData.serviceCountryCode = '';
      nextData.serviceStateCode = '';
    }

    setFormData(nextData);

    const fieldError = validateJobField(field, nextData[field], nextData);
    if (fieldError) {
      setErrors({ [field]: fieldError });
      return;
    }

    if (errors[field] || errors.server || errors.scheduledAt) {
      setErrors({});
    }
  }, [errors, formData]);

  const handleChecklistChange = (index: number, value: string) => {
    const nextChecklist = [...formData.checklist];
    nextChecklist[index] = value;
    handleFieldChange('checklist', nextChecklist);
  };

  const handleRemoveChecklistItem = (index: number) => {
    const nextChecklist = formData.checklist.filter((_, itemIndex) => itemIndex !== index);
    handleFieldChange('checklist', nextChecklist);
  };

  const handleAddChecklistItem = () => {
    const taskName = pendingChecklistItem.trim();
    if (!taskName) return;

    handleFieldChange('checklist', [...formData.checklist, taskName]);
    setPendingChecklistItem('');
  };

  const openDateSheet = () => {
    closeAllSheets();

    const initialDate = formData.scheduledDate
      ? new Date(`${formData.scheduledDate}T00:00:00`)
      : new Date();

    setCalendarCursor(
      Number.isNaN(initialDate.getTime()) ? new Date() : initialDate
    );
    setIsDateSheetVisible(true);
  };

  const openTimeSheet = () => {
    closeAllSheets();
    setTimeParts(parseTimeParts(formData.scheduledTime));
    setIsTimeSheetVisible(true);
  };

  const handleSelectDate = (date: Date) => {
    handleFieldChange('scheduledDate', toIsoDate(date));
    setIsDateSheetVisible(false);
  };

  const handleConfirmTime = () => {
    handleFieldChange('scheduledTime', formatTimeParts(timeParts));
    setIsTimeSheetVisible(false);
  };

  const handleSubmit = async () => {
    const validationErrors = validateCreateJobForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    showLoader();

    try {
      const createdJob = await createJobApi(buildCreateJobPayload(formData));

      Alert.alert('Success', 'Job created successfully.');
      router.replace({
        pathname: '../Screens/JobDetailScreen',
        params: { jobId: createdJob.id || '' },
      });
    } catch (error: any) {
      setErrors({
        server: error?.message || 'Failed to create job. Please try again.',
      });
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  const sheetConfig = useMemo(() => {
    switch (activeSheet) {
      case 'customer':
        return {
          title: 'Select Customer',
          options: customers.map(option => ({
            ...option,
            selected: formData.customerId === option.value,
            onSelect: () => {
              handleFieldChange('customerId', option.value);
              closeSelectionModal();
            },
          })),
        };
      case 'jobType':
        return {
          title: 'Select Job Type',
          options: JOB_TYPE_OPTIONS.map(option => ({
            label: option,
            value: option,
            selected: formData.jobType === option,
            onSelect: () => {
              handleFieldChange('jobType', option);
              closeSelectionModal();
            },
          })),
        };
      case 'priority':
        return {
          title: 'Select Priority',
          options: JOB_PRIORITY_OPTIONS.map(option => ({
            label: option,
            value: option,
            selected: formData.priority === option,
            onSelect: () => {
              handleFieldChange('priority', option);
              closeSelectionModal();
            },
          })),
        };
      case 'status':
        return {
          title: 'Select Status',
          options: JOB_STATUS_OPTIONS.map(option => ({
            label: option,
            value: option,
            selected: formData.status === option,
            onSelect: () => {
              handleFieldChange('status', option);
              closeSelectionModal();
            },
          })),
        };
      case 'duration':
        return {
          title: 'Select Duration',
          options: DURATION_OPTIONS.map(option => ({
            label: `${option} mins`,
            value: option,
            selected: formData.estimatedDurationMinutes === option,
            onSelect: () => {
              handleFieldChange('estimatedDurationMinutes', option);
              closeSelectionModal();
            },
          })),
        };
      case 'serviceCountry':
        return {
          title: 'Select Country',
          options: countryOptions.map(option => ({
            ...option,
            selected: formData.serviceCountryCode === option.value,
            onSelect: () => {
              setFormData(current => ({
                ...current,
                serviceCountryCode: option.value,
                serviceStateCode: '',
              }));
              setErrors({});
              closeSelectionModal();
            },
          })),
        };
      case 'serviceState':
        return {
          title: 'Select State / Province',
          options: serviceStateOptions.map(option => ({
            ...option,
            selected: formData.serviceStateCode === option.value,
            onSelect: () => {
              handleFieldChange('serviceStateCode', option.value);
              closeSelectionModal();
            },
          })),
        };
      default:
        return null;
    }
  }, [activeSheet, closeSelectionModal, countryOptions, customers, formData, handleFieldChange, serviceStateOptions]);

  const selectionSearchPlaceholder = useMemo(() => {
    switch (activeSheet) {
      case 'customer':
        return 'Search customer...';
      case 'serviceCountry':
        return 'Search country...';
      case 'serviceState':
        return 'Search state...';
      default:
        return '';
    }
  }, [activeSheet]);

  const filteredSheetOptions = useMemo(() => {
    const options = sheetConfig?.options || [];
    const query = selectionSearch.trim().toLowerCase();

    if (!query) return options;

    return options.filter(option => option.label.toLowerCase().includes(query));
  }, [selectionSearch, sheetConfig]);

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE NEW JOB</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!!errors.server && (
            <View style={styles.serverErrorBox}>
              <Text style={styles.serverErrorText}>{errors.server}</Text>
            </View>
          )}

          <Section title="Job Overview" accent="#2563eb">
            <TriggerField
              label="Customer"
              placeholder="Select customer..."
              icon={User}
              value={selectedCustomerLabel}
              error={errors.customerId}
              required
              onPress={() => setActiveSheet('customer')}
              disabled={isLoadingCustomers}
              loading={isLoadingCustomers}
            />

            <InputField
              label="Job Title"
              placeholder="e.g. Master Bedroom HVAC Repair"
              icon={Briefcase}
              required
              value={formData.title}
              onChangeText={value => handleFieldChange('title', value)}
              error={errors.title}
              maxLength={120}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Job Type"
                  placeholder="Select job type"
                  icon={Briefcase}
                  value={formData.jobType}
                  error={errors.jobType}
                  required
                  onPress={() => setActiveSheet('jobType')}
                />
              </View>

              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Priority"
                  placeholder="Select priority"
                  icon={CheckCircle2}
                  value={formData.priority}
                  onPress={() => setActiveSheet('priority')}
                />
              </View>
            </View>
          </Section>

          <Section title="Schedule" accent="#f59e0b">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Start Date"
                  placeholder="Choose a date"
                  icon={Calendar}
                  value={formatDisplayDate(formData.scheduledDate)}
                  error={errors.scheduledDate || errors.scheduledAt}
                  required
                  onPress={openDateSheet}
                />
              </View>

              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Start Time"
                  placeholder="Choose a time"
                  icon={Clock}
                  value={formatDisplayTime(formData.scheduledTime)}
                  error={errors.scheduledTime || errors.scheduledAt}
                  required
                  onPress={openTimeSheet}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Duration"
                  placeholder="Select duration"
                  icon={Timer}
                  value={formData.estimatedDurationMinutes ? `${formData.estimatedDurationMinutes} mins` : ''}
                  error={errors.estimatedDurationMinutes}
                  required
                  onPress={() => setActiveSheet('duration')}
                />
              </View>

              <View style={{ flex: 1 }}>
                <TriggerField
                  label="Status"
                  placeholder="Select status"
                  icon={CheckCircle2}
                  value={formData.status}
                  onPress={() => setActiveSheet('status')}
                />
              </View>
            </View>
          </Section>

          <Section title="Job Location" accent="#10b981">
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <View style={styles.checkSquare}>
                  {formData.useCustomerPrimaryAddress ? <CheckCircle2 size={18} color="#2563eb" strokeWidth={3} /> : null}
                </View>
                <Text style={styles.toggleText}>Use customer primary address</Text>
              </View>
              <Switch
                value={formData.useCustomerPrimaryAddress}
                onValueChange={value => handleFieldChange('useCustomerPrimaryAddress', value)}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                ios_backgroundColor="#e2e8f0"
              />
            </View>

            {!formData.useCustomerPrimaryAddress ? (
              <>
                <InputField
                  label="Street Address"
                  placeholder="123 Job Site St"
                  icon={MapPin}
                  required
                  value={formData.serviceAddress}
                  onChangeText={value => handleFieldChange('serviceAddress', value)}
                  error={errors.serviceAddress}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="City"
                      placeholder="Austin"
                      required
                      value={formData.serviceCity}
                      onChangeText={value => handleFieldChange('serviceCity', value)}
                      error={errors.serviceCity}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <TriggerField
                      label="State / Province"
                      placeholder="Select state / province"
                      icon={MapPin}
                      required
                      value={selectedServiceState?.name || ''}
                      onPress={() => {
                        if (!formData.serviceCountryCode) {
                          setErrors({ serviceCountryCode: 'Please select country first' });
                          return;
                        }

                        setActiveSheet('serviceState');
                      }}
                      error={errors.serviceStateCode}
                      disabled={!formData.serviceCountryCode || isLoadingServiceStates}
                      loading={isLoadingServiceStates}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Postal Code"
                      placeholder="78701"
                      required
                      value={formData.servicePostalCode}
                      onChangeText={value => handleFieldChange('servicePostalCode', value)}
                      error={errors.servicePostalCode}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <TriggerField
                      label="Country"
                      placeholder="Select country"
                      icon={MapPin}
                      required
                      value={selectedServiceCountry?.name || ''}
                      onPress={() => setActiveSheet('serviceCountry')}
                      error={errors.serviceCountryCode}
                      disabled={isLoadingCountries}
                      loading={isLoadingCountries}
                    />
                  </View>
                </View>
              </>
            ) : null}
          </Section>

          <Section title="Work Scope" accent="#6366f1">
            <InputField
              label="Job Description"
              placeholder="Describe the work to be done..."
              icon={StickyNote}
              multiline
              value={formData.description}
              onChangeText={value => handleFieldChange('description', value)}
              error={errors.description}
              maxLength={1000}
            />

            <View style={styles.checklistHeader}>
              <Text style={styles.label}>Initial Checklist</Text>
              <Text style={styles.helperText}>Edit existing tasks or add new ones below.</Text>
            </View>

            <View style={styles.checkListContainer}>
              {formData.checklist.map((item, index) => (
                <View key={`check-${index}`} style={styles.checkRow}>
                  <View style={styles.checkInputWrapper}>
                    <View style={styles.checkDot} />
                    <TextInput
                      style={styles.checkInput}
                      placeholder="Task description..."
                      placeholderTextColor="#cbd5e1"
                      value={item}
                      onChangeText={value => handleChecklistChange(index, value)}
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveChecklistItem(index)} style={styles.deleteTaskBtn}>
                    <Trash2 size={16} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.newTaskComposer}>
                <View style={styles.checkInputWrapper}>
                  <Plus size={16} color="#94a3b8" />
                  <TextInput
                    style={styles.checkInput}
                    placeholder="Add another task..."
                    placeholderTextColor="#cbd5e1"
                    value={pendingChecklistItem}
                    onChangeText={setPendingChecklistItem}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.addTaskBtn, !pendingChecklistItem.trim() && styles.addTaskBtnDisabled]}
                  onPress={handleAddChecklistItem}
                  disabled={!pendingChecklistItem.trim()}
                >
                  <Text style={styles.addTaskText}>ADD TASK</Text>
                </TouchableOpacity>
              </View>

              {!!errors.checklist && <Text style={styles.errorText}>{errors.checklist}</Text>}
            </View>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createBtn, (!formIsValid || isSubmitting) && styles.createBtnDisabled]}
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={!formIsValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.createBtnText}>Create Job</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={Boolean(activeSheet && sheetConfig)}
        onClose={closeSelectionModal}
        title={sheetConfig?.title || 'Select'}
        searchPlaceholder={selectionSearchPlaceholder || undefined}
        searchValue={selectionSearch}
        onSearchChange={setSelectionSearch}
        options={filteredSheetOptions}
      />

      <BottomSheet
        visible={isDateSheetVisible}
        onClose={() => setIsDateSheetVisible(false)}
        title="Choose Start Date"
      >
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.calendarNavBtn} onPress={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <ChevronLeft size={18} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>{formatMonthLabel(calendarCursor)}</Text>
          <TouchableOpacity style={styles.calendarNavBtn} onPress={() => setCalendarCursor(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <ChevronRight size={18} color="#334155" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <Text key={label} style={styles.weekdayText}>{label}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((date, index) => {
            const isoDate = date ? toIsoDate(date) : '';
            const isSelected = isoDate === formData.scheduledDate;

            return (
              <TouchableOpacity
                key={`${isoDate}-${index}`}
                style={[styles.calendarCell, isSelected && styles.calendarCellSelected, !date && styles.calendarCellEmpty]}
                disabled={!date}
                onPress={() => {
                  if (date) {
                    handleSelectDate(date);
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
      </BottomSheet>

      <BottomSheet
        visible={isTimeSheetVisible}
        onClose={() => setIsTimeSheetVisible(false)}
        title="Choose Start Time"
      >
        <View style={styles.timePreviewCard}>
          <Text style={styles.timePreviewLabel}>Selected Time</Text>
          <Text style={styles.timePreviewValue}>
            {timeParts.hour12}:{toTwoDigits(timeParts.minute)} {timeParts.meridiem}
          </Text>
        </View>

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
          {(['AM', 'PM'] as const).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.meridiemChip, timeParts.meridiem === option && styles.meridiemChipActive]}
              onPress={() => setTimeParts(current => ({ ...current, meridiem: option }))}
            >
              <Text style={[styles.meridiemChipText, timeParts.meridiem === option && styles.meridiemChipTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.timeActionRow}>
          <TouchableOpacity style={styles.timeCancelBtn} onPress={() => setIsTimeSheetVisible(false)}>
            <Text style={styles.timeCancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmPickerBtn} onPress={handleConfirmTime}>
            <Text style={styles.confirmPickerBtnText}>Set Time</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 72,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1.8 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 140, paddingTop: 8 },
  serverErrorBox: {
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  serverErrorText: { color: '#b91c1c', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 18,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  sectionIndicator: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155' },
  requiredDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  inputWrapper: {
    minHeight: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapperError: { borderColor: '#f87171', backgroundColor: '#fff7f7' },
  inputWrapperDisabled: { opacity: 0.7 },
  textInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    paddingLeft: 12,
  },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 14 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 0 },
  iconCenter: { marginTop: 0 },
  iconTop: { marginTop: 4 },
  selectText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', paddingLeft: 12 },
  placeholderText: { color: '#cbd5e1' },
  errorText: { marginTop: 6, color: '#dc2626', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 6,
  },
  toggleLabelGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkSquare: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  checklistHeader: { marginBottom: 12 },
  helperText: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  checkListContainer: { gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkInputWrapper: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  checkInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', paddingLeft: 12 },
  deleteTaskBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTaskComposer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  addTaskBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskBtnDisabled: { opacity: 0.5 },
  addTaskText: { fontSize: 12, fontWeight: '900', color: '#2563eb', letterSpacing: 0.8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  createBtn: {
    height: 60,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: { opacity: 0.55 },
  createBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  selectionModalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  selectionModalContent: {
    flex: 1,
    padding: 24,
  },
  selectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  selectionModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  selectionModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionSearchContainer: {
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
  },
  selectionSearchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  selectionSearchInput: {
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
  selectionModalScroll: { flex: 1 },
  selectionModalItem: {
    width: '100%',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectionModalItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  selectionModalItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  selectionModalItemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  selectionModalCheckCircle: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  sheetSafeArea: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 18 : 20,
    paddingTop: 10,
    maxHeight: '78%',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: { maxHeight: 380 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calendarCellEmpty: { opacity: 0 },
  calendarCellSelected: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
  },
  calendarCellText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  calendarCellTextSelected: { color: 'white' },
  timePreviewCard: {
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 18,
    alignItems: 'center',
  },
  timePreviewLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timePreviewValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.8,
  },
  timeSheetContent: { flexDirection: 'row', gap: 16 },
  timeSelectorColumn: { flex: 1 },
  timeSelectorLabel: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 10 },
  timeChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    minWidth: 58,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  timeChipText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  timeChipTextActive: { color: '#2563eb' },
  meridiemRow: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 },
  meridiemChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridiemChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  meridiemChipText: { fontSize: 14, fontWeight: '900', color: '#475569' },
  meridiemChipTextActive: { color: 'white' },
  timeActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCancelBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  confirmPickerBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPickerBtnText: { color: 'white', fontSize: 15, fontWeight: '900' },
});

export default CreateJobScreen;
