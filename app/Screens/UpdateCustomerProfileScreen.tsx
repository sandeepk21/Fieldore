import {
    CountryLookupResponse,
    StateProvinceLookupResponse,
    UpdateCustomerRequest,
    getFieldoreAPI,
} from '@/src/api/generated';
import { useLoader } from '@/src/context/LoaderContext';
import {
    getBillingCustomerAddress,
    getCustomerByIdApi,
    getPrimaryCustomerAddress,
    updateCustomerApi,
} from '@/src/services/customerService';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Building2,
    Check,
    ChevronDown,
    Dog,
    LucideIcon,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    StickyNote,
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

const api = getFieldoreAPI();

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
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}

interface SelectOption {
  label: string;
  value: string;
}

interface TriggerFieldProps {
  label: string;
  icon: LucideIcon;
  value: string;
  error?: string;
  required?: boolean;
  onPress: () => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}

type CustomerType = 'Residential' | 'Commercial';
type ActiveSheet = 'pet' | 'serviceCountry' | 'serviceState' | 'billingCountry' | 'billingState' | null;

type FormData = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
  alternatePhone: string;
  serviceAddress: string;
  serviceCity: string;
  serviceZipCode: string;
  serviceCountryCode: string;
  serviceStateCode: string;
  billingAddress: string;
  billingCity: string;
  billingZipCode: string;
  billingCountryCode: string;
  billingStateCode: string;
  gateCode: string;
  petsNote: string;
  internalNotes: string;
};

type FormErrors = Partial<Record<keyof FormData | 'server', string>>;

const PET_OPTIONS: SelectOption[] = [
  { label: 'No pets', value: 'No pets' },
  { label: 'Dog (Friendly)', value: 'Dog (Friendly)' },
  { label: 'Dog (Needs caution)', value: 'Dog (Needs caution)' },
  { label: 'Cat', value: 'Cat' },
  { label: 'Multiple pets', value: 'Multiple pets' },
  { label: 'Other', value: 'Other' },
];

const initialFormData: FormData = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  mobilePhone: '',
  alternatePhone: '',
  serviceAddress: '',
  serviceCity: '',
  serviceZipCode: '',
  serviceCountryCode: '',
  serviceStateCode: '',
  billingAddress: '',
  billingCity: '',
  billingZipCode: '',
  billingCountryCode: '',
  billingStateCode: '',
  gateCode: '',
  petsNote: 'No pets',
  internalNotes: '',
};

const nameRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const zipRegex = /^[A-Za-z0-9 -]{3,10}$/;

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '');

const isValidPhone = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

const validateField = (
  field: keyof FormData,
  value: string,
  customerType: CustomerType,
  sameAsService: boolean
): string => {
  const trimmed = value.trim();

  switch (field) {
    case 'companyName':
      if (customerType === 'Commercial' && !trimmed) return 'Company name is required';
      if (trimmed && trimmed.length < 2) return 'Company name must be at least 2 characters';
      return '';
    case 'firstName':
      if (!trimmed) return 'First name is required';
      if (trimmed.length < 2) return 'First name must be at least 2 characters';
      if (!nameRegex.test(trimmed)) return 'First name can contain only letters';
      return '';
    case 'lastName':
      if (!trimmed) return 'Last name is required';
      if (trimmed.length < 2) return 'Last name must be at least 2 characters';
      if (!nameRegex.test(trimmed)) return 'Last name can contain only letters';
      return '';
    case 'email':
      if (trimmed && !emailRegex.test(trimmed)) return 'Enter a valid email address';
      return '';
    case 'mobilePhone':
      if (!trimmed) return 'Mobile phone is required';
      if (!isValidPhone(trimmed)) return 'Enter a valid phone number';
      return '';
    case 'alternatePhone':
      if (trimmed && !isValidPhone(trimmed)) return 'Enter a valid alternate phone number';
      return '';
    case 'serviceAddress':
      if (!trimmed) return 'Service address is required';
      if (trimmed.length < 5) return 'Service address looks too short';
      return '';
    case 'serviceCity':
      if (!trimmed) return 'City is required';
      if (trimmed.length < 2) return 'City must be at least 2 characters';
      return '';
    case 'serviceZipCode':
      if (!trimmed) return 'Zip code is required';
      if (!zipRegex.test(trimmed)) return 'Enter a valid zip code';
      return '';
    case 'serviceCountryCode':
      if (!trimmed) return 'Country is required';
      return '';
    case 'serviceStateCode':
      if (!trimmed) return 'Province is required';
      return '';
    case 'billingAddress':
      if (!sameAsService && !trimmed) return 'Billing address is required';
      if (!sameAsService && trimmed.length < 5) return 'Billing address looks too short';
      return '';
    case 'billingCity':
      if (!sameAsService && !trimmed) return 'Billing city is required';
      if (!sameAsService && trimmed.length < 2) return 'Billing city must be at least 2 characters';
      return '';
    case 'billingZipCode':
      if (!sameAsService && !trimmed) return 'Billing zip code is required';
      if (!sameAsService && !zipRegex.test(trimmed)) return 'Enter a valid billing zip code';
      return '';
    case 'billingCountryCode':
      if (!sameAsService && !trimmed) return 'Billing country is required';
      return '';
    case 'billingStateCode':
      if (!sameAsService && !trimmed) return 'Billing province is required';
      return '';
    case 'gateCode':
      if (trimmed && trimmed.length > 30) return 'Gate code must be 30 characters or less';
      return '';
    case 'petsNote':
      if (trimmed && trimmed.length > 120) return 'Pets note must be 120 characters or less';
      return '';
    case 'internalNotes':
      if (trimmed && trimmed.length > 500) return 'Internal notes must be 500 characters or less';
      return '';
    default:
      return '';
  }
};

const validateForm = (
  data: FormData,
  customerType: CustomerType,
  sameAsService: boolean
): FormErrors => {
  const fieldOrder: (keyof FormData)[] = [
    'companyName',
    'firstName',
    'lastName',
    'email',
    'mobilePhone',
    'alternatePhone',
    'serviceAddress',
    'serviceCity',
    'serviceZipCode',
    'serviceCountryCode',
    'serviceStateCode',
    'billingAddress',
    'billingCity',
    'billingZipCode',
    'billingCountryCode',
    'billingStateCode',
    'gateCode',
    'petsNote',
    'internalNotes',
  ];

  for (const field of fieldOrder) {
    const error = validateField(field, data[field], customerType, sameAsService);
    if (error) {
      return { [field]: error };
    }
  }

  return {};
};

const mapCustomerToFormData = async (customerId: string) => {
  const customer = await getCustomerByIdApi(customerId);
  const serviceAddress = getPrimaryCustomerAddress(customer);
  const billingAddress = getBillingCustomerAddress(customer);
  const sameAsService = customer.billingSameAsService ?? true;

  return {
    customerType: customer.type === 'Commercial' ? 'Commercial' : 'Residential',
    sameAsService,
    formData: {
      companyName: customer.companyName?.trim() || '',
      firstName: customer.firstName?.trim() || '',
      lastName: customer.lastName?.trim() || '',
      email: customer.email?.trim() || '',
      mobilePhone: customer.mobilePhone?.trim() || '',
      alternatePhone: customer.alternatePhone?.trim() || '',
      serviceAddress: serviceAddress?.line1?.trim() || '',
      serviceCity: serviceAddress?.city?.trim() || '',
      serviceZipCode: serviceAddress?.postalCode?.trim() || '',
      serviceCountryCode: serviceAddress?.country?.trim() || '',
      serviceStateCode: serviceAddress?.stateOrProvince?.trim() || '',
      billingAddress: sameAsService ? '' : billingAddress?.line1?.trim() || '',
      billingCity: sameAsService ? '' : billingAddress?.city?.trim() || '',
      billingZipCode: sameAsService ? '' : billingAddress?.postalCode?.trim() || '',
      billingCountryCode: sameAsService ? '' : billingAddress?.country?.trim() || '',
      billingStateCode: sameAsService ? '' : billingAddress?.stateOrProvince?.trim() || '',
      gateCode: customer.gateCode?.trim() || '',
      petsNote: customer.petsNote?.trim() || 'No pets',
      internalNotes: customer.internalNotes?.trim() || '',
    } satisfies FormData,
  };
};

const Section: React.FC<SectionProps> = ({ title, accent, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: accent }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const SkeletonInput = ({ half }: { half?: boolean }) => (
  <View style={[styles.inputGroup, half && { flex: 1 }]}>
    <SkeletonBlock height={10} width="38%" style={{ marginLeft: 4 }} />
    <SkeletonBlock height={48} width="100%" />
  </View>
);

const SkeletonSection = ({
  titleWidth,
  rows = 2,
  hasDoubleRow,
  multiline,
}: {
  titleWidth: number | `${number}%`;
  rows?: number;
  hasDoubleRow?: boolean;
  multiline?: boolean;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: '#e2e8f0' }]} />
      <SkeletonBlock height={12} width={titleWidth} />
    </View>
    {rows > 0 ? Array.from({ length: rows }).map((_, index) => <SkeletonInput key={index} />) : null}
    {hasDoubleRow ? (
      <View style={styles.row}>
        <SkeletonInput half />
        <SkeletonInput half />
      </View>
    ) : null}
    {multiline ? <SkeletonBlock height={100} width="100%" /> : null}
  </View>
);

const UpdateCustomerProfileSkeleton = () => (
  <SafeAreaView style={styles.container}>
    
    <View style={styles.header}>
      <View style={styles.closeBtn}>
        <SkeletonBlock height={18} width={18} style={{ borderRadius: 9 }} />
      </View>
      <SkeletonBlock height={12} width={110} />
      <View style={{ width: 40 }} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.typeSelector}>
        <View style={[styles.typeBtn, styles.typeBtnActive]}>
          <SkeletonBlock height={12} width={84} />
        </View>
        <View style={styles.typeBtn}>
          <SkeletonBlock height={12} width={84} />
        </View>
      </View>
      <View style={styles.formContent}>
        <SkeletonSection titleWidth={120} hasDoubleRow rows={1} />
        <SkeletonSection titleWidth={128} rows={1} hasDoubleRow />
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: '#e2e8f0' }]} />
            <SkeletonBlock height={12} width={132} />
          </View>
          <View style={styles.row}>
            <SkeletonInput half />
            <SkeletonInput half />
          </View>
          <SkeletonBlock height={100} width="100%" />
        </View>
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <View style={[styles.saveBtn, styles.saveBtnDisabled]}>
        <SkeletonBlock height={18} width={140} style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
      </View>
    </View>
  </SafeAreaView>
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
  icon: Icon,
  value,
  error,
  required,
  onPress,
  placeholder,
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
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalRoot}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.sheetCard}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
            <X size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </View>
  </Modal>
);

const UpdateCustomerProfileScreen: React.FC = () => {
  const { showLoader, hideLoader } = useLoader();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const customerId = typeof params.customerId === 'string' ? params.customerId : '';
  const [customerType, setCustomerType] = useState<CustomerType>('Residential');
  const [sameAsService, setSameAsService] = useState(true);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingServiceStates, setIsLoadingServiceStates] = useState(false);
  const [isLoadingBillingStates, setIsLoadingBillingStates] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [countries, setCountries] = useState<CountryLookupResponse[]>([]);
  const [serviceStates, setServiceStates] = useState<StateProvinceLookupResponse[]>([]);
  const [billingStates, setBillingStates] = useState<StateProvinceLookupResponse[]>([]);

  const selectedServiceCountry = countries.find(country => country.code === formData.serviceCountryCode);
  const selectedBillingCountry = countries.find(country => country.code === formData.billingCountryCode);
  const selectedServiceState = serviceStates.find(state => (state.code || '') === formData.serviceStateCode);
  const selectedBillingState = billingStates.find(state => (state.code || '') === formData.billingStateCode);

  const countryOptions: SelectOption[] = countries
    .map(country => ({
      label: country.name || country.code || 'Unknown Country',
      value: country.code || '',
    }))
    .filter(option => option.value);

  const serviceStateOptions: SelectOption[] = serviceStates
    .map(state => ({
      label: state.name || state.code || 'Unknown Province',
      value: state.code || '',
    }))
    .filter(option => option.value);

  const billingStateOptions: SelectOption[] = billingStates
    .map(state => ({
      label: state.name || state.code || 'Unknown Province',
      value: state.code || '',
    }))
    .filter(option => option.value);

  const formIsValid = useMemo(
    () => Object.keys(validateForm(formData, customerType, sameAsService)).length === 0,
    [formData, customerType, sameAsService]
  );

  useEffect(() => {
    const loadScreen = async () => {
      if (!customerId) {
        setErrors({ server: 'Customer id is missing.' });
        setIsLoadingScreen(false);
        return;
      }

      setIsLoadingScreen(true);
      setIsLoadingCountries(true);

      try {
        const [customerResult, countriesResponse] = await Promise.all([
          mapCustomerToFormData(customerId),
          api.getApiLocationsCountries(),
        ]);

        if (!countriesResponse.data.success) {
          throw new Error(countriesResponse.data.message || 'Failed to load countries');
        }

        setCustomerType(customerResult.customerType as CustomerType);
        setSameAsService(customerResult.sameAsService);
        setFormData(customerResult.formData);
        setCountries(countriesResponse.data.data || []);
        setErrors({});
      } catch (error: any) {
        setErrors({
          server: error?.response?.data?.message || error?.message || 'Failed to load customer details.',
        });
      } finally {
        setIsLoadingCountries(false);
        setIsLoadingScreen(false);
      }
    };

    loadScreen();
  }, [customerId]);

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
          throw new Error(result.message || 'Failed to load provinces');
        }

        setServiceStates(result.data || []);
      } catch (error: any) {
        setServiceStates([]);
        setErrors(current => ({
          ...current,
          server: error?.response?.data?.message || error?.message || 'Failed to load provinces.',
        }));
      } finally {
        setIsLoadingServiceStates(false);
      }
    };

    fetchStates();
  }, [formData.serviceCountryCode]);

  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.billingCountryCode || sameAsService) {
        setBillingStates([]);
        return;
      }

      setIsLoadingBillingStates(true);

      try {
        const response = await api.getApiLocationsStates({ countryCode: formData.billingCountryCode });
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Failed to load billing provinces');
        }

        setBillingStates(result.data || []);
      } catch (error: any) {
        setBillingStates([]);
        setErrors(current => ({
          ...current,
          server: error?.response?.data?.message || error?.message || 'Failed to load billing provinces.',
        }));
      } finally {
        setIsLoadingBillingStates(false);
      }
    };

    fetchStates();
  }, [formData.billingCountryCode, sameAsService]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    const nextValue =
      field === 'mobilePhone' || field === 'alternatePhone' ? normalizePhone(value) : value;
    const updatedData = { ...formData, [field]: nextValue };

    setFormData(updatedData);

    const fieldError = validateField(field, nextValue, customerType, sameAsService);

    if (fieldError) {
      setErrors({ [field]: fieldError });
      return;
    }

    if (errors[field] || errors.server) {
      setErrors({});
    }
  }, [customerType, errors, formData, sameAsService]);

  const handleCustomerTypeChange = (type: CustomerType) => {
    setCustomerType(type);

    if (errors.companyName) {
      const companyError = validateField('companyName', formData.companyName, type, sameAsService);
      setErrors(companyError ? { companyName: companyError } : {});
    }
  };

  const handleToggleSameAsService = (value: boolean) => {
    setSameAsService(value);
    setActiveSheet(null);

    if (value) {
      setErrors(currentErrors => {
        const nextErrors = { ...currentErrors };
        delete nextErrors.billingAddress;
        delete nextErrors.billingCity;
        delete nextErrors.billingZipCode;
        delete nextErrors.billingCountryCode;
        delete nextErrors.billingStateCode;
        return nextErrors;
      });
      return;
    }

    setFormData(current => ({
      ...current,
      billingAddress: current.billingAddress || current.serviceAddress,
      billingCity: current.billingCity || current.serviceCity,
      billingZipCode: current.billingZipCode || current.serviceZipCode,
      billingCountryCode: current.billingCountryCode || current.serviceCountryCode,
      billingStateCode: current.billingStateCode || current.serviceStateCode,
    }));
  };

  const buildPayload = (): UpdateCustomerRequest => {
    const serviceAddress = {
      label: 'Service',
      isPrimary: true,
      isBilling: sameAsService,
      line1: formData.serviceAddress.trim(),
      city: formData.serviceCity.trim(),
      stateOrProvince: formData.serviceStateCode.trim(),
      postalCode: formData.serviceZipCode.trim(),
      country: formData.serviceCountryCode.trim(),
    };

    const billingAddress = !sameAsService
      ? {
          label: 'Billing',
          isPrimary: false,
          isBilling: true,
          line1: formData.billingAddress.trim(),
          city: formData.billingCity.trim(),
          stateOrProvince: formData.billingStateCode.trim(),
          postalCode: formData.billingZipCode.trim(),
          country: formData.billingCountryCode.trim(),
        }
      : null;

    return {
      type: customerType,
      companyName: formData.companyName.trim() || null,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || null,
      mobilePhone: formData.mobilePhone.trim(),
      alternatePhone: formData.alternatePhone.trim() || null,
      gateCode: formData.gateCode.trim() || null,
      petsNote: formData.petsNote.trim() || null,
      internalNotes: formData.internalNotes.trim() || null,
      billingSameAsService: sameAsService,
      addresses: billingAddress ? [serviceAddress, billingAddress] : [serviceAddress],
    };
  };

  const handleSubmit = async () => {
    if (!customerId) {
      setErrors({ server: 'Customer id is missing.' });
      return;
    }

    const validationErrors = validateForm(formData, customerType, sameAsService);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    showLoader();

    try {
      await updateCustomerApi(customerId, buildPayload());
      Alert.alert('Success', 'Customer updated successfully.');
      router.back();
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      const message = validationErrors
        ? Object.values(validationErrors).flat().join('\n')
        : error?.response?.data?.message || error?.message || 'Failed to update customer.';

      setErrors({ server: message });
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  const sheetConfig = useMemo(() => {
    switch (activeSheet) {
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
              setActiveSheet(null);
            },
          })),
        };
      case 'serviceState':
        return {
          title: 'Select Province',
          options: serviceStateOptions.map(option => ({
            ...option,
            selected: formData.serviceStateCode === option.value,
            onSelect: () => {
              handleInputChange('serviceStateCode', option.value);
              setActiveSheet(null);
            },
          })),
        };
      case 'billingCountry':
        return {
          title: 'Select Billing Country',
          options: countryOptions.map(option => ({
            ...option,
            selected: formData.billingCountryCode === option.value,
            onSelect: () => {
              setFormData(current => ({
                ...current,
                billingCountryCode: option.value,
                billingStateCode: '',
              }));
              setErrors({});
              setActiveSheet(null);
            },
          })),
        };
      case 'billingState':
        return {
          title: 'Select Billing Province',
          options: billingStateOptions.map(option => ({
            ...option,
            selected: formData.billingStateCode === option.value,
            onSelect: () => {
              handleInputChange('billingStateCode', option.value);
              setActiveSheet(null);
            },
          })),
        };
      case 'pet':
        return {
          title: 'Select Pet Info',
          options: PET_OPTIONS.map(option => ({
            ...option,
            selected: formData.petsNote === option.value,
            onSelect: () => {
              handleInputChange('petsNote', option.value);
              setActiveSheet(null);
            },
          })),
        };
      default:
        return null;
    }
  }, [activeSheet, billingStateOptions, countryOptions, formData, handleInputChange, serviceStateOptions]);

  if (isLoadingScreen) {
    return <UpdateCustomerProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UPDATE CLIENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.typeSelector}>
            {(['Residential', 'Commercial'] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => handleCustomerTypeChange(type)}
                style={[styles.typeBtn, customerType === type && styles.typeBtnActive]}
              >
                {type === 'Residential' ? (
                  <User size={14} color={customerType === type ? '#2563eb' : '#94a3b8'} />
                ) : (
                  <Building2 size={14} color={customerType === type ? '#2563eb' : '#94a3b8'} />
                )}
                <Text style={[styles.typeBtnText, customerType === type && styles.typeBtnTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formContent}>
            {!!errors.server && (
              <View style={styles.serverErrorBox}>
                <Text style={styles.serverErrorText}>{errors.server}</Text>
              </View>
            )}

            <Section title="Primary Contact" accent="#2563eb">
              {customerType === 'Commercial' ? (
                <InputField
                  label="Company Name"
                  placeholder="e.g. Acme Corp"
                  icon={Building2}
                  required
                  value={formData.companyName}
                  onChangeText={value => handleInputChange('companyName', value)}
                  error={errors.companyName}
                />
              ) : null}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="First Name"
                    placeholder="Jane"
                    required
                    value={formData.firstName}
                    onChangeText={value => handleInputChange('firstName', value)}
                    error={errors.firstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Last Name"
                    placeholder="Smith"
                    required
                    value={formData.lastName}
                    onChangeText={value => handleInputChange('lastName', value)}
                    error={errors.lastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <InputField
                label="Email Address"
                placeholder="jane@example.com"
                icon={Mail}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={value => handleInputChange('email', value)}
                error={errors.email}
                autoCapitalize="none"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Mobile Phone"
                    placeholder="(555) 000-0000"
                    icon={Phone}
                    keyboardType="phone-pad"
                    required
                    value={formData.mobilePhone}
                    onChangeText={value => handleInputChange('mobilePhone', value)}
                    error={errors.mobilePhone}
                    autoCapitalize="none"
                    maxLength={16}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Work/Alt Phone"
                    placeholder="(555) 000-0000"
                    keyboardType="phone-pad"
                    value={formData.alternatePhone}
                    onChangeText={value => handleInputChange('alternatePhone', value)}
                    error={errors.alternatePhone}
                    autoCapitalize="none"
                    maxLength={16}
                  />
                </View>
              </View>
            </Section>

            <Section title="Service Address" accent="#10b981">
              <InputField
                label="Street Address"
                placeholder="123 Evergreen Terrace"
                icon={MapPin}
                required
                value={formData.serviceAddress}
                onChangeText={value => handleInputChange('serviceAddress', value)}
                error={errors.serviceAddress}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="City"
                    icon={MapPin}
                    required
                    placeholder="Springfield"
                    value={formData.serviceCity}
                    onChangeText={value => handleInputChange('serviceCity', value)}
                    error={errors.serviceCity}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Zip Code"
                    placeholder="62704"
                    required
                    value={formData.serviceZipCode}
                    onChangeText={value => handleInputChange('serviceZipCode', value)}
                    error={errors.serviceZipCode}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TriggerField
                    label="Country"
                    icon={MapPin}
                    required
                    value={selectedServiceCountry?.name || ''}
                    error={errors.serviceCountryCode}
                    onPress={() => setActiveSheet('serviceCountry')}
                    placeholder="Select country"
                    disabled={isLoadingCountries}
                    loading={isLoadingCountries}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TriggerField
                    label="Province"
                    icon={MapPin}
                    required
                    value={selectedServiceState?.name || ''}
                    error={errors.serviceStateCode}
                    onPress={() => {
                      if (!formData.serviceCountryCode) {
                        setErrors({ serviceCountryCode: 'Please select country first' });
                        return;
                      }
                      setActiveSheet('serviceState');
                    }}
                    placeholder="Select province"
                    disabled={!formData.serviceCountryCode || isLoadingServiceStates}
                    loading={isLoadingServiceStates}
                  />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelGroup}>
                  <View style={styles.checkSquare}>
                    {sameAsService ? <Check size={14} color="#2563eb" strokeWidth={4} /> : null}
                  </View>
                  <Text style={styles.toggleText}>Billing address same as service</Text>
                </View>
                <Switch
                  value={sameAsService}
                  onValueChange={handleToggleSameAsService}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  ios_backgroundColor="#e2e8f0"
                />
              </View>

              {!sameAsService ? (
                <View style={{ marginTop: 12 }}>
                  <InputField
                    label="Billing Address"
                    placeholder="P.O. Box 456"
                    required
                    value={formData.billingAddress}
                    onChangeText={value => handleInputChange('billingAddress', value)}
                    error={errors.billingAddress}
                  />
                  <View style={[styles.row, { marginTop: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <InputField
                        label="Billing City"
                        placeholder="Springfield"
                        required
                        value={formData.billingCity}
                        onChangeText={value => handleInputChange('billingCity', value)}
                        error={errors.billingCity}
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <InputField
                        label="Billing Zip Code"
                        placeholder="62704"
                        required
                        value={formData.billingZipCode}
                        onChangeText={value => handleInputChange('billingZipCode', value)}
                        error={errors.billingZipCode}
                        autoCapitalize="characters"
                        maxLength={10}
                      />
                    </View>
                  </View>
                  <View style={[styles.row, { marginTop: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <TriggerField
                        label="Billing Country"
                        icon={MapPin}
                        required
                        value={selectedBillingCountry?.name || ''}
                        error={errors.billingCountryCode}
                        onPress={() => setActiveSheet('billingCountry')}
                        placeholder="Select country"
                        disabled={isLoadingCountries}
                        loading={isLoadingCountries}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TriggerField
                        label="Billing Province"
                        icon={MapPin}
                        required
                        value={selectedBillingState?.name || ''}
                        error={errors.billingStateCode}
                        onPress={() => {
                          if (!formData.billingCountryCode) {
                            setErrors({ billingCountryCode: 'Please select billing country first' });
                            return;
                          }
                          setActiveSheet('billingState');
                        }}
                        placeholder="Select province"
                        disabled={!formData.billingCountryCode || isLoadingBillingStates}
                        loading={isLoadingBillingStates}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </Section>

            <Section title="Property & Access" accent="#6366f1">
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Gate Code"
                    placeholder="#1234"
                    icon={ShieldCheck}
                    value={formData.gateCode}
                    onChangeText={value => handleInputChange('gateCode', value)}
                    error={errors.gateCode}
                    autoCapitalize="characters"
                    maxLength={30}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TriggerField
                    label="Pets"
                    icon={Dog}
                    value={formData.petsNote}
                    error={errors.petsNote}
                    onPress={() => setActiveSheet('pet')}
                    placeholder="Select pet info"
                  />
                </View>
              </View>
              <InputField
                label="Internal Notes"
                placeholder="E.g. Beware of loose gravel..."
                icon={StickyNote}
                multiline
                value={formData.internalNotes}
                onChangeText={value => handleInputChange('internalNotes', value)}
                error={errors.internalNotes}
                maxLength={500}
              />
            </Section>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, (!formIsValid || isSubmitting) && styles.saveBtnDisabled]}
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Update Customer</Text>
                <Check size={22} color="white" strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={Boolean(activeSheet && sheetConfig)}
        onClose={() => setActiveSheet(null)}
        title={sheetConfig?.title || 'Select'}
      >
        <ScrollView style={styles.sheetOptions} showsVerticalScrollIndicator={false}>
          {(sheetConfig?.options || []).map(option => (
            <TouchableOpacity key={option.value} style={styles.sheetOptionRow} onPress={option.onSelect}>
              <Text style={styles.sheetOptionText}>{option.label}</Text>
              {option.selected ? <Check size={18} color="#2563eb" strokeWidth={3} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#F8FAFC',
  },
  closeBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 160 },
  typeSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 16, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  typeBtnActive: { backgroundColor: 'white' },
  typeBtnText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  typeBtnTextActive: { color: '#2563eb' },
  formContent: { gap: 20 },
  sectionCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionIndicator: { width: 6, height: 16, borderRadius: 3 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 4 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  requiredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' },
  inputWrapper: {
    minHeight: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  inputWrapperDisabled: { opacity: 0.65 },
  textAreaWrapper: { minHeight: 100, alignItems: 'flex-start', paddingTop: 12 },
  iconCenter: { marginRight: 12 },
  iconTop: { marginRight: 12, marginTop: 4 },
  textInput: { flex: 1, minHeight: 48, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  textArea: { textAlignVertical: 'top', minHeight: 100 },
  selectText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  placeholderText: { color: '#cbd5e1' },
  errorText: { fontSize: 12, fontWeight: '600', color: '#ef4444', marginLeft: 4 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 12,
  },
  toggleLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkSquare: { width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  toggleText: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: -0.2 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  saveBtn: {
    height: 68,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  serverErrorBox: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', borderRadius: 18, padding: 14 },
  serverErrorText: { color: '#b91c1c', fontSize: 13, fontWeight: '700' },
  modalRoot: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.26)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  sheetCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 10,
    maxHeight: '82%',
  },
  sheetHandle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 999, backgroundColor: '#cbd5e1', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  sheetCloseBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  sheetOptions: { maxHeight: 360 },
  sheetOptionRow: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  sheetOptionText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', paddingRight: 8 },
});

export default UpdateCustomerProfileScreen;
